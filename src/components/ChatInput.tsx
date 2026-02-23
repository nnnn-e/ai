import { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 mb-4 flex items-end gap-2 bg-card rounded-2xl border border-border/50 shadow-sm px-4 py-2.5 transition-shadow focus-within:shadow-md focus-within:border-ring/30"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息…"
        disabled={isLoading}
        rows={1}
        className="flex-1 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 disabled:opacity-50 resize-none min-h-[24px] max-h-[120px] py-0.5"
      />
      <button
        type="submit"
        disabled={!canSend}
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
          canSend
            ? "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:scale-105"
            : "bg-muted text-muted-foreground/40"
        )}
        aria-label="发送"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </form>
  );
}
