/**
 * 해설 다듬기 공급자 라우팅 (F008 FR-73 · `SRV-REQ-050`).
 *
 * 템플릿이 바닥이고 LLM 은 다듬기 계층이다(FEATURE-008 FR-45). 공급자가 무엇이든 같은 검증기를 지난다 —
 * 여기서 정하는 것은 **누가 문장을 쓰나** 뿐이다.
 */

/** `local_claude` — Claude Code CLI · `local_codex` — Codex CLI · `gemini` — API */
export type ExplainProvider = "local_claude" | "local_codex" | "gemini";

export interface ExplainRouteInput {
  /** 부팅 때 감지한 로컬 CLI. 없으면 `null`(FR-2) */
  local: Exclude<ExplainProvider, "gemini"> | null;
  /** 연속 실패로 쉬는 중(FR-7) · 동시 실행 상한에 닿음(FR-6) */
  localPaused: boolean;
  localBusy: boolean;
}

/**
 * 첫 공급자 — 로컬 CLI 가 있고 쉬는 중 · 바쁨이 아니면 로컬, 아니면 Gemini.
 *
 * **부르는 곳은 LLM 배치 둘이다** — 해설 스냅샷(F017 v2 단계 3, 2026-11-11 · `SRV-REQ-053` FR-3)과 오늘 등락 한 줄(F016 단계 D, 2026-11-12 ·
 * `SRV-REQ-052`). 둘 다 종목마다 한 번 만들어 모두가 같은 문장을 본다. 상태(실패 · 쉬기 · 동시)는 둘이 한 `LocalCliGate` 를 나눠 쓴다.
 * ~~허용 사용자 · 웹만 로컬, 모바일은 Gemini(FR-3 · FR-4)~~ 는 요청 경로 해설이 사라져 고를 사람 · 클라이언트가 없다 — 그 분기를 지웠다
 */
export const pickExplainProvider = (input: ExplainRouteInput): ExplainProvider =>
  !input.local || input.localPaused || input.localBusy ? "gemini" : input.local;

/** 로컬 CLI 연속 실패 상한 · 쉬는 시간(FR-7) */
export const LOCAL_LLM_FAILURE_LIMIT = 3;
export const LOCAL_LLM_PAUSE_MS = 10 * 60 * 1000;
