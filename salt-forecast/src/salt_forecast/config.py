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
    fred_url: str = "https://api.stlouisfed.org/fred"
    fred_api_key: SecretStr | None = None

    @field_validator("fred_api_key", mode="before")
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

    def extra_symbol_list(self) -> list[str]:
        return [s.strip() for s in self.extra_symbols.split(",") if s.strip()]


@lru_cache(maxsize=1)
def settings() -> Settings:
    return Settings()  # pyright: ignore[reportCallIssue] — 값은 env 에서 온다
