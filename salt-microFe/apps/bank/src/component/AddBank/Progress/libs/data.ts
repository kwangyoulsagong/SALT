import { Lock, CheckCircle, CreditCard } from "lucide-react";

export interface StepConfig {
  icon: React.ElementType;
  label: string;
}

export const STEPS: StepConfig[] = [
  {
    icon: Lock,
    label: "인증",
  },
  {
    icon: CreditCard,
    label: "계좌 선택",
  },
  {
    icon: CheckCircle,
    label: "완료",
  },
];

export const ACTIVE_COLOR = "#687AD7";
export const INACTIVE_COLOR = "#E1E3E8";
export const ACTIVE_TEXT_COLOR = "#687AD7";
export const INACTIVE_TEXT_COLOR = "#9199A5";
