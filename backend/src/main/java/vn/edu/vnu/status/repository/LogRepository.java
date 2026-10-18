package vn.edu.vnu.status.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.vnu.status.model.Log;

import java.time.LocalDateTime;
import java.util.List;

public interface LogRepository extends JpaRepository<Log, Long> {

    List<Log> findByServiceIdOrderByCreatedAtDesc(Integer serviceId, Pageable pageable);

    @Query("SELECT l FROM Log l WHERE l.serviceId = :serviceId AND l.createdAt >= :since ORDER BY l.createdAt DESC")
    List<Log> findRecentLogs(@Param("serviceId") Integer serviceId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT l.serviceId) FROM Log l WHERE l.createdAt >= :since AND (l.statusCode >= 400 OR l.statusCode = 0)")
    Long countTodayIncidents(@Param("since") LocalDateTime since);

    Log findFirstByServiceIdOrderByCreatedAtDesc(Integer serviceId);
}
