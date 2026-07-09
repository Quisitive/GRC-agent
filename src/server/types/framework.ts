/**
 * Type definitions for GRC Agent system
 * Central location for all TypeScript interfaces and enums
 */

export enum ComplianceFramework {
  NIST_CSF = 'nist-csf',
  NIST_800_53 = 'nist-800-53',
  NIST_800_171 = 'nist-800-171',
  NIST_CMMC = 'nist-cmmc',
  NIST_AI_RMF = 'nist-ai-rmf',
  HIPAA = 'hipaa',
  HITRUST = 'hitrust',
  SOX = 'sox',
  SOC2 = 'soc2',
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  GLBA = 'glba',
  CIS_CONTROLS = 'cis-controls',
  CJIS = 'cjis',
  PCI_DSS = 'pci-dss',
  NYDFS = 'nydfs',
  FEDRAMP = 'fedramp',
  FISMA = 'fisma',
  EU_AI_ACT = 'eu-ai-act',
  ISO_27001 = 'iso-27001',
  ISO_27701 = 'iso-27701',
  CPRA = 'cpra',
  VCDPA = 'vcdpa',
  CPA_CO = 'cpa-co',
  CTDPA = 'ctdpa',
  SHIELD_ACT = 'shield-act',
  FERPA = 'ferpa',
  COPPA = 'coppa',
  CMIA = 'cmia',
  TEXAS_HB4 = 'texas-hb4',
  EO_14110 = 'eo-14110'
}

export enum PlanType {
  SSP = 'ssp', // System Security Plan
  IRP = 'irp', // Incident Response Plan
  BRP = 'brp', // Breach Response Plan
  BCDR = 'bcdr', // Business Continuity & Disaster Recovery
  TEST_FAILOVER = 'test-failover' // Test & Failover Plan
}

export interface ControlRequirement {
  id: string;
  title: string;
  category?: string;
  description: string;
  implementation: string;
  assessment: string;
  relatedControls?: string[];
}

export interface FrameworkMapping {
  control_id: string;
  framework: ComplianceFramework;
  requirement: ControlRequirement;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  effort?: 'low' | 'medium' | 'high' | 'very-high';
}

export interface PolicyDocument {
  id: string;
  title: string;
  organization: string;
  framework: ComplianceFramework;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'published';
  version: string;
  author?: string;
  reviewers?: string[];
  approvedBy?: string;
}

export interface SecurityPlan {
  id: string;
  type: PlanType;
  title: string;
  organization: string;
  framework?: ComplianceFramework;
  sections: PlanSection[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'implementation';
  owner?: string;
}

export interface PlanSection {
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
  responsibilities?: string[];
  timeline?: string;
}

export interface GapAnalysisResult {
  policyId: string;
  framework: ComplianceFramework;
  totalControls: number;
  coveredControls: number;
  coverage: number; // Percentage
  gaps: ControlGap[];
  recommendations: RemediationRecommendation[];
  complianceScore: number;
  generatedAt: Date;
}

export interface ControlGap {
  controlId: string;
  controlTitle: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high' | 'very-high';
  implementationSteps?: string[];
}

export interface RemediationRecommendation {
  priority: number;
  controlId: string;
  recommendation: string;
  steps: string[];
  estimatedDays: number;
  resources?: string[];
}

export interface AnalysisRequest {
  policyId: string;
  frameworks: ComplianceFramework[];
  organization?: string;
  context?: string;
}

export interface PolicyGenerationRequest {
  title: string;
  organization: string;
  frameworks: ComplianceFramework[];
  context?: string;
  scope?: string;
  audience?: string;
}

export interface PlanGenerationRequest {
  type: PlanType;
  organization: string;
  frameworks: ComplianceFramework[];
  title: string;
  context?: string;
  scope?: string;
}

export interface GRCAgentRequest {
  message: string;
  userId?: string;
  conversationId?: string;
  context?: Record<string, unknown>;
}

export interface GRCAgentResponse {
  response: string;
  intent: string;
  data?: PolicyDocument | SecurityPlan | GapAnalysisResult | unknown;
  conversationId: string;
  timestamp: Date;
}

export interface FrameworkInfo {
  id: ComplianceFramework;
  name: string;
  version: string;
  description: string;
  organization: string;
  total_controls: number;
  categories: string[];
  url?: string;
}

export interface SearchResult {
  framework: ComplianceFramework;
  controlId: string;
  controlTitle: string;
  relevance: number;
  description: string;
}

export interface AgentIntentResult {
  intent: string;
  confidence: number;
  entities: {
    frameworks?: ComplianceFramework[];
    organization?: string;
    policyTitle?: string;
    planType?: PlanType;
    context?: string;
  };
}

// ============================================================================
// RISK ASSESSMENT TYPES
// ============================================================================

export enum RiskCategory {
  STRATEGIC = 'strategic',
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial',
  COMPLIANCE = 'compliance',
  REPUTATIONAL = 'reputational',
  TECHNOLOGY = 'technology',
  CYBERSECURITY = 'cybersecurity',
  THIRD_PARTY = 'third-party',
  PHYSICAL = 'physical',
  HUMAN_RESOURCES = 'human-resources'
}

export enum RiskLikelihood {
  RARE = 1,           // < 10% chance
  UNLIKELY = 2,       // 10-30% chance
  POSSIBLE = 3,       // 30-50% chance
  LIKELY = 4,         // 50-70% chance
  ALMOST_CERTAIN = 5  // > 70% chance
}

export enum RiskImpact {
  NEGLIGIBLE = 1,     // Minimal impact
  MINOR = 2,          // Limited impact
  MODERATE = 3,       // Significant impact
  MAJOR = 4,          // Severe impact
  CATASTROPHIC = 5    // Critical/existential impact
}

export enum RiskTreatment {
  ACCEPT = 'accept',       // Accept the risk as-is
  MITIGATE = 'mitigate',   // Implement controls to reduce
  TRANSFER = 'transfer',   // Transfer via insurance, contract
  AVOID = 'avoid'          // Eliminate the risk source
}

export enum RiskStatus {
  IDENTIFIED = 'identified',
  ASSESSED = 'assessed',
  TREATMENT_PLANNED = 'treatment-planned',
  TREATMENT_IN_PROGRESS = 'treatment-in-progress',
  MONITORING = 'monitoring',
  CLOSED = 'closed',
  ACCEPTED = 'accepted'
}

export interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  organization: string;
  category: RiskCategory;
  
  // Risk Owner
  owner: string;
  ownerEmail?: string;
  department?: string;
  
  // Inherent Risk (before controls)
  inherentLikelihood: RiskLikelihood;
  inherentImpact: RiskImpact;
  inherentRiskScore: number; // likelihood × impact
  inherentRiskRating: 'critical' | 'high' | 'medium' | 'low';

  // Current Controls
  existingControls: RiskControl[];
  controlEffectiveness: 'effective' | 'partially-effective' | 'ineffective' | 'not-assessed';
  
  // Residual Risk (after controls)
  residualLikelihood: RiskLikelihood;
  residualImpact: RiskImpact;
  residualRiskScore: number;
  residualRiskRating: 'critical' | 'high' | 'medium' | 'low';

  // Target Risk (after treatment)
  targetLikelihood?: RiskLikelihood;
  targetImpact?: RiskImpact;
  targetRiskScore?: number;
  targetRiskRating?: 'critical' | 'high' | 'medium' | 'low';
  
  // Treatment
  treatment: RiskTreatment;
  treatmentPlan?: RiskTreatmentPlan;
  
  // Quantitative Assessment (optional)
  quantitativeAssessment?: QuantitativeRiskAssessment;
  
  // Metadata
  status: RiskStatus;
  createdAt: Date;
  updatedAt: Date;
  assessmentDate: Date;
  nextReviewDate: Date;
  relatedFrameworks?: ComplianceFramework[];
  relatedControls?: string[];
  tags?: string[];
  attachments?: string[];
}

export interface RiskControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  status: 'implemented' | 'planned' | 'not-implemented';
  effectiveness: 'effective' | 'partially-effective' | 'ineffective';
  owner?: string;
  testDate?: Date;
  testResult?: string;
}

export interface RiskTreatmentPlan {
  id: string;
  actions: TreatmentAction[];
  totalBudget?: number;
  startDate: Date;
  targetCompletionDate: Date;
  actualCompletionDate?: Date;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  approver?: string;
  approvalDate?: Date;
}

export interface TreatmentAction {
  id: string;
  description: string;
  owner: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
}

export interface QuantitativeRiskAssessment {
  // Single Loss Expectancy
  assetValue: number;           // AV - Value of the asset
  exposureFactor: number;       // EF - Percentage of asset loss (0-1)
  singleLossExpectancy: number; // SLE = AV × EF
  
  // Annualized Loss Expectancy
  annualRateOfOccurrence: number; // ARO - Expected frequency per year
  annualizedLossExpectancy: number; // ALE = SLE × ARO
  
  // Cost-Benefit Analysis
  controlCost?: number;           // Annual cost of control
  controlEffectiveness?: number;  // Reduction in ALE (0-1)
  returnOnInvestment?: number;    // ROI = (ALE_before - ALE_after - ControlCost) / ControlCost
  
  // Monte Carlo simulation results (if performed)
  confidenceLevel?: number;       // e.g., 95%
  valueAtRisk?: number;           // VaR at confidence level
  expectedLoss?: number;          // Mean expected loss
  worstCaseLoss?: number;         // Maximum loss scenario
  
  currency: string;
  calculatedAt: Date;
  assumptions?: string[];
  dataSource?: string;
}

export interface RiskRegister {
  id: string;
  name: string;
  organization: string;
  description?: string;
  risks: RiskAssessment[];
  riskAppetite: RiskAppetite;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
  reviewFrequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  lastReviewDate?: Date;
  nextReviewDate: Date;
}

export interface RiskAppetite {
  overall: 'risk-averse' | 'risk-neutral' | 'risk-tolerant';
  byCategory: Partial<Record<RiskCategory, number>>; // Max acceptable risk score per category
  acceptableRiskThreshold: number;  // Risks below this score can be accepted
  escalationThreshold: number;      // Risks above this need executive review
  description: string;
}

export interface RiskHeatmapCell {
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  count: number;
  color: string;
  risks: { id: string; title: string; score: number }[];
  riskIds?: string[];
}

export interface RiskHeatmapData {
  cells: RiskHeatmapCell[];
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface RiskAssessmentRequest {
  title: string;
  description: string;
  organization: string;
  category: RiskCategory;
  owner: string;
  inherentLikelihood: RiskLikelihood;
  inherentImpact: RiskImpact;
  existingControls?: Partial<RiskControl>[];
  treatment?: RiskTreatment;
  relatedFrameworks?: ComplianceFramework[];
}

export interface RiskTreatmentRequest {
  riskId: string;
  treatment: RiskTreatment;
  actions: Partial<TreatmentAction>[];
  targetLikelihood?: RiskLikelihood;
  targetImpact?: RiskImpact;
  budget?: number;
  targetCompletionDate: Date;
}

export interface QuantitativeAssessmentRequest {
  riskId: string;
  assetValue: number;
  exposureFactor: number;
  annualRateOfOccurrence: number;
  controlCost?: number;
  controlEffectiveness?: number;
  currency?: string;
  assumptions?: string[];
}

// ============================================================================
// CONTROL IMPLEMENTATION TYPES
// ============================================================================

export enum ControlStatus {
  NOT_IMPLEMENTED = 'not-implemented',
  PLANNED = 'planned',
  IN_PROGRESS = 'in-progress',
  IMPLEMENTED = 'implemented',
  PARTIALLY_IMPLEMENTED = 'partially-implemented',
  NOT_APPLICABLE = 'not-applicable'
}

export enum ControlEffectiveness {
  NOT_TESTED = 'not-tested',
  INEFFECTIVE = 'ineffective',
  PARTIALLY_EFFECTIVE = 'partially-effective',
  EFFECTIVE = 'effective',
  HIGHLY_EFFECTIVE = 'highly-effective'
}

export interface ImplementedControl {
  id: string;
  frameworkControlId: string;  // Reference to the framework control (e.g., CJIS-5.1, PCI-1.1)
  framework: ComplianceFramework;
  organization: string;
  
  // Control Details
  controlName: string;
  controlDescription: string;
  controlOwner: string;
  controlType: 'preventive' | 'detective' | 'corrective' | 'compensating';
  
  // Implementation Status
  status: ControlStatus;
  implementationDate?: Date;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  
  // Effectiveness
  effectiveness: ControlEffectiveness;
  lastTestDate?: Date;
  testFrequency?: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  
  // Evidence and Documentation
  evidenceLinks?: string[];
  notes?: string;
  
  // Procedures linked to this control
  procedures: ImplementedProcedure[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ImplementedProcedure {
  id: string;
  controlId: string;  // Reference to the ImplementedControl
  
  // Procedure Details
  procedureName: string;
  procedureDescription: string;
  procedureOwner: string;
  
  // Documentation
  documentLink?: string;
  version?: string;
  
  // Execution Details
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as-needed';
  lastExecutionDate?: Date;
  nextExecutionDate?: Date;
  
  // Status
  status: 'draft' | 'approved' | 'active' | 'under-review' | 'deprecated';
  
  // Steps
  steps?: ProcedureStep[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcedureStep {
  stepNumber: number;
  description: string;
  responsible?: string;
  expectedDuration?: string;
  notes?: string;
}

export interface ControlImplementationSummary {
  frameworkControlId: string;
  frameworkControlTitle: string;
  framework: ComplianceFramework;
  implementedControlsCount: number;
  proceduresCount: number;
  overallStatus: ControlStatus;
  overallEffectiveness: ControlEffectiveness;
}

export interface ControlImplementationRequest {
  frameworkControlId: string;
  framework: ComplianceFramework;
  organization: string;
  controlName: string;
  controlDescription: string;
  controlOwner: string;
  controlType: 'preventive' | 'detective' | 'corrective' | 'compensating';
  status?: ControlStatus;
  effectiveness?: ControlEffectiveness;
  implementationDate?: Date;
  testFrequency?: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  evidenceLinks?: string[];
  notes?: string;
}

export interface ProcedureRequest {
  controlId: string;
  procedureName: string;
  procedureDescription: string;
  procedureOwner: string;
  documentLink?: string;
  version?: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as-needed';
  status?: 'draft' | 'approved' | 'active' | 'under-review' | 'deprecated';
  steps?: ProcedureStep[];
}

// ============================================================================
// OFFLINE PACKAGE, DOCUMENT INGESTION, AND EXEMPTION TYPES
// ============================================================================

export type ConnectionStatus = 'online' | 'degraded' | 'offline' | 'unknown';

export interface OfflineConnectionProfile {
  id: string;
  name: string;
  endpoint?: string;
  status: ConnectionStatus;
  lastCheckedAt: Date;
  notes?: string;
}

export type ClientArtifactType =
  | 'policy'
  | 'procedure'
  | 'security-plan'
  | 'system-plan'
  | 'ssp'
  | 'irp'
  | 'other';

export type ArtifactSource = 'manual' | 'upload' | 'api' | 'migration';

export interface ClientDocumentArtifact {
  id: string;
  organization: string;
  title: string;
  type: ClientArtifactType;
  source: ArtifactSource;
  content: string;
  mappedFrameworks: ComplianceFramework[];
  extractedControlIds: string[];
  tags?: string[];
  ingestedBy?: string;
  ingestedAt: Date;
  updatedAt: Date;
  checksum: string;
}

export interface ClientDocumentIngestionRequest {
  organization: string;
  title: string;
  content: string;
  encoding?: 'base64';
  filename?: string;
  type?: ClientArtifactType;
  source?: ArtifactSource;
  tags?: string[];
  ingestedBy?: string;
}

export type ExemptionStatus = 'proposed' | 'approved' | 'rejected' | 'expired';

export interface GapExemption {
  id: string;
  organization: string;
  framework?: ComplianceFramework;
  controlId?: string;
  gapDescription: string;
  acceptanceJustification: string;
  riskIdentified: string;
  mitigationsInPlace: string;
  residualRisk: string;
  riskOwner: string;
  riskOwnerEmail?: string;
  status: ExemptionStatus;
  approvedBy?: string;
  approvalNotes?: string;
  nextReviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GapExemptionRequest {
  organization: string;
  framework?: ComplianceFramework;
  controlId?: string;
  gapDescription: string;
  acceptanceJustification: string;
  riskIdentified: string;
  mitigationsInPlace: string;
  residualRisk: string;
  riskOwner: string;
  riskOwnerEmail?: string;
  status?: ExemptionStatus;
  approvedBy?: string;
  approvalNotes?: string;
  nextReviewDate: Date;
}

export type ImprovementInsightSource =
  | 'manual'
  | 'runtime-error'
  | 'gap-analysis'
  | 'documentation-gap'
  | 'policy-generation';

export interface ImprovementInsight {
  id: string;
  title: string;
  source: ImprovementInsightSource;
  observation: string;
  rootCause?: string;
  recommendation: string;
  reinforcementActions: string[];
  relatedFrameworks?: ComplianceFramework[];
  relatedControls?: string[];
  helpfulCount: number;
  harmfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImprovementInsightRequest {
  title: string;
  source: ImprovementInsightSource;
  observation: string;
  rootCause?: string;
  recommendation: string;
  reinforcementActions?: string[];
  relatedFrameworks?: ComplianceFramework[];
  relatedControls?: string[];
}

export type ImprovementArtifactType = 'policy' | 'plan' | 'procedure';

export type ImprovementOutcomeStatus = 'pending' | 'adopted' | 'deferred' | 'rejected';

export interface ImprovementInjectionOutcome {
  id: string;
  artifactType: ImprovementArtifactType;
  artifactId: string;
  artifactTitle: string;
  organization: string;
  frameworks?: ComplianceFramework[];
  injectedInsightIds: string[];
  injectionSummary?: string;
  status: ImprovementOutcomeStatus;
  qualityRating?: number;
  implementationDelta?: string;
  reviewer?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImprovementOutcomeUpdateRequest {
  status?: ImprovementOutcomeStatus;
  qualityRating?: number;
  implementationDelta?: string;
  reviewer?: string;
}

export interface DocumentationGapAnalysisRequest {
  frameworks: ComplianceFramework[];
  includeFiles?: string[];
}

export interface FrameworkDocumentationGapResult {
  framework: ComplianceFramework;
  totalControls: number;
  coveredControls: number;
  coverage: number;
  uncoveredControls: ControlGap[];
}
