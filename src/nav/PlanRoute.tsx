import { PlanScreen } from "../screens/plan";

export interface PlanRouteProps {
  onGoals: () => void;
  onCase: () => void;
  onPlanChange?: (prepared: boolean) => void;
}

export function PlanRoute({ onGoals, onCase, onPlanChange }: PlanRouteProps) {
  return <PlanScreen onGoals={onGoals} onCase={onCase} onPlanChange={onPlanChange} />;
}
