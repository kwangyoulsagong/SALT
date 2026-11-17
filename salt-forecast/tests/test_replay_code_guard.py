"""동결 재생 코드 가드(short-direction@5 · vol-range@3) — 실제 저장소 git 으로."""

import subprocess
from pathlib import Path

from salt_forecast.jobs.code_guard import LOCK_FILES, code_changed_since, prediction_code_paths


def test_unknown_commit_blocks_replay() -> None:
    assert code_changed_since("short-direction@5+0000000") is True  # 모르면 막는다
    assert code_changed_since("short-direction@5") is True  # 커밋 없는 버전 문자열


def test_paths_are_loaded_prediction_modules_and_locks() -> None:
    paths = prediction_code_paths()
    assert "salt-forecast/src/salt_forecast/domain/short_direction.py" in paths
    assert all(p.startswith("salt-forecast/src/salt_forecast/") for p in paths if p not in LOCK_FILES)
    assert set(LOCK_FILES) <= set(paths)


def _repo(tmp_path: Path) -> tuple[Path, str]:
    """작은 git 저장소 — 예측 모듈 하나를 커밋하고 그 커밋 번호를 돌려준다."""

    def git(*a: str) -> str:
        return subprocess.run(["git", *a], cwd=tmp_path, capture_output=True, text=True, check=True).stdout.strip()

    git("init", "-q")
    git("config", "user.email", "t@t")
    git("config", "user.name", "t")
    (tmp_path / "m.py").write_text("x = 1\n")
    git("add", "m.py")
    git("commit", "-qm", "a")
    return tmp_path, git("rev-parse", "--short", "HEAD")


# 경계 표 — 지금 디스크의 파일이 적합 커밋과 같을 때만 같은 코드(2026-11-17: HEAD 대조는 커밋 안 한 수정을 못 봤다)
def test_clean_tree_at_fit_commit_is_same(tmp_path: Path) -> None:
    repo, sha = _repo(tmp_path)
    assert code_changed_since(f"k@5+{sha}", repo=repo, paths=["m.py"]) is False


def test_uncommitted_edit_blocks(tmp_path: Path) -> None:
    repo, sha = _repo(tmp_path)
    (repo / "m.py").write_text("x = 2\n")  # HEAD 는 그대로 — 예전 가드는 통과시켰다
    assert code_changed_since(f"k@5+{sha}", repo=repo, paths=["m.py"]) is True


def test_untracked_loaded_module_blocks(tmp_path: Path) -> None:
    repo, sha = _repo(tmp_path)
    (repo / "n.py").write_text("y = 1\n")  # 커밋 안 한 새 모듈을 불러왔다
    assert code_changed_since(f"k@5+{sha}", repo=repo, paths=["m.py", "n.py"]) is True


def test_unrelated_file_change_passes(tmp_path: Path) -> None:
    repo, sha = _repo(tmp_path)
    (repo / "doc.md").write_text("문서\n")  # 불러오지 않은 파일 — 막지 않는다
    assert code_changed_since(f"k@5+{sha}", repo=repo, paths=["m.py"]) is False
