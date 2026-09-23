"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`InvestmentDetailBody` 와 같은 이유).
import dynamic from "next/dynamic";

/**
 * 리포트 본문. **`ssr:false` 다** — 조회에 토큰이 필요하고 토큰은 브라우저 `localStorage` 에만
 * 있다(`FE-REQ-013` 전). 서버에서 그리면 "로그인 안 됨"을 그렸다가 브라우저에서 바뀌어
 * 수화 불일치가 난다. 생성 시각 포맷도 브라우저 타임존이어야 한다.
 */
const CoachReport = dynamic(
  () => import("@/widgets/coach-console").then((mod) => mod.CoachReport),
  { ssr: false, loading: () => null },
);

export const CoachReportBody = () => <CoachReport />;

export default CoachReportBody;
