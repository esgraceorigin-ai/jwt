package com.example.demo.test;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/data{number}")
    public Map<String, Object> data(
            @PathVariable int number,
            Authentication authentication
    ) throws InterruptedException {

        String userId = authentication.getName();

        log.info("[TEST-API] data{} called. userId={}", number, userId);

        Thread.sleep(150);

        return Map.of(
                "data", "data" + number,
                "userId", userId,
                "time", LocalDateTime.now().toString(),
                "message", "protected api success"
        );
    }
}