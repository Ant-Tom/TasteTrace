package com.tastetrace.review;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import org.springframework.stereotype.Component;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Builds small JPEG previews for review photos. Review cards show 56px squares,
 * so serving the 5 MB originals there wastes bandwidth and slows the page.
 */
@Component
public class ImageThumbnailer {

    public static final String CONTENT_TYPE = "image/jpeg";

    static final int MAX_SIDE = 480;
    /** Refuse to decode absurd dimensions (decompression bombs): 60 MP is far above any phone camera. */
    private static final long MAX_SOURCE_PIXELS = 60_000_000L;
    private static final float JPEG_QUALITY = 0.82f;

    public byte[] createThumbnail(byte[] source) throws IOException {
        BufferedImage image = readDownsampled(source);
        image = applyExifOrientation(image, readExifOrientation(source));
        return writeJpeg(scaleToFit(image, MAX_SIDE));
    }

    /** Decodes with subsampling, so a 12 MP photo never becomes a 48 MB raster in memory. */
    private BufferedImage readDownsampled(byte[] source) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(source))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IOException("Unsupported image format");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if ((long) width * height > MAX_SOURCE_PIXELS) {
                    throw new IOException("Image is too large: " + width + "x" + height);
                }
                ImageReadParam param = reader.getDefaultReadParam();
                int step = Math.max(1, Math.max(width, height) / (MAX_SIDE * 2));
                param.setSourceSubsampling(step, step, 0, 0);
                return reader.read(0, param);
            } finally {
                reader.dispose();
            }
        }
    }

    private int readExifOrientation(byte[] source) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(source));
            ExifIFD0Directory exif = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (exif != null && exif.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
                return exif.getInt(ExifIFD0Directory.TAG_ORIENTATION);
            }
        } catch (Exception ignored) {
            // No or broken EXIF — keep the image as is.
        }
        return 1;
    }

    /** Phones store photos sideways and record the rotation in EXIF; browsers apply it, ImageIO does not. */
    static BufferedImage applyExifOrientation(BufferedImage image, int orientation) {
        int w = image.getWidth();
        int h = image.getHeight();
        AffineTransform transform = new AffineTransform();
        boolean swapSides = false;
        switch (orientation) {
            case 2 -> transform.scale(-1, 1);
            case 3 -> transform.rotate(Math.PI, w / 2.0, h / 2.0);
            case 4 -> transform.scale(1, -1);
            case 5 -> {
                transform.rotate(Math.PI / 2);
                transform.scale(1, -1);
                swapSides = true;
            }
            case 6 -> {
                transform.translate(h, 0);
                transform.rotate(Math.PI / 2);
                swapSides = true;
            }
            case 7 -> {
                transform.scale(-1, 1);
                transform.translate(-h, 0);
                transform.translate(0, w);
                transform.rotate(3 * Math.PI / 2);
                swapSides = true;
            }
            case 8 -> {
                transform.translate(0, w);
                transform.rotate(3 * Math.PI / 2);
                swapSides = true;
            }
            default -> {
                return image;
            }
        }
        if (orientation == 2) {
            transform.translate(-w, 0);
        } else if (orientation == 4) {
            transform.translate(0, -h);
        }

        BufferedImage result = new BufferedImage(swapSides ? h : w, swapSides ? w : h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = result.createGraphics();
        try {
            g.drawImage(image, transform, null);
        } finally {
            g.dispose();
        }
        return result;
    }

    private BufferedImage scaleToFit(BufferedImage image, int maxSide) {
        double scale = Math.min(1.0, (double) maxSide / Math.max(image.getWidth(), image.getHeight()));
        int width = Math.max(1, (int) Math.round(image.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(image.getHeight() * scale));

        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = result.createGraphics();
        try {
            // JPEG has no alpha: transparent PNG/WebP areas become white instead of black.
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, width, height);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(image, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return result;
    }

    private byte[] writeJpeg(BufferedImage image) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ImageOutputStream stream = ImageIO.createImageOutputStream(output)) {
            writer.setOutput(stream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            if (param.canWriteProgressive()) {
                param.setProgressiveMode(ImageWriteParam.MODE_DEFAULT);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return output.toByteArray();
    }
}
