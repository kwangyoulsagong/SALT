import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toNewsPreviewViewModels,
  type ServerNewsArticle,
} from "../news.viewmodel";

const article = (overrides: Partial<ServerNewsArticle> = {}): ServerNewsArticle => ({
  id: "n1",
  title: "비트코인 급등",
  summary: "요약",
  imageUrl: "https://example.test/a.jpg",
  source: "coindesk",
  url: "https://example.test/a",
  publishedAt: "2026-09-18T00:00:00.000Z",
  ...overrides,
});

describe("toNewsPreviewViewModels", () => {
  it("카드가 쓰는 필드만 옮긴다", () => {
    const [vm] = toNewsPreviewViewModels([article()]);

    assert.equal(vm.title, "비트코인 급등");
    assert.equal(vm.source, "coindesk");
    assert.equal(vm.url, "https://example.test/a");
  });

  /** 목록 응답에 전문이 실려 와도 카드로 넘기지 않는다 (FR-31). */
  it("content 를 담지 않는다", () => {
    const [vm] = toNewsPreviewViewModels([
      article({ content: "아주 긴 본문".repeat(1000) }),
    ]);

    assert.equal("content" in vm, false);
  });

  it("이미지가 없으면 null 이다 — 플레이스홀더를 만들지 않는다", () => {
    const [vm] = toNewsPreviewViewModels([article({ imageUrl: undefined })]);

    assert.equal(vm.imageUrl, null);
  });

  it("요약이 없으면 null 이다", () => {
    const [vm] = toNewsPreviewViewModels([article({ summary: undefined })]);

    assert.equal(vm.summary, null);
  });

  /** 서버가 주면 전달하고 없으면 **키 자체를 만들지 않는다** (FR-34). */
  it("viewCount 는 서버가 줄 때만 있다", () => {
    const [withCount] = toNewsPreviewViewModels([article({ viewCount: 12 })]);
    const [without] = toNewsPreviewViewModels([article()]);

    assert.equal(withCount.viewCount, 12);
    assert.equal("viewCount" in without, false);
  });

  it("Date 로 온 발행시각을 ISO 문자열로 준다", () => {
    const [vm] = toNewsPreviewViewModels([
      article({ publishedAt: new Date("2026-09-18T01:02:03.000Z") }),
    ]);

    assert.equal(vm.publishedAt, "2026-09-18T01:02:03.000Z");
  });

  it("0건이면 빈 배열이다 — 더미를 만들지 않는다", () => {
    assert.deepEqual(toNewsPreviewViewModels([]), []);
  });
});
