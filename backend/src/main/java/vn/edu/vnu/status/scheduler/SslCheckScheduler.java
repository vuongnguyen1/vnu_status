package vn.edu.vnu.status.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.vnu.status.model.Service;
import vn.edu.vnu.status.repository.ServiceRepository;
import vn.edu.vnu.status.service.TelegramService;

import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class SslCheckScheduler {

    private static final Logger log = LoggerFactory.getLogger(SslCheckScheduler.class);

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private TelegramService telegramService;

    /**
     * Run every minute, but only check services that need to be checked
     * based on their custom frequency (24 hours normal, 5 minutes if expiring)
     */
    @Scheduled(fixedRate = 60000)
    public void scheduleSslChecks() {
        checkSslCertificates(false);
    }

    public void checkSslCertificates(boolean forceAll) {
        log.info("Running SSL certificate check (force={})...", forceAll);
        List<Service> services = serviceRepository.findAllByOrderByIsOnlineAscNameAsc();
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        for (Service service : services) {
            if (service.getUrl() == null || !service.getUrl().startsWith("https")) {
                continue;
            }

            boolean shouldCheck = forceAll;
            long oldDaysRemaining = 999;
            LocalDateTime oldExpiry = service.getSslExpiry();
            
            if (oldExpiry != null) {
                oldDaysRemaining = ChronoUnit.DAYS.between(now, oldExpiry);
            }

            if (!shouldCheck) {
                if (service.getLastSslCheck() == null) {
                    shouldCheck = true;
                } else {
                    long minutesSinceLastCheck = ChronoUnit.MINUTES.between(service.getLastSslCheck(), now);
                    if (minutesSinceLastCheck >= 1440) { // 24 hours
                        shouldCheck = true;
                    } else if (oldDaysRemaining <= 15 && minutesSinceLastCheck >= 5) { // 5 minutes if expiring soon
                        shouldCheck = true;
                    }
                }
            }

            if (!shouldCheck) continue;

            service.setLastSslCheck(now);

            try {
                URL url = new URL(service.getUrl());
                HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.connect();

                Certificate[] certs = conn.getServerCertificates();
                if (certs.length > 0 && certs[0] instanceof X509Certificate) {
                    X509Certificate cert = (X509Certificate) certs[0];
                    LocalDateTime expiryDate = cert.getNotAfter().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
                    service.setSslExpiry(expiryDate);

                    long newDaysRemaining = ChronoUnit.DAYS.between(now, expiryDate);

                    // Detect Renewal
                    if (oldExpiry != null && oldDaysRemaining <= 15 && newDaysRemaining > 15 && expiryDate.isAfter(oldExpiry.plusDays(1))) {
                        String renewMsg = String.format("✅ <b>GIA HẠN SSL THÀNH CÔNG</b>\nDịch vụ: %s\nURL: %s\nHạn mới: %s",
                                service.getName(), service.getUrl(), expiryDate.format(formatter));
                        telegramService.sendAlert(renewMsg);
                        
                        // Clear warnings
                        service.setSslWarningSent(false);
                        service.setLastSslError(null);
                        service.setSslExpiringAlertDate(null);
                    }

                    // Expiring Warning
                    if (newDaysRemaining <= 15 && newDaysRemaining > 0 && !Boolean.TRUE.equals(service.getIgnoreSsl())) {
                        if (service.getSslExpiringAlertDate() == null || !service.getSslExpiringAlertDate().isEqual(today)) {
                            String msg = String.format("⚠️ <b>CHỨNG CHỈ SSL SẮP HẾT HẠN</b>\nDịch vụ: %s\nURL: %s\nThời gian còn lại: %d ngày\nHết hạn vào: %s",
                                    service.getName(), service.getUrl(), newDaysRemaining, expiryDate.format(formatter));
                            telegramService.sendAlert(msg);
                            service.setSslExpiringAlertDate(today);
                        }
                    } else if (newDaysRemaining > 15) {
                        service.setSslWarningSent(false);
                        service.setLastSslError(null);
                        service.setSslExpiringAlertDate(null);
                    } else if (newDaysRemaining <= 0 && !Boolean.TRUE.equals(service.getIgnoreSsl())) {
                        // Already Expired
                        if (!Boolean.TRUE.equals(service.getSslWarningSent())) {
                            String msg = String.format("🚨 <b>LỖI SSL (Hết hạn)</b>\nDịch vụ: %s\nURL: %s\nĐã hết hạn vào: %s",
                                    service.getName(), service.getUrl(), expiryDate.format(formatter));
                            telegramService.sendAlert(msg);
                            service.setSslWarningSent(true);
                            service.setLastSslError("ĐÃ HẾT HẠN");
                        }
                    }
                }
                conn.disconnect();
            } catch (Exception e) {
                log.warn("Failed to check SSL for {}: {}", service.getUrl(), e.getMessage());
                if (!Boolean.TRUE.equals(service.getIgnoreSsl())) {
                    service.setLastSslError("Lỗi kết nối SSL: " + e.getMessage());
                    if (!Boolean.TRUE.equals(service.getSslWarningSent())) {
                        String msg = String.format("🚨 <b>LỖI KẾT NỐI SSL</b>\nDịch vụ: %s\nURL: %s\nLỗi: %s",
                                service.getName(), service.getUrl(), e.getMessage());
                        telegramService.sendAlert(msg);
                        service.setSslWarningSent(true);
                    }
                }
            }
            
            serviceRepository.save(service);
        }
        log.info("Finished SSL certificate check.");
    }
}
