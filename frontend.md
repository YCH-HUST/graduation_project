你是资深前端工程师。请用 Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui 实现一个“三端一体”的 Web 前端：患者端/医生端/管理员端。要求项目可运行、页面完整、组件可复用、代码清晰并有必要注释。

【项目目标】
实现“中医智能辅助诊疗系统”前端：患者上传舌象+问诊 → 触发后端流水线 → 展示检测与诊断结果；医生审核修订；管理员查看健康与数据治理。

【技术要求】
- Next.js 14 App Router
- TypeScript
- Tailwind + shadcn/ui（统一风格）
- 状态管理：Zustand
- 请求库：Axios（封装 apiClient，自动注入 JWT）
- 统一错误处理：toast（sonner 或 react-hot-toast 二选一）
- 路由守卫：基于 role 的页面保护（patient/doctor/admin）
- 目录结构（必须按此建立）：
  src/
    app/ (routes)
    components/
    api/
    store/
    lib/
    types/

【认证与权限】
- 登录页 /login：输入账号密码，调用 POST /auth/login 获取 {token, role, user}
- token 存储：localStorage（或 httpOnly cookie 也可，但必须可跑通；默认 localStorage）
- 401 自动登出并跳转 /login
- 不同 role 显示不同菜单与路由可访问性：
  - patient：/patient/new-case, /patient/cases/[id]
  - doctor：/doctor/dashboard, /doctor/review/[id]
  - admin：/admin/governance, /admin/health

【必须实现的页面与功能】
1) /login
- 登录表单校验（必填、长度）
- 登录成功写入 store：token、role、user

2) 患者端
- /patient/new-case
  - 上传舌象图片（支持预览、进度条、失败重试 UI）
  - 问诊表单：结构化字段 + 自由文本（校验+错误提示）
  - 提交：POST /api/cases/（multipart：image + 文本字段）
  - 返回 case_id 后：自动调用 POST /api/cases/{id}/run_pipeline/ 触发流水线
  - 轮询接口：每 2s 调 GET/POST status（由后端实现）直到 result_available=true 或 failed
  - 完成后跳转：/patient/cases/{id}

- /patient/cases/[id]
  - GET /api/cases/{id}/ 拉取结果
  - 展示：
    - 诊断结论（证候、方剂候选、评分）
    - 证据要点（条目化）
    - LLM 解释文本（可折叠）
    - 可视化资源：raw/mask/heatmap/annotated 图片列表（带预览弹窗）
  - 状态展示：running/pending_review/approved/rejected/failed

3) 医生端
- /doctor/dashboard
  - GET /api/cases?status=pending（分页+搜索：患者id/时间/关键词）
  - 列表展示：创建时间、患者、状态、按钮“进入审核”
- /doctor/review/[id]
  - 三栏布局：
    - 左：患者资料与问诊摘要
    - 中：图片可视化（mask/heatmap/annotated）
    - 右：模型建议 + 医生可编辑修订（证候/方剂/备注）
  - 提交审核：POST /api/cases/{id}/review/（decision + edited_json + note）
  - 一键通过/退回

4) 管理员端
- /admin/governance
  - 数据治理 UI（CRUD 占位即可）：同义词、标签、模板、黑名单词
  - API 封装先按 /api/admin/* 设计（即使后端暂未实现，也要有 mock 与接口层）
- /admin/health
  - GET /api/admin/health/ 展示服务健康（表格 + 手动刷新）

【接口约定（必须严格使用）】
- POST /auth/login -> {token, role, user}
- POST /api/cases/ -> {case_id}
- POST /api/cases/{id}/run_pipeline/ -> {status, progress, result_available}
- GET  /api/cases/{id}/ -> {case, latest_run, assets[]}
- POST /api/cases/{id}/review/ -> {ok}
- GET  /api/cases?status=pending -> {items, page, total}
- GET  /api/admin/health/ -> {services:[...]}

【交付要求】
- 给出完整代码（package.json、Tailwind、shadcn 初始化说明）
- 给出可跑的假数据兜底（mock 模式开关：NEXT_PUBLIC_USE_MOCK=true）
- 给出 README：如何启动、如何配置后端 BASE_URL