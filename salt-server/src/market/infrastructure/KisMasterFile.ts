import { inflateRawSync } from "node:zlib";

import { createHttpClient } from "../../shared/infrastructure";
import type { KrMarket, KrStockListing, KrStockMasterSource } from "../domain";

/**
 * KIS 종목 마스터(`.mst.zip`) — 인증 없이 받는 공개 파일이다(F011 FR-10).
 *
 * ## 형식 (2026-10-07 실측)
 *
 * 한 줄 = 앞부분(단축코드 9 · 표준코드 12 · 한글명 가변, cp949) + 뒤 고정폭(ASCII).
 * 뒤 고정폭은 KOSPI 227바이트 · KOSDAQ 221바이트이고 필드 너비는 KIS 공식 파서(`stocks_info/`)의
 * 표와 같다 — 그 레포에 라이선스가 없어 코드는 옮기지 않고 **너비 표만 사실로** 썼다.
 * 실측 대조: 삼성전자 상장주수 5,846,278천주 · 전일 시총 15,901,877억 · 기준가 272,000.
 *
 * zip 은 항목 하나짜리라 라이브러리 없이 연다(중앙 디렉터리 → 로컬 헤더 → deflate).
 */

const MASTER_URLS: Record<KrMarket, string> = {
  KOSPI: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
  KOSDAQ: "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
};

type FieldName =
  | "group" | "sector" | "overheat" | "basePrice" | "halted" | "administrative"
  | "warn" | "listedAt" | "shares" | "preferred" | "marketCap";

/** 뒤 고정폭에서 쓰는 필드만 — [시작, 끝) 바이트 */
const LAYOUT: Record<KrMarket, { width: number; fields: Record<FieldName, [number, number]> }> = (() => {
  const build = (specs: number[], names: Record<number, FieldName>) => {
    const fields = {} as Record<FieldName, [number, number]>;
    let offset = 0;
    specs.forEach((w, i) => {
      if (names[i]) fields[names[i]] = [offset, offset + w];
      offset += w;
    });
    return { width: offset, fields };
  };
  const tail = [9, 5, 5, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 3, 1, 3, 12, 12, 8, 15, 21, 2, 7, 1];
  // KOSPI: 앞 31개(그룹 2 · 시총규모 1 · 업종 4·4·4 · 플래그 26개 — 22번째가 단기과열)
  const kospi = [2, 1, 4, 4, 4, ...Array(26).fill(1), ...tail, 1, 1, 1, 1, 9, 9, 9, 5, 9, 8, 9, 3, 1, 1, 1];
  // KOSDAQ: 플래그 21개(17번째가 단기과열), 뒤에 KOSPI 열 하나가 없다
  const kosdaq = [2, 1, 4, 4, 4, ...Array(21).fill(1), ...tail, 1, 1, 1, 9, 9, 9, 5, 9, 8, 9, 3, 1, 1, 1];
  const common = (base: number): Record<number, FieldName> => ({
    0: "group",
    2: "sector",
    [base]: "basePrice",
    [base + 3]: "halted",
    [base + 5]: "administrative",
    [base + 6]: "warn",
    [base + 18]: "listedAt",
    [base + 19]: "shares",
    [base + 23]: "preferred",
  });
  return {
    KOSPI: build(kospi, { ...common(31), 22: "overheat", 65: "marketCap" }),
    KOSDAQ: build(kosdaq, { ...common(26), 17: "overheat", 59: "marketCap" }),
  };
})();

const decoder = new TextDecoder("euc-kr"); // WHATWG euc-kr = windows-949(cp949)

const intOrNull = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "" || !/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

/** zip 의 첫 항목을 푼다. 저장 방식은 deflate(8) · 무압축(0) 만 */
export const unzipFirstEntry = (zip: Buffer): Buffer => {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("zip 끝 레코드 없음");
  const centralOffset = zip.readUInt32LE(eocd + 16);
  if (zip.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("zip 중앙 디렉터리 없음");
  const method = zip.readUInt16LE(centralOffset + 10);
  const compressedSize = zip.readUInt32LE(centralOffset + 20);
  const localOffset = zip.readUInt32LE(centralOffset + 42);
  if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("zip 로컬 헤더 없음");
  const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
  const data = zip.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return Buffer.from(data);
  if (method === 8) return inflateRawSync(data);
  throw new Error(`zip 압축 방식 미지원: ${method}`);
};

export const parseMasterFile = (market: KrMarket, raw: Buffer): KrStockListing[] => {
  const { width, fields } = LAYOUT[market];
  const listings: KrStockListing[] = [];

  let start = 0;
  while (start < raw.length) {
    let end = raw.indexOf(0x0a, start);
    if (end < 0) end = raw.length;
    let line = raw.subarray(start, end);
    start = end + 1;
    if (line.length > 0 && line[line.length - 1] === 0x0d) line = line.subarray(0, -1);
    if (line.length <= width + 21) continue;

    const tail = line.subarray(line.length - width).toString("latin1");
    const f = (name: FieldName) => tail.slice(...fields[name]);
    const code = line.subarray(0, 9).toString("latin1").trim();
    if (code === "") continue;

    const listed = f("listedAt").trim();
    const shares = intOrNull(f("shares")); // 천주
    const capEok = intOrNull(f("marketCap")); // 억원

    listings.push({
      code,
      standardCode: line.subarray(9, 21).toString("latin1").trim(),
      name: decoder.decode(line.subarray(21, line.length - width)).trim(),
      market,
      groupCode: f("group").trim(),
      sectorCode: f("sector").trim() || null,
      basePrice: intOrNull(f("basePrice")),
      sharesOutstanding: shares === null ? null : BigInt(shares) * 1000n,
      marketCap: capEok === null ? null : capEok * 100_000_000,
      isHalted: f("halted") === "Y",
      isAdministrative: f("administrative") === "Y",
      warnCode: f("warn").trim() || "00",
      overheatCode: f("overheat").trim() || "0",
      isPreferred: f("preferred").trim() !== "" && f("preferred").trim() !== "0",
      listedAt: /^\d{8}$/.test(listed) ? new Date(`${listed.slice(0, 4)}-${listed.slice(4, 6)}-${listed.slice(6, 8)}T00:00:00Z`) : null,
    });
  }
  return listings;
};

const http = createHttpClient({ timeoutMs: 30_000 });

export class KisMasterFile implements KrStockMasterSource {
  async listings(): Promise<KrStockListing[]> {
    const markets: KrMarket[] = ["KOSPI", "KOSDAQ"];
    const parts = await Promise.all(
      markets.map(async (market) => {
        const response = await http.get<ArrayBuffer>(MASTER_URLS[market], { responseType: "arraybuffer" });
        const listings = parseMasterFile(market, unzipFirstEntry(Buffer.from(response.data)));
        // 한쪽이 비면 받은 파일이 깨진 것이다 — 반쪽 마스터로 상폐 처리하면 수천 종목이 사라진다
        if (listings.length < 500) throw new Error(`${market} 마스터가 비정상적으로 작다: ${listings.length}`);
        return listings;
      })
    );
    return parts.flat();
  }
}
