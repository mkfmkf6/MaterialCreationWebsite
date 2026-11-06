package com.mcwebsite.materialcreationwebsite.controller;

import com.mcwebsite.materialcreationwebsite.service.CreationService;
import com.mcwebsite.materialcreationwebsite.domain.bo.CreationTaskBO;
import com.mcwebsite.materialcreationwebsite.domain.vo.CreationTaskVO;
import com.mcwebsite.materialcreationwebsite.domain.vo.TemplateVO;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CreationController {
    private final CreationService service;
    public CreationController(CreationService service) { this.service = service; }

    @GetMapping("/templates")
    public List<TemplateVO> templates() { return service.templates(); }

    @GetMapping("/tasks")
    public List<CreationTaskVO> tasks(@RequestHeader(value = "X-Demo-User", defaultValue = "demo-user") String userId) {
        return service.tasks(userId);
    }

    @GetMapping("/tasks/{id}")
    public CreationTaskVO task(@PathVariable String id,
                               @RequestHeader(value = "X-Demo-User", defaultValue = "demo-user") String userId) {
        return service.task(id, userId);
    }

    @PostMapping(value = "/tasks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CreationTaskVO create(@RequestParam String templateId, @RequestParam("images") List<MultipartFile> images,
                                 @RequestHeader(value = "X-Demo-User", defaultValue = "demo-user") String userId) throws IOException {
        return service.create(new CreationTaskBO(userId, templateId, images));
    }

    @GetMapping("/tasks/{id}/result")
    public ResponseEntity<FileSystemResource> result(@PathVariable String id,
                                                      @RequestHeader(value = "X-Demo-User", defaultValue = "demo-user") String userId) {
        Path file = service.result(id, userId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"creation-" + id + "\"")
                .body(new FileSystemResource(file));
    }

    @GetMapping("/tasks/{id}/preview")
    public ResponseEntity<FileSystemResource> preview(@PathVariable String id,
                                                       @RequestHeader(value = "X-Demo-User", defaultValue = "demo-user") String userId) throws IOException {
        Path file = service.result(id, userId);
        String contentType = Files.probeContentType(file);
        MediaType mediaType = contentType != null && contentType.startsWith("image/")
                ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok().contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"creation-" + id + "\"")
                .body(new FileSystemResource(file));
    }

    @ExceptionHandler({IllegalArgumentException.class})
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }
}
