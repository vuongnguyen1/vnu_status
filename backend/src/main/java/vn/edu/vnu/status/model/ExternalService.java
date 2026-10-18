package vn.edu.vnu.status.model;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "external_services")
public class ExternalService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 500)
    private String url;

    private String provider = "other";
    private String selector;

    @Column(name = "good_keyword")
    private String goodKeyword = "Operational";

    @Column(name = "current_status", length = 50)
    private String currentStatus = "Unknown";

    @Column(name = "last_check")
    private LocalDateTime lastCheck;

    @Column(name = "last_status_change")
    private LocalDateTime lastStatusChange;

    @Column(name = "check_method")
    private String checkMethod = "simple";

    private String xpath;

    @Column(name = "follow_redirects")
    private Boolean followRedirects = true;

    @Column(name = "use_cookies")
    private Boolean useCookies = false;

    @Column(name = "ignore_ssl")
    private Boolean ignoreSsl = true;

    @Column(name = "use_keyword")
    private Boolean useKeyword = false;

    @Column(name = "use_selector")
    private Boolean useSelector = false;

    @Column(name = "use_xpath")
    private Boolean useXpath = false;

    // Getters & Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getSelector() { return selector; }
    public void setSelector(String selector) { this.selector = selector; }
    public String getGoodKeyword() { return goodKeyword; }
    public void setGoodKeyword(String goodKeyword) { this.goodKeyword = goodKeyword; }
    public String getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(String currentStatus) { this.currentStatus = currentStatus; }
    public LocalDateTime getLastCheck() { return lastCheck; }
    public void setLastCheck(LocalDateTime lastCheck) { this.lastCheck = lastCheck; }
    public LocalDateTime getLastStatusChange() { return lastStatusChange; }
    public void setLastStatusChange(LocalDateTime lastStatusChange) { this.lastStatusChange = lastStatusChange; }
    public String getCheckMethod() { return checkMethod; }
    public void setCheckMethod(String checkMethod) { this.checkMethod = checkMethod; }
    public String getXpath() { return xpath; }
    public void setXpath(String xpath) { this.xpath = xpath; }
    public Boolean getFollowRedirects() { return followRedirects; }
    public void setFollowRedirects(Boolean followRedirects) { this.followRedirects = followRedirects; }
    public Boolean getUseCookies() { return useCookies; }
    public void setUseCookies(Boolean useCookies) { this.useCookies = useCookies; }
    public Boolean getIgnoreSsl() { return ignoreSsl; }
    public void setIgnoreSsl(Boolean ignoreSsl) { this.ignoreSsl = ignoreSsl; }
    public Boolean getUseKeyword() { return useKeyword; }
    public void setUseKeyword(Boolean useKeyword) { this.useKeyword = useKeyword; }
    public Boolean getUseSelector() { return useSelector; }
    public void setUseSelector(Boolean useSelector) { this.useSelector = useSelector; }
    public Boolean getUseXpath() { return useXpath; }
    public void setUseXpath(Boolean useXpath) { this.useXpath = useXpath; }
}
