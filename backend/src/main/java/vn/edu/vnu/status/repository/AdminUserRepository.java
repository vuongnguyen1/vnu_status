package vn.edu.vnu.status.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.vnu.status.model.AdminUser;
import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Integer> {
    Optional<AdminUser> findByUsername(String username);
}
