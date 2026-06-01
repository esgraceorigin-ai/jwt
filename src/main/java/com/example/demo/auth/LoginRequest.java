package com.example.demo.auth;

public record LoginRequest(
        String username,
        String password
) {
}