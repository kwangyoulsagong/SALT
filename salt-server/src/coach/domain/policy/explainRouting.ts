import { isForecastOwner } from "./forecast";

/**
 * 해설 다듬기 공급자 라우팅 (F008 FR-73 · `SRV-REQ-050`).
 *
 * 템플릿이 바닥이고 LLM 은 다듬기 계층이다(FEATURE-008 FR-45). 공급자가 무엇이든 같은 검증기를 지난다 —
 * 여기서 정하는 것은 **누가 문장을 쓰나** 뿐이다.
 */

/** `local_claude` — Claude Code CLI · `local_codex` — Codex CLI · `gemini` — API */
export type ExplainProvider = "local_claude" | "local_codex" | "gemini";

/** 요청이 온 곳 — BFF 가 정해 `X-Salt-Client` 로 넘긴다(`BFF-REQ-050`). 클라이언트가 고르지 못한다 */
export type ExplainClient = "web" | "mobile";

export interface ExplainRouteInput {
  /** 부팅 때 감지한 로컬 CLI. 없으면 `null`(FR-2) */
  local: Exclude<ExplainProvider, "gemini"> | null;
  /** 연속 실패로 쉬는 중(FR-7) · 동시 실행 상한에 닿음(FR-6) */
  localPaused: boolean;
  localBusy: boolean;
  email: string | undefined;
  /** 로컬 CLI 를 쓸 수 있는 이메일 — 소유자 구독을 다른 초대 사용자가 쓰지 않게 */
  localUsers: readonly string[];
  client: ExplainClient;
  /** 해설 스냅샷 배치 — 사람이 아니라 공용 문장 하나(`SRV-REQ-053` FR-3) */
  batch?: boolean;
}

/**
 * 이번 요청의 첫 공급자 — 로컬 CLI 가 있고 · 허용 사용자이고 · 웹이면 로컬, 아니면 Gemini(FR-3).
 *
 * **모바일은 Gemini**(FR-4, 사용자 결정 2026-11-02): 로컬 CLI 는 프로세스 기동 때문에 첫 응답이 수 초 더 길고,
 * 모바일은 백그라운드 전환으로 스트림이 자주 끊겨(`streaming-sse.md` §9) 기동 비용만 버린다.
 */
export const pickExplainProvider = (input: ExplainRouteInput): ExplainProvider => {
  if (!input.local || input.localPaused || input.localBusy) return "gemini";
  // 배치는 종목마다 한 번 만들어 모두가 같은 문장을 본다 — 소유자 기기의 로컬 CLI 가 쓴다(F017 v2 단계 3)
  if (input.batch) return input.local;
  if (input.client !== "web") return "gemini";
  if (!isForecastOwner(input.email, input.localUsers)) return "gemini";
  return input.local;
};

/** 로컬 CLI 연속 실패 상한 · 쉬는 시간(FR-7) */
export const LOCAL_LLM_FAILURE_LIMIT = 3;
export const LOCAL_LLM_PAUSE_MS = 10 * 60 * 1000;
