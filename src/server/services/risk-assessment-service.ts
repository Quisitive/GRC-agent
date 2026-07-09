/**
 * Risk Assessment Service
 * In-memory risk register, scoring, treatment planning, and reporting.
 */

import {
  RiskAssessment,
  RiskCategory,
  RiskLikelihood,
  RiskImpact,
  RiskTreatment,
  RiskStatus,
  RiskControl,
  RiskTreatmentPlan,
  QuantitativeRiskAssessment,
  RiskRegister,
  RiskAppetite,
  RiskHeatmapCell,
  RiskHeatmapData,
  TreatmentAction
} from '../types/framework.js';

export class RiskAssessmentService {
  private risks: Map<string, RiskAssessment> = new Map();
  private riskRegister: RiskRegister | null = null;

  initializeRiskRegister(
    organizationName: string,
    riskAppetite: RiskAppetite
  ): RiskRegister {
    const now = new Date();

    const register: RiskRegister = {
      id: this.generateId('REG'),
      name: `${organizationName} Risk Register`,
      organization: organizationName,
      description: 'Central risk register for governance, risk, and compliance operations.',
      risks: this.getAllRisks(),
      riskAppetite,
      createdAt: now,
      updatedAt: now,
      owner: 'Risk Management',
      reviewFrequency: 'quarterly',
      nextReviewDate: this.calculateNextReviewDate(9)
    };

    this.riskRegister = register;
    return register;
  }

  createRisk(params: {
    name: string;
    description: string;
    category: RiskCategory;
    likelihood: RiskLikelihood;
    impact: RiskImpact;
    assetId?: string;
    assetName?: string;
    threatSource?: string;
    vulnerabilities?: string[];
    existingControls?: RiskControl[];
    owner?: string;
    notes?: string;
  }): RiskAssessment {
    const now = new Date();
    const inherentRiskScore = this.calculateRiskScore(params.likelihood, params.impact);
    const inherentRiskRating = this.getRiskRating(inherentRiskScore);
    const existingControls = params.existingControls || [];

    const risk: RiskAssessment = {
      id: this.generateId('RISK'),
      title: params.name,
      description: this.composeDescription(params.description, params.assetName, params.threatSource, params.notes),
      organization: 'Unspecified Organization',
      category: this.normalizeCategory(params.category),
      owner: params.owner || 'Unassigned',
      inherentLikelihood: params.likelihood,
      inherentImpact: params.impact,
      inherentRiskScore,
      inherentRiskRating,
      existingControls,
      controlEffectiveness: this.getOverallControlEffectiveness(existingControls),
      residualLikelihood: params.likelihood,
      residualImpact: params.impact,
      residualRiskScore: inherentRiskScore,
      residualRiskRating: inherentRiskRating,
      treatment: RiskTreatment.ACCEPT,
      status: RiskStatus.IDENTIFIED,
      createdAt: now,
      updatedAt: now,
      assessmentDate: now,
      nextReviewDate: this.calculateNextReviewDate(inherentRiskScore),
      tags: this.buildTags(params),
      relatedControls: existingControls.map(control => control.id)
    };

    this.risks.set(risk.id, risk);

    if (this.riskRegister) {
      this.riskRegister.risks = this.getAllRisks();
      this.riskRegister.updatedAt = new Date();
    }

    return risk;
  }

  calculateRiskScore(likelihood: RiskLikelihood, impact: RiskImpact): number {
    return likelihood * impact;
  }

  getRiskLevel(score: number): { level: string; color: string; description: string } {
    if (score <= 4) {
      return {
        level: 'Low',
        color: 'green',
        description: 'Risk is typically acceptable with normal monitoring.'
      };
    }

    if (score <= 9) {
      return {
        level: 'Medium',
        color: 'yellow',
        description: 'Risk requires mitigation planning and scheduled follow-up.'
      };
    }

    if (score <= 16) {
      return {
        level: 'High',
        color: 'orange',
        description: 'Risk needs near-term treatment and leadership visibility.'
      };
    }

    return {
      level: 'Critical',
      color: 'red',
      description: 'Risk requires immediate action and executive review.'
    };
  }

  calculateQuantitativeRisk(params: {
    riskId: string;
    assetValue: number;
    exposureFactor: number;
    annualRateOfOccurrence: number;
    controlCost?: number;
    controlEffectiveness?: number;
  }): QuantitativeRiskAssessment {
    const singleLossExpectancy = params.assetValue * params.exposureFactor;
    const annualizedLossExpectancy = singleLossExpectancy * params.annualRateOfOccurrence;

    let returnOnInvestment: number | undefined;

    if (params.controlCost && params.controlCost > 0 && params.controlEffectiveness !== undefined) {
      const aleAfterControl = annualizedLossExpectancy * (1 - params.controlEffectiveness);
      const riskReduction = annualizedLossExpectancy - aleAfterControl;
      returnOnInvestment = (riskReduction - params.controlCost) / params.controlCost;
    }

    const result: QuantitativeRiskAssessment = {
      assetValue: params.assetValue,
      exposureFactor: params.exposureFactor,
      singleLossExpectancy,
      annualRateOfOccurrence: params.annualRateOfOccurrence,
      annualizedLossExpectancy,
      controlCost: params.controlCost,
      controlEffectiveness: params.controlEffectiveness,
      returnOnInvestment,
      currency: 'USD',
      calculatedAt: new Date()
    };

    const risk = this.risks.get(params.riskId);
    if (risk) {
      risk.quantitativeAssessment = result;
      risk.updatedAt = new Date();
      this.risks.set(risk.id, risk);
    }

    return result;
  }

  applyControls(
    riskId: string,
    controls: RiskControl[]
  ): RiskAssessment | undefined {
    const risk = this.risks.get(riskId);
    if (!risk) {
      return undefined;
    }

    risk.existingControls = [...risk.existingControls, ...controls];

    const averageEffectiveness = this.calculateControlEffectivenessScore(controls);
    const likelihoodReduction = averageEffectiveness >= 0.75 ? 2 : averageEffectiveness >= 0.45 ? 1 : 0;
    const impactReduction = averageEffectiveness >= 0.75 ? 1 : 0;

    risk.residualLikelihood = Math.max(1, risk.residualLikelihood - likelihoodReduction) as RiskLikelihood;
    risk.residualImpact = Math.max(1, risk.residualImpact - impactReduction) as RiskImpact;
    risk.residualRiskScore = this.calculateRiskScore(risk.residualLikelihood, risk.residualImpact);
    risk.residualRiskRating = this.getRiskRating(risk.residualRiskScore);
    risk.controlEffectiveness = this.getOverallControlEffectiveness(risk.existingControls);
    risk.updatedAt = new Date();

    this.risks.set(risk.id, risk);
    return risk;
  }

  createTreatmentPlan(params: {
    riskId: string;
    treatment: RiskTreatment;
    description: string;
    proposedControls?: RiskControl[];
    responsibleParty: string;
    targetDate: string;
    budget?: number;
  }): RiskTreatmentPlan | undefined {
    const risk = this.risks.get(params.riskId);
    if (!risk) {
      return undefined;
    }

    const action: TreatmentAction = {
      id: this.generateId('ACT'),
      description: params.description,
      owner: params.responsibleParty,
      dueDate: new Date(params.targetDate),
      status: 'not-started',
      estimatedCost: params.budget
    };

    const plan: RiskTreatmentPlan = {
      id: this.generateId('TPL'),
      actions: [action],
      totalBudget: params.budget,
      startDate: new Date(),
      targetCompletionDate: new Date(params.targetDate),
      status: 'not-started'
    };

    risk.treatment = params.treatment;
    risk.treatmentPlan = plan;
    risk.status = RiskStatus.TREATMENT_PLANNED;

    if (params.treatment === RiskTreatment.MITIGATE) {
      risk.targetLikelihood = Math.max(1, risk.residualLikelihood - 1) as RiskLikelihood;
      risk.targetImpact = Math.max(1, risk.residualImpact - 1) as RiskImpact;
      risk.targetRiskScore = this.calculateRiskScore(risk.targetLikelihood, risk.targetImpact);
      risk.targetRiskRating = this.getRiskRating(risk.targetRiskScore);
    }

    risk.updatedAt = new Date();
    this.risks.set(risk.id, risk);

    return plan;
  }

  updateRiskStatus(riskId: string, status: RiskStatus): RiskAssessment | undefined {
    const risk = this.risks.get(riskId);
    if (!risk) {
      return undefined;
    }

    risk.status = status;
    risk.updatedAt = new Date();

    if (status === RiskStatus.CLOSED || status === RiskStatus.ACCEPTED) {
      risk.nextReviewDate = this.calculateNextReviewDate(4, true);
    }

    this.risks.set(risk.id, risk);
    return risk;
  }

  generateHeatmap(): RiskHeatmapData {
    const cells: RiskHeatmapCell[] = [];

    for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
      for (let impact = 1; impact <= 5; impact += 1) {
        const l = likelihood as RiskLikelihood;
        const i = impact as RiskImpact;

        const matching = this.getAllRisks().filter(
          risk => risk.inherentLikelihood === l && risk.inherentImpact === i
        );

        const score = this.calculateRiskScore(l, i);
        const level = this.getRiskLevel(score);

        cells.push({
          likelihood: l,
          impact: i,
          count: matching.length,
          color: level.color,
          risks: matching.map(risk => ({
            id: risk.id,
            title: risk.title,
            score: risk.inherentRiskScore
          })),
          riskIds: matching.map(risk => risk.id)
        });
      }
    }

    const risks = this.getAllRisks();
    const categoryBreakdown = Object.values(RiskCategory).reduce<Record<string, number>>((acc, category) => {
      acc[category] = risks.filter(risk => risk.category === category).length;
      return acc;
    }, {});

    const statusBreakdown = Object.values(RiskStatus).reduce<Record<string, number>>((acc, status) => {
      acc[status] = risks.filter(risk => risk.status === status).length;
      return acc;
    }, {});

    return {
      cells,
      totalRisks: risks.length,
      criticalCount: risks.filter(risk => risk.inherentRiskScore >= 20).length,
      highCount: risks.filter(risk => risk.inherentRiskScore >= 12 && risk.inherentRiskScore < 20).length,
      mediumCount: risks.filter(risk => risk.inherentRiskScore >= 5 && risk.inherentRiskScore < 12).length,
      lowCount: risks.filter(risk => risk.inherentRiskScore < 5).length,
      categoryBreakdown,
      statusBreakdown
    };
  }

  getRisk(id: string): RiskAssessment | undefined {
    return this.risks.get(id);
  }

  getAllRisks(): RiskAssessment[] {
    return Array.from(this.risks.values());
  }

  getRisksByCategory(category: RiskCategory): RiskAssessment[] {
    return this.getAllRisks().filter(risk => risk.category === this.normalizeCategory(category));
  }

  getRisksByStatus(status: RiskStatus): RiskAssessment[] {
    return this.getAllRisks().filter(risk => risk.status === status);
  }

  getRisksNeedingAttention(): RiskAssessment[] {
    const now = new Date();

    return this.getAllRisks()
      .filter(risk => {
        const unresolved = risk.status !== RiskStatus.CLOSED && risk.status !== RiskStatus.ACCEPTED;
        const highRisk = risk.inherentRiskScore >= 12;
        const overdue = risk.nextReviewDate <= now;
        return (unresolved && highRisk) || overdue;
      })
      .sort((a, b) => b.inherentRiskScore - a.inherentRiskScore);
  }

  getRiskRegister(): RiskRegister | null {
    if (this.riskRegister) {
      this.riskRegister.risks = this.getAllRisks();
      this.riskRegister.updatedAt = new Date();
    }

    return this.riskRegister;
  }

  generateRiskReport(): string {
    const risks = this.getAllRisks();
    const heatmap = this.generateHeatmap();

    let report = '# Risk Assessment Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Total Risks:** ${risks.length}\n\n`;

    report += '## Risk Summary\n\n';
    report += '| Level | Count |\n|-------|-------|\n';
    report += `| Critical | ${heatmap.criticalCount} |\n`;
    report += `| High | ${heatmap.highCount} |\n`;
    report += `| Medium | ${heatmap.mediumCount} |\n`;
    report += `| Low | ${heatmap.lowCount} |\n\n`;

    report += '## Detailed Risks\n\n';
    risks.forEach(risk => {
      const level = this.getRiskLevel(risk.inherentRiskScore);
      report += `### ${risk.id}: ${risk.title}\n`;
      report += `- Category: ${risk.category}\n`;
      report += `- Status: ${risk.status}\n`;
      report += `- Inherent Risk: ${risk.inherentRiskScore} (${level.level})\n`;
      report += `- Residual Risk: ${risk.residualRiskScore}\n`;
      report += `- Owner: ${risk.owner}\n`;
      report += `- Next Review: ${risk.nextReviewDate.toISOString()}\n\n`;
    });

    return report;
  }

  getLikelihoodDescription(likelihood: RiskLikelihood): { name: string; description: string } {
    const descriptions: Record<RiskLikelihood, { name: string; description: string }> = {
      [RiskLikelihood.RARE]: {
        name: 'Rare',
        description: 'Event may occur only in exceptional circumstances (<10% annually).'
      },
      [RiskLikelihood.UNLIKELY]: {
        name: 'Unlikely',
        description: 'Event could occur, but is not expected (10-30% annually).'
      },
      [RiskLikelihood.POSSIBLE]: {
        name: 'Possible',
        description: 'Event might occur at some point (30-50% annually).'
      },
      [RiskLikelihood.LIKELY]: {
        name: 'Likely',
        description: 'Event will probably occur (50-70% annually).'
      },
      [RiskLikelihood.ALMOST_CERTAIN]: {
        name: 'Almost Certain',
        description: 'Event is expected to occur (>70% annually).'
      }
    };

    return descriptions[likelihood];
  }

  getImpactDescription(impact: RiskImpact): { name: string; description: string; financial: string } {
    const descriptions: Record<RiskImpact, { name: string; description: string; financial: string }> = {
      [RiskImpact.NEGLIGIBLE]: {
        name: 'Negligible',
        description: 'Minimal impact with no lasting operational effect.',
        financial: '< $10,000'
      },
      [RiskImpact.MINOR]: {
        name: 'Minor',
        description: 'Limited impact requiring manager attention.',
        financial: '$10,000 - $100,000'
      },
      [RiskImpact.MODERATE]: {
        name: 'Moderate',
        description: 'Material impact requiring coordinated response.',
        financial: '$100,000 - $1,000,000'
      },
      [RiskImpact.MAJOR]: {
        name: 'Major',
        description: 'Severe impact with possible regulatory or reputational consequences.',
        financial: '$1,000,000 - $10,000,000'
      },
      [RiskImpact.CATASTROPHIC]: {
        name: 'Catastrophic',
        description: 'Critical impact threatening strategic outcomes.',
        financial: '> $10,000,000'
      }
    };

    return descriptions[impact];
  }

  getTreatmentRecommendation(score: number): { treatment: RiskTreatment; rationale: string }[] {
    if (score >= 20) {
      return [
        {
          treatment: RiskTreatment.MITIGATE,
          rationale: 'Critical risk requires immediate controls and executive monitoring.'
        },
        {
          treatment: RiskTreatment.AVOID,
          rationale: 'Consider removing or redesigning the activity driving this risk.'
        }
      ];
    }

    if (score >= 12) {
      return [
        {
          treatment: RiskTreatment.MITIGATE,
          rationale: 'High risk should be reduced with targeted technical and process controls.'
        },
        {
          treatment: RiskTreatment.TRANSFER,
          rationale: 'Evaluate insurance or contractual transfer where practical.'
        }
      ];
    }

    if (score >= 5) {
      return [
        {
          treatment: RiskTreatment.MITIGATE,
          rationale: 'Moderate risk benefits from incremental improvements and monitoring.'
        },
        {
          treatment: RiskTreatment.ACCEPT,
          rationale: 'Risk may be accepted if within defined appetite and ownership is documented.'
        }
      ];
    }

    return [
      {
        treatment: RiskTreatment.ACCEPT,
        rationale: 'Low risk is typically acceptable with periodic review.'
      }
    ];
  }

  deleteRisk(id: string): boolean {
    return this.risks.delete(id);
  }

  clearAllRisks(): void {
    this.risks.clear();

    if (this.riskRegister) {
      this.riskRegister.risks = [];
      this.riskRegister.updatedAt = new Date();
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private calculateNextReviewDate(riskScore: number, mitigated: boolean = false): Date {
    const reviewDate = new Date();

    if (mitigated) {
      reviewDate.setDate(reviewDate.getDate() + 365);
      return reviewDate;
    }

    if (riskScore >= 20) {
      reviewDate.setDate(reviewDate.getDate() + 30);
      return reviewDate;
    }

    if (riskScore >= 12) {
      reviewDate.setDate(reviewDate.getDate() + 90);
      return reviewDate;
    }

    if (riskScore >= 5) {
      reviewDate.setDate(reviewDate.getDate() + 180);
      return reviewDate;
    }

    reviewDate.setDate(reviewDate.getDate() + 365);
    return reviewDate;
  }

  private getRiskRating(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 20) {
      return 'critical';
    }

    if (score >= 12) {
      return 'high';
    }

    if (score >= 5) {
      return 'medium';
    }

    return 'low';
  }

  private composeDescription(
    description: string,
    assetName?: string,
    threatSource?: string,
    notes?: string
  ): string {
    const parts = [description.trim()];

    if (assetName) {
      parts.push(`Asset: ${assetName}`);
    }

    if (threatSource) {
      parts.push(`Threat Source: ${threatSource}`);
    }

    if (notes) {
      parts.push(`Notes: ${notes}`);
    }

    return parts.join('\n');
  }

  private buildTags(params: { assetId?: string; assetName?: string; vulnerabilities?: string[] }): string[] {
    const tags: string[] = [];

    if (params.assetId) {
      tags.push(`asset-id:${params.assetId}`);
    }

    if (params.assetName) {
      tags.push(`asset:${params.assetName}`);
    }

    if (params.vulnerabilities) {
      params.vulnerabilities.slice(0, 5).forEach(vulnerability => {
        tags.push(`vuln:${vulnerability}`);
      });
    }

    return tags;
  }

  private normalizeCategory(category: RiskCategory): RiskCategory {
    const normalized = String(category).toLowerCase();
    if (normalized === 'security') {
      return RiskCategory.CYBERSECURITY;
    }
    if (normalized === 'third_party') {
      return RiskCategory.THIRD_PARTY;
    }

    const categories = Object.values(RiskCategory);
    return categories.includes(category) ? category : RiskCategory.OPERATIONAL;
  }

  private getOverallControlEffectiveness(controls: RiskControl[]): RiskAssessment['controlEffectiveness'] {
    const score = this.calculateControlEffectivenessScore(controls);

    if (score >= 0.75) {
      return 'effective';
    }
    if (score >= 0.4) {
      return 'partially-effective';
    }
    if (controls.length === 0) {
      return 'not-assessed';
    }

    return 'ineffective';
  }

  private calculateControlEffectivenessScore(controls: RiskControl[]): number {
    if (controls.length === 0) {
      return 0;
    }

    const total = controls.reduce((sum, control) => {
      const effectiveness = this.normalizeEffectiveness(control.effectiveness);
      return sum + effectiveness;
    }, 0);

    return total / controls.length;
  }

  private normalizeEffectiveness(effectiveness: RiskControl['effectiveness']): number {
    switch (effectiveness) {
      case 'effective':
        return 1;
      case 'partially-effective':
        return 0.6;
      case 'ineffective':
      default:
        return 0.2;
    }
  }
}

export const riskAssessmentService = new RiskAssessmentService();

export default RiskAssessmentService;
