/**
 * `coach` 슬라이스의 public API (`layered-architecture.md` §4).
 *
 * 추천 · 점수 · 근거 3종 · 성적표. 지금은 **우측 AI 코치 패널**이 쓰는 조회와 표시
 * 블록만 있다(`FE-REQ-026` K). 코치 리포트 · 상세 분석 페이지가 이 위에 붙는다.
 */
export * from "./api";
export * from "./lib";
export * from "./model";
export * from "./ui";
