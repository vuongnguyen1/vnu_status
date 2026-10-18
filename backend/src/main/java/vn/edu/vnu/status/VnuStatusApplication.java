package vn.edu.vnu.status;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VnuStatusApplication {
    public static void main(String[] args) {
        SpringApplication.run(VnuStatusApplication.class, args);
    }
}
