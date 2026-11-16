import math

from salt_forecast.store.jsonb import dumps


def test_nan_and_inf_become_null_nested() -> None:
    assert (
        dumps({"a": math.nan, "b": [1.0, math.inf], "c": {0.8: -math.inf}})
        == '{"a": null, "b": [1.0, null], "c": {"0.8": null}}'
    )
