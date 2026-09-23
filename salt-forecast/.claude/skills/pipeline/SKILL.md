---
name: pipeline
description: "SALT Forecast plan → orchestrate → validate → deliver → retrospect 순서로 작업을 진행한다"
argument-hint: <요구사항 파일명 또는 자유 텍스트>
---

# SALT Forecast 파이프라인

`salt-forecast/CLAUDE.md` 와 `.claude/rules/**` 를 먼저 읽는다. 특히 `time-and-leakage.md`.

1. **plan** — REQ(`FC-REQ-*`)를 소스 · 온톨로지 · 피처 · 모델 · 채점 · DB 계약 영향으로 쪼갠다.
   DB 계약(`forecast` 테이블 · 뷰)이 바뀌면 `DB-REQ` · `SRV-REQ` 짝을 같은 계획에 넣는다.
2. **orchestrate** — 층 순서(domain → store → ingest/ontology → features → models → scoring → jobs)로 구현.
   소스 추가 시 `security-sources.md` 표가 먼저.
3. **validate** — `python-style.md` §7 전부. 누수 테스트 결과 · `--dry-run` 출력 · (모델 변경 시) 워크포워드 리포트의
   기준 대비 표를 체크리스트에 붙인다. **안 돌린 것은 체크하지 않는다.**
4. **deliver** — 영역 REQ 체크리스트 `salt-forecast/requirements/reports/checklists/<REQ-ID>.md`,
   REQ 이동(to-do → in-progress → done), 루트 슬라이스 3종 · 마스터 인덱스 상태표 · 슬라이스 단락 · 변경 이력,
   `FEATURE-008` 변경 이력.
5. **retrospect** — 루트 `requirements/reports/retrospects/<slice>.md` + 영역 REQ 회고. 모델 성적이 기대와 달랐다면
   그 사실과 원인 가설을 적는다(좋은 숫자만 남기지 않는다).
