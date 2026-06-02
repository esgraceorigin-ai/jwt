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
                "delayMs", 150,
                "time", LocalDateTime.now().toString(),
                "message", "protected api success"
        );
    }

    @GetMapping("/async{number}")
    public Map<String, Object> asyncData(
            @PathVariable int number,
            Authentication authentication
    ) throws InterruptedException {

        String userId = authentication.getName();
        long delayMs = delayFor(number);

        log.info("[ASYNC-API] async{} called. userId={}, delayMs={}", number, userId, delayMs);

        Thread.sleep(delayMs);

        log.info("[ASYNC-API] async{} completed. userId={}, delayMs={}", number, userId, delayMs);

        return Map.of(
                "data", "async" + number,
                "userId", userId,
                "delayMs", delayMs,
                "time", LocalDateTime.now().toString(),
                "message", "async response order test"
        );
    }

    private long delayFor(int number) {
        return switch (number) {
            case 1 -> 900;
            case 2 -> 100;
            case 3 -> 700;
            case 4 -> 200;
            case 5 -> 800;
            case 6 -> 300;
            case 7 -> 600;
            case 8 -> 400;
            default -> 500;
        };
    }
}
