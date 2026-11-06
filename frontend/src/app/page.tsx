"use client";

import {
  ArrowRight, Check, CheckCircle2, Clock3, Eye, CloudUpload, FolderOpen,
  ImagePlus, LayoutGrid, LoaderCircle, Plus, RefreshCw, Search, Sparkles, X,
} from "lucide-react";
import { ChangeEvent, DragEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createTask, fetchTaskPreview, getTasks, getTemplates, type CreationTask, type DemoUser, type Template } from "@/lib/api";
import { mergeTasks, taskQueryFailed, taskQuerySucceeded } from "@/lib/task-state";
import "./template-upload.css";

const taskLabels: Record<CreationTask["status"], string> = {
  queued: "等待处理", processing: "处理中", succeeded: "制作成功", failed: "制作失败",
};
const users: { id: DemoUser; name: string }[] = [
  { id: "demo-user", name: "林同学" },
  { id: "demo-zhou", name: "周同学" },
  { id: "demo-chen", name: "陈同学" },
];
const emptyTasks: CreationTask[] = [];
const isActive = (task: CreationTask) => task.status === "queued" || task.status === "processing";
const userStorageKey = "material-creation-demo-user";

function getStoredUser(): DemoUser {
  const saved = window.localStorage.getItem(userStorageKey);
  return users.find((user) => user.id === saved)?.id ?? "demo-user";
}

function subscribeToStoredUser(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== userStorageKey) return;
    onChange();
    window.dispatchEvent(new Event("demo-user-change"));
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("demo-user-change", onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("demo-user-change", onChange);
  };
}

function saveUser(userId: DemoUser) {
  window.localStorage.setItem(userStorageKey, userId);
  window.dispatchEvent(new Event("demo-user-change"));
}

export default function Home() {
  const [view, setView] = useState<"templates" | "history">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState("全部模板");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [tasksByUser, setTasksByUser] = useState<Partial<Record<DemoUser, CreationTask[]>>>({});
  const userId = useSyncExternalStore<DemoUser>(subscribeToStoredUser, getStoredUser, () => "demo-user");
  const tasks = tasksByUser[userId] ?? emptyTasks;
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyFilter, setHistoryFilter] = useState("全部记录");
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewTask, setPreviewTask] = useState<CreationTask | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const requestController = useRef<AbortController | null>(null);
  const userRef = useRef(userId);
  const tasksRef = useRef(tasks);
  const submitRequestRef = useRef<AbortController | null>(null);
  const previewRequestRef = useRef<AbortController | null>(null);

  useEffect(() => { userRef.current = userId; }, [userId]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => {
    const clearUserScopedState = () => {
      requestController.current?.abort();
      submitRequestRef.current?.abort();
      previewRequestRef.current?.abort();
      setHistoryError("");
      setSubmitError("");
      setPreviewTask(null);
      setPreviewUrl("");
      setPreviewError("");
    };
    window.addEventListener("demo-user-change", clearUserScopedState);
    return () => window.removeEventListener("demo-user-change", clearUserScopedState);
  }, []);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => {
    const controller = new AbortController();
    getTemplates(controller.signal).then(setTemplates).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const refreshHistory = useCallback(async (showLoading = false) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const requestedUser = userRef.current;
    if (showLoading) setHistoryLoading(true);
    try {
      const latest = await getTasks(requestedUser, controller.signal);
      if (controller.signal.aborted || requestedUser !== userRef.current) return;
      const state = taskQuerySucceeded(latest);
      setTasksByUser((current) => ({ ...current, [requestedUser]: state.tasks }));
      setHistoryError(state.requestError ?? "");
    } catch {
      if (controller.signal.aborted) return;
      if (requestedUser === userRef.current) {
        const state = taskQueryFailed(tasksRef.current, "暂时无法连接任务服务，已有记录已保留。请重试查询。");
        setTasksByUser((current) => ({ ...current, [requestedUser]: state.tasks }));
        setHistoryError(state.requestError ?? "");
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    requestController.current?.abort();
    submitRequestRef.current?.abort();
    previewRequestRef.current?.abort();
    const refreshTimer = window.setTimeout(() => refreshHistory(true), 0);
    return () => {
      window.clearTimeout(refreshTimer);
      requestController.current?.abort();
      submitRequestRef.current?.abort();
      previewRequestRef.current?.abort();
    };
  }, [userId, refreshHistory]);

  useEffect(() => {
    if (!tasks.some(isActive)) return;
    let timer = 0;
    let disposed = false;
    const poll = async () => {
      if (disposed) return;
      if (document.visibilityState !== "visible") { timer = 0; return; }
      await refreshHistory();
      if (!disposed && tasksRef.current.some(isActive)) timer = window.setTimeout(poll, 1400);
    };
    timer = window.setTimeout(poll, 1400);
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !timer && tasksRef.current.some(isActive)) {
        timer = window.setTimeout(poll, 0);
      } else if (document.visibilityState !== "visible" && timer) {
        window.clearTimeout(timer);
        timer = 0;
        requestController.current?.abort();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
      requestController.current?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tasks, refreshHistory]);

  const filtered = useMemo(() => templates.filter((item) =>
    (category === "全部模板" || item.category === category) &&
    `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query, templates]);
  const categories = useMemo(() => ["全部模板", ...new Set(templates.map((template) => template.category))], [templates]);
  const doneCount = tasks.filter((task) => task.status === "succeeded").length;
  const visibleTasks = tasks.filter((task) => historyFilter === "全部记录" ||
    (historyFilter === "处理中" ? isActive(task) : historyFilter === "已完成" ? task.status === "succeeded" : task.status === "failed"));

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview)), [previews]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!selected && !previewTask) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      const closeButton = dialogRef.current?.querySelector<HTMLButtonElement>(".close-button:not([disabled])");
      (closeButton ?? dialogRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [selected, previewTask]);

  function clearFiles() {
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setFiles([]);
    setPreviews([]);
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function loadFiles(nextFiles: File[]) {
    if (!selected || !nextFiles.length) return;
    if (nextFiles.length !== selected.requiredImageCount) {
      setNotice(`该模板需要恰好上传 ${selected.requiredImageCount} 张图片`);
      return;
    }
    const invalidType = nextFiles.find((file) => !selected.acceptedMimeTypes.includes(file.type));
    if (invalidType) { setNotice(`该模板仅接受 ${selected.acceptedMimeTypes.join("、")} 格式`); return; }
    if (nextFiles.some((file) => file.size > selected.maxFileSizeBytes)) {
      setNotice(`每张图片不能超过 ${Math.floor(selected.maxFileSizeBytes / 1024 / 1024)} MB`);
      return;
    }
    clearFiles();
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    setNotice("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { loadFiles(Array.from(event.target.files ?? [])); }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false); loadFiles(Array.from(event.dataTransfer.files));
  }

  async function submitTask() {
    if (!selected || files.length !== selected.requiredImageCount || uploading || submitting) {
      if (selected && files.length !== selected.requiredImageCount) setNotice(`请上传该模板需要的 ${selected.requiredImageCount} 张图片`);
      return;
    }
    const template = selected;
    const requestUser = userId;
    const controller = new AbortController();
    submitRequestRef.current = controller;
    setUploading(true);
    setSubmitting(false);
    setUploadProgress(0);
    setNotice("");
    setSubmitError("");
    try {
      const task = await createTask(template, files, requestUser, (percent, requestStarted) => {
        setUploadProgress(percent);
        if (requestStarted) { setUploading(false); setSubmitting(true); }
      }, controller.signal);
      if (requestUser !== userRef.current) return;
      setTasksByUser((current) => ({
        ...current,
        [requestUser]: mergeTasks(current[requestUser] ?? [], [task]),
      }));
      setSelected(null);
      clearFiles();
      setSubmitting(false);
      setNotice("制作任务已受理，可在“我的创作”中查看进度");
      setView("history");
    } catch (error) {
      if (controller.signal.aborted) return;
      setSubmitError(error instanceof Error ? error.message : "任务提交失败，请检查服务连接后重试");
    } finally {
      if (submitRequestRef.current === controller) {
        submitRequestRef.current = null;
        setUploading(false);
        setSubmitting(false);
      }
    }
  }

  async function showPreview(task: CreationTask) {
    previewRequestRef.current?.abort();
    const controller = new AbortController();
    previewRequestRef.current = controller;
    const requestedUser = userId;
    setPreviewTask(task);
    setPreviewError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    try {
      const nextUrl = await fetchTaskPreview(task, requestedUser, controller.signal);
      if (controller.signal.aborted || requestedUser !== userRef.current) URL.revokeObjectURL(nextUrl);
      else setPreviewUrl(nextUrl);
    } catch (error) {
      if (!controller.signal.aborted && requestedUser === userRef.current)
        setPreviewError(error instanceof Error ? error.message : "预览暂时不可用");
    }
  }

  function onDialogKeyDown(event: KeyboardEvent<HTMLElement>, close: () => void) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
    )).filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("templates"); }}>
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.2} /></span>
          <span>拾光<span className="brand-dot">.</span><small>STUDIO</small></span>
        </a>
        <div className="side-label">工作空间</div>
        <button className={`nav-item ${view === "templates" ? "active" : ""}`} onClick={() => setView("templates")}><LayoutGrid size={18} />模板广场</button>
        <button className={`nav-item ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}><FolderOpen size={18} />我的创作<span className="nav-count">{tasks.length || "0"}</span></button>
        <div className="sidebar-bottom">
          <div className="usage-box"><div className="usage-title"><span>本月创作</span><span>{doneCount} / 20</span></div><div className="usage-track"><span style={{ width: `${Math.min(doneCount / 20 * 100, 100)}%` }} /></div><small>每一个灵感，都值得被记录</small></div>
          <label className="profile-picker"><span className="avatar">{users.find((user) => user.id === userId)?.name[0]}</span><span className="profile-copy"><b>{users.find((user) => user.id === userId)?.name}</b><small>演示个人工作区</small></span><select aria-label="切换演示身份" value={userId} onChange={(event) => saveUser(event.target.value as DemoUser)}>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar"><div className="crumb">创作空间 <span>/</span> {view === "templates" ? "模板广场" : "我的创作"}</div><div className="top-actions"><span className="online-dot"><i />异步制作服务</span><span className="top-avatar">{users.find((user) => user.id === userId)?.name[0]}</span></div></header>

        {view === "templates" ? <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow"><span /> CREATIVE WORKSPACE</div><h1>让灵感，马上成形。</h1><p>挑选一款喜欢的模板，上传你的图片，剩下的交给我们。</p></div><div className="welcome-meta"><span className="meta-icon"><Clock3 size={17} /></span><span><b>创作从这里开始</b><small>今天也有新灵感</small></span></div></section>
          <section className="feature-strip"><div className="feature-copy"><span className="feature-kicker"><Sparkles size={13} /> 本周精选</span><h2>给日常一点<br />新的视觉灵感</h2><p>自然色调与轻盈构图，让每一张产品图都更有故事感。</p><button onClick={() => { if (templates[0]) setSelected(templates[0]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>看看精选模板 <ArrowRight size={15} /></button></div><div className="feature-image-wrap"><img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=90" alt="色彩丰富的自然食材与生活方式静物" /><span className="feature-image-tag">FRESH PICKS <b>04</b></span><div className="feature-caption"><span>01 / 04</span><i /><span>春日生活提案</span></div></div></section>
          <section className="gallery-section"><div className="section-heading"><div><span className="section-overline">TEMPLATE LIBRARY</span><h2>发现好模板 <span>·</span> <small>把想法变成作品</small></h2></div><button className="text-link" onClick={() => { setCategory("全部模板"); setQuery(""); }}>查看全部 <ArrowRight size={15} /></button></div>
            <div className="gallery-controls"><div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search-box"><Search size={16} /><input aria-label="搜索模板" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索模板" /><kbd>⌘ K</kbd></label></div>
            <div className="template-grid">{filtered.map((item, index) => <button className="template-card" key={item.id} onClick={() => { clearFiles(); setSelected(item); setNotice(""); }}><div className="template-image" style={{ backgroundColor: item.accent }}><img src={item.image} alt={item.name} loading="lazy" /><span className="ratio-tag">{item.ratio}</span><span className="image-index">{String(index + 1).padStart(2, "0")}</span></div><div className="template-info"><span>{item.category} · {item.requiredImageCount} 张图</span><h3>{item.name}</h3><ArrowRight size={16} className="card-arrow" /></div></button>)}</div>
            {!filtered.length && <div className="empty-search"><Search size={20} /><span>没有找到匹配的模板</span></div>}
          </section>
        </div> : <div className="page-content history-page">
          <section className="history-heading"><div><div className="eyebrow"><span /> YOUR CREATIONS</div><h1>我的创作</h1><p>{users.find((user) => user.id === userId)?.name}的个人任务记录</p></div><div className="history-actions"><button className="icon-action" aria-label="刷新任务记录" title="刷新任务记录" onClick={() => refreshHistory(true)} disabled={historyLoading}><RefreshCw size={16} className={historyLoading ? "spin" : ""} /></button><button className="primary-button" onClick={() => setView("templates")}><Plus size={17} />开始新创作</button></div></section>
          {historyError && <div className="request-error" role="alert"><span>{historyError}</span><button onClick={() => refreshHistory(true)}><RefreshCw size={14} />重试查询</button></div>}
          <div className="history-toolbar"><div className="history-tabs">{["全部记录", "处理中", "已完成", "失败记录"].map((item) => <button key={item} className={historyFilter === item ? "active" : ""} onClick={() => setHistoryFilter(item)}>{item}</button>)}</div><span className="history-total">共 {visibleTasks.length} 条记录</span></div>
          {visibleTasks.length ? <div className="history-list">{visibleTasks.map((task) => <article className="history-row" key={task.id}><div className="history-thumb"><img src={task.templateImage} alt="" /></div><div className="history-main"><h3>{task.templateName}</h3><p>{task.createdAt ? new Date(task.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "时间待同步"} · {task.fileName}</p><div className={`task-stage ${task.status === "failed" ? "stage-error" : ""}`}>{task.status === "failed" ? (task.errorMessage || task.stage) : task.status === "succeeded" ? "结果已整理，可预览" : task.stage}</div></div><span className={`status status-${task.status}`}>{isActive(task) ? <LoaderCircle size={14} className="spin" /> : task.status === "succeeded" ? <CheckCircle2 size={14} /> : <X size={14} />}{taskLabels[task.status]}</span>{task.status === "succeeded" ? <button className="download-button" title="预览作品" aria-label="预览作品" onClick={() => showPreview(task)}><Eye size={16} /></button> : <span className="row-progress">{task.progress}%</span>}</article>)}</div> : <div className="empty-history"><div className="empty-art"><ImagePlus size={27} /></div><h2>{historyLoading ? "正在恢复任务记录" : "还没有创作记录"}</h2><p>{historyLoading ? "正在从服务端读取你的任务。" : "从一款模板开始，制作你的第一张作品。"}</p>{!historyLoading && <button className="primary-button" onClick={() => setView("templates")}><Plus size={17} />浏览模板</button>}</div>}
        </div>}
      </section>

      {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading && !submitting) { setSelected(null); clearFiles(); setNotice(""); setSubmitError(""); } }}><section ref={dialogRef} className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-busy={uploading || submitting} tabIndex={-1} onKeyDown={(event) => onDialogKeyDown(event, () => { if (!uploading && !submitting) { setSelected(null); clearFiles(); setNotice(""); setSubmitError(""); } })}><div className="modal-top"><span className="modal-label">NEW CREATION <span>·</span> STEP 01</span><button type="button" className="close-button" onClick={() => { if (!uploading && !submitting) { setSelected(null); clearFiles(); setNotice(""); setSubmitError(""); } }} aria-label="关闭制作对话框" disabled={uploading || submitting}><X size={19} /></button></div><div className="modal-body"><div className="modal-preview"><img src={selected.image} alt={selected.name} /><span className="preview-label">模板预览 · {selected.ratio}</span></div><div className="modal-form"><div className="form-heading"><span>{selected.category}</span><h2 id="modal-title">{selected.name}</h2><p>{selected.description}</p><p className="template-requirements">需要 {selected.requiredImageCount} 张图片 · {selected.acceptedMimeTypes.map((mime) => mime.replace("image/", "").toUpperCase()).join(" / ")} · 每张 {Math.floor(selected.maxFileSizeBytes / 1024 / 1024)} MB 以内</p></div><label className="field-label" htmlFor="source-images">上传你的图片 <span>{files.length} / {selected.requiredImageCount}</span></label><input id="source-images" ref={inputRef} type="file" accept={selected.acceptedMimeTypes.join(",")} multiple={selected.requiredImageCount > 1} onChange={onFileChange} aria-label={`为${selected.name}选择图片`} disabled={uploading || submitting} hidden /><div className={`upload-zone ${dragging ? "dragging" : ""} ${previews.length ? "has-file" : ""} ${uploading ? "uploading" : ""}`} role="group" aria-label="图片素材上传区域" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>{previews.length ? <><button type="button" className="upload-pick has-file" onClick={() => !uploading && !submitting && inputRef.current?.click()} aria-label="更换已选择的图片" disabled={uploading || submitting}><span className="upload-file-previews">{previews.map((preview, index) => <span className="upload-file-preview" key={preview}><img src={preview} alt={`已选图片 ${index + 1}`} /><span>{files[index]?.name}</span></span>)}</span></button><button type="button" className="remove-file" onClick={clearFiles} aria-label="移除已选择的图片" disabled={uploading || submitting}><X size={15} /></button></> : <button type="button" className="upload-pick" onClick={() => !uploading && !submitting && inputRef.current?.click()} aria-label="选择要上传的图片" disabled={uploading || submitting}><span className="upload-icon"><CloudUpload size={21} /></span><b>点击选择图片，或拖拽到这里</b><small>{selected.requiredImageCount > 1 ? `请一次选择 ${selected.requiredImageCount} 张图片` : "选择一张图片"}</small></button>}</div>
            {uploading && <div className="upload-progress" aria-live="polite"><span>素材上传中</span><b>{uploadProgress}%</b><div><i style={{ width: `${uploadProgress}%` }} /></div></div>}
            {submitting && <div className="submit-progress" role="status"><LoaderCircle size={15} className="spin" />上传完成，正在提交制作任务…</div>}
            {submitError && <div className="notice error" role="alert"><X size={14} />{submitError}</div>}{notice && <div className={`notice ${notice.includes("失败") || notice.includes("请") || notice.includes("不能") || notice.includes("仅接受") ? "error" : "success"}`}>{notice.includes("失败") ? <X size={14} /> : <Check size={14} />}{notice}</div>}
            <div className="modal-note"><span><Sparkles size={14} /></span><p>任务受理后会在后台继续制作，你可以随时查看进度。</p></div><button className="submit-button" onClick={submitTask} disabled={uploading || submitting}>{uploading ? <><CloudUpload size={16} />素材上传中 {uploadProgress}%</> : submitting ? <><LoaderCircle size={17} className="spin" />正在提交任务...</> : <><span>开始制作</span><ArrowRight size={17} /></>}</button></div></div></section></div>}

      {previewTask && <div className="modal-backdrop preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setPreviewTask(null); setPreviewError(""); } }}><section ref={dialogRef} className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title" tabIndex={-1} onKeyDown={(event) => onDialogKeyDown(event, () => { setPreviewTask(null); setPreviewError(""); })}><div className="modal-top"><span className="modal-label">CREATION RESULT</span><button type="button" className="close-button" aria-label="关闭预览对话框" onClick={() => { setPreviewTask(null); setPreviewError(""); }}><X size={19} /></button></div><div className="result-content"><h2 id="result-title">{previewTask.templateName}</h2>{previewError ? <p className="preview-error">{previewError}</p> : previewUrl ? <img src={previewUrl} alt={`${previewTask.templateName}制作结果`} /> : <div className="preview-loading"><LoaderCircle size={20} className="spin" />正在加载预览</div>}</div></section></div>}
    </main>
  );
}
