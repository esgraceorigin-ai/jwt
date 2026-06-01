package com.example.demo.auth;

public record TokenResponse(
        String accessToken,
        String refreshToken
) {
}