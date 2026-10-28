package com.tastetrace.auth;

import com.tastetrace.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    private static ClientIpResolver resolverTrusting(String... proxies) {
        return new ClientIpResolver(new AppProperties(null, null, null, List.of(proxies)));
    }

    private static MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void ignoresForwardedHeaderFromUntrustedClient() {
        ClientIpResolver resolver = resolverTrusting();

        assertThat(resolver.resolve(request("203.0.113.7", "1.2.3.4"))).isEqualTo("203.0.113.7");
    }

    @Test
    void usesForwardedHeaderBehindTrustedProxy() {
        ClientIpResolver resolver = resolverTrusting("172.18.0.5");

        assertThat(resolver.resolve(request("172.18.0.5", "203.0.113.7"))).isEqualTo("203.0.113.7");
    }

    @Test
    void cannotBeSpoofedByPrependingFakeAddresses() {
        ClientIpResolver resolver = resolverTrusting("172.18.0.5");

        // The client sent "X-Forwarded-For: 1.2.3.4"; the proxy appended the real address.
        assertThat(resolver.resolve(request("172.18.0.5", "1.2.3.4, 203.0.113.7"))).isEqualTo("203.0.113.7");
    }
}
