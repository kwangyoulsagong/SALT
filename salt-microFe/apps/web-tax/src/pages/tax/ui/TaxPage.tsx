import { ZONES } from "@/shared/config";

/**
 * 세금 zone의 진입 경로 (`/tax`).
 *
 * 화면 자체는 F002(세금 마감 콕핏)에서 만든다 — `FE-REQ-018`~`FE-REQ-021`.
 * FE-REQ-007이 여기서 하는 일은 **zone이 실제로 라우팅되는지**를 증명하는 것이다:
 * default zone의 `rewrites`를 타고 들어와, 정적 자산이 `/tax-static/_next/...`로 나간다.
 *
 * default zone으로 돌아가는 링크는 zone을 넘으므로 `<a>`다. `next/link`의 `<Link>`를 쓰면
 * `@repo/zone/no-cross-zone-link`가 lint에서 막는다.
 */
export const TaxPage = () => {
  return (
    <main style={{ margin: "0 auto", maxWidth: 720, padding: 24 }}>
      <h1>세금 마감 콕핏</h1>
      <p>
        이 화면은 <code>{ZONES.tax.app}</code> zone이 서비스한다. 정적 자산은{" "}
        <code>{ZONES.tax.assetPrefix}/_next/…</code>로 나간다.
      </p>
      <p>
        콕핏 본체는 F002에서 만든다 (<code>FE-REQ-018</code>~
        <code>FE-REQ-021</code>).
      </p>
      <p>
        <a href="/">← 홈으로</a>
      </p>
    </main>
  );
};

export default TaxPage;
