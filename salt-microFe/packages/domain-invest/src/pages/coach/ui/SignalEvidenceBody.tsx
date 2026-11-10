"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`CoachReportBody` 와 같은 이유).
import dynamic from "next/dynamic";

import { SignInRequired } from "@repo/web-shared/ui";

import { SIGNAL_EVIDENCE_PAGE } from "../model";

/**
 * 판정 근거 본문. **`ssr:false` 다** — 성적표 조회에 토큰이 필요하고 토큰은 브라우저 `localStorage` 에만 있다
 * (`CoachReportBody` 와 같은 이유 · 같은 위젯 청크).
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 */
const SignalEvidence = dynamic(
  () => import("@/widgets/coach-console").then((mod) => mod.SignalEvidence),
  { ssr: false, loading: () => null },
);

/** 로그인 없이 오면 유리막(`FE-REQ-070` FR-7) */
export const SignalEvidenceBody = ({ signalType }: { signalType: string }) => (
  <SignInRequired what={SIGNAL_EVIDENCE_PAGE.blockName} minHeight={SIGNAL_EVIDENCE_PAGE.blockMinHeight}>
    <SignalEvidence signalType={signalType} />
  </SignInRequired>
);

export default SignalEvidenceBody;
