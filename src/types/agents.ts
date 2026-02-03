// Agent Types and Workflow State for Multi-Agent Resume System

export type AgentType =
  | "orchestrator"
  | "goal_clarifier"
  | "recruiter_judge"
  | "diagnostician"
  | "rewriter"
  | "integrity_guard";

export type WorkflowPhase =
  | "idle"
  | "goal_clarification"
  | "recruiter_review"
  | "diagnosis"
  | "confirmation"
  | "rewriting"
  | "complete";

export interface WorkflowState {
  currentPhase: WorkflowPhase;
  currentAgent: AgentType | null;
  goalConfirmed: boolean;
  resumeProvided: boolean;
  optimizationConfirmed: boolean;
  targetRole: string | null;
  targetMarket: string | null;
  resumeGoal: string | null;
  resumeContent: string | null;
  diagnosticResults: DiagnosticResult[] | null;
  recruiterVerdict: RecruiterVerdict | null;
}

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

export interface AgentOutput {
  agent: AgentType;
  content: string;
  timestamp: number;
  stateUpdate?: Partial<WorkflowState>;
}

// Agent display info for UI
export const AGENT_DISPLAY_INFO: Record<
  AgentType,
  { label: string; visible: boolean; icon: string }
> = {
  orchestrator: { label: "系统", visible: false, icon: "🎯" },
  goal_clarifier: { label: "目标顾问", visible: true, icon: "🎯" },
  recruiter_judge: { label: "招聘官视角", visible: true, icon: "👔" },
  diagnostician: { label: "简历诊断师", visible: true, icon: "🔍" },
  rewriter: { label: "简历优化师", visible: true, icon: "✍️" },
  integrity_guard: { label: "诚信守护", visible: false, icon: "🛡️" },
};

// Workflow phase display info
export const PHASE_DISPLAY_INFO: Record<
  WorkflowPhase,
  { label: string; progress: number }
> = {
  idle: { label: "准备开始", progress: 0 },
  goal_clarification: { label: "明确目标", progress: 20 },
  recruiter_review: { label: "招聘官审视", progress: 40 },
  diagnosis: { label: "简历诊断", progress: 60 },
  confirmation: { label: "确认方向", progress: 80 },
  rewriting: { label: "优化生成", progress: 90 },
  complete: { label: "完成", progress: 100 },
};

// Initial workflow state
export const INITIAL_WORKFLOW_STATE: WorkflowState = {
  currentPhase: "idle",
  currentAgent: null,
  goalConfirmed: false,
  resumeProvided: false,
  optimizationConfirmed: false,
  targetRole: null,
  targetMarket: null,
  resumeGoal: null,
  resumeContent: null,
  diagnosticResults: null,
  recruiterVerdict: null,
};
