import { logger } from "../../shared/config/logger";
import {
  createHttpClient,
  createRatePacer,
  prisma,
  withRetry,
  type RatePacer,
} from "../../shared/infrastructure";
import type { Candle, KrMarketDay, KrStockQuoteFact, KrStockQuotePort } from "../domain";

/**
 * 한국투자증권 Open API — **국내 주식 시세 조회 전용** (F011 FR-1 · FR-3).
 *
 * ## 주문 · 계좌 TR 을 부를 수 없게 만든다
 *
 * KIS 규약상 `tr_id` 가 `U` 로 끝나면 주문 · 등록이고, 잔고 · 매수가능처럼 `R` 로 끝나도 계좌 TR 이
 * 있다(`TTTC8434R`). 그래서 "주문만 막는" 거부 목록이 아니라 **조회 TR 허용 목록**만 둔다 — 새 TR 을
 * 부르려면 이 표에 이름을 올려야 하고, 표에 들어갈 수 있는 접두는 `assertQueryTr` 가 정한다.
 * 레포 전체에 주문 · 계좌 TR 문자열이 0건인지는 테스트(`kisClient.test.ts`)가 따로 본다.
 *
 * ## 키 · 토큰이 로그로 새지 않게
 *
 * axios 오류 객체는 `config.headers` 에 `appkey` · `appsecret` · `authorization` 을 그대로 들고 있다.
 * 그것을 `logger.warn(msg, error)` 로 넘기면 비밀값이 로그 파일에 찍힌다. 그래서 이 파일 밖으로는
 * **원본 오류를 내보내지 않고** 상태 코드 · KIS 메시지 코드만 담은 `KisApiError` 로 바꾼다(FR-5).
 */

/** 조회 TR 허용 목록 — 이 파일이 부르는 TR 은 여기 있는 것뿐이다 */
export const KIS_QUERY_TR = {
  /** 주식현재가 시세 */
  inquirePrice: "FHKST01010100",
  /** 국내주식 기간별 시세(일/주/월/년) — 한 번에 최대 100건 */
  dailyItemChart: "FHKST03010100",
  /** 주식당일분봉조회 — 1분봉, 한 번에 최대 30건 · 당일만. 5분봉 대조 · 장 마감 보정(FR-21) */
  intradayMinutes: "FHKST03010200",
  /** 국내 휴장일 조회 — KIS 권고 "가급적 1일 1회" */
  holiday: "CTCA0903R",
} as const;

/**
 * 조회 TR 인가. 허용 접두는 시세(`FH`) · 공통 조회(`CTCA`) · 실시간 시세(`H0`, 체결통보 `H0STCNI` 제외)
 * 이고, `U` 로 끝나는 TR 은 접두와 무관하게 거부한다(F011 §KIS 사실 — 주문 TR 규약)
 */
export const assertQueryTr = (trId: string): void => {
  const allowedPrefix = /^(FH|CTCA|H0)/.test(trId) && !trId.startsWith("H0STCNI");
  if (!allowedPrefix || trId.endsWith("U")) {
    throw new Error(`KIS TR 허용 목록 밖: ${trId}`);
  }
};

for (const trId of Object.values(KIS_QUERY_TR)) assertQueryTr(trId);

/** 비밀값 마스킹(FR-5) — 오류 메시지에 섞여 들어온 경우까지 */
export const maskKisSecrets = (text: string, secrets: Array<string | undefined>): string => {
  let masked = text.replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, "$1***");
  for (const secret of secrets) {
    if (secret && secret.length >= 6) masked = masked.split(secret).join("***");
  }
  return masked;
};

/** KIS 오류 — 원본 axios 오류 대신 이것만 밖으로 나간다 */
export class KisApiError extends Error {
  constructor(
    readonly status: number | undefined,
    readonly msgCode: string | undefined,
    message: string
  ) {
    super(message);
    this.name = "KisApiError";
  }
}

/** 초당 거래건수 초과 — HTTP 상태와 무관하게 이 코드로 온다 */
const RATE_LIMITED = "EGW00201";
/** 토큰 재발급 제한(1분 1회) — 캐시된 토큰을 그대로 쓴다(FR-2) */
const TOKEN_ISSUE_LIMITED = "EGW00133";
/** 만료 · 무효 토큰 — 한 번 다시 발급한다 */
const TOKEN_INVALID = new Set(["EGW00121", "EGW00123"]);

const isRetryableKisError = (error: unknown): boolean => {
  if (!(error instanceof KisApiError)) return false;
  if (error.msgCode === RATE_LIMITED) return true;
  // KIS 는 업무 오류도 HTTP 500 으로 준다(2026-10-07 실측 EGW02004). 메시지 코드가 있으면 다시 걸어도 같은 답이다
  if (error.msgCode) return false;
  if (error.status === undefined) return true;
  return error.status === 429 || error.status >= 500;
};

/**
 * 기본 상한 6건/s — 앱 키 한도 20건/s(근거 등급 [약])의 30%. 실시간 · 백필 · 폴링이 이 한 줄을 나눠 쓴다.
 * 한도는 앱 키 단위라 이 페이서가 프로세스에 하나여야 한다(`composition.ts` 가 한 벌만 만든다).
 * 실측으로 바꿀 수 있게 설정값(`KIS_REQUESTS_PER_SECOND`)이다
 */
const DEFAULT_REQUESTS_PER_SECOND = 6;

/**
 * 초당 건수 초과를 받으면 이 프로세스의 KIS 호출 전체를 잠깐 세운다 — 1초에서 시작해 연속이면 두 배, 상한 8초.
 *
 * 한도는 **앱 키 단위**인데 페이서는 프로세스마다 하나다. 개발 서버(`npm run dev`)와 스크립트가 같은 키로
 * 동시에 돌면 각자 6건/s 를 지켜도 합이 넘는다 — 2026-10-07 실측에서 그 상태로 재시도가 회차당 40~120건
 * 쌓이고 종목이 실패했다. 페이서가 다른 프로세스를 볼 수 없으니, 초과 신호를 받은 쪽이 물러선다.
 */
const COOLDOWN_BASE_MS = 1_000;
const COOLDOWN_MAX_MS = 8_000;

/** 만료 10분 전이면 새로 받는다(FR-2) */
const TOKEN_REFRESH_MARGIN_MS = 10 * 60_000;

const num = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** `YYYYMMDD` → `YYYY-MM-DD` */
const isoDate = (yyyymmdd: string) =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
const compactDate = (iso: string) => iso.replaceAll("-", "");

/** 거래일 00:00 KST(= 전날 15:00 UTC) — `PriceHistory(1d)` 국내 주식 봉 시각(FR-20) */
const kstMidnight = (yyyymmdd: string) => new Date(Date.parse(`${isoDate(yyyymmdd)}T00:00:00+09:00`));

export interface KisClientOptions {
  appKey: string;
  appSecret: string;
  baseUrl: string;
  requestsPerSecond?: number;
  now?: () => Date;
}

export class KisClient implements KrStockQuotePort {
  private readonly http;
  private readonly pacer: RatePacer;
  private readonly now: () => Date;
  /** 같은 프로세스에서 발급이 겹치지 않게 — 동시에 만료를 본 호출이 둘이어도 발급은 한 번 */
  private issuing: Promise<string> | null = null;
  private cached: { token: string; expiresAt: Date } | null = null;
  private cooldownUntil = 0;
  private cooldownMs = COOLDOWN_BASE_MS;

  constructor(private readonly options: KisClientOptions) {
    this.http = createHttpClient({ baseURL: options.baseUrl, timeoutMs: 10_000 });
    this.pacer = createRatePacer({ perSecond: options.requestsPerSecond ?? DEFAULT_REQUESTS_PER_SECOND });
    this.now = options.now ?? (() => new Date());
  }

  async quote(code: string): Promise<KrStockQuoteFact> {
    const body = await this.get("/uapi/domestic-stock/v1/quotations/inquire-price", KIS_QUERY_TR.inquirePrice, {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code,
    });
    const o = body.output ?? {};
    const price = num(o.stck_prpr);
    if (price === null) throw new KisApiError(undefined, undefined, `KIS 현재가 없음 — ${code}`);

    // 시총은 억 단위다(2026-09-27 프로브 · 마스터 시총과 대조)
    const capEok = num(o.hts_avls);
    return {
      code,
      price,
      change: num(o.prdy_vrss) ?? 0,
      changeRate: num(o.prdy_ctrt) ?? 0,
      volume: BigInt(Math.trunc(num(o.acml_vol) ?? 0)),
      tradeValue: num(o.acml_tr_pbmn) ?? 0,
      marketCap: capEok === null ? null : capEok * 100_000_000,
      basePrice: num(o.stck_sdpr),
      upperLimit: num(o.stck_mxpr),
      lowerLimit: num(o.stck_llam),
      statusCode: o.iscd_stat_cls_code || null,
      warnCode: o.mrkt_warn_cls_code || null,
      // 거래정지 플래그 · 종목상태 58(거래정지) 둘 중 하나 — 필드 의미 근거 등급 [약]
      isHalted: o.temp_stop_yn === "Y" || o.iscd_stat_cls_code === "58",
      per: num(o.per),
      pbr: num(o.pbr),
      eps: num(o.eps),
      bps: num(o.bps),
      week52High: num(o.w52_hgpr),
      week52Low: num(o.w52_lwpr),
      foreignRate: num(o.hts_frgn_ehrt),
    };
  }

  async dailyCandles(code: string, from: string, to: string): Promise<Candle[]> {
    const body = await this.get(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      KIS_QUERY_TR.dailyItemChart,
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: compactDate(from),
        FID_INPUT_DATE_2: compactDate(to),
        FID_PERIOD_DIV_CODE: "D",
        // 0 = 수정주가 — 지표 · 전망은 액면분할로 끊기지 않은 값을 쓴다(Open Question: 원주가 병행)
        FID_ORG_ADJ_PRC: "0",
      }
    );
    const rows: any[] = Array.isArray(body.output2) ? body.output2 : [];
    return rows
      .filter((row) => typeof row?.stck_bsop_date === "string" && row.stck_bsop_date.length === 8)
      .flatMap((row) => {
        const [open, high, low, close] = [row.stck_oprc, row.stck_hgpr, row.stck_lwpr, row.stck_clpr].map(num);
        // 거래 없는 날은 KIS 가 0 을 준다 — 0 원 봉을 저장하면 지표가 무너진다
        if (!open || !high || !low || !close) return [];
        return [{ open, high, low, close, volume: num(row.acml_vol), timestamp: kstMidnight(row.stck_bsop_date) }];
      });
  }

  /**
   * 당일 1분봉 — `hhmmss` 이전 30개(최신이 앞). 봉 시각은 그 분의 시작(KST → UTC).
   * 5분봉 대조와 장 마감 보정에 쓴다 — 실시간 집계가 놓친 버킷을 채우는 근거다
   */
  async intradayMinuteCandles(code: string, hhmmss: string): Promise<Candle[]> {
    const body = await this.get(
      "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
      KIS_QUERY_TR.intradayMinutes,
      {
        FID_ETC_CLS_CODE: "",
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: code,
        FID_INPUT_HOUR_1: hhmmss,
        FID_PW_DATA_INCU_YN: "N",
      }
    );
    const rows: any[] = Array.isArray(body.output2) ? body.output2 : [];
    return rows.flatMap((row) => {
      const date = row?.stck_bsop_date;
      const time = row?.stck_cntg_hour;
      const [open, high, low, close] = [row.stck_oprc, row.stck_hgpr, row.stck_lwpr, row.stck_prpr].map(num);
      if (typeof date !== "string" || typeof time !== "string" || !open || !high || !low || !close) return [];
      const at = new Date(`${isoDate(date)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00+09:00`);
      return [{ open, high, low, close, volume: num(row.cntg_vol), timestamp: at }];
    });
  }

  async marketDays(baseDate: string): Promise<KrMarketDay[]> {
    const body = await this.get("/uapi/domestic-stock/v1/quotations/chk-holiday", KIS_QUERY_TR.holiday, {
      BASS_DT: compactDate(baseDate),
      CTX_AREA_NK: "",
      CTX_AREA_FK: "",
    });
    const rows: any[] = Array.isArray(body.output) ? body.output : body.output ? [body.output] : [];
    return rows
      .filter((row) => typeof row?.bass_dt === "string" && row.bass_dt.length === 8)
      .map((row) => ({
        date: isoDate(row.bass_dt),
        isOpen: row.opnd_yn === "Y",
        isTradingDay: row.tr_day_yn === "Y",
        isBusinessDay: row.bzdy_yn === "Y",
        isSettlementDay: row.sttl_day_yn === "Y",
      }));
  }

  // ==================== 요청 ====================

  private async get(path: string, trId: string, params: Record<string, string>): Promise<any> {
    assertQueryTr(trId);
    let reissued = false;

    const once = async () => {
      const token = await this.accessToken();
      try {
        return await this.send(path, trId, params, token);
      } catch (error) {
        // 토큰이 서버에서 먼저 죽었다 — 한 번만 새로 받는다(FR-92)
        if (!reissued && error instanceof KisApiError && TOKEN_INVALID.has(error.msgCode ?? "")) {
          reissued = true;
          this.cached = null;
          await prisma.externalApiToken.deleteMany({ where: { provider: "kis", tokenType: "access" } });
          return this.send(path, trId, params, await this.accessToken());
        }
        throw error;
      }
    };

    return withRetry(once, {
      isRetryable: isRetryableKisError,
      onRetry: (error, attempt, waitMs) =>
        logger.warn(`KIS 재시도 ${attempt}회 — ${trId} (${waitMs}ms 후): ${(error as Error).message}`),
    });
  }

  /** 페이서 안쪽 — 재시도도 KIS 에는 한 건이다 */
  private send(path: string, trId: string, params: Record<string, string>, token: string) {
    return this.pacer.run(async () => {
      const wait = this.cooldownUntil - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      try {
        const response = await this.http.get(path, {
          params,
          headers: {
            "content-type": "application/json; charset=utf-8",
            authorization: `Bearer ${token}`,
            appkey: this.options.appKey,
            appsecret: this.options.appSecret,
            tr_id: trId,
            custtype: "P",
            tr_cont: "",
          },
        });
        const body = response.data ?? {};
        if (body.rt_cd !== undefined && body.rt_cd !== "0") {
          throw new KisApiError(response.status, body.msg_cd, this.describe(trId, response.status, body));
        }
        this.cooldownMs = COOLDOWN_BASE_MS;
        return body;
      } catch (error) {
        const sanitized = this.sanitize(trId, error);
        if (sanitized.msgCode === RATE_LIMITED) {
          this.cooldownUntil = Date.now() + this.cooldownMs;
          this.cooldownMs = Math.min(this.cooldownMs * 2, COOLDOWN_MAX_MS);
        }
        throw sanitized;
      }
    });
  }

  private describe(trId: string, status: number | undefined, body: any) {
    return this.mask(`KIS ${trId} 실패 — HTTP ${status ?? "-"} ${body?.msg_cd ?? ""} ${body?.msg1 ?? ""}`.trim());
  }

  /** axios 오류 → `KisApiError`. 원본(헤더 포함)은 여기서 버린다 */
  private sanitize(trId: string, error: unknown): KisApiError {
    if (error instanceof KisApiError) return error;
    const response = (error as { response?: { status?: number; data?: any } })?.response;
    if (response) return new KisApiError(response.status, response.data?.msg_cd, this.describe(trId, response.status, response.data));
    const code = (error as { code?: string })?.code ?? "NETWORK";
    return new KisApiError(undefined, undefined, this.mask(`KIS ${trId} 응답 없음 — ${code}`));
  }

  private mask(text: string) {
    return maskKisSecrets(text, [this.options.appKey, this.options.appSecret, this.cached?.token]);
  }

  // ==================== WS 승인키 (FR-25) ====================

  /**
   * 실시간 접속 승인키. 토큰과 같은 표(`tokenType = approval`)에 캐시한다 — 유효 기간이 문서에 없어(근거 [약])
   * 12시간 뒤 새로 받는다. `force` 는 재접속이 거부됐을 때
   */
  async approvalKey(force = false): Promise<string> {
    const where = { provider_tokenType: { provider: "kis", tokenType: "approval" } };
    if (!force) {
      const stored = await prisma.externalApiToken.findUnique({ where });
      if (stored && stored.expiresAt.getTime() > this.now().getTime()) return stored.token;
    }
    try {
      const response = await this.pacer.run(() =>
        this.http.post("/oauth2/Approval", {
          grant_type: "client_credentials",
          appkey: this.options.appKey,
          secretkey: this.options.appSecret,
        })
      );
      const key = response.data?.approval_key;
      if (typeof key !== "string") {
        throw new KisApiError(response.status, response.data?.msg_cd, this.describe("Approval", response.status, response.data));
      }
      const issuedAt = this.now();
      const expiresAt = new Date(issuedAt.getTime() + 12 * 3_600_000);
      await prisma.externalApiToken.upsert({
        where,
        update: { token: key, issuedAt, expiresAt },
        create: { provider: "kis", tokenType: "approval", token: key, issuedAt, expiresAt },
      });
      logger.info("🔑 KIS 실시간 승인키 발급");
      return key;
    } catch (error) {
      throw this.sanitize("Approval", error);
    }
  }

  // ==================== 토큰 (FR-2) ====================

  /**
   * 접근 토큰. 메모리 → DB → 발급 순. **재시작이 발급을 늘리지 않는다** — DB 캐시가 프로세스보다 오래 산다.
   * 발급은 1분 1회 제한(공식 README)이고 1일 1회가 권장이다
   */
  async accessToken(): Promise<string> {
    const fresh = (t: { expiresAt: Date } | null) =>
      !!t && t.expiresAt.getTime() - TOKEN_REFRESH_MARGIN_MS > this.now().getTime();

    if (fresh(this.cached)) return this.cached!.token;

    const stored = await prisma.externalApiToken.findUnique({
      where: { provider_tokenType: { provider: "kis", tokenType: "access" } },
    });
    if (stored && fresh(stored)) {
      this.cached = { token: stored.token, expiresAt: stored.expiresAt };
      return stored.token;
    }

    this.issuing ??= this.issue(stored).finally(() => {
      this.issuing = null;
    });
    return this.issuing;
  }

  private async issue(stored: { token: string; expiresAt: Date } | null): Promise<string> {
    try {
      const response = await this.pacer.run(() =>
        this.http.post("/oauth2/tokenP", {
          grant_type: "client_credentials",
          appkey: this.options.appKey,
          appsecret: this.options.appSecret,
        })
      );
      const body = response.data ?? {};
      if (typeof body.access_token !== "string") {
        throw new KisApiError(response.status, body.error_code ?? body.msg_cd, this.describe("tokenP", response.status, body));
      }

      const issuedAt = this.now();
      // 만료 일시는 KST 문자열("2026-10-08 13:50:00") — 없으면 expires_in(초)
      const expiresAt =
        typeof body.access_token_token_expired === "string"
          ? new Date(`${body.access_token_token_expired.replace(" ", "T")}+09:00`)
          : new Date(issuedAt.getTime() + (Number(body.expires_in) || 86_400) * 1000);

      await prisma.externalApiToken.upsert({
        where: { provider_tokenType: { provider: "kis", tokenType: "access" } },
        update: { token: body.access_token, issuedAt, expiresAt },
        create: { provider: "kis", tokenType: "access", token: body.access_token, issuedAt, expiresAt },
      });
      this.cached = { token: body.access_token, expiresAt };
      // 발급 횟수는 관측 지표다(FR-94) — 하루 3회를 넘으면 캐시가 깨진 것이다
      logger.info(`🔑 KIS 접근 토큰 발급 — 만료 ${expiresAt.toISOString()}`);
      return body.access_token;
    } catch (error) {
      const sanitized = this.sanitize("tokenP", error);
      // 재발급 제한인데 아직 살아 있는 토큰이 있으면 그것을 쓴다(FR-2)
      const limited =
        sanitized.msgCode === TOKEN_ISSUE_LIMITED ||
        (error as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code === TOKEN_ISSUE_LIMITED;
      if (limited && stored && stored.expiresAt.getTime() > this.now().getTime()) {
        this.cached = { token: stored.token, expiresAt: stored.expiresAt };
        return stored.token;
      }
      throw sanitized;
    }
  }
}
