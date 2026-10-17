package com.recycleconnect.auth;

import java.time.Duration;
import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.recycleconnect.config.AppProperties;
import com.recycleconnect.user.User;

@Service
public class TokenService {

    public record IssuedToken(String token, Instant expiresAt) {
    }

    private final JwtEncoder encoder;
    private final Duration lifetime;

    public TokenService(JwtEncoder encoder, AppProperties props) {
        this.encoder = encoder;
        this.lifetime = Duration.ofHours(props.jwt().expiryHours());
    }

    public IssuedToken issue(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(lifetime);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("recycleconnect")
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("role", user.getRole().name())
                .claim("ver", user.getTokenVersion())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }
}
