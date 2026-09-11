import { notFound } from "next/navigation";

import { BlockBoundary } from "@/shared/ui";

/**
 * 스트리밍 측정 프로브 (FE-REQ-008 FR-30~32) — **기본값 404**.
 *
 * ## 왜 있는가
 *
 * FR-31 은 "첫 블록 300ms 이내 + 총 완료 시간 악화 없음"을 화면 단위로 판정하라고 한다.
 * 그런데 **판정 대상 화면(홈 5블록·세금 콕핏·청구서)이 아직 없다.** 서버에서 기다리는
 * 블록이 하나도 없으면 잴 것이 없고, 재지 않으면 다음 사람이 "스트리밍이 되긴 하나"부터
 * 다시 확인해야 한다.
 *
 * 그래서 **REQ §"자리 1 — 홈"의 블록별 예산을 그대로 옮긴 블록**을 두고 두 형태를 비교한다.
 *
 * | 모드 | 모양 | 무엇을 보는가 |
 * |---|---|---|
 * | `?mode=blocking` | 5블록을 `Promise.all` 로 묶어 다 끝난 뒤 렌더 | **이관 전** (`GET /api/app/home` 1콜) — FR-30 |
 * | 기본 | 블록마다 `Suspense` | **이관 후** (스트리밍) — FR-30 |
 * | `?fail=청구서 한 줄` | 그 블록만 예외를 던진다 | **부분 실패 격리** — FR-21 |
 *
 * 이 수치는 **합성(synthetic)이다** — 홈 화면의 판정값이 아니다. 실제 판정은 F006 에서
 * 같은 방법으로 다시 한다.
 *
 * ## 재는 법
 *
 * ```bash
 * STREAMING_PROBE=1 pnpm --filter web start
 * curl -N --no-buffer -s "http://localhost:3000/streaming-probe" \
 *   | while IFS= read -r l; do printf '%s %s\n' "$(python3 -c 'import time;print(f"{time.time():.3f}")')" "${l:0:60}"; done
 * ```
 *
 * chunk 가 끊겨 나오는 시각이 블록 도착 시각이다. 첫 chunk = 첫 블록 페인트,
 * 마지막 chunk = 마지막 블록 완료.
 *
 * dev 서버에서는 요청 시점 컴파일 때문에 첫 chunk 시각이 의미 없다. **프로덕션 빌드에서 잰다.**
 */
export const dynamic = "force-dynamic";

/** REQ §"자리 1 — 홈"의 블록별 예산을 그대로 옮긴 값이다. */
const BLOCKS = [
  { budgetMs: 100, minHeight: 80, name: "총자산", source: "포트폴리오 + 환율" },
  { budgetMs: 250, minHeight: 80, name: "이번 주 적립", source: "plan/weekly" },
  { budgetMs: 400, minHeight: 120, name: "AI 추천", source: "ai-coach/preview" },
  { budgetMs: 100, minHeight: 60, name: "세금 D-Day", source: "tax/cockpit" },
  { budgetMs: 1500, minHeight: 80, name: "청구서 한 줄", source: "반사실 스냅샷" },
] as const;

type Block = (typeof BLOCKS)[number];

const load = (block: Block) =>
  new Promise<Block>((resolve) =>
    setTimeout(() => resolve(block), block.budgetMs)
  );

const BlockCard = ({ block }: { block: Block }) => (
  <section
    data-block={block.name}
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      minHeight: block.minHeight,
      padding: 16,
    }}
  >
    <strong>{block.name}</strong>
    <p style={{ margin: "8px 0 0" }}>
      {block.source} · 예산 {block.budgetMs}ms
    </p>
  </section>
);

/** 스트리밍 모드: 블록마다 자기 대기를 갖는다. */
async function StreamedBlock({ block, fail }: { block: Block; fail?: string }) {
  const loaded = await load(block);
  if (fail === block.name) {
    throw new Error(`프로브: '${block.name}' 블록을 강제 실패시켰다`);
  }
  return <BlockCard block={loaded} />;
}

/** 1콜 집계 모드: 가장 느린 블록이 끝나야 전부 나간다. */
async function BlockingBlocks() {
  const loaded = await Promise.all(BLOCKS.map(load));
  return (
    <>
      {loaded.map((block) => (
        <BlockCard key={block.name} block={block} />
      ))}
    </>
  );
}

type PageProps = {
  searchParams: Promise<{ fail?: string; mode?: string }>;
};

export const StreamingProbePage = async ({ searchParams }: PageProps) => {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.STREAMING_PROBE === "1";
  if (!enabled) notFound();

  const { fail, mode } = await searchParams;
  const blocking = mode === "blocking";

  return (
    <main style={{ display: "grid", gap: 16, padding: 24 }}>
      <h1 data-probe-mode={blocking ? "blocking" : "streaming"}>
        스트리밍 프로브 (합성 · {blocking ? "1콜 집계" : "스트리밍"})
      </h1>
      <p>
        홈 5블록의 지연 프로파일을 흉내낸 측정용 화면이다. 실제 홈의 판정값이 아니다 —
        <code>FE-REQ-008</code> FR-30~32.
      </p>
      {blocking ? (
        <BlockingBlocks />
      ) : (
        BLOCKS.map((block) => (
          <BlockBoundary
            key={block.name}
            name={block.name}
            minHeight={block.minHeight}
          >
            <StreamedBlock block={block} fail={fail} />
          </BlockBoundary>
        ))
      )}
    </main>
  );
};

export default StreamingProbePage;
