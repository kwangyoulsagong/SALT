/**
 * 한 사용자의 행 — 내 데이터 내보내기 · 계정 삭제(`SRV-REQ-048` FR-3 · 4, 서버 S3c). 플랫폼 `support/persistence` `UserRows` 의 Express 판.
 *
 * 표 목록은 표의 주인 컨텍스트가 적는다(`<context>/infrastructure/userRows.ts`). 여기는 목록을 받아 읽고 지우는 일만 —
 * 컨텍스트를 모른다. 조립(`personalRows.ts`)이 순서를 정해 넘긴다(자식 먼저).
 *
 * **스키마의 모든 사용자 표가 목록에 있어야 한다** — `personalRows.test.ts` 가 Prisma 모델에서 `user_id` 열을 가진 표를 세어 맞춘다.
 */
import { Prisma, type PrismaClient } from "@prisma/client";

export interface UserRowSet {
  /** public 스키마 표 이름 — 소문자 · 밑줄 */
  table: string;
  /** `$1`(사용자 id) 하나를 받는 WHERE 조각. 기본 `user_id = $1` */
  condition?: string;
  /** 내보낼 열 — 기본 전부 */
  select?: string;
  /** 지우지 않고 이 열만 비운다(행이 남아야 하는 기록 — LLM 호출 수는 전체 상한 계산에 남는다) */
  nullify?: string;
  /** false 면 내보내기에서 뺀다(사람이 읽을 기록이 아닌 운영 로그) — 지우기 · 비우기는 한다 */
  export?: boolean;
}

/** 내보낸 표 하나 — 플랫폼과 같은 모양. 값은 전부 글자(금액 정밀도 · 시각 모양이 바뀌지 않게) */
export interface ExportedTable {
  name: string;
  columns: string[];
  rows: (string | null)[][];
}

const NAME = /^[a-z][a-z0-9_]*$/;

export const checkUserRowSets = (sets: readonly UserRowSet[]): void => {
  const seen = new Set<string>();
  for (const set of sets) {
    if (!NAME.test(set.table)) throw new Error(`표 이름: ${set.table}`);
    if (seen.has(set.table)) throw new Error(`같은 표가 두 번: ${set.table}`);
    seen.add(set.table);
    const condition = set.condition ?? "user_id = $1";
    if ((condition.match(/\$1/g) ?? []).length !== 1 || /\$[2-9]/.test(condition)) throw new Error(`조건의 자리표시는 $1 하나: ${set.table}`);
    if (set.nullify !== undefined && !NAME.test(set.nullify)) throw new Error(`비울 열: ${set.nullify}`);
  }
};

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toFixed();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

type Db = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

/** 열 순서를 지키려고 열 이름을 따로 읽는다(빈 표에서도 열이 나온다) */
const columnsOf = async (db: Db, table: string, select: string): Promise<string[]> => {
  if (select !== "*") return select.split(",").map((c) => c.trim());
  const rows = await db.$queryRawUnsafe<{ column_name: string }[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
    table,
  );
  return rows.map((r) => r.column_name);
};

export const exportUserRows = async (db: Db, sets: readonly UserRowSet[], userId: string): Promise<ExportedTable[]> => {
  const tables: ExportedTable[] = [];
  for (const set of sets) {
    if (set.export === false) continue;
    const columns = await columnsOf(db, set.table, set.select ?? "*");
    const list = columns.map((c) => `"${c}"`).join(", ");
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${list} FROM ${set.table} WHERE ${set.condition ?? "user_id = $1"} ORDER BY 1`,
      userId,
    );
    tables.push({ name: set.table, columns, rows: rows.map((row) => columns.map((c) => text(row[c]))) });
  }
  return tables;
};

/** 표마다 지운(비운) 행 수 — 호출하는 쪽 트랜잭션 안에서, 목록 순서대로. 다시 불러도 안전(두 번째는 0) */
export const eraseUserRows = async (db: Db, sets: readonly UserRowSet[], userId: string): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const set of sets) {
    const where = set.condition ?? "user_id = $1";
    counts[set.table] = set.nullify
      ? await db.$executeRawUnsafe(`UPDATE ${set.table} SET ${set.nullify} = NULL WHERE ${where}`, userId)
      : await db.$executeRawUnsafe(`DELETE FROM ${set.table} WHERE ${where}`, userId);
  }
  return counts;
};

/** 이 사용자 행이 남은 표 — 지운 뒤 비어 있어야 한다 */
export const remainingUserRows = async (db: Db, sets: readonly UserRowSet[], userId: string): Promise<Record<string, number>> => {
  const left: Record<string, number> = {};
  for (const set of sets) {
    const where = set.nullify ? `(${set.condition ?? "user_id = $1"}) AND ${set.nullify} IS NOT NULL` : set.condition ?? "user_id = $1";
    const [row] = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${set.table} WHERE ${where}`, userId);
    if (Number(row.n) > 0) left[set.table] = Number(row.n);
  }
  return left;
};

/**
 * 개인 데이터 등급(`SRV-REQ-048` FR-6, 서버 S3d) — 원천은 표 주석 `"<등급>: <설명>"` 하나(플랫폼 `UserRows.classification` 과 같은 판정).
 * 등급 셋: record(기록) · financial(금액) · sensitive(감정 · 급여 · 사람 이름).
 */
export const DATA_GRADES = ["record", "financial", "sensitive"] as const;
export type DataGrade = (typeof DATA_GRADES)[number];

export interface TableClass {
  table: string;
  /** 주석이 없거나 모르는 등급이면 둘 다 null — 결함(시험이 깬다) */
  grade: DataGrade | null;
  about: string | null;
}

/** 주석 글자 → 등급 · 설명. 등급이 틀리면 설명도 내지 않는다(등급 없는 글자를 화면에 내지 않게) */
export const parseTableComment = (comment: string | null | undefined): Pick<TableClass, "grade" | "about"> => {
  const at = comment?.indexOf(":") ?? -1;
  if (!comment || at < 0) return { grade: null, about: null };
  const grade = comment.slice(0, at).trim();
  const about = comment.slice(at + 1).trim();
  if (!(DATA_GRADES as readonly string[]).includes(grade) || about.length === 0) return { grade: null, about: null };
  return { grade: grade as DataGrade, about };
};

/** 내보내는 사람 표마다 등급 · 설명 — 한 쿼리(표 수만큼 왕복하지 않는다). 아웃박스 · 운영 로그(`export: false`)는 뺀다 */
export const classifyUserRows = async (db: Db, sets: readonly UserRowSet[]): Promise<TableClass[]> => {
  const tables = sets.filter((s) => s.export !== false).map((s) => s.table);
  const rows = await db.$queryRawUnsafe<{ table_name: string; comment: string | null }[]>(
    "SELECT t AS table_name, obj_description(to_regclass('public.' || t), 'pg_class') AS comment FROM unnest($1::text[]) AS t",
    tables,
  );
  const byTable = new Map(rows.map((r) => [r.table_name, r.comment]));
  return tables.map((table) => ({ table, ...parseTableComment(byTable.get(table)) }));
};
