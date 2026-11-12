import { backendApi } from "./backend-api.service";
import { AppError, toUpstreamClientError } from "../utils/error.util";
import { zip, type ZipEntry } from "../utils/zip.util";

/**
 * 내 데이터 — 내보내기 · 계정 삭제(`BFF-REQ-046` FR-7, 서버 S3c `SRV-REQ-048` FR-3 · 4).
 *
 * 서버는 서비스마다 같은 두 경로(`GET` · `DELETE` `/<service>/me/data`)를 준다. **순서와 묶음은 BFF 가 정한다** — 서비스끼리 부르지 않는다
 * (`msa-services.md` §5). 라우팅은 `config/server-routes.json`(투자 = Express, 나머지 = platform).
 *
 * - 내보내기: 전부 나란히 읽고 **하나라도 못 읽으면 실패**다. 일부만 담긴 파일을 "내 데이터 전부"로 내주면 거짓이 된다(부분 실패 격리의 예외)
 * - 삭제: 비밀번호로 지우기 허가 → 서비스마다 차례로 → 마지막에 계정(identity, 서비스별 행 수를 같이 남긴다). 중간에 실패하면 거기서 멈춘다 —
 *   지우기는 다시 불러도 안전해서 **복구 = 다시 누르기**다. 계정이 남아 있어야 다시 누를 수 있으니 계정은 맨 끝
 * - 파일은 저장하지 않는다(BFF 에 DB 없음 · 사본이 생기면 지운 것이 아니다) — 응답으로 바로 내려 보낸다
 */

/** 지우는 순서 — 투자(Express, 결과 · 거래)부터, 알림은 다른 서비스가 지우는 동안 들어온 것까지 끝에 */
export const MY_DATA_SERVICES = [
  { service: "investment", path: "/investment/me/data" },
  { service: "household", path: "/household/me/data" },
  { service: "savings", path: "/savings/me/data" },
  { service: "content", path: "/content/me/data" },
  { service: "coach", path: "/coach/me/data" },
  { service: "ping", path: "/ping/me/data" },
  { service: "notification", path: "/notification/me/data" },
] as const;

const IDENTITY_DATA = "/identity/me/data";
const ERASE_HEADER = "X-Salt-Erase";
/** 사람 하나의 기록 — 표가 많아도 수백 행. 읽기 · 지우기 한 번에 넉넉히 */
const STEP_TIMEOUT_MS = 15_000;

export interface ExportedTable {
  name: string;
  columns: string[];
  rows: Array<Array<string | null>>;
}

export interface ServiceExport {
  service: string;
  tables: ExportedTable[];
}

export type DeletedCounts = Record<string, Record<string, number>>;

/** 서버 모양 검사 — 틀리면 그 서비스를 "못 읽음"으로(빈 표로 접지 않는다) */
export const toServiceExport = (data: unknown): ServiceExport | null => {
  const d = data as { service?: unknown; tables?: unknown } | null;
  if (!d || typeof d.service !== "string" || !Array.isArray(d.tables)) return null;
  const tables: ExportedTable[] = [];
  for (const t of d.tables as Array<{ name?: unknown; columns?: unknown; rows?: unknown }>) {
    if (typeof t?.name !== "string" || !Array.isArray(t.columns) || !Array.isArray(t.rows)) return null;
    if (!t.columns.every((c) => typeof c === "string")) return null;
    const rows = t.rows as unknown[];
    if (!rows.every((r) => Array.isArray(r) && r.length === (t.columns as unknown[]).length && r.every((v) => v === null || typeof v === "string"))) return null;
    tables.push({ name: t.name, columns: t.columns as string[], rows: rows as Array<Array<string | null>> });
  }
  return { service: d.service, tables };
};

const toCounts = (data: unknown): Record<string, number> | null => {
  const deleted = (data as { deleted?: unknown } | null)?.deleted;
  if (!deleted || typeof deleted !== "object" || Array.isArray(deleted)) return null;
  const entries = Object.entries(deleted as Record<string, unknown>);
  return entries.every(([, n]) => Number.isInteger(n) && (n as number) >= 0) ? (Object.fromEntries(entries) as Record<string, number>) : null;
};

/** RFC 4180 — 쉼표 · 따옴표 · 줄바꿈이 든 칸만 따옴표. 빈 값(null)은 빈 칸. 엑셀이 한글을 읽게 BOM */
export const toCsv = (table: ExportedTable): string => {
  const cell = (v: string | null) => (v === null ? "" : /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [table.columns, ...table.rows].map((row) => row.map(cell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
};

const README = (exportedAt: string, exports: ServiceExport[]): string =>
  [
    "SALT 내 데이터",
    `만든 시각: ${exportedAt}`,
    "",
    "폴더 = 서비스, 파일 = 표(CSV, UTF-8). 같은 내용 전부가 all.json 에 있습니다.",
    "값은 저장된 그대로의 글자입니다 — 금액은 반올림하지 않았고 시각은 UTC 입니다.",
    "",
    "담긴 것",
    ...exports.map((e) => `- ${e.service}: ${e.tables.map((t) => `${t.name} ${t.rows.length}행`).join(", ") || "없음"}`),
    "",
    "담지 않은 것",
    "- 비밀번호(해시도 담지 않습니다)",
    "- 서비스 사이에 오간 이벤트 기록 · AI 해설 생성 기록 · AI 호출 수 — 사람이 입력한 것이 아닌 운영 기록입니다(계정을 지우면 함께 지워지거나 사람 칸이 비워집니다)",
    "- 모두에게 같은 시세 · 뉴스 · 공개 글",
    "",
  ].join("\n");

const incomplete = (code: string, message: string) => new AppError(message, 502, true, code);

class AppMyDataService {
  /** 서비스마다 읽어 zip 하나 — 하나라도 실패하면 502(`EXPORT_INCOMPLETE`). 401 · 4xx 는 그대로 */
  async exportZip(token: string, now: Date = new Date()): Promise<{ fileName: string; body: Buffer }> {
    const paths = [IDENTITY_DATA, ...MY_DATA_SERVICES.map((s) => s.path)];
    const results = await Promise.allSettled(paths.map((p) => backendApi.proxyAuthRequest("GET", p, token, undefined, { timeout: STEP_TIMEOUT_MS })));
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (rejected) {
      // 401 하나라도 있으면 전체 401 — 화면이 세션을 갱신한다(`bff-architecture.md` §5)
      const auth = results.find((r) => r.status === "rejected" && toUpstreamClientError(r.reason)?.status === 401);
      if (auth) throw (auth as PromiseRejectedResult).reason;
      if (toUpstreamClientError(rejected.reason)) throw rejected.reason;
      throw incomplete("EXPORT_INCOMPLETE", "일부 기록을 읽지 못해 내보내기를 멈췄어요");
    }
    const exports = results.map((r) => toServiceExport((r as PromiseFulfilledResult<{ data?: { data?: unknown } }>).value.data?.data));
    if (exports.some((e) => e === null)) throw incomplete("EXPORT_INCOMPLETE", "일부 기록을 읽지 못해 내보내기를 멈췄어요");
    const all = exports as ServiceExport[];
    const exportedAt = now.toISOString();
    const entries: ZipEntry[] = [
      { name: "README.txt", content: README(exportedAt, all) },
      { name: "all.json", content: JSON.stringify({ exportedAt, services: all }, null, 2) },
      ...all.flatMap((e) => e.tables.map((t) => ({ name: `${e.service}/${t.name}.csv`, content: toCsv(t) }))),
    ];
    const day = exportedAt.slice(0, 10);
    return { fileName: `salt-my-data-${day}.zip`, body: zip(entries) };
  }

  /**
   * 계정 삭제 — 비밀번호 확인(틀리면 403 `REAUTH_FAILED` 그대로) → 서비스마다 → 계정. 서비스 하나가 5xx 면 거기서 멈추고
   * 502 `ACCOUNT_DELETE_INCOMPLETE`(앞에서 지운 것은 지워진 채 — 다시 누르면 나머지를 마저 지운다)
   */
  async deleteAccount(token: string, password: unknown): Promise<{ deleted: DeletedCounts; total: number }> {
    if (typeof password !== "string" || password.length === 0) throw new AppError("비밀번호를 입력해 주세요", 400, true, "PASSWORD_REQUIRED");
    const granted = await backendApi.proxyAuthRequest("POST", "/identity/me/erase-grant", token, { password }, { timeout: STEP_TIMEOUT_MS });
    const grant = granted.data?.data?.eraseToken;
    if (typeof grant !== "string" || grant.length === 0) throw incomplete("ACCOUNT_DELETE_INCOMPLETE", "계정을 지우지 못했어요");
    const headers = { [ERASE_HEADER]: grant };

    const deleted: DeletedCounts = {};
    for (const { service, path } of MY_DATA_SERVICES) {
      const res = await this.step(() => backendApi.proxyAuthRequest("DELETE", path, token, undefined, { timeout: STEP_TIMEOUT_MS, headers }));
      const counts = toCounts(res.data?.data);
      if (!counts) throw incomplete("ACCOUNT_DELETE_INCOMPLETE", "일부만 지워졌어요 — 다시 시도해 주세요");
      deleted[service] = counts;
    }
    const last = await this.step(() =>
      backendApi.proxyAuthRequest("DELETE", "/identity/me", token, { deleted: { ...deleted } }, { timeout: STEP_TIMEOUT_MS, headers }),
    );
    const identity = toCounts(last.data?.data);
    if (!identity) throw incomplete("ACCOUNT_DELETE_INCOMPLETE", "일부만 지워졌어요 — 다시 시도해 주세요");
    deleted.identity = identity;
    // 화면은 "N개 기록을 지웠어요" 한 줄만 — 합은 여기서(프론트 계산 0)
    const total = Object.values(deleted).flatMap((t) => Object.values(t)).reduce((a, n) => a + n, 0);
    return { deleted, total };
  }

  private async step<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (toUpstreamClientError(error)) throw error;
      throw incomplete("ACCOUNT_DELETE_INCOMPLETE", "일부만 지워졌어요 — 다시 시도해 주세요");
    }
  }
}

export const appMyDataService = new AppMyDataService();
