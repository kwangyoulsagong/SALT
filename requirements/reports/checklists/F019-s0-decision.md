# F019 순서 0 체크리스트

| 항목 | 결과 |
|---|---|
| `ADR-012` 결정 · 되돌리는 법 | pass |
| `ADR-005` 표면 zone 행 | pass |
| 기획 · 전 영역 계획 · REQ 071~073 | pass(to-do) |
| RN 문서 삭제 — `git ls-files | grep RN-REQ` 0 | pass |
| 살아 있는 규칙 · CLAUDE.md 의 RN 서술 0(줄 그은 기록 제외) | pass — `grep -rn "rn-architecture\|performance-rn\|ui-native" .claude` |
| 문구 "데스크톱으로 이동해 주세요" | pass(문자열) · 화면은 순서 1 에서 |
| 모바일 용으로 설치한 도구 정리(brew ffmpeg · Playwright 녹화 ffmpeg) | pass — 사용자 "설치한 게 있으면 삭제" |

## 미검증

| 항목 | 사유 | 언제 |
|---|---|---|
| iOS · Android 실기기 설치 · 푸시 | 코드 없음 | 순서 1 · 4 |
| `/m` 정적 파일 합치기 충돌 | zone 없음 | 순서 1 |
