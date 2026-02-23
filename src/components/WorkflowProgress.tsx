import { PHASE_DISPLAY_INFO, type WorkflowPhase, type AgentType } from "@/types/agents";
import type { ResumeMode } from "@/types/resume";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface WorkflowProgressProps {
  currentPhase: WorkflowPhase;
  currentAgent: AgentType | null;
  mode?: ResumeMode;
}

const GENERATE_PHASES_ORDER: WorkflowPhase[] = [
  "idle",
  "goal_clarification",
  "experience_elicitation",
  "resume_drafting",
  "quality_review",
  "complete",
];

const OPTIMIZE_PHASES_ORDER: WorkflowPhase[] = [
  "idle",
  "goal_clarification",
  "recruiter_review",
  "diagnosis",
  "confirmation",
  "rewriting",
  "complete",
];

export function WorkflowProgress({ currentPhase, currentAgent, mode = "generate" }: WorkflowProgressProps) {
  const phasesOrder = mode === "generate" || mode === "hybrid"
    ? GENERATE_PHASES_ORDER
    : OPTIMIZE_PHASES_ORDER;

  const currentIndex = phasesOrder.indexOf(currentPhase);
  const progress = phasesOrder.length > 1 ? currentIndex / (phasesOrder.length - 1) : 0;

  return (
    <div className="space-y-2">
      {/* Minimal progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(progress * 100, 2)}%` }}
        />
      </div>

      {/* Current phase label */}
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1.5">
          {phasesOrder.map((phase, index) => {
            const phaseInfo = PHASE_DISPLAY_INFO[phase];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={phase}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-lg text-caption whitespace-nowrap transition-colors",
                  isCurrent && "bg-primary/10 text-foreground font-medium",
                  isCompleted && "text-muted-foreground",
                  !isCurrent && !isCompleted && "text-muted-foreground/40"
                )}
              >
                {isCompleted && (
                  <span className="text-[10px]">✓</span>
                )}
                {phaseInfo?.label || phase}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
