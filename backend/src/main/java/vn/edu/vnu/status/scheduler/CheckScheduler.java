package vn.edu.vnu.status.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.vnu.status.controller.SseController;
import vn.edu.vnu.status.dto.CheckResultDto;
import vn.edu.vnu.status.dto.ServiceStatusDto;
import vn.edu.vnu.status.model.Service;
import vn.edu.vnu.status.repository.ServiceRepository;
import vn.edu.vnu.status.service.AlertManager;
import vn.edu.vnu.status.service.HealthCheckService;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.stream.Collectors;

/**
 * CheckScheduler — Replaces crontab
 *
 * Priority-based scheduling:
 * - Offline services: checked every 30s (fast recovery detection)
 * - Online services: checked every 60s (reduced load)
 * - Staggered batch execution to prevent NIC congestion
 */
@Component
public class CheckScheduler {

    private static final Logger log = LoggerFactory.getLogger(CheckScheduler.class);

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private HealthCheckService healthCheckService;

    @Autowired
    private AlertManager alertManager;

    @Autowired
    private ExecutorService checkExecutor;

    @Autowired
    private SseController sseController;

    private volatile boolean isRunning = false;
    private volatile long lastFullCheckTime = 0;

    /**
     * Priority check — runs every 30 seconds
     * - Always checks OFFLINE services (fast recovery detection)
     * - Only checks ONLINE services every 60s (alternate runs)
     */
    @Scheduled(fixedRate = 30000, initialDelay = 5000)
    public void checkServices() {
        if (isRunning) {
            log.warn("Previous check cycle still running, skipping");
            return;
        }

        isRunning = true;
        long now = System.currentTimeMillis();
        boolean isFullCheck = (now - lastFullCheckTime) >= 55000; // ~60s since last full check

        try {
            List<Service> allServices = serviceRepository.findAllByOrderByIsOnlineAscNameAsc();

            // Filter services based on their check_interval
            List<Service> toCheck = new ArrayList<>();
            for (Service s : allServices) {
                if (s.getLastCheck() == null) {
                    toCheck.add(s);
                    continue;
                }
                
                long secondsSinceLastCheck = (now - s.getLastCheck().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()) / 1000;
                int interval = s.getCheckInterval() != null && s.getCheckInterval() > 0 ? s.getCheckInterval() : 60;
                
                // If offline, check more aggressively (cap at max 60s wait, minimum interval wait, or 30s if interval > 60s)
                if (!Boolean.TRUE.equals(s.getIsOnline())) {
                    if (secondsSinceLastCheck >= Math.min(30, interval)) {
                        toCheck.add(s);
                    }
                } else {
                    // If online, only check during full check cycle AND if interval has passed
                    if (isFullCheck && secondsSinceLastCheck >= interval - 5) { // -5s buffer
                        toCheck.add(s);
                    }
                }
            }

            if (isFullCheck) {
                lastFullCheckTime = now;
            }

            log.info("Check cycle: {} services to check out of {} total", toCheck.size(), allServices.size());

            if (toCheck.isEmpty()) {
                return;
            }

            // Staggered batch execution (batch size = 6, 3s between batches)
            int batchSize = 6;
            for (int i = 0; i < toCheck.size(); i += batchSize) {
                int end = Math.min(i + batchSize, toCheck.size());
                List<Service> batch = toCheck.subList(i, end);

                List<CompletableFuture<Void>> futures = batch.stream()
                        .map(service -> CompletableFuture.runAsync(() -> {
                            try {
                                CheckResultDto result = healthCheckService.checkService(service);
                                Service freshService = serviceRepository.findById(service.getId()).orElse(service);
                                alertManager.processResult(freshService, result);

                                // Push SSE update
                                sseController.pushUpdate(ServiceStatusDto.from(
                                        serviceRepository.findById(service.getId()).orElse(service)));
                            } catch (Exception e) {
                                log.error("Error processing service {}: {}", service.getName(), e.getMessage());
                            }
                        }, checkExecutor))
                        .collect(Collectors.toList());

                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

                // Wait between batches
                if (end < toCheck.size()) {
                    try { Thread.sleep(3000); } catch (InterruptedException ignored) {}
                }
            }

            log.info("Check cycle complete. {} services checked.", toCheck.size());

        } catch (Exception e) {
            log.error("Check cycle error: {}", e.getMessage(), e);
        } finally {
            isRunning = false;
        }
    }
}
