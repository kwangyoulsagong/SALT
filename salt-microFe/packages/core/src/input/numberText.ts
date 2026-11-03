/**
 * 숫자 입력 허용 규칙 — 금액(원) · 소수(금리) · 개수(개월). 플랫폼 무관이라 core(웹 · 앱이 같이 쓴다).
 *
 * **받을 수 없으면 null** — 지우고 이어 붙이지 않는다. 저축 리뷰 3~9차가 같은 결함을 여러 경로로 찾았다:
 * 점 · 전각 점 · 가운뎃점 · 공백을 지우면 1000.5 → 10,005, 쉼표 소수 3,5 → 35%, NFKC 는 ² · ① 까지 숫자로 바꾼다.
 * 그래서 정규화는 **전각 숫자 · 전각 마침표/쉼표만** 반각으로, 그 밖은 허용 목록으로 판정한다. 표는 `numberText.test.ts`.
 */
export type NumberTextKind = "won" | "decimal" | "count";

const FULLWIDTH_DIGIT = /[０-９]/g;

const toAsciiDigits = (text: string): string =>
  text.replace(FULLWIDTH_DIGIT, (d) => String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30));

const groupFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

const group = (digits: string): string => (digits === "" ? "" : groupFormatter.format(Number(digits)));

/** @returns 표시할 글자(금액은 쉼표 묶음) · 받을 수 없으면 null */
export const readNumberText = (raw: string, kind: NumberTextKind): string | null => {
  let text = toAsciiDigits(raw.trim());
  if (kind === "won") {
    // 붙여넣기 편의 — 앞뒤 화폐 표시만 뗀다(가운데 글자는 그대로 판정)
    text = text.replace(/^[₩￦]\s*/, "").replace(/\s*원$/, "").replace(/，/g, ",");
    if (!/^[0-9,]*$/.test(text)) return null;
    return group(text.replace(/,/g, ""));
  }
  if (kind === "decimal") {
    text = text.replace(/%$/, "").replace(/．/g, ".");
    const m = /^([0-9]*)(\.([0-9]*))?$/.exec(text);
    if (!m) return null;
    return text;
  }
  return /^[0-9]*$/.test(text) ? text : null;
};
