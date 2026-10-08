import { createHttpClient } from "../../shared/infrastructure";
import { logger } from "../../shared/config/logger";
import { normalizeHomepageDomain, type KrCompanyHomepageSource, type KrLogoImageProbe } from "../domain";
import { unzipFirstEntry } from "./KisMasterFile";
import { decodePng } from "./pngDecode";

/**
 * 국내 주식 로고 판정의 외부 연동(F011 FR-47) — 둘 다 **트랜잭션 밖에서** 부른다(`ResolveKrStockLogos`).
 */

/** logo.dev 이미지 — PNG 를 받아 RGBA 로. 404 = 그 출처에 로고 없음(`null`). 그 밖 실패는 던진다(판정을 미룬다) */
export class LogoDevImageProbe implements KrLogoImageProbe {
  private readonly http = createHttpClient({ timeoutMs: 8_000 });

  async fetchRgba(url: string) {
    const response = await this.http.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      validateStatus: (status) => status === 200 || status === 404,
    });
    if (response.status === 404) return null;
    return decodePng(Buffer.from(response.data));
  }
}

const DART_BASE = "https://opendart.fss.or.kr/api";
/** DART 는 하루 2만 건 · 분당 한도가 있다 — 유니버스(≤ 수백)만 부르고 사이를 둔다 */
const DART_GAP_MS = 150;

/**
 * DART 기업개황 — 종목 코드 → 고유번호(`corpCode.xml` zip, 상장 · 비상장 전부) → `company.json` 의 `hm_url`(홈페이지).
 * 고유번호 표는 프로세스 수명 동안 한 번 받는다(약 10만 행 · 수 MB). 키(`DART_API_KEY`)가 없으면 이 클래스를 만들지 않는다
 */
export class DartHomepageSource implements KrCompanyHomepageSource {
  private readonly http = createHttpClient({ baseURL: DART_BASE, timeoutMs: 30_000 });
  private corpCodes: Map<string, string> | null = null;

  constructor(private readonly apiKey: string) {}

  private async corpCodeByStock(): Promise<Map<string, string>> {
    if (this.corpCodes) return this.corpCodes;
    const response = await this.http.get<ArrayBuffer>("/corpCode.xml", {
      params: { crtfc_key: this.apiKey },
      responseType: "arraybuffer",
    });
    const body = Buffer.from(response.data);
    // 키 오류면 zip 대신 상태 XML/JSON 이 온다 — 내용(키)을 로그에 남기지 않는다
    if (body.subarray(0, 2).toString("latin1") !== "PK") throw new Error("DART corpCode 응답이 zip 이 아니다(키 확인)");
    const xml = unzipFirstEntry(body).toString("utf8");
    const map = new Map<string, string>();
    for (const item of xml.matchAll(/<list>([\s\S]*?)<\/list>/g)) {
      const corp = /<corp_code>\s*(\d{8})\s*<\/corp_code>/.exec(item[1]!)?.[1];
      const stock = /<stock_code>\s*([0-9A-Z]{6})\s*<\/stock_code>/.exec(item[1]!)?.[1];
      if (corp && stock) map.set(stock, corp);
    }
    this.corpCodes = map;
    return map;
  }

  async homepages(codes: string[]) {
    const out = new Map<string, string | null>();
    if (codes.length === 0) return out;
    const corpCodes = await this.corpCodeByStock();
    for (const code of codes) {
      const corp = corpCodes.get(code);
      if (!corp) {
        out.set(code, null);
        continue;
      }
      try {
        const { data } = await this.http.get<{ status?: string; hm_url?: string }>("/company.json", {
          params: { crtfc_key: this.apiKey, corp_code: corp },
        });
        // 000 정상 · 013 데이터 없음 — 그 밖(한도 020 · 키 010 등)은 이번 회차를 멈춘다(빈 값으로 저장하지 않는다)
        if (data.status === "000") out.set(code, normalizeHomepageDomain(data.hm_url));
        else if (data.status === "013") out.set(code, null);
        else {
          logger.warn(`DART 기업개황 중단 — status ${data.status}`);
          break;
        }
      } catch (error) {
        logger.warn(`DART 기업개황 실패 ${code}: ${(error as Error).message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, DART_GAP_MS));
    }
    return out;
  }
}
