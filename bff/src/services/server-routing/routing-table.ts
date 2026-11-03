import fs from "node:fs";

import { logger } from "../../config/logger";

/**
 * 서버 경로 라우팅 표 — 스트랭글러 스위치(`BFF-REQ-045` FR-1 · `backend-integration.md` "서버 MSA 이전").
 *
 * - 표는 **설정 파일 하나**(`config/server-routes.json`). 코드에 경로 · 주소를 박지 않는다
 * - **재시작 없이 재로딩** — 요청마다 파일 수정 시각을 보되 1초에 한 번만(`stat` 한 번 = 수 µs)
 * - 파일이 깨지면 **직전 표를 계속 쓴다** — 오타 하나로 전 경로가 다른 서버로 가지 않게
 * - 가장 긴 prefix 가 이긴다. prefix 는 경로 조각 경계에서만 맞는다(`/goal` 이 `/goals` 를 잡지 않는다)
 */
export type RouteMode = "legacy" | "platform" | "shadow";

export interface RoutingTable {
  default: RouteMode;
  routes: Record<string, RouteMode>;
}

const MODES: ReadonlySet<string> = new Set(["legacy", "platform", "shadow"]);

export const parseRoutingTable = (raw: string): RoutingTable => {
  const parsed = JSON.parse(raw) as { default?: unknown; routes?: unknown };
  const fallback = parsed.default ?? "legacy";
  if (typeof fallback !== "string" || !MODES.has(fallback)) throw new Error(`default 값이 틀렸다: ${String(fallback)}`);
  const routes: Record<string, RouteMode> = {};
  for (const [prefix, mode] of Object.entries((parsed.routes ?? {}) as Record<string, unknown>)) {
    if (!prefix.startsWith("/")) throw new Error(`prefix 는 / 로 시작한다: ${prefix}`);
    if (typeof mode !== "string" || !MODES.has(mode)) throw new Error(`${prefix} 의 값이 틀렸다: ${String(mode)}`);
    routes[prefix.replace(/\/+$/, "")] = mode as RouteMode;
  }
  return { default: fallback as RouteMode, routes };
};

/** 경로(쿼리 제외)에 맞는 모드. 가장 긴 prefix 가 이긴다. */
export const resolveMode = (table: RoutingTable, url: string): RouteMode => {
  const path = url.split("?")[0] ?? "";
  let best: string | null = null;
  for (const prefix of Object.keys(table.routes)) {
    const hit = path === prefix || path.startsWith(`${prefix}/`);
    if (hit && (best === null || prefix.length > best.length)) best = prefix;
  }
  return best === null ? table.default : table.routes[best];
};

export class RoutingTableFile {
  private table: RoutingTable = { default: "legacy", routes: {} };
  private loadedMtime = -1;
  private checkedAt = -Infinity;

  constructor(
    private readonly file: string,
    private readonly now: () => number = Date.now,
    private readonly recheckMs = 1_000,
  ) {
    this.reload();
  }

  current(): RoutingTable {
    if (this.now() - this.checkedAt >= this.recheckMs) this.reload();
    return this.table;
  }

  modeFor(url: string): RouteMode {
    return resolveMode(this.current(), url);
  }

  private reload(): void {
    this.checkedAt = this.now();
    let mtime: number;
    try {
      mtime = fs.statSync(this.file).mtimeMs;
    } catch {
      if (this.loadedMtime !== -2) logger.warn("Server routing table missing — all legacy", { file: this.file });
      this.loadedMtime = -2;
      this.table = { default: "legacy", routes: {} };
      return;
    }
    if (mtime === this.loadedMtime) return;
    try {
      this.table = parseRoutingTable(fs.readFileSync(this.file, "utf8"));
      this.loadedMtime = mtime;
      logger.info("Server routing table loaded", { routes: this.table.routes, default: this.table.default });
    } catch (error) {
      // 직전 표 유지 — 같은 mtime 으로 다시 읽지 않게 기록만 해 둔다
      this.loadedMtime = mtime;
      logger.error("Server routing table invalid — keeping previous", { file: this.file, reason: (error as Error).message });
    }
  }
}
