package vn.edu.vnu.status.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.vnu.status.dto.ServiceStatusDto;
import vn.edu.vnu.status.model.ExternalService;
import vn.edu.vnu.status.model.Log;
import vn.edu.vnu.status.model.Service;
import vn.edu.vnu.status.model.ServiceStatsHistory;
import vn.edu.vnu.status.repository.*;
import vn.edu.vnu.status.util.JwtUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ServiceController {

    @Autowired
    private ServiceRepository serviceRepository;

    @Autowired
    private LogRepository logRepository;

    @Autowired
    private StatsHistoryRepository statsHistoryRepository;

    @Autowired
    private ExternalServiceRepository externalServiceRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private boolean isAuthenticated(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        return jwtUtil.validateToken(authHeader.substring(7));
    }

    // ===== SERVICES =====

    @GetMapping("/services")
    public Map<String, Object> getAllServices(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        boolean isAuth = isAuthenticated(authHeader);
        List<Service> all = serviceRepository.findAllByOrderByIsOnlineAscNameAsc();

        Map<String, List<ServiceStatusDto>> grouped = new LinkedHashMap<>();
        grouped.put("general", new ArrayList<>());
        grouped.put("student", new ArrayList<>());
        grouped.put("staff", new ArrayList<>());
        if (isAuth) {
            grouped.put("internal", new ArrayList<>());
        }

        long onlineCount = 0;
        double totalLatency = 0;
        int latencyCount = 0;

        for (Service s : all) {
            String cat = s.getCategory() != null ? s.getCategory() : "general";
            
            // Skip internal services if not authenticated
            if ("internal".equals(cat) && !isAuth) {
                continue;
            }

            ServiceStatusDto dto = ServiceStatusDto.from(s);
            grouped.computeIfAbsent(cat, k -> new ArrayList<>()).add(dto);

            if (Boolean.TRUE.equals(s.getIsOnline())) {
                onlineCount++;
                if (s.getResponseTime() != null && s.getResponseTime() > 0) {
                    totalLatency += s.getResponseTime();
                    latencyCount++;
                }
            }
        }

        // Stats
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        Long todayIncidents = logRepository.countTodayIncidents(todayStart);

        int visibleTotal = grouped.values().stream().mapToInt(List::size).sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("services", grouped);
        result.put("stats", Map.of(
                "total", visibleTotal,
                "online", onlineCount,
                "offline", visibleTotal - onlineCount,
                "avgLatency", latencyCount > 0 ? Math.round(totalLatency / latencyCount / 10.0) / 100.0 : 0,
                "todayIncidents", todayIncidents != null ? todayIncidents : 0
        ));

        return result;
    }

    @GetMapping("/services/{id}")
    public ResponseEntity<?> getServiceDetail(@PathVariable Integer id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Service service = serviceRepository.findById(id).orElse(null);
        if (service == null) return ResponseEntity.notFound().build();

        if ("internal".equals(service.getCategory()) && !isAuthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("service", service); // Send full entity for admin edit
        result.put("dto", ServiceStatusDto.from(service));

        // Recent logs (last 50)
        List<Log> logs = logRepository.findByServiceIdOrderByCreatedAtDesc(id, PageRequest.of(0, 50));
        result.put("logs", logs);

        // Chart data (last 24h)
        LocalDateTime since24h = LocalDateTime.now().minusHours(24);
        List<ServiceStatsHistory> history = statsHistoryRepository.findByServiceIdSince(id, since24h);

        List<String> labels = new ArrayList<>();
        List<Float> responseTimes = new ArrayList<>();
        List<Integer> statusCodes = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");

        for (ServiceStatsHistory h : history) {
            labels.add(h.getCreatedAt() != null ? h.getCreatedAt().format(fmt) : "");
            responseTimes.add(h.getResponseTime() != null ? h.getResponseTime() : 0);
            statusCodes.add(h.getStatusCode() != null ? h.getStatusCode() : 0);
        }

        result.put("chart", Map.of(
                "labels", labels,
                "responseTimes", responseTimes,
                "statusCodes", statusCodes
        ));

        return ResponseEntity.ok(result);
    }

    @PutMapping("/services/{id}")
    public ResponseEntity<?> updateService(@PathVariable Integer id, @RequestBody Service updatedData, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Service service = serviceRepository.findById(id).orElse(null);
        if (service == null) return ResponseEntity.notFound().build();

        service.setUseSelector(updatedData.getUseSelector());
        service.setSelector(updatedData.getSelector());
        service.setUseXpath(updatedData.getUseXpath());
        service.setXpath(updatedData.getXpath());
        service.setIgnoreSsl(updatedData.getIgnoreSsl());
        
        service.setUseKeyword(updatedData.getUseKeyword());
        service.setKeyword(updatedData.getKeyword());
        service.setTimeout(updatedData.getTimeout());
        service.setFailureThreshold(updatedData.getFailureThreshold());
        service.setUseLoginVerify(updatedData.getUseLoginVerify());
        service.setLoginVerifyString(updatedData.getLoginVerifyString());
        if (updatedData.getCheckInterval() != null) {
            service.setCheckInterval(updatedData.getCheckInterval());
        }

        serviceRepository.save(service);
        return ResponseEntity.ok(Map.of("success", true, "service", service));
    }

    @PostMapping("/services")
    public ResponseEntity<?> createService(@RequestBody Service newService, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (newService.getName() == null || newService.getUrl() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Name and URL are required"));
        }
        newService.setIsOnline(true);
        newService.setCurrentStatus(200);
        newService.setTotalChecks(0L);
        newService.setTotalFailures(0L);
        newService.setFailureCount(0f);
        if (newService.getCategory() == null) {
            newService.setCategory("general");
        }
        if (newService.getCheckInterval() == null) {
            newService.setCheckInterval(60);
        }
        serviceRepository.save(newService);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "service", newService));
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<?> deleteService(@PathVariable Integer id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Service service = serviceRepository.findById(id).orElse(null);
        if (service == null) return ResponseEntity.notFound().build();
        
        serviceRepository.delete(service);
        return ResponseEntity.ok(Map.of("success", true));
    }


    @GetMapping("/services/{id}/chart")
    public Map<String, Object> getChartData(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "day") String range) {

        LocalDateTime since;
        switch (range) {
            case "week": since = LocalDateTime.now().minusDays(7); break;
            case "month": since = LocalDateTime.now().minusDays(30); break;
            default: since = LocalDateTime.now().minusHours(24); break;
        }

        List<ServiceStatsHistory> history = statsHistoryRepository.findByServiceIdSince(id, since);

        List<String> labels = new ArrayList<>();
        List<Float> responseTimes = new ArrayList<>();
        List<Integer> statusCodes = new ArrayList<>();
        List<String> statusColors = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm dd/MM");

        for (ServiceStatsHistory h : history) {
            labels.add(h.getCreatedAt() != null ? h.getCreatedAt().format(fmt) : "");
            float rt = h.getResponseTime() != null ? h.getResponseTime() : 0;
            responseTimes.add(rt);
            int code = h.getStatusCode() != null ? h.getStatusCode() : 0;
            statusCodes.add(code);

            if (code >= 200 && code < 300) statusColors.add("rgba(34,197,94,0.7)");
            else if (code >= 400) statusColors.add("rgba(239,68,68,0.7)");
            else statusColors.add("rgba(234,179,8,0.7)");
        }

        return Map.of(
                "labels", labels,
                "response_times", responseTimes,
                "status_codes", statusCodes,
                "status_colors", statusColors
        );
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatusSummary() {
        List<Service> all = serviceRepository.findAllByOrderByIsOnlineAscNameAsc();
        long total = all.size();
        long onlineCount = all.stream().filter(s -> Boolean.TRUE.equals(s.getIsOnline())).count();
        long offlineCount = total - onlineCount;

        String systemStatus = "OPERATIONAL";
        if (offlineCount > 0) {
            double ratio = (double) onlineCount / (double) total;
            systemStatus = ratio < 0.5 ? "MAJOR_OUTAGE" : "PARTIAL_OUTAGE";
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("system_status", systemStatus);
        resp.put("total_services", total);
        resp.put("online_count", onlineCount);
        resp.put("offline_count", offlineCount);
        resp.put("timestamp", LocalDateTime.now().toString());

        Optional<Service> idpOpt = all.stream().filter(s -> s.getUrl() != null && s.getUrl().contains("idp.vnu.edu.vn")).findFirst();
        if (idpOpt.isPresent()) {
            Service idp = idpOpt.get();
            Map<String, Object> idpData = new HashMap<>();
            idpData.put("name", idp.getName());
            idpData.put("is_online", idp.getIsOnline());
            idpData.put("current_status", idp.getCurrentStatus());
            idpData.put("response_time_ms", idp.getResponseTime());
            idpData.put("last_check", idp.getLastCheck());
            resp.put("idp_status", idpData);
        }

        return ResponseEntity.ok(resp);
    }

    @GetMapping("/offline")
    public Map<String, Object> getOfflineServices() {
        List<Service> offlineInternal = serviceRepository.findByIsOnlineFalse();
        List<ExternalService> offlineExternal = externalServiceRepository.findByCurrentStatusNot("Operational");

        return Map.of(
                "internal_offline", offlineInternal.stream().map(ServiceStatusDto::from).collect(Collectors.toList()),
                "external_offline", offlineExternal,
                "total_offline", offlineInternal.size() + offlineExternal.size()
        );
    }

    @GetMapping("/external")
    public List<ExternalService> getExternalServices() {
        return externalServiceRepository.findAllByOrderByNameAsc();
    }

    @GetMapping("/logs/{serviceId}")
    public List<Log> getServiceLogs(
            @PathVariable Integer serviceId,
            @RequestParam(defaultValue = "50") int limit) {
        return logRepository.findByServiceIdOrderByCreatedAtDesc(serviceId, PageRequest.of(0, limit));
    }
}
