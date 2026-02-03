import type { ResumeData } from "@/types/resume";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";

interface ResumePreviewProps {
  resume: ResumeData;
  onBack: () => void;
  onExport: () => void;
}

export function ResumePreview({ resume, onBack, onExport }: ResumePreviewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-background z-10 px-6 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回</span>
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 bg-foreground text-background px-4 py-2 hover:opacity-80 transition-opacity"
        >
          <Download className="w-4 h-4" />
          <span>导出 PDF</span>
        </button>
      </div>

      {/* Resume Content */}
      <div className="pt-20 pb-10 px-6">
        <div id="resume-content" className="max-w-2xl mx-auto bg-card p-8">
          {/* Name and Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light tracking-wide mb-2">
              {resume.name}
            </h1>
            <p className="text-muted-foreground">{resume.title}</p>
          </div>

          {/* Contact */}
          <div className="flex justify-center gap-6 text-sm text-muted-foreground mb-8">
            {resume.contact.email && <span>{resume.contact.email}</span>}
            {resume.contact.phone && <span>{resume.contact.phone}</span>}
            {resume.contact.location && <span>{resume.contact.location}</span>}
          </div>

          {/* Summary */}
          {resume.summary && (
            <div className="mb-8">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                个人简介
              </h2>
              <p className="text-sm leading-relaxed">{resume.summary}</p>
            </div>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                工作经历
              </h2>
              <div className="space-y-6">
                {resume.experience.map((exp, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-2">
                      <div>
                        <h3 className="font-medium">{exp.position}</h3>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{exp.period}</span>
                    </div>
                    {exp.highlights.length > 0 && (
                      <ul className="text-sm space-y-1">
                        {exp.highlights.map((highlight, i) => (
                          <li key={i} className="leading-relaxed">
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
            <div className="mb-8">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                教育背景
              </h2>
              <div className="space-y-3">
                {resume.education.map((edu, index) => (
                  <div key={index} className="flex justify-between items-baseline">
                    <div>
                      <h3 className="font-medium">{edu.school}</h3>
                      <p className="text-sm text-muted-foreground">{edu.degree}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{edu.period}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {resume.skills.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                专业技能
              </h2>
              <p className="text-sm">{resume.skills.join(" · ")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
