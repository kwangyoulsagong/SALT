"""예측 코드 가드 — 적합 커밋 뒤 이 프로세스가 불러온 예측 코드가 바뀌었나(단타 @5 · 흔들림 @3 재생 (2) · 실시간).

단타 작업 안에 있던 것을 떼어 냈다(2026-11-17) — vol_range 가 단타 모듈을 import 하면 단타 모듈 수십 개가 vol_range 의
'불러온 예측 코드'로 잡혀, 단타만 바꿔도 흔들림 재생이 막혔다. 이 모듈은 salt_forecast 의 다른 모듈을 불러오지 않는다.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # salt-forecast

# 예측 숫자를 바꿀 수 있는 것 = 이 작업이 실제로 불러온 salt_forecast 모듈 파일 + 의존성 잠금.
# 그 밖(문서 · 서버 · 다른 실험 모듈 · 사전등록 문장)만 바뀐 커밋은 같은 코드로 본다(@5)
LOCK_FILES = ("salt-forecast/pyproject.toml", "salt-forecast/uv.lock")


def prediction_code_paths() -> list[str]:
    """지금 프로세스에 올라온 salt_forecast 모듈 파일(저장소 기준 경로)."""
    src = (ROOT / "src").resolve()
    paths = {
        str(Path(f).resolve().relative_to(ROOT.parent.resolve()))
        for name, mod in list(sys.modules.items())
        if name.startswith("salt_forecast") and (f := getattr(mod, "__file__", None))
        and Path(f).resolve().is_relative_to(src)
    }  # fmt: skip
    return sorted(paths) + list(LOCK_FILES)


def code_changed_since(model_version: str, *, repo: Path | None = None, paths: list[str] | None = None) -> bool:
    """model_version 의 커밋(`…+<sha>`) 뒤 예측 코드가 바뀌었나. 알 수 없으면(커밋 없음 · git 실패) 바뀐 것으로.

    대조 대상은 HEAD 가 아니라 **지금 디스크의 파일**(= 이 프로세스가 불러온 것)이다. HEAD 와 대조하면
    커밋 안 한 수정 · 새 파일로 돈 예측이 '같은 코드'로 통과한다(2026-11-17 — 작업 트리에서 배치가 돈다)."""
    if "+" not in model_version:
        return True
    sha = model_version.rsplit("+", 1)[-1]
    cwd = repo if repo is not None else ROOT.parent
    files = paths if paths is not None else prediction_code_paths()
    try:
        diff = subprocess.run(["git", "diff", "--quiet", sha, "--", *files], cwd=cwd, capture_output=True)
        untracked = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard", "--", *files], cwd=cwd, capture_output=True, text=True
        )
    except OSError:
        return True
    return diff.returncode != 0 or untracked.returncode != 0 or bool(untracked.stdout.strip())
