import { AssetIcon } from "@repo/ui/assetIcon";

import { caseIdentity, caseIdentityName } from "./CoachDetail.css";

interface CaseIdentityProps {
  symbol: string;
  /** 서버가 붙인 종목 이름 · 로고(F011 슬라이스 7b). 못 찾았으면 `null` — 심볼 · 이니셜로 */
  name?: string | null;
  logoUrl?: string | null;
}

/**
 * 판단 사례의 종목 — 아이콘 + 이름. 성적은 판단 유형 **전체** 표본이라 사례가 지금 보는 종목이 아니다 — 어느 종목인지
 * 보여야 한다. 국내 주식 코드는 숫자라 이니셜이 "02" 가 된다 — 이름으로 이니셜을 만든다(보유 요약 · 상세 머리와 같다)
 */
export const CaseIdentity = ({ symbol, name, logoUrl }: CaseIdentityProps) => {
  const label = name ?? symbol;
  return (
    <span className={caseIdentity}>
      <AssetIcon symbol={/^\d/.test(symbol) ? label : symbol} src={logoUrl ?? undefined} name={label} size="sm" />
      <span className={caseIdentityName}>{label}</span>
    </span>
  );
};
