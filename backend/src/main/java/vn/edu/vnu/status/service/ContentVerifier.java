package vn.edu.vnu.status.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import vn.edu.vnu.status.model.Service;

/**
 * Content Verifier — Comprehensive server-death detection
 * Uses Jsoup for accurate DOM parsing instead of regex
 *
 * Detection rules:
 * 1. STALE cache proxy content
 * 2. HTTP error pages in body (502/503/500/504)
 * 3. Cloudflare challenge pages
 * 4. Maintenance / bảo trì pages
 * 5. Default server pages (nginx, Apache)
 * 6. JSON error responses
 * 7. Keyword / Selector / XPath checks
 * 8. Empty body detection
 */
@Component
public class ContentVerifier {

    private static final Logger log = LoggerFactory.getLogger(ContentVerifier.class);

    public VerifyResult verify(String htmlContent, Service service) {
        if (htmlContent == null || htmlContent.isEmpty()) {
            return VerifyResult.fail("No content received from server");
        }

        // 1. Check for stale/proxy error content in body
        if (htmlContent.contains("X-Cache-Status: STALE")) {
            return VerifyResult.fail("Backend Error: Serving Stale Content (Likely 502)", 502);
        }

        String lowerContent = htmlContent.toLowerCase();

        // 2. HTTP error pages embedded in body (even if HTTP code was 200 via proxy cache)
        if (lowerContent.contains("500 internal server error")) {
            return VerifyResult.fail("Page contains 500 Internal Server Error", 500);
        }
        if (lowerContent.contains("502 bad gateway")) {
            return VerifyResult.fail("Page contains 502 Bad Gateway error", 502);
        }
        if (lowerContent.contains("503 service unavailable") || lowerContent.contains("503 service temporarily unavailable")) {
            return VerifyResult.fail("Page contains 503 Service Unavailable", 503);
        }
        if (lowerContent.contains("504 gateway timeout") || lowerContent.contains("504 gateway time-out")) {
            return VerifyResult.fail("Page contains 504 Gateway Timeout", 504);
        }

        // 3. Cloudflare challenge / DDoS protection pages
        if (lowerContent.contains("cf-browser-verification") || lowerContent.contains("challenge-platform")
                || lowerContent.contains("checking your browser before accessing")
                || lowerContent.contains("attention required! | cloudflare")) {
            return VerifyResult.fail("Cloudflare challenge page detected — service may be under attack or misconfigured", 403);
        }

        // 4. Maintenance / bảo trì pages
        if (lowerContent.contains("đang bảo trì") || lowerContent.contains("đang nâng cấp")
                || lowerContent.contains("under maintenance") || lowerContent.contains("scheduled maintenance")
                || lowerContent.contains("temporarily down for maintenance")) {
            return VerifyResult.fail("Maintenance page detected — service is under maintenance", 503);
        }

        // 5. Default server pages (server is up but app is not deployed)
        if (lowerContent.contains("welcome to nginx!") && lowerContent.contains("thank you for using nginx")) {
            return VerifyResult.fail("Nginx default page — application not deployed", 503);
        }
        if (lowerContent.contains("apache2 ubuntu default page") || lowerContent.contains("apache2 debian default page")) {
            return VerifyResult.fail("Apache default page — application not deployed", 503);
        }
        if (lowerContent.contains("it works!") && htmlContent.length() < 500) {
            return VerifyResult.fail("Default server test page — application not deployed", 503);
        }

        // 6. JSON error responses (API services returning error JSON)
        if (htmlContent.trim().startsWith("{") && htmlContent.trim().endsWith("}")) {
            String trimmed = htmlContent.trim();
            if (trimmed.contains("\"error\"") && (trimmed.contains("\"status\":500") || trimmed.contains("\"status\": 500")
                    || trimmed.contains("\"status\":502") || trimmed.contains("\"status\": 502")
                    || trimmed.contains("\"status\":503") || trimmed.contains("\"status\": 503"))) {
                return VerifyResult.fail("API returned error JSON response", 500);
            }
        }

        // 7. Keyword check (user-configured)
        if (Boolean.TRUE.equals(service.getUseKeyword()) && service.getKeyword() != null && !service.getKeyword().isEmpty()) {
            if (!lowerContent.contains(service.getKeyword().toLowerCase())) {
                return VerifyResult.fail("Keyword Mismatch: Expected '" + service.getKeyword() + "' but not found.");
            }
        }

        // 8. Selector check (CSS selector via Jsoup)
        if (Boolean.TRUE.equals(service.getUseSelector()) && service.getSelector() != null && !service.getSelector().isEmpty()) {
            try {
                Document doc = Jsoup.parse(htmlContent);
                Elements found = doc.select(service.getSelector());
                if (found.isEmpty()) {
                    return VerifyResult.fail("Selector Not Found: '" + service.getSelector() + "'");
                }
            } catch (Exception e) {
                return VerifyResult.fail("Selector Error: " + e.getMessage());
            }
        }

        // 9. XPath check
        if (Boolean.TRUE.equals(service.getUseXpath()) && service.getXpath() != null && !service.getXpath().isEmpty()) {
            try {
                Document doc = Jsoup.parse(htmlContent);
                String xpathExpr = service.getXpath();
                boolean found = evaluateXpathLike(doc, xpathExpr);
                if (!found) {
                    return VerifyResult.fail("XPath Not Found: '" + xpathExpr + "'");
                }
            } catch (Exception e) {
                return VerifyResult.fail("XPath Error: " + e.getMessage());
            }
        }

        // 10. Backward compatibility: legacy keyword check
        if (!Boolean.TRUE.equals(service.getUseKeyword()) && !Boolean.TRUE.equals(service.getUseSelector()) && !Boolean.TRUE.equals(service.getUseXpath())) {
            if ("keyword".equals(service.getCheckMethod()) || "login_verify".equals(service.getCheckType())) {
                String kw = service.getKeyword();
                if (kw != null && !kw.isEmpty()) {
                    if (!lowerContent.contains(kw.toLowerCase())) {
                        return VerifyResult.fail("Keyword Mismatch: Expected '" + kw + "' but not found.");
                    }
                }
            }
        }

        // 11. Empty body check
        String textContent = Jsoup.parse(htmlContent).text().trim();
        if (textContent.length() < 10 && !htmlContent.contains("<html")) {
            return VerifyResult.fail("Empty or minimal page content (< 10 chars visible text)");
        }

        return VerifyResult.ok();
    }

    /**
     * Simple XPath-like evaluation using Jsoup
     * Converts common XPath patterns to CSS selectors
     */
    private boolean evaluateXpathLike(Document doc, String xpath) {
        String cssSelector = xpath
                .replace("//", "")
                .replace("/", " > ")
                .replaceAll("\\[@id='([^']+)'\\]", "#$1")
                .replaceAll("\\[@class='([^']+)'\\]", ".$1")
                .replaceAll("\\[contains\\(@class,\\s*'([^']+)'\\)\\]", ".$1");

        try {
            Elements elements = doc.select(cssSelector);
            return !elements.isEmpty();
        } catch (Exception e) {
            // If CSS conversion fails, try text search as fallback
            return doc.html().contains(xpath);
        }
    }

    public static class VerifyResult {
        private final boolean ok;
        private final String message;
        private final Integer httpCode;

        private VerifyResult(boolean ok, String message, Integer httpCode) {
            this.ok = ok;
            this.message = message;
            this.httpCode = httpCode;
        }

        public static VerifyResult ok() { return new VerifyResult(true, "OK", null); }
        public static VerifyResult fail(String message) { return new VerifyResult(false, message, null); }
        public static VerifyResult fail(String message, int httpCode) { return new VerifyResult(false, message, httpCode); }

        public boolean isOk() { return ok; }
        public String getMessage() { return message; }
        public Integer getHttpCode() { return httpCode; }
    }
}
