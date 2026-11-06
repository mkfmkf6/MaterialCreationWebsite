import { describe, expect, it } from "vitest";
import type { CreationTask } from "./api";
import { mergeTasks, taskQueryFailed, taskQuerySucceeded } from "./task-state";

const task = (id: string, status: CreationTask["status"], createdAt: string): CreationTask => ({
  id,
  templateId: "demo-postcard",
  templateName: "旅行明信片",
  templateImage: "/template.jpg",
  fileName: `${id}.jpg`,
  status,
  progress: status === "succeeded" ? 100 : 20,
  stage: status === "failed" ? "素材检查失败" : "素材检查",
  createdAt,
  errorMessage: status === "failed" ? "素材文件不存在" : undefined,
});

describe("task state", () => {
  it("updates one task without changing other task states", () => {
    const first = task("task-a", "queued", "2026-01-02T10:00:00");
    const second = task("task-b", "processing", "2026-01-02T09:00:00");

    const merged = mergeTasks([first, second], [{ ...first, status: "succeeded", progress: 100 }]);

    expect(merged.map(({ id, status }) => [id, status])).toEqual([
      ["task-a", "succeeded"],
      ["task-b", "processing"],
    ]);
  });

  it("keeps task state separate from a failed history request", () => {
    const active = task("task-a", "processing", "2026-01-02T10:00:00");

    const queryFailure = taskQueryFailed([active], "暂时无法连接任务服务");

    expect(queryFailure.requestError).toContain("无法连接");
    expect(queryFailure.tasks).toEqual([active]);
    expect(queryFailure.tasks[0].status).toBe("processing");
  });

  it("represents a backend task failure as task data, not a request error", () => {
    const failed = task("task-a", "failed", "2026-01-02T10:00:00");

    const result = taskQuerySucceeded([failed]);

    expect(result.requestError).toBeNull();
    expect(result.tasks[0].status).toBe("failed");
    expect(result.tasks[0].errorMessage).toBe("素材文件不存在");
  });
});
