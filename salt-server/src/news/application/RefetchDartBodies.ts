import { createHash } from "node:crypto";

import { DART_DOC_GAP_MS, DART_REFETCH_PER_TICK, type AiBodyStore, type DartPort } from "../domain";
import { logger } from "../../shared/config/logger";

export interface DartRefetchTick {
  enabled: boolean;
  refetched: number;
  failed: number;
}

/**
 * 한글이 깨진 채 저장된 DART 본문을 다시 받는다(2026-11-17 — `SRV-REQ-058` FR-9). DART 원문은 `charset=euc-kr` 이라 적고 UTF-8 을
 * 보내서, 선언을 믿은 디코더가 F017 v4 2b 이후 본문 전부를 깨뜨렸다(숫자 · 영문만 남아 숫자 대조는 통과했다).
 *
 * 고친 디코더로 읽지 않은 행(`refetched_at` 없음)만, 최신순 회차마다 `DART_REFETCH_PER_TICK`. 바꾼 본문은 추출을 다시 하고
 * (추출이 그 원문 키의 옛 사실을 바꾼다 — `ExtractedFactStore.saveMany`), 알게 된 시각(`fetched_at`)은 지킨다. 다 끝나면 호출 0
 */
export class RefetchDartBodies {
  constructor(
    private readonly deps: { dart: DartPort | null; bodies: AiBodyStore },
    private readonly now: () => Date = () => new Date(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async execute(): Promise<DartRefetchTick> {
    const out: DartRefetchTick = { enabled: this.deps.dart !== null, refetched: 0, failed: 0 };
    const dart = this.deps.dart;
    if (!dart) return out;
    const todo = await this.deps.bodies.dartBodiesToRefetch(DART_REFETCH_PER_TICK);
    for (const [i, row] of todo.entries()) {
      if (i > 0) await this.sleep(DART_DOC_GAP_MS);
      try {
        const paragraphs = await dart.document(row.rceptNo);
        if (paragraphs.length === 0) throw new Error("empty document");
        const joined = paragraphs.join("\n");
        await this.deps.bodies.replaceDisclosureBody(
          { key: row.key, paragraphs, hash: createHash("sha256").update(joined).digest("hex"), chars: joined.length },
          this.now(),
        );
        out.refetched += 1;
      } catch (error) {
        out.failed += 1;
        logger.warn("[news] dart refetch failed", { key: row.key, code: (error as { code?: string }).code ?? null, message: String((error as Error).message ?? "").slice(0, 120) });
      }
    }
    return out;
  }
}
