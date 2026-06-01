package com.example.demo.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String TEST_USERNAME = "test";
    private static final String TEST_PASSWORD = "1234";
    private static final String TEST_USER_ID = "test-user";

    private final JwtProvider jwtProvider;
    private final RefreshTokenStore refreshTokenStore;

    public TokenResponse login(LoginRequest request) {
        if (!TEST_USERNAME.equals(request.username()) || !TEST_PASSWORD.equals(request.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String accessToken = jwtProvider.createAccessToken(TEST_USER_ID);
        String refreshToken = jwtProvider.createRefreshToken(TEST_USER_ID);

        refreshTokenStore.save(TEST_USER_ID, refreshToken);

        log.info("[LOGIN] access token issued. userId={}, type=access", TEST_USER_ID);
        log.info("[LOGIN] refresh token issued. userId={}, type=refresh", TEST_USER_ID);

        return new TokenResponse(accessToken, refreshToken);
    }

    public TokenResponse refresh(RefreshRequest request) {
        log.info("[REFRESH] refresh request received");

        String refreshToken = request.refreshToken();

        if (refreshToken == null || refreshToken.isBlank()) {
            log.info("[REFRESH] missing refresh token");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing refresh token");
        }

        if (!jwtProvider.validate(refreshToken)) {
            log.info("[REFRESH] invalid or expired refresh token");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        if (!jwtProvider.isRefreshToken(refreshToken)) {
            log.info("[REFRESH] rejected. token is not refresh token");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token is not refresh token");
        }

        String userId = jwtProvider.getSubject(refreshToken);

        log.info("[REFRESH] token type validated: refresh. userId={}", userId);

        if (!refreshTokenStore.matches(userId, refreshToken)) {
            log.info("[REFRESH] rejected. token not found or revoked. userId={}", userId);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token not found or revoked");
        }

        String newAccessToken = jwtProvider.createAccessToken(userId);

        log.info("[REFRESH] new access token issued. userId={}", userId);

        return new TokenResponse(newAccessToken, refreshToken);
    }

    public void logout(RefreshRequest request) {
        log.info("[LOGOUT] logout request received");

        String refreshToken = request.refreshToken();

        if (refreshToken == null || refreshToken.isBlank()) {
            log.info("[LOGOUT] missing refresh token. nothing to remove");
            return;
        }

        if (!jwtProvider.validate(refreshToken)) {
            log.info("[LOGOUT] invalid refresh token. nothing to remove");
            return;
        }

        if (!jwtProvider.isRefreshToken(refreshToken)) {
            log.info("[LOGOUT] token is not refresh token. nothing to remove");
            return;
        }

        String userId = jwtProvider.getSubject(refreshToken);

        refreshTokenStore.remove(userId);

        log.info("[LOGOUT] logout completed. userId={}", userId);
    }
}