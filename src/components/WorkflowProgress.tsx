import { Progress } from "@/components/ui/progress";
import { PHASE_DISPLAY_INFO, AGENT_DISPLAY_INFO, type WorkflowPhase, type AgentType } from "@/types/agents";
import { cn } from "@/lib/utils";

interface WorkflowProgressProps {
  currentPhase: WorkflowPhase;
  currentAgent: AgentType | null;
}

export function WorkflowProgress({ currentPhase, currentAgent }: WorkflowProgressProps) {
  const phaseInfo = PHASE_DISPLAY_INFO[currentPhase];
  const agentInfo = currentAgent ? AGENT_DISPLAY_INFO[currentAgent] : null;
  
  // Only show visible agents
  const showAgent = agentInfo?.visible;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <Progress value={phaseInfo.progress} className="h-1" />
      
      {/* Phase and agent info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{phaseInfo.label}</span>
        {showAgent && (
          <span className={cn("flex items-center gap-1")}>
            <span>{agentInfo.icon}</span>
            <span>{agentInfo.label}</span>
          </span>
        )}
      </div>
    </div>
  );
}
