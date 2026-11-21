---
id: F019-S3-MOBILE-OFFLINE-INSTALL
title: "F019 순서 3 — 휴대폰 오프라인 마지막 화면 · 설치 안내"
created: 2026-11-21
---

## Summary

`FE-REQ-073`. 연결이 끊겨도 홈 · 저축 · 가계부의 **마지막으로 본 숫자 한 벌**을 "오프라인 · HH:MM 기준" 띠와 함께 보이고, 쓰기는 막고 이유를 한 줄로 말한다.
설치 안내는 첫 진입엔 띄우지 않고 홈 맨 아래 카드 한 장. 서버 · BFF · DB 변경 0 — 같은 응답의 표시용 글자만 이 기기에 둔다.

**불변식: 그 사용자의 한 벌만 그린다** — 세션 사용자가 없거나 다르면 0, 로그아웃 · 세션 죽음 · 새 로그인에 그 자리에서 지운다.

| 산출물 | 위치 |
|---|---|
| 계약 | `@repo/core/mobile` `offline.ts` — DB 이름 · 화면 키 · `offlineRecordFor`(사용자 일치) · `offlineStampText`(서울 시각) |
| 저장소 | `@repo/web-shared/lib` `offlineSnapshot`(IndexedDB) · 지우기 `clearSession` + `SignInForm` |
| 오프라인 한 장 | `layout/mobile/offlinePage.ts` — 서비스 워커가 precache 한 자족 HTML 의 인라인 스크립트가 그 경로의 한 벌을 그림(`textContent` 만) |
| 화면 안 대체 | `MobileOfflineFallback`(받기 실패 · 끊겨 멈춘 조회) · `MobileOfflineSave`(홈 · 저축 · 가계부) |
| 쓰기 막기 | `MobileSheetAction` + `useOnline` — 버튼 막힘 · 이유 한 줄 · 열린 시트 `fieldset disabled` |
| 설치 안내 | `MobileInstallCard`(판정) / `MobileInstallCardBody`(보일 때 받는 청크) · `Illustration` `addToHome` |

## 판단

1. **한 벌은 응답이 아니라 화면 글자** — 서버 값을 화면이 고른 그대로 담아 오프라인 한 장이 계산 · 도메인 코드 없이 그린다. 투자는 담지 않는다(시세는 지난 값이 틀린 정보)
2. **오프라인 문서 이동은 서비스 워커의 한 장이, 받기 실패는 화면 안에서** — 끊긴 채 Next 청크를 믿지 않는다. 연결은 됐는데 실패하면 "오프라인"이라 쓰지 않는다
3. **첫 진입엔 늘 0 인 설치 카드는 몸통을 나눈다** — 홈 첫 로드 +30 → +5 kB
4. **배터리**(사용자 2026-11-21 "모바일을 신경써야") — 타이머 · 폴링 0, 연결 상태는 사건만, 쓰기는 값이 바뀔 때 한 번

## 확인

`salt-microFe/requirements/reports/checklists/FE-REQ-073.md` — 임시 계정 둘 · 오프라인(서비스 워커 요청까지 끊음) 45/45 · 청크 실패 · 데스크톱 회귀 10/10 · 390 · 360 · main 대조 번들. 실기기는 `QA-001` Q-7
