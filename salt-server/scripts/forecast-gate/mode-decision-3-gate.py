"""mode-decision@3 [gate] — 표본 밖 후보 초과수익(사전등록 salt-server/preregistration/2026-11-12-mode-decision-3.toml).

@3 은 점수가 @2 와 같고 행동 대응만 다르다(점수 ≥ 60 = 후보). 그래서 signal-skill@1 이 저장한 @2 과거 검산 행(코인은 2026-09-29 뒤만 저장 = 표본 밖,
국내는 전부 표본 밖)에서 점수 ≥ 60 행이 곧 @3 후보다 — 같은 일정 · 같은 채점이라 signal-skill@2 를 다시 돌린 것과 같은 표본이다.
측정은 judgment-tier@1 [measure] excess(후보 r − 비용 − 같은 칸 같은 날 평균) · 날짜 블록 부트스트랩 2,000회 · seed 20261111.
실행: cd salt-forecast && uv run python -I ../salt-server/scripts/forecast-gate/mode-decision-3-gate.py <DB URL>
"""
import sys, numpy as np, psycopg
from collections import defaultdict
url=sys.argv[1]
TAX={2021:.0023,2022:.0023,2023:.0020,2024:.0018,2025:.0015,2026:.0020}
rows=psycopg.connect(url).execute("""
select case when signal_type like 'kr\\_stock.%%' then 'kr' else 'crypto' end, mode, sample_origin, score,
 return_rate::float8, (judged_at at time zone 'UTC' at time zone 'Asia/Seoul')::date
from symbol_judgment_snapshots where rule_version='mode-decision@2' and sample_origin in ('backtest_full','backtest_price_only') and outcome is not null""").fetchall()
cells=defaultdict(list)
for m,mode,o,s,r,d in rows: cells[(m,mode,o)].append((s,r,d))
rng_seed=20261111
for k,v in sorted(cells.items()):
    byday=defaultdict(list)
    for s,r,d in v: byday[d].append((s,r))
    days=sorted(byday); de={}
    for d in days:
        md=np.mean([r for _,r in byday[d]])
        cost=0.001 if k[0]=='crypto' else 0.000186*2+TAX[d.year]
        de[d]=[r-cost-md for s,r in byday[d] if s>=60]
    cd=[d for d in days if de[d]]
    n=sum(len(de[d]) for d in cd)
    if n==0: print(k,'후보 0'); continue
    est=np.mean([e for d in cd for e in de[d]])
    rng=np.random.default_rng(rng_seed); bs=[]
    arr=[np.array(de[d]) for d in cd]
    for _ in range(2000):
        idx=rng.integers(0,len(cd),len(cd)); bs.append(np.concatenate([arr[i] for i in idx]).mean())
    lo,hi=np.percentile(bs,[2.5,97.5])
    print(k, f"후보 {n} · 날 {len(cd)} · 초과 평균 {est*100:+.3f}% · 95% [{lo*100:+.3f}, {hi*100:+.3f}]")
