import { PlanScreen } from "../screens/plan";

export interface PlanRouteProps {
  onGoals: () => void;
  onCase: () => void;
  onPlanChange?: (prepared: boolean) => void;
  onOpenToday: () => void;
}

export function PlanRoute({ onGoals, onCase, onPlanChange, onOpenToday }: PlanRouteProps) {
  return (
    <PlanScreen
      onGoals={onGoals}
      onCase={onCase}
      onPlanChange={onPlanChange}
      onOpenToday={onOpenToday}
    />
  );
}
