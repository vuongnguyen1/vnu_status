package vn.edu.vnu.status.model;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "services")
public class Service {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 500)
    private String url;

    private String keyword;

    @Column(name = "check_type")
    private String checkType = "simple";

    @Column(name = "failure_threshold")
    private Integer failureThreshold = 2;

    private Integer timeout = 15;

    @Column(name = "total_checks")
    private Long totalChecks = 0L;

    @Column(name = "total_failures")
    private Long totalFailures = 0L;

    @Column(name = "login_verify_string")
    private String loginVerifyString;

    @Column(name = "current_status")
    private Integer currentStatus = 200;

    @Column(name = "is_online")
    private Boolean isOnline = true;

    @Column(name = "failure_count")
    private Float failureCount = 0f;

    @Column(name = "last_check")
    private LocalDateTime lastCheck;

    @Column(name = "last_status_change")
    private LocalDateTime lastStatusChange;

    @Column(name = "response_time")
    private Float responseTime = 0f;

    @Column(name = "check_resources")
    private Boolean checkResources = false;

    private String category = "general";

    @Column(name = "check_method")
    private String checkMethod = "simple";

    private String selector;
    private String xpath;

    @Column(name = "follow_redirects")
    private Boolean followRedirects = true;

    @Column(name = "use_cookies")
    private Boolean useCookies = false;

    @Column(name = "ssl_expiry")
    private LocalDateTime sslExpiry;

    @Column(name = "ssl_info", columnDefinition = "TEXT")
    private String sslInfo;

    @Column(name = "ignore_ssl")
    private Boolean ignoreSsl = true;

    @Column(name = "use_keyword")
    private Boolean useKeyword = false;

    @Column(name = "use_selector")
    private Boolean useSelector = false;

    @Column(name = "use_xpath")
    private Boolean useXpath = false;

    @Column(name = "use_login_verify")
    private Boolean useLoginVerify = false;

    @Column(name = "ssl_warning_sent")
    private Boolean sslWarningSent = false;

    @Column(name = "last_ssl_error", columnDefinition = "TEXT")
    private String lastSslError;

    @Column(name = "check_interval")
    private Integer checkInterval = 60;

    @Column(name = "last_ssl_check")
    private LocalDateTime lastSslCheck;

    @Column(name = "ssl_expiring_alert_date")
    private LocalDate sslExpiringAlertDate;

    // Getters & Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public String getCheckType() { return checkType; }
    public void setCheckType(String checkType) { this.checkType = checkType; }
    public Integer getFailureThreshold() { return failureThreshold; }
    public void setFailureThreshold(Integer failureThreshold) { this.failureThreshold = failureThreshold; }
    public Integer getTimeout() { return timeout; }
    public void setTimeout(Integer timeout) { this.timeout = timeout; }
    public Integer getCheckInterval() { return checkInterval; }
    public void setCheckInterval(Integer checkInterval) { this.checkInterval = checkInterval; }
    public Long getTotalChecks() { return totalChecks; }
    public void setTotalChecks(Long totalChecks) { this.totalChecks = totalChecks; }
    public Long getTotalFailures() { return totalFailures; }
    public void setTotalFailures(Long totalFailures) { this.totalFailures = totalFailures; }
    public String getLoginVerifyString() { return loginVerifyString; }
    public void setLoginVerifyString(String loginVerifyString) { this.loginVerifyString = loginVerifyString; }
    public Integer getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(Integer currentStatus) { this.currentStatus = currentStatus; }
    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }
    public Float getFailureCount() { return failureCount; }
    public void setFailureCount(Float failureCount) { this.failureCount = failureCount; }
    public LocalDateTime getLastCheck() { return lastCheck; }
    public void setLastCheck(LocalDateTime lastCheck) { this.lastCheck = lastCheck; }
    public LocalDateTime getLastStatusChange() { return lastStatusChange; }
    public void setLastStatusChange(LocalDateTime lastStatusChange) { this.lastStatusChange = lastStatusChange; }
    public Float getResponseTime() { return responseTime; }
    public void setResponseTime(Float responseTime) { this.responseTime = responseTime; }
    public Boolean getCheckResources() { return checkResources; }
    public void setCheckResources(Boolean checkResources) { this.checkResources = checkResources; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getCheckMethod() { return checkMethod; }
    public void setCheckMethod(String checkMethod) { this.checkMethod = checkMethod; }
    public String getSelector() { return selector; }
    public void setSelector(String selector) { this.selector = selector; }
    public String getXpath() { return xpath; }
    public void setXpath(String xpath) { this.xpath = xpath; }
    public Boolean getFollowRedirects() { return followRedirects; }
    public void setFollowRedirects(Boolean followRedirects) { this.followRedirects = followRedirects; }
    public Boolean getUseCookies() { return useCookies; }
    public void setUseCookies(Boolean useCookies) { this.useCookies = useCookies; }
    public LocalDateTime getSslExpiry() { return sslExpiry; }
    public void setSslExpiry(LocalDateTime sslExpiry) { this.sslExpiry = sslExpiry; }
    public String getSslInfo() { return sslInfo; }
    public void setSslInfo(String sslInfo) { this.sslInfo = sslInfo; }
    public Boolean getIgnoreSsl() { return ignoreSsl; }
    public void setIgnoreSsl(Boolean ignoreSsl) { this.ignoreSsl = ignoreSsl; }
    public Boolean getUseKeyword() { return useKeyword; }
    public void setUseKeyword(Boolean useKeyword) { this.useKeyword = useKeyword; }
    public Boolean getUseSelector() { return useSelector; }
    public void setUseSelector(Boolean useSelector) { this.useSelector = useSelector; }
    public Boolean getUseXpath() { return useXpath; }
    public void setUseXpath(Boolean useXpath) { this.useXpath = useXpath; }
    public Boolean getUseLoginVerify() { return useLoginVerify; }
    public void setUseLoginVerify(Boolean useLoginVerify) { this.useLoginVerify = useLoginVerify; }
    public Boolean getSslWarningSent() { return sslWarningSent; }
    public void setSslWarningSent(Boolean sslWarningSent) { this.sslWarningSent = sslWarningSent; }
    public String getLastSslError() { return lastSslError; }
    public void setLastSslError(String lastSslError) { this.lastSslError = lastSslError; }
    public LocalDateTime getLastSslCheck() { return lastSslCheck; }
    public void setLastSslCheck(LocalDateTime lastSslCheck) { this.lastSslCheck = lastSslCheck; }
    public LocalDate getSslExpiringAlertDate() { return sslExpiringAlertDate; }
    public void setSslExpiringAlertDate(LocalDate sslExpiringAlertDate) { this.sslExpiringAlertDate = sslExpiringAlertDate; }

    public double getUptimePercent() {
        if (totalChecks == null || totalChecks == 0) return 100.0;
        return Math.round(((double)(totalChecks - (totalFailures != null ? totalFailures : 0)) / totalChecks) * 10000.0) / 100.0;
    }
}
