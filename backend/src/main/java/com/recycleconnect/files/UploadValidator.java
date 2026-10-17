package com.recycleconnect.files;

import java.io.IOException;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.recycleconnect.common.ApiException;
import com.recycleconnect.settings.SettingsService;

/**
 * Checks an upload by its content, not its name or declared type: only real JPEG, PNG, WebP (and PDF where
 * allowed) pass, within the size limit set by the admin.
 */
@Component
public class UploadValidator {

    public enum Kind { JPEG, PNG, WEBP, PDF }

    public record Checked(byte[] bytes, Kind kind) {
        public String extension() {
            return switch (kind) { case JPEG -> "jpg"; case PNG -> "png"; case WEBP -> "webp"; case PDF -> "pdf"; };
        }

        public String contentType() {
            return switch (kind) {
                case JPEG -> "image/jpeg"; case PNG -> "image/png"; case WEBP -> "image/webp"; case PDF -> "application/pdf";
            };
        }
    }

    public static final Set<Kind> IMAGES = Set.of(Kind.JPEG, Kind.PNG, Kind.WEBP);
    public static final Set<Kind> IMAGES_AND_PDF = Set.of(Kind.JPEG, Kind.PNG, Kind.WEBP, Kind.PDF);

    private final SettingsService settings;

    public UploadValidator(SettingsService settings) {
        this.settings = settings;
    }

    public Checked check(MultipartFile file, Set<Kind> allowed, String field) {
        if (file == null || file.isEmpty()) {
            throw ApiException.field(field, "Choose a file to upload.");
        }
        long max = settings.rules().maxUploadMb() * 1024L * 1024L;
        if (file.getSize() > max) {
            throw ApiException.field(field, "The file is too big. Use one under " + settings.rules().maxUploadMb() + " MB.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw ApiException.field(field, "The file could not be read. Try again.");
        }
        Kind kind = sniff(bytes);
        if (kind == null || !allowed.contains(kind)) {
            throw ApiException.field(field, allowed.contains(Kind.PDF)
                    ? "Upload a photo (JPEG, PNG or WebP) or a PDF."
                    : "Upload a photo in JPEG, PNG or WebP format.");
        }
        return new Checked(bytes, kind);
    }

    static Kind sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return Kind.JPEG;
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return Kind.PNG;
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return Kind.WEBP;
        if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return Kind.PDF;
        return null;
    }
}
