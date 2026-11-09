import { PlanScreen } from "../screens/plan";

export interface PlanRouteProps {
  onGoals: () => void;
  onCase: () => void;
}

export function PlanRoute({ onGoals, onCase }: PlanRouteProps) {
  return <PlanScreen onGoals={onGoals} onCase={onCase} />;
}
