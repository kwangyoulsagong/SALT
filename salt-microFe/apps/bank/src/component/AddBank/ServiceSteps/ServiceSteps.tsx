import { ServiceStep } from "./ServiceStepsWrapper/libs/data";
import ServiceStepsWrapper from "./ServiceStepsWrapper/ServiceStepsWrapper";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
import { SubmitButton } from "@repo/ui/submitbutton";
interface ServiceSteps {
  step: number;
  setStep: (number: number) => void;
}
const ServiceSteps = ({ step, setStep }: ServiceSteps) => {
  const currentStep = ServiceStep.find((v) => v.step === step);
  return (
    <ServiceStepsWrapper>
      {currentStep?.step && <H2>{currentStep.header}</H2>}
      {currentStep?.step && <P>{currentStep.text}</P>}
      {currentStep?.step && (
        <SubmitButton variant="sm" type="submit">
          {currentStep.button}
        </SubmitButton>
      )}
    </ServiceStepsWrapper>
  );
};
export default ServiceSteps;
