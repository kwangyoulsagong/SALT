"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`CoachReportBody` 와 같은 이유).
import dynamic from "next/dynamic";

/**
 * 판정 근거 본문. **`ssr:false` 다** — 성적표 조회에 토큰이 필요하고 토큰은 브라우저 `localStorage` 에만 있다
 * (`CoachReportBody` 와 같은 이유 · 같은 위젯 청크).
 */
const SignalEvidence = dynamic(
  () => import("@/widgets/coach-console").then((mod) => mod.SignalEvidence),
  { ssr: false, loading: () => null },
);

export const SignalEvidenceBody = ({ signalType }: { signalType: string }) => <SignalEvidence signalType={signalType} />;

export default SignalEvidenceBody;
