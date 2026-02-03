// ============================================
// Agent Types and Workflow State for Multi-Agent Resume System
// ============================================

import type { FullResumeData, ResumeMode, ConfidenceLevel } from "./resume";

// ============================================
// Agent Types
// ============================================

// Optimize Mode Agents (existing)
export type OptimizeAgentType =
  | "orchestrator"
  | "goal_clarifier"
  | "recruiter_judge"
  | "diagnostician"
  | "rewriter"
  | "integrity_guard";

// Generate Mode Agents (new)
export type GenerateAgentType =
  | "orchestrator"
  | "career_elicitation"
  | "fact_structurer"
  | "resume_drafter"
  | "quality_guard"
  | "integrity_guard";

// All Agent Types
export type AgentType = OptimizeAgentType | GenerateAgentType;

// ============================================
// Workflow Phases
// ============================================

// Optimize Mode Phases (existing)
export type OptimizeWorkflowPhase =
  | "idle"
  | "goal_clarification"
  | "recruiter_review"
  | "diagnosis"
  | "confirmation"
  | "rewriting"
  | "complete";

// Generate Mode Phases (new)
export type GenerateWorkflowPhase =
  | "idle"
  | "mode_selection"
  | "goal_clarification"
  | "experience_elicitation"
  | "fact_structuring"
  | "resume_drafting"
  | "quality_review"
  | "complete";

// All Workflow Phases
export type WorkflowPhase = OptimizeWorkflowPhase | GenerateWorkflowPhase;

// ============================================
// Structured Facts (Generate Mode)
// ============================================
export interface StructuredFact {
  type: "experience.action" | "experience.result" | "experience.context" | "skill" | "education" | "project";
  path: string; // e.g., "experience[0].bullets[0]"
  value: any;
  confidence: number;
  source: "user" | "inferred";
}

export interface ElicitationContext {
  known_facts: StructuredFact[];
  missing_fields: string[];
  current_experience_index: number;
  consecutive_weak_answers: number;
  fallback_triggered: boolean;
}

// ============================================
// Diagnostic Results
// ============================================
export interface DiagnosticResult {
  dimension: string;
  issue: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

export interface RecruiterVerdict {
  decision: "advance" | "reject";
  reason: string;
}

// ============================================
// Quality Check Results (Generate Mode)
// ============================================
export interface QualityIssue {
  type: "vague_bullet" | "missing_result" | "no_metrics" | "weak_action" | "ats_incompatible";
  path: string;
  suggestion: string;
  severity: "high" | "medium" | "low";
}

// ============================================
// Main Workflow State
// ============================================
export interface WorkflowState {
  // Mode & Phase
  mode: ResumeMode;
  currentPhase: WorkflowPhase;
  currentAgent: AgentType | null;
  
  // Goal Clarification (shared)
  goalConfirmed: boolean;
  targetRole: string | null;
  targetMarket: string | null;
  resumeGoal: string | null;
  
  // Optimize Mode State
  resumeProvided: boolean;
  optimizationConfirmed: boolean;
  resumeContent: string | null;
  diagnosticResults: DiagnosticResult[] | null;
  recruiterVerdict: RecruiterVerdict | null;
  
  // Generate Mode State
  factReadiness: number; // 0.0 - 1.0
  elicitationContext: ElicitationContext | null;
  qualityIssues: QualityIssue[] | null;
  
  // Resume Data
  resumeData: FullResumeData | null;
}

// ============================================
// Agent Output Contract
// ============================================
export interface AgentOutput {
  agent: AgentType;
  content: string;
  timestamp: number;
  stateUpdate?: Partial<WorkflowState>;
  resumeUpdate?: Partial<FullResumeData>;
  uiHint?: {
    action: "render" | "hold" | "pause" | "fallback";
    message?: string;
  };
}

// ============================================
// Agent Display Info (UI)
// ============================================
export const AGENT_DISPLAY_INFO: Record<
  AgentType,
  { label: string; visible: boolean; icon: string }
> = {
  // Shared
  orchestrator: { label: "系统", visible: false, icon: "🎯" },
  integrity_guard: { label: "诚信守护", visible: false, icon: "🛡️" },
  
  // Optimize Mode
  goal_clarifier: { label: "目标顾问", visible: true, icon: "🎯" },
  recruiter_judge: { label: "招聘官视角", visible: true, icon: "👔" },
  diagnostician: { label: "简历诊断师", visible: true, icon: "🔍" },
  rewriter: { label: "简历优化师", visible: true, icon: "✍️" },
  
  // Generate Mode
  career_elicitation: { label: "经历采集师", visible: true, icon: "💬" },
  fact_structurer: { label: "事实结构化", visible: false, icon: "📊" },
  resume_drafter: { label: "简历撰写师", visible: true, icon: "📝" },
  quality_guard: { label: "质量审核", visible: true, icon: "✅" },
};

// ============================================
// Workflow Phase Display Info (UI)
// ============================================
export const PHASE_DISPLAY_INFO: Record<
  WorkflowPhase,
  { label: string; progress: number }
> = {
  // Shared
  idle: { label: "准备开始", progress: 0 },
  goal_clarification: { label: "明确目标", progress: 15 },
  complete: { label: "完成", progress: 100 },
  
  // Optimize Mode
  recruiter_review: { label: "招聘官审视", progress: 30 },
  diagnosis: { label: "简历诊断", progress: 50 },
  confirmation: { label: "确认方向", progress: 70 },
  rewriting: { label: "优化生成", progress: 85 },
  
  // Generate Mode
  mode_selection: { label: "选择模式", progress: 5 },
  experience_elicitation: { label: "经历采集", progress: 35 },
  fact_structuring: { label: "信息整理", progress: 55 },
  resume_drafting: { label: "简历生成", progress: 75 },
  quality_review: { label: "质量审核", progress: 90 },
};

// ============================================
// Initial States
// ============================================
export const INITIAL_ELICITATION_CONTEXT: ElicitationContext = {
  known_facts: [],
  missing_fields: ["experience", "education", "skills"],
  current_experience_index: 0,
  consecutive_weak_answers: 0,
  fallback_triggered: false,
};

export const INITIAL_WORKFLOW_STATE: WorkflowState = {
  // Mode & Phase
  mode: "generate", // Default to generate mode
  currentPhase: "idle",
  currentAgent: null,
  
  // Goal Clarification
  goalConfirmed: false,
  targetRole: null,
  targetMarket: null,
  resumeGoal: null,
  
  // Optimize Mode
  resumeProvided: false,
  optimizationConfirmed: false,
  resumeContent: null,
  diagnosticResults: null,
  recruiterVerdict: null,
  
  // Generate Mode
  factReadiness: 0,
  elicitationContext: null,
  qualityIssues: null,
  
  // Resume Data
  resumeData: null,
};

// ============================================
// Mode Detection Helpers
// ============================================
export function detectResumeMode(
  hasResume: boolean,
  resumeQuality: "complete" | "partial" | "unusable" | "none"
): ResumeMode {
  if (!hasResume || resumeQuality === "none" || resumeQuality === "unusable") {
    return "generate";
  }
  if (resumeQuality === "partial") {
    return "hybrid";
  }
  return "optimize";
}

export function isGenerateMode(mode: ResumeMode): boolean {
  return mode === "generate" || mode === "hybrid";
}

export function isOptimizeMode(mode: ResumeMode): boolean {
  return mode === "optimize" || mode === "hybrid";
}

// ============================================
// Phase Transition Logic
// ============================================
export function getNextPhase(
  currentPhase: WorkflowPhase,
  mode: ResumeMode,
  state: WorkflowState
): WorkflowPhase {
  if (mode === "generate") {
    // Generate mode flow
    switch (currentPhase) {
      case "idle":
        return "mode_selection";
      case "mode_selection":
        return "goal_clarification";
      case "goal_clarification":
        return state.goalConfirmed ? "experience_elicitation" : "goal_clarification";
      case "experience_elicitation":
        return state.factReadiness >= 0.4 ? "resume_drafting" : "experience_elicitation";
      case "resume_drafting":
        return "quality_review";
      case "quality_review":
        return state.factReadiness >= 0.7 ? "complete" : "experience_elicitation";
      default:
        return currentPhase;
    }
  } else {
    // Optimize mode flow (existing)
    switch (currentPhase) {
      case "idle":
        return "goal_clarification";
      case "goal_clarification":
        return state.goalConfirmed ? "recruiter_review" : "goal_clarification";
      case "recruiter_review":
        return state.recruiterVerdict ? "diagnosis" : "recruiter_review";
      case "diagnosis":
        return "confirmation";
      case "confirmation":
        return state.optimizationConfirmed ? "rewriting" : "confirmation";
      case "rewriting":
        return "complete";
      default:
        return currentPhase;
    }
  }
}

// ============================================
// Agent Routing Logic
// ============================================
export function getActiveAgent(
  phase: WorkflowPhase,
  mode: ResumeMode
): AgentType {
  if (mode === "generate") {
    switch (phase) {
      case "mode_selection":
        return "orchestrator";
      case "goal_clarification":
        return "goal_clarifier";
      case "experience_elicitation":
      case "fact_structuring":
        return "career_elicitation";
      case "resume_drafting":
        return "resume_drafter";
      case "quality_review":
        return "quality_guard";
      default:
        return "orchestrator";
    }
  } else {
    switch (phase) {
      case "goal_clarification":
        return "goal_clarifier";
      case "recruiter_review":
        return "recruiter_judge";
      case "diagnosis":
      case "confirmation":
        return "diagnostician";
      case "rewriting":
        return "rewriter";
      default:
        return "orchestrator";
    }
  }
}

// ============================================
// Fallback Strategy Types
// ============================================
export type FallbackStrategy = 
  | "identity_downgrade"    // 改为生成"能力画像"
  | "example_trigger"       // 提供例句让用户说"像/不像"
  | "pause_render"          // 显示"我们不急"
  | "minimal_deliverable";  // 生成最低可交付物

export interface FallbackConfig {
  trigger_threshold: number; // consecutive_weak_answers threshold
  strategy: FallbackStrategy;
  message: string;
}

export const FALLBACK_STRATEGIES: FallbackConfig[] = [
  {
    trigger_threshold: 2,
    strategy: "example_trigger",
    message: "我给你一个例子，你只需要说「像 / 不像」：\n\n「我主要负责把复杂的事情整理清楚，让别人更容易执行。」\n\n像吗？哪里不对？",
  },
  {
    trigger_threshold: 4,
    strategy: "pause_render",
    message: "我们不急，这不是考试。\n\n换个角度——你在工作中最「拿手」的是什么？不用标准答案，怎么想怎么说。",
  },
  {
    trigger_threshold: 6,
    strategy: "identity_downgrade",
    message: "没关系，我们可以先不写「标准简历」。\n\n先把你会的、做过的、擅长的整理出来，很多人的第一份好简历，都是从这里开始的。",
  },
  {
    trigger_threshold: 8,
    strategy: "minimal_deliverable",
    message: "我先帮你生成一个基础版本，你随时可以继续补充完善。",
  },
];

export function getFallbackStrategy(consecutiveWeakAnswers: number): FallbackConfig | null {
  // Find the highest threshold that has been reached
  const applicable = FALLBACK_STRATEGIES
    .filter(f => consecutiveWeakAnswers >= f.trigger_threshold)
    .sort((a, b) => b.trigger_threshold - a.trigger_threshold);
  
  return applicable[0] || null;
}
