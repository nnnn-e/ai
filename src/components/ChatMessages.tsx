import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types/resume";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  // Filter out JSON blocks for display
  const formatMessage = (content: string) => {
    return content.replace(/```json[\s\S]*?```/g, "").trim();
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
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[85%]",
              message.role === "user" ? "ml-auto" : "mr-auto"
            )}
          >
            <p
              className={cn(
                "text-sm leading-relaxed",
                message.role === "user" 
                  ? "text-right text-muted-foreground" 
                  : "text-left"
              )}
            >
              {formatMessage(message.content)}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
