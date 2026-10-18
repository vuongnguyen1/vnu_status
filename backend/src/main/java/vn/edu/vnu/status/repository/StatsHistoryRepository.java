package vn.edu.vnu.status.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.vnu.status.model.ServiceStatsHistory;

import java.time.LocalDateTime;
import java.util.List;

public interface StatsHistoryRepository extends JpaRepository<ServiceStatsHistory, Long> {

    @Query("SELECT s FROM ServiceStatsHistory s WHERE s.serviceId = :serviceId AND s.createdAt >= :since ORDER BY s.createdAt ASC")
    List<ServiceStatsHistory> findByServiceIdSince(@Param("serviceId") Integer serviceId, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(s.responseTime) FROM ServiceStatsHistory s WHERE s.serviceId = :serviceId AND s.createdAt >= :since")
    Double avgResponseTime(@Param("serviceId") Integer serviceId, @Param("since") LocalDateTime since);
}
