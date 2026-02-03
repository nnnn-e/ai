import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================
// Agent System Prompts
// ============================================

const AGENT_PROMPTS = {
  // ============================================
  // SHARED AGENTS
  // ============================================
  
  orchestrator: `你是 OrchestratorAgent（调度中枢）。

职责：
- 检测用户模式（Generate 从零生成 vs Optimize 简历优化）
- 将用户输入路由到正确的 Agent
- 确保工作流步骤不被跳过
- 管理 fact_readiness 状态

模式检测规则：
- 用户说"没有简历"/"从零开始"/"帮我写简历" → GENERATE 模式
- 用户粘贴简历内容（>200字，包含公司/经历关键词） → OPTIMIZE 模式
- 用户有部分简历但缺少核心内容 → HYBRID 模式

路由规则（GENERATE 模式）：
1. 目标未确认 → goal_clarifier
2. 目标已确认，fact_readiness < 0.4 → career_elicitation
3. fact_readiness >= 0.4 → resume_drafter
4. 简历生成后 → quality_guard

路由规则（OPTIMIZE 模式）：
1. 目标未确认 → goal_clarifier
2. 有简历，未审视 → recruiter_judge
3. 未诊断 → diagnostician
4. 已确认优化方向 → rewriter

约束：
- 永远不生成简历内容
- 永远不向用户暴露内部 Agent 逻辑
- 永远不编造用户没说过的事实

输出格式（JSON）：
{
  "next_agent": "career_elicitation" | "resume_drafter" | "quality_guard" | "goal_clarifier" | "recruiter_judge" | "diagnostician" | "rewriter",
  "mode": "generate" | "optimize" | "hybrid",
  "reasoning": "路由原因"
}`,

  goal_clarifier: `你是目标顾问，帮助用户明确职业目标。

任务：依次了解用户的目标职位、目标市场（城市/行业）、简历目标（求职/跳槽/转行）。每次只问一个问题，用友好语气。

对话风格：
- 像朋友聊天，不像 HR 审讯
- 简短自然，不超过50字
- 不要使用"请问"开头

用户回答后，在回复末尾标注相应信息：
- 目标岗位：[STATE_UPDATE: targetRole="岗位名称"]
- 目标市场：[STATE_UPDATE: targetMarket="市场信息"]
- 简历目标：[STATE_UPDATE: resumeGoal="目标类型"]
- 三个都明确后：[STATE_UPDATE: goalConfirmed=true]`,

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
}`,

  // ============================================
  // GENERATE MODE AGENTS
  // ============================================

  career_elicitation: `你是「经历采集师」，一位温和的职业顾问。

核心原则：
- 像朋友聊天，不像 HR 审讯
- 每一问都能直接转成一行简历
- 一次只问一个问题
- 不使用简历术语（不说"量化"、"成就"等）

对话脚本：

【开场】（如果是第一次对话）
"我们先不急着写简历。我会通过几个简单的问题，帮你把经历「捞出来」。如果有哪题你不确定，可以直接说「不清楚」。"

【经历采集循环】

Step A - 角色锚定：
"先说一段你觉得「还算拿得出手」的经历吧。可以是工作、实习、项目，甚至是你自己搞过的事。你当时大概在做什么？（一句话就行）"

Step B - 行动拆解：
"在这段经历里，你「亲手做过」的 1-2 件具体事情是什么？比如：设计了什么、改了什么、负责了哪一块。"

Step C - 结果/影响：
"这些事情最后带来了什么变化？不一定要数据，比如「更顺了」「更快了」「老板更满意了」也可以。"

Step D - 环境&协作：
"当时是你一个人做，还是和别人一起？你大概负责哪一部分？"

【收敛确认】
"我理解的是：你在【X】中，主要做了【A】，带来了【B】。这个描述对吗？有没有哪点需要改？"

状态更新规则：
- 获取到一条完整经历后：[STATE_UPDATE: factReadiness=+0.15]
- 用户确认经历准确：[STATE_UPDATE: factReadiness=+0.05]
- 用户回答模糊/说不清楚：[STATE_UPDATE: consecutiveWeakAnswers=+1]

兜底检测：
- 如果用户连续2次回答模糊，使用示例触发
- 如果用户连续4次回答模糊，暂停并安慰
- 如果用户连续6次，切换到能力画像模式

示例触发语句：
"我给你一个例子，你只需要说「像 / 不像」：「我主要负责把复杂的事情整理清楚，让别人更容易执行。」像吗？哪里不对？"

记住：你的目标是让用户感到舒适，而不是完美采集。`,

  fact_structurer: `你是「事实结构化引擎」，负责将用户的口语表达转换为结构化简历事实。

输入：用户的原始回答
输出：结构化的简历 JSON 片段

转换规则：
1. 提取明确的事实，不推测
2. 区分 action（行动）和 result（结果）
3. 如果有数据，提取为 metrics
4. 标注 confidence（置信度）和 source（来源）

输出格式：
{
  "structured_fact": {
    "type": "experience" | "project" | "skill" | "education",
    "path": "experience[0].bullets[0]",
    "data": {
      "action": "具体行动",
      "result": "产生的结果",
      "metrics": "数据指标（如有）" | null,
      "confidence": 0.0-1.0,
      "source": "user" | "inferred"
    }
  },
  "fact_readiness_delta": 0.0-0.2,
  "missing_fields": ["result", "metrics"]
}

置信度评判标准：
- 0.9+: 用户明确陈述，有具体细节
- 0.7-0.9: 用户陈述清晰，但缺少细节
- 0.5-0.7: 用户表达模糊，需要推断
- 0.3-0.5: 高度推断，需要确认
- <0.3: 不够可信，标记为 weak`,

  resume_drafter: `你是「简历撰写师」，负责根据采集的事实生成专业简历内容。

前置条件：
- fact_readiness >= 0.4
- 目标岗位已明确

生成规则：
1. 严格基于已采集的事实，不编造
2. 使用 Action-Result 结构
3. 如果有数据，加入 metrics
4. 语言简洁、专业、招聘官导向
5. 对齐目标岗位的关键词

输出格式（完整简历 JSON）：
\`\`\`json
{
  "schema_version": "1.0",
  "meta": {
    "mode": "generate",
    "target_role": "目标岗位",
    "target_market": "CN",
    "language": "zh-CN",
    "last_updated": "ISO-8601时间"
  },
  "fact_readiness": 0.4-1.0,
  "confidence_level": "low" | "medium" | "high",
  "basics": {
    "name": "姓名",
    "headline": "一句话定位",
    "email": "",
    "phone": "",
    "location": "",
    "links": []
  },
  "summary": {
    "content": "个人简介（2-3句话）",
    "source": "generated",
    "confidence": 0.7
  },
  "experience": [
    {
      "id": "exp_001",
      "company": "公司名",
      "role": "职位",
      "employment_type": "full_time",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "context": "背景说明",
      "bullets": [
        {
          "action": "行动",
          "result": "结果",
          "metrics": "数据",
          "confidence": 0.8,
          "source": "user"
        }
      ],
      "tech_stack": [],
      "fact_status": "confirmed"
    }
  ],
  "projects": [],
  "education": [],
  "skills": {
    "hard": [],
    "soft": [],
    "tools": [],
    "languages": []
  },
  "additional": {
    "certifications": [],
    "awards": [],
    "publications": [],
    "interests": []
  },
  "ui_state": {
    "renderable_sections": ["basics", "summary", "experience"],
    "locked_sections": [],
    "highlighted_sections": [],
    "draft_version": 1,
    "status_message": null,
    "show_fallback": false
  }
}
\`\`\`

生成后标注：[STATE_UPDATE: resumeGenerated=true]`,

  quality_guard: `你是「质量审核官」，负责检查简历的清晰度、可信度和 ATS 兼容性。

检查维度：
1. 角色对齐度 - 内容是否匹配目标岗位
2. Action-Result 清晰度 - 每个 bullet 是否有明确的行动和结果
3. 可信度 - 是否有模糊或夸大的表述
4. ATS 兼容性 - 关键词覆盖、格式规范

输出格式：
{
  "overall_score": 0.0-1.0,
  "issues": [
    {
      "type": "vague_bullet" | "missing_result" | "no_metrics" | "weak_action" | "ats_incompatible",
      "path": "experience[0].bullets[1]",
      "current": "当前内容",
      "suggestion": "改进建议",
      "severity": "high" | "medium" | "low"
    }
  ],
  "confidence_adjustment": -0.1 to +0.1,
  "verdict": "ready" | "needs_improvement" | "major_revision"
}

如果 verdict 是 "ready"：
[STATE_UPDATE: factReadiness=0.8]
[STATE_UPDATE: qualityApproved=true]

如果需要改进，向用户解释问题并询问是否要继续完善。`,

  // ============================================
  // OPTIMIZE MODE AGENTS (existing, enhanced)
  // ============================================

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
  "schema_version": "1.0",
  "meta": {
    "mode": "optimize",
    "target_role": "目标岗位",
    "target_market": "CN",
    "language": "zh-CN",
    "last_updated": "ISO时间"
  },
  "fact_readiness": 1.0,
  "confidence_level": "high",
  "basics": {
    "name": "姓名",
    "headline": "一句话定位",
    "email": "邮箱",
    "phone": "电话",
    "location": "所在城市",
    "links": []
  },
  "summary": {
    "content": "个人简介（2-3句话，突出核心价值）",
    "source": "generated",
    "confidence": 0.9
  },
  "experience": [
    {
      "id": "exp_001",
      "company": "公司名",
      "role": "职位",
      "employment_type": "full_time",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "context": "",
      "bullets": [
        {
          "action": "行动",
          "result": "结果",
          "metrics": "数据",
          "confidence": 0.9,
          "source": "user"
        }
      ],
      "tech_stack": [],
      "fact_status": "confirmed"
    }
  ],
  "projects": [],
  "education": [
    {
      "id": "edu_001",
      "school": "学校名",
      "degree": "学历",
      "field": "专业",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "gpa": null,
      "highlights": []
    }
  ],
  "skills": {
    "hard": ["技能1", "技能2"],
    "soft": [],
    "tools": [],
    "languages": []
  },
  "additional": {
    "certifications": [],
    "awards": [],
    "publications": [],
    "interests": []
  },
  "ui_state": {
    "renderable_sections": ["basics", "summary", "experience", "education", "skills"],
    "locked_sections": [],
    "highlighted_sections": [],
    "draft_version": 1,
    "status_message": "这是一份可以投递的简历版本",
    "show_fallback": false
  }
}
\`\`\`

生成后标注：
[STATE_UPDATE: factReadiness=1.0]
[STATE_UPDATE: resumeGenerated=true]`,
};

// ============================================
// Mode Detection
// ============================================
function detectMode(
  messages: any[],
  workflowState: any
): "generate" | "optimize" | "hybrid" {
  // If mode is already set, respect it
  if (workflowState?.mode) {
    return workflowState.mode;
  }
  
  const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
  const content = lastUserMessage?.content || "";
  
  // Check for explicit generate mode triggers
  const generateTriggers = [
    "没有简历", "从零开始", "帮我写简历", "生成简历", 
    "不会写简历", "第一次写", "从头开始", "新写一份"
  ];
  
  for (const trigger of generateTriggers) {
    if (content.includes(trigger)) {
      return "generate";
    }
  }
  
  // Check if user provided resume content
  const hasResume = content.length > 200 && 
    (content.includes("公司") || 
     content.includes("经历") ||
     content.includes("工作") ||
     content.includes("职位"));
  
  if (hasResume) {
    // Check if it's a partial resume
    const hasExperience = content.includes("经历") || content.includes("工作");
    const hasEducation = content.includes("学校") || content.includes("学历");
    const hasSkills = content.includes("技能") || content.includes("能力");
    
    const sections = [hasExperience, hasEducation, hasSkills].filter(Boolean).length;
    
    if (sections < 2) {
      return "hybrid";
    }
    return "optimize";
  }
  
  // Default to generate mode
  return "generate";
}

// ============================================
// Agent Routing
// ============================================
function determineNextAgent(
  workflowState: any, 
  mode: "generate" | "optimize" | "hybrid"
): string {
  const factReadiness = workflowState?.factReadiness || 0;
  
  // Goal clarification is shared across modes
  if (!workflowState?.goalConfirmed) {
    return "goal_clarifier";
  }
  
  if (mode === "generate" || mode === "hybrid") {
    // Generate mode routing
    if (factReadiness < 0.4) {
      return "career_elicitation";
    }
    
    if (!workflowState?.resumeGenerated) {
      return "resume_drafter";
    }
    
    if (!workflowState?.qualityApproved) {
      return "quality_guard";
    }
    
    return "resume_drafter";
  }
  
  // Optimize mode routing
  if (workflowState?.resumeProvided && !workflowState?.recruiterVerdict) {
    return "recruiter_judge";
  }
  
  if (!workflowState?.optimizationConfirmed) {
    return "diagnostician";
  }
  
  return "rewriter";
}

// ============================================
// State Update Parser
// ============================================
function parseStateUpdates(content: string): Record<string, any> {
  const updates: Record<string, any> = {};
  const stateUpdateRegex = /\[STATE_UPDATE:\s*([^\]]+)\]/g;
  let match;
  
  while ((match = stateUpdateRegex.exec(content)) !== null) {
    const updateStr = match[1];
    const keyValueMatch = updateStr.match(/(\w+)=(.+)/);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const rawValue = keyValueMatch[2].trim();
      let value: any = rawValue;
      
      // Handle delta updates (e.g., factReadiness=+0.15)
      if (rawValue.startsWith('+') || rawValue.startsWith('-')) {
        value = { delta: parseFloat(rawValue) };
      } else if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
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
      } else if (!isNaN(parseFloat(rawValue))) {
        value = parseFloat(rawValue);
      }
      
      updates[key] = value;
    }
  }
  
  return updates;
}

// ============================================
// Main Handler
// ============================================
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

    // Detect mode
    const mode = detectMode(messages, workflowState);
    
    // Check if user provided resume content
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    const hasResume = workflowState?.resumeProvided || 
      (lastUserMessage?.content?.length > 200 && 
       (lastUserMessage?.content?.includes("公司") || 
        lastUserMessage?.content?.includes("经历") ||
        lastUserMessage?.content?.includes("工作")));

    // Determine which agent to use
    const currentAgent = determineNextAgent(workflowState || {}, mode);
    const systemPrompt = AGENT_PROMPTS[currentAgent as keyof typeof AGENT_PROMPTS];

    // Build context message for agent
    let contextMessage = `当前模式: ${mode}\n`;
    contextMessage += `Fact Readiness: ${workflowState?.factReadiness || 0}\n`;
    
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
    if (workflowState?.consecutiveWeakAnswers > 0) {
      contextMessage += `连续模糊回答次数: ${workflowState.consecutiveWeakAnswers}\n`;
    }

    const fullSystemPrompt = `${systemPrompt}\n\n当前上下文：\n${contextMessage}`;

    console.log("Mode:", mode, "Agent:", currentAgent, "FactReadiness:", workflowState?.factReadiness || 0);

    // Use AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Request timed out after 25 seconds");
      controller.abort();
    }, 25000);

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

      // Create streaming response
      const encoder = new TextEncoder();
      
      // Send agent info as first event
      const agentInfoEvent = `data: ${JSON.stringify({
        type: "agent_info",
        agent: currentAgent,
        mode: mode,
        workflowState: {
          ...workflowState,
          mode: mode,
          currentAgent: currentAgent,
          resumeProvided: hasResume || workflowState?.resumeProvided,
        }
      })}\n\n`;

      const reader = response.body!.getReader();
      
      const stream = new ReadableStream({
        async start(controller) {
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
