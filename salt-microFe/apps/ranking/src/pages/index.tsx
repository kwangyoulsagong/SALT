import Ranking from "@/components/RankingApp/Ranking/Ranking";
import { Card } from "@repo/ui/card";
import { Wrapper } from "@repo/ui/wrapper";
export default function AnalysisApp() {
  return (
    <Wrapper>
      <Card size="lg">
        <Ranking />
      </Card>
    </Wrapper>
  );
}
