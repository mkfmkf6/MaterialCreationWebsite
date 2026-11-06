package com.mcwebsite.materialcreationwebsite.service;

import com.mcwebsite.materialcreationwebsite.domain.entity.CreationTaskEntity;
import com.mcwebsite.materialcreationwebsite.domain.entity.TemplateEntity;
import com.mcwebsite.materialcreationwebsite.domain.bo.CreationTaskBO;
import com.mcwebsite.materialcreationwebsite.domain.vo.CreationTaskVO;
import com.mcwebsite.materialcreationwebsite.domain.vo.TemplateVO;
import com.mcwebsite.materialcreationwebsite.mapper.CreationMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class CreationService {
    private static final String DEMO_USER = "demo-user";
    private static final Set<String> DEMO_USERS = Set.of(DEMO_USER, "demo-zhou", "demo-chen");
    private final CreationMapper mapper;
    private final TaskProcessor processor;
    private final Path uploadDir;

    public CreationService(CreationMapper mapper, TaskProcessor processor,
                           @Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.mapper = mapper;
        this.processor = processor;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public List<TemplateVO> templates() {
        return mapper.findTemplates().stream().map(this::toTemplateVO).toList();
    }

    public List<CreationTaskVO> tasks(String userId) {
        return mapper.findTasks(requireDemoUser(userId)).stream().map(this::toTaskVO).toList();
    }

    public CreationTaskVO task(String id, String userId) {
        CreationTaskEntity task = mapper.findTask(id);
        if (task == null || !requireDemoUser(userId).equals(task.getUserId()))
            throw new IllegalArgumentException("任务不存在。");
        return toTaskVO(task);
    }

    public CreationTaskVO create(CreationTaskBO request) throws IOException {
        String userId = requireDemoUser(request.userId());
        String templateId = request.templateId();
        List<MultipartFile> images = request.images();
        if (templateId == null || templateId.isBlank())
            throw new IllegalArgumentException("请选择一个模板。");
        TemplateEntity template = mapper.findTemplate(templateId);
        if (template == null) throw new IllegalArgumentException("模板不存在或已下架。");
        if (images == null || images.size() != template.getRequiredImageCount())
            throw new IllegalArgumentException("该模板需要上传 " + template.getRequiredImageCount() + " 张图片。");

        Files.createDirectories(uploadDir);
        String id = UUID.randomUUID().toString();
        List<String> fileNames = new ArrayList<>();
        List<String> sourcePaths = new ArrayList<>();
        List<String> acceptedMimeTypes = List.of(template.getAcceptedMimeTypes().split(","));
        for (int index = 0; index < images.size(); index++) {
            MultipartFile image = images.get(index);
            if (image == null || image.isEmpty()) throw new IllegalArgumentException("请上传全部所需图片。");
            if (!acceptedMimeTypes.contains(image.getContentType()))
                throw new IllegalArgumentException("该模板仅接受 " + String.join("、", acceptedMimeTypes) + " 格式。");
            if (image.getSize() > template.getMaxFileSizeBytes())
                throw new IllegalArgumentException("每张图片不能超过 " + template.getMaxFileSizeBytes() / 1024 / 1024 + " MB。");

            String originalName = image.getOriginalFilename() == null
                    ? "image" : Path.of(image.getOriginalFilename()).getFileName().toString().replaceAll("[\\r\\n]", " ");
            String suffix = originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf('.')).replaceAll("[^.a-zA-Z0-9]", "") : ".img";
            Path source = uploadDir.resolve(id + "-" + (index + 1) + suffix).normalize();
            if (!source.startsWith(uploadDir)) throw new IllegalArgumentException("无效文件名。");
            image.transferTo(source);
            fileNames.add(originalName);
            sourcePaths.add(source.toString());
        }

        CreationTaskEntity task = new CreationTaskEntity();
        task.setId(id);
        task.setUserId(userId);
        task.setTemplateId(template.getId());
        task.setTemplateName(template.getName());
        task.setTemplateImage(template.getImage());
        String displayFileNames = String.join(", ", fileNames);
        task.setFileName(displayFileNames.length() <= 255 ? displayFileNames : images.size() + " 张图片");
        task.setSourcePath(String.join(System.lineSeparator(), sourcePaths));
        task.setStatus("queued");
        task.setProgress(0);
        task.setStage("等待制作");
        mapper.insertTask(task);

        processor.process(id);
        task.setCreatedAt(LocalDateTime.now());
        return toTaskVO(task);
    }

    public Path result(String id, String userId) {
        CreationTaskEntity task = mapper.findTask(id);
        if (task == null || !requireDemoUser(userId).equals(task.getUserId())
                || !"succeeded".equals(task.getStatus()) || task.getResultPath() == null)
            throw new IllegalArgumentException("作品尚未生成。");
        Path result = Path.of(task.getResultPath()).toAbsolutePath().normalize();
        if (!result.startsWith(uploadDir) || !Files.isRegularFile(result))
            throw new IllegalArgumentException("作品文件不存在。");
        return result;
    }

    private TemplateVO toTemplateVO(TemplateEntity template) {
        List<String> acceptedMimeTypes = List.of(template.getAcceptedMimeTypes().split(","));
        return new TemplateVO(template.getId(), template.getName(), template.getCategory(), template.getRatio(),
                template.getImage(), template.getAccent(), template.getDescription(), template.getRequiredImageCount(),
                acceptedMimeTypes, template.getMaxFileSizeBytes());
    }

    private CreationTaskVO toTaskVO(CreationTaskEntity task) {
        String resultUrl = "succeeded".equals(task.getStatus()) ? "/api/tasks/" + task.getId() + "/preview" : null;
        String createdAt = task.getCreatedAt() == null ? null : task.getCreatedAt().toString();
        return new CreationTaskVO(task.getId(), task.getTemplateId(), task.getTemplateName(), task.getTemplateImage(),
                task.getFileName(), task.getStatus(), task.getProgress(), task.getStage(), createdAt,
                resultUrl, task.getErrorMessage());
    }

    private String requireDemoUser(String userId) {
        if (userId == null || !DEMO_USERS.contains(userId))
            throw new IllegalArgumentException("演示身份无效，请重新选择身份。");
        return userId;
    }
}
