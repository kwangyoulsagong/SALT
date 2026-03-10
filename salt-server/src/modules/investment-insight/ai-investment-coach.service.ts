import prisma from "../../config/database";
import { AICoachFeatureExtractor } from "./ai-coach/ai-coach-feature.extractor";
import { AICoachCandidateGenerator } from "./ai-coach/ai-coach-candidate.generator";
import { AICoachScoreEngine } from "./ai-coach/ai-coach-score.engine";
import { AICoachExplainer } from "./ai-coach/ai-coach-explainer";

export class AIInvestmentCoachService {
  private extractor = new AICoachFeatureExtractor();
  private candidateGenerator = new AICoachCandidateGenerator();
  private scoreEngine = new AICoachScoreEngine();
  private explainer = new AICoachExplainer();

  async generateCoach(userId: string) {
    const ctx = await this.extractor.extract(userId);
    if (!ctx) return null;

    const candidates = this.candidateGenerator.generate(ctx);

    const ranked = candidates
      .map((candidate) => this.scoreEngine.scoreCandidate(ctx, candidate))
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) return null;

    const top = ranked[0];
    const second = ranked[1];

    const { summary, payload } = this.explainer.build(ctx, top, ranked);

    const severity = this.calculateSeverity(
      top.score,
      ctx.portfolioState.riskLevel,
    );
    const confidence = this.calculateConfidence(top.score, second?.score ?? 0);

    return prisma.investmentInsight.upsert({
      where: {
        userId_type_dedupeKey: {
          userId,
          type: "ai_coach",
          dedupeKey: "main_coach",
        },
      },
      create: {
        userId,
        type: "ai_coach",
        title: "AI 투자 코치",
        summary,
        severity,
        confidence,
        dedupeKey: "main_coach",
        payload,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      update: {
        summary,
        severity,
        confidence,
        payload,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  }

  private calculateSeverity(
    topScore: number,
    portfolioRiskLevel: "low" | "medium" | "high",
  ) {
    let severity = Math.min(100, Math.max(35, topScore));

    if (portfolioRiskLevel === "medium") severity += 5;
    if (portfolioRiskLevel === "high") severity += 10;

    return Math.min(100, severity);
  }

  private calculateConfidence(topScore: number, secondScore: number) {
    const spread = Math.max(0, topScore - secondScore);
    const raw =
      0.55 + Math.min(0.3, spread / 100) + Math.min(0.1, topScore / 200);
    return Math.min(0.92, Number(raw.toFixed(2)));
  }
}
