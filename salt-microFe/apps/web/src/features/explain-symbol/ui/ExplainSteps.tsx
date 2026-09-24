import type { ExplainStep } from "@repo/core/coach";

import { EXPLAIN_MESSAGES as M, EXPLAIN_STEPS, type ExplainStepState } from "../model";
import * as s from "./ExplainCard.css";

/** 진행 단계 — 서버가 그 일을 시작하면 켜지고 끝나면 체크된다(FEATURE-008 FR-61) */
export const ExplainSteps = ({ steps }: { steps: Record<ExplainStep, ExplainStepState> }) => (
  <ol className={s.steps} aria-label={M.stepsLabel}>
    {EXPLAIN_STEPS.map((step) => {
      const state = steps[step];
      return (
        <li key={step} className={s.step[state]}>
          <span className={s.stepIcon[state]} aria-hidden="true">
            {state === "done" ? "✓" : state === "skipped" ? "–" : ""}
          </span>
          {M.steps[step]}
          {state === "skipped" ? (
            <span className={s.stepHint}>{M.stepSkipped}</span>
          ) : (
            <span className={s.srOnly}>{M.stepState[state]}</span>
          )}
        </li>
      );
    })}
  </ol>
);
