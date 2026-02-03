

# Generate 模式多Agent系统升级方案

## 一、当前架构分析

### 现有实现
- **Agent 类型**: orchestrator, goal_clarifier, recruiter_judge, diagnostician, rewriter, integrity_guard
- **工作流阶段**: idle → goal_clarification → recruiter_review → diagnosis → confirmation → rewriting → complete
- **简历 Schema**: 简化版（name, title, contact, summary, experience, education, skills）
- **状态管理**: 使用 `[STATE_UPDATE: key=value]` 标签在对话中传递状态

### 存在的差距
1. **缺少 Generate 模式** - 当前仅支持 Optimize 模式（需要用户提供现有简历）
2. **缺少核心 Agent** - 没有 career_elicitation（经历采集）、fact_structurer（事实结构化）、resume_drafter（简历草稿）
3. **简历 Schema 不完整** - 缺少 meta、fact_readiness、confidence_level、ui_state 等关键字段
4. **无实时渲染机制** - 简历只在最后一次性生成，而非增量更新
5. **无兜底策略** - 用户表达困难时没有降级处理

## 二、核心改动

### 2.1 Resume JSON Schema 升级

新增完整的 ATS + UI 双兼容 Schema：

```text
resume_json
├── schema_version: "1.0"
├── meta
│   ├── mode: "generate" | "optimize" | "hybrid"
│   ├── target_role: string
│   ├── target_market: "CN" | "US" | "global"
│   ├── language: "zh-CN" | "en-US"
│   └── last_updated: ISO-8601
├── fact_readiness: 0.0 ~ 1.0
├── confidence_level: "low" | "medium" | "high"
├── basics
│   ├── name, headline, email, phone, location
│   └── links: [{label, url}]
├── summary: {content, source, confidence}
├── experience[]
│   ├── id, company, role, employment_type
│   ├── start_date, end_date, context
│   ├── bullets: [{action, result, metrics, confidence, source}]
│   ├── tech_stack[]
│   └── fact_status: "confirmed" | "inferred" | "weak"
├── projects[], education[]
├── skills: {hard[], soft[], tools[], languages[]}
└── ui_state
    ├── renderable_sections[]
    ├── locked_sections[]
    ├── highlighted_sections[]
    └── draft_version
```

### 2.2 新增 Agent 体系

| Agent | 职责 | 触发条件 |
|-------|------|----------|
| career_elicitation | 通过友好对话采集用户职业经历 | Generate 模式进入后 |
| fact_structurer | 将用户口语转为结构化事实 | 每次用户回答后 |
| resume_drafter | 根据结构化事实生成简历内容 | fact_readiness >= 0.4 |
| quality_guard | 检查清晰度、可信度、ATS兼容性 | 每次内容生成后 |

### 2.3 模式切换状态机

```text
用户进入
    ↓
检测简历状态
    ├── 无简历 / 不可用 / 选择从零开始 → GENERATE 模式
    ├── 有完整简历 → OPTIMIZE 模式
    └── 部分简历 / 缺少核心部分 → HYBRID 模式
```

### 2.4 Fact Readiness 驱动 UI

| 状态 | 阈值 | 右侧面板显示 |
|------|------|-------------|
| EMPTY | 0 | "我们先聊聊你的经历，简历会慢慢成型" |
| PARTIAL | >= 0.4 | 显示草稿，标注"已生成草稿，可随时修改" |
| READY | >= 0.7 | 完整简历，标注"这是一份可以投递的版本" |

### 2.5 兜底策略

1. **身份降级** - 改为生成"能力画像"而非正式简历
2. **示例触发** - 提供例句让用户说"像/不像"
3. **暂停渲染** - 显示"我们不急，这不是考试"
4. **最低可交付物** - 生成基础版简历保证非空白

## 三、实施步骤

### 第1步：升级类型定义
**文件**: `src/types/resume.ts`, `src/types/agents.ts`
- 扩展 ResumeData 为完整 Schema
- 新增 Generate 模式相关 Agent 类型
- 添加 FactReadiness 状态枚举

### 第2步：新建 Career Elicitation Agent Prompt
**文件**: `supabase/functions/agent-router/index.ts`
- 添加 career_elicitation 系统提示词（包含对话脚本）
- 添加 fact_structurer 提示词
- 添加 resume_drafter 提示词
- 添加 quality_guard 提示词

### 第3步：实现模式切换逻辑
**文件**: `supabase/functions/agent-router/index.ts`
- 在入口检测用户是否有简历
- 根据状态选择 GENERATE / OPTIMIZE / HYBRID 模式
- 更新路由逻辑支持新 Agent

### 第4步：增量简历渲染
**文件**: `src/hooks/useVoiceChat.ts`, `src/components/ResumePanel.tsx`
- 解析流式响应中的 fact_readiness 更新
- 当 fact_readiness >= 0.4 时开始渲染部分简历
- 支持 highlighted_sections 高亮显示

### 第5步：UI 状态提示
**文件**: `src/components/ResumePanel.tsx`
- 根据 fact_readiness 显示不同状态提示
- 支持 ui_state.renderable_sections 局部渲染
- 添加草稿版本标识

### 第6步：兜底策略实现
**文件**: `supabase/functions/agent-router/index.ts`
- 检测用户表达困难（连续模糊回答）
- 触发降级策略
- 切换到示例触发模式

### 第7步：开场流程更新
**文件**: `src/hooks/useVoiceChat.ts`
- 修改 startConversation 支持选择模式
- 添加 Generate 模式开场白

## 四、技术细节

### Agent Input/Output 契约

**Orchestrator**
```typescript
// Input
{
  user_input: string,
  resume_json: FullResumeSchema,
  system_state: { mode: "generate" | "optimize", fact_readiness: number }
}
// Output
{
  route_to: ["career_elicitation"],
  state_update: { fact_readiness_delta: 0.1, ui_action: "render" | "hold" }
}
```

**Career Elicitation**
```typescript
// Input
{ known_facts: {}, missing_fields: ["experience"], conversation_history: [] }
// Output
{ question: string, expected_fact_type: "experience.action", ui_hint: string }
```

**Fact Structurer**
```typescript
// Input
{ raw_user_answer: string, target_schema_path: "experience[0].bullets" }
// Output
{ structured_fact: { action, result, confidence, source } }
```

### 状态传递机制

保留现有 `[STATE_UPDATE: key=value]` 机制，扩展支持：
- `[STATE_UPDATE: fact_readiness=0.45]`
- `[STATE_UPDATE: mode="generate"]`
- `[STATE_UPDATE: ui_action="render"]`

### 新增流式事件类型

```typescript
// Agent info event (existing)
{ type: "agent_info", agent: string, workflowState: object }

// Resume update event (new)
{ type: "resume_update", sections: string[], fact_readiness: number }

// UI hint event (new)
{ type: "ui_hint", message: string, action: "pause" | "resume" | "fallback" }
```

## 五、文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/resume.ts` | 重构 | 完整 Resume Schema |
| `src/types/agents.ts` | 扩展 | 新增 Agent 类型和状态 |
| `supabase/functions/agent-router/index.ts` | 重构 | 新 Agent 提示词 + 路由逻辑 |
| `src/hooks/useVoiceChat.ts` | 扩展 | 增量渲染 + 模式切换 |
| `src/components/ResumePanel.tsx` | 重构 | 支持部分渲染 + 状态提示 |
| `src/pages/Index.tsx` | 小改 | 模式选择入口 |
| `src/components/WorkflowProgress.tsx` | 扩展 | Generate 模式进度显示 |

## 六、风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 大量代码改动可能引入 bug | 分阶段实施，每步测试 |
| 流式解析复杂度增加 | 复用现有解析逻辑，扩展事件类型 |
| AI 生成内容质量不稳定 | quality_guard 检查 + 用户确认 |
| 用户中途放弃 | 保存草稿 + 最低可交付物兜底 |

