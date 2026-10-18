package vn.edu.vnu.status.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.vnu.status.model.Setting;

import java.util.Optional;

public interface SettingRepository extends JpaRepository<Setting, Integer> {
    Optional<Setting> findByKeyName(String keyName);
}
