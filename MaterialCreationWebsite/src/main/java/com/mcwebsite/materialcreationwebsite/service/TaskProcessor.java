package com.mcwebsite.materialcreationwebsite.service;

import com.mcwebsite.materialcreationwebsite.mapper.CreationMapper;
import com.mcwebsite.materialcreationwebsite.domain.entity.CreationTaskEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class TaskProcessor {
    private final CreationMapper mapper;
    private final long delay;
    private final String failStage;

    public TaskProcessor(CreationMapper mapper,
                         @Value("${app.simulation.step-delay-ms:1800}") long delay,
                         @Value("${app.simulation.fail-stage:}") String failStage) {
        this.mapper = mapper;
        this.delay = Math.max(0, delay);
        this.failStage = failStage == null ? "" : failStage.trim();
    }

    @Async
    public void process(String taskId) {
        CreationTaskEntity task = mapper.findTask(taskId);
        if (task == null) return;
        try {
            runStage(task, "material-check", 20, "素材检查");
            for (String source : task.getSourcePath().split("\\R")) {
                if (!Files.isRegularFile(Path.of(source))) {
                    throw new StageFailure("素材检查", "上传素材文件不存在，无法开始制作。");
                }
            }

            runStage(task, "generation", 60, "模拟生成");

            runStage(task, "result-organization", 85, "结果整理");
            Path source = Path.of(task.getSourcePath().split("\\R")[0]);
            Path result = source.resolveSibling("result-" + source.getFileName());
            Files.copy(source, result, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            update(task, "succeeded", 100, "制作完成", result.toString(), null);
        } catch (StageFailure exception) {
            update(task, "failed", task.getProgress(), exception.stage + "失败", null, exception.getMessage());
        } catch (Exception exception) {
            update(task, "failed", task.getProgress(), task.getStage() + "失败", null,
                    exception.getMessage() == null ? "任务执行失败，请检查服务日志。" : exception.getMessage());
        }
    }

    private void runStage(CreationTaskEntity task, String key, int progress, String stage)
            throws InterruptedException {
        update(task, "processing", progress, stage, null, null);
        Thread.sleep(delay);
        if (key.equals(failStage)) {
            throw new StageFailure(stage, stage + "阶段发生预置模拟失败。");
        }
    }

    private void update(CreationTaskEntity task, String status, int progress, String stage,
                       String resultPath, String errorMessage) {
        task.setStatus(status);
        task.setProgress(progress);
        task.setStage(stage);
        task.setResultPath(resultPath);
        task.setErrorMessage(errorMessage);
        mapper.updateTask(task);
    }

    private static class StageFailure extends RuntimeException {
        private final String stage;

        private StageFailure(String stage, String message) {
            super(message);
            this.stage = stage;
        }
    }
}
