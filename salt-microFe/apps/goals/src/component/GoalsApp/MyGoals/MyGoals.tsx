import useGoals from "@/hooks/api/goals/useGoals";
import Footer from "./Footer/Footer";
import { Container } from "./MyGoals.css";
import { Padding } from "@repo/ui/padding";
import GoalsInformationSection from "./GoalsInformationSection/GoalsInformationSection";

const MyGoals = () => {
  const { myGoals } = useGoals();

  if (myGoals.isLoading) return <div>Loading...</div>;
  if (myGoals.error) return <div>Error loading goals</div>;
  return (
    <section className={Container}>
      <Padding padding="lg">
        <GoalsInformationSection saved={myGoals.data.saved} />
      </Padding>
      <Footer process={myGoals.data.process} />
    </section>
  );
};
export default MyGoals;
