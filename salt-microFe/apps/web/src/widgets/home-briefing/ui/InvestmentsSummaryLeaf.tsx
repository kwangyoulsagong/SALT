"use client";

// 클라이언트 잎: 코치 설정(매입가 숨김)을 읽어 보유 요약에 넘긴다. 블록 링크는 서버에 남는다.
import { useCoachProfile } from "@/entities/coach";
import { InvestmentSummary } from "@/entities/portfolio";
import { NavChevron } from "@/shared/ui";

/**
 * 홈 보유 요약 + 매입가 숨김(F009 FR-27 · `FE-REQ-039` FR-13). 두 엔티티를 잇는 것이라 위젯이 한다.
 *
 * 설정을 못 불러왔으면 서버 기본(보임)으로 본다. 오는 중이면 손익률을 아직 그리지 않는다 —
 * 켠 사람에게 한 번 보였다 사라지면 숨김이 아니다.
 */
export const InvestmentsSummaryLeaf = () => {
  const profile = useCoachProfile();
  const purchasePrice =
    profile.isSignedOut || profile.isError
      ? "shown"
      : profile.isPending
        ? "unknown"
        : profile.data.hidePurchasePrice
          ? "hidden"
          : "shown";

  return <InvestmentSummary trailing={<NavChevron size={20} />} purchasePrice={purchasePrice} />;
};
