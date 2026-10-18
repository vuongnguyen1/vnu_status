package vn.edu.vnu.status.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.vnu.status.model.TelegramSubscriber;

import java.util.List;

public interface TelegramSubscriberRepository extends JpaRepository<TelegramSubscriber, Integer> {
    List<TelegramSubscriber> findByIsActiveTrue();
}
