/**
 * Local Store Service
 * Persists GRC artifacts to a local JSON file so workflows continue during MCP outages.
 */

import fs from 'fs';
import path from 'path';
import FrameworkRegistry from '../frameworks/index.js';
import {
  ClientDocumentArtifact,
  GapExemption,
  ImprovementInjectionOutcome,
  ImprovementInsight,
  OfflineConnectionProfile,
  ImplementedControl,
  ImplementedProcedure,
  PolicyDocument,
  SecurityPlan
} from '../types/framework.js';

interface LocalStoreData {
  schemaVersion: string;
  updatedAt: string;
  policies: unknown[];
  plans: unknown[];
  controls: unknown[];
  procedures: unknown[];
  clientDocuments: unknown[];
  gapExemptions: unknown[];
  improvementInsights: unknown[];
  improvementOutcomes: unknown[];
  connections: unknown[];
}

interface OfflineFrameworkSnapshot {
  framework: ReturnType<typeof FrameworkRegistry.getAllFrameworks>[number];
  controls: ReturnType<typeof FrameworkRegistry.getFrameworkControls>;
  structure: string[];
}

const DEFAULT_CONNECTIONS: Array<Omit<OfflineConnectionProfile, 'lastCheckedAt'>> = [
  {
    id: 'local-framework-registry',
    name: 'Local Framework Registry',
    endpoint: 'local://framework-registry',
    status: 'online',
    notes: 'Framework metadata and controls are available from local source files.'
  },
  {
    id: 'mcp-servers',
    name: 'External MCP Servers',
    endpoint: 'mcp://external',
    status: 'unknown',
    notes: 'Status can be updated via API when connectivity checks are performed.'
  }
];

export class LocalStoreService {
  private readonly storePath: string;

  constructor(storePath?: string) {
    this.storePath =
      storePath ||
      process.env.GRC_LOCAL_STORE_PATH ||
      path.join(process.cwd(), 'data', 'grc-local-store.json');

    this.ensureStoreExists();
  }

  getPolicies(): PolicyDocument[] {
    return this.readStore().policies.map(policy => this.normalizePolicy(policy));
  }

  setPolicies(policies: PolicyDocument[]): void {
    this.updateStore(data => {
      data.policies = this.serialize(policies);
    });
  }

  getPlans(): SecurityPlan[] {
    return this.readStore().plans.map(plan => this.normalizePlan(plan));
  }

  setPlans(plans: SecurityPlan[]): void {
    this.updateStore(data => {
      data.plans = this.serialize(plans);
    });
  }

  getControls(): ImplementedControl[] {
    return this.readStore().controls.map(control => this.normalizeControl(control));
  }

  setControls(controls: ImplementedControl[]): void {
    this.updateStore(data => {
      data.controls = this.serialize(controls);
    });
  }

  getProcedures(): ImplementedProcedure[] {
    return this.readStore().procedures.map(procedure => this.normalizeProcedure(procedure));
  }

  setProcedures(procedures: ImplementedProcedure[]): void {
    this.updateStore(data => {
      data.procedures = this.serialize(procedures);
    });
  }

  getClientDocuments(): ClientDocumentArtifact[] {
    return this.readStore().clientDocuments.map(item => this.normalizeClientDocument(item));
  }

  setClientDocuments(documents: ClientDocumentArtifact[]): void {
    this.updateStore(data => {
      data.clientDocuments = this.serialize(documents);
    });
  }

  getGapExemptions(): GapExemption[] {
    return this.readStore().gapExemptions.map(item => this.normalizeGapExemption(item));
  }

  setGapExemptions(exemptions: GapExemption[]): void {
    this.updateStore(data => {
      data.gapExemptions = this.serialize(exemptions);
    });
  }

  getImprovementInsights(): ImprovementInsight[] {
    return this.readStore().improvementInsights.map(item => this.normalizeImprovementInsight(item));
  }

  setImprovementInsights(insights: ImprovementInsight[]): void {
    this.updateStore(data => {
      data.improvementInsights = this.serialize(insights);
    });
  }

  getImprovementOutcomes(): ImprovementInjectionOutcome[] {
    return this.readStore().improvementOutcomes.map(item => this.normalizeImprovementOutcome(item));
  }

  setImprovementOutcomes(outcomes: ImprovementInjectionOutcome[]): void {
    this.updateStore(data => {
      data.improvementOutcomes = this.serialize(outcomes);
    });
  }

  listConnections(): OfflineConnectionProfile[] {
    return this.readStore().connections.map(connection => this.normalizeConnection(connection));
  }

  upsertConnection(connection: Pick<OfflineConnectionProfile, 'id' | 'name'> & Partial<OfflineConnectionProfile>): OfflineConnectionProfile {
    let result: OfflineConnectionProfile | null = null;

    this.updateStore(data => {
      const now = new Date();
      const existingConnections = data.connections.map(item => this.normalizeConnection(item));
      const existingIndex = existingConnections.findIndex(item => item.id === connection.id);

      const merged: OfflineConnectionProfile = {
        ...(existingIndex >= 0 ? existingConnections[existingIndex] : {
          id: connection.id,
          name: connection.name,
          status: 'unknown' as const,
          lastCheckedAt: now
        }),
        ...connection,
        lastCheckedAt: connection.lastCheckedAt ? new Date(connection.lastCheckedAt) : now
      };

      if (existingIndex >= 0) {
        existingConnections[existingIndex] = merged;
      } else {
        existingConnections.push(merged);
      }

      data.connections = this.serialize(existingConnections);
      result = merged;
    });

    return result as OfflineConnectionProfile;
  }

  getOfflinePackage(): {
    generatedAt: Date;
    schemaVersion: string;
    frameworks: OfflineFrameworkSnapshot[];
    connections: OfflineConnectionProfile[];
    policies: PolicyDocument[];
    plans: SecurityPlan[];
    controls: ImplementedControl[];
    procedures: ImplementedProcedure[];
    clientDocuments: ClientDocumentArtifact[];
    gapExemptions: GapExemption[];
    improvementInsights: ImprovementInsight[];
    improvementOutcomes: ImprovementInjectionOutcome[];
  } {
    const data = this.readStore();
    const frameworks = FrameworkRegistry.getAllFrameworks().map(framework => ({
      framework,
      controls: FrameworkRegistry.getFrameworkControls(framework.id),
      structure: framework.categories
    }));

    return {
      generatedAt: new Date(),
      schemaVersion: data.schemaVersion,
      frameworks,
      connections: data.connections.map(connection => this.normalizeConnection(connection)),
      policies: data.policies.map(policy => this.normalizePolicy(policy)),
      plans: data.plans.map(plan => this.normalizePlan(plan)),
      controls: data.controls.map(control => this.normalizeControl(control)),
      procedures: data.procedures.map(procedure => this.normalizeProcedure(procedure)),
      clientDocuments: data.clientDocuments.map(item => this.normalizeClientDocument(item)),
      gapExemptions: data.gapExemptions.map(item => this.normalizeGapExemption(item)),
      improvementInsights: data.improvementInsights.map(item => this.normalizeImprovementInsight(item)),
      improvementOutcomes: data.improvementOutcomes.map(item => this.normalizeImprovementOutcome(item))
    };
  }

  private ensureStoreExists(): void {
    if (fs.existsSync(this.storePath)) {
      return;
    }

    const defaultStore = this.createDefaultStore();
    this.writeStore(defaultStore);
  }

  private createDefaultStore(): LocalStoreData {
    const now = new Date().toISOString();

    return {
      schemaVersion: '1.0.0',
      updatedAt: now,
      policies: [],
      plans: [],
      controls: [],
      procedures: [],
      clientDocuments: [],
      gapExemptions: [],
      improvementInsights: [],
      improvementOutcomes: [],
      connections: DEFAULT_CONNECTIONS.map(connection => ({
        ...connection,
        lastCheckedAt: now
      }))
    };
  }

  private readStore(): LocalStoreData {
    try {
      const raw = fs.readFileSync(this.storePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<LocalStoreData>;

      return {
        schemaVersion: parsed.schemaVersion || '1.0.0',
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        policies: parsed.policies || [],
        plans: parsed.plans || [],
        controls: parsed.controls || [],
        procedures: parsed.procedures || [],
        clientDocuments: parsed.clientDocuments || [],
        gapExemptions: parsed.gapExemptions || [],
        improvementInsights: parsed.improvementInsights || [],
        improvementOutcomes: parsed.improvementOutcomes || [],
        connections: parsed.connections || this.createDefaultStore().connections
      };
    } catch {
      const fallback = this.createDefaultStore();
      this.writeStore(fallback);
      return fallback;
    }
  }

  private writeStore(data: LocalStoreData): void {
    const directory = path.dirname(this.storePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private updateStore(mutator: (data: LocalStoreData) => void): void {
    const data = this.readStore();
    mutator(data);
    data.updatedAt = new Date().toISOString();
    this.writeStore(data);
  }

  private parseDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizePolicy(policy: unknown): PolicyDocument {
    const value = policy as PolicyDocument;
    return {
      ...value,
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private normalizePlan(plan: unknown): SecurityPlan {
    const value = plan as SecurityPlan;
    return {
      ...value,
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private normalizeControl(control: unknown): ImplementedControl {
    const value = control as ImplementedControl;
    return {
      ...value,
      implementationDate: this.parseDate(value.implementationDate),
      lastReviewDate: this.parseDate(value.lastReviewDate),
      nextReviewDate: this.parseDate(value.nextReviewDate),
      lastTestDate: this.parseDate(value.lastTestDate),
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date(),
      procedures: Array.isArray(value.procedures)
        ? value.procedures.map(procedure => this.normalizeProcedure(procedure))
        : []
    };
  }

  private normalizeProcedure(procedure: unknown): ImplementedProcedure {
    const value = procedure as ImplementedProcedure;
    return {
      ...value,
      lastExecutionDate: this.parseDate(value.lastExecutionDate),
      nextExecutionDate: this.parseDate(value.nextExecutionDate),
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private normalizeConnection(connection: unknown): OfflineConnectionProfile {
    const value = connection as OfflineConnectionProfile;

    return {
      ...value,
      status: value.status || 'unknown',
      lastCheckedAt: this.parseDate(value.lastCheckedAt) || new Date()
    };
  }

  private normalizeClientDocument(document: unknown): ClientDocumentArtifact {
    const value = document as ClientDocumentArtifact;

    return {
      ...value,
      ingestedAt: this.parseDate(value.ingestedAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private normalizeGapExemption(exemption: unknown): GapExemption {
    const value = exemption as GapExemption;

    return {
      ...value,
      nextReviewDate: this.parseDate(value.nextReviewDate) || new Date(),
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private normalizeImprovementInsight(insight: unknown): ImprovementInsight {
    const value = insight as ImprovementInsight;

    return {
      ...value,
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private normalizeImprovementOutcome(outcome: unknown): ImprovementInjectionOutcome {
    const value = outcome as ImprovementInjectionOutcome;

    return {
      ...value,
      reviewedAt: this.parseDate(value.reviewedAt),
      createdAt: this.parseDate(value.createdAt) || new Date(),
      updatedAt: this.parseDate(value.updatedAt) || new Date()
    };
  }

  private serialize<T>(value: T): unknown {
    return JSON.parse(JSON.stringify(value));
  }
}

export const localStoreService = new LocalStoreService();

export default LocalStoreService;
