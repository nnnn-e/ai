import { useState } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { ResumePanel } from "@/components/ResumePanel";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Sparkles, Upload, ArrowRight } from "lucide-react";
import html2pdf from "html2pdf.js";
import type { ResumeMode } from "@/types/resume";

const Index = () => {
  const {
    messages,
    isLoading,
    resumeData,
    fullResumeData,
    workflowState,
    currentAgent,
    streamChat,
    startConversation,
    setResumeData,
  } = useVoiceChat();

  const [hasStarted, setHasStarted] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "resume">("chat");
  const isMobile = useIsMobile();

  const handleStart = async (mode: ResumeMode = "generate") => {
    setHasStarted(true);
    await startConversation(mode);
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

  // Landing page — Apple-style hero
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Subtle ambient gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.02] blur-3xl" />
        </div>

        <div className="relative text-center max-w-lg animate-fade-in">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-8 shadow-lg">
            <FileText className="w-7 h-7" />
          </div>

          <h1 className="text-display mb-3">职途</h1>
          <p className="text-body text-muted-foreground mb-12 max-w-sm mx-auto">
            通过 AI 对话，将你的经历转化为专业简历
          </p>

          {/* CTA cards */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <button
              onClick={() => handleStart("generate")}
              className="group relative flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-callout shadow-md hover:shadow-lg transition-all duration-300 transition-spring hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 opacity-80" />
              从零开始写简历
              <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-60 group-hover:ml-0 transition-all duration-300" />
            </button>
            <button
              onClick={() => handleStart("optimize")}
              className="group flex items-center gap-3 border border-border bg-card text-foreground px-8 py-4 rounded-2xl text-callout shadow-sm hover:shadow-md transition-all duration-300 transition-spring hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 opacity-60" />
              优化现有简历
              <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-40 group-hover:ml-0 transition-all duration-300" />
            </button>
          </div>

          <p className="text-footnote text-muted-foreground/60">
            支持从零生成 · 智能优化 · ATS 友好
          </p>
        </div>
      </div>
    );
  }

  // Mobile: Show either chat or resume based on toggle
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 glass-light border-b border-border/50 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h1 className="text-title">职途</h1>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMobileView(mobileView === "chat" ? "resume" : "chat")}
              className="gap-1.5 rounded-xl text-xs"
            >
              {mobileView === "chat" ? (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  简历
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" />
                  对话
                </>
              )}
            </Button>
          </div>
          <WorkflowProgress
            currentPhase={workflowState.currentPhase}
            currentAgent={currentAgent}
            mode={workflowState.mode}
          />
        </header>

        {mobileView === "chat" ? (
          <>
            <ChatMessages messages={messages} />
            {isLoading && (
              <div className="text-center py-3">
                <span className="text-footnote text-muted-foreground animate-pulse-soft">
                  正在思考…
                </span>
              </div>
            )}
            <ChatInput onSend={streamChat} isLoading={isLoading} />
          </>
        ) : (
          <div className="flex-1">
            <ResumePanel
              resume={resumeData}
              fullResume={fullResumeData}
              factReadiness={workflowState.factReadiness}
              onExport={handleExportPDF}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop: Split layout
  return (
    <div className="h-screen bg-background flex">
      {/* Left: Chat panel */}
      <div className="w-[32%] min-w-[360px] flex flex-col border-r border-border/40">
        {/* Header */}
        <header className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-title">职途</h1>
          </div>
          <WorkflowProgress
            currentPhase={workflowState.currentPhase}
            currentAgent={currentAgent}
            mode={workflowState.mode}
          />
        </header>

        {/* Messages */}
        <ChatMessages messages={messages} />

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-3">
            <span className="text-footnote text-muted-foreground animate-pulse-soft">
              正在思考…
            </span>
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={streamChat} isLoading={isLoading} />
      </div>

      {/* Right: Resume Preview */}
      <div className="flex-1 p-4">
        <div className="h-full rounded-2xl bg-card shadow-sm overflow-hidden border border-border/30">
          <ResumePanel
            resume={resumeData}
            fullResume={fullResumeData}
            factReadiness={workflowState.factReadiness}
            onExport={handleExportPDF}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
