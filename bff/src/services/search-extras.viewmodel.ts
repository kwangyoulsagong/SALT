/**
 * 검색 모달 2단계 뷰모델 — **순수 함수**(`BFF-REQ-054` · 서버 `SRV-REQ-055` · 화면 `FE-REQ-066` FR-8).
 *
 * 서버 값을 화면 계약으로 옮긴다. 순위 · 줄 수 · 창(일주일 · 30일)은 서버가 정했다 — 여기서 다시 자르거나 정렬하지 않는다.
 * 모르는 값은 `null`(0 · 빈 문자열을 지어내지 않는다), 형식이 틀린 줄은 버린다.
 */

export interface SearchSectorVM {
  code: string;
  name: string;
  changeRate: number;
  asOf: string;
}

export interface SearchIndexVM {
  code: string;
  name: string;
  value: number;
  changeRate: number;
  asOf: string;
}

export interface SearchRelatedAssetVM {
  assetType: "crypto" | "kr_stock";
  symbol: string;
  name: string;
  changeRate: number | null;
}

export interface SearchNewsVM {
  id: string;
  market: "kr" | "crypto";
  kind: "news" | "disclosure" | null;
  title: string;
  source: string;
  publishedAt: string;
  url: string | null;
  summary: string | null;
  imageUrl: string | null;
  related: SearchRelatedAssetVM[];
}

export interface SearchGroupsVM {
  sectors: SearchSectorVM[];
  indices: SearchIndexVM[];
  news: SearchNewsVM[];
}

export interface RisingSectorsVM {
  asOf: string | null;
  items: SearchSectorVM[];
}

export interface SearchRelatedRowVM {
  assetType: "crypto" | "kr_stock";
  symbol: string;
  name: string;
  logoUrl: string | null;
  currentPrice: number | null;
  changeRate: number | null;
}

export interface SearchRelatedVM {
  basis: "sector" | "co_tagged" | "none";
  sector: { code: string; name: string; changeRate: number } | null;
  items: SearchRelatedRowVM[];
}

type Raw = Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const iso = (v: unknown): string | null => {
  const s = str(v);
  return s && !Number.isNaN(Date.parse(s)) ? s : null;
};
const list = (v: unknown): Raw[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Raw[]) : []);
const assetTypeOf = (v: unknown): "crypto" | "kr_stock" | null => (v === "crypto" || v === "kr_stock" ? v : null);

const toSector = (raw: Raw): SearchSectorVM[] => {
  const code = str(raw.code);
  const name = str(raw.name);
  const changeRate = num(raw.changeRate);
  const asOf = iso(raw.asOf);
  return code && name && changeRate !== null && asOf ? [{ code, name, changeRate, asOf }] : [];
};

const toRelatedAsset = (raw: Raw): SearchRelatedAssetVM[] => {
  const assetType = assetTypeOf(raw.assetType);
  const symbol = str(raw.symbol);
  return assetType && symbol ? [{ assetType, symbol, name: str(raw.name) ?? symbol, changeRate: num(raw.changeRate) }] : [];
};

export const toSearchGroupsVM = (data: unknown): SearchGroupsVM => {
  const body = (data ?? {}) as Raw;
  return {
    sectors: list(body.sectors).flatMap(toSector),
    indices: list(body.indices).flatMap((raw): SearchIndexVM[] => {
      const code = str(raw.code);
      const name = str(raw.name);
      const value = num(raw.value);
      const changeRate = num(raw.changeRate);
      const asOf = iso(raw.asOf);
      return code && name && value !== null && changeRate !== null && asOf ? [{ code, name, value, changeRate, asOf }] : [];
    }),
    news: list(body.news).flatMap((raw): SearchNewsVM[] => {
      const id = str(raw.id);
      const market = raw.market === "kr" || raw.market === "crypto" ? raw.market : null;
      const title = str(raw.title);
      const publishedAt = iso(raw.publishedAt);
      if (!id || !market || !title || !publishedAt) return [];
      return [
        {
          id,
          market,
          kind: raw.kind === "news" || raw.kind === "disclosure" ? raw.kind : null,
          title,
          source: str(raw.source) ?? "",
          publishedAt,
          // 원문은 http(s) 만 — 화면이 `<a href>` 로 그린다
          url: str(raw.url) && /^https?:\/\//i.test(raw.url as string) ? (raw.url as string) : null,
          summary: str(raw.summary),
          imageUrl: str(raw.imageUrl) && /^https?:\/\//i.test(raw.imageUrl as string) ? (raw.imageUrl as string) : null,
          related: list(raw.related).flatMap(toRelatedAsset),
        },
      ];
    }),
  };
};

export const toRisingSectorsVM = (data: unknown): RisingSectorsVM => {
  const body = (data ?? {}) as Raw;
  return { asOf: iso(body.asOf), items: list(body.items).flatMap(toSector) };
};

export const toSearchRelatedVM = (data: unknown): SearchRelatedVM => {
  const body = (data ?? {}) as Raw;
  const basis = body.basis === "sector" || body.basis === "co_tagged" ? body.basis : "none";
  const rawSector = body.sector && typeof body.sector === "object" ? (body.sector as Raw) : null;
  const sectorCode = str(rawSector?.code);
  const sectorName = str(rawSector?.name);
  const sectorRate = num(rawSector?.changeRate);
  const items = list(body.items).flatMap((raw): SearchRelatedRowVM[] => {
    const assetType = assetTypeOf(raw.assetType);
    const symbol = str(raw.symbol);
    if (!assetType || !symbol) return [];
    return [
      {
        assetType,
        symbol,
        name: str(raw.name) ?? symbol,
        logoUrl: str(raw.logoUrl),
        currentPrice: num(raw.currentPrice),
        changeRate: num(raw.changeRate),
      },
    ];
  });
  return {
    basis: items.length === 0 ? "none" : basis,
    sector: sectorCode && sectorName && sectorRate !== null ? { code: sectorCode, name: sectorName, changeRate: sectorRate } : null,
    items,
  };
};
