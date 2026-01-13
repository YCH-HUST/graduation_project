你是资深后端工程师。请使用 Django + Django REST Framework 实现“中医智能辅助诊疗系统”的后端 API，要求可运行、结构清晰、包含迁移、示例数据、接口可联调。数据库必须使用 MySQL，并使用以下固定配置（不要改）：

DATABASES = {
  'default': {
    'ENGINE': 'django.db.backends.mysql',
    'NAME': 'graduation_project',
    'USER': 'root',
    'PASSWORD': '010831',
    'HOST': 'localhost',
    'PORT': '3306',
  }
}

【总体架构】
- Django + DRF
- 认证：JWT（Bearer Token）
- 权限：patient/doctor/admin 三角色
- 目标：病例管理 + 流水线运行状态 + 医生审核 + 管理员健康检查
- 流水线部分先做“可跑通联调”的实现：
  - 可以用 Celery（推荐）或线程/后台任务（最小实现也可），但必须能查询进度与结果
  - 与外部模型服务（YOLO / 辨证 / LLM）先写成可替换的 client，默认用 mock client 返回示例结果

【必须实现的 Django apps（建议）】
- accounts（用户/角色/JWT登录）
- cases（病例、资源、查询接口）
- pipeline（PipelineRun 记录、任务编排与进度）
- adminops（health 接口）
- audit（审计日志，可简化）

【核心模型（必须实现）】
1) User（扩展 Django User 或自定义）：
- role: patient|doctor|admin

2) Case：
- id（UUID 或自增都行）
- patient(FK User)
- status: draft | running | pending_review | approved | rejected | failed
- chief_complaint_text (TextField)
- questionnaire_json (JSONField)
- created_at, updated_at

3) CaseAsset：
- case(FK)
- type: raw_image | mask | heatmap | annotated
- url/object_key
- created_at

4) PipelineRun：
- case(FK)
- status: queued | running | success | failed
- progress int 0-100
- yolo_result_json (JSON)
- nlp_result_json (JSON)
- inference_result_json (JSON)
- explanation_text (Text)
- timing_json (JSON)
- error_message (Text nullable)
- created_at

5) Review：
- case(FK)
- doctor(FK User)
- decision: approved | rejected
- edited_syndrome_json (JSON)
- edited_prescription_json (JSON)
- note (Text)
- created_at

【接口（必须实现，路径与返回结构要稳定）】
1) POST /auth/login
- 输入：username, password
- 输出：{token, role, user:{id, username}}

2) POST /api/cases/
- 权限：patient
- 支持 multipart/form-data：
  - raw_image (file)
  - chief_complaint_text (str)
  - questionnaire_json (str JSON)
- 行为：
  - 创建 Case（status=draft）
  - 保存 raw_image 为 CaseAsset(type=raw_image)
- 输出：{case_id}

3) POST /api/cases/{id}/run_pipeline/
- 权限：patient(本人)/doctor/admin
- 行为：触发或查询（建议：同一个接口既可 start 也可 status）
  - 如果请求体 {action:"start"}：创建 PipelineRun(status=queued, progress=0)，启动任务
  - 如果请求体为空或 {action:"status"}：返回最新 PipelineRun 的 {status, progress, result_available}
- result_available: status==success

4) GET /api/cases/{id}/
- 权限：patient(本人)/doctor/admin
- 输出：{
    case:{...},
    latest_run:{...},
    assets:[{type,url,created_at}]
  }

5) POST /api/cases/{id}/review/
- 权限：doctor
- 输入：decision, edited_syndrome_json, edited_prescription_json, note
- 行为：写 Review；更新 case.status 为 approved/rejected
- 输出：{ok:true}

6) GET /api/cases?status=pending
- 权限：doctor
- 返回分页：{items:[...], page, page_size, total}

7) GET /api/admin/health/
- 权限：admin
- 检查服务（可配置 URL；默认 mock）：YOLO、辨证、LLM
- 输出：{services:[{name, up, latency_ms, checked_at}]}

【流水线编排要求（最小可用但结构要对）】
- run_pipeline(case_id) 按顺序更新 progress：
  1) YOLO 推理（progress 10->40），产出：mask/annotated 资源 + yolo_result_json
  2) LLM 解析问诊（40->60），产出：nlp_result_json（结构化症状）
  3) 辨证模型（60->85），产出：inference_result_json（证候多标签+方剂候选+分数）
  4) LLM 解释（85->100），产出：explanation_text（条目化要点）
- 完成后：
  - PipelineRun.status=success
  - Case.status=pending_review
- 失败时：
  - PipelineRun.status=failed + error_message
  - Case.status=failed

【工程交付要求】
- requirements.txt / pyproject.toml
- migrations
- 提供初始化脚本：创建三个用户（patient/doctor/admin）用于联调
- 提供 README：如何创建数据库 graduation_project、如何迁移、如何启动
- 可选：docker-compose 提供 MySQL（但你给的 HOST=localhost，若用 docker-compose 请额外写“本机运行时如何改 HOST”说明，不允许偷偷改配置）
- 提供 2-3 个 API 测试用例（pytest 或 Django TestCase）：登录、患者创建病例、医生审核