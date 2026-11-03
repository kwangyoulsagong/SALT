import type { GoalTemplateKey } from "@/entities/goal";

/** 서버 `POST /api/app/savings/goals` 요청 — 필드 이름은 서버 DTO(`SRV-REQ-045`) */
export interface AddGoalRequest {
  title: string;
  template: GoalTemplateKey;
  targetAmount: number;
  targetDate?: string;
  monthlyPlan?: number;
  includeInterest: boolean;
  annualRate?: number;
}

export type PlanMode = "deadline" | "monthly";
