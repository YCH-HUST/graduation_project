# 中医智能辅助诊疗系统 - 前端

基于 **Next.js 14 + TypeScript + TailwindCSS + shadcn/ui** 的中医智能辅助诊疗系统前端应用，支持患者端、医生端和管理员端三端一体。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: TailwindCSS + 自定义 shadcn/ui 组件
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **Toast 通知**: Sonner
- **图标**: Lucide React

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装依赖

```bash
cd frontend
npm install
```

### 配置环境变量

复制 `.env.local` 文件或创建新的配置：

```bash
# API 基础地址
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Mock 模式开关
# true = 使用 Mock 数据（开发调试）
# false = 连接真实后端
NEXT_PUBLIC_USE_MOCK=true
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## Mock 模式说明

### 切换 Mock/Real 模式

编辑 `.env.local` 文件：

```bash
# 启用 Mock 模式（使用内置假数据）
NEXT_PUBLIC_USE_MOCK=true

# 关闭 Mock 模式（连接真实后端）
NEXT_PUBLIC_USE_MOCK=false
```

修改后需要重启开发服务器。

### Mock 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 患者 | patient1 | password123 |
| 医生 | doctor1 | password123 |
| 管理员 | admin1 | password123 |

## 目录结构

```
src/
├── app/                    # Next.js App Router 路由
│   ├── login/              # 登录页
│   ├── patient/            # 患者端
│   │   ├── new-case/       # 新建病例
│   │   └── cases/[id]/     # 病例详情
│   ├── doctor/             # 医生端
│   │   ├── dashboard/      # 待审列表
│   │   └── review/[id]/    # 审核页面
│   └── admin/              # 管理员端
│       ├── health/         # 健康检查
│       └── governance/     # 数据治理
├── components/             # 可复用组件
│   ├── ui/                 # UI 基础组件
│   ├── auth/               # 认证相关组件
│   ├── case/               # 病例相关组件
│   └── layout/             # 布局组件
├── api/                    # API 封装层
├── store/                  # Zustand 状态管理
├── lib/                    # 工具函数
│   ├── utils.ts            # 通用工具
│   └── mock/               # Mock 数据
└── types/                  # TypeScript 类型定义
```

## API 接口约定

| 功能 | 方法 | 路径 |
|------|------|------|
| 登录 | POST | /auth/login |
| 创建病例 | POST | /api/cases/ |
| 触发流水线 | POST | /api/cases/{id}/run_pipeline/ |
| 获取病例详情 | GET | /api/cases/{id}/ |
| 提交审核 | POST | /api/cases/{id}/review/ |
| 待审列表 | GET | /api/cases?status=pending |
| 健康检查 | GET | /api/admin/health/ |

## 主要功能

### 患者端
- 📷 上传舌象图片（支持拖拽、预览、进度条）
- 📝 填写问诊表单（主诉、现病史、既往史等）
- ⏳ 实时轮询流水线进度
- 📊 查看诊断结果（证候、方剂、证据要点）
- 🖼️ 可视化资源预览（原图、分割、热力图、标注）

### 医生端
- 📋 待审病例列表（分页、搜索）
- 🔍 三栏审核布局（患者信息 | 可视化 | 诊断修订）
- ✅ 一键通过/驳回/修订

### 管理员端
- 💚 服务健康检查（状态、延迟、最后检查时间）
- 📚 数据治理（同义词、标签、模板、黑名单 CRUD）

## 构建生产版本

```bash
npm run build
npm start
```

## 开发注意事项

1. **401 自动登出**: Axios 拦截器会自动处理 401 错误，清除 token 并跳转登录页
2. **路由守卫**: 使用 `AuthGuard` 组件保护路由，支持角色权限控制
3. **类型安全**: 所有 API 响应和组件 props 都有完整的 TypeScript 类型定义
4. **Mock 数据**: Mock 模式下所有 API 调用会使用 `src/lib/mock/data.ts` 中的假数据

## License

MIT
