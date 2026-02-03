import { useState, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import type { ChatMessage, ResumeData } from "@/types/resume";
import type { WorkflowState, AgentType } from "@/types/agents";
import { INITIAL_WORKFLOW_STATE } from "@/types/agents";

const AGENT_ROUTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-router`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const STT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`;

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
      
      if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
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
function determinePhase(state: WorkflowState): WorkflowState["currentPhase"] {
  if (!state.goalConfirmed) return "goal_clarification";
  if (state.resumeProvided && !state.recruiterVerdict) return "recruiter_review";
  if (!state.optimizationConfirmed) return "diagnosis";
  return "rewriting";
}

export function useVoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState>(INITIAL_WORKFLOW_STATE);
  const [currentAgent, setCurrentAgent] = useState<AgentType | null>(null);
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamChatRef = useRef<(message: string) => Promise<void>>();

  // Internal recording function that doesn't depend on streamChat
  const startRecordingInternal = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch(STT_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error("STT request failed");
          }

          const data = await response.json();
          if (data.text && streamChatRef.current) {
            await streamChatRef.current(data.text);
          }
        } catch (error) {
          console.error("STT error:", error);
          toast({
            variant: "destructive",
            title: "语音识别失败",
            description: "请稍后再试",
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        variant: "destructive",
        title: "无法访问麦克风",
        description: "请允许麦克风访问权限",
      });
    }
  }, []);

  const playAudio = useCallback(async (text: string, autoListen: boolean = true) => {
    try {
      setIsSpeaking(true);
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const data = await response.json();
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        // Auto-start listening after AI finishes speaking
        if (autoListen && autoListenEnabled) {
          setTimeout(() => {
            startRecordingInternal();
          }, 500); // Small delay before auto-listening
        }
      };
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  }, [autoListenEnabled, startRecordingInternal]);

  const extractResumeData = useCallback((content: string): ResumeData | null => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const streamChat = useCallback(async (userMessage: string) => {
    const userMsg: ChatMessage = { role: "user", content: userMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantContent = "";
    let detectedAgent: AgentType | null = null;

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

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle agent info event
            if (parsed.type === "agent_info") {
              detectedAgent = parsed.agent;
              setCurrentAgent(parsed.agent);
              if (parsed.workflowState) {
                setWorkflowState(prev => ({
                  ...prev,
                  ...parsed.workflowState,
                  currentPhase: determinePhase({ ...prev, ...parsed.workflowState })
                }));
              }
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
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Parse and apply state updates from the response
      const stateUpdates = parseStateUpdates(assistantContent);
      if (Object.keys(stateUpdates).length > 0) {
        setWorkflowState(prev => {
          const newState = { ...prev, ...stateUpdates };
          newState.currentPhase = determinePhase(newState);
          return newState;
        });
      }

      // Check for resume data in response
      const resume = extractResumeData(assistantContent);
      if (resume) {
        setResumeData(resume);
        setWorkflowState(prev => ({ ...prev, currentPhase: "complete" }));
      }

      // Play audio response (without JSON blocks and state updates)
      const textToSpeak = cleanResponse(assistantContent)
        .replace(/```json[\s\S]*?```/g, "")
        .trim();
      if (textToSpeak) {
        await playAudio(textToSpeak);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "发送失败",
        description: "请稍后再试",
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, playAudio, extractResumeData, workflowState]);

  // Keep streamChatRef updated
  streamChatRef.current = streamChat;

  // Public startRecording just calls the internal one
  const startRecording = startRecordingInternal;

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  const startConversation = useCallback(async () => {
    // Reset state for new conversation
    setWorkflowState({
      ...INITIAL_WORKFLOW_STATE,
      currentPhase: "goal_clarification",
      currentAgent: "goal_clarifier"
    });
    setCurrentAgent("goal_clarifier");
    
    // Start with AI greeting
    const greeting = "你好！我是职途的目标顾问。在开始优化简历之前，让我先了解一下你的职业目标。请问你想要应聘什么职位？";
    setMessages([{ role: "assistant", content: greeting, agent: "goal_clarifier" }]);
    await playAudio(greeting);
  }, [playAudio]);

  return {
    messages,
    isLoading,
    isRecording,
    isSpeaking,
    resumeData,
    workflowState,
    currentAgent,
    startRecording,
    stopRecording,
    stopSpeaking,
    streamChat,
    startConversation,
    setResumeData,
  };
}
