package com.example.demo.security;

import com.example.demo.auth.JwtProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorization.substring(7);

        try {
            if (!jwtProvider.validate(token)) {
                log.info("[JWT] token validation failed. path={}", request.getRequestURI());
                filterChain.doFilter(request, response);
                return;
            }

            if (!jwtProvider.isAccessToken(token)) {
                log.info("[JWT] rejected non-access token for protected API. path={}", request.getRequestURI());
                filterChain.doFilter(request, response);
                return;
            }

            String userId = jwtProvider.getSubject(token);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            List.of()
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.info("[JWT] access token validated statelessly. userId={}, path={}",
                    userId,
                    request.getRequestURI()
            );

        } catch (Exception e) {
            log.info("[JWT] authentication failed. path={}, message={}",
                    request.getRequestURI(),
                    e.getMessage()
            );
        }

        filterChain.doFilter(request, response);
    }
}