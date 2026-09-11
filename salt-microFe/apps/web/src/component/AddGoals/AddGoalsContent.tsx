"use client";

// 클라이언트 잎: react-hook-form 을 쓴다.
import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";
import { Button } from "@repo/ui/button";
import { InputField } from "@repo/ui/input";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "@/hooks/redux/hooks";
import SubmitButtonWrapper from "./SubmitButtonWrapper/SubmitButtonWrapper";

interface IFormInput {
  title: string;
  amount: number;
}

const AddGoalsContent = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const goals = useAppSelector((state) => state.goal);

  // `account.selected` 이벤트 버스 구독을 제거했다 (FE-REQ-007 FR-7).
  // 계좌 연동 자체가 제품 범위에서 빠졌고(FEATURE-000, 원장은 100% 수기 입력),
  // 발행하는 쪽이 없어 payload 는 항상 null 이었다.
  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    console.log(data);
    console.log(goals);
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
        </GoalsForm>
        <SubmitButtonWrapper>
          <Button type="submit" fullWidth>
            추가하기
          </Button>
        </SubmitButtonWrapper>
      </form>
    </Wrapper>
  );
};
export default AddGoalsContent;
