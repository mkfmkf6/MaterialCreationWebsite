package com.mcwebsite.materialcreationwebsite.domain.entity;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class TemplateEntity {
    private String id;
    private String name;
    private String category;
    private String ratio;
    private String image;
    private String accent;
    private String description;
    private Boolean active;
    private Integer requiredImageCount;
    private String acceptedMimeTypes;
    private Long maxFileSizeBytes;
}
