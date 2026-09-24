import type {
  ExplainCitation,
  ExplainSections,
  ExplainStep,
  ExplainStreamEvent,
  ExplanationSource,
} from "@repo/core/coach";

export type ExplainStepState = "pending" | "active" | "done" | "skipped";

/** 화면에 보이는 단계 순서 — 서버가 실제로 그 일을 할 때 켠다(FEATURE-008 FR-61) */
export const EXPLAIN_STEPS: readonly ExplainStep[] = ["judgment", "draft", "polish", "verify"];

export interface ExplainStreamState {
  /**
   * `streaming` 받는 중 · `done` 끝 · `blocked` 서버 게이트가 닫힘 · `busy` 429 ·
   * `failed` 글자 하나 못 받고 실패(화면은 판단 근거 문장으로 대신한다)
   */
  status: "idle" | "streaming" | "done" | "blocked" | "busy" | "failed";
  steps: Record<ExplainStep, ExplainStepState>;
  sections: ExplainSections;
  /** 최종 문장 출처. 끝나기 전에는 `null` */
  source: ExplanationSource | null;
  droppedSentences: number;
  /** 검사를 통과한 AI 문장으로 바뀌었다 — 화면이 한 번 알려 준다 */
  replaced: boolean;
  citations: ExplainCitation[];
  generatedAt: string | null;
}

export type ExplainStreamAction =
  | { type: "start" }
  | { type: "event"; event: ExplainStreamEvent }
  | { type: "ended" }
  | { type: "failed"; busy: boolean };

const EMPTY_SECTIONS: ExplainSections = { modeReasoning: "", keyDrivers: [], risks: [], newsSummary: [] };

export const initialExplainStreamState: ExplainStreamState = {
  status: "idle",
  steps: { judgment: "pending", draft: "pending", polish: "pending", verify: "pending" },
  sections: EMPTY_SECTIONS,
  source: null,
  droppedSentences: 0,
  replaced: false,
  citations: [],
  generatedAt: null,
};

const hasText = (s: ExplainSections) => s.modeReasoning !== "" || s.keyDrivers.length > 0;

/**
 * 받은 글자가 있으면 그것이 최종 문장이다(템플릿 — 입력 사실로만 만든 문장). 하나도 없으면 실패.
 * 서버가 `done` 없이 닫았거나 중간 오류(`message.error`)가 온 경우에 쓴다.
 */
const settle = (state: ExplainStreamState): ExplainStreamState =>
  hasText(state.sections)
    ? { ...state, status: "done", source: state.source ?? "template" }
    : { ...state, status: "failed" };

/** 해설 스트림 상태 — 순수 함수. 이벤트 순서는 서버 계약(`ExplainStreamEvent`)을 따른다 */
export const explainStreamReducer = (
  state: ExplainStreamState,
  action: ExplainStreamAction,
): ExplainStreamState => {
  switch (action.type) {
    case "start":
      return { ...initialExplainStreamState, status: "streaming" };
    case "failed":
      return action.busy ? { ...initialExplainStreamState, status: "busy" } : settle(state);
    case "ended":
      return state.status === "streaming" ? settle(state) : state;
    case "event":
      break;
  }

  const { event } = action;
  switch (event.event) {
    case "message.step":
      return { ...state, steps: { ...state.steps, [event.data.step]: event.data.status } };
    case "message.blocked":
      return { ...state, status: "blocked" };
    case "message.card":
      return { ...state, citations: event.data.citations ?? [] };
    case "message.delta": {
      const { section, index, text } = event.data;
      if (section === "modeReasoning") {
        return { ...state, sections: { ...state.sections, modeReasoning: state.sections.modeReasoning + text } };
      }
      const list = [...state.sections[section]];
      list[index] = (list[index] ?? "") + text;
      return { ...state, sections: { ...state.sections, [section]: list } };
    }
    case "message.replace": {
      const { modeReasoning, keyDrivers, risks, newsSummary, source, droppedSentences } = event.data;
      return {
        ...state,
        sections: { modeReasoning, keyDrivers, risks, newsSummary },
        source,
        droppedSentences,
        replaced: true,
      };
    }
    case "message.done":
      return {
        ...state,
        status: "done",
        source: event.data.source,
        droppedSentences: event.data.droppedSentences,
        generatedAt: event.data.generatedAt,
      };
    case "message.error":
      return settle(state);
    default:
      return state;
  }
};
