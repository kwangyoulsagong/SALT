# F000-desktop-dashboard — 체크리스트

## 2026-11-26 — 구현 · 실화면

브랜치 `feat/fe-home-desktop-polish`. 영역: `salt-microFe/.../FE-REQ-048.md` · `FE-REQ-060.md` · `FE-REQ-054.md` · `bff/.../BFF-REQ-046.md` 외 파일만 걸침 6.

### 검증
- 프론트 `pnpm check-types` · `lint` 14/14 · `@repo/ui` test 136(글자 크기 · 움직임 래칫) · web 10 · core 413 · `build-storybook` · 레이어 훅 사후 0
- BFF `npm run build` · `npm test` 628/628(새 `app-home-market` 6) · 재시작 · 새 경로 무토큰 401
- zone 운영 빌드(`ops/salt.sh web prod web web-savings`): 셸 `/home` 첫 로드 168 → 176 kB(+8 — 일러스트 · 스파크라인 · 종목 아이콘 · 알림 줄) · 저축 `/goals` 163 → 166 kB
- 실화면(셸 · 저축 dev — 이 트리 · 임시 계정 · Chrome): 빈 계정 · 기록 있는 계정(지출 11 · 목표 2 · 적립 2 · 월 적립액) × 1440 · 1280 · 1024 — 가로 넘침 0 · 콘솔 오류 0. 결함 셋 고침(좁은 칸 시장 이름 잘림 → 같은 꼴 세 줄 · 지수 표지 "코스" 둘 → 차트 글리프 · 숫자 중복 → 차트 칸 머리 숫자 뺌) + 저축 목표 칸 위 빈칸(진척 목록 위 정렬)
- 임시 계정 BFF 계정 삭제 → 남은 행 0 · 셸 · 저축 운영 모드로 되돌림

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 홈 첫 블록 300ms · 전체 1.5s 측정 | 새 블록 셋(시장 · 브리핑 · 적립)이 첫 페인트 뒤 클라이언트에서 따로 온다 — 측정 스크립트 미실행 | 머지 전 `measure-streaming` 또는 트레이스 |
| 투자 zone 머리 실화면 | 공용 머리라 셸 · 저축에서 확인 · 투자 zone 운영 빌드는 다음 재빌드 | 다음 `web prod web-investment` |
| 가계부 화면 채우기 · 금융 팁 블록 | 범위 밖(슬라이스 표) | 요청 · 팁 공개 뒤 |
