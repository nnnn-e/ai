import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `你是「职途」的AI简历顾问，专门帮助用户梳理职业经历并生成专业简历。

你的任务：
1. 通过友好的对话，逐步引导用户描述他们的职业背景
2. 主动询问关键信息：工作经历、教育背景、专业技能、项目成就
3. 帮助用户量化成就（如"提升了X%的效率"）
4. 使用STAR法则（情境、任务、行动、结果）帮助用户描述项目经历

对话风格：
- 友好、专业、鼓励性
- 一次只问1-2个问题，不要让用户感到压力
- 如果用户回答简短，追问细节
- 适时总结已收集的信息

当用户说"生成简历"或类似表达时，输出JSON格式的简历数据：
\`\`\`json
{
  "name": "姓名",
  "title": "求职意向/职位",
  "contact": {
    "email": "邮箱",
    "phone": "电话",
    "location": "所在城市"
  },
  "summary": "个人简介（2-3句话）",
  "experience": [
    {
      "company": "公司名",
      "position": "职位",
      "period": "时间段",
      "highlights": ["成就1", "成就2"]
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
\`\`\`

开场白：先简单介绍自己，然后问用户的名字和想要应聘的职位。`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
