package com.example.demo.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RefreshTokenStore {

    private final Map<String, String> store = new ConcurrentHashMap<>();

    public void save(String userId, String refreshToken) {
        store.put(userId, refreshToken);
        log.info("[STORE] refresh token saved. userId={}", userId);
    }

    public boolean matches(String userId, String refreshToken) {
        boolean matched = refreshToken != null && refreshToken.equals(store.get(userId));

        log.info("[STORE] refresh token match check. userId={}, matched={}", userId, matched);

        return matched;
    }

    public void remove(String userId) {
        store.remove(userId);
        log.info("[STORE] refresh token removed. userId={}", userId);
    }

    public boolean exists(String userId) {
        return store.containsKey(userId);
    }
}