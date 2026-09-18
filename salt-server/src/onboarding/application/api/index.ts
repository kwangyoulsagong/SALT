import {
  GetOnboardingStatus,
  type LedgerLinkedProbe,
  type PlanConfiguredProbe,
} from "../GetOnboardingStatus";

export interface OnboardingDependencies {
  ledgerLinked: LedgerLinkedProbe;
  planConfigured: PlanConfiguredProbe;
}

export interface OnboardingUseCases {
  getOnboardingStatus: GetOnboardingStatus;
}

export const createOnboardingApplication = (deps: OnboardingDependencies) => {
  const useCases: OnboardingUseCases = {
    getOnboardingStatus: new GetOnboardingStatus(
      deps.ledgerLinked,
      deps.planConfigured
    ),
  };

  return { useCases };
};

export type { OnboardingStatus, OnboardingStepKey } from "../GetOnboardingStatus";
