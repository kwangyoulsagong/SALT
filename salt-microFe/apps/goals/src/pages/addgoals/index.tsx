import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";

export default function AddGoal() {
  return (
    <Wrapper>
      <GoalsForm>
        <CategoriesWrapper />
      </GoalsForm>
    </Wrapper>
  );
}
