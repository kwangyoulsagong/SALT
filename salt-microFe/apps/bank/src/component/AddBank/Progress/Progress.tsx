import ProgressWrapper from "./ProgressWrapper/ProgressWrapper";
import Circle from "./StepsBar/Circle/Circle";
import StepsBar from "./StepsBar/StepsBar";
import { Lock, CreditCard, CheckCircle } from "lucide-react";
import { Typo } from "./StepsBar/StepsBar.css";
import {
  ACTIVE_COLOR,
  ACTIVE_TEXT_COLOR,
  INACTIVE_COLOR,
  INACTIVE_TEXT_COLOR,
  STEPS,
} from "./libs/data";
const Progress = ({ step }: { step: number }) => {
  const isStepActive = (stepIndex: number) => step === stepIndex + 1;
  return (
    <ProgressWrapper>
      {STEPS.map((value, index) => {
        const active = isStepActive(index);
        const Icon = value.icon;
        return (
          <StepsBar key={index}>
            <Circle color={active ? ACTIVE_COLOR : INACTIVE_COLOR}>
              <Icon
                width={15}
                height={15}
                color={active ? "#FFFFFF" : INACTIVE_TEXT_COLOR}
              />
            </Circle>
            <span
              className={Typo}
              style={{
                color: active ? ACTIVE_TEXT_COLOR : INACTIVE_TEXT_COLOR,
              }}
            >
              {value.label}
            </span>
          </StepsBar>
        );
      })}
    </ProgressWrapper>
  );
};
export default Progress;
