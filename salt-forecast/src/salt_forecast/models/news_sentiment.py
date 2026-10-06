"""뉴스 감성 — 로컬 금융 특화 분류 모델(F010 슬라이스 6 3차 · FC-REQ-016 · `data-pipeline.md` §5).

한국어 `snunlp/KR-FinBert-SC`, 영어 `ProsusAI/finbert`. 둘 다 CPU · 무료 · 3분류(부정 · 중립 · 긍정).
**범용 LLM 으로 점수를 내지 않는다** — 재현 · 채점이 안 된다.

## 가중치 고정 (`security-sources.md` §5)

모델 저장소 기본 가중치는 `pytorch_model.bin`(pickle)이다. 외부 pickle 을 열지 않으려고 Hugging Face 자동 변환
safetensors 리비전을 쓰고, 그 리비전 · 파일 sha256 을 여기 고정한다. 받은 파일의 해시가 다르면 실패한다.
`trust_remote_code` 는 쓰지 않는다.

## 입력

제목만, **종목명을 가린 뒤**(`domain/news_text.mask_assets`). 피드마다 요약 모양이 달라(Google News 요약은
제목 + 매체명) 요약을 넣으면 피드에 따라 점수가 달라진다.

transformers · torch 는 `nlp` 의존성 그룹이다 — 이 모듈을 불러도 실제 import 는 `load()` 때 한다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, cast

from salt_forecast.domain.news_text import MASK_EN, MASK_KO, AssetAlias, event_tags, link_symbols, mask_assets
from salt_forecast.store.news import ScoreRow, Unscored

PREREG_KEY = "news-sentiment@1"
MAX_TOKENS = 128
BATCH = 32


@dataclass(frozen=True, slots=True)
class ModelSpec:
    lang: str
    repo: str
    revision: str  # safetensors 가 있는 리비전(자동 변환)
    sha256: str  # model.safetensors
    labels: tuple[str, str, str]  # id 0 · 1 · 2 의 뜻(neg · neu · pos 중 하나씩)

    @property
    def version(self) -> str:
        return f"{PREREG_KEY}:{self.repo.split('/')[-1].lower()}@{self.revision[:7]}"


SPECS: dict[str, ModelSpec] = {
    "ko": ModelSpec(
        "ko",
        "snunlp/KR-FinBert-SC",
        "84112ea0bfd747afaf843cb38bcddf2afe0c21ac",
        "9e1ca3ffb2212c1f206d09b51f4042add6902cc1d65a2bf182958f50e67c2058",
        ("neg", "neu", "pos"),
    ),
    "en": ModelSpec(
        "en",
        "ProsusAI/finbert",
        "7db323f79b751944bcfa66298ec06977e4518306",
        "e5897858ff819aad7629b96ce521ae5477952d03634ef5dd30ed2d76357a9f00",
        ("pos", "neg", "neu"),
    ),
}


@dataclass(frozen=True, slots=True)
class Sentiment:
    p_pos: float
    p_neu: float
    p_neg: float

    @property
    def score(self) -> float:
        return self.p_pos - self.p_neg


class ModelHashMismatch(Exception):
    pass


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class SentimentModel:
    """한 언어의 분류기. `load()` 가 가중치 해시를 확인한다."""

    def __init__(self, spec: ModelSpec, tokenizer: Any, model: Any) -> None:  # Any: transformers 경계
        self.spec = spec
        self._tokenizer = tokenizer
        self._model = model

    @classmethod
    def load(cls, spec: ModelSpec) -> SentimentModel:
        from huggingface_hub import hf_hub_download  # pyright: ignore[reportUnknownVariableType]
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        weights = Path(hf_hub_download(spec.repo, "model.safetensors", revision=spec.revision))
        got = _sha256(weights)
        if got != spec.sha256:
            raise ModelHashMismatch(f"{spec.repo}@{spec.revision[:7]} 가중치 해시 불일치: {got[:12]}")
        tokenizer = cast(Any, AutoTokenizer.from_pretrained(spec.repo, revision=spec.revision))  # pyright: ignore[reportUnknownMemberType]
        model = cast(
            Any,
            AutoModelForSequenceClassification.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                spec.repo, revision=spec.revision, use_safetensors=True
            ),
        )
        model.eval()  # pyright: ignore[reportUnknownMemberType]
        labels = tuple(str(model.config.id2label[i]).lower()[:3] for i in range(3))  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
        if labels != spec.labels:
            raise ModelHashMismatch(f"{spec.repo} 라벨 순서가 다르다: {labels}")
        return cls(spec, tokenizer, model)

    def classify(self, texts: Sequence[str]) -> list[Sentiment]:
        import torch

        out: list[Sentiment] = []
        idx = {name: i for i, name in enumerate(self.spec.labels)}
        for start in range(0, len(texts), BATCH):
            batch = list(texts[start : start + BATCH])
            enc = self._tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=MAX_TOKENS)
            with torch.no_grad():
                probs = cast(list[list[float]], torch.softmax(self._model(**enc).logits, dim=-1).tolist())  # pyright: ignore[reportUnknownMemberType]
            for p in probs:
                out.append(Sentiment(p_pos=p[idx["pos"]], p_neu=p[idx["neu"]], p_neg=p[idx["neg"]]))
        return out


def score_items(
    items: Sequence[Unscored],
    aliases: Sequence[AssetAlias],
    models: dict[str, SentimentModel],
    scored_at: datetime,
) -> list[ScoreRow]:
    """종목 연결 · 사건 태그는 원문으로, 감성은 종목명을 가린 제목으로. 모델이 없는 언어는 건너뛴다."""
    out: list[ScoreRow] = []
    for lang, model in models.items():
        batch = [i for i in items if i.lang == lang]
        if not batch:
            continue
        token = MASK_KO if lang == "ko" else MASK_EN
        sentiments = model.classify([mask_assets(i.title, aliases, token) for i in batch])
        for item, s in zip(batch, sentiments, strict=True):
            kinds, negated = event_tags(item.title)
            out.append(
                ScoreRow(
                    item_id=item.item_id,
                    model_version=model.spec.version,
                    symbols=link_symbols(item.title, aliases),
                    event_kinds=kinds,
                    negated=negated,
                    p_pos=s.p_pos,
                    p_neu=s.p_neu,
                    p_neg=s.p_neg,
                    score=s.score,
                    scored_at=scored_at,
                )
            )
    return out
