/**
 * Improvement Playbook Service
 * Captures lessons learned from runtime issues and gap analysis, inspired by ACE-style curation loops.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ComplianceFramework,
  FrameworkDocumentationGapResult,
  ImprovementInjectionOutcome,
  ImprovementInsight,
  ImprovementInsightRequest,
  ImprovementOutcomeUpdateRequest
} from '../types/framework.js';
import { localStoreService } from './local-store-service.js';

export class ImprovementPlaybookService {
  private insights: Map<string, ImprovementInsight> = new Map();
  private outcomes: Map<string, ImprovementInjectionOutcome> = new Map();

  constructor() {
    localStoreService.getImprovementInsights().forEach(insight => {
      this.insights.set(insight.id, insight);
    });

    localStoreService.getImprovementOutcomes().forEach(outcome => {
      this.outcomes.set(outcome.id, outcome);
    });
  }

  recordInsight(request: ImprovementInsightRequest): ImprovementInsight {
    const now = new Date();
    const insight: ImprovementInsight = {
      id: uuidv4(),
      title: request.title,
      source: request.source,
      observation: request.observation,
      rootCause: request.rootCause,
      recommendation: request.recommendation,
      reinforcementActions: request.reinforcementActions || [],
      relatedFrameworks: request.relatedFrameworks,
      relatedControls: request.relatedControls,
      helpfulCount: 0,
      harmfulCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.insights.set(insight.id, insight);
    this.persistInsights();

    return insight;
  }

  recordRuntimeError(errorMessage: string, context?: string): ImprovementInsight {
    return this.recordInsight({
      title: `Runtime error pattern: ${errorMessage.slice(0, 80)}`,
      source: 'runtime-error',
      observation: context
        ? `${errorMessage}\nContext: ${context}`
        : errorMessage,
      rootCause: 'Unhandled exception observed in API workflow.',
      recommendation: 'Add input validation, explicit fallback behavior, and improved exception handling for this flow.',
      reinforcementActions: [
        'Create regression test for the failing path.',
        'Add structured runtime logging with request context.',
        'Document operational workaround until full fix is deployed.'
      ]
    });
  }

  captureDocumentationGapInsights(results: FrameworkDocumentationGapResult[]): ImprovementInsight[] {
    const created: ImprovementInsight[] = [];

    results.forEach(result => {
      if (result.coverage >= 80) {
        return;
      }

      const topMissing = result.uncoveredControls.slice(0, 5).map(control => control.controlId);
      const insight = this.recordInsight({
        title: `Documentation gap trend for ${result.framework}`,
        source: 'documentation-gap',
        observation: `Coverage is ${result.coverage}% for ${result.framework}.`,
        rootCause: 'Required control evidence is either not documented or not discoverable in current documentation artifacts.',
        recommendation: 'Add framework-mapped sections to documentation and maintain a control-to-evidence traceability matrix.',
        reinforcementActions: [
          'Prioritize documenting high-severity missing controls first.',
          'Add a recurring documentation gap analysis checkpoint.',
          'Link generated policies/procedures to specific control IDs.'
        ],
        relatedFrameworks: [result.framework],
        relatedControls: topMissing
      });

      created.push(insight);
    });

    return created;
  }

  listInsights(filters?: {
    source?: ImprovementInsight['source'];
    limit?: number;
  }): ImprovementInsight[] {
    let items = Array.from(this.insights.values());

    if (filters?.source) {
      items = items.filter(item => item.source === filters.source);
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (filters?.limit && filters.limit > 0) {
      return items.slice(0, filters.limit);
    }

    return items;
  }

  getTopInsights(options?: {
    frameworks?: ComplianceFramework[];
    limit?: number;
  }): ImprovementInsight[] {
    const frameworks = options?.frameworks || [];
    let items = Array.from(this.insights.values());

    if (frameworks.length > 0) {
      items = items.filter(insight => this.isInsightRelevantToFrameworks(insight, frameworks));
    }

    items.sort((a, b) => {
      const scoreDiff = this.calculateInsightScore(b) - this.calculateInsightScore(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    const limit = options?.limit || 3;
    return items.slice(0, Math.max(0, limit));
  }

  buildInjectionBrief(options?: {
    frameworks?: ComplianceFramework[];
    limit?: number;
  }): {
    insightIds: string[];
    guidance: string;
    insights: ImprovementInsight[];
  } {
    const insights = this.getTopInsights({
      frameworks: options?.frameworks,
      limit: options?.limit || 3
    });

    const guidance = insights.map((insight, index) => {
      const actions = insight.reinforcementActions?.length
        ? ` | Reinforcement: ${insight.reinforcementActions.slice(0, 2).join('; ')}`
        : '';
      return `${index + 1}. ${insight.recommendation}${actions}`;
    }).join('\n');

    return {
      insightIds: insights.map(insight => insight.id),
      guidance,
      insights
    };
  }

  recordInjectionOutcome(input: {
    artifactType: ImprovementInjectionOutcome['artifactType'];
    artifactId: string;
    artifactTitle: string;
    organization: string;
    frameworks?: ComplianceFramework[];
    injectedInsightIds: string[];
    injectionSummary?: string;
  }): ImprovementInjectionOutcome {
    const now = new Date();
    const outcome: ImprovementInjectionOutcome = {
      id: uuidv4(),
      artifactType: input.artifactType,
      artifactId: input.artifactId,
      artifactTitle: input.artifactTitle,
      organization: input.organization,
      frameworks: input.frameworks,
      injectedInsightIds: input.injectedInsightIds,
      injectionSummary: input.injectionSummary,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    this.outcomes.set(outcome.id, outcome);
    this.persistOutcomes();
    return outcome;
  }

  listOutcomes(filters?: {
    artifactType?: ImprovementInjectionOutcome['artifactType'];
    status?: ImprovementInjectionOutcome['status'];
    limit?: number;
  }): ImprovementInjectionOutcome[] {
    let items = Array.from(this.outcomes.values());

    if (filters?.artifactType) {
      items = items.filter(item => item.artifactType === filters.artifactType);
    }

    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (filters?.limit && filters.limit > 0) {
      return items.slice(0, filters.limit);
    }

    return items;
  }

  updateOutcome(id: string, updates: ImprovementOutcomeUpdateRequest): ImprovementInjectionOutcome | undefined {
    const current = this.outcomes.get(id);
    if (!current) {
      return undefined;
    }

    const normalizedRating = updates.qualityRating === undefined
      ? current.qualityRating
      : Math.min(5, Math.max(1, updates.qualityRating));

    const updated: ImprovementInjectionOutcome = {
      ...current,
      ...updates,
      qualityRating: normalizedRating,
      reviewedAt: updates.status && updates.status !== 'pending'
        ? new Date()
        : current.reviewedAt,
      updatedAt: new Date()
    };

    this.outcomes.set(id, updated);
    this.persistOutcomes();
    return updated;
  }

  updateFeedback(id: string, feedback: 'helpful' | 'harmful'): ImprovementInsight | undefined {
    const insight = this.insights.get(id);
    if (!insight) {
      return undefined;
    }

    const updated: ImprovementInsight = {
      ...insight,
      helpfulCount: feedback === 'helpful' ? insight.helpfulCount + 1 : insight.helpfulCount,
      harmfulCount: feedback === 'harmful' ? insight.harmfulCount + 1 : insight.harmfulCount,
      updatedAt: new Date()
    };

    this.insights.set(id, updated);
    this.persistInsights();
    return updated;
  }

  private calculateInsightScore(insight: ImprovementInsight): number {
    const sourceWeight: Record<ImprovementInsight['source'], number> = {
      manual: 1,
      'runtime-error': 2,
      'gap-analysis': 1.5,
      'documentation-gap': 1.5,
      'policy-generation': 1.2
    };

    return (insight.helpfulCount * 2) - insight.harmfulCount + sourceWeight[insight.source];
  }

  private isInsightRelevantToFrameworks(
    insight: ImprovementInsight,
    frameworks: ComplianceFramework[]
  ): boolean {
    if (!insight.relatedFrameworks || insight.relatedFrameworks.length === 0) {
      return true;
    }

    return insight.relatedFrameworks.some(framework => frameworks.includes(framework));
  }

  private persistInsights(): void {
    localStoreService.setImprovementInsights(Array.from(this.insights.values()));
  }

  private persistOutcomes(): void {
    localStoreService.setImprovementOutcomes(Array.from(this.outcomes.values()));
  }
}

export default ImprovementPlaybookService;
