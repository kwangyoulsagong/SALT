---
name: pr-summary
description: "현재 브랜치의 PR 본문을 템플릿대로 채워 복사용으로 출력한다"
---

# PR 요약

**목적: 사용자가 그대로 복사해 GitHub PR 본문에 붙일 마크다운을 출력한다.**
파일로 쓰지 않고, 커밋하지 않고, PR을 만들지도 않는다.

규칙은 `.claude/rules/pr-convention.md`, 템플릿은 `.github/pull_request_template.md`.

## 현재 상태

### 브랜치
!`git branch --show-current`

### 커밋 (main 대비)
!`git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline main..HEAD 2>/dev/null || echo "(main 기준을 찾지 못했다)"`

### 변경 규모
!`git diff --stat origin/main..HEAD 2>/dev/null | tail -1 || echo "(없음)"`

### 커밋별 변경 규모
!`git log --format="%h %s" origin/main..HEAD 2>/dev/null | while read -r sha rest; do echo "$sha  $(git show --stat --format="" "$sha" | tail -1)  $rest"; done`

### 영역별 변경 파일 수
!`git diff --name-only origin/main..HEAD 2>/dev/null | awk -F/ '{print $1}' | sort | uniq -c | sort -rn || echo "(없음)"`

### 진행 중 REQ
!`find . -path "*/requirements/specs/in-progress/*.md" -not -path "*/node_modules/*" 2>/dev/null | sort | sed "s|^\./||" || echo "(없음)"`

### 이번 브랜치가 건드린 REQ 문서
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep "requirements/specs/" || echo "(없음)"`

### 체크리스트 리포트 (이번 브랜치)
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep "reports/checklists/" || echo "(없음)"`

### 회고 · 스터디 (이번 브랜치)
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep -E "reports/(retrospects|studies)/" || echo "(없음)"`

### 규칙 문서 변경
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep -E "\.claude/(rules|hooks|skills)/" || echo "(없음)"`

### ADR 추가 여부
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep "requirements/decisions/" || echo "(없음)"`

### BREAKING 커밋
!`git log --format="%h %s%n%b" origin/main..HEAD 2>/dev/null | grep -E "^BREAKING CHANGE|!:" || echo "(없음)"`

### Prisma 스키마 · 마이그레이션
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep "salt-server/prisma/" || echo "(없음)"`

### 계약 파일 변경 (BFF ↔ 프론트 ↔ 서버)
!`git diff --name-only origin/main..HEAD 2>/dev/null | grep -E "(bff/src/(routes|controllers)|salt-server/src/.*(presentation|routes)|packages/core)" || echo "(없음)"`

---

## 할 일

1. 위 상태와 **체크리스트 리포트 본문**을 읽는다. 체크리스트가 검증 결과의 진실이다 —
   PR의 검증·미검증 섹션이 그것과 **어긋나면 안 된다**.
2. 이번 브랜치의 REQ 스펙에서 **왜 이렇게 했는지**를 가져온다. `Open Questions`를 해소했다면
   그 판단과 근거가 "무엇을 · 왜"의 핵심 재료다.
3. ADR이 추가·참조됐으면 그 결정을 리뷰 초점 맨 위에 올린다. 되돌리기 비용이 가장 큰 것이다.
4. 템플릿의 섹션을 채운다. **안 쓰는 섹션과 HTML 주석은 지운다.**
5. 하나의 코드 블록으로 출력한다.

### 반드시 지킬 것

- **diff를 다시 쓰지 않는다.** "왜"와 "어디를 봐야 하는지"만 쓴다 (`pr-convention.md` §0)
- **리뷰 초점은 파일이 아니라 판단**을 2~4개. 없으면 `없음 — 스펙 그대로`
- **검증은 실제로 돌린 것만** 체크. 안 돌렸으면 미검증으로 내린다
- **"미검증 · 범위 밖"을 빈칸으로 두지 않는다.** 없으면 `없음`.
  항목마다 **사유**와 **언제 닫히나**를 함께 쓴다 — 후자가 비면 미검증이 아니라 잊힌 것이다
- 커밋이 둘 이상이면 **왜 나눴는지** 한 줄씩. 되돌리기 지점이 되는 커밋은 그렇다고 표시한다
- **제품 공통 수용 기준**(`pr-convention.md` §6)에서 이번 변경에 해당하는 줄만 남긴다.
  해당 없는 줄을 체크된 채로 두면 그 섹션 전체가 거짓이 된다
- REQ 번호와 스펙·체크리스트 **링크**를 넣는다. 스펙 내용을 복사하지 않는다
- REQ를 `done/`으로 옮겼다면 네 조건(수용 기준 · 체크리스트 · 회고 · 검증 명령)이
  **실제로** 충족됐는지 확인한다. 하나라도 비면 `in-progress/`가 맞다

## 출력 형식

본문 안에 코드 펜스가 필요하면 감싸는 펜스를 더 길게 쓴다(4개 이상) — 안 그러면
복사할 때 블록이 중간에 끊긴다.

````
~~~markdown
## 무엇을 · 왜
...
~~~
````

블록 뒤에 **PR 제목 후보 한 줄**과, `gh`가 있을 때 쓸 명령을 덧붙인다:

```bash
gh pr create --title "<제목>" --body-file <경로>
```

**PR을 직접 생성하지 않는다.** 출력까지 하고 멈춘다.
