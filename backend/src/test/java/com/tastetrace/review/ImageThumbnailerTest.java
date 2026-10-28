package com.tastetrace.review;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageThumbnailerTest {

    private final ImageThumbnailer thumbnailer = new ImageThumbnailer();

    @Test
    void scalesLargePngDownToJpegPreview() throws IOException {
        BufferedImage source = new BufferedImage(2000, 1000, BufferedImage.TYPE_INT_ARGB);
        byte[] png = encode(source, "png");

        BufferedImage thumb = ImageIO.read(new ByteArrayInputStream(thumbnailer.createThumbnail(png)));

        assertThat(thumb.getWidth()).isEqualTo(ImageThumbnailer.MAX_SIDE);
        assertThat(thumb.getHeight()).isEqualTo(ImageThumbnailer.MAX_SIDE / 2);
        // Transparent pixels must become white, not black, since JPEG has no alpha.
        assertThat(new Color(thumb.getRGB(10, 10))).isEqualTo(Color.WHITE);
    }

    @Test
    void keepsSmallImagesAtOriginalSize() throws IOException {
        byte[] jpeg = encode(new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB), "jpeg");

        BufferedImage thumb = ImageIO.read(new ByteArrayInputStream(thumbnailer.createThumbnail(jpeg)));

        assertThat(thumb.getWidth()).isEqualTo(200);
        assertThat(thumb.getHeight()).isEqualTo(100);
    }

    @Test
    void rotatesSidewaysPhonePhotos() {
        BufferedImage landscape = new BufferedImage(40, 20, BufferedImage.TYPE_INT_RGB);
        landscape.setRGB(0, 0, Color.RED.getRGB());

        // EXIF 6 = the camera was rotated 90° clockwise.
        BufferedImage rotated = ImageThumbnailer.applyExifOrientation(landscape, 6);

        assertThat(rotated.getWidth()).isEqualTo(20);
        assertThat(rotated.getHeight()).isEqualTo(40);
        assertThat(new Color(rotated.getRGB(19, 0))).isEqualTo(Color.RED);
    }

    @Test
    void canReadWebp() {
        assertThat(ImageIO.getImageReadersByFormatName("webp").hasNext()).isTrue();
    }

    @Test
    void rejectsNonImages() {
        assertThatThrownBy(() -> thumbnailer.createThumbnail("not an image".getBytes()))
                .isInstanceOf(IOException.class);
    }

    private static byte[] encode(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }
}
