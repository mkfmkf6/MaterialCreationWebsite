package com.mcwebsite.materialcreationwebsite.service;

import com.mcwebsite.materialcreationwebsite.domain.entity.CreationTaskEntity;
import com.mcwebsite.materialcreationwebsite.mapper.CreationMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TaskProcessorTest {
    @TempDir
    Path tempDir;

    @Test
    void runsEachStageInOrderAndPersistsTheResult() throws IOException {
        Path source = Files.writeString(tempDir.resolve("source.jpg"), "sample-image");
        CreationTaskEntity task = task(source);
        CreationMapper mapper = mock(CreationMapper.class);
        when(mapper.findTask(task.getId())).thenReturn(task);
        List<String> updates = captureUpdates(mapper);

        new TaskProcessor(mapper, 0, "").process(task.getId());

        assertThat(updates).containsExactly(
                "processing:素材检查",
                "processing:模拟生成",
                "processing:结果整理",
                "succeeded:制作完成");
        assertThat(task.getStatus()).isEqualTo("succeeded");
        assertThat(Path.of(task.getResultPath())).hasBinaryContent(Files.readAllBytes(source));
    }

    @Test
    void stopsAfterTheConfiguredFailureStage() throws IOException {
        Path source = Files.writeString(tempDir.resolve("source.jpg"), "sample-image");
        CreationTaskEntity task = task(source);
        CreationMapper mapper = mock(CreationMapper.class);
        when(mapper.findTask(task.getId())).thenReturn(task);
        List<String> updates = captureUpdates(mapper);

        new TaskProcessor(mapper, 0, "generation").process(task.getId());

        assertThat(updates).containsExactly(
                "processing:素材检查",
                "processing:模拟生成",
                "failed:模拟生成失败");
        assertThat(task.getStatus()).isEqualTo("failed");
        assertThat(task.getErrorMessage()).contains("模拟生成阶段发生预置模拟失败");
        assertThat(source.resolveSibling("result-source.jpg")).doesNotExist();
    }

    private CreationTaskEntity task(Path source) {
        CreationTaskEntity task = new CreationTaskEntity();
        task.setId("task-1");
        task.setSourcePath(source.toString());
        task.setStatus("queued");
        task.setProgress(0);
        task.setStage("等待制作");
        return task;
    }

    private List<String> captureUpdates(CreationMapper mapper) {
        List<String> updates = new ArrayList<>();
        doAnswer(invocation -> {
            CreationTaskEntity updated = invocation.getArgument(0);
            updates.add(updated.getStatus() + ":" + updated.getStage());
            return null;
        }).when(mapper).updateTask(any(CreationTaskEntity.class));
        return updates;
    }
}
