package vn.edu.vnu.status.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.vnu.status.model.ExternalService;

import java.util.List;

public interface ExternalServiceRepository extends JpaRepository<ExternalService, Integer> {
    List<ExternalService> findAllByOrderByNameAsc();
    List<ExternalService> findByCurrentStatusNot(String status);
}
