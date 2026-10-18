package vn.edu.vnu.status.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import vn.edu.vnu.status.dto.CheckResultDto;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

/**
 * HealthCheckService — Multi-threaded check engine
 * - Staggered batch execution to prevent NIC congestion
 * - Rate-limited outbound HTTP requests via Semaphore
 * - No cache-busting query params (only headers)
 * - Smart redirect chain handling
 */
@Service
public class HealthCheckService {

    private static final Logger log = LoggerFactory.getLogger(HealthCheckService.class);

    @Autowired
    private HttpClient httpClient;

    @Autowired
    private ExecutorService checkExecutor;

    @Autowired
    private ContentVerifier contentVerifier;

    @Autowired
    private Semaphore networkRateLimiter;

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VNU-StatusBot/2.0";

    /**
     * Check a single service with smart retry logic
     */
    public CheckResultDto checkService(vn.edu.vnu.status.model.Service service) {
        int maxTimeout = service.getTimeout() != null && service.getTimeout() > 0 ? service.getTimeout() : 15;

        // Smart timeout escalation: 5s → 10s → max
        int[] timeouts = {5, 10, maxTimeout};
        List<Integer> uniqueTimeouts = new ArrayList<>();
        for (int t : timeouts) {
            if (!uniqueTimeouts.contains(t)) uniqueTimeouts.add(t);
        }

        CheckResultDto lastResult = null;
        int attempts = 0;

        for (int timeout : uniqueTimeouts) {
            attempts++;
            lastResult = doHttpCheck(service, timeout);

            if (lastResult.isSuccess()) {
                lastResult.setAttempts(attempts);
                return lastResult;
            }

            // If error is NOT timeout, don't retry with higher timeout
            if (!"timeout".equals(lastResult.getErrorType())) {
                break;
            }
        }

        if (lastResult != null) {
            lastResult.setAttempts(attempts);
        }

        // Double check for services currently online (prevent flapping)
        if (lastResult != null && !lastResult.isSuccess()) {
            log.info("Service '{}' failed. Retrying once more...", service.getName());
            CheckResultDto retryResult = doHttpCheck(service, maxTimeout);
            if (retryResult.isSuccess()) {
                retryResult.setAttempts(attempts + 1);
                retryResult.setErrorMessage("OK (Recovered after retry)");
                return retryResult;
            }
        }

        return lastResult;
    }

    /**
     * Check all services in parallel with staggered batches
     * Batch size = 6, 3s delay between batches to distribute NIC load
     */
    public List<CheckResultDto> checkAllServices(List<vn.edu.vnu.status.model.Service> services) {
        List<CheckResultDto> allResults = new ArrayList<>();
        int batchSize = 6;

        for (int i = 0; i < services.size(); i += batchSize) {
            int end = Math.min(i + batchSize, services.size());
            List<vn.edu.vnu.status.model.Service> batch = services.subList(i, end);

            List<CompletableFuture<CheckResultDto>> futures = batch.stream()
                    .map(svc -> CompletableFuture.supplyAsync(() -> {
                        try {
                            return checkService(svc);
                        } catch (Exception e) {
                            log.error("Error checking service {}: {}", svc.getName(), e.getMessage());
                            CheckResultDto error = new CheckResultDto();
                            error.setSuccess(false);
                            error.setHttpCode(0);
                            error.setResponseTimeMs(0);
                            error.setErrorMessage("Internal error: " + e.getMessage());
                            error.setErrorType("internal_error");
                            return error;
                        }
                    }, checkExecutor))
                    .collect(Collectors.toList());

            List<CheckResultDto> batchResults = futures.stream()
                    .map(CompletableFuture::join)
                    .collect(Collectors.toList());
            allResults.addAll(batchResults);

            // Wait between batches (except last batch)
            if (end < services.size()) {
                try { Thread.sleep(3000); } catch (InterruptedException ignored) {}
            }
        }

        return allResults;
    }

    /**
     * Perform a single HTTP check with specified timeout
     * Uses Semaphore rate limiter to prevent network congestion
     */
    private CheckResultDto doHttpCheck(vn.edu.vnu.status.model.Service service, int timeoutSeconds) {
        CheckResultDto result = new CheckResultDto();
        long startTime = System.nanoTime();

        try {
            // Acquire rate limiter permit
            networkRateLimiter.acquire();
        } catch (InterruptedException e) {
            result.setSuccess(false);
            result.setErrorMessage("Rate limiter interrupted");
            result.setErrorType("internal_error");
            return result;
        }

        try {
            String url = service.getUrl();

            // NO cache-busting query param (was causing WAF blocks)
            // Only use Cache-Control headers instead
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("User-Agent", USER_AGENT)
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            long elapsed = System.nanoTime() - startTime;
            float responseTimeMs = elapsed / 1_000_000f;

            int httpCode = response.statusCode();
            String body = response.body();

            result.setHttpCode(httpCode);
            result.setResponseTimeMs(responseTimeMs);
            result.setContent(body);

            // Check final URL — detect redirect to external auth (CAS/IDP)
            URI finalUri = response.uri();
            URI originalUri = URI.create(url);
            String originalHost = originalUri.getHost();
            String finalHost = finalUri.getHost();

            // If redirected to a different host (likely CAS/IDP auth), that's normal for auth-protected services
            boolean redirectedToAuth = finalHost != null && !finalHost.equalsIgnoreCase(originalHost)
                    && (finalHost.contains("idp") || finalHost.contains("cas") || finalHost.contains("auth")
                        || finalHost.contains("login") || finalHost.contains("sso"));

            // Check HTTP status code
            if (httpCode >= 500) {
                result.setSuccess(false);
                result.setErrorMessage("HTTP Server Error: " + httpCode);
                result.setErrorType("http_5xx");
                return result;
            }

            if (httpCode >= 400 && httpCode < 500) {
                // 401/403 on auth-protected services after redirect to IDP is normal
                if (redirectedToAuth && (httpCode == 401 || httpCode == 403)) {
                    // This is expected — service requires auth, IDP is responding
                    result.setSuccess(true);
                    result.setErrorMessage("OK (Auth-protected, IDP responding)");
                    return result;
                }
                result.setSuccess(false);
                result.setErrorMessage("HTTP Client Error: " + httpCode);
                result.setErrorType("http_4xx");
                return result;
            }

            // Check for stale content in headers
            response.headers().firstValue("X-Cache-Status").ifPresent(cacheStatus -> {
                if ("STALE".equalsIgnoreCase(cacheStatus)) {
                    result.setSuccess(false);
                    result.setHttpCode(502);
                    result.setErrorMessage("Backend Error: Serving Stale Content (Likely 502)");
                    result.setErrorType("http_5xx");
                }
            });

            if (!result.isSuccess() && result.getHttpCode() == 502) {
                return result;
            }

            // Content verification (keyword, selector, xpath, error detection)
            ContentVerifier.VerifyResult verifyResult = contentVerifier.verify(body, service);
            if (!verifyResult.isOk()) {
                result.setSuccess(false);
                result.setErrorMessage(verifyResult.getMessage());
                if (verifyResult.getHttpCode() != null) {
                    result.setHttpCode(verifyResult.getHttpCode());
                }
                result.setErrorType("content_error");
                return result;
            }

            result.setSuccess(true);
            result.setErrorMessage("OK");
            return result;

        } catch (java.net.http.HttpTimeoutException e) {
            long elapsed = System.nanoTime() - startTime;
            result.setHttpCode(0);
            result.setResponseTimeMs(elapsed / 1_000_000f);
            result.setSuccess(false);
            result.setErrorMessage("Timeout after " + timeoutSeconds + "s");
            result.setErrorType("timeout");
            return result;

        } catch (java.net.ConnectException e) {
            result.setHttpCode(0);
            result.setResponseTimeMs(0);
            result.setSuccess(false);
            result.setErrorMessage("Connection refused: " + e.getMessage());
            result.setErrorType("connection_refused");
            return result;

        } catch (Exception e) {
            long elapsed = System.nanoTime() - startTime;
            result.setHttpCode(0);
            result.setResponseTimeMs(elapsed / 1_000_000f);
            result.setSuccess(false);
            result.setErrorMessage("Error: " + e.getMessage());
            result.setErrorType("unknown");
            return result;
        } finally {
            networkRateLimiter.release();
        }
    }
}
