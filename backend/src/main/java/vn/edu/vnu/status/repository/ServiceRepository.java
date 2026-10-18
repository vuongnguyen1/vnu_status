package vn.edu.vnu.status.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.vnu.status.model.Service;

import java.util.List;

public interface ServiceRepository extends JpaRepository<Service, Integer> {

    List<Service> findAllByOrderByIsOnlineAscNameAsc();

    List<Service> findByCategoryOrderByNameAsc(String category);

    @Query("SELECT s FROM Service s WHERE s.category != 'internal' ORDER BY s.isOnline ASC, s.name ASC")
    List<Service> findPublicServices();

    List<Service> findByIsOnlineFalse();
}
