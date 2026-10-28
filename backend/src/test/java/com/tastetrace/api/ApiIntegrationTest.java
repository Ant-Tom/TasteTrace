package com.tastetrace.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tastetrace.auth.RegistrationRateLimiter;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Runs the real app (Flyway migrations, JPA, security, HTTP compression) against an embedded
 * PostgreSQL. MinIO and Redis are mocked: they are infrastructure, not the logic under test.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class ApiIntegrationTest {

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper json;

    @Autowired
    JdbcTemplate jdbc;

    @MockBean
    MinioClient minioClient;

    @MockBean
    RegistrationRateLimiter rateLimiter;

    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void allowRegistrations() {
        when(rateLimiter.tryConsume(anyString())).thenReturn(true);
    }

    @Test
    void establishmentsListIsCompressedAndRevalidatedWithEtag() throws Exception {
        HttpResponse<byte[]> first = http.send(
                get("/api/establishments").header("Accept-Encoding", "gzip").build(),
                HttpResponse.BodyHandlers.ofByteArray()
        );
        assertThat(first.statusCode()).isEqualTo(200);
        assertThat(first.headers().firstValue("Content-Encoding")).contains("gzip");
        assertThat(first.headers().firstValue("Cache-Control")).contains("no-cache");
        String etag = first.headers().firstValue("ETag").orElseThrow();

        HttpResponse<String> second = http.send(
                get("/api/establishments").header("If-None-Match", etag).build(),
                HttpResponse.BodyHandlers.ofString()
        );
        assertThat(second.statusCode()).isEqualTo(304);
        assertThat(second.body()).isEmpty();
    }

    @Test
    void newReviewUpdatesCachedRatings() throws Exception {
        // The last venue is not touched by other tests, so it has no reviews yet.
        JsonNode all = json.readTree(send(get("/api/establishments").build()).body());
        long establishmentId = all.get(all.size() - 1).get("id").asLong();
        assertThat(ratingOf(establishmentId).get("reviewCount").asInt()).isZero();

        String token = register().get("accessToken").asText();
        HttpResponse<String> created = send(post(
                "/api/establishments/" + establishmentId + "/reviews",
                Map.of("rating", 4, "text", "Вкусно, быстро и недорого, вернусь ещё."),
                token
        ));
        assertThat(created.statusCode()).isEqualTo(201);

        JsonNode fromList = ratingOf(establishmentId);
        assertThat(fromList.get("reviewCount").asInt()).isEqualTo(1);
        assertThat(fromList.get("rating").asDouble()).isEqualTo(4.0);

        JsonNode single = json.readTree(send(get("/api/establishments/" + establishmentId).build()).body());
        assertThat(single.get("reviewCount").asInt()).isEqualTo(1);
    }

    @Test
    void refreshRotatesTokens() throws Exception {
        JsonNode session = register();
        String refreshToken = session.get("refreshToken").asText();

        JsonNode refreshed = json.readTree(send(post("/api/auth/refresh", Map.of("refreshToken", refreshToken), null)).body());
        String newAccess = refreshed.get("accessToken").asText();
        String newRefresh = refreshed.get("refreshToken").asText();
        assertThat(newRefresh).isNotEqualTo(refreshToken);

        HttpResponse<String> me = send(get("/api/auth/me").header("Authorization", "Bearer " + newAccess).build());
        assertThat(me.statusCode()).isEqualTo(200);

        // A rotated token cannot be used twice.
        assertThat(send(post("/api/auth/refresh", Map.of("refreshToken", refreshToken), null)).statusCode()).isEqualTo(401);
        // Within the grace period (two tabs refreshing at once) the new token keeps working.
        assertThat(send(post("/api/auth/refresh", Map.of("refreshToken", newRefresh), null)).statusCode()).isEqualTo(200);
    }

    @Test
    void reusingAnOldRefreshTokenRevokesAllSessions() throws Exception {
        JsonNode session = register();
        String stolen = session.get("refreshToken").asText();
        String current = json.readTree(send(post("/api/auth/refresh", Map.of("refreshToken", stolen), null)).body())
                .get("refreshToken").asText();

        // Pretend the stolen token was rotated long ago, outside the grace period.
        jdbc.update("UPDATE refresh_tokens SET revoked_at = NOW() - INTERVAL '5 minutes' WHERE revoked_at IS NOT NULL");

        assertThat(send(post("/api/auth/refresh", Map.of("refreshToken", stolen), null)).statusCode()).isEqualTo(401);
        assertThat(send(post("/api/auth/refresh", Map.of("refreshToken", current), null)).statusCode()).isEqualTo(401);
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        String refreshToken = register().get("refreshToken").asText();

        assertThat(send(post("/api/auth/logout", Map.of("refreshToken", refreshToken), null)).statusCode()).isEqualTo(204);
        assertThat(send(post("/api/auth/refresh", Map.of("refreshToken", refreshToken), null)).statusCode()).isEqualTo(401);
    }

    @Test
    void photoUploadStoresOriginalAndPreview() throws Exception {
        long establishmentId = firstEstablishmentId();
        String token = register().get("accessToken").asText();
        long reviewId = json.readTree(send(post(
                "/api/establishments/" + establishmentId + "/reviews",
                Map.of("rating", 5, "text", "Отличное место, рекомендую всем друзьям."),
                token
        )).body()).get("id").asLong();

        BufferedImage photo = new BufferedImage(1600, 1200, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream jpeg = new ByteArrayOutputStream();
        ImageIO.write(photo, "jpeg", jpeg);

        HttpResponse<String> upload = send(multipart("/api/reviews/" + reviewId + "/photos", jpeg.toByteArray(), token));
        assertThat(upload.statusCode()).isEqualTo(200);

        ArgumentCaptor<PutObjectArgs> puts = ArgumentCaptor.forClass(PutObjectArgs.class);
        verify(minioClient, atLeast(2)).putObject(puts.capture());
        List<String> keys = puts.getAllValues().stream().map(PutObjectArgs::object).toList();
        assertThat(keys).anyMatch(key -> key.startsWith("reviews/" + reviewId + "/") && key.endsWith("-thumb.jpg"));
    }

    private long firstEstablishmentId() throws Exception {
        return json.readTree(send(get("/api/establishments").build()).body()).get(0).get("id").asLong();
    }

    private JsonNode ratingOf(long establishmentId) throws Exception {
        for (JsonNode item : json.readTree(send(get("/api/establishments").build()).body())) {
            if (item.get("id").asLong() == establishmentId) {
                return item;
            }
        }
        throw new AssertionError("Establishment " + establishmentId + " not found");
    }

    private JsonNode register() throws Exception {
        HttpResponse<String> response = send(post("/api/auth/register", Map.of(
                "email", "user-" + UUID.randomUUID() + "@example.test",
                "password", "test-password-123",
                "displayName", "Тестер"
        ), null));
        assertThat(response.statusCode()).isEqualTo(201);
        return json.readTree(response.body());
    }

    private HttpRequest.Builder get(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET();
    }

    private HttpRequest post(String path, Object body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return builder.build();
    }

    private HttpRequest multipart(String path, byte[] file, String token) {
        String boundary = "----tt" + UUID.randomUUID();
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.writeBytes(("--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"files\"; filename=\"photo.jpg\"\r\n"
                + "Content-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.writeBytes(file);
        body.writeBytes(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                .build();
    }

    private HttpResponse<String> send(HttpRequest request) throws Exception {
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
