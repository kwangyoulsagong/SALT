import type { CoachAnswerLink } from "@repo/core/coach";

import { COACH_REPORT_SECTIONS, ROUTES } from "@repo/web-shared/config";

import { COACH_LINK_LABEL, coachSymbolLinkLabel } from "../model/messages";

/** 답 아래 이동 코드 → 같은 zone 경로 · 문구. 경로는 화면이 정한다(서버는 코드만 준다) */
export const coachLinkTarget = (link: CoachAnswerLink): { href: string; label: string } | null => {
  switch (link.kind) {
    case "symbol":
      return link.symbol ? { href: ROUTES.investmentDetail(link.symbol), label: coachSymbolLinkLabel(link.symbol) } : null;
    case "risk_budget":
    case "size_check":
      return { href: ROUTES.coachReportSection(COACH_REPORT_SECTIONS.riskBudget), label: COACH_LINK_LABEL[link.kind] };
    case "behavior_mirror":
      return { href: ROUTES.coachReport, label: COACH_LINK_LABEL.behavior_mirror };
    case "profit_plan":
      return { href: ROUTES.portfolio, label: COACH_LINK_LABEL.profit_plan };
    default:
      return null;
  }
};
