import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Accept either GEMINI_API_KEY or GEMINI_FLASH for the Gemini key
if (!process.env.GEMINI_API_KEY && process.env.GEMINI_FLASH) {
  process.env.GEMINI_API_KEY = process.env.GEMINI_FLASH;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4000").transform(Number),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  LOG_LEVEL: z.string().default("info"),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  /**
   * 한국투자증권 Open API — 국내 주식 **시세 조회 전용**(주문 · 계좌 API 는 부르지 않는다, 공통 수용 기준 2).
   * 키가 없으면 국내 주식 시세는 꺼진다(선택값). 실전 도메인이 기본, 모의는 `KIS_BASE_URL` 로 바꾼다.
   */
  // 빈 값(`KIS_APP_KEY=`)은 "없음" 이다 — `min(1)` 만 두면 빈 줄 하나가 서버 기동을 막는다(F011 FR-6: 꺼진 채 기동)
  KIS_APP_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
  KIS_APP_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
  KIS_BASE_URL: z.string().url().default("https://openapi.koreainvestment.com:9443"),
  KIS_WS_URL: z.string().default("ws://ops.koreainvestment.com:21000"),
  /** 국내 주식 시세 수집 유니버스의 시총 상위 N(F011 FR-11) — 관심 종목은 별도로 더한다 */
  /**
   * KIS 호출 출발 상한(건/s). 2026-10-07 실측 — 이 키의 실제 처리량은 설정과 무관하게 약 2건/s 에서 막혔다(동시 1~6 ·
   * 1.8~10건/s). 3 이 6 과 소요 시간이 거의 같고 초과 재시도가 적어 기본값이다. 실전 한도(20건/s, 근거 [약])가 확인되면 올린다
   */
  KIS_REQUESTS_PER_SECOND: z.coerce.number().positive().max(15).default(3),
  KIS_UNIVERSE_TOP_N: z.coerce.number().int().min(0).max(200).default(50),
  /**
   * 국내 주식 왕복 비용(비율) — 위탁 수수료 왕복 + 매도 거래세. 코치 판단 채점의 적중 경계 · 기저율 · 사이즈 계산의
   * 수수료(F011 FR-64). 증권사 · 세율이 바뀌면 이 값만 바꾼다. 기본 0.0023 = 0.015% × 2 + 0.20%
   */
  KR_STOCK_ROUND_TRIP_FEE_RATE: z.coerce.number().min(0).max(0.05).default(0.0023),
  /**
   * 국내 주식 로고 — logo.dev **퍼블리셔블** 키(`pk_…`, 브라우저에 실려도 되는 키). 없으면 로고 없이 이니셜(F011 FR-47).
   * 비밀 키(`sk_…`)를 넣지 않는다 — 로고 주소에 실려 화면으로 나간다
   */
  /**
   * DART 오픈API 인증키(opendart.fss.or.kr) — 국내 주식 로고를 회사 도메인으로 찾을 때 홈페이지(`hm_url`)를 받는다. 없으면 티커 조회만
   * (원본이 작은 종목은 이니셜). 서버 밖으로 나가지 않는다
   */
  DART_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
  KR_LOGO_DEV_TOKEN: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().startsWith("pk_", "logo.dev 퍼블리셔블 키(pk_)만 넣는다").optional(),
  ),
  /**
   * 활성 계정 상한 (`SRV-REQ-008` FR-6 — **코드 상수 금지**).
   *
   * 제품 정의는 본인 + 최대 10명이다(글로벌 플랜 1-1절). 설정값인 이유는 상한이 찼을 때
   * 기존 계정을 지우는 것 말고 **늘리는 선택지**가 있어야 하기 때문이다.
   */
  INVITE_MAX_ACCOUNTS: z.coerce.number().int().positive().default(10),
  /**
   * 코치 수동 재생성 쿨다운(초) — `SRV-REQ-024` FR-82 **설정값**. 기본 5분(FR-80).
   * 워커 생성에는 걸리지 않는다(FR-83).
   */
  COACH_REGENERATE_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(300),
  /**
   * 투자 화면 시장 요약 띠의 종목(쉼표 구분, 첫 심볼이 대표, 나머지는 화면에서 3줄씩 열) — `SRV-REQ-036`. **코드 상수 금지** —
   * 무엇을 요약할지는 화면 배포 없이 바꿀 수 있어야 한다.
   */
  MARKET_SUMMARY_SYMBOLS: z
    .string()
    .default("BTC,ETH,XRP,SOL,DOGE,ADA,TRX,SUI,AVAX,LINK")
    // 빈 칸 · 중복은 버리고 대문자로 맞춘다. 비면 기동을 막는다 — 요약할 것이 없는 설정은 오타다
    .transform((raw) =>
      Array.from(
        new Set(
          raw
            .split(",")
            .map((symbol) => symbol.trim().toUpperCase())
            .filter((symbol) => symbol !== "")
        )
      )
    )
    .pipe(z.array(z.string()).min(1)),
  /** 요약 태그 `wide_move` 임계(24시간 변동률 %, 절댓값) */
  MARKET_SUMMARY_WIDE_MOVE_RATE: z.coerce.number().positive().default(5),
  /**
   * 전망 배치(`salt-forecast/ops/daily.sh`)를 서버가 부팅 · 매시 걸어 줄지 — F008 `FC-REQ-004`.
   * 사용자 결정(2026-09-23) "서버 키면 자동으로". 기본은 개발 환경에서만 켠다. 배치가 스스로 "20시간 안에 성공했으면 건너뜀"을 판단한다.
   */
  FORECAST_RUNNER_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  /** 기본: 서버 작업 디렉터리 기준 `../salt-forecast/ops/daily.sh` */
  FORECAST_RUNNER_SCRIPT: z.string().optional(),
  /**
   * LLM 비용 상한 덮어쓰기(F010 슬라이스 7 · `SRV-REQ-025` FR-62). 비우면 코드 기준(`DEFAULT_LLM_BUDGET`) —
   * 지난 24시간 사용자 시도 · 전체 시도 · 전체 토큰
   */
  LLM_USER_DAILY_CALL_LIMIT: z.coerce.number().int().positive().optional(),
  LLM_DAILY_CALL_LIMIT: z.coerce.number().int().positive().optional(),
  LLM_DAILY_TOKEN_LIMIT: z.coerce.number().int().positive().optional(),
  /**
   * 가격 전망을 볼 수 있는 계정(쉼표 구분 이메일) — `ADR-003` 소유자 전용. **코드 상수 금지.**
   * 비우면 아무도 못 본다(되돌리기 — ADR-003 §5).
   */
  /**
   * 판단 성적에 **합성 표본(시드)도 셀지** — F009 슬라이스 0 C06 (`DB-REQ-017` FR-60). 기본 끔.
   * 로컬에서 `npm run judgments:seed` 로 게이트를 열어 렌더 경로를 볼 때만 켠다. **운영에서 켜면 기동을 막는다** —
   * 지어낸 실적이 추천을 여는 길을 설정 한 줄로도 열 수 없어야 한다.
   */
  JUDGMENT_COUNT_SYNTHETIC: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  FORECAST_OWNER_EMAILS: z
    .string()
    .default("")
    .transform((raw) => raw.split(",").map((email) => email.trim()).filter((email) => email !== "")),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production" && parsedEnv.JUDGMENT_COUNT_SYNTHETIC) {
  throw new Error("JUDGMENT_COUNT_SYNTHETIC 는 운영에서 켤 수 없다 — 합성 표본이 판단 게이트를 연다");
}

export const env = {
  ...parsedEnv,
  FORECAST_RUNNER_ENABLED: parsedEnv.FORECAST_RUNNER_ENABLED ?? parsedEnv.NODE_ENV === "development",
  JWT_EXPIRES_IN: parsedEnv.JWT_EXPIRES_IN as string | number,
  JWT_REFRESH_EXPIRES_IN: parsedEnv.JWT_REFRESH_EXPIRES_IN as string | number,
};
