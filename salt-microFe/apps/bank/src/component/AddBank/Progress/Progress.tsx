import ProgressWrapper from "./ProgressWrapper/ProgressWrapper";
import StepsBar from "./StepsBar/StepsBar";

const Progress = ({ step }: { step: number }) => {
  return (
    <ProgressWrapper>
      <StepsBar>
        <circle></circle>
      </StepsBar>
      <StepsBar>fsadf</StepsBar>
      <StepsBar>fsadf</StepsBar>
    </ProgressWrapper>
  );
};
export default Progress;
