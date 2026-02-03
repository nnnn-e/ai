

# 切换到 DeepSeek 模型

## 概述
将当前使用的 Lovable AI Gateway（gemini-2.5-flash-lite）替换为您自己的 DeepSeek API，以获得更快的响应速度。

## 实施步骤

### 第1步：添加 DeepSeek API Key
- 在项目密钥中添加 `DEEPSEEK_API_KEY`
- 您需要从 DeepSeek 官网获取 API Key

### 第2步：修改 Edge Function
修改 `supabase/functions/agent-router/index.ts`：

**更改内容：**
1. 将 API 端点从 `https://ai.gateway.lovable.dev/v1/chat/completions` 改为 `https://api.deepseek.com/v1/chat/completions`
2. 将模型名称从 `google/gemini-2.5-flash-lite` 改为 `deepseek-chat`
3. 将 Authorization header 从 `LOVABLE_API_KEY` 改为 `DEEPSEEK_API_KEY`
4. 同样更新 `checkIntegrity` 函数中的 API 调用

**代码更改示例：**
```typescript
// 之前
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-lite",
    ...
  }),
});

// 之后
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
  headers: {
    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    ...
  }),
});
```

---

## 技术细节

### DeepSeek API 信息
- **API 端点**: `https://api.deepseek.com/v1/chat/completions`
- **可用模型**:
  - `deepseek-chat` - 通用对话模型（推荐用于快速响应）
  - `deepseek-reasoner` - 推理增强模型（响应更慢但推理能力更强）
- **API 格式**: 与 OpenAI API 完全兼容，支持流式响应

### 需要修改的位置
1. **主 AI 调用**（第 264-327 行）：替换主对话 API 调用
2. **完整性检查**（第 222-255 行）：替换 `checkIntegrity` 函数中的 API 调用

### 预期效果
- DeepSeek API 通常响应更快，可解决之前的超时问题
- 中文对话质量应该会有所提升

