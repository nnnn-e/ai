import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agent System Prompts
const AGENT_PROMPTS = {
  orchestrator: `你是 OrchestratorAgent（调度中枢）。

职责：
- 检测用户模式（引导式构建 vs 简历优化）
- 将用户输入路由到正确的 Agent
- 确保工作流步骤不被跳过
- 在确认前阻止最终简历生成

路由规则：
- 用户未提供简历 → 路由到 GoalClarifierAgent
- 用户提供了简历内容 → 路由到 RecruiterJudgeAgent

约束：
- 永远不生成简历内容
- 永远不向用户暴露内部 Agent 逻辑

输出格式（JSON）：
{
  "next_agent": "goal_clarifier" | "recruiter_judge" | "diagnostician" | "rewriter",
  "reasoning": "路由原因"
}`,

  goal_clarifier: `你是目标顾问，帮助用户明确职业目标。

任务：依次了解用户的目标职位、目标市场（城市/行业）、简历目标（求职/跳槽/转行）。每次只问一个问题，用友好语气。

用户回答后，在回复末尾标注相应信息：
- 目标岗位：[STATE_UPDATE: targetRole="岗位名称"]
- 目标市场：[STATE_UPDATE: targetMarket="市场信息"]
- 简历目标：[STATE_UPDATE: resumeGoal="目标类型"]
- 三个都明确后：[STATE_UPDATE: goalConfirmed=true]

回复要简短，不超过50字。`,

  recruiter_judge: `你是「招聘官视角」，一位资深招聘经理，负责模拟 10 秒简历筛选。

你的任务：
- 从招聘官角度快速扫描简历
- 判断这份简历会被推进还是淘汰
- 给出一句话判断理由

输出要求：
1. 给出明确判断：通过/淘汰
2. 一句话解释原因
3. 不提供优化建议（那是诊断师的工作）
4. 不要为了礼貌而软化判断

示例输出格式：
「判断：通过/淘汰
理由：[一句话解释]」

在回复末尾标注：
[STATE_UPDATE: recruiterVerdict={"decision": "advance" 或 "reject", "reason": "原因"}]`,

  diagnostician: `你是「简历诊断师」，专门进行简历结构和策略问题诊断。

诊断维度：
1. 角色定位清晰度
2. 价值和影响力表达
3. 结果导向的叙事
4. 关键词和 ATS 匹配度
5. 负面或误导性信号

输出要求：
- 每个问题必须包含判断和理由
- 不允许泛泛的建议
- 不重写简历
- 不编造缺失信息

输出格式：
「诊断发现：
1. [维度]：[问题] - [原因]
2. ...

优化方向建议：
- ...」

询问用户是否确认这些优化方向，如果确认，标注：
[STATE_UPDATE: optimizationConfirmed=true]`,

  rewriter: `你是「简历优化师」，专门生成可提交的专业简历。

生成规则：
- 使用简洁、招聘官导向的语言
- 每个要点必须包含：行动、问题、结果
- 内容严格对齐已确认的目标岗位
- 删除低信号或无关经历

前置条件：
- 目标岗位已确认
- 优化方向已被用户确认

输出完整的简历 JSON 格式：
\`\`\`json
{
  "name": "姓名",
  "title": "目标职位",
  "contact": {
    "email": "邮箱",
    "phone": "电话",
    "location": "所在城市"
  },
  "summary": "个人简介（2-3句话，突出核心价值）",
  "experience": [
    {
      "company": "公司名",
      "position": "职位",
      "period": "时间段",
      "highlights": ["成就1（包含行动+问题+结果）", "成就2"]
    }
  ],
  "education": [
    {
      "school": "学校名",
      "degree": "学历/专业",
      "period": "时间段"
    }
  ],
  "skills": ["技能1", "技能2"]
}
\`\`\``,

  integrity_guard: `你是 IntegrityGuardAgent（诚信守护），负责监控伦理和真实性。

监控范围：
- 编造的工作经历
- 虚构的指标数据
- 要求误导性夸大的请求

干预策略：
- 立即中断生成
- 解释为什么该请求有害
- 引导用户回到真实优化路径

输出格式（仅在检测到问题时）：
{
  "violation_detected": true,
  "violation_type": "fabrication" | "invented_metrics" | "misleading_exaggeration",
  "explanation": "解释",
  "redirect_message": "引导消息"
}

如果没有检测到问题：
{
  "violation_detected": false
}`
};

// Determine which agent to route to based on workflow state
function determineNextAgent(workflowState: any, hasResume: boolean): string {
  if (!workflowState.goalConfirmed) {
    return "goal_clarifier";
  }
  
  if (hasResume && !workflowState.recruiterVerdict) {
    return "recruiter_judge";
  }
  
  if (!workflowState.diagnosticResults) {
    return "diagnostician";
  }
  
  if (workflowState.optimizationConfirmed) {
    return "rewriter";
  }
  
  return "diagnostician";
}

// Parse state updates from agent response
function parseStateUpdates(content: string): Record<string, any> {
  const updates: Record<string, any> = {};
  const stateUpdateRegex = /\[STATE_UPDATE:\s*([^\]]+)\]/g;
  let match;
  
  while ((match = stateUpdateRegex.exec(content)) !== null) {
    const updateStr = match[1];
    // Parse key=value pairs
    const keyValueMatch = updateStr.match(/(\w+)=(.+)/);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const rawValue = keyValueMatch[2].trim();
      let value: any = rawValue;
      
      // Try to parse as JSON if it looks like an object
      if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
        try {
          value = JSON.parse(rawValue);
        } catch {
          // Keep as string if parsing fails
        }
      } else if (rawValue === 'true') {
        value = true;
      } else if (rawValue === 'false') {
        value = false;
      } else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        value = rawValue.slice(1, -1);
      }
      
      updates[key] = value;
    }
  }
  
  return updates;
}

// Clean response by removing state update tags
function cleanResponse(content: string): string {
  return content.replace(/\[STATE_UPDATE:[^\]]+\]/g, '').trim();
}

// Check content with integrity guard
async function checkIntegrity(content: string, apiKey: string): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: AGENT_PROMPTS.integrity_guard },
        { role: "user", content: `检查以下内容是否存在诚信问题：\n\n${content}` },
      ],
    }),
  });
  
  if (!response.ok) {
    return { violation_detected: false };
  }
  
  const data = await response.json();
  const responseContent = data.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Ignore parsing errors
  }
  
  return { violation_detected: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, workflowState } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check if user provided resume content
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const hasResume = workflowState?.resumeProvided || 
      (lastUserMessage?.content?.length > 200 && 
       (lastUserMessage?.content?.includes("公司") || 
        lastUserMessage?.content?.includes("经历") ||
        lastUserMessage?.content?.includes("工作")));

    // Determine which agent to use
    const currentAgent = determineNextAgent(workflowState || {}, hasResume);
    const systemPrompt = AGENT_PROMPTS[currentAgent as keyof typeof AGENT_PROMPTS];

    // Build context message for agent
    let contextMessage = "";
    if (workflowState?.targetRole) {
      contextMessage += `目标岗位: ${workflowState.targetRole}\n`;
    }
    if (workflowState?.targetMarket) {
      contextMessage += `目标市场: ${workflowState.targetMarket}\n`;
    }
    if (workflowState?.resumeGoal) {
      contextMessage += `简历目标: ${workflowState.resumeGoal}\n`;
    }
    if (workflowState?.recruiterVerdict) {
      contextMessage += `招聘官判断: ${JSON.stringify(workflowState.recruiterVerdict)}\n`;
    }

    const fullSystemPrompt = contextMessage 
      ? `${systemPrompt}\n\n当前上下文：\n${contextMessage}`
      : systemPrompt;

    console.log("Calling AI gateway with agent:", currentAgent);
    console.log("Message count:", messages.length);

    // Use AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Request timed out after 25 seconds");
      controller.abort();
    }, 25000); // 25 second timeout

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...messages,
          ],
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("AI gateway response status:", response.status);

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "服务额度已用完" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "AI服务暂时不可用" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    // Create a ReadableStream that first sends agent info, then pipes AI response
    const encoder = new TextEncoder();
    
    // Send agent info as first event
    const agentInfoEvent = `data: ${JSON.stringify({
      type: "agent_info",
      agent: currentAgent,
      workflowState: {
        ...workflowState,
        currentAgent: currentAgent,
        resumeProvided: hasResume || workflowState?.resumeProvided,
      }
    })}\n\n`;

    const reader = response.body!.getReader();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send agent info first
        controller.enqueue(encoder.encode(agentInfoEvent));
      },
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      },
      cancel() {
        reader.cancel();
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("AI fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "AI请求超时，请重试" }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Agent router error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
