import type {
  CoachMode,
  CoachProfile,
  CoachProfileStore,
  NotificationLevel,
  RiskLevel,
} from "../domain";

/**
 * 코치 설정 조회·수정.
 *
 * ## `defaultMode` · `notificationLevel` 이 저장된다 (`SRV-REQ-025` FR-13)
 *
 * 전에는 컬럼이 없어 응답에만 실어 주고 `unsupportedPersistedFields` 로 그 사실을
 * 알렸다. 컬럼이 생겨(`DB-REQ-017` FR-20) 그 필드를 뺐다 — 응답 필드 **제거**지만
 * "저장되지 않는다"는 경고였으므로 저장되는 지금은 남길 이유가 없다.
 *
 * DB 에는 사용자가 **고른 값만** 들어간다(고른 적 없으면 `null`). 응답은 기본값을 채운
 * 실효값이다 — 화면이 `null` 을 다루지 않게.
 */

export const DEFAULT_COACH_MODE: CoachMode = "scalp";
const DEFAULT_NOTIFICATION_LEVEL: NotificationLevel = "medium";
const SUPPORTED_MODES: CoachMode[] = ["scalp", "long_term"];

export interface CoachProfileView
  extends Omit<CoachProfile, "defaultMode" | "notificationLevel"> {
  defaultMode: CoachMode;
  notificationLevel: NotificationLevel;
  supportedModes: CoachMode[];
}

export interface UpdateCoachProfileCommand {
  riskTolerance?: RiskLevel;
  maxSingleAssetWeight?: number;
  rebalanceBand?: number;
  panicSellWindowHours?: number;
  defaultMode?: CoachMode;
  notificationLevel?: NotificationLevel;
}

const toView = (profile: CoachProfile): CoachProfileView => ({
  ...profile,
  defaultMode: profile.defaultMode ?? DEFAULT_COACH_MODE,
  notificationLevel: profile.notificationLevel ?? DEFAULT_NOTIFICATION_LEVEL,
  supportedModes: SUPPORTED_MODES,
});

export class GetCoachProfile {
  constructor(private readonly profiles: CoachProfileStore) {}

  /** 없으면 만든다 — 설정 화면이 비어 있는 상태를 다루지 않게 한다. */
  async execute(userId: string): Promise<CoachProfileView> {
    return toView(await this.profiles.upsert(userId, {}));
  }
}

export class UpdateCoachProfile {
  constructor(private readonly profiles: CoachProfileStore) {}

  async execute(
    userId: string,
    command: UpdateCoachProfileCommand
  ): Promise<CoachProfileView> {
    return toView(await this.profiles.upsert(userId, command));
  }
}
