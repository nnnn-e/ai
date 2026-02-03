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
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "w-20 h-20 flex items-center justify-center transition-all duration-200",
        isRecording && "bg-foreground text-background",
        isSpeaking && "bg-muted",
        !isRecording && !isSpeaking && "bg-foreground text-background hover:opacity-80",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
      aria-label={isRecording ? "停止录音" : isSpeaking ? "停止播放" : "开始录音"}
    >
      {isSpeaking ? (
        <Volume2 className="w-8 h-8 animate-pulse" />
      ) : isRecording ? (
        <MicOff className="w-8 h-8" />
      ) : (
        <Mic className="w-8 h-8" />
      )}
    </button>
  );
}
