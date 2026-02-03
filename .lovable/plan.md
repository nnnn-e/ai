
# 职途 · 多 Agent 架构升级计划

## 概述

将当前单一 AI 对话升级为产品级多 Agent 系统，实现专业化分工、清晰边界和可扩展架构。

---

## 架构设计

```text
                    用户输入
                        │
                        ▼
              ┌─────────────────┐
              │  Orchestrator   │ ← 流程控制 & 路由
              │     Agent       │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    Goal     │ │  Recruiter  │ │   Resume    │
│  Clarifier  │ │    Judge    │ │Diagnostician│
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │     Resume      │
              │    Rewriter     │
              └─────────────────┘
                       │
                       ▼
                  生成简历

    ┌─────────────────────────────────────┐
    │    Integrity Guard (全程监听)         │
    └─────────────────────────────────────┘
```

---

## 核心实现

### 1. Agent 定义层

创建 `src/types/agents.ts`，定义所有 Agent 的类型和工作流状态：

```text
AgentType:
├── orchestrator (调度中枢)
├── goal_clarifier (目标定位)
├── recruiter_judge (招聘官判断)
├── diagnostician (结构诊断)
├── rewriter (简历重写)
└── integrity_guard (真实性防线)

WorkflowState:
├── currentAgent: AgentType
├── goalConfirmed: boolean
├── resumeProvided: boolean
├── optimizationConfirmed: boolean
└── agentHistory: AgentOutput[]
```

### 2. 后端 Agent 路由器

创建 `supabase/functions/agent-router/index.ts`：

- 接收用户消息 + 当前工作流状态
- Orchestrator 决定下一个 Agent
- 调用对应 Agent 处理
- Integrity Guard 全程监听
- 返回 Agent 响应 + 更新后的状态

### 3. Agent Prompt 库

创建 `supabase/functions/agent-router/prompts.ts`：

包含所有 6 个 Agent 的 System Prompt（按你提供的 JSON 规格）

### 4. 前端状态管理

更新 `src/hooks/useVoiceChat.ts`：

- 维护 `workflowState`（当前阶段、已收集信息等）
- 显示当前 Agent 身份
- 处理阶段切换动画

### 5. UI 增强

更新 `src/components/ChatMessages.tsx`：

- 显示当前 Agent 标识（如小头像或标签）
- 不同 Agent 使用不同样式区分
- 展示工作流进度指示器

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 新建 | `src/types/agents.ts` | Agent 类型定义和工作流状态 |
| 新建 | `supabase/functions/agent-router/index.ts` | Agent 路由和调度逻辑 |
| 修改 | `src/hooks/useVoiceChat.ts` | 增加工作流状态管理 |
| 修改 | `src/components/ChatMessages.tsx` | 显示 Agent 标识和进度 |
| 修改 | `src/pages/Index.tsx` | 增加工作流进度指示器 |
| 修改 | `src/types/resume.ts` | 扩展消息类型支持 Agent 信息 |
| 删除 | `supabase/functions/resume-chat/` | 由 agent-router 替代 |

---

## Agent 调度流程

### 标准路径（无简历）
1. Orchestrator 检测到用户无简历 → 路由到 Goal Clarifier
2. Goal Clarifier 收集目标岗位信息
3. 用户描述经历后 → Resume Diagnostician 分析
4. 用户确认优化方向 → Resume Rewriter 生成

### 优化路径（有简历）
1. 用户上传/粘贴简历 → Orchestrator 检测到
2. Recruiter Judge 进行 10 秒筛选判断
3. Resume Diagnostician 结构诊断
4. 用户确认 → Resume Rewriter 重写

### Integrity Guard 干预
- 全程监听所有 Agent 输出
- 检测到造假/夸大 → 立即拦截
- 引导用户回到真实优化路径

---

## 技术细节

### Agent 路由器核心逻辑

```text
1. 接收请求 { messages, workflowState }
2. 调用 Orchestrator 决定下一步:
   - 无简历 + 目标未明确 → GoalClarifier
   - 无简历 + 目标已明确 → Diagnostician
   - 有简历 → RecruiterJudge → Diagnostician
   - 用户确认优化 → Rewriter
3. 调用目标 Agent 生成回复
4. Integrity Guard 检查输出
5. 返回 { response, agentName, newWorkflowState }
```

### 状态持久化

工作流状态通过前端 `useState` 维护，每次请求都发送给后端。包含：
- `currentPhase`: 当前阶段
- `targetRole`: 目标岗位
- `targetMarket`: 目标市场
- `resumeContent`: 已收集的简历内容
- `diagnosticResults`: 诊断结果
- `userConfirmedDirection`: 用户确认的优化方向

---

## 用户可见性设计

| Agent | 用户可见 | 显示方式 |
|-------|---------|----------|
| Orchestrator | 否 | 后台路由 |
| Goal Clarifier | 是 | 「目标顾问」标签 |
| Recruiter Judge | 是 | 「招聘官视角」标签 |
| Diagnostician | 是 | 「简历诊断师」标签 |
| Rewriter | 是 | 「简历优化师」标签 |
| Integrity Guard | 否 | 仅在干预时显示警告 |

---

## 实现步骤

1. **创建类型定义** - 定义 Agent 类型和工作流状态接口
2. **实现 Agent 路由器** - 后端核心调度逻辑
3. **更新前端 Hook** - 状态管理和 API 调用
4. **增强消息展示** - Agent 标识和进度指示器
5. **删除旧函数** - 移除单一对话函数
6. **端到端测试** - 验证完整流程

