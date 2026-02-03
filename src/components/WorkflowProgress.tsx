import { PHASE_DISPLAY_INFO, type WorkflowPhase, type AgentType } from "@/types/agents";
import type { ResumeMode } from "@/types/resume";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface WorkflowProgressProps {
  currentPhase: WorkflowPhase;
  currentAgent: AgentType | null;
  mode?: ResumeMode;
}

// Generate mode phases
const GENERATE_PHASES_ORDER: WorkflowPhase[] = [
  "idle",
  "goal_clarification",
  "experience_elicitation",
  "resume_drafting",
  "quality_review",
  "complete",
];

// Optimize mode phases (existing)
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

  return (
    <ScrollArea className="w-full">
      <div className="flex items-center gap-2 pb-2">
        {phasesOrder.map((phase, index) => {
          const phaseInfo = PHASE_DISPLAY_INFO[phase];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={phase} className="flex items-center">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors",
                    isCompleted && "bg-foreground text-background",
                    isCurrent && "bg-foreground text-background",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                <span
                  className={cn(
                    "mt-1 text-xs whitespace-nowrap",
                    isCurrent && "text-foreground font-medium",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {phaseInfo?.label || phase}
                </span>
              </div>

              {/* Connector line */}
              {index < phasesOrder.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-2",
                    index < currentIndex ? "bg-foreground" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
