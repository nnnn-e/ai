import type { ResumeData, FullResumeData, FactReadinessLevel } from "@/types/resume";
import { getFactReadinessLevel, FACT_READINESS_MESSAGES, toResumeData } from "@/types/resume";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumePanelProps {
  resume: ResumeData | null;
  fullResume?: FullResumeData | null;
  factReadiness?: number;
  onExport: () => void;
}

export function ResumePanel({ resume, fullResume, factReadiness = 0, onExport }: ResumePanelProps) {
  const readinessLevel = getFactReadinessLevel(factReadiness);
  const statusMessage = FACT_READINESS_MESSAGES[readinessLevel];
  
  // Get renderable sections from ui_state
  const renderableSections = fullResume?.ui_state?.renderable_sections || [];
  const highlightedSections = fullResume?.ui_state?.highlighted_sections || [];
  const showFallback = fullResume?.ui_state?.show_fallback || false;
  const draftVersion = fullResume?.ui_state?.draft_version || 0;
  
  // Determine what to show based on fact readiness
  const showEmptyState = readinessLevel === "empty" && !resume;
  const showPartialState = readinessLevel === "partial";
  const showReadyState = readinessLevel === "ready";

  // Empty state - no resume data yet
  if (showEmptyState) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <div className="relative">
          <FileText className="w-12 h-12 mb-4 opacity-50" />
          <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-primary animate-pulse" />
        </div>
        <p className="text-center text-sm max-w-[200px]">
          {statusMessage}
        </p>
        <div className="mt-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    );
  }

  // Render resume content
  const displayResume = resume || (fullResume ? toResumeData(fullResume) : null);
  
  if (!displayResume) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-center text-sm">
          对话完成后将在这里生成简历预览
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with status and export button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">简历预览</span>
          {showPartialState && (
            <Badge variant="secondary" className="text-xs">
              草稿 v{draftVersion}
            </Badge>
          )}
          {showReadyState && (
            <Badge variant="default" className="text-xs bg-primary">
              可投递
            </Badge>
          )}
          {showFallback && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
              <AlertCircle className="w-3 h-3 mr-1" />
              基础版
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-2"
          disabled={readinessLevel === "empty"}
        >
          <Download className="w-4 h-4" />
          导出 PDF
        </Button>
      </div>
      
      {/* Status message bar */}
      {(showPartialState || showFallback) && (
        <div className={cn(
          "px-4 py-2 text-xs border-b",
          showFallback 
            ? "bg-destructive/10 text-destructive border-destructive/20" 
            : "bg-primary/5 text-primary border-primary/10"
        )}>
          {fullResume?.ui_state?.status_message || statusMessage}
        </div>
      )}

      {/* Resume Content */}
      <ScrollArea className="flex-1">
        <div id="resume-content" className="p-6">
          {/* Name and Title */}
          <div className={cn(
            "text-center mb-6",
            highlightedSections.includes("basics") && "ring-2 ring-primary/30 rounded-lg p-2"
          )}>
            <h1 className="text-2xl font-light tracking-wide mb-1">
              {displayResume.name || "姓名待填写"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {displayResume.title || "职位待确定"}
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mb-6">
            {displayResume.contact.email && <span>{displayResume.contact.email}</span>}
            {displayResume.contact.phone && <span>{displayResume.contact.phone}</span>}
            {displayResume.contact.location && <span>{displayResume.contact.location}</span>}
          </div>

          {/* Summary */}
          {displayResume.summary && (
            <div className={cn(
              "mb-6",
              highlightedSections.includes("summary") && "ring-2 ring-primary/30 rounded-lg p-2"
            )}>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                个人简介
              </h2>
              <p className="text-sm leading-relaxed">{displayResume.summary}</p>
            </div>
          )}

          {/* Experience */}
          {displayResume.experience.length > 0 && (
            <div className={cn(
              "mb-6",
              highlightedSections.includes("experience") && "ring-2 ring-primary/30 rounded-lg p-2"
            )}>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                工作经历
              </h2>
              <div className="space-y-4">
                {displayResume.experience.map((exp, index) => {
                  const isHighlighted = highlightedSections.some(s => s.startsWith(`experience[${index}]`));
                  
                  return (
                    <div 
                      key={index}
                      className={cn(
                        isHighlighted && "bg-accent rounded-lg p-2 -mx-2"
                      )}
                    >
                      <div className="flex justify-between items-baseline mb-1">
                        <div>
                          <h3 className="text-sm font-medium">{exp.position}</h3>
                          <p className="text-xs text-muted-foreground">{exp.company}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{exp.period}</span>
                      </div>
                      {exp.highlights.length > 0 && (
                        <ul className="text-xs space-y-0.5 mt-1">
                          {exp.highlights.map((highlight, i) => {
                            const bulletHighlighted = highlightedSections.includes(`experience[${index}].bullets[${i}]`);
                            
                            return (
                              <li 
                                key={i} 
                                className={cn(
                                  "leading-relaxed text-muted-foreground",
                                  bulletHighlighted && "text-foreground font-medium bg-primary/10 rounded px-1"
                                )}
                              >
                                · {highlight}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Education */}
          {displayResume.education.length > 0 && (
            <div className={cn(
              "mb-6",
              highlightedSections.includes("education") && "ring-2 ring-primary/30 rounded-lg p-2"
            )}>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                教育背景
              </h2>
              <div className="space-y-2">
                {displayResume.education.map((edu, index) => (
                  <div key={index} className="flex justify-between items-baseline">
                    <div>
                      <h3 className="text-sm font-medium">{edu.school}</h3>
                      <p className="text-xs text-muted-foreground">{edu.degree}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{edu.period}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {displayResume.skills.length > 0 && (
            <div className={cn(
              highlightedSections.includes("skills") && "ring-2 ring-primary/30 rounded-lg p-2"
            )}>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                专业技能
              </h2>
              <p className="text-xs text-muted-foreground">{displayResume.skills.join(" · ")}</p>
            </div>
          )}
          
          {/* Fact Readiness Indicator (only in partial state) */}
          {showPartialState && (
            <div className="mt-8 pt-4 border-t border-dashed">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>完成度</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.round(factReadiness * 100)}%` }}
                  />
                </div>
                <span>{Math.round(factReadiness * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
