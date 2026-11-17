#!/bin/zsh
# ops/sync-run.sh 시험 — 임시 git 저장소(가짜 origin)로 경계 다섯을 센다. 네트워크 · DB 0, uv 는 가짜(부른 인자만 남긴다)
#   1 개발 트리에서 부르면 아무것도 안 한다   2 실행 트리 리포트를 개발 트리로 옮긴다   3 다른 배치가 돌면 미룬다
#   4 문서만 바뀌면 맞추고 다시 적합 안 함      5 예측 코드가 바뀌면 맞추고 다시 적합
set -u
SRC="${0:A:h}/sync-run.sh"
T=$(mktemp -d); T=${T:A}; trap 'pkill -f "$T/run/salt-forecast/ops/daily.sh" 2>/dev/null; rm -rf "$T"' EXIT
fail=0
check() { if eval "$2"; then print -r -- "ok   $1"; else print -r -- "FAIL $1"; fail=1; fi; }
g() { git -C "$1" -c user.email=t@t -c user.name=t "${@:2}"; }

git init -q --bare "$T/origin.git"
git init -q -b main "$T/dev"
mkdir -p "$T/dev/salt-forecast/src" "$T/dev/salt-forecast/ops" "$T/dev/salt-forecast/reports"
print "x = 1" > "$T/dev/salt-forecast/src/m.py"
print "r" > "$T/dev/salt-forecast/reports/old.md"
cp "$SRC" "$T/dev/salt-forecast/ops/sync-run.sh"
g "$T/dev" add -A; g "$T/dev" commit -qm c1
g "$T/dev" remote add origin "$T/origin.git"; g "$T/dev" push -q origin main
g "$T/dev" worktree add -q --detach "$T/run" origin/main
OUT="$T/devout"; mkdir -p "$OUT"
cat > "$T/uv" <<'EOF'
#!/bin/zsh
print -r -- "$*" >> "${0:h}/uv.log"
EOF
chmod +x "$T/uv"; : > "$T/uv.log"
run() { SALT_DEV_ROOT="$1" UV="$T/uv" /bin/zsh "$T/run/salt-forecast/ops/sync-run.sh" >/dev/null 2>&1; }
head_of() { git -C "$T/run" rev-parse HEAD; }

# 1
SALT_DEV_ROOT="$T/run" UV="$T/uv" /bin/zsh "$T/run/salt-forecast/ops/sync-run.sh" >/dev/null 2>&1
check "1 개발 트리에서 부르면 no-op" '[[ ! -s $T/uv.log ]]'

# 2 — 새 리포트 · 바뀐 리포트만 옮긴다
print "new" > "$T/run/salt-forecast/reports/new.md"
run "$OUT"
check "2 새 리포트를 개발 트리로" '[[ -f $OUT/salt-forecast/reports/new.md ]]'
check "2 손 안 댄 리포트는 안 옮김" '[[ ! -e $OUT/salt-forecast/reports/old.md ]]'

# 3 — 문서 커밋이 올라왔지만 다른 배치가 돈다
print "doc" > "$T/dev/README.md"; g "$T/dev" add -A; g "$T/dev" commit -qm c2; g "$T/dev" push -q origin main
before=$(head_of)
/bin/zsh -c 'sleep 20; :' "$T/run/salt-forecast/ops/daily.sh" &  # ; : — zsh 가 sleep 으로 바뀌어 명령줄에서 경로가 사라지지 않게
sleep 0.5
run "$OUT"
check "3 다른 배치가 돌면 미룬다" '[[ $(head_of) == $before ]]'
kill %1 2>/dev/null; wait 2>/dev/null

# 4 — 이제 맞춘다, 예측 코드는 그대로라 다시 적합 없음
: > "$T/uv.log"
run "$OUT"
check "4 문서만 — origin/main 으로 맞춤" '[[ $(head_of) == $(git -C $T/dev rev-parse HEAD) ]]'
check "4 문서만 — 다시 적합 안 함" '! grep -q "short_direction test" $T/uv.log'

# 5 — 예측 코드 바뀜
print "x = 2" > "$T/dev/salt-forecast/src/m.py"; g "$T/dev" add -A; g "$T/dev" commit -qm c3; g "$T/dev" push -q origin main
: > "$T/uv.log"
run "$OUT"
check "5 코드 바뀜 — 맞춤" '[[ $(head_of) == $(git -C $T/dev rev-parse HEAD) ]]'
check "5 코드 바뀜 — 다시 적합" 'grep -q "short_direction test" $T/uv.log'
check "5 잠금 파일 남지 않음" '[[ ! -e $T/run/.salt-sync.lock ]]'
exit $fail
