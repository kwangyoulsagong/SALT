import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Header } from "@repo/ui/header";
import { Heading } from "@repo/ui/heading";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Section } from "@repo/ui/section";
import { Text } from "@repo/ui/text";
import { Padding } from "@repo/ui/padding";
import AnalysisGraph from "../AnalysisGraph/AnalysisGraph";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { InvestmentsAnalysisProcessService } from "@/service/Investments/InvestmentsAnalysisProcessService";
const MyInvestments = () => {
  const { investmentsPreview } = useInvestments();
  if (investmentsPreview.isLoading)
    return <div className="loading">Loading...</div>;
  if (investmentsPreview.error)
    return (
      <div className="error">
        <p>분석 데이터를 불러오는 중 에러가 발생했습니다.</p>
      </div>
    );
  const { difference, investments } = investmentsPreview.data;
  const AnalysisProcess = new InvestmentsAnalysisProcessService();
  const graphs = AnalysisProcess.InvestmentsAnalysis({ data: investments });
  return (
    <Container size="full">
      <Padding paddingY="md">
        <FlexBox direction="column" gap="md">
          <Header>
            <ServiceIcon variant="analysis" />
            <Heading level={2}>투자 분석</Heading>
          </Header>
          <Container size="full" padding="none">
            <FlexBox justify="between" align="center">
              <FlexBox direction="column" justify="center">
                <Text color="muted">지난주 대비</Text>
                <Heading level={2}>{difference}% 덜 썻어요</Heading>
              </FlexBox>
              <AnalysisGraph data={graphs} />
            </FlexBox>
          </Container>
          <Padding paddingY="sm">
            <FlexBox direction="column">
              <Heading level={2}>주식</Heading>
            </FlexBox>
          </Padding>
        </FlexBox>
      </Padding>
    </Container>
  );
};
export default MyInvestments;
