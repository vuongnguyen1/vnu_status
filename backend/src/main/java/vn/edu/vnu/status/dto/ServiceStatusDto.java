package vn.edu.vnu.status.dto;

import vn.edu.vnu.status.model.Service;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public class ServiceStatusDto {
    private Integer id;
    private String name;
    private String url;
    private Boolean isOnline;
    private Float responseTime;
    private Integer statusCode;
    private LocalDateTime lastCheck;
    private Double uptime;
    private Integer sslDaysRemaining;
    private Boolean sslExpired;

    public static ServiceStatusDto from(Service s) {
        ServiceStatusDto dto = new ServiceStatusDto();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setUrl(s.getUrl());
        dto.setIsOnline(s.getIsOnline());
        dto.setResponseTime(s.getResponseTime());
        dto.setStatusCode(s.getCurrentStatus());
        dto.setLastCheck(s.getLastCheck());
        dto.setUptime(s.getUptimePercent());

        if (s.getSslExpiry() != null) {
            long days = ChronoUnit.DAYS.between(LocalDateTime.now(), s.getSslExpiry());
            dto.setSslDaysRemaining((int) days);
            dto.setSslExpired(days < 0);
        }

        return dto;
    }

    // Getters & Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }
    public Float getResponseTime() { return responseTime; }
    public void setResponseTime(Float responseTime) { this.responseTime = responseTime; }
    public Integer getStatusCode() { return statusCode; }
    public void setStatusCode(Integer statusCode) { this.statusCode = statusCode; }
    public LocalDateTime getLastCheck() { return lastCheck; }
    public void setLastCheck(LocalDateTime lastCheck) { this.lastCheck = lastCheck; }
    public Double getUptime() { return uptime; }
    public void setUptime(Double uptime) { this.uptime = uptime; }
    public Integer getSslDaysRemaining() { return sslDaysRemaining; }
    public void setSslDaysRemaining(Integer sslDaysRemaining) { this.sslDaysRemaining = sslDaysRemaining; }
    public Boolean getSslExpired() { return sslExpired; }
    public void setSslExpired(Boolean sslExpired) { this.sslExpired = sslExpired; }
}
