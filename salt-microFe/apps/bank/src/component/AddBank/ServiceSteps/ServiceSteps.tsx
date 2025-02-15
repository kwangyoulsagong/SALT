import { ServiceStep } from "./ServiceStepsWrapper/libs/data";
import ServiceStepsWrapper from "./ServiceStepsWrapper/ServiceStepsWrapper";
import { H2 } from "@repo/ui/h2";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import { SubmitButton } from "@repo/ui/submitbutton";
import TypoWrapper from "./ServiceStepsWrapper/TypoWrapper/TypoWrapper";
import BankAccountWrapper from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountWrapper";
import BankAccountContainer from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountContainer/BankAccountContainer";
import Circle from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountContainer/Circle/Circle";
import { CreditCard } from "lucide-react";
import BankAccountInfo from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountContainer/BankAccountInfo/BankAccountInfo";
interface ServiceSteps {
  step: number;
  setStep: (number: number) => void;
}
const ServiceSteps = ({ step, setStep }: ServiceSteps) => {
  const currentStep = ServiceStep.find((v) => v.step === step);
  return (
    <ServiceStepsWrapper>
      {currentStep?.step && (
        <TypoWrapper>
          <H2>{currentStep.header}</H2>
          <P>{currentStep.text}</P>
        </TypoWrapper>
      )}
      {currentStep?.step == 2 && (
        <BankAccountWrapper>
          <BankAccountContainer>
            <section
              style={{ display: "flex", gap: "5px", alignItems: "center" }}
            >
              <Circle color="#687AD7">
                <CreditCard width={15} height={15} color="#ffffff" />
              </Circle>
              <BankAccountInfo>
                <H3>신한은행</H3>
                <P>110-123-456789</P>
              </BankAccountInfo>
            </section>
          </BankAccountContainer>
        </BankAccountWrapper>
      )}
      {currentStep?.step && (
        <SubmitButton variant="sm" type="submit">
          {currentStep.button}
        </SubmitButton>
      )}
    </ServiceStepsWrapper>
  );
};
export default ServiceSteps;
