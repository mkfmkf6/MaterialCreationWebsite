package com.mcwebsite.materialcreationwebsite.domain.bo;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public record CreationTaskBO(String userId, String templateId, List<MultipartFile> images) {}
