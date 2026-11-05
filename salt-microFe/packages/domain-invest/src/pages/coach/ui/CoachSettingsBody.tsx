"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`CoachReportBody` 와 같은 이유).
import dynamic from "next/dynamic";

/**
 * 투자 코치 설정 본문(2026-11-02 셸 `/settings` 에서 옮김 — `FE-REQ-053`). **`ssr:false` 다** — 조회에 토큰이 필요하고 토큰은 브라우저 `localStorage` 에만 있다(`FE-REQ-013` 전).
 * 서버에서 그리면 "로그인 안 됨"을 그렸다가 브라우저에서 바뀌어 수화 불일치가 난다.
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 */
const SettingsPanel = dynamic(
  () => import("@/widgets/settings-panel").then((mod) => mod.SettingsPanel),
  { ssr: false, loading: () => null },
);

export const CoachSettingsBody = () => <SettingsPanel />;

export default CoachSettingsBody;
