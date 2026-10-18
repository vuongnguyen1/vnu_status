package vn.edu.vnu.status.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import vn.edu.vnu.status.dto.CheckResultDto;
import vn.edu.vnu.status.model.Log;
import vn.edu.vnu.status.model.ServiceStatsHistory;
import vn.edu.vnu.status.repository.LogRepository;
import vn.edu.vnu.status.repository.ServiceRepository;
import vn.edu.vnu.status.repository.StatsHistoryRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AlertManager — Smart alert logic
 * - Failure threshold = 3 (was 2, reduced false alarms)
 * - Flexible cooldown: 5min for offline, 2min for recovery
 * - Enhanced message format with downtime duration
 */
@Service
public class AlertManager {

    private static final Logger log = LoggerFactory.getLogger(AlertManager.class);

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private LogRepository logRepository;

    @Autowired
    private StatsHistoryRepository statsHistoryRepository;

    @Autowired
    private TelegramService telegramService;

    // Cooldown: prevent spam (serviceId -> last alert time)
    private final Map<Integer, LocalDateTime> alertCooldowns = new ConcurrentHashMap<>();
    private static final int COOLDOWN_OFFLINE_MINUTES = 5;
    private static final int COOLDOWN_RECOVERY_MINUTES = 2;

    /**
     * Process check result for a service: update DB, log, alert
     */
    public void processResult(vn.edu.vnu.status.model.Service service, CheckResultDto result) {
        // Threshold = 3 to reduce false positives
        int threshold = service.getFailureThreshold() != null && service.getFailureThreshold() > 0
                ? service.getFailureThreshold() : 3;
        float currentFailureCount = service.getFailureCount() != null ? service.getFailureCount() : 0;
        boolean oldIsOnline = Boolean.TRUE.equals(service.getIsOnline());

        boolean newIsOnline = oldIsOnline;
        float newFailureCount = currentFailureCount;
        boolean shouldAlert = false;
        boolean shouldLog = false;
        String message = result.getErrorMessage() != null ? result.getErrorMessage() : "OK";

        if (result.isSuccess()) {
            // Check OK
            newFailureCount = 0;
            if (!oldIsOnline) {
                // Was offline → now online (recovery)
                newIsOnline = true;
                shouldAlert = true;
                shouldLog = true;

                // Calculate downtime duration
                LocalDateTime lastChange = service.getLastStatusChange();
                String downtimeStr = "";
                if (lastChange != null) {
                    Duration downtime = Duration.between(lastChange, LocalDateTime.now());
                    long mins = downtime.toMinutes();
                    if (mins < 60) {
                        downtimeStr = mins + " phút";
                    } else {
                        downtimeStr = (mins / 60) + "h" + (mins % 60) + "p";
                    }
                }
                message = "Dịch vụ đã hoạt động trở lại." + (downtimeStr.isEmpty() ? "" : " Thời gian sự cố: " + downtimeStr);
            }
        } else {
            // Check failed
            newFailureCount++;

            if (oldIsOnline) {
                if (newFailureCount >= threshold) {
                    // Exceeded threshold → offline
                    newIsOnline = false;
                    shouldAlert = true;
                    shouldLog = true;
                    message += " (Thất bại " + (int) newFailureCount + "/" + threshold + " lần liên tiếp)";
                } else {
                    message += " (Cảnh báo: Thất bại " + (int) newFailureCount + "/" + threshold + ")";
                }
            }
            // If already offline, just increment counter silently
        }

        // Update counters
        long totalChecks = (service.getTotalChecks() != null ? service.getTotalChecks() : 0) + 1;
        long totalFailures = service.getTotalFailures() != null ? service.getTotalFailures() : 0;
        if (!result.isSuccess() && (!oldIsOnline || newFailureCount >= threshold)) {
            totalFailures++;
        }

        // Update last_status_change
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastStatusChange = service.getLastStatusChange();
        if (newIsOnline != oldIsOnline || lastStatusChange == null) {
            lastStatusChange = now;
        }

        // Persist to DB
        service.setCurrentStatus(result.getHttpCode());
        service.setResponseTime(result.getResponseTimeMs());
        service.setIsOnline(newIsOnline);
        service.setLastCheck(now);
        service.setFailureCount(newFailureCount);
        service.setTotalChecks(totalChecks);
        service.setTotalFailures(totalFailures);
        service.setLastStatusChange(lastStatusChange);
        serviceRepository.save(service);

        // Save stats history (always, for charts)
        ServiceStatsHistory history = new ServiceStatsHistory();
        history.setServiceId(service.getId());
        history.setStatusCode(result.getHttpCode());
        history.setResponseTime(result.getResponseTimeMs());
        history.setIsOnline(newIsOnline);
        history.setCreatedAt(now);
        statsHistoryRepository.save(history);

        // Log status changes
        if (shouldLog) {
            Log logEntry = new Log();
            logEntry.setServiceId(service.getId());
            logEntry.setStatusCode(result.getHttpCode());
            logEntry.setResponseTime(result.getResponseTimeMs());
            logEntry.setMessage(message);
            logEntry.setCreatedAt(now);
            logRepository.save(logEntry);
        }

        // Check high latency (avg 10min > 20s)
        if (newIsOnline && result.getResponseTimeMs() > 20000) {
            Double avgLatency = statsHistoryRepository.avgResponseTime(
                    service.getId(), now.minusMinutes(10));
            if (avgLatency != null && avgLatency > 20000) {
                String latencyMsg = String.format(
                        "⚠️ CẢNH BÁO ĐỘ TRỄ CAO\nDịch vụ: %s\nURL: %s\nPhản hồi: %.2fs\nTrung bình 10p: %.2fs\nThời gian: %s",
                        service.getName(), service.getUrl(),
                        result.getResponseTimeMs() / 1000.0, avgLatency / 1000.0,
                        now.toString()
                );
                sendAlertWithCooldown(service.getId(), latencyMsg, COOLDOWN_OFFLINE_MINUTES);
            }
        }

        // Send status change alert
        if (shouldAlert && (newIsOnline != oldIsOnline)) {
            String statusText = newIsOnline ? "🟢 ONLINE" : "🔴 OFFLINE";
            String responseInfo = result.getResponseTimeMs() > 0
                    ? String.format("%.2fs", result.getResponseTimeMs() / 1000.0) : "N/A";
            String alertMsg = String.format(
                    "<b>CẢNH BÁO DỊCH VỤ</b>\nDịch vụ: %s\nURL: %s\nTrạng thái: %s\nHTTP: %d | Response: %s\nRetry: %d lần\nChi tiết: <pre>%s</pre>\nThời gian: %s",
                    service.getName(), service.getUrl(), statusText,
                    result.getHttpCode(), responseInfo, result.getAttempts(),
                    message, now.toString()
            );
            int cooldownMinutes = newIsOnline ? COOLDOWN_RECOVERY_MINUTES : COOLDOWN_OFFLINE_MINUTES;
            sendAlertWithCooldown(service.getId(), alertMsg, cooldownMinutes);

            // Broadcast to subscribers
            telegramService.broadcastToSubscribers(alertMsg);
        }
    }

    /**
     * Send alert with flexible cooldown to prevent spam
     */
    private void sendAlertWithCooldown(int serviceId, String message, int cooldownMinutes) {
        LocalDateTime lastAlert = alertCooldowns.get(serviceId);
        LocalDateTime now = LocalDateTime.now();

        if (lastAlert != null && lastAlert.plusMinutes(cooldownMinutes).isAfter(now)) {
            log.info("Alert cooldown active for service {} ({}min), skipping", serviceId, cooldownMinutes);
            return;
        }

        alertCooldowns.put(serviceId, now);
        telegramService.sendAlert(message);
    }
}
