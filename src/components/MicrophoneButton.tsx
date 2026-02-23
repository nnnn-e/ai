import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicrophoneButtonProps {
  isRecording: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStopSpeaking: () => void;
}

export function MicrophoneButton({
  isRecording,
  isSpeaking,
  isLoading,
  onStartRecording,
  onStopRecording,
  onStopSpeaking,
}: MicrophoneButtonProps) {
  const handleClick = () => {
    if (isSpeaking) {
      onStopSpeaking();
    } else if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 transition-spring shadow-md",
          isRecording && "bg-destructive text-destructive-foreground animate-pulse-soft shadow-lg scale-110",
          isSpeaking && "bg-secondary text-foreground shadow-sm",
          !isRecording && !isSpeaking && "bg-primary text-primary-foreground hover:shadow-lg hover:scale-105",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isRecording ? "停止录音并发送" : isSpeaking ? "停止播放" : "开始录音"}
      >
        {isSpeaking ? (
          <Volume2 className="w-6 h-6 animate-pulse-soft" />
        ) : isRecording ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
      <span className="text-caption text-muted-foreground/60">
        {isSpeaking ? "点击停止播放" : isRecording ? "点击发送语音" : "点击开始录音"}
      </span>
    </div>
  );
}
