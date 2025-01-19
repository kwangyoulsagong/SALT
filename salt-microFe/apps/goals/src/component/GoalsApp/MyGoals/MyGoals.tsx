import Footer from "./Footer/Footer";
import { Container } from "./MyGoals.css";
import Section from "./Section/Section";

const MyGoals = () => {
  return (
    <section className={Container}>
      <Section />
      <Footer />
    </section>
  );
};
export default MyGoals;
