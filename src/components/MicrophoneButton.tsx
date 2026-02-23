import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
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
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "w-20 h-20 flex items-center justify-center transition-all duration-200",
          isRecording && "bg-destructive text-destructive-foreground animate-pulse",
          isSpeaking && "bg-muted",
          !isRecording && !isSpeaking && "bg-foreground text-background hover:opacity-80",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isRecording ? "停止录音并发送" : isSpeaking ? "停止播放" : "开始录音"}
      >
        {isSpeaking ? (
          <Volume2 className="w-8 h-8 animate-pulse" />
        ) : isRecording ? (
          <MicOff className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>
      <span className="text-xs text-muted-foreground">
        {isSpeaking ? "点击停止播放" : isRecording ? "点击发送语音" : "点击麦克风开始说话"}
      </span>
    </div>
  );
}
