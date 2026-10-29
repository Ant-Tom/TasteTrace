package com.tastetrace;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Runs the backend locally without Docker: starts a real PostgreSQL from bundled binaries
 * (data kept in backend/data/pg between runs) and then the app. Photos go to backend/data/photos.
 *
 * <pre>mvn spring-boot:test-run -Dspring-boot.run.main-class=com.tastetrace.LocalDevApplication</pre>
 */
public final class LocalDevApplication {

    private static final int DB_PORT = 54329;

    private LocalDevApplication() {
    }

    public static void main(String[] args) throws Exception {
        Path dataDir = Path.of("data", "pg").toAbsolutePath();
        Files.createDirectories(dataDir);
        EmbeddedPostgres postgres = EmbeddedPostgres.builder()
                .setPort(DB_PORT)
                .setDataDirectory(dataDir)
                .setCleanDataDirectory(false)
                .start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                postgres.close();
            } catch (Exception ignored) {
                // The JVM is exiting anyway.
            }
        }));

        setDefault("DB_HOST", "localhost");
        setDefault("DB_PORT", String.valueOf(DB_PORT));
        setDefault("DB_NAME", "postgres");
        setDefault("DB_USER", "postgres");
        setDefault("DB_PASSWORD", "postgres");
        setDefault("JWT_SECRET", "local-dev-only-secret-do-not-use-in-production");

        SpringApplication.run(TasteTraceApplication.class, args);
    }

    private static void setDefault(String key, String value) {
        if (System.getenv(key) == null && System.getProperty(key) == null) {
            System.setProperty(key, value);
        }
    }
}
