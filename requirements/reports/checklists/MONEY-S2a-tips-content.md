# MONEY-S2a-tips-content — 체크리스트

## 2026-11-05 — 구현 · 확인 · done

커밋 `38e2d16d`(서버 content) · `dd7f536a`(법적 선 꼬리) · `36d1f7b9`(BFF) · `5cc3b415`(@repo/ui 카드) · `6f9cab4b`(lint) · `9e6973ae`(팁 zone) · `5915638f`(때맞춘 팁 칸). 영역 체크리스트: `salt-server/.../DB-REQ-039.md` · `SRV-REQ-047.md` · `bff/.../BFF-REQ-049.md` · `salt-microFe/.../FE-REQ-058.md`.

### 수용 기준 10/11
- [x] `DB-REQ-039` 2/2 — 메타 빠진 INSERT 23502 · 구간 겹침 23P01
- [x] `SRV-REQ-047` 3/3 — 발행 검사 · 변이 12 · 유효기한 경계 · 공개 플래그 꺼짐 기본
- [x] `BFF-REQ-049` 2/2 — 공개 응답 사용자 정보 0 · 비로그인 401
- [ ] `FE-REQ-058` 3/4 — LCP 미측정(깨짐 0 은 확인)

### 검증(최종 HEAD)
- 서버 `./gradlew check` — 앱 77 · content 도메인 8 · 원문 3 · 경계 · 실 Postgres · RabbitMQ / 실행 jar → 로컬 운영 DB(`svc_content` 로그인 · Flyway V1 · 글 5 · 파라미터 6)
- BFF `npm run build` · `npm test` 390
- FE `check-types` · `lint` 13/13 · `test`(core 171 · ui 46) · `test:layer-check` 16/10 · zone 빌드 5 · `build-storybook` · 훅 사후 42파일 0 — 빌드는 별도 worktree
- 번들: `/tips` 143 kB(정적 ISR 1분) · `/tips/[slug]` 107 kB · `/goals` 152 · `/household` 166 kB(전후는 영역 체크리스트 `FE-REQ-058`)
- 실화면(셸 3001 → 팁 3005 · 저축 3003 · 가계부 3004 · 임시 사용자 · 확인 뒤 삭제 · 공개 플래그는 확인 동안만 켬): 목록 · 글 360 · 390 웹뷰 · 1280 가로 넘침 0 · 없는 글 404 · 주거 목표 → 저축 카드 → 닫기 → 다음 글 · 가계부 카드 · 플래그 끔 → 준비 중 · noindex · 글 404
- `node scripts/check-done.mjs` 통과

### 실화면이 찾은 결함(고침)
| 결함 | 원인 | 고침 |
|---|---|---|
| 저축 화면 for-me 400(`context=undefined`) | `"use client"` 파일의 enum 을 서버 페이지가 읽음 — 클라이언트 참조 | enum 을 지시문 없는 파일로 + lint `@repo/fsd/no-client-enum-export`(셀 수 있는 결함, `DEV-001`) |
| 플래그를 꺼도 글이 200 | Next 데이터 캐시가 404 재검증으로 앞선 200 을 안 덮는다 | 글은 목록(늘 200)이 공개 · slug 있을 때만 |
| 회사 이름 목록에 참고 서비스 이름 | 목록으로 늘어놓음 | 업권 꼬리 꼴(`dd7f536a`) |

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| LCP 2.5s(휴대폰 폭) | 운영 빌드 측정 전 | 공개 직전 |
| 법무 확인 · 법령 원문 대조 | 사용자 결정 — 확인 기록 전 공개 금지. 숫자는 보도 · 2차 자료로 대조 | 법무 확인 기록 시 |
| notification · S2b 기능 | 범위 밖(위 슬라이스 표) | S2c · S2b |
