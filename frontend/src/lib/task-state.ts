import type { CreationTask } from "./api";

export type TaskQueryState = {
  tasks: CreationTask[];
  requestError: string | null;
};

export function mergeTasks(current: CreationTask[], incoming: CreationTask[]): CreationTask[] {
  const byId = new Map(current.map((task) => [task.id, task]));
  incoming.forEach((task) => byId.set(task.id, task));
  return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function taskQuerySucceeded(tasks: CreationTask[]): TaskQueryState {
  return { tasks, requestError: null };
}

export function taskQueryFailed(tasks: CreationTask[], requestError: string): TaskQueryState {
  return { tasks, requestError };
}
