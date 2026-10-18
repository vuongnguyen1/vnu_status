package vn.edu.vnu.status.model;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_stats_history")
public class ServiceStatsHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_id", nullable = false)
    private Integer serviceId;

    @Column(name = "status_code", nullable = false)
    private Integer statusCode;

    @Column(name = "response_time", nullable = false)
    private Float responseTime;

    @Column(name = "is_online", nullable = false)
    private Boolean isOnline;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getServiceId() { return serviceId; }
    public void setServiceId(Integer serviceId) { this.serviceId = serviceId; }
    public Integer getStatusCode() { return statusCode; }
    public void setStatusCode(Integer statusCode) { this.statusCode = statusCode; }
    public Float getResponseTime() { return responseTime; }
    public void setResponseTime(Float responseTime) { this.responseTime = responseTime; }
    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
