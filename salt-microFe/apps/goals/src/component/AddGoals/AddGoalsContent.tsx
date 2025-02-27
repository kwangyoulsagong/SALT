import ButtonWrapper from "@/component/AddGoals/GoalsForm/ButtonWrapper/ButtonWrapper";
import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";
import { Button } from "@repo/ui/button";
import { SubmitButton } from "@repo/ui/submitbutton";
import { InputField } from "@repo/ui/input";
import { BankIcon } from "@repo/ui/bankicon";
import { SubmitHandler, useForm } from "react-hook-form";
import BankAccountValid from "@/component/AddGoals/GoalsForm/ButtonWrapper/BankAccountValid/BankAccountValid";
import { H2 } from "@repo/ui/h2";
import { ChevronRight } from "lucide-react";
import { useAppSelector } from "@/hooks/redux/hooks";
import SubmitButtonWrapper from "./SubmitButtonWrapper/SubmitButtonWrapper";
import { useMessageEventBus } from "@repo/message-event-bus/eventbus";
import { useEffect, useState } from "react";
interface IFormInput {
  title: string;
  amount: number;
}
const AddGoalsContent = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const { useSubscription } = useMessageEventBus();
  const goals = useAppSelector((state) => state.goal);
  const [accountData, setAccountData] = useState(null);

  // 구독 설정
  useSubscription("ACCOUNT_SELECTED", (data) => {
    setAccountData(data);
  });
  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    console.log(data);
    console.log(goals);
    console.log(accountData);
  };

  return (
    <Wrapper>
      <form onSubmit={handleSubmit(onSubmit)}>
        <GoalsForm>
          <CategoriesWrapper />
          <InputField
            register={register}
            name="title"
            placeholder="title"
            type="text"
            variant="goals"
          />
          <InputField
            register={register}
            name="amount"
            placeholder="amount"
            type="number"
            variant="goals"
          />
          <Button
            eventType="route"
            eventValue="/bank/addbank"
            variant="bankAccount"
          >
            <ButtonWrapper>
              <BankAccountValid>
                <BankIcon />
                <H2>계좌 추가하기</H2>
              </BankAccountValid>
              <ChevronRight />
            </ButtonWrapper>
          </Button>
        </GoalsForm>
        <SubmitButtonWrapper>
          <SubmitButton type="submit">확인</SubmitButton>
        </SubmitButtonWrapper>
      </form>
    </Wrapper>
  );
};
export default AddGoalsContent;
