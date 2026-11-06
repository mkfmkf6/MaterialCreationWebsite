package com.mcwebsite.materialcreationwebsite.domain.vo;

import java.util.List;

public record TemplateVO(
        String id,
        String name,
        String category,
        String ratio,
        String image,
        String accent,
        String description,
        int requiredImageCount,
        List<String> acceptedMimeTypes,
        long maxFileSizeBytes
) {}
