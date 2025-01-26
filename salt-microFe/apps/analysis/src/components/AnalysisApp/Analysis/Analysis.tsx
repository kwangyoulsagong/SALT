import { Wrapper } from "./Analysis.css";
import Header from "./Header/Header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import Expenses from "./Expenses/Expenses";
import ExpensesWrapper from "./Expenses/ExpensesWrapper/ExpensesWrapper";
import { P } from "@repo/ui/p";
import { H2 } from "@repo/ui/h2";
import useAnalysis from "@/hooks/api/analysis/useAnalysis";
const Analysis = () => {
  const { analysisPreview } = useAnalysis();
  if (analysisPreview.isLoading) return <div>Loading...</div>;
  if (analysisPreview.error) return <div>Error loading goals</div>;
  console.log(analysisPreview.data);
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="analysis" />
        <H3>이번주 지출 분석</H3>
      </Header>
      <Expenses>
        <ExpensesWrapper>
          <P>지난주 대비</P>
          <H2>15% 덜 썻어요</H2>
        </ExpensesWrapper>
      </Expenses>
    </section>
  );
};
export default Analysis;
