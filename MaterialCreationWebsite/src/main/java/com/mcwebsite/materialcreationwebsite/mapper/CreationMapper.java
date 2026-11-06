package com.mcwebsite.materialcreationwebsite.mapper;

import com.mcwebsite.materialcreationwebsite.domain.entity.CreationTaskEntity;
import com.mcwebsite.materialcreationwebsite.domain.entity.TemplateEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CreationMapper {
    List<TemplateEntity> findTemplates();

    TemplateEntity findTemplate(@Param("id") String id);

    List<CreationTaskEntity> findTasks(@Param("userId") String userId);

    CreationTaskEntity findTask(@Param("id") String id);

    void insertTask(CreationTaskEntity task);

    void updateTask(CreationTaskEntity task);
}
