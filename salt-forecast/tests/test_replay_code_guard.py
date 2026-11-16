"""동결 재생 코드 가드(short-direction@5 · vol-range@3) — 실제 저장소 git 으로."""

import subprocess

from salt_forecast.jobs.rule_ic import ROOT
from salt_forecast.jobs.short_direction import LOCK_FILES, code_changed_since, prediction_code_paths


def _head() -> str:
    return subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.strip()


def test_same_commit_is_same_code() -> None:
    assert code_changed_since(f"short-direction@5+{_head()}") is False


def test_unknown_commit_blocks_replay() -> None:
    assert code_changed_since("short-direction@5+0000000") is True  # 모르면 막는다
    assert code_changed_since("short-direction@5") is True  # 커밋 없는 버전 문자열


def test_paths_are_loaded_prediction_modules_and_locks() -> None:
    paths = prediction_code_paths()
    assert "salt-forecast/src/salt_forecast/domain/short_direction.py" in paths
    assert all(p.startswith("salt-forecast/src/salt_forecast/") for p in paths if p not in LOCK_FILES)
    assert set(LOCK_FILES) <= set(paths)
