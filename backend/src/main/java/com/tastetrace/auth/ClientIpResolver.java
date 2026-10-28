package com.tastetrace.auth;

import com.tastetrace.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Resolves the real client IP for rate limiting. X-Forwarded-For is set by the client
 * unless a proxy overwrites it, so it is trusted only when the request comes from one of
 * the configured proxies; otherwise anyone could bypass the limit with a fake header.
 */
@Component
public class ClientIpResolver {

    private final Set<String> trustedProxies;

    public ClientIpResolver(AppProperties appProperties) {
        List<String> proxies = appProperties.trustedProxies();
        this.trustedProxies = proxies == null ? Set.of() : Set.copyOf(proxies);
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank() || !trustedProxies.contains(remoteAddr)) {
            return remoteAddr;
        }
        // Proxies append to the right, so the rightmost address not belonging to
        // our own proxies is the one that actually connected to them.
        String[] hops = forwarded.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String hop = hops[i].trim();
            if (!hop.isEmpty() && !trustedProxies.contains(hop)) {
                return hop;
            }
        }
        return remoteAddr;
    }
}
