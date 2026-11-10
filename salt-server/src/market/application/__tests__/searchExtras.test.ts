import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanKrNewsTitle,
  currentSectors,
  matchesName,
  matchKrIndexCodes,
  rankCoTagged,
  type KrMoveSourceStore,
  type KrStockStore,
  type KrSupplementStore,
  type MarketAssetRepository,
  type MarketAssetView,
  type SectorBoardRow,
  type StoredKrNewsTitle,
  type StoredKrStockQuote,
  type SymbolNewsPort,
  type TaggedNewsItem,
} from "../../domain";
import { ReadRisingSectors, ReadSearchRelated, SearchResultGroups, type SearchKrSource } from "../SearchExtras";

/**
 * 검색 모달 2단계(`SRV-REQ-055` · `FE-REQ-066` FR-8) — 업종 · 지수 · 뉴스 묶음 · 뜨는 업종 · 곁 칸.
 */

const NOW = new Date("2026-11-10T03:00:00Z");
const at = (iso: string) => new Date(iso);

const sector = (code: string, name: string | null, changeRate: number, tradeDate = "2026-11-10"): SectorBoardRow => ({
  code,
  name,
  tradeDate,
  changeRate,
  updatedAt: at(`${tradeDate}T02:${code.slice(-2)}:00Z`),
});

const BOARD: SectorBoardRow[] = [
  sector("0013", "전기·전자", 0.73),
  sector("0025", "보험", 0.41),
  sector("0009", "제약", 0.24),
  sector("0021", "금융", -0.6),
  sector("0027", null, -7.05, "2026-11-06"), // 이름 없음 · 지난 날
  sector("0011", "금속", -9.9, "2026-11-06"), // 이름 있음 · 지난 날
];

const view = (symbol: string, o: Partial<MarketAssetView> = {}): MarketAssetView => ({
  symbol,
  market: `KRW-${symbol}`,
  koreanName: `코인${symbol}`,
  englishName: symbol,
  currentPrice: 100,
  change24h: 1.5,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
  tradeValue24h: 0,
  logoUrl: `https://logo/${symbol}.png`,
  priceUpdatedAt: NOW,
  ...o,
});

const krQuote = (code: string, changeRate: number): StoredKrStockQuote =>
  ({ code, name: `종목${code}`, market: "KOSPI", price: 1000.4, changeRate, homepage: null, logoSource: null }) as unknown as StoredKrStockQuote;

describe("SearchExtras 규칙", () => {
  it("이름 일치 — 공백 · 가운뎃점 · 대소문자를 같게 본다, 빈 검색어는 아무것도 맞지 않는다", () => {
    const table: Array<[string, string, boolean]> = [
      ["전기", "전기·전자", true],
      ["전기전자", "전기·전자", true],
      ["전기 전자", "전기·전자", true],
      ["전자", "전기·전자", true],
      ["보험", "전기·전자", false],
      ["  ", "전기·전자", false],
      ["", "보험", false],
    ];
    for (const [q, name, expected] of table) assert.equal(matchesName(q, name), expected, `${q} ~ ${name}`);
  });

  it("지수 — 이름 · 영문 · 붙여 쓴 별칭으로 찾는다", () => {
    assert.deepEqual(matchKrIndexCodes("코스피"), ["0001", "2001"]);
    assert.deepEqual(matchKrIndexCodes("kospi"), ["0001", "2001"]);
    assert.deepEqual(matchKrIndexCodes("코스피200"), ["2001"]);
    assert.deepEqual(matchKrIndexCodes("코스닥"), ["1001"]);
    assert.deepEqual(matchKrIndexCodes("삼성"), []);
  });

  it("업종 순위 — 가장 늦은 거래일 · 이름 있는 것만 · 등락률 높은 순", () => {
    assert.deepEqual(
      currentSectors(BOARD).map((s) => s.code),
      ["0013", "0025", "0009", "0021"]
    );
    assert.deepEqual(currentSectors([]), []);
  });

  it("함께 태그 — 자기 제외 · 많이 나온 순 · 같으면 심볼 순 · 한 기사 중복 태그는 한 번", () => {
    const lists = [["BTC", "ETH", "ETH"], ["btc", "SOL", "ETH"], ["BTC", "XRP"], ["BTC", "SOL"]];
    assert.deepEqual(rankCoTagged("btc", lists, 3), ["ETH", "SOL", "XRP"]);
    assert.deepEqual(rankCoTagged("BTC", [["BTC"]], 3), []);
  });
});

const krTitle = (serial: string, title: string, publishedAt: string, code = "005930"): StoredKrNewsTitle => ({
  serial,
  kind: "news",
  providerName: "인포스탁",
  publishedAt: at(publishedAt),
  title,
  related: [{ code, name: "삼성전자", changeRate: 1.2 }],
});

const coinArticle = (id: string, title: string, publishedAt: string, symbols: string[]): TaggedNewsItem => ({
  id,
  title,
  summary: null,
  url: `https://news/${id}`,
  source: "coindesk",
  publishedAt: at(publishedAt),
  imageUrl: null,
  symbols,
});

const setup = (o: { tagLists?: string[][]; coin?: TaggedNewsItem[]; kr?: StoredKrNewsTitle[] } = {}) => {
  const calls = { newsSince: [] as Date[], krSearch: 0 };
  const news = {
    searchTitles: async (_q: string, since: Date) => {
      calls.newsSince.push(since);
      return o.coin ?? [];
    },
    tagLists: async () => o.tagLists ?? [],
  } as unknown as SymbolNewsPort;
  const assets = {
    findViews: async (symbols: string[]) => symbols.filter((s) => s !== "UNLISTED").map((s) => view(s)),
  } as unknown as MarketAssetRepository;
  const universe = [krQuote("005930", 1.1), krQuote("000660", 3.2), krQuote("066570", -0.5), krQuote("035420", 2.0)];
  const sectorByCode = new Map([
    ["005930", "0013"],
    ["000660", "0013"],
    ["066570", "0013"],
    ["035420", "0029"],
  ]);
  const kr: SearchKrSource = {
    store: { quotes: async () => universe } as unknown as KrStockStore,
    moveSources: {
      sectorBoard: async () => BOARD,
      searchNewsTitles: async () => {
        calls.krSearch++;
        return o.kr ?? [];
      },
      sectorIndexCodes: async (codes: string[]) =>
        new Map(codes.flatMap((c) => (sectorByCode.has(c) ? [[c, sectorByCode.get(c)!] as [string, string]] : []))),
    } as unknown as KrMoveSourceStore,
    supplement: {
      indexQuotes: async (codes: string[]) =>
        codes.filter((c) => c !== "2001").map((code) => ({ code, value: 4000, changeRate: 0.5, updatedAt: NOW })),
    } as unknown as KrSupplementStore,
  };
  return { news, assets, kr, calls };
};

describe("SearchResultGroups", () => {
  it("누구나(ADR-011) — 지수 · 뉴스(국내 + 코인, 최신 순) · 뉴스 창은 일주일", async () => {
    const { news, assets, kr, calls } = setup({
      kr: [krTitle("1", "코스피 마감 시황", "2026-11-10T01:00:00Z")],
      coin: [coinArticle("a", "코스피 따라 코인도", "2026-11-10T02:00:00Z", ["BTC", "UNLISTED"])],
    });
    const result = await new SearchResultGroups(news, assets, kr, () => NOW).execute({ q: " 코스피 " });
    assert.deepEqual(result.sectors, []);
    assert.deepEqual(
      result.indices.map((i) => [i.code, i.name]),
      [["0001", "코스피"]] // 코스피 200 은 시세 행이 없어 빠진다
    );
    assert.deepEqual(result.news.map((n) => [n.market, n.id]), [["crypto", "a"], ["kr", "1"]]);
    assert.deepEqual(result.news[0]!.related.map((r) => r.symbol), ["BTC"]); // 시세 표에 없는 태그는 갈 곳이 없다
    assert.equal(calls.newsSince[0]!.toISOString(), "2026-11-03T03:00:00.000Z");
  });

  it("업종 이름 일치 — 지난 날 업종은 빠진다", async () => {
    const { news, assets, kr } = setup();
    const result = await new SearchResultGroups(news, assets, kr, () => NOW).execute({ q: "금" });
    assert.deepEqual(result.sectors.map((s) => s.code), ["0021"]); // 금속(11-06)은 빠짐
  });

  it("국내 키 없음 — 국내 칸은 읽지도 않는다, 코인 기사만", async () => {
    const { news, assets, calls } = setup({ coin: [coinArticle("a", "전기차 코인", "2026-11-10T02:00:00Z", [])] });
    const result = await new SearchResultGroups(news, assets, null, () => NOW).execute({ q: "전기" });
    assert.deepEqual(result.sectors, []);
    assert.deepEqual(result.indices, []);
    assert.equal(calls.krSearch, 0);
    assert.deepEqual(result.news.map((n) => n.id), ["a"]);
  });

  it("빈 검색어 — 아무것도 읽지 않는다", async () => {
    const { news, assets, kr, calls } = setup();
    const result = await new SearchResultGroups(news, assets, kr, () => NOW).execute({ q: "  " });
    assert.deepEqual(result, { sectors: [], indices: [], news: [] });
    assert.equal(calls.newsSince.length, 0);
  });
});

describe("ReadRisingSectors", () => {
  it("누구나(ADR-011) — 순위 + 기준 시각(가장 늦은 값)", async () => {
    const { kr } = setup();
    const result = await new ReadRisingSectors(kr).execute({ limit: 2 });
    assert.deepEqual(result.items.map((s) => s.name), ["전기·전자", "보험"]);
    assert.equal(result.asOf?.toISOString(), "2026-11-10T02:25:00.000Z");
  });

  it("국내 키 없음 — 빈 목록(404 아님)", async () => {
    assert.deepEqual(await new ReadRisingSectors(null).execute({ limit: 5 }), { asOf: null, items: [] });
  });
});

describe("ReadSearchRelated", () => {
  it("국내 종목 — 같은 업종 유니버스 종목 · 자기 제외 · 등락률 높은 순 · 업종 등락률 같이", async () => {
    const { news, assets, kr } = setup();
    const result = await new ReadSearchRelated(news, assets, kr, () => NOW).execute({
      assetType: "kr_stock",
      symbol: "005930",
    });
    assert.equal(result.basis, "sector");
    assert.deepEqual(result.sector, { code: "0013", name: "전기·전자", changeRate: 0.73 });
    assert.deepEqual(result.items.map((i) => i.symbol), ["000660", "066570"]);
    assert.equal(result.items[0]!.currentPrice, 1000); // 원 단위 정수
  });

  it("업종 — 구성 종목, 지금 순위에 없는 업종은 none", async () => {
    const { news, assets, kr } = setup();
    const read = new ReadSearchRelated(news, assets, kr, () => NOW);
    const members = await read.execute({ sector: "0013" });
    assert.deepEqual(members.items.map((i) => i.symbol), ["000660", "005930", "066570"]);
    assert.equal((await read.execute({ sector: "0011" })).basis, "none"); // 11-06 에 멈춘 업종
  });

  it("업종 분류가 없는 종목 · 국내 키 없음 — none", async () => {
    const { news, assets, kr } = setup();
    const read = new ReadSearchRelated(news, assets, kr, () => NOW);
    assert.equal((await read.execute({ assetType: "kr_stock", symbol: "999999" })).basis, "none");
    const disabled = new ReadSearchRelated(news, assets, null, () => NOW);
    assert.equal((await disabled.execute({ assetType: "kr_stock", symbol: "005930" })).basis, "none");
  });

  it("코인 — 함께 태그된 코인 3, 시세 표에 없는 태그는 건너뛴다, 없으면 none", async () => {
    const { news, assets, kr } = setup({
      tagLists: [["BTC", "UNLISTED"], ["BTC", "UNLISTED", "ETH"], ["BTC", "ETH", "SOL"], ["BTC", "XRP"], ["BTC", "ADA"]],
    });
    const read = new ReadSearchRelated(news, assets, kr, () => NOW);
    const result = await read.execute({ assetType: "crypto", symbol: "BTC" });
    assert.equal(result.basis, "co_tagged");
    assert.deepEqual(result.items.map((i) => i.symbol), ["ETH", "ADA", "SOL"]);
    const empty = await new ReadSearchRelated(setup().news, assets, kr, () => NOW).execute({ assetType: "crypto", symbol: "BTC" });
    assert.deepEqual(empty, { basis: "none", sector: null, items: [] });
  });
});

describe("cleanKrNewsTitle", () => {
  it("줄바꿈 → 띄어쓰기 · 0x1A → 가운뎃점 · 겹친 띄어쓰기 하나 · 보통 제목은 그대로", () => {
    const table: Array<[string, string]> = [
      ["삼성전기\x1aAI 기판", "삼성전기·AI 기판"],
      ["[리포트 브리핑]KB금융, '주주환원 4조'\n 목표가 220,000원", "[리포트 브리핑]KB금융, '주주환원 4조' 목표가 220,000원"],
      ["  앞뒤\t탭\r\n  ", "앞뒤 탭"],
      ["노브랜드 버거, 기안84 모델 발탁", "노브랜드 버거, 기안84 모델 발탁"],
    ];
    for (const [raw, expected] of table) assert.equal(cleanKrNewsTitle(raw), expected, JSON.stringify(raw));
  });
});
