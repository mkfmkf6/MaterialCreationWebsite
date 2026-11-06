# 拾光 · 素材创作

独立运行的素材制作演示项目。Next.js 提供模板浏览、图片上传和个人任务历史；Spring Boot 接收上传、异步运行三步模拟任务，并将模板与任务记录保存在 MySQL。它不调用真实 AI 服务。

## 技术版本

- Java 21、Spring Boot 3.3.5、MyBatis-Plus 3.5.9；SQL 映射使用 MyBatis XML。
- MySQL 8.4。
- Node.js 22.12+、Next.js 16、React 19、TypeScript 5.7、Vitest 5。
- Maven 3.9+（容器构建使用 Maven 3.9.10）；npm 使用 `frontend/package-lock.json` 锁定依赖。

GitHub Actions 在 push、pull request 和手动触发时执行前端 lint、类型检查、Vitest、Next.js 构建，以及后端 Maven 测试和打包。

## 项目结构

```text
.
├── .github/workflows/ci.yml
├── MaterialCreationWebsite/
│   ├── src/main/java/.../configuration  # Spring 配置
│   ├── src/main/java/.../controller     # HTTP 接口
│   ├── src/main/java/.../domain/bo      # 多参数业务入参对象
│   ├── src/main/java/.../domain/vo      # 接口响应对象
│   ├── src/main/java/.../domain/entity  # 数据库实体
│   ├── src/main/java/.../mapper         # Mapper 接口
│   ├── src/main/resources/mapper         # MyBatis XML SQL
│   └── src/main/resources/{schema,data}.sql
├── frontend/                             # Next.js App Router
├── docker-compose.yml
└── .env.example
```

BO、VO、数据库实体分别放在不同目录。仅在请求业务参数达到 3 个时建立 BO；接口响应对象按资源复用，不为每个请求重复创建。数据库查询和写入 SQL 位于 `resources/mapper` 下的 XML 文件。

## 快速启动：Docker Compose

需安装 Docker Desktop 或 Docker Engine 与 Compose v2。项目根目录下执行：

```powershell
Copy-Item .env.example .env
docker compose up --build
```

不创建 `.env` 时 Compose 也会使用 `docker-compose.yml` 中的本地演示默认值。打开 <http://localhost:3000>；Java API 位于 <http://localhost:8080/api>，MySQL 映射到本机 `3307`。MySQL 健康后后端启动，Spring SQL 初始化会创建表并插入演示模板。`.env.example` 中的 `local-dev-password` 仅供本地演示，部署到其他环境前应替换。

如果端口已被占用，可在 `.env` 修改 `MYSQL_HOST_PORT`、`BACKEND_HOST_PORT` 或 `FRONTEND_HOST_PORT`。`NEXT_PUBLIC_API_BASE_URL` 是浏览器访问的地址；修改后端宿主机端口时也要将它改成 `http://localhost:<后端端口>/api`，然后重建前端镜像。修改前端端口时同步设置 `CORS_ALLOWED_ORIGINS`，例如 `http://localhost:3001,http://127.0.0.1:3001`。

停止服务但保留数据：

```powershell
docker compose down
```

MySQL 数据和上传／结果文件分别保存在 `material_creation_data`、`material_creation_uploads` 命名卷中。不要在需要保留记录时使用 `docker compose down -v`，该命令会删除这些卷。

## 本机启动

依赖：JDK 21、Maven 3.9+、Node.js 22.12+、npm 和 MySQL 8.4。先在 MySQL 中创建数据库：

```sql
CREATE DATABASE material_creation CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

首次连接时，Spring 的 SQL 初始化会执行 `MaterialCreationWebsite/src/main/resources/schema.sql` 和 `data.sql`，创建任务／模板表并插入模板及图片要求。MySQL 用户需要有该库的建表和写入权限。

PowerShell 中启动后端（将占位值替换成自己的本机 MySQL 凭据）：

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/material_creation?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "<本机 MySQL 密码>"
Set-Location MaterialCreationWebsite
mvn spring-boot:run
```

另开终端启动前端：

```powershell
Set-Location frontend
npm ci
npm run dev
```

前端默认请求 `http://localhost:8080/api`，可设置 `NEXT_PUBLIC_API_BASE_URL` 覆盖。后端默认把上传素材和结果写入工作目录的 `uploads/`，可通过 `UPLOAD_DIR` 指定。Compose 已将该目录挂载到持久卷。

## 构建与测试

```powershell
Set-Location frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

```powershell
mvn -B -f MaterialCreationWebsite/pom.xml clean verify
```

后端测试需要一个可连接的 MySQL `material_creation` 数据库；可按本机启动章节设置 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`。CI 使用 MySQL 8.4 服务容器运行后端测试。后端测试验证三阶段顺序、成功结果落盘、生成阶段失败后不进入结果整理；前端 Vitest 验证多任务更新隔离、查询请求异常时保留原任务状态，以及区分服务端任务失败和查询失败。

## 模拟任务与演示

在模板广场按分类筛选并打开任意模板，上传模板要求数量的 JPEG 或 PNG 图片，提交后可切换到“我的创作”。默认每个后台阶段延迟 1800 毫秒。Java 使用独立线程池执行任务：受理时先写入 `queued` 记录并返回 ID，后台再依次写入并运行素材检查、模拟生成、结果整理。关闭浏览器不会取消服务端任务；页面会轮询未完成任务，刷新后从后端历史恢复并继续跟踪。

任务状态：

- `queued`：等待处理。
- `processing`：正在执行，`stage` 和 `progress` 表示当前阶段及演示进度。
- `succeeded`：处理成功，`resultUrl` 指向可预览图片。
- `failed`：处理失败，`stage` 标明失败阶段，`errorMessage` 提供原因。

提交任务后后端按身份、模板要求校验图片数量、MIME 类型、大小，并解码文件内容确认它确实是图片。模板允许 JPEG 和 PNG。模拟生成不调用 AI；结果整理会将第一张源图复制为可预览的结果文件。每一步更新任务记录后再执行对应操作，失败时保存阶段和原因并停止后续步骤。任务查询只读取当前数据库状态，不会推进执行。

可用以下环境变量控制演示，修改后重启或重建后端，再创建新任务：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SIMULATION_STEP_DELAY_MS` | `1800` | 每个后台阶段的等待毫秒数；设为 `0` 可快速完成。 |
| `SIMULATION_FAIL_STAGE` | 空 | 固定触发失败的阶段：`material-check`、`generation` 或 `result-organization`。留空时走成功流程。 |

例如在 Compose 中复现生成失败，可在 `.env` 设置 `SIMULATION_FAIL_STAGE=generation`、`SIMULATION_STEP_DELAY_MS=2500`，然后运行 `docker compose up -d --force-recreate backend` 并新建任务。已有任务不受新配置影响。取消失败注入时清空该变量并重建后端。

同时提交多个任务即可观察不同任务的阶段和状态独立更新。使用页面左下角身份选择器切换演示用户；刷新页面会重新请求当前身份的历史。上传中、提交中、任务排队／处理中是分开的 UI 状态；历史查询失败显示单独的请求错误并保留已有任务信息，可用刷新按钮重试。

## HTTP 接口

个人任务接口使用 `X-Demo-User` 请求头，允许值为 `demo-user`、`demo-zhou`、`demo-chen`；缺省为 `demo-user`。错误响应为 HTTP 400 和 `{ "message": "可理解的错误原因" }`。

| 方法与路径 | 用途 | 主要参数／响应 |
| --- | --- | --- |
| `GET /api/templates` | 获取模板库 | 返回模板数组：`id`、`name`、`category`、`ratio`、`image`、`accent`、`description`、`requiredImageCount`、`acceptedMimeTypes`、`maxFileSizeBytes`。 |
| `POST /api/tasks` | 创建制作任务 | `multipart/form-data`：`templateId` 和重复的 `images` 文件字段；返回任务对象。 |
| `GET /api/tasks` | 获取当前演示身份的历史 | 返回按创建时间倒序排列的任务数组。 |
| `GET /api/tasks/{id}` | 查询当前身份的单个任务 | 返回任务对象；任务不属于该身份时返回错误。 |
| `GET /api/tasks/{id}/preview` | 预览成功结果 | 返回图片二进制响应。 |
| `GET /api/tasks/{id}/result` | 获取成功结果文件 | 返回文件二进制响应。 |

任务对象字段：`id`、`templateId`、`templateName`、`templateImage`、`fileName`、`status`、`progress`、`stage`、`createdAt`、`resultUrl`、`errorMessage`。等待或处理中字段不代表请求错误；结果 URL 只在成功后返回。

Windows 示例（将图片路径替换成本机文件）：

```powershell
curl.exe -H "X-Demo-User: demo-user" -F "templateId=t01" -F "images=@D:\path\photo.jpg;type=image/jpeg" http://localhost:8080/api/tasks
```

## 身份、数据与素材

这是无登录的本地演示身份方案。前端将选择的 `demo-user`、`demo-zhou` 或 `demo-chen` 保存到浏览器 `localStorage`，通过 `X-Demo-User` 发送给后端；后端在任务表保存 `user_id`，历史、单任务查询和预览均按该 ID 隔离。身份切换和页面刷新会从 Java 后端加载对应记录。该请求头可被任意客户端伪造，不能作为真实认证或授权机制。

数据库结构与初始化数据位于后端 `schema.sql`、`data.sql`；模板记录包含类别、封面、描述和上传限制。示例模板图片使用 Unsplash CDN 的公开图片地址，不需要付费或内部服务，但显示模板封面需要浏览器能访问 Unsplash。用户上传图及生成结果保存在后端本地文件目录／Compose 卷中，不另依赖图片服务。

## CI、部署与回滚

`.github/workflows/ci.yml` 在 push 和 pull request 上运行前后端检查。容器交付文件包括根目录 `docker-compose.yml`、`.env.example`、前后端各自的 `Dockerfile` 和 `.dockerignore`。本地构建启动命令为 `docker compose up --build`；无需公网部署。

回滚时先停止服务，检出已知可用版本，再用相同配置重建：

```powershell
docker compose down
git checkout <已知可用的 commit>
docker compose up --build -d
```

命名卷默认会保留，回滚后服务沿用原数据库和上传数据。当前 SQL 初始化不是版本化迁移系统；若以后修改表结构，回滚代码前需确认新旧结构兼容并先备份数据。当前仓库尚未创建验收提交，因此没有可填写的验收 commit；提交后应在此处记录 commit ID。

## 完成范围、限制与投入

已完成：模板列表与分类筛选、上传校验、异步三阶段模拟任务、MySQL 任务历史与状态、成功结果预览、身份隔离演示、请求异常提示、多任务刷新恢复、前后端关键测试、CI 和 Compose。

未完成／已知限制：不接入真实 AI；模拟结果只是复制首张上传图。进程重启恢复尚未实现：重启前的 `queued` 或 `processing` 任务记录会保留，但应用启动时不会重新入队，因而可能停留在原状态。没有登录认证、生产级授权、任务重试／删除、数据库迁移框架或公网部署；本地图片文件与数据库需要通过持久卷及备份一并保存。

实际投入：本次工作按需求拆成前端状态与页面、Java 接口和异步持久化、测试／CI、容器交付及文档逐项实现并检查。环境未做工时计量，因此不报告未经记录的小时数。