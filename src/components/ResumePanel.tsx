import type { ResumeData } from "@/types/resume";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface ResumePanelProps {
  resume: ResumeData | null;
  onExport: () => void;
}

export function ResumePanel({ resume, onExport }: ResumePanelProps) {
  if (!resume) {
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
      {/* Header with export button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">简历预览</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          导出 PDF
        </Button>
      </div>

      {/* Resume Content */}
      <ScrollArea className="flex-1">
        <div id="resume-content" className="p-6">
          {/* Name and Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-light tracking-wide mb-1">
              {resume.name}
            </h1>
            <p className="text-sm text-muted-foreground">{resume.title}</p>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mb-6">
            {resume.contact.email && <span>{resume.contact.email}</span>}
            {resume.contact.phone && <span>{resume.contact.phone}</span>}
            {resume.contact.location && <span>{resume.contact.location}</span>}
          </div>

          {/* Summary */}
          {resume.summary && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                个人简介
              </h2>
              <p className="text-sm leading-relaxed">{resume.summary}</p>
            </div>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                工作经历
              </h2>
              <div className="space-y-4">
                {resume.experience.map((exp, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-1">
                      <div>
                        <h3 className="text-sm font-medium">{exp.position}</h3>
                        <p className="text-xs text-muted-foreground">{exp.company}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{exp.period}</span>
                    </div>
                    {exp.highlights.length > 0 && (
                      <ul className="text-xs space-y-0.5 mt-1">
                        {exp.highlights.map((highlight, i) => (
                          <li key={i} className="leading-relaxed text-muted-foreground">
                            · {highlight}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                教育背景
              </h2>
              <div className="space-y-2">
                {resume.education.map((edu, index) => (
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
          {resume.skills.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                专业技能
              </h2>
              <p className="text-xs text-muted-foreground">{resume.skills.join(" · ")}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
