import dynamic from "next/dynamic";
import Header from "@/components/Home/Header/Header";
import {
  createRemoteLoading,
  RemoteBoundary,
} from "@/components/Remote/RemoteBoundary";
import Tip from "@/components/TipsApp/TipsApp";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

const Goals = dynamic(() => import("goals/GoalsApp"), {
  loading: createRemoteLoading("목표"),
});
const Investments = dynamic(() => import("investments/InvestmentsApp"), {
  loading: createRemoteLoading("투자"),
});

export default function HomePage() {
  return (
    <Container size="full" padding="none">
      <FlexBox direction="column" justify="center" gap="lg">
        <Header />
        <RemoteBoundary name="목표">
          <Goals />
        </RemoteBoundary>
        <RemoteBoundary name="투자">
          <Investments />
        </RemoteBoundary>
        <Tip />
      </FlexBox>
    </Container>
  );
}
