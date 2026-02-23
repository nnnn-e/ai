import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types/resume";
import { AGENT_DISPLAY_INFO, type AgentType } from "@/types/agents";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const formatMessage = (content: string) => {
    return content
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/\[STATE_UPDATE:[^\]]+\]/g, "")
      .trim();
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <p className="text-callout text-muted-foreground/60 text-center">
          开始对话，让 AI 帮你打造简历
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-5">
      <div className="space-y-5 py-5">
        {messages.map((message, index) => {
          const agentInfo = message.agent
            ? AGENT_DISPLAY_INFO[message.agent as AgentType]
            : null;
          const showAgentLabel = message.role === "assistant" && agentInfo?.visible;
          const displayContent = formatMessage(message.content);
          if (!displayContent) return null;

          return (
            <div
              key={index}
              className={cn(
                "max-w-[88%] animate-fade-in",
                message.role === "user" ? "ml-auto" : "mr-auto"
              )}
            >
              {/* Agent label */}
              {showAgentLabel && (
                <div className="mb-1.5">
                  <span className="text-caption text-muted-foreground/70 font-medium">
                    {agentInfo.icon} {agentInfo.label}
                  </span>
                </div>
              )}

              {/* Integrity warning */}
              {message.isIntegrityWarning && (
                <div className="mb-1.5">
                  <Badge
                    variant="destructive"
                    className="text-caption font-normal px-2 py-0.5 rounded-lg"
                  >
                    🛡️ 诚信提醒
                  </Badge>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary/60 text-foreground rounded-bl-md",
                  message.isIntegrityWarning && "bg-destructive/10 border border-destructive/20"
                )}
              >
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    message.isIntegrityWarning && "text-destructive"
                  )}
                >
                  {displayContent}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
