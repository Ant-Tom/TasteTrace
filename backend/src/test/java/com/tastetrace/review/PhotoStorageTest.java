package com.tastetrace.review;

import com.tastetrace.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhotoStorageTest {

    @TempDir
    Path dir;

    private PhotoStorage storage() {
        return new PhotoStorage(new AppProperties(null, null, null, new AppProperties.Storage(dir.toString()), null));
    }

    @Test
    void storesAndReadsBackUnderKeyPath() throws IOException {
        PhotoStorage storage = storage();
        storage.put("reviews/7/abc", new byte[] {1, 2, 3});

        assertThat(Files.readAllBytes(dir.resolve("reviews/7/abc"))).containsExactly(1, 2, 3);
        try (InputStream in = storage.open("reviews/7/abc")) {
            assertThat(in.readAllBytes()).containsExactly(1, 2, 3);
        }
        // No leftover temp files from the atomic write.
        try (var files = Files.list(dir.resolve("reviews/7"))) {
            assertThat(files).hasSize(1);
        }
    }

    @Test
    void rejectsKeysEscapingTheDirectory() {
        PhotoStorage storage = storage();

        assertThatThrownBy(() -> storage.put("../outside", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.open("reviews/../../etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
