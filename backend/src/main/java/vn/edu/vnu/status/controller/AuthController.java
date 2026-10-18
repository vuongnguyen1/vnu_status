package vn.edu.vnu.status.controller;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.vnu.status.model.AdminUser;
import vn.edu.vnu.status.repository.AdminUserRepository;
import vn.edu.vnu.status.util.JwtUtil;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired private vn.edu.vnu.status.scheduler.SslCheckScheduler sslCheckScheduler;
    
    @PostMapping("/quick-scan") 
    public ResponseEntity<?> runQuickScan() { 
        // Trigger forced SSL check synchronously or asynchronously
        // We'll run it synchronously for the quick scan
        sslCheckScheduler.checkSslCertificates(true); 
        return ResponseEntity.ok().body("{\"status\":\"success\",\"message\":\"Quick scan initiated\"}"); 
    }

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private JwtUtil jwtUtil;

    public static class LoginRequest {
        public String username;
        public String password;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<AdminUser> optUser = adminUserRepository.findByUsername(request.username);
        if (optUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password"));
        }

        AdminUser user = optUser.get();
        // Check password using BCrypt - PHP uses $2y$ prefix, Java BCrypt needs $2a$
        try {
            String storedHash = user.getPassword();
            if (storedHash.startsWith("$2y$")) {
                storedHash = "$2a$" + storedHash.substring(4);
            }
            if (!BCrypt.checkpw(request.password, storedHash)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Password verification failed"));
        }

        String token = jwtUtil.generateToken(user.getUsername());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("username", user.getUsername());
        response.put("role", user.getRole());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> verifyToken(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String token = authHeader.substring(7);
        if (jwtUtil.validateToken(token)) {
            return ResponseEntity.ok(Map.of("valid", true));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
