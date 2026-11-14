/**
 * DART 고유번호 표(`corpCode.xml` 압축을 푼 글자) → 종목 코드 → 고유번호. 상장사만(종목 코드가 있는 행). 순수.
 * 국내 로고(`market` 홈페이지 찾기)와 공시 백필(`news`)이 같이 쓴다
 */
export const parseDartCorpCodes = (xml: string): Map<string, string> => {
  const map = new Map<string, string>();
  for (const item of xml.matchAll(/<list>([\s\S]*?)<\/list>/g)) {
    const corp = /<corp_code>\s*(\d{8})\s*<\/corp_code>/.exec(item[1]!)?.[1];
    const stock = /<stock_code>\s*([0-9A-Z]{6})\s*<\/stock_code>/.exec(item[1]!)?.[1];
    if (corp && stock) map.set(stock, corp);
  }
  return map;
};
