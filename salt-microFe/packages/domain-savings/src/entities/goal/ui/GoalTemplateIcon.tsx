import { Baby, Car, Gem, Home, LifeBuoy, Plane, Sparkles, type LucideIcon } from "lucide-react";

import type { GoalTemplateKey } from "../model/types";

/** 템플릿 그림 — 선 아이콘 하나씩(무엇을 모으는지 한눈에, 2026-11-20). 목록 행 판 · 목표 없음 타일이 같이 쓴다. 장식이라 읽지 않는다 */
const TEMPLATE_ICON: Readonly<Record<GoalTemplateKey, LucideIcon>> = {
  wedding: Gem,
  housing: Home,
  first_car: Car,
  travel: Plane,
  emergency: LifeBuoy,
  childbirth: Baby,
  other: Sparkles,
};

export const GoalTemplateIcon = ({ template, size = 18 }: { template: GoalTemplateKey; size?: number }) => {
  const Icon = TEMPLATE_ICON[template] ?? Sparkles;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
};
