"use client";

import { ServiceIcon } from "@repo/ui/serviceicon";

import { ROUTES } from "@repo/web-shared/config";
import { SideBlock, SideRow } from "@repo/web-shared/ui";

import { HOME_DOMAIN_ICON, type HomeDomain, useHomeCards } from "@/entities/home";

import { QUICK_ACTION_MESSAGES } from "../model/messages";

/** 홈에서 바로 적는 곳 — 저축 · 가계부만. 투자는 홈에 입구를 늘리지 않는다(`FE-REQ-048` FR-5 진입점 원칙) */
const QUICK_ACTIONS: readonly { domain: HomeDomain; href: string; label: string; hint: string }[] = [
  { domain: "household", href: ROUTES.newExpense, label: QUICK_ACTION_MESSAGES.expense, hint: QUICK_ACTION_MESSAGES.expenseHint },
  { domain: "savings", href: ROUTES.addGoal, label: QUICK_ACTION_MESSAGES.goal, hint: QUICK_ACTION_MESSAGES.goalHint },
];

/**
 * 오른쪽 칸 "바로 적기"(`FE-REQ-048` FR-8 · 리서치 — 참고 홈 오른쪽 칸은 목록 행 + 끝에 "추가" 행). 시작하기만 있던 칸이 다 끝낸 뒤 비지 않게.
 * 순서는 홈 카드 순서(`order`), 숨긴 도메인(`hidden`)은 빼고 — 사람이 정한 홈 설정을 따른다. 카드와 같은 쿼리라 요청은 하나
 */
export const QuickActions = () => {
  const home = useHomeCards();
  if (!home.data) return null;
  const hidden = new Set(home.data.hidden);
  const rows = home.data.order
    .filter((domain) => !hidden.has(domain))
    .flatMap((domain) => QUICK_ACTIONS.filter((action) => action.domain === domain));
  if (rows.length === 0) return null;

  return (
    <SideBlock title={QUICK_ACTION_MESSAGES.title} titleId="home-quick-actions-title">
      {rows.map((action) => (
        <SideRow
          key={action.domain}
          href={action.href}
          icon={<ServiceIcon variant={HOME_DOMAIN_ICON[action.domain]} />}
          label={action.label}
          hint={action.hint}
        />
      ))}
    </SideBlock>
  );
};
