"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`InvestmentDetailBody` 와 같은 이유).
import dynamic from "next/dynamic";

import { SignInRequired } from "@repo/web-shared/ui";

import { COACH_REPORT_PAGE } from "../model";

/**
 * 리포트 본문. **`ssr:false` 다** — 조회에 토큰이 필요하고 토큰은 브라우저 `localStorage` 에만
 * 있다(`FE-REQ-013` 전). 서버에서 그리면 "로그인 안 됨"을 그렸다가 브라우저에서 바뀌어
 * 수화 불일치가 난다. 생성 시각 포맷도 브라우저 타임존이어야 한다.
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 */
const CoachReport = dynamic(
  () => import("@/widgets/coach-console").then((mod) => mod.CoachReport),
  { ssr: false, loading: () => null },
);

/** 로그인 없이 오면 본문 전체가 유리막(`FE-REQ-070` FR-7) — 판단 · 성적 · 리스크는 AI · 사람 칸 */
export const CoachReportBody = () => (
  <SignInRequired what={COACH_REPORT_PAGE.blockName} minHeight={COACH_REPORT_PAGE.blockMinHeight}>
    <CoachReport />
  </SignInRequired>
);

export default CoachReportBody;
