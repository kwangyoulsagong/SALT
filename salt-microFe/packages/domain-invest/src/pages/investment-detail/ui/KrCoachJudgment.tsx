"use client";

import { Heading } from "@repo/ui/heading";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { COACH_MESSAGES, CoachBlockSkeleton, CoachStaleNote, JudgmentDetail, selectModeView, useSymbolCoach } from "@/entities/coach";
import { KR_STOCK_MESSAGES as M } from "@/entities/market";
import { CoachModeSwitch, useCoachModeParam } from "@/features/switch-coach-mode";

import { krCoachCard } from "./SymbolHeader.css";

/**
 * 국내 주식 상세의 코치 판단(F011 슬라이스 4 · 시나리오 6). ~~장기 한 모드만~~ **단타 · 장기 둘 다**(`ADR-010` v2, 2026-11-10 —
 * 국내 단타 개방). 코인 상세와 같은 전환(`CoachModeSwitch` · 주소 `?mode=`), 기본은 서버가 고른 모드(국내는 장기).
 *
 * 판단은 막히지 않는다 — 이력이 모자라면 꼬리표 "일봉 N/120거래일", 라이브 성적이 모자라면 과거 검산 성적과 그 문장.
 * 판단 · 문턱은 전부 서버 값이다.
 *
 * 열리면 코인 상세와 같은 카드(`JudgmentDetail`) — 근거 · 과거 성적 · 틀렸던 때까지. 라이브 표본이 모자랄 동안의 성적은
 * 과거 시세로 되돌려 채점한 모의 성적이고 카드가 그 라벨을 붙인다(F011 슬라이스 7b)
 */
export const KrCoachJudgment = ({ code }: { code: string }) => {
  const { data, isPending, isError } = useSymbolCoach(code);
  const [mode, setMode] = useCoachModeParam(data?.mode);

  const body = () => {
    if (isError) return <StatusLine kind="error">{COACH_MESSAGES.judgmentUnavailable}</StatusLine>;
    if (isPending || !data || !mode) return <CoachBlockSkeleton block="judgment" />;
    return (
      <>
        <CoachStaleNote staleSince={data.staleSince} />
        <JudgmentDetail view={selectModeView(data, mode)} mode={mode} showTrack={false} />
      </>
    );
  };

  return (
    <section className={krCoachCard} aria-label={COACH_MESSAGES.judgmentHeading}>
      <Heading level={5} color="tertiary">
        {COACH_MESSAGES.judgmentHeading}
      </Heading>
      {data && mode && <CoachModeSwitch value={mode} onChange={setMode} />}
      {body()}
      <Text color="tertiary">{M.detail.coachNote}</Text>
    </section>
  );
};
