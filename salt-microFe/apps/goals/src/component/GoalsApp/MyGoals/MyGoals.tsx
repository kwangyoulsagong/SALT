import useGoals from "@/hooks/api/goals/useGoals";
import Footer from "./Footer/Footer";
import { Container } from "./MyGoals.css";
import Section from "./Section/Section";

const MyGoals = () => {
  const { myGoals } = useGoals();

  if (myGoals.isLoading) return <div>Loading...</div>;
  if (myGoals.error) return <div>Error loading goals</div>;
  console.log(myGoals);
  return (
    <section className={Container}>
      <Section />
      <Footer />
    </section>
  );
};
export default MyGoals;
