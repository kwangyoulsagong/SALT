import type { CoachMode, CoachProfile, CoachProfileStore, RiskLevel } from "../domain";

/**
 * 코치 설정 조회·수정.
 *
 * ## 저장되지 않는 필드를 응답이 숨기지 않는다
 *
 * `defaultMode` · `notificationLevel` 은 **컬럼이 없다.** 원문은 그 둘을 받아서
 * 응답에만 실어 주고 저장하지 않았고, `unsupportedPersistedFields` 로 그 사실을
 * 함께 내려보냈다. 그대로 유지한다 — 저장되는 것처럼 보이게 만드는 것이 더 나쁘다.
 *
 * > 저장이 필요해지면 컬럼 추가는 `DB-REQ-*` 의 일이다.
 */

const DEFAULT_MODE: CoachMode = "scalp";
const DEFAULT_NOTIFICATION_LEVEL = "medium";
const SUPPORTED_MODES: CoachMode[] = ["scalp", "long_term"];
/** 컬럼이 없어 저장되지 않는 필드. 응답이 이 목록을 함께 준다. */
const UNSUPPORTED_PERSISTED_FIELDS = ["defaultMode", "notificationLevel"];

export interface CoachProfileView extends CoachProfile {
  defaultMode: CoachMode;
  notificationLevel: string;
  supportedModes?: CoachMode[];
  unsupportedPersistedFields?: string[];
}

export interface UpdateCoachProfileCommand {
  riskTolerance?: RiskLevel;
  maxSingleAssetWeight?: number;
  rebalanceBand?: number;
  panicSellWindowHours?: number;
  defaultMode?: CoachMode;
  notificationLevel?: string;
}

export class GetCoachProfile {
  constructor(private readonly profiles: CoachProfileStore) {}

  /** 없으면 만든다 — 설정 화면이 비어 있는 상태를 다루지 않게 한다. */
  async execute(userId: string): Promise<CoachProfileView> {
    const profile = await this.profiles.upsert(userId, {});

    return {
      ...profile,
      defaultMode: DEFAULT_MODE,
      notificationLevel: DEFAULT_NOTIFICATION_LEVEL,
      supportedModes: SUPPORTED_MODES,
    };
  }
}

export class UpdateCoachProfile {
  constructor(private readonly profiles: CoachProfileStore) {}

  async execute(
    userId: string,
    command: UpdateCoachProfileCommand
  ): Promise<CoachProfileView> {
    const profile = await this.profiles.upsert(userId, {
      riskTolerance: command.riskTolerance,
      maxSingleAssetWeight: command.maxSingleAssetWeight,
      rebalanceBand: command.rebalanceBand,
      panicSellWindowHours: command.panicSellWindowHours,
    });

    return {
      ...profile,
      defaultMode: command.defaultMode ?? DEFAULT_MODE,
      notificationLevel: command.notificationLevel ?? DEFAULT_NOTIFICATION_LEVEL,
      unsupportedPersistedFields: UNSUPPORTED_PERSISTED_FIELDS,
    };
  }
}
