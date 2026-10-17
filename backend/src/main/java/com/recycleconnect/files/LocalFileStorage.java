package com.recycleconnect.files;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.recycleconnect.config.AppProperties;

/** Files under {@code app.upload-dir}/yyyy/mm/random-uuid.ext. Never served directly; see FileController. */
@Component
public class LocalFileStorage implements FileStorage {

    private final Path root;

    public LocalFileStorage(AppProperties props) throws IOException {
        this.root = Path.of(props.uploadDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public String save(byte[] bytes, String extension) throws IOException {
        LocalDate d = LocalDate.now();
        String key = "%d/%02d/%s.%s".formatted(d.getYear(), d.getMonthValue(), UUID.randomUUID(), extension);
        Path target = resolve(key);
        Files.createDirectories(target.getParent());
        Files.write(target, bytes);
        return key;
    }

    @Override
    public InputStream open(String key) throws IOException {
        return Files.newInputStream(resolve(key));
    }

    @Override
    public void delete(String key) throws IOException {
        Files.deleteIfExists(resolve(key));
    }

    /** Rejects any key that would escape the upload folder. */
    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("Bad file key");
        }
        return p;
    }
}
