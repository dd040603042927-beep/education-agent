# Dify 机器学习诊断工作流导入说明

## 文件清单

- `ml_learning_diagnosis_assistant_upgraded_0_6_0.yml`：升级后的 Dify 0.6.0 工作流 DSL。
- `knowledge_base/ml_keypoints.md`：课程知识点知识库。
- `knowledge_base/ml_quiz_bank.md`：题库、标准答案和评分点知识库。
- `knowledge_base/ml_misconceptions.md`：错因、易混淆点和评分标准知识库。

## Dify 导入顺序

1. 在 Dify 中新建或导入知识库“机器学习课程知识库”，上传 `ml_keypoints.md` 和 `ml_quiz_bank.md`。
2. 新建或导入知识库“机器学习错因与评分标准”，上传 `ml_misconceptions.md`。
3. 分段建议：400-600 tokens，重叠 50-100 tokens，top_k=5，score_threshold=0.30-0.45。
4. 导入 `ml_learning_diagnosis_assistant_upgraded_0_6_0.yml`。
5. 打开工作流，将 `课程知识库检索_RAG` 绑定到课程知识库，将 `错因知识库检索_RAG` 绑定到错因知识库。
6. 确认 `项目知识图谱数据库_HTTP节点` 使用开始节点传入的 `graph_context_url`，`项目数据库同步_HTTP节点` 使用开始节点传入的 `callback_url`。Docker 版 Dify 默认通过 `host.docker.internal` 访问宿主机项目后端。

## 后端回调配置

工作流 HTTP 节点默认请求：

```http
POST {{#start.callback_url#}}
Authorization: Bearer change-me
Content-Type: application/json
```

项目侧建议环境变量：

```env
DIFY_BASE_URL=http://127.0.0.1/v1
DIFY_WORKFLOW_API_KEY=app-xxx
DIFY_WORKFLOW_USER_PREFIX=education-agent
DIFY_PROJECT_BASE_URL=http://host.docker.internal:5107
DIFY_GRAPH_CONTEXT_URL=http://host.docker.internal:5107/api/integrations/dify/graph-context
DIFY_CALLBACK_URL=http://host.docker.internal:5107/api/integrations/dify/diagnosis-callback
DIFY_CALLBACK_TOKEN=change-me
```

项目后端会额外传入 `assistant_task`、`assistant_task_label`、`assistant_role_context` 和 `project_class_context`。同一个工作流会据此区分学生端问答/诊断、教师端备课/出题/批改/学情分析；教师端不会传 `student_id`，因此回调不会被当成学生学习画像写入。

## 节点结构

升级后共 13 个节点：

1. 开始
2. 输入清洗与任务识别_代码节点
3. 课程知识库检索_RAG
4. 错因知识库检索_RAG
5. RAG片段去重与证据整理_代码节点
6. 朴素贝叶斯知识点分类_代码节点
7. 掌握度评分_代码节点
8. LLM标准解释节点
9. 条件分支_问答或诊断
10. LLM诊断反馈节点
11. 输出结构化JSON_代码节点
12. 项目数据库同步_HTTP节点
13. 结束
