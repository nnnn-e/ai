import { useState, useEffect } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { ChatMessages } from "@/components/ChatMessages";
import { ResumePreview } from "@/components/ResumePreview";
import { toast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

const Index = () => {
  const {
    messages,
    isLoading,
    isRecording,
    isSpeaking,
    resumeData,
    startRecording,
    stopRecording,
    stopSpeaking,
    startConversation,
    setResumeData,
  } = useVoiceChat();

  const [showResume, setShowResume] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (resumeData) {
      setShowResume(true);
    }
  }, [resumeData]);

  const handleStart = async () => {
    setHasStarted(true);
    await startConversation();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("resume-content");
    if (!element) return;

    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `${resumeData?.name || "简历"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();

      toast({
        title: "导出成功",
        description: "简历已保存为 PDF",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        variant: "destructive",
        title: "导出失败",
        description: "请稍后再试",
      });
    }
  };

  // Show resume preview
  if (showResume && resumeData) {
    return (
      <ResumePreview
        resume={resumeData}
        onBack={() => setShowResume(false)}
        onExport={handleExportPDF}
      />
    );
  }

  // Landing page
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-light tracking-wide mb-4">职途</h1>
          <p className="text-muted-foreground mb-12">
            AI简历优化大师
          </p>
          <button
            onClick={handleStart}
            className="bg-foreground text-background px-8 py-3 text-sm tracking-wide hover:opacity-80 transition-opacity"
          >
            开始对话
          </button>
          <p className="text-xs text-muted-foreground mt-8">
            通过语音对话，让AI帮你梳理职业经历
          </p>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-light tracking-wide">职途</h1>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} />

      {/* Recording indicator */}
      {isRecording && (
        <div className="text-center py-2">
          <span className="text-sm text-muted-foreground animate-pulse">
            正在聆听...
          </span>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !isRecording && (
        <div className="text-center py-2">
          <span className="text-sm text-muted-foreground">
            思考中...
          </span>
        </div>
      )}

      {/* Microphone button */}
      <div className="py-8 flex justify-center">
        <MicrophoneButton
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          isLoading={isLoading}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onStopSpeaking={stopSpeaking}
        />
      </div>

      {/* Help text */}
      <div className="text-center pb-6">
        <p className="text-xs text-muted-foreground">
          {isSpeaking
            ? "点击停止播放"
            : isRecording
            ? "点击停止录音"
            : "点击麦克风开始说话"}
        </p>
      </div>
    </div>
  );
};

export default Index;
