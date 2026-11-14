import { createHttpClient } from "../../shared/infrastructure/httpClient";
import { withRetry } from "../../shared/infrastructure/retry";
import { unzipFirstEntry } from "../../shared/infrastructure/zip";
import { parseDartCorpCodes } from "../../shared/lib/dartCorpCode";
import { type DartFiling, type DartPort, type DartType, dartParagraphs } from "../domain";
import { decodeHtml } from "./ArticlePageFetcher";

const BASE = "https://opendart.fss.or.kr/api";
/** 목록 응답 상태 — 000 정상 · 013 조회된 데이터 없음. 그 밖(키 · 한도 · 점검)은 던진다 */
const OK = "000";
const EMPTY = "013";

interface ListResponse {
  status: string;
  message: string;
  total_page?: number;
  list?: Array<{ rcept_no: string; stock_code: string; corp_name: string; report_nm: string; rcept_dt: string; flr_nm: string }>;
}

/**
 * OpenDART(`SRV-REQ-058` 원천 ① · F017 v4 2b) — 공시 목록 · 원문. 키는 서버 밖으로 나가지 않는다(로그 · 응답에 0).
 * 조회 GET 이라 429 · 5xx · 응답 없음에만 재시도(지수 3회). 원문은 zip(첫 항목 = 본문 HTML)
 */
export class DartClient implements DartPort {
  private readonly http = createHttpClient({ baseURL: BASE, timeoutMs: 15_000 });

  private corp: { at: number; map: Map<string, string> } | null = null;

  constructor(
    private readonly key: string,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private retryable = (error: unknown) => {
    const status = (error as { response?: { status?: number } }).response?.status;
    return status === undefined || status === 429 || status >= 500;
  };

  list(type: DartType, bgnDe: string, endDe: string, page: number) {
    return this.listWith({ bgn_de: bgnDe, end_de: endDe, pblntf_ty: type, page_no: page });
  }

  listByCorp(corpCode: string, type: DartType, bgnDe: string, endDe: string, page: number) {
    return this.listWith({ corp_code: corpCode, bgn_de: bgnDe, end_de: endDe, pblntf_ty: type, page_no: page });
  }

  /** 고유번호 표 — 하루 한 번(약 3MB zip). 키 오류면 zip 대신 상태가 온다(키는 로그에 0) */
  async corpCodes(): Promise<Map<string, string>> {
    if (this.corp && this.now() - this.corp.at < 24 * 3_600_000) return this.corp.map;
    const res = await withRetry(
      () => this.http.get<ArrayBuffer>("/corpCode.xml", { params: { crtfc_key: this.key }, responseType: "arraybuffer", maxContentLength: 50 * 1024 * 1024 }),
      { isRetryable: this.retryable },
    );
    const body = Buffer.from(res.data);
    if (body.subarray(0, 2).toString("latin1") !== "PK") throw Object.assign(new Error("DART corpCode not zip"), { code: "DART_CORPCODE" });
    const map = parseDartCorpCodes(unzipFirstEntry(body).toString("utf8"));
    this.corp = { at: this.now(), map };
    return map;
  }

  private async listWith(params: Record<string, string | number>) {
    const res = await withRetry(
      () => this.http.get<ListResponse>("/list.json", { params: { crtfc_key: this.key, page_count: 100, ...params } }),
      { isRetryable: this.retryable },
    );
    const body = res.data;
    if (body.status === EMPTY) return { items: [], totalPage: 0 };
    if (body.status !== OK) throw Object.assign(new Error(`DART list ${body.status}`), { code: `DART_${body.status}` });
    const items: DartFiling[] = (body.list ?? [])
      .filter((x) => /^\d{6}$/.test(x.stock_code ?? ""))
      .map((x) => ({ rceptNo: x.rcept_no, stockCode: x.stock_code, corpName: x.corp_name, reportName: x.report_nm, rceptDate: x.rcept_dt, filer: x.flr_nm }));
    return { items, totalPage: body.total_page ?? 1 };
  }

  async document(rceptNo: string): Promise<string[]> {
    const res = await withRetry(
      () => this.http.get<ArrayBuffer>("/document.xml", { params: { crtfc_key: this.key, rcept_no: rceptNo }, responseType: "arraybuffer", maxContentLength: 20 * 1024 * 1024 }),
      { isRetryable: this.retryable },
    );
    const bytes = Buffer.from(res.data);
    // 오류는 zip 이 아니라 XML(상태 코드)로 온다
    if (bytes.subarray(0, 2).toString("latin1") !== "PK") {
      const status = bytes.toString("utf8").match(/<status>(\d+)<\/status>/)?.[1] ?? "unknown";
      throw Object.assign(new Error(`DART document ${status}`), { code: `DART_${status}` });
    }
    return dartParagraphs(decodeHtml(unzipFirstEntry(bytes), undefined));
  }
}
