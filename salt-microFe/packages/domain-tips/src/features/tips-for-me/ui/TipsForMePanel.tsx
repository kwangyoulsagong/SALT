"use client";

import { Button } from "@repo/ui/button";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { ROUTES } from "@repo/web-shared/config";
import { TimelyTipContext } from "@repo/web-shared/ui";
import { SideBlock, SideRow } from "@repo/web-shared/ui/frame";

import { useTipsForMe } from "../api";
import { TIPS_FOR_ME_MESSAGES as M } from "../model";
import * as s from "./tipsForMe.css";

/** 맥락 그림 — 홈 카드와 같은 사용자 3D 아이콘(저축 = ranking · 가계부 = household, `HOME_DOMAIN_ICON`) */
const CONTEXT_ICON = { [TimelyTipContext.Savings]: "ranking", [TimelyTipContext.Household]: "household" } as const;

const TITLE_ID = "tips-for-me-title";

/**
 * 오른쪽 사이드 "내게 맞춘 팁"(`FE-REQ-060` FR-10) — 서버가 맥락마다 고른 글을 사이드 행(52 · 아이콘 · 제목 · 왜 골랐나 · 셰브론)으로.
 * 상태는 한 줄(FR-13): 로그아웃 · 없음 · 실패(+ 다시 불러오기 하나) · 받는 중 = 행 모양 자리. 금액 0 — 공개 화면 곁 칸이다
 */
export const TipsForMePanel = () => {
  const forMe = useTipsForMe();

  const body = forMe.isSignedOut ? (
    <StatusLine kind="blocked">{M.signedOut}</StatusLine>
  ) : forMe.isPending ? (
    <div className={s.skeletons} role="status" aria-label={M.loading}>
      <Skeleton height={52} radius="medium" />
      <Skeleton height={52} radius="medium" />
    </div>
  ) : forMe.isError ? (
    <div className={s.statusRow}>
      <StatusLine kind="error">{M.failed}</StatusLine>
      <Button size="desk" variant="weak" onClick={forMe.refetch}>
        {M.retry}
      </Button>
    </div>
  ) : forMe.picks.length === 0 ? (
    <StatusLine kind="empty">{M.empty}</StatusLine>
  ) : (
    forMe.picks.map(({ context, tip }) => (
      <SideRow
        key={tip.slug}
        href={ROUTES.tip(tip.slug)}
        icon={<ServiceIcon variant={CONTEXT_ICON[context]} />}
        label={tip.title}
        hint={M.because[context]}
      />
    ))
  );

  return (
    <SideBlock title={M.title} titleId={TITLE_ID}>
      {body}
    </SideBlock>
  );
};
