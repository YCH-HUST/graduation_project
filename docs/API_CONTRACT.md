# API 接口契约文档

> **前后端接口对齐文档**  
> 前端严格按照本文档实现，后端需确保接口路径、请求/响应格式完全一致。

---

## 基础信息

| 配置项 | 值 |
|--------|-----|
| Base URL | `http://localhost:8000` |
| 认证方式 | JWT Bearer Token |
| Content-Type | `application/json` (除文件上传外) |

### 认证头格式
```
Authorization: Bearer <token>
```

---

## 1. 认证接口

### 1.1 用户登录

```
POST /auth/login
```

**请求体**
```json
{
  "username": "string",
  "password": "string"
}
```

**成功响应** `200 OK`
```json
{
  "token": "jwt_token_string",
  "role": "patient" | "doctor" | "admin",
  "user": {
    "id": 1,
    "username": "patient1",
    "email": "patient1@example.com",
    "full_name": "张三"
  }
}
```

**失败响应** `401 Unauthorized`
```json
{
  "detail": "用户名或密码错误"
}
```

---

### 1.2 用户注册

```
POST /auth/register
```

**请求体**
```json
{
  "username": "string (必填, 3-20字符, 字母数字下划线)",
  "password": "string (必填, 至少6字符)",
  "email": "string (可选)",
  "full_name": "string (可选)",
  "role": "patient" | "doctor" | "admin (可选, 默认 patient)"
}
```

**成功响应** `201 Created`
```json
{
  "token": "jwt_token_string",
  "role": "patient",
  "user": {
    "id": 1,
    "username": "newuser",
    "email": "newuser@example.com",
    "full_name": "新用户"
  }
}
```

**失败响应** `400 Bad Request`
```json
{
  "detail": "用户名已存在"
}
```

---

## 2. 病例接口

### 2.1 创建病例

```
POST /api/cases/
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**请求体 (FormData)**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tongue_image | File | ✅ | 舌象图片 (JPG/PNG) |
| questionnaire | JSON String | ✅ | 问诊数据 JSON |

**questionnaire 结构**
```json
{
  "chief_complaint": "主诉（必填）",
  "present_illness": "现病史（必填）",
  "past_history": "既往史",
  "sleep_quality": "睡眠质量",
  "appetite": "食欲",
  "bowel_movement": "大便情况",
  "urination": "小便情况",
  "additional_notes": "补充说明"
}
```

**成功响应** `201 Created`
```json
{
  "case_id": 123
}
```

---

### 2.2 触发流水线

```
POST /api/cases/{id}/run_pipeline/
Authorization: Bearer <token>
```

**路径参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 病例 ID |

**成功响应** `200 OK`
```json
{
  "status": "pending" | "running" | "completed" | "failed",
  "progress": 0,
  "current_stage": "preprocessing",
  "result_available": false
}
```

---

### 2.3 查询流水线状态

```
GET /api/cases/{id}/run_pipeline/
Authorization: Bearer <token>
```

> **轮询说明**: 前端每 2 秒调用一次，直到 `result_available=true` 或 `status=failed`

**成功响应** `200 OK`
```json
{
  "status": "pending" | "running" | "completed" | "failed",
  "progress": 60,
  "current_stage": "feature_extraction",
  "result_available": false
}
```

**阶段枚举 (current_stage)**
- `preprocessing` - 图像预处理
- `segmentation` - 舌体分割
- `feature_extraction` - 特征提取
- `diagnosis` - 智能诊断
- `postprocessing` - 结果生成
- `completed` - 处理完成

---

### 2.4 获取病例详情

```
GET /api/cases/{id}/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{
  "case": {
    "id": 123,
    "patient_id": 1,
    "patient_name": "张三",
    "tongue_image": "/media/cases/123/tongue.jpg",
    "questionnaire": {
      "chief_complaint": "胁肋胀痛半月余",
      "present_illness": "..."
    },
    "status": "pending_review",
    "created_at": "2024-01-13T10:30:00Z",
    "updated_at": "2024-01-13T10:35:00Z"
  },
  "latest_run": {
    "id": 1,
    "case_id": 123,
    "status": "completed",
    "progress": 100,
    "current_stage": "completed",
    "result_available": true,
    "diagnosis_result": {
      "syndromes": [
        { "name": "肝郁脾虚证", "score": 0.85, "description": "..." }
      ],
      "formulas": [
        { "name": "逍遥散", "score": 0.88, "composition": "...", "indication": "..." }
      ],
      "evidence_points": [
        "舌象显示舌质暗红，有瘀斑",
        "舌苔薄白腻，提示湿气内蕴"
      ],
      "llm_explanation": "综合分析患者的舌象特征...",
      "confidence_score": 0.82
    },
    "created_at": "2024-01-13T10:30:00Z",
    "completed_at": "2024-01-13T10:35:00Z"
  },
  "assets": [
    { "id": 1, "type": "raw", "url": "/media/cases/123/raw.jpg", "description": "原始舌象" },
    { "id": 2, "type": "mask", "url": "/media/cases/123/mask.jpg", "description": "分割掩码" },
    { "id": 3, "type": "heatmap", "url": "/media/cases/123/heatmap.jpg", "description": "热力图" },
    { "id": 4, "type": "annotated", "url": "/media/cases/123/annotated.jpg", "description": "标注结果" }
  ]
}
```

**状态枚举 (status)**
- `created` - 已创建
- `running` - 处理中
- `pending_review` - 待审核
- `approved` - 已通过
- `rejected` - 已驳回
- `failed` - 处理失败

**资源类型枚举 (asset.type)**
- `raw` - 原始图片
- `mask` - 分割掩码
- `heatmap` - 热力图
- `annotated` - 标注结果

---

### 2.5 获取待审病例列表

```
GET /api/cases?status=pending_review&page=1&page_size=10&search=关键词
Authorization: Bearer <token>
```

**查询参数**
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| status | string | - | 病例状态筛选 |
| page | number | 1 | 页码 |
| page_size | number | 10 | 每页数量 |
| search | string | - | 搜索关键词 |

**成功响应** `200 OK`
```json
{
  "items": [
    {
      "id": 123,
      "patient_id": 1,
      "patient_name": "张三",
      "questionnaire": { "chief_complaint": "..." },
      "status": "pending_review",
      "created_at": "2024-01-13T10:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 25
}
```

---

### 2.6 提交审核

```
POST /api/cases/{id}/review/
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**
```json
{
  "decision": "approve" | "reject" | "revise",
  "edited_syndromes": [
    { "name": "肝郁脾虚证", "score": 0.90, "description": "..." }
  ],
  "edited_formulas": [
    { "name": "逍遥散", "score": 0.88, "composition": "...", "indication": "..." }
  ],
  "note": "审核备注"
}
```

> `edited_syndromes` 和 `edited_formulas` 仅在 `decision=revise` 时需要提供

**成功响应** `200 OK`
```json
{
  "ok": true
}
```

---

## 3. YOLO 舌象检测接口

### 3.1 舌象检测

```
POST /api/yolo/detect/
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**请求体 (FormData)**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | File | ✅ | 舌象图片 (JPG/PNG) |

**成功响应** `200 OK`
```json
{
  "success": true,
  "detections": [
    {
      "class_id": 3,
      "class_name": "红舌黄厚腻苔",
      "confidence": 0.85,
      "bbox": [100, 50, 400, 350]
    },
    {
      "class_id": 0,
      "class_name": "黑苔",
      "confidence": 0.72,
      "bbox": [120, 80, 380, 320]
    }
  ],
  "annotated_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**类别映射**
| class_id | class_name |
|----------|------------|
| 0 | 黑苔 |
| 1 | 地图舌 |
| 2 | 紫苔 |
| 3 | 红舌黄厚腻苔 |
| 4 | 红舌厚腻苔 |
| 5 | 白舌厚腻苔 |

**失败响应** `400 Bad Request`
```json
{
  "success": false,
  "detail": "请上传图片"
}
```

---

## 4. 管理员接口

### 4.1 健康检查

```
GET /api/admin/health/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{
  "services": [
    {
      "name": "Django Backend",
      "status": "healthy" | "unhealthy" | "degraded",
      "latency_ms": 45,
      "message": "响应正常",
      "last_check": "2024-01-13T10:00:00Z"
    },
    {
      "name": "PostgreSQL Database",
      "status": "healthy",
      "latency_ms": 12,
      "last_check": "2024-01-13T10:00:00Z"
    }
  ],
  "overall_status": "healthy" | "unhealthy" | "degraded"
}
```

---

### 3.2 数据治理 (可选实现)

**获取列表**
```
GET /api/admin/governance/?type=synonym
Authorization: Bearer <token>
```

**创建**
```
POST /api/admin/governance/
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "synonym" | "tag" | "template" | "blacklist",
  "value": "内容",
  "description": "描述"
}
```

**删除**
```
DELETE /api/admin/governance/{id}/
Authorization: Bearer <token>
```

---

## 4. 个人资料接口

### 4.1 获取个人资料

```
GET /api/profile/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{
  "id": 1,
  "username": "doctor1",
  "email": "doctor@example.com",
  "full_name": "张医生",
  "role": "doctor",
  "hospital": "北京中医院",
  "job_title": "主任医师",
  "years_of_experience": 15,
  "gender": "male",
  "age": 45
}
```

---

### 4.2 更新个人资料

```
PUT /api/profile/
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**
```json
{
  "full_name": "张医生",
  "email": "doctor@example.com",
  "hospital": "北京中医院",
  "job_title": "主任医师",
  "years_of_experience": 15,
  "gender": "male",
  "age": 45
}
```

> 所有字段均为可选，仅需传入要更新的字段

**成功响应** `200 OK`
```json
{
  "id": 1,
  "username": "doctor1",
  "email": "doctor@example.com",
  "full_name": "张医生",
  "role": "doctor",
  "hospital": "北京中医院",
  "job_title": "主任医师",
  "years_of_experience": 15,
  "gender": "male",
  "age": 45
}
```

---

### 4.3 获取医生最近患者

```
GET /api/doctor/recent-patients/
Authorization: Bearer <token>
```

> 仅医生角色可访问

**成功响应** `200 OK`
```json
{
  "patients": [
    {
      "id": 1,
      "username": "patient1",
      "full_name": "李患者",
      "case_id": 101,
      "case_status": "approved",
      "chief_complaint": "头痛三天，伴有失眠",
      "created_at": "2024-01-13T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### 4.4 获取患者列表

```
GET /api/doctor/patients/?page=1&page_size=10&search=关键词
Authorization: Bearer <token>
```

> 仅医生角色可访问

**成功响应** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "username": "patient1",
      "full_name": "张三",
      "email": "patient@example.com",
      "gender": "male",
      "age": 35,
      "case_count": 3,
      "date_joined": "2024-01-01T00:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 25
}
```

---

### 4.5 创建患者

```
POST /api/doctor/patients/
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**
```json
{
  "username": "newpatient",
  "password": "password123",
  "full_name": "新患者",
  "email": "new@example.com",
  "gender": "male",
  "age": 30
}
```

**成功响应** `201 Created`

---

### 4.6 获取患者详情

```
GET /api/doctor/patients/{id}/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{
  "patient": {
    "id": 1,
    "username": "patient1",
    "full_name": "张三",
    "email": "patient@example.com",
    "gender": "male",
    "age": 35,
    "hospital": "",
    "job_title": "",
    "years_of_experience": null,
    "date_joined": "2024-01-01T00:00:00Z"
  },
  "cases": [
    {
      "id": "uuid-case-id",
      "chief_complaint": "头痛三天",
      "status": "approved",
      "created_at": "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

### 4.7 更新患者

```
PUT /api/doctor/patients/{id}/
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**
```json
{
  "full_name": "张三",
  "email": "new@example.com",
  "gender": "male",
  "age": 36
}
```

---

### 4.8 删除患者

```
DELETE /api/doctor/patients/{id}/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{
  "ok": true
}
```

---

### 4.9 获取医生统计数据

```
GET /api/doctor/statistics/
Authorization: Bearer <token>
```

> 仅医生角色可访问

**成功响应** `200 OK`
```json
{
  "overview": {
    "total_reviews": 156,
    "approved_count": 120,
    "rejected_count": 36,
    "approval_rate": 76.9,
    "pending_count": 8
  },
  "trend": [
    { "date": "01-08", "count": 12 },
    { "date": "01-09", "count": 18 }
  ],
  "syndromes": [
    { "name": "肝郁脾虚证", "count": 25 },
    { "name": "气滞血瘀证", "count": 18 }
  ],
  "recent_reviews": [
    {
      "id": 1,
      "case_id": "uuid",
      "patient_name": "张三",
      "decision": "approved",
      "created_at": "2024-01-13T10:30:00Z"
    }
  ]
}
```

---

### 4.10 获取通知列表

```
GET /api/notifications/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "type": "new_case",
      "title": "新病例待审核",
      "content": "患者张三提交了新病例",
      "related_case_id": "uuid",
      "is_read": false,
      "created_at": "2024-01-14T10:00:00Z"
    }
  ],
  "unread_count": 5
}
```

### 4.11 标记通知已读

```
PUT /api/notifications/{id}/read/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{ "ok": true }
```

### 4.12 全部标记已读

```
PUT /api/notifications/read-all/
Authorization: Bearer <token>
```

**成功响应** `200 OK`
```json
{ "ok": true, "count": 5 }
```

---

## 5. 错误响应规范



### 通用错误格式
```json
{
  "detail": "错误描述信息"
}
```

### HTTP 状态码
| 状态码 | 说明 | 前端处理 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 201 | 创建成功 | 正常处理 |
| 400 | 请求格式错误 | 显示错误信息 |
| 401 | 未授权/Token 过期 | 清除 Token，跳转登录页 |
| 403 | 无权限 | 显示无权限提示 |
| 404 | 资源不存在 | 显示不存在提示 |
| 500 | 服务器错误 | 显示服务器错误提示 |

---

## 5. 注意事项

1. **路径格式**: 所有路径必须与本文档一致，不要使用 `/accounts/auth/login/` 或 `/cases/cases/` 等带 app 前缀的路径

2. **日期格式**: 统一使用 ISO 8601 格式 (`2024-01-13T10:30:00Z`)

3. **分页**: 使用 `page` 和 `page_size` 参数，返回 `total` 总数

4. **文件上传**: 使用 `multipart/form-data`，其他接口使用 `application/json`

5. **CORS**: 后端需配置允许 `http://localhost:3000` 跨域访问
