package com.recycleconnect.files;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.request.CollectionRequestRepository;
import com.recycleconnect.request.PhotoRepository;
import com.recycleconnect.request.PickupRepository;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.CollectorProfileRepository;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;

/**
 * Serves uploaded files only to people allowed to see them (brief §26): a request photo to the customer who owns
 * the request, any collector who was assigned to it, and admins; an ID proof to its owner and admins.
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final PhotoRepository photos;
    private final CollectionRequestRepository requests;
    private final PickupRepository pickups;
    private final CollectorProfileRepository collectors;
    private final FileStorage storage;
    private final AuditService audit;

    public FileController(PhotoRepository photos, CollectionRequestRepository requests, PickupRepository pickups,
            CollectorProfileRepository collectors, FileStorage storage, AuditService audit) {
        this.photos = photos;
        this.requests = requests;
        this.pickups = pickups;
        this.collectors = collectors;
        this.storage = storage;
        this.audit = audit;
    }

    @GetMapping("/photos/{id}")
    public ResponseEntity<byte[]> photo(@CurrentUser User me, @PathVariable Long id) throws IOException {
        var photo = photos.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that photo."));
        var request = requests.findById(photo.getRequestId()).orElseThrow();
        boolean allowed = me.getRole() == Role.ADMIN
                || (me.getRole() == Role.CUSTOMER && request.getCustomerId().equals(me.getId()))
                || (me.getRole() == Role.COLLECTOR && pickups.existsByRequestIdAndCollectorId(request.getId(), me.getId()));
        if (!allowed) throw ApiException.notFound("We couldn't find that photo.");
        return serve(photo.getPath(), photo.getContentType());
    }

    @GetMapping("/id-proof/{userId}")
    public ResponseEntity<byte[]> idProof(@CurrentUser User me, @PathVariable Long userId) throws IOException {
        if (me.getRole() != Role.ADMIN && !me.getId().equals(userId)) throw ApiException.notFound("We couldn't find that file.");
        var profile = collectors.findById(userId).filter(p -> p.getIdProofPath() != null)
                .orElseThrow(() -> ApiException.notFound("No ID proof has been uploaded."));
        if (me.getRole() == Role.ADMIN) audit.recordStandalone(me, "VIEW_ID_PROOF", "user", userId, Map.of());
        return serve(profile.getIdProofPath(), profile.getIdProofType());
    }

    private ResponseEntity<byte[]> serve(String key, String contentType) throws IOException {
        byte[] bytes;
        try (InputStream in = storage.open(key)) {
            bytes = in.readAllBytes();
        } catch (java.nio.file.NoSuchFileException e) {
            throw new ApiException(HttpStatus.NOT_FOUND, "The file is no longer available.");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType == null ? "application/octet-stream" : contentType))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(bytes);
    }
}
