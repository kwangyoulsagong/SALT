import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";
import { InputField } from "@repo/ui/input";
import { useForm } from "react-hook-form";

interface IFormInput {
  title: string;
  amount: number;
}
export default function AddGoal() {
  const { register, handleSubmit } = useForm<IFormInput>();
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
        </GoalsForm>
      </form>
    </Wrapper>
  );
}
