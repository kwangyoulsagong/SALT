import ButtonWrapper from "@/component/AddGoals/GoalsForm/ButtonWrapper/ButtonWrapper";
import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";
import { Button } from "@repo/ui/button";
import { InputField } from "@repo/ui/input";
import { BankIcon } from "@repo/ui/bankicon";
import { useForm } from "react-hook-form";
import BankAccountValid from "@/component/AddGoals/GoalsForm/ButtonWrapper/BankAccountValid/BankAccountValid";
import { H2 } from "@repo/ui/h2";
import { ChevronRight } from "lucide-react";
import { useAppSelector } from "@/hooks/redux/hooks";
interface IFormInput {
  title: string;
  amount: number;
}
const AddGoalsContent = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const goals = useAppSelector((state) => state.goal);
  console.log(goals);
  return (
    <Wrapper>
      <form>
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
          <Button variant="bankAccount">
            <ButtonWrapper>
              <BankAccountValid>
                <BankIcon />
                <H2>계좌 추가하기</H2>
              </BankAccountValid>
              <ChevronRight />
            </ButtonWrapper>
          </Button>
        </GoalsForm>
      </form>
    </Wrapper>
  );
};
export default AddGoalsContent;
