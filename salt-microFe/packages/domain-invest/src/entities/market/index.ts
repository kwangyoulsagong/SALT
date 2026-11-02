/**
 * `market` 슬라이스의 public API.
 *
 * 바깥에서는 이 barrel 로만 들어온다. `@/entities/market/model/types` 같은 내부 경로를
 * 직접 참조하면 `layer-check` 훅이 막는다 (`layered-architecture.md` §3).
 */
export * from "./api";
export * from "./lib";
export * from "./model";
export * from "./ui";
