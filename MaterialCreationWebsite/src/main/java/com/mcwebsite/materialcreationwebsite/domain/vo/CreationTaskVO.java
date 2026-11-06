package com.mcwebsite.materialcreationwebsite.domain.vo;

public record CreationTaskVO(
        String id,
        String templateId,
        String templateName,
        String templateImage,
        String fileName,
        String status,
        Integer progress,
        String stage,
        String createdAt,
        String resultUrl,
        String errorMessage
) {}
