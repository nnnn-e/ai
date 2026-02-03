import { useState } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { ResumePanel } from "@/components/ResumePanel";
import { ResumePreview } from "@/components/ResumePreview";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare } from "lucide-react";
import html2pdf from "html2pdf.js";

const Index = () => {
  const {
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
  } = useVoiceChat();

  const [hasStarted, setHasStarted] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "resume">("chat");
  const isMobile = useIsMobile();

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

  // Mobile: Show either chat or resume based on toggle
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header with progress */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-light tracking-wide">职途</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileView(mobileView === "chat" ? "resume" : "chat")}
              className="gap-2"
            >
              {mobileView === "chat" ? (
                <>
                  <FileText className="w-4 h-4" />
                  查看简历
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  返回对话
                </>
              )}
            </Button>
          </div>
          <WorkflowProgress 
            currentPhase={workflowState.currentPhase} 
            currentAgent={currentAgent}
          />
        </div>

        {mobileView === "chat" ? (
          <>
            {/* Messages */}
            <ChatMessages messages={messages} />

            {/* Loading indicator */}
            {isLoading && (
              <div className="text-center py-2">
                <span className="text-sm text-muted-foreground">
                  思考中...
                </span>
              </div>
            )}

            {/* Text input */}
            <ChatInput onSend={streamChat} isLoading={isLoading} />
          </>
        ) : (
          <div className="flex-1">
            <ResumePanel resume={resumeData} onExport={handleExportPDF} />
          </div>
        )}
      </div>
    );
  }

  // Desktop: Split layout with resizable panels
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-light tracking-wide">职途</h1>
        </div>
        <WorkflowProgress 
          currentPhase={workflowState.currentPhase} 
          currentAgent={currentAgent}
        />
      </div>

      {/* Main content with resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Chat */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            {/* Messages */}
            <ChatMessages messages={messages} />

            {/* Loading indicator */}
            {isLoading && (
              <div className="text-center py-2">
                <span className="text-sm text-muted-foreground">
                  思考中...
                </span>
              </div>
            )}

            {/* Text input */}
            <ChatInput onSend={streamChat} isLoading={isLoading} />
          </div>
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle withHandle />

        {/* Right Panel: Resume Preview */}
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="h-full m-4 rounded-xl bg-card overflow-hidden">
            <ResumePanel resume={resumeData} onExport={handleExportPDF} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
