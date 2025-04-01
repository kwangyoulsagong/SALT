import { Wrapper } from "./Analysis.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import Expenses from "./Expenses/Expenses";
import ExpensesWrapper from "./Expenses/ExpensesWrapper/ExpensesWrapper";
import { P } from "@repo/ui/p";
import { H2 } from "@repo/ui/h2";
import useAnalysis from "@/hooks/api/analysis/useAnalysis";
import { AnalysisProcessService } from "@/service/Analysis/AnalysisProcessService";
import AnalysisGraph from "./Expenses/AnalysisGraph/AnalysisGraph";
const Analysis = () => {
  const { analysisPreview } = useAnalysis();
  if (analysisPreview.isLoading)
    return <div className="loading">Loading...</div>;
  if (analysisPreview.error)
    return (
      <div className="error">
        <p>분석 데이터를 불러오는 중 에러가 발생했습니다.</p>
      </div>
    );

  const { difference, analysis } = analysisPreview.data;

  const AnalysisProcess = new AnalysisProcessService();
  const graphs = AnalysisProcess.Analysis({ data: analysis });

  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="analysis" />
        <H3>이번주 지출 분석</H3>
      </Header>
      <Expenses>
        <ExpensesWrapper>
          <P>지난주 대비</P>
          <H2>{difference}% 덜 썻어요</H2>
        </ExpensesWrapper>
        <AnalysisGraph data={graphs} />
      </Expenses>
    </section>
  );
};
export default Analysis;
