import { Container } from "@repo/ui/container";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@/shared/ui";

import { SIGNAL_EVIDENCE_PAGE } from "../model";
import { SignalEvidenceBody } from "./SignalEvidenceBody";

interface SignalEvidencePageProps {
  params: Promise<{ signalType: string }>;
}

/**
 * 판정 근거 상세 (`/coach/signals/[signalType]`) — 서버 컴포넌트 (F004 FR-33 · `FE-REQ-026` FR-141).
 *
 * 코치 리포트 성적표 그룹에서 들어온다. 라우트 키를 풀어 본문에 넘기는 것까지만 한다(`fsd-pages.md`) —
 * 키가 성적표에 있는지는 본문이 응답을 보고 정한다(없으면 "기록 없음", 오류가 아니다).
 * 키는 `[a-z_.]` 뿐이라 인코딩이 바뀌지 않는다 — 다시 풀지 않는다(`%` 가 섞인 주소에서 `decodeURIComponent` 가 던진다).
 */
export const SignalEvidencePage = async ({ params }: SignalEvidencePageProps) => {
  const { signalType } = await params;
  return (
    <Root background="transparent">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Padding paddingX="xl">
            <BlockBoundary name={SIGNAL_EVIDENCE_PAGE.blockName} minHeight={SIGNAL_EVIDENCE_PAGE.blockMinHeight}>
              <SignalEvidenceBody signalType={signalType} />
            </BlockBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default SignalEvidencePage;
