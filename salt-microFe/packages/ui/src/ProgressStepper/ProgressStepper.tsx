import { Check } from "lucide-react";
import {
  connectorStyles,
  labelStyles,
  listStyles,
  markerRowStyles,
  markerStyles,
  stepStyles,
} from "./styles/progressStepper.css";

export interface ProgressStep {
  id: string;
  label: string;
}

export interface ProgressStepperProps {
  steps: ProgressStep[];
  /** 진행 중인 단계의 0부터 시작하는 인덱스. `steps.length`면 전부 완료다. */
  current: number;
  /** 단계 묶음의 이름 */
  label?: string;
  className?: string;
}

type StepState = "done" | "current" | "upcoming";

/** 온보딩·신고 절차처럼 순서가 정해진 흐름의 현재 위치를 보여준다. */
export const ProgressStepper = ({
  steps,
  current,
  label = "진행 단계",
  className,
}: ProgressStepperProps) => {
  const stateOf = (index: number): StepState => {
    if (index < current) return "done";
    if (index === current) return "current";
    return "upcoming";
  };

  return (
    <ol aria-label={label} className={`${listStyles} ${className || ""}`}>
      {steps.map((step, index) => {
        const state = stateOf(index);

        return (
          <li
            key={step.id}
            className={stepStyles}
            aria-current={state === "current" ? "step" : undefined}
          >
            <div className={markerRowStyles}>
              <span
                className={connectorStyles({
                  filled: index <= current && index > 0,
                  hidden: index === 0,
                })}
              />
              <span className={markerStyles({ state })}>
                {state === "done" ? (
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={connectorStyles({
                  filled: index < current,
                  hidden: index === steps.length - 1,
                })}
              />
            </div>
            <span className={labelStyles({ state })}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
};
