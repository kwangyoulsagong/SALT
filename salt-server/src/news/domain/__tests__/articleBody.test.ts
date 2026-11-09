import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BODY_EXTRACTOR_VERSION,
  BODY_MAX_CHARS,
  BODY_RETRY_FAILED_MS,
  BODY_RETRY_NOT_FOUND_MS,
  type ArticleCandidate,
  cleanParagraphs,
  isBodyFresh,
  pickSameArticle,
  searchTitleOf,
  shortSearchTitleOf,
  titleSimilarity,
} from "../ArticleBody";

const at = (iso: string) => new Date(iso);
const cand = (title: string, publishedAt: string, portal = true): ArticleCandidate => ({
  title,
  originalUrl: `https://press.example/${encodeURIComponent(title)}`,
  portalUrl: portal ? `https://n.news.naver.com/article/001/${title.length}` : null,
  publishedAt: at(publishedAt),
});

describe("같은 기사 판정 — 제목 겹침 0.8 · 게시 2일", () => {
  const query = { key: "coin:1", title: "[코인뉴스] 비트코인 하락 어디까지…산업 곳곳 ‘빨간불’ - 데일리안", publishedAt: at("2026-11-09T01:00:00Z") };

  it("매체 꼬리 · 머리말 · 문장부호 차이는 같은 제목", () => {
    assert.equal(searchTitleOf(query.title), "[코인뉴스] 비트코인 하락 어디까지…산업 곳곳 ‘빨간불’");
    assert.equal(titleSimilarity(query.title, "비트코인 하락 어디까지... 산업 곳곳 '빨간불'"), 1);
  });

  it("허용 · 거절 경계", () => {
    const table: Array<[ArticleCandidate[], string | null, string]> = [
      [[cand("비트코인 하락 어디까지…산업 곳곳 빨간불", "2026-11-09T00:30:00Z")], "비트코인 하락 어디까지…산업 곳곳 빨간불", "같은 제목 · 같은 날"],
      [[cand("비트코인 하락 어디까지…산업 곳곳 빨간불", "2026-11-12T00:30:00Z")], null, "2일 밖 — 같은 제목의 다른 날 기사"],
      [[cand("비트코인 반등 시작…산업 곳곳 초록불", "2026-11-09T00:30:00Z")], null, "비슷한 남의 기사(겹침 < 0.8)"],
      [[], null, "후보 없음"],
    ];
    for (const [cands, want, why] of table) assert.equal(pickSameArticle(query, cands)?.title ?? null, want, why);
  });

  it("두 번째 검색어 — 앞 낱말 다섯 · 문장부호 · 머리말 뺌 · 짧으면 null", () => {
    assert.equal(shortSearchTitleOf("최순실, 이영돈TV와 인터뷰 “태블릿PC 내 소유 아냐...검찰이 실물 보여주지도 않고 기소”"), "최순실 이영돈TV와 인터뷰 태블릿PC 내");
    assert.equal(shortSearchTitleOf("[단독] 미래에셋證 해킹 의심 정황 금감원 검사 착수 - 예시"), "미래에셋證 해킹 의심 정황 금감원");
    assert.equal(shortSearchTitleOf("두나무, 상속 제도 제안"), null);
  });

  it("줄인 제목 — 짧은 쪽 12자 이상이 그대로 들어 있고 30분 안이면 같은 기사(실측 겹침 0.75)", () => {
    const q = { key: "kr:1", title: "최순실, 이영돈TV와 인터뷰 “태블릿PC 내 소유 아냐...검찰이 실물 보여주지도 않고 기소”", publishedAt: at("2026-11-09T02:08:39Z") };
    const short = "최순실, 이영돈TV와 인터뷰 “태블릿PC 내 소유 아냐”";
    const table: Array<[ArticleCandidate[], boolean, string]> = [
      [[cand(short, "2026-11-09T02:09:00Z")], true, "줄인 제목 · 21초"],
      [[cand(short, "2026-11-09T03:00:00Z")], false, "줄인 제목이어도 30분 밖(겹침 0.75 < 0.8)"],
      [[cand("최순실 인터뷰", "2026-11-09T02:09:00Z")], false, "짧은 쪽 12자 미만"],
    ];
    for (const [cands, ok, why] of table) assert.equal(pickSameArticle(q, cands) !== null, ok, why);
  });

  it("같은 점수면 포털이 품은 기사(본문 칸이 일정)", () => {
    const picked = pickSameArticle(query, [cand("비트코인 하락 어디까지 산업 곳곳 빨간불", "2026-11-09T00:00:00Z", false), cand("비트코인 하락 어디까지 산업 곳곳 빨간불", "2026-11-09T00:00:00Z", true)]);
    assert.ok(picked?.portalUrl);
  });
});

describe("문단 정리", () => {
  it("저작권 · 기자 메일 · 구독 권유 · 면책 꼬리를 버리고 빈 줄 · 연속 중복을 지운다", () => {
    const out = cleanParagraphs([
      "  비트코인이   7만4,000달러 선까지 밀렸다.  ",
      "",
      "비트코인이 7만4,000달러 선까지 밀렸다.",
      "미국 중간선거 이후 규제 강화 우려가 커졌다.",
      "홍길동 기자 hong@example.com",
      "hong@example.com",
      "저작권자 © 예시뉴스 무단전재 및 재배포 금지",
      "본 기사는 투자 손실에 대해 책임을 지지 않습니다.",
      "구독하기",
      "베타뉴스 이 직 (leejik@betanews.net)",
      "고다솔 기자 | 입력 : 2026/11/09 [09:30]",
      "Fn투데이는 여러분의 후원금을 귀하게 쓰겠습니다.",
    ]);
    assert.deepEqual(out, ["비트코인이 7만4,000달러 선까지 밀렸다.", "미국 중간선거 이후 규제 강화 우려가 커졌다."]);
  });

  it("제목을 되풀이한 줄(머리 제목 · 매체 꼬리 붙은 제목)은 버린다 — 모달 머리에 이미 있다", () => {
    const title = "비트코인 하락 어디까지…산업 곳곳 빨간불 - 예시일보";
    assert.deepEqual(cleanParagraphs(["비트코인 하락 어디까지 산업 곳곳 빨간불", "본문 첫 줄이다."], title), ["본문 첫 줄이다."]);
  });

  it("언론사 페이지 잡음 — 기자 이름 · 글자 크기 단추 · 사진 설명 · 해시태그를 버리고 관련 기사 목록 머리에서 멈춘다(2026-11-09 실측 모양)", () => {
    const out = cleanParagraphs([
      "김범근 기자",
      "기자 이름을 클릭하면",
      "확인할 수 있어요!",
      "가장작게",
      "크게",
      "▲9일 서울 중구 딜링룸 전광판에 코스피 등이 표시돼 있다. (사진= 연합뉴스)",
      "코스피가 장 초반 하락세를 딛고 상승 전환했다.",
      "#엔비디아 협력",
      "관련 뉴스",
      "삼성전자, 신제품 출시",
      "화나요0",
    ]);
    assert.deepEqual(out, ["코스피가 장 초반 하락세를 딛고 상승 전환했다."]);
  });

  it("화면 단추 · 꼬리와 같은 낱말이 든 짧은 본문 문장은 남긴다(허용 · 거절 경계, 2026-11-09 확인 2회차)", () => {
    const keep = [
      "넷플릭스 구독자가 1억 명을 넘었다.",
      "정치 후원금 논란이 커졌다.",
      "게시물 좋아요 수가 급증했다.",
      "링크를 클릭하면 이벤트 페이지로 이동한다.",
      "관련 기사에 따르면 거래량이 늘었다.",
      "2026.11.09 발표된 지표가 시장을 흔들었다.",
    ];
    const drop = [
      "구독하기", "좋아요", "공유하기", "다른기사 보기", "Fn투데이는 여러분의 후원금을 귀하게 쓰겠습니다.", "기자 이름을 클릭하면",
      "2026.11.09 09:49", "2026-11-09", "기사의 본문 내용은 이 글자크기로 변경됩니다.",
    ];
    assert.deepEqual(cleanParagraphs([...keep, ...drop]), keep);
  });

  it("짧아도 문장으로 끝나면 남긴다", () => {
    assert.deepEqual(cleanParagraphs(["값이 올랐다.", "“그렇다”"]), ["값이 올랐다.", "“그렇다”"]);
  });

  it("긴 본문 문단에 '저작권' 단어가 있어도 버리지 않는다(120자 이상)", () => {
    const long = `저작권 분쟁이 커졌다. ${"가".repeat(130)}`;
    assert.deepEqual(cleanParagraphs([long]), [long]);
  });

  it("상한에서 자른다", () => {
    const out = cleanParagraphs(Array.from({ length: 50 }, (_, i) => `${i} ${"나".repeat(1000)}`));
    assert.ok(out.join("").length <= BODY_MAX_CHARS + 1100);
    assert.ok(out.length < 50);
  });
});

describe("캐시 수명", () => {
  const row = (status: "ok" | "not_found" | "failed", ago: number) => ({
    key: "k",
    status,
    paragraphs: [],
    url: null,
    originalUrl: null,
    fetchedAt: new Date(Date.UTC(2026, 10, 9) - ago),
    version: BODY_EXTRACTOR_VERSION,
  });
  const now = new Date(Date.UTC(2026, 10, 9));
  it("찾음은 영구 · 못 찾음 3시간 · 실패 30분", () => {
    assert.equal(isBodyFresh(row("ok", 365 * 24 * 3600_000), now), true);
    assert.equal(isBodyFresh(row("not_found", BODY_RETRY_NOT_FOUND_MS - 1), now), true);
    assert.equal(isBodyFresh(row("not_found", BODY_RETRY_NOT_FOUND_MS), now), false);
    assert.equal(isBodyFresh(row("failed", BODY_RETRY_FAILED_MS - 1), now), true);
    assert.equal(isBodyFresh(row("failed", BODY_RETRY_FAILED_MS), now), false);
  });
});
