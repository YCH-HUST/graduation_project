# 中医智能辅助诊疗系统 - 后端

基于 Django + Django REST Framework 的后端 API 服务。

## 技术栈

- Django 4.2+
- Django REST Framework
- JWT 认证 (djangorestframework-simplejwt)
- MySQL 数据库
- Pillow 图片处理

## 快速开始

### 1. 创建数据库

在 MySQL 中创建数据库：

```sql
CREATE DATABASE graduation_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 数据库迁移

```bash
python manage.py makemigrations accounts cases pipeline audit
python manage.py migrate
```

### 4. 初始化测试数据

```bash
python init_data.py
```

这将创建三个测试用户：
- 患者: `patient` / `patient123`
- 医生: `doctor` / `doctor123`
- 管理员: `admin` / `admin123`

### 5. 启动开发服务器

```bash
python manage.py runserver
```

服务将在 http://127.0.0.1:8000 启动。

## API 接口

### 认证

| 接口 | 方法 | 描述 |
|------|------|------|
| `/auth/login/` | POST | 用户登录，返回 JWT token |

### 病例管理

| 接口 | 方法 | 权限 | 描述 |
|------|------|------|------|
| `/api/cases/` | POST | 患者 | 创建病例 |
| `/api/cases/` | GET | 患者/医生/管理员 | 查询病例列表 |
| `/api/cases/{id}/` | GET | 病例所有者/医生/管理员 | 获取病例详情 |
| `/api/cases/{id}/run_pipeline/` | POST | 病例所有者/医生/管理员 | 启动/查询流水线 |
| `/api/cases/{id}/review/` | POST | 医生 | 审核病例 |

### 管理员

| 接口 | 方法 | 权限 | 描述 |
|------|------|------|------|
| `/api/admin/health/` | GET | 管理员 | 服务健康检查 |

## 接口示例

### 登录

```bash
curl -X POST http://127.0.0.1:8000/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"patient","password":"patient123"}'
```

响应：
```json
{
  "token": "eyJ...",
  "refresh": "eyJ...",
  "role": "patient",
  "user": {"id": 1, "username": "patient", "role": "patient"}
}
```

### 创建病例

```bash
curl -X POST http://127.0.0.1:8000/api/cases/ \
  -H "Authorization: Bearer <token>" \
  -F "raw_image=@tongue.jpg" \
  -F "chief_complaint_text=头痛三天" \
  -F 'questionnaire_json={"q1":"answer1"}'
```

### 启动流水线

```bash
curl -X POST http://127.0.0.1:8000/api/cases/<case_id>/run_pipeline/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}'
```

### 查询流水线状态

```bash
curl -X POST http://127.0.0.1:8000/api/cases/<case_id>/run_pipeline/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

## 运行测试

```bash
python manage.py test tests
```

## 项目结构

```
backend/
├── manage.py                 # Django 管理脚本
├── requirements.txt          # Python 依赖
├── init_data.py             # 初始化脚本
├── README.md                # 本文件
├── backend/                 # 项目配置
│   ├── settings.py          # Django 设置
│   ├── urls.py              # 主路由
│   └── wsgi.py              # WSGI 入口
├── apps/                    # 应用模块
│   ├── accounts/            # 用户认证
│   ├── cases/               # 病例管理
│   ├── pipeline/            # 流水线任务
│   ├── audit/               # 审计日志
│   └── adminops/            # 管理员操作
├── media/                   # 上传文件存储
└── tests/                   # 测试用例
```

## 注意事项

1. **数据库配置**：数据库配置已固定在 `settings.py` 中，请确保 MySQL 服务已启动且配置正确。

2. **流水线任务**：当前使用后台线程实现，适合单机开发环境。生产环境建议迁移到 Celery。

3. **Mock 服务**：YOLO、NLP、辨证等 AI 服务当前使用 Mock 实现，返回模拟数据。
