"""설정 — env 접두사 FORECAST_. 코드에서 os.environ 을 직접 읽지 않는다(python-style.md §5)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FORECAST_", env_file=".env", extra="ignore")

    database_url: SecretStr
    extra_symbols: str = ""
    upbit_base_url: str = "https://api.upbit.com/v1"
    # 업비트 시세 조회 한도(초당 10) 의 80% — data-pipeline.md §3
    upbit_requests_per_second: float = Field(default=8.0, gt=0)
    binance_futures_url: str = "https://fapi.binance.com"
    binance_spot_url: str = "https://api.binance.com"
    # 바이낸스 IP 가중치 한도(분당 2400) 대비 넉넉히 — 초당 5 요청
    binance_requests_per_second: float = Field(default=5.0, gt=0)
    defillama_stablecoins_url: str = "https://stablecoins.llama.fi"
    # ECB 기준 환율(원/달러) — 김치 프리미엄 분모(FC-REQ-007)
    ecb_rates_url: str = "https://api.frankfurter.dev/v1"
    # 공포탐욕 지수 전체 이력 — 하루 1요청(F010 슬라이스 1 · FC-REQ-008)
    fear_greed_url: str = "https://api.alternative.me"
    # 바이낸스 공개 덤프(aggTrades 일 파일) — 대형 체결 이력(FC-REQ-008)
    binance_dump_url: str = "https://data.binance.vision"
    fred_url: str = "https://api.stlouisfed.org/fred"
    # Deribit 공개 API — DVOL 이력(FC-REQ-014). 비인증 한도(초당 약 20 크레딧)보다 한참 아래
    deribit_url: str = "https://www.deribit.com/api/v2"
    deribit_requests_per_second: float = Field(default=2.0, gt=0)
    # Coin Metrics Community — BTC 온체인 일 지표(FC-REQ-015). 무료 한도 10요청/6초의 80% 보다 한참 아래
    coinmetrics_url: str = "https://community-api.coinmetrics.io/v4"
    coinmetrics_requests_per_second: float = Field(default=1.0, gt=0)
    # CoinGecko 공개 API — 도미넌스 스냅샷(FC-REQ-015). 하루 1요청
    coingecko_url: str = "https://api.coingecko.com/api/v3"
    # 네이버 데이터랩 검색어트렌드(FC-REQ-017). 2026-07-31 부터 개발자센터(openapi.naver.com)는 신규 키를 안 낸다 —
    # 네이버 클라우드 NAVER API HUB 앱의 Client ID/Secret(계정 IAM 키 아님). 월 5만 회 · 키당 50 RPS, 이관기 무료
    naver_datalab_url: str = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search"
    naver_client_id: SecretStr | None = None
    naver_client_secret: SecretStr | None = None
    fred_api_key: SecretStr | None = None
    # 주요 사건 반응을 계산할 종목(FC-REQ-005). 비우면 업비트 일봉이 있는 코인 전부 — 처음엔 BTC 하나라
    # 미국 거시 일정이 나머지 코인 99/100 에서 비었다(2026-11-10 실측, `SRV-REQ-053` FR-2)
    event_symbols: str = ""
    # 국내 종목 사건 반응(FC-REQ-021 FR-6) — 비우면 보유 · 관심 국내 종목 + 거래대금 상위 N(최근 30일)
    # + 시장 대용(KR-EW)
    kr_event_symbols: str = ""
    kr_event_top: int = 30
    # 등락 분해 β · 평소 변동 σ(F016 단계 C · FC-REQ-027 FR-1) — 창 · 최소 표본(거래일 · 코인은 일)
    move_beta_window: int = Field(default=120, gt=0)
    move_beta_min_sample: int = Field(default=60, gt=0)
    move_sigma_window: int = Field(default=60, gt=0)
    move_sigma_min_sample: int = Field(default=40, gt=0)

    @field_validator("fred_api_key", "naver_client_id", "naver_client_secret", mode="before")
    @classmethod
    def _blank_is_none(cls, v: object) -> object:
        """.env 의 `FORECAST_FRED_API_KEY=` (빈 값)은 키 없음이다."""
        if isinstance(v, str):
            return v.strip() or None  # 붙여 넣다 딸려 온 앞뒤 공백도 뗀다
        return v

    def sqlalchemy_url(self) -> str:
        """salt-server 의 DATABASE_URL 모양(?schema=public)을 그대로 받아도 된다."""
        raw = self.database_url.get_secret_value().split("?", 1)[0]
        return raw.replace("postgresql://", "postgresql+psycopg://", 1).replace(
            "postgres://", "postgresql+psycopg://", 1
        )

    def event_symbol_list(self) -> list[str]:
        return [s.strip() for s in self.event_symbols.split(",") if s.strip()]

    def kr_event_symbol_list(self) -> list[str]:
        return [s.strip() for s in self.kr_event_symbols.split(",") if s.strip()]

    def extra_symbol_list(self) -> list[str]:
        return [s.strip() for s in self.extra_symbols.split(",") if s.strip()]


@lru_cache(maxsize=1)
def settings() -> Settings:
    return Settings()  # pyright: ignore[reportCallIssue] — 값은 env 에서 온다
