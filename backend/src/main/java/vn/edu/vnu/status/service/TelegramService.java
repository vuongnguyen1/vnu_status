package vn.edu.vnu.status.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import vn.edu.vnu.status.config.TelegramConfig;
import vn.edu.vnu.status.model.TelegramSubscriber;
import vn.edu.vnu.status.repository.SettingRepository;
import vn.edu.vnu.status.repository.TelegramSubscriberRepository;

import javax.annotation.PostConstruct;
import java.util.List;

/**
 * TelegramService — Async notification via WebClient
 * Replaces PHP's sendTelegramAlert() with non-blocking calls
 */
@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    @Autowired
    private TelegramConfig telegramConfig;

    @Autowired
    private SettingRepository settingRepository;

    @Autowired
    private TelegramSubscriberRepository subscriberRepository;

    private WebClient webClient;

    @PostConstruct
    public void init() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.telegram.org")
                .build();
    }

    private String getBotToken() {
        return settingRepository.findByKeyName("telegram_bot_token")
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isEmpty())
                .orElse(telegramConfig.getBotToken());
    }

    private String getChatId() {
        return settingRepository.findByKeyName("telegram_chat_id")
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isEmpty())
                .orElse(telegramConfig.getChatId());
    }

    /**
     * Send alert to admin group (async, non-blocking)
     */
    public void sendAlert(String message) {
        String token = getBotToken();
        String chatId = getChatId();

        if (token == null || token.isEmpty() || chatId == null || chatId.isEmpty()) {
            log.warn("Telegram not configured, skipping alert");
            return;
        }

        webClient.post()
                .uri("/bot" + token + "/sendMessage")
                .bodyValue(new TelegramMessage(chatId, message, "HTML"))
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(resp -> log.info("Telegram alert sent successfully"))
                .doOnError(err -> log.error("Telegram alert failed: {}", err.getMessage()))
                .subscribe();
    }

    /**
     * Broadcast to all active subscribers (async)
     */
    public void broadcastToSubscribers(String message) {
        List<TelegramSubscriber> subscribers = subscriberRepository.findByIsActiveTrue();
        String token = getBotToken();

        for (TelegramSubscriber sub : subscribers) {
            webClient.post()
                    .uri("/bot" + token + "/sendMessage")
                    .bodyValue(new TelegramMessage(String.valueOf(sub.getTelegramUserId()), message, "HTML"))
                    .retrieve()
                    .bodyToMono(String.class)
                    .doOnError(err -> log.error("Failed to send to {}: {}", sub.getTelegramUserId(), err.getMessage()))
                    .subscribe();
        }
    }

    // Simple POJO for Telegram API payload
    private static class TelegramMessage {
        public String chat_id;
        public String text;
        public String parse_mode;

        public TelegramMessage(String chatId, String text, String parseMode) {
            this.chat_id = chatId;
            this.text = text;
            this.parse_mode = parseMode;
        }
    }
}
