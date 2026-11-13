import { backendApi } from "./backend-api.service";
import { MY_DATA_SCOPE } from "./app-my-data.service";
import { toUpstreamClientError } from "../utils/error.util";
import { logger } from "../config/logger";

/**
 * 개인정보 — 저장하는 것 · AI 로 가는 것(`BFF-REQ-046` FR-9, 서버 S3d `SRV-REQ-048` FR-6) · 도메인 사용 계측 중계(FR-10, FR-7).
 *
 * 서버는 서비스마다 같은 경로 `GET /<service>/me/data-classification` 을 준다 — 표 · 등급(record · financial · sensitive) · 설명(표 주석이 원천).
 * AI 입력 목록은 투자(Express)만 준다 — LLM 을 부르는 곳이 투자 코치 배치뿐이다. 서비스 목록 = 지워지는 범위와 같은 목록(`MY_DATA_SCOPE`) —
 * "무엇을 저장하나"와 "계정을 지우면 무엇이 지워지나"가 같은 서비스를 가리켜야 한다.
 *
 * - 부분 실패: 서비스 하나를 못 읽으면 그 칸만 `unavailable`(화면이 "불러오지 못했어요"). 401 은 전체 401(세션 갱신)
 * - 등급 없는 표(서버 결함)는 숨기지 않는다 — `unknown` 묶음으로 낸다. 감추면 공개 화면이 거짓이 된다
 */

export const GRADES = ["sensitive", "financial", "record", "unknown"] as const;
export type Grade = (typeof GRADES)[number];

export interface PrivacyServiceVM {
  service: string;
  unavailable: boolean;
  /** 민감 → 금액 → 기록 → 모름 순. 빈 묶음은 싣지 않는다 */
  groups: Array<{ grade: Grade; items: string[] }>;
}

export interface PrivacyVM {
  services: PrivacyServiceVM[];
  /** AI 로 가는 것 — 투자 서비스를 못 읽으면 null */
  ai: { personal: boolean; jobs: Array<{ about: string; inputs: string[] }> } | null;
}

const KNOWN: readonly string[] = ["sensitive", "financial", "record"];
const path = (service: string) => `/${service}/me/data-classification`;
const STEP_TIMEOUT_MS = 10_000;

/** 서버 모양 → 묶음. 모양이 틀리면 null(그 서비스를 "못 읽음"으로) */
export const toGroups = (data: unknown): PrivacyServiceVM["groups"] | null => {
  const tables = (data as { tables?: unknown } | null)?.tables;
  if (!Array.isArray(tables)) return null;
  const byGrade = new Map<Grade, string[]>();
  for (const t of tables as Array<{ table?: unknown; grade?: unknown; about?: unknown }>) {
    if (typeof t?.table !== "string") return null;
    const known = typeof t.grade === "string" && KNOWN.includes(t.grade) && typeof t.about === "string";
    const grade = (known ? t.grade : "unknown") as Grade;
    const item = known ? (t.about as string) : t.table;
    byGrade.set(grade, [...(byGrade.get(grade) ?? []), item]);
  }
  return GRADES.flatMap((grade) => (byGrade.has(grade) ? [{ grade, items: byGrade.get(grade)! }] : []));
};

export const toAi = (data: unknown): PrivacyVM["ai"] => {
  const jobs = (data as { llmInputs?: unknown } | null)?.llmInputs;
  if (!Array.isArray(jobs)) return null;
  const out: NonNullable<PrivacyVM["ai"]>["jobs"] = [];
  let personal = false;
  for (const j of jobs as Array<{ about?: unknown; inputs?: unknown }>) {
    if (typeof j?.about !== "string" || !Array.isArray(j.inputs)) return null;
    const inputs: string[] = [];
    for (const i of j.inputs as Array<{ about?: unknown; personal?: unknown }>) {
      if (typeof i?.about !== "string" || typeof i.personal !== "boolean") return null;
      inputs.push(i.about);
      personal ||= i.personal;
    }
    out.push({ about: j.about, inputs });
  }
  return { personal, jobs: out };
};

class AppPrivacyService {
  async privacy(token: string): Promise<PrivacyVM> {
    const results = await Promise.allSettled(
      MY_DATA_SCOPE.map((s) => backendApi.proxyAuthRequest("GET", path(s), token, undefined, { timeout: STEP_TIMEOUT_MS })),
    );
    const auth = results.find((r) => r.status === "rejected" && toUpstreamClientError(r.reason)?.status === 401);
    if (auth) throw (auth as PromiseRejectedResult).reason;

    let ai: PrivacyVM["ai"] = null;
    const services = MY_DATA_SCOPE.map((service, i): PrivacyServiceVM => {
      const r = results[i];
      const data = r.status === "fulfilled" ? (r.value as { data?: { data?: unknown } }).data?.data : undefined;
      const groups = data === undefined ? null : toGroups(data);
      if (service === "investment" && groups) ai = toAi(data);
      if (!groups) logger.warn("privacy: classification unavailable", { service, reason: r.status === "rejected" ? String(r.reason?.message ?? r.reason) : "shape" });
      return { service, unavailable: groups === null, groups: groups ?? [] };
    });
    return { services, ai };
  }

  /** 사용 한 번 — 셀 수 있는 도메인 · 종류는 서버가 정한다(틀리면 서버 400 그대로) */
  async countUsage(token: string, domain: unknown, kind: unknown): Promise<void> {
    await backendApi.proxyAuthRequest("POST", "/identity/me/usage", token, { domain, kind }, { timeout: 3_000 });
  }
}

export const appPrivacyService = new AppPrivacyService();
