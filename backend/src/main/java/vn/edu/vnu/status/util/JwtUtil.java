package vn.edu.vnu.status.util;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {
    
    // In production, this should be an environment variable. For this project, a static secret is fine.
    private static final String SECRET_KEY = "VnuStatusSuperSecretKeyForAdminAuthVnuStatusSuperSecretKeyForAdminAuth";
    private static final long EXPIRATION_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours

    public String generateToken(String username) {
        long nowMillis = System.currentTimeMillis();
        long expMillis = nowMillis + EXPIRATION_TIME_MS;

        String header = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(("{\"sub\":\"" + username + "\",\"exp\":" + (expMillis/1000) + "}").getBytes(StandardCharsets.UTF_8));
        
        String signature = hmacSha256(header + "." + payload, SECRET_KEY);
        return header + "." + payload + "." + signature;
    }

    public boolean validateToken(String token) {
        if (token == null || token.isEmpty()) return false;
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return false;

            String header = parts[0];
            String payload = parts[1];
            String signature = parts[2];

            String expectedSignature = hmacSha256(header + "." + payload, SECRET_KEY);
            if (!expectedSignature.equals(signature)) return false;

            // Check expiration
            String decodedPayload = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
            if (decodedPayload.contains("\"exp\":")) {
                int expStart = decodedPayload.indexOf("\"exp\":") + 6;
                int expEnd = decodedPayload.indexOf(",", expStart);
                if (expEnd == -1) expEnd = decodedPayload.indexOf("}", expStart);
                long exp = Long.parseLong(decodedPayload.substring(expStart, expEnd).trim());
                if (exp * 1000 < System.currentTimeMillis()) {
                    return false; // Expired
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC SHA256", e);
        }
    }
}
