/**
 * AI 경로 매체 목록(`SRV-REQ-058` FR-1) — 원본은 이 코드 한 곳이고 `news_outlet` 표는 기동 때 이 목록 + robots 판정으로 다시 쓴다.
 *
 * 켜짐 = 약관 판정이 `ok` 이고 robots 가 AI 토큰 전부에 허락(`Robots.ts`). 약관 판정은 사람이 원문을 읽고 적는다 — 그 매체 자신의
 * 이용약관 · 저작권 정책에서 **자동 수집이나 AI 이용을 명시적으로 막으면 `blocks`**(사용자 결정 "약관 위반 원천은 쓰지 않는다").
 * 막힌 매체도 목록에 남긴다 — 덮임률 리포트가 "막혀서 못 덮는 몫"을 따로 센다(FR-6).
 *
 * `aliases` = 우리 원장이 그 매체를 부르는 이름들: 국내 시황 제목의 제공처 이름(KIS) · 구글 뉴스 제목 꼬리(" - 매체") · 코인 원장 `source`.
 */

/** AI 경로 본문이 어디서 왔나 — `portal` 행은 AI 가 읽지 않는다(`isAiReadable`) */
export type AiBodyVia = "rss_direct" | "dart" | "coin_rss" | "outlet_list" | "portal";

/** AI 가 읽어도 되는 원천 — 허용 목록(`portal` · 모르는 값은 빠진다) */
const AI_VIAS: readonly AiBodyVia[] = ["rss_direct", "dart", "coin_rss", "outlet_list"];
export const isAiReadable = (via: string): boolean => AI_VIAS.includes(via as AiBodyVia);

export type OutletTermsVerdict = "ok" | "blocks" | "unchecked";

export interface OutletDef {
  id: string;
  name: string;
  market: "kr" | "coin";
  aliases: string[];
  /** 매체가 직접 내는 RSS — 비어 있으면 잇기 없이 원장 주소가 곧 원문(`directSources`) */
  feeds: string[];
  /** 원장 기사 주소가 이미 이 매체 원문인 원천(코인 영문 RSS) — 잇기 없이 그 주소를 받는다 */
  directSources?: string[];
  via: Exclude<AiBodyVia, "portal" | "dart">;
  terms: { verdict: OutletTermsVerdict; note: string; checkedOn: string | null };
}

const KR_BLOCKED_ROBOTS = "robots — AI 봇(ClaudeBot · GPTBot 등) 전부 막음";

export const OUTLETS: readonly OutletDef[] = [
  // ── 국내 — 켜짐(약관에 자동 수집 · AI 금지 명시 없음, 2026-11-14 원문 확인)
  {
    id: "infostock", name: "인포스탁데일리", market: "kr", aliases: ["인포스탁", "인포스탁데일리"],
    feeds: ["https://www.infostockdaily.co.kr/rss/allArticle.xml"], via: "rss_direct",
    terms: { verdict: "ok", note: "service.html · copy.html — 일반 저작권 조항뿐, 자동 수집 · AI 금지 없음", checkedOn: "2026-11-14" },
  },
  {
    id: "fnnews", name: "파이낸셜뉴스", market: "kr", aliases: ["파이낸셜", "파이낸셜뉴스"],
    feeds: ["https://www.fnnews.com/rss/r20/fn_realnews_all.xml", "https://www.fnnews.com/rss/r20/fn_realnews_stock.xml"], via: "rss_direct",
    terms: { verdict: "ok", note: "userinfo/copyright — '개인적 참조나 교육 목적등 비영리적 사용에는 예외적으로 허용'(출처 명시). 재사용 저장 불허 → 문단은 추출 뒤 지움 · 사실만 · 매체 이름 · 원문 링크", checkedOn: "2026-11-14" },
  },
  {
    id: "cstimes", name: "컨슈머타임스", market: "kr", aliases: ["컨슈머타임스"],
    feeds: ["https://www.cstimes.com/rss/allArticle.xml"], via: "rss_direct",
    terms: { verdict: "ok", note: "service.html · copy.html — 일반 저작권 조항뿐", checkedOn: "2026-11-14" },
  },
  // ── 국내 — 꺼짐(약관이 막음)
  { id: "hankyung", name: "한국경제", market: "kr", aliases: ["한국경제신문", "한국경제"], feeds: ["https://www.hankyung.com/feed/all-news"], via: "rss_direct",
    terms: { verdict: "blocks", note: "운영정책 제19조 데이터 크롤링 및 생성형 AI 학습 데이터 이용 — 사전 서면 허락 없이 수집 금지", checkedOn: "2026-11-14" } },
  { id: "etoday", name: "이투데이", market: "kr", aliases: ["이투데이"], feeds: ["https://rss.etoday.co.kr/eto/etoday_news_all.xml"], via: "rss_direct",
    terms: { verdict: "blocks", note: "이용약관 제15조 인공지능 학습 및 대량 크롤링", checkedOn: "2026-11-14" } },
  { id: "newspim", name: "뉴스핌", market: "kr", aliases: ["뉴스핌"], feeds: ["https://rss.newspim.com/news/category/105"], via: "rss_direct",
    terms: { verdict: "blocks", note: "저작권 정책 — AI 학습 · 크롤링 · 자동수집 · 기사 요약 서비스 금지", checkedOn: "2026-11-14" } },
  { id: "mt", name: "머니투데이", market: "kr", aliases: ["머니투데이"], feeds: ["https://rss.mt.co.kr/mt_news.xml"], via: "rss_direct",
    terms: { verdict: "blocks", note: "이용약관 제18조 인공지능 학습 및 크롤링 제한 — 비상업도 사전 합의", checkedOn: "2026-11-14" } },
  { id: "edaily", name: "이데일리", market: "kr", aliases: ["이데일리"], feeds: ["http://rss.edaily.co.kr/edaily_news.xml"], via: "rss_direct",
    terms: { verdict: "blocks", note: "E04_04 — 비영리 목적이라도 사전 서면 허가 없이 사용 불가", checkedOn: "2026-11-14" } },
  { id: "dealsite", name: "딜사이트", market: "kr", aliases: ["딜사이트"], feeds: [], via: "rss_direct",
    terms: { verdict: "blocks", note: "policy/agree — 크롤링 · 스크래핑 · AI 학습데이터 이용 금지", checkedOn: "2026-11-14" } },
  // ── 국내 — 꺼짐(robots 가 AI 봇을 막음 — 약관은 읽지 않았다)
  ...(
    [
      ["yna", "연합뉴스", ["연합뉴스"]],
      ["mk", "매일경제", ["매일경제"]],
      ["sedaily", "서울경제", ["서울경제"]],
      ["herald", "헤럴드경제", ["헤럴드경제"]],
      ["chosunbiz", "조선비즈", ["조선경제i", "Chosunbiz", "조선비즈"]],
      ["nspna", "NSP통신", ["NSP통신"]],
      ["asiae", "아시아경제", ["아시아 경제", "아시아경제"]],
    ] as const
  ).map(([id, name, aliases]): OutletDef => ({
    id, name, market: "kr", aliases: [...aliases], feeds: [], via: "rss_direct",
    terms: { verdict: "blocks", note: KR_BLOCKED_ROBOTS, checkedOn: "2026-11-14" },
  })),

  // ── 코인 — 2026-11-14 원문 확인(`unchecked` = 꺼짐 — 새 매체는 읽고 켠다)
  { id: "tokenpost", name: "토큰포스트", market: "coin", aliases: ["토큰포스트"], feeds: ["https://www.tokenpost.kr/rss"], via: "rss_direct",
    terms: { verdict: "ok", note: "policy/terms — 일반 조항뿐 · robots 가 ClaudeBot 을 명시 허락", checkedOn: "2026-11-14" } },
  { id: "bloomingbit", name: "블루밍비트", market: "coin", aliases: ["블루밍비트"], feeds: ["https://bloomingbit.io/rss.xml"], via: "rss_direct",
    terms: { verdict: "ok", note: "terms/service — 자동 수집 · AI 금지 없음(AI 언급은 자기 서비스 정의뿐)", checkedOn: "2026-11-14" } },
  { id: "digitaltoday", name: "디지털투데이", market: "coin", aliases: ["디지털투데이"], feeds: ["https://www.digitaltoday.co.kr/rss/allArticle.xml"], via: "rss_direct",
    terms: { verdict: "ok", note: "copyright · service — 승낙 없는 복제 · 전송 금지뿐, 수집 · AI 금지 없음. 문장 저장 · 표시 0", checkedOn: "2026-11-14" } },
  { id: "digitalasset", name: "디지털애셋", market: "coin", aliases: ["디지털애셋"], feeds: ["https://www.digitalasset.works/rss/allArticle.xml"], via: "rss_direct",
    terms: { verdict: "ok", note: "service · copyright — 일반 저작권 조항뿐", checkedOn: "2026-11-14" } },
  { id: "coinreaders", name: "코인리더스", market: "coin", aliases: ["코인리더스"], feeds: ["https://www.coinreaders.com/rss/rss_news.php"], via: "rss_direct",
    terms: { verdict: "blocks", note: "robots — GPTBot 전부 막음", checkedOn: "2026-11-14" } },
  { id: "cointelegraph", name: "Cointelegraph", market: "coin", aliases: ["Cointelegraph"], feeds: [], directSources: ["cointelegraph"], via: "coin_rss",
    terms: { verdict: "blocks", note: "terms-and-privacy — automated scraping strictly prohibited", checkedOn: "2026-11-14" } },
  { id: "cryptoslate", name: "CryptoSlate", market: "coin", aliases: ["CryptoSlate"], feeds: [], directSources: ["cryptoslate"], via: "coin_rss",
    terms: { verdict: "blocks", note: "terms-and-conditions — bots · scripts · AI training pipelines 금지", checkedOn: "2026-11-14" } },
  { id: "coindesk", name: "CoinDesk", market: "coin", aliases: ["CoinDesk"], feeds: [], directSources: ["coindesk"], via: "coin_rss",
    terms: { verdict: "blocks", note: KR_BLOCKED_ROBOTS, checkedOn: "2026-11-14" } },
  { id: "blockmedia", name: "블록미디어", market: "coin", aliases: ["블록미디어"], feeds: [], via: "rss_direct",
    terms: { verdict: "blocks", note: KR_BLOCKED_ROBOTS, checkedOn: "2026-11-14" } },
  { id: "blockchaintoday", name: "블록체인투데이", market: "coin", aliases: ["블록체인투데이"], feeds: [], via: "rss_direct",
    terms: { verdict: "blocks", note: KR_BLOCKED_ROBOTS, checkedOn: "2026-11-14" } },
];

/** 이름 → 매체. 같은 이름이 두 매체에 있으면 목록이 틀린 것(시험이 본다) */
export const outletByAlias = (outlets: readonly OutletDef[]): Map<string, OutletDef> => {
  const map = new Map<string, OutletDef>();
  for (const o of outlets) {
    for (const a of [...o.aliases, ...(o.directSources ?? [])]) map.set(a.toLowerCase(), o);
  }
  return map;
};

/** 구글 뉴스 제목 꼬리(" - 매체")에서 매체 이름 — 없으면 `null` */
export const titleOutletSuffix = (title: string): string | null => title.match(/\s+-\s+([^-]+)$/)?.[1]?.trim() ?? null;
