package com.mcwebsite.materialcreationwebsite.domain.entity;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class CreationTaskEntity {
    private String id;
    private String userId;
    private String templateId;
    private String templateName;
    private String templateImage;
    private String fileName;
    private String sourcePath;
    private String resultPath;
    private String status;
    private Integer progress;
    private String stage;
    private String errorMessage;
    private LocalDateTime createdAt;
}
