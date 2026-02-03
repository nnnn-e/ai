// ============================================
// Resume JSON Schema v1.0 - ATS + UI 双兼容
// ============================================

export type ResumeMode = "generate" | "optimize" | "hybrid";
export type TargetMarket = "CN" | "US" | "EU" | "JP" | "global";
export type ResumeLanguage = "zh-CN" | "en-US" | "auto";
export type ConfidenceLevel = "low" | "medium" | "high";
export type FactStatus = "confirmed" | "inferred" | "weak";
export type EmploymentType = "full_time" | "intern" | "contract" | "freelance" | "part_time";
export type FactSource = "user" | "inferred";

// ============================================
// Meta Information
// ============================================
export interface ResumeMeta {
  mode: ResumeMode;
  target_role: string | null;
  target_market: TargetMarket;
  language: ResumeLanguage;
  last_updated: string; // ISO-8601
}

// ============================================
// Basics Section
// ============================================
export interface ResumeLink {
  label: "LinkedIn" | "GitHub" | "Portfolio" | "Website" | string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: ResumeLink[];
}

// ============================================
// Summary Section
// ============================================
export interface ResumeSummary {
  content: string;
  source: FactSource;
  confidence: number; // 0.0 - 1.0
}

// ============================================
// Experience Section
// ============================================
export interface ExperienceBullet {
  action: string;
  result: string;
  metrics: string | null;
  confidence: number; // 0.0 - 1.0
  source: FactSource;
}

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  employment_type: EmploymentType;
  start_date: string; // YYYY-MM
  end_date: string; // YYYY-MM or "present"
  context: string;
  bullets: ExperienceBullet[];
  tech_stack: string[];
  fact_status: FactStatus;
}

// ============================================
// Projects Section
// ============================================
export interface ProjectBullet {
  action: string;
  result: string;
  metrics: string | null;
  confidence: number;
  source: FactSource;
}

export interface ResumeProject {
  id: string;
  name: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
  bullets: ProjectBullet[];
  tech_stack: string[];
  url: string | null;
  fact_status: FactStatus;
}

// ============================================
// Education Section
// ============================================
export interface ResumeEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  gpa: string | null;
  highlights: string[];
}

// ============================================
// Skills Section
// ============================================
export interface ResumeSkills {
  hard: string[];
  soft: string[];
  tools: string[];
  languages: string[];
}

// ============================================
// Additional Info
// ============================================
export interface ResumeAdditional {
  certifications: string[];
  awards: string[];
  publications: string[];
  interests: string[];
}

// ============================================
// UI State (驱动右侧面板渲染)
// ============================================
export interface ResumeUIState {
  renderable_sections: string[];
  locked_sections: string[];
  highlighted_sections: string[];
  draft_version: number;
  status_message: string | null;
  show_fallback: boolean;
}

// ============================================
// Full Resume Schema v1.0
// ============================================
export interface FullResumeData {
  schema_version: "1.0";
  meta: ResumeMeta;
  fact_readiness: number; // 0.0 - 1.0
  confidence_level: ConfidenceLevel;
  basics: ResumeBasics;
  summary: ResumeSummary;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  skills: ResumeSkills;
  additional: ResumeAdditional;
  ui_state: ResumeUIState;
}

// ============================================
// Legacy ResumeData (保持向后兼容)
// ============================================
export interface ResumeData {
  name: string;
  title: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
  };
  summary: string;
  experience: {
    company: string;
    position: string;
    period: string;
    highlights: string[];
  }[];
  education: {
    school: string;
    degree: string;
    period: string;
  }[];
  skills: string[];
}

// ============================================
// Chat Message Types
// ============================================
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  isIntegrityWarning?: boolean;
}

// ============================================
// Fact Readiness Thresholds
// ============================================
export const FACT_READINESS_THRESHOLDS = {
  EMPTY: 0,
  PARTIAL: 0.4,
  READY: 0.7,
} as const;

export type FactReadinessLevel = "empty" | "partial" | "ready";

export function getFactReadinessLevel(factReadiness: number): FactReadinessLevel {
  if (factReadiness >= FACT_READINESS_THRESHOLDS.READY) return "ready";
  if (factReadiness >= FACT_READINESS_THRESHOLDS.PARTIAL) return "partial";
  return "empty";
}

export const FACT_READINESS_MESSAGES: Record<FactReadinessLevel, string> = {
  empty: "我们先聊聊你的经历，简历会慢慢成型",
  partial: "已生成草稿，可随时修改",
  ready: "这是一份可以投递的简历版本",
};

// ============================================
// Default Values
// ============================================
export const DEFAULT_RESUME_META: ResumeMeta = {
  mode: "generate",
  target_role: null,
  target_market: "CN",
  language: "zh-CN",
  last_updated: new Date().toISOString(),
};

export const DEFAULT_RESUME_BASICS: ResumeBasics = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  links: [],
};

export const DEFAULT_RESUME_SUMMARY: ResumeSummary = {
  content: "",
  source: "inferred",
  confidence: 0,
};

export const DEFAULT_RESUME_SKILLS: ResumeSkills = {
  hard: [],
  soft: [],
  tools: [],
  languages: [],
};

export const DEFAULT_RESUME_ADDITIONAL: ResumeAdditional = {
  certifications: [],
  awards: [],
  publications: [],
  interests: [],
};

export const DEFAULT_UI_STATE: ResumeUIState = {
  renderable_sections: [],
  locked_sections: [],
  highlighted_sections: [],
  draft_version: 0,
  status_message: null,
  show_fallback: false,
};

export const DEFAULT_FULL_RESUME: FullResumeData = {
  schema_version: "1.0",
  meta: DEFAULT_RESUME_META,
  fact_readiness: 0,
  confidence_level: "low",
  basics: DEFAULT_RESUME_BASICS,
  summary: DEFAULT_RESUME_SUMMARY,
  experience: [],
  projects: [],
  education: [],
  skills: DEFAULT_RESUME_SKILLS,
  additional: DEFAULT_RESUME_ADDITIONAL,
  ui_state: DEFAULT_UI_STATE,
};

// ============================================
// Conversion Utilities
// ============================================

// Convert FullResumeData to legacy ResumeData for backward compatibility
export function toResumeData(full: FullResumeData): ResumeData {
  return {
    name: full.basics.name,
    title: full.basics.headline || full.meta.target_role || "",
    contact: {
      email: full.basics.email || undefined,
      phone: full.basics.phone || undefined,
      location: full.basics.location || undefined,
    },
    summary: full.summary.content,
    experience: full.experience.map(exp => ({
      company: exp.company,
      position: exp.role,
      period: `${exp.start_date} - ${exp.end_date}`,
      highlights: exp.bullets.map(b => 
        b.metrics ? `${b.action}，${b.result}（${b.metrics}）` : `${b.action}，${b.result}`
      ),
    })),
    education: full.education.map(edu => ({
      school: edu.school,
      degree: `${edu.degree} - ${edu.field}`,
      period: `${edu.start_date} - ${edu.end_date}`,
    })),
    skills: [...full.skills.hard, ...full.skills.tools],
  };
}

// Create a minimal resume for fallback scenarios
export function createMinimalResume(basics: Partial<ResumeBasics>): FullResumeData {
  return {
    ...DEFAULT_FULL_RESUME,
    basics: { ...DEFAULT_RESUME_BASICS, ...basics },
    experience: [{
      id: "exp_fallback",
      company: "",
      role: "General Contributor",
      employment_type: "full_time",
      start_date: "",
      end_date: "present",
      context: "",
      bullets: [{
        action: "Supported daily tasks and execution",
        result: "Contributed to team objectives",
        metrics: null,
        confidence: 0.3,
        source: "inferred",
      }],
      tech_stack: [],
      fact_status: "weak",
    }],
    fact_readiness: 0.1,
    ui_state: {
      ...DEFAULT_UI_STATE,
      renderable_sections: ["basics"],
      status_message: "这是一个基础版本，我们可以继续完善",
      show_fallback: true,
    },
  };
}
