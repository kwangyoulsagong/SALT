import { useState } from "react";
import BankRegistrationWrapper from "./BankRegistrationWrapper/BankRegistrationWrapper";
import Progress from "./Progress/Progress";
import ServiceSteps from "./ServiceSteps/ServiceSteps";
import useBank from "@/hooks/api/bank/useBank";
const BankRegistration = () => {
  const [step, setStep] = useState(1);
  const { accountList } = useBank();
  // 로딩 중인 경우 로딩 표시
  if (accountList.isLoading) {
    return <div>계좌 정보를 불러오는 중입니다...</div>;
  }

  // 데이터가, 특히 account_list가 없는 경우를 처리
  if (!accountList.data || !accountList.data.account_list) {
    return <div>계좌 정보를 불러올 수 없습니다.</div>;
  }
  return (
    <BankRegistrationWrapper>
      <Progress step={step} />
      <ServiceSteps
        accounts={accountList.data.account_list}
        step={step}
        setStep={setStep}
      />
    </BankRegistrationWrapper>
  );
};
export default BankRegistration;
