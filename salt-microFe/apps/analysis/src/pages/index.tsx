import Analysis from "@/components/AnalysisApp/Analysis/Analysis";
import { Wrapper } from "@repo/ui/wrapper";
import { Card } from "@repo/ui/card";
export default function AnalysisApp() {
  return (
    <Wrapper>
      <Card size="lg">
        <Analysis />
      </Card>
    </Wrapper>
  );
}
