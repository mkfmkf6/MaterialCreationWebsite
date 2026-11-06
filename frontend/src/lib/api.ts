export type Template = {
  id: string;
  name: string;
  category: string;
  ratio: string;
  image: string;
  accent: string;
  description: string;
  requiredImageCount: number;
  acceptedMimeTypes: string[];
  maxFileSizeBytes: number;
};

export type CreationTask = {
  id: string;
  templateId: string;
  templateName: string;
  templateImage: string;
  fileName: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  progress: number;
  stage: string;
  createdAt: string;
  resultUrl?: string;
  errorMessage?: string;
};

export type DemoUser = "demo-user" | "demo-zhou" | "demo-chen";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

async function request<T>(path: string, userId: DemoUser, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...init?.headers, "X-Demo-User": userId },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `请求失败 (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getTemplates(signal?: AbortSignal): Promise<Template[]> {
  return request("/templates", "demo-user", { signal });
}

export function getTasks(userId: DemoUser, signal?: AbortSignal): Promise<CreationTask[]> {
  return request("/tasks", userId, { signal });
}

export function createTask(
  template: Template,
  files: File[],
  userId: DemoUser,
  onProgress: (percent: number, requestStarted: boolean) => void,
  signal?: AbortSignal,
): Promise<CreationTask> {
  const form = new FormData();
  form.append("templateId", template.id);
  files.forEach((file) => form.append("images", file));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBase}/tasks`);
    xhr.setRequestHeader("X-Demo-User", userId);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100), false);
    });
    xhr.upload.addEventListener("load", () => onProgress(100, true));
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string };
          reject(new Error(body.message ?? `请求失败 (${xhr.status})`));
        } catch {
          reject(new Error(`请求失败 (${xhr.status})`));
        }
        return;
      }
      try { resolve(JSON.parse(xhr.responseText) as CreationTask); }
      catch { reject(new Error("服务返回了无效响应")); }
    });
    xhr.addEventListener("error", () => reject(new Error("网络连接中断")));
    xhr.addEventListener("abort", () => reject(new DOMException("请求已取消", "AbortError")));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    if (signal?.aborted) xhr.abort();
    else xhr.send(form);
  });
}

export async function fetchTaskPreview(task: CreationTask, userId: DemoUser, signal?: AbortSignal): Promise<string> {
  if (!task.resultUrl) throw new Error("结果地址暂不可用");
  const response = await fetch(`${apiBase}${task.resultUrl}`, {
    headers: { "X-Demo-User": userId },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("预览暂时不可用，请稍后再试");
  return URL.createObjectURL(await response.blob());
}
