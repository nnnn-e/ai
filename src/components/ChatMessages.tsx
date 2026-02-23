import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types/resume";
import { AGENT_DISPLAY_INFO, type AgentType } from "@/types/agents";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  // Filter out JSON blocks and state updates for display
  const formatMessage = (content: string) => {
    return content
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/\[STATE_UPDATE:[^\]]+\]/g, "")
      .trim();
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          点击麦克风开始对话
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-6">
      <div className="space-y-6 py-6">
        {messages.map((message, index) => {
          const agentInfo = message.agent 
            ? AGENT_DISPLAY_INFO[message.agent as AgentType] 
            : null;
          const showAgentLabel = message.role === "assistant" && agentInfo?.visible;
          
          return (
            <div
              key={index}
              className={cn(
                "max-w-[85%]",
                message.role === "user" ? "ml-auto" : "mr-auto"
              )}
            >
              {/* Agent label */}
              {showAgentLabel && (
                <div className="mb-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs font-normal px-2 py-0.5"
                  >
                    {agentInfo.icon} {agentInfo.label}
                  </Badge>
                </div>
              )}
              
              {/* Integrity warning style */}
              {message.isIntegrityWarning && (
                <div className="mb-2">
                  <Badge 
                    variant="destructive" 
                    className="text-xs font-normal px-2 py-0.5"
                  >
                    🛡️ 诚信提醒
                  </Badge>
                </div>
              )}
              
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  message.role === "user" 
                    ? "text-right text-muted-foreground" 
                    : "text-left",
                  message.isIntegrityWarning && "text-destructive"
                )}
              >
                {formatMessage(message.content)}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
