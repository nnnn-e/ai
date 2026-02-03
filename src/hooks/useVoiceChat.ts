import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import type { ChatMessage, ResumeData, FullResumeData, ResumeMode } from "@/types/resume";
import { DEFAULT_FULL_RESUME, toResumeData, FACT_READINESS_THRESHOLDS } from "@/types/resume";
import type { WorkflowState, AgentType, WorkflowPhase } from "@/types/agents";
import { INITIAL_WORKFLOW_STATE, getNextPhase, getActiveAgent } from "@/types/agents";

const AGENT_ROUTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-router`;

// Parse state updates from agent response
function parseStateUpdates(content: string): Partial<WorkflowState> {
  const updates: Partial<WorkflowState> = {};
  const stateUpdateRegex = /\[STATE_UPDATE:\s*([^\]]+)\]/g;
  let match;
  
  while ((match = stateUpdateRegex.exec(content)) !== null) {
    const updateStr = match[1];
    const keyValueMatch = updateStr.match(/(\w+)=(.+)/);
    if (keyValueMatch) {
      const key = keyValueMatch[1] as keyof WorkflowState;
      const rawValue = keyValueMatch[2].trim();
      let value: any = rawValue;
      
      // Handle delta updates (e.g., factReadiness=+0.15)
      if (rawValue.startsWith('+')) {
        value = { delta: parseFloat(rawValue) };
      } else if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
        try {
          value = JSON.parse(rawValue);
        } catch {
          // Keep as string
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
      
      (updates as any)[key] = value;
    }
  }
  
  return updates;
}

// Clean response by removing state update tags
function cleanResponse(content: string): string {
  return content.replace(/\[STATE_UPDATE:[^\]]+\]/g, '').trim();
}

// Determine workflow phase based on state
function determinePhase(state: WorkflowState): WorkflowPhase {
  const mode = state.mode || "generate";
  
  if (mode === "generate" || mode === "hybrid") {
    if (!state.goalConfirmed) return "goal_clarification";
    if (state.factReadiness < FACT_READINESS_THRESHOLDS.PARTIAL) return "experience_elicitation";
    if (state.factReadiness < FACT_READINESS_THRESHOLDS.READY) return "resume_drafting";
    return "complete";
  }
  
  // Optimize mode
  if (!state.goalConfirmed) return "goal_clarification";
  if (state.resumeProvided && !state.recruiterVerdict) return "recruiter_review";
  if (!state.optimizationConfirmed) return "diagnosis";
  return "rewriting";
}

// Apply state updates with delta support
function applyStateUpdates(
  prevState: WorkflowState, 
  updates: Partial<WorkflowState>
): WorkflowState {
  const newState = { ...prevState };
  
  for (const [key, value] of Object.entries(updates)) {
    if (value && typeof value === 'object' && 'delta' in value) {
      // Handle delta updates
      const currentValue = (newState as any)[key] || 0;
      (newState as any)[key] = Math.min(1, Math.max(0, currentValue + value.delta));
    } else {
      (newState as any)[key] = value;
    }
  }
  
  newState.currentPhase = determinePhase(newState);
  return newState;
}

export function useVoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [fullResumeData, setFullResumeData] = useState<FullResumeData>(DEFAULT_FULL_RESUME);
  const [workflowState, setWorkflowState] = useState<WorkflowState>(INITIAL_WORKFLOW_STATE);
  const [currentAgent, setCurrentAgent] = useState<AgentType | null>(null);

  // Extract resume data from response (supports both legacy and new schema)
  const extractResumeData = useCallback((content: string): { legacy: ResumeData | null; full: FullResumeData | null } => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        
        // Check if it's the new schema
        if (parsed.schema_version === "1.0") {
          const full = parsed as FullResumeData;
          return { 
            legacy: toResumeData(full), 
            full 
          };
        }
        
        // Legacy schema
        return { 
          legacy: parsed as ResumeData, 
          full: null 
        };
      } catch {
        return { legacy: null, full: null };
      }
    }
    return { legacy: null, full: null };
  }, []);

  const streamChat = useCallback(async (userMessage: string) => {
    const userMsg: ChatMessage = { role: "user", content: userMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantContent = "";
    let detectedAgent: AgentType | null = null;
    let detectedMode: ResumeMode | null = null;

    try {
      const response = await fetch(AGENT_ROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          workflowState 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Chat request failed");
      }
      
      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      console.log("[Chat] Starting to read stream...");

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[Chat] Stream reader done");
          break;
        }
        
        textBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            console.log("[Chat] Received [DONE]");
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle agent info event
            if (parsed.type === "agent_info") {
              detectedAgent = parsed.agent;
              detectedMode = parsed.mode;
              console.log("[Chat] Agent:", parsed.agent, "Mode:", parsed.mode);
              setCurrentAgent(parsed.agent);
              
              if (parsed.workflowState) {
                setWorkflowState(prev => applyStateUpdates(prev, {
                  ...parsed.workflowState,
                  mode: parsed.mode || prev.mode,
                }));
              }
              continue;
            }
            
            // Handle resume update event
            if (parsed.type === "resume_update") {
              console.log("[Chat] Resume update, factReadiness:", parsed.fact_readiness);
              setWorkflowState(prev => applyStateUpdates(prev, {
                factReadiness: parsed.fact_readiness,
              }));
              
              if (parsed.resume_data) {
                setFullResumeData(parsed.resume_data);
                setResumeData(toResumeData(parsed.resume_data));
              }
              continue;
            }
            
            // Handle UI hint event
            if (parsed.type === "ui_hint") {
              console.log("[Chat] UI hint:", parsed.action, parsed.message);
              // Could trigger UI state changes here
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const cleanedContent = cleanResponse(assistantContent);
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 
                      ? { ...m, content: cleanedContent, agent: detectedAgent || undefined } 
                      : m
                  );
                }
                return [...prev, { 
                  role: "assistant", 
                  content: cleanedContent,
                  agent: detectedAgent || undefined
                }];
              });
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
      
      console.log("[Chat] Stream complete, assistantContent length:", assistantContent.length);

      // Parse and apply state updates from the response
      const stateUpdates = parseStateUpdates(assistantContent);
      if (Object.keys(stateUpdates).length > 0) {
        console.log("[Chat] State updates:", stateUpdates);
        setWorkflowState(prev => applyStateUpdates(prev, stateUpdates));
      }

      // Check for resume data in response
      const { legacy, full } = extractResumeData(assistantContent);
      if (full) {
        console.log("[Chat] Found full resume schema");
        setFullResumeData(full);
        setResumeData(legacy);
        setWorkflowState(prev => applyStateUpdates(prev, { 
          factReadiness: full.fact_readiness,
          resumeData: full,
        }));
      } else if (legacy) {
        console.log("[Chat] Found legacy resume schema");
        setResumeData(legacy);
        setWorkflowState(prev => ({ ...prev, currentPhase: "complete" }));
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "发送失败",
        description: error instanceof Error ? error.message : "请稍后再试",
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, extractResumeData, workflowState]);

  const startConversation = useCallback(async (mode: ResumeMode = "generate") => {
    // Reset state for new conversation
    const initialState: WorkflowState = {
      ...INITIAL_WORKFLOW_STATE,
      mode,
      currentPhase: "goal_clarification",
      currentAgent: "goal_clarifier",
    };
    
    setWorkflowState(initialState);
    setCurrentAgent("goal_clarifier");
    setFullResumeData(DEFAULT_FULL_RESUME);
    setResumeData(null);
    
    // Different greeting based on mode
    let greeting: string;
    if (mode === "generate") {
      greeting = "你好！我是职途的目标顾问。\n\n我们先不急着写简历。我会通过几个简单的问题，帮你把经历「捞出来」。\n\n先告诉我，你想要应聘什么类型的职位？";
    } else {
      greeting = "你好！我是职途的目标顾问。在开始优化简历之前，让我先了解一下你的职业目标。请问你想要应聘什么职位？";
    }
    
    setMessages([{ role: "assistant", content: greeting, agent: "goal_clarifier" }]);
  }, []);

  return {
    messages,
    isLoading,
    resumeData,
    fullResumeData,
    workflowState,
    currentAgent,
    streamChat,
    startConversation,
    setResumeData,
  };
}
