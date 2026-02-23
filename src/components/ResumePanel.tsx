import type { ResumeData, FullResumeData } from "@/types/resume";
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

  const highlightedSections = fullResume?.ui_state?.highlighted_sections || [];
  const showFallback = fullResume?.ui_state?.show_fallback || false;
  const draftVersion = fullResume?.ui_state?.draft_version || 0;

  const showEmptyState = readinessLevel === "empty" && !resume;
  const showPartialState = readinessLevel === "partial";
  const showReadyState = readinessLevel === "ready";

  // Empty state
  if (showEmptyState) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="relative mb-6 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center">
            <FileText className="w-8 h-8 opacity-30" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary animate-pulse-soft" />
          </div>
        </div>
        <p className="text-callout text-center max-w-[220px] mb-2">
          {statusMessage}
        </p>
        <div className="mt-4 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 animate-pulse-soft" style={{ animationDelay: "0s" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 animate-pulse-soft" style={{ animationDelay: "0.6s" }} />
        </div>
      </div>
    );
  }

  const displayResume = resume || (fullResume ? toResumeData(fullResume) : null);

  if (!displayResume) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 opacity-30" />
        </div>
        <p className="text-callout text-center">
          对话完成后将在这里生成简历预览
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <span className="text-callout">简历预览</span>
          {showPartialState && (
            <Badge variant="secondary" className="text-caption rounded-lg px-2">
              草稿 v{draftVersion}
            </Badge>
          )}
          {showReadyState && (
            <Badge className="text-caption rounded-lg px-2 bg-success text-success-foreground">
              可投递
            </Badge>
          )}
          {showFallback && (
            <Badge variant="outline" className="text-caption rounded-lg text-destructive border-destructive/30">
              <AlertCircle className="w-3 h-3 mr-1" />
              基础版
            </Badge>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          className="gap-1.5 rounded-xl text-xs"
          disabled={readinessLevel === "empty"}
        >
          <Download className="w-3.5 h-3.5" />
          导出 PDF
        </Button>
      </div>

      {/* Status banner */}
      {(showPartialState || showFallback) && (
        <div className={cn(
          "px-5 py-2 text-caption border-b",
          showFallback
            ? "bg-destructive/5 text-destructive border-destructive/10"
            : "bg-primary/[0.03] text-muted-foreground border-border/30"
        )}>
          {fullResume?.ui_state?.status_message || statusMessage}
        </div>
      )}

      {/* Resume body */}
      <ScrollArea className="flex-1">
        <div id="resume-content" className="p-8 max-w-2xl mx-auto">
          {/* Name & Title */}
          <div className={cn(
            "text-center mb-8 pb-6 border-b border-border/30",
            highlightedSections.includes("basics") && "ring-1 ring-primary/20 rounded-xl p-4"
          )}>
            <h1 className="text-headline mb-1.5">
              {displayResume.name || "姓名待填写"}
            </h1>
            <p className="text-callout text-muted-foreground">
              {displayResume.title || "职位待确定"}
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap justify-center gap-4 text-caption text-muted-foreground mb-8">
            {displayResume.contact.email && <span>{displayResume.contact.email}</span>}
            {displayResume.contact.phone && <span>{displayResume.contact.phone}</span>}
            {displayResume.contact.location && <span>{displayResume.contact.location}</span>}
          </div>

          {/* Summary */}
          {displayResume.summary && (
            <section className={cn(
              "mb-8",
              highlightedSections.includes("summary") && "ring-1 ring-primary/20 rounded-xl p-3"
            )}>
              <h2 className="text-subheadline text-muted-foreground mb-3">
                个人简介
              </h2>
              <p className="text-sm leading-relaxed">{displayResume.summary}</p>
            </section>
          )}

          {/* Experience */}
          {displayResume.experience.length > 0 && (
            <section className={cn(
              "mb-8",
              highlightedSections.includes("experience") && "ring-1 ring-primary/20 rounded-xl p-3"
            )}>
              <h2 className="text-subheadline text-muted-foreground mb-4">
                工作经历
              </h2>
              <div className="space-y-5">
                {displayResume.experience.map((exp, index) => {
                  const isHighlighted = highlightedSections.some(s => s.startsWith(`experience[${index}]`));
                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative",
                        isHighlighted && "bg-accent/50 rounded-xl p-3 -mx-3"
                      )}
                    >
                      <div className="flex justify-between items-baseline mb-1.5">
                        <div>
                          <h3 className="text-sm font-semibold">{exp.position}</h3>
                          <p className="text-caption text-muted-foreground">{exp.company}</p>
                        </div>
                        <span className="text-caption text-muted-foreground/70 flex-shrink-0 ml-4">{exp.period}</span>
                      </div>
                      {exp.highlights.length > 0 && (
                        <ul className="space-y-1 mt-2">
                          {exp.highlights.map((highlight, i) => {
                            const bulletHighlighted = highlightedSections.includes(`experience[${index}].bullets[${i}]`);
                            return (
                              <li
                                key={i}
                                className={cn(
                                  "text-caption leading-relaxed text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/30",
                                  bulletHighlighted && "text-foreground font-medium bg-primary/5 rounded-lg px-2 py-0.5 before:bg-primary"
                                )}
                              >
                                {highlight}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Education */}
          {displayResume.education.length > 0 && (
            <section className={cn(
              "mb-8",
              highlightedSections.includes("education") && "ring-1 ring-primary/20 rounded-xl p-3"
            )}>
              <h2 className="text-subheadline text-muted-foreground mb-4">
                教育背景
              </h2>
              <div className="space-y-3">
                {displayResume.education.map((edu, index) => (
                  <div key={index} className="flex justify-between items-baseline">
                    <div>
                      <h3 className="text-sm font-semibold">{edu.school}</h3>
                      <p className="text-caption text-muted-foreground">{edu.degree}</p>
                    </div>
                    <span className="text-caption text-muted-foreground/70 flex-shrink-0 ml-4">{edu.period}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {displayResume.skills.length > 0 && (
            <section className={cn(
              highlightedSections.includes("skills") && "ring-1 ring-primary/20 rounded-xl p-3"
            )}>
              <h2 className="text-subheadline text-muted-foreground mb-3">
                专业技能
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {displayResume.skills.map((skill, i) => (
                  <span key={i} className="text-caption bg-secondary/60 text-secondary-foreground px-2.5 py-1 rounded-lg">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Fact readiness bar */}
          {showPartialState && (
            <div className="mt-10 pt-5 border-t border-dashed border-border/40">
              <div className="flex items-center gap-3 text-caption text-muted-foreground">
                <span className="flex-shrink-0">完成度</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.round(factReadiness * 100)}%` }}
                  />
                </div>
                <span className="flex-shrink-0 font-medium text-foreground">{Math.round(factReadiness * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
