import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agent System Prompts
const AGENT_PROMPTS = {
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
\`\`\``
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, workflowState } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI服务未配置" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    console.log("Calling Lovable AI with agent:", currentAgent);
    console.log("Message count:", messages.length);

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
    });

    console.log("Lovable AI response status:", response.status);

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
      console.error("Lovable AI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI服务暂时不可用" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a transform stream to inject agent info
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

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    
    // Write agent info first
    await writer.write(encoder.encode(agentInfoEvent));
    
    // Pipe the rest of the response
    const reader = response.body!.getReader();
    
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
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
