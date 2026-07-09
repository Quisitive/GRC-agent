/**
 * Control Implementation Service
 * Manages organizational controls and procedures linked to framework requirements
 */

import {
  ImplementedControl,
  ImplementedProcedure,
  ProcedureStep,
  ControlImplementationSummary,
  ControlImplementationRequest,
  ProcedureRequest,
  ComplianceFramework,
  ControlStatus,
  ControlEffectiveness
} from '../types/framework.js';
import { v4 as uuidv4 } from 'uuid';
import { localStoreService } from './local-store-service.js';
import ImprovementPlaybookService from './improvement-playbook-service.js';

export class ControlImplementationService {
  private controls: Map<string, ImplementedControl> = new Map();
  private procedures: Map<string, ImplementedProcedure> = new Map();
  private improvementPlaybookService: ImprovementPlaybookService;
  
  // Index for quick lookup by framework control ID
  private controlsByFramework: Map<string, Set<string>> = new Map();

  constructor() {
    this.improvementPlaybookService = new ImprovementPlaybookService();
    const persistedControls = localStoreService.getControls();
    const persistedProcedures = localStoreService.getProcedures();

    if (persistedControls.length > 0 || persistedProcedures.length > 0) {
      this.loadFromStore(persistedControls, persistedProcedures);
      return;
    }

    // Initialize with sample data only when no local data exists.
    this.initializeSampleData();
    this.persistAll();
  }

  private loadFromStore(
    controls: ImplementedControl[],
    procedures: ImplementedProcedure[]
  ): void {
    this.controls.clear();
    this.procedures.clear();
    this.controlsByFramework.clear();

    controls.forEach(control => {
      this.controls.set(control.id, {
        ...control,
        procedures: []
      });
    });

    const effectiveProcedures = procedures.length > 0
      ? procedures
      : controls.flatMap(control => control.procedures || []);

    effectiveProcedures.forEach(procedure => {
      this.procedures.set(procedure.id, procedure);
      const control = this.controls.get(procedure.controlId);
      if (control) {
        control.procedures.push(procedure);
      }
    });

    this.rebuildFrameworkIndex();
  }

  private rebuildFrameworkIndex(): void {
    this.controlsByFramework.clear();

    this.controls.forEach(control => {
      const key = `${control.framework}:${control.frameworkControlId}`;
      if (!this.controlsByFramework.has(key)) {
        this.controlsByFramework.set(key, new Set());
      }
      this.controlsByFramework.get(key)!.add(control.id);
    });
  }

  private initializeSampleData(): void {
    // Sample implementation for CJIS-5.1
    const sampleControl: ImplementedControl = {
      id: uuidv4(),
      frameworkControlId: 'CJIS-5.1',
      framework: ComplianceFramework.CJIS,
      organization: 'Sample Organization',
      controlName: 'Access Control Policy Implementation',
      controlDescription: 'Organizational access control policy restricting CJI access to authorized personnel only.',
      controlOwner: 'Security Manager',
      controlType: 'preventive',
      status: ControlStatus.IMPLEMENTED,
      implementationDate: new Date('2024-01-15'),
      lastReviewDate: new Date('2025-01-15'),
      nextReviewDate: new Date('2026-01-15'),
      effectiveness: ControlEffectiveness.EFFECTIVE,
      lastTestDate: new Date('2025-01-10'),
      testFrequency: 'annually',
      evidenceLinks: ['https://sharepoint.example.com/policies/access-control'],
      notes: 'Policy reviewed and approved by CISO. Training completed for all staff.',
      procedures: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2025-01-15'),
      createdBy: 'admin'
    };

    const sampleProcedure: ImplementedProcedure = {
      id: uuidv4(),
      controlId: sampleControl.id,
      procedureName: 'User Access Request Procedure',
      procedureDescription: 'Step-by-step procedure for requesting and approving user access to CJI systems.',
      procedureOwner: 'IT Security Team',
      documentLink: 'https://sharepoint.example.com/procedures/access-request',
      version: '2.1',
      frequency: 'as-needed',
      lastExecutionDate: new Date('2025-02-01'),
      status: 'active',
      steps: [
        { stepNumber: 1, description: 'User submits access request form', responsible: 'User', expectedDuration: '5 minutes' },
        { stepNumber: 2, description: 'Manager approves request', responsible: 'User Manager', expectedDuration: '1-2 days' },
        { stepNumber: 3, description: 'Security team verifies background check', responsible: 'Security Team', expectedDuration: '1-3 days' },
        { stepNumber: 4, description: 'IT provisions access', responsible: 'IT Team', expectedDuration: '1 day' },
        { stepNumber: 5, description: 'User completes security training', responsible: 'User', expectedDuration: '2 hours' }
      ],
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2025-01-20')
    };

    sampleControl.procedures = [sampleProcedure];
    this.controls.set(sampleControl.id, sampleControl);
    this.procedures.set(sampleProcedure.id, sampleProcedure);
    
    // Index the control
    const key = `${sampleControl.framework}:${sampleControl.frameworkControlId}`;
    if (!this.controlsByFramework.has(key)) {
      this.controlsByFramework.set(key, new Set());
    }
    this.controlsByFramework.get(key)!.add(sampleControl.id);
  }

  // ==================== CONTROL OPERATIONS ====================

  createControl(request: ControlImplementationRequest): ImplementedControl {
    const control: ImplementedControl = {
      id: uuidv4(),
      frameworkControlId: request.frameworkControlId,
      framework: request.framework,
      organization: request.organization,
      controlName: request.controlName,
      controlDescription: request.controlDescription,
      controlOwner: request.controlOwner,
      controlType: request.controlType,
      status: request.status || ControlStatus.PLANNED,
      implementationDate: request.implementationDate,
      effectiveness: request.effectiveness || ControlEffectiveness.NOT_TESTED,
      testFrequency: request.testFrequency,
      evidenceLinks: request.evidenceLinks || [],
      notes: request.notes,
      procedures: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.controls.set(control.id, control);
    
    // Index the control
    const key = `${control.framework}:${control.frameworkControlId}`;
    if (!this.controlsByFramework.has(key)) {
      this.controlsByFramework.set(key, new Set());
    }
    this.controlsByFramework.get(key)!.add(control.id);

    this.persistAll();

    return control;
  }

  getControl(controlId: string): ImplementedControl | undefined {
    return this.controls.get(controlId);
  }

  getAllControls(): ImplementedControl[] {
    return Array.from(this.controls.values());
  }

  getControlsByFramework(framework: ComplianceFramework): ImplementedControl[] {
    return Array.from(this.controls.values())
      .filter(control => control.framework === framework);
  }

  getControlsForFrameworkControl(framework: ComplianceFramework, frameworkControlId: string): ImplementedControl[] {
    const key = `${framework}:${frameworkControlId}`;
    const controlIds = this.controlsByFramework.get(key);
    
    if (!controlIds) return [];
    
    return Array.from(controlIds)
      .map(id => this.controls.get(id))
      .filter((control): control is ImplementedControl => control !== undefined);
  }

  getControlsByOrganization(organization: string): ImplementedControl[] {
    return Array.from(this.controls.values())
      .filter(control => control.organization === organization);
  }

  updateControl(controlId: string, updates: Partial<ControlImplementationRequest>): ImplementedControl | undefined {
    const control = this.controls.get(controlId);
    if (!control) return undefined;

    const updatedControl: ImplementedControl = {
      ...control,
      ...updates,
      updatedAt: new Date()
    };

    this.controls.set(controlId, updatedControl);
    this.persistAll();
    return updatedControl;
  }

  deleteControl(controlId: string): boolean {
    const control = this.controls.get(controlId);
    if (!control) return false;

    // Remove from index
    const key = `${control.framework}:${control.frameworkControlId}`;
    this.controlsByFramework.get(key)?.delete(controlId);

    // Remove associated procedures
    control.procedures.forEach(proc => {
      this.procedures.delete(proc.id);
    });

    const deleted = this.controls.delete(controlId);
    if (deleted) {
      this.persistAll();
    }

    return deleted;
  }

  // ==================== PROCEDURE OPERATIONS ====================

  createProcedure(request: ProcedureRequest): ImplementedProcedure | undefined {
    const control = this.controls.get(request.controlId);
    if (!control) return undefined;

    const injection = this.improvementPlaybookService.buildInjectionBrief({
      frameworks: [control.framework],
      limit: 2
    });

    const guidanceBlock = injection.guidance
      ? `\n\nContinuous Improvement Guidance\n${injection.guidance}`
      : '';

    const procedure: ImplementedProcedure = {
      id: uuidv4(),
      controlId: request.controlId,
      procedureName: request.procedureName,
      procedureDescription: `${request.procedureDescription}${guidanceBlock}`,
      procedureOwner: request.procedureOwner,
      documentLink: request.documentLink,
      version: request.version || '1.0',
      frequency: request.frequency,
      status: request.status || 'draft',
      steps: request.steps || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.procedures.set(procedure.id, procedure);
    control.procedures.push(procedure);
    control.updatedAt = new Date();

    this.persistAll();

    if (injection.insightIds.length > 0) {
      this.improvementPlaybookService.recordInjectionOutcome({
        artifactType: 'procedure',
        artifactId: procedure.id,
        artifactTitle: procedure.procedureName,
        organization: control.organization,
        frameworks: [control.framework],
        injectedInsightIds: injection.insightIds,
        injectionSummary: injection.guidance
      });
    }

    return procedure;
  }

  getProcedure(procedureId: string): ImplementedProcedure | undefined {
    return this.procedures.get(procedureId);
  }

  getProceduresForControl(controlId: string): ImplementedProcedure[] {
    return Array.from(this.procedures.values())
      .filter(proc => proc.controlId === controlId);
  }

  updateProcedure(procedureId: string, updates: Partial<ProcedureRequest>): ImplementedProcedure | undefined {
    const procedure = this.procedures.get(procedureId);
    if (!procedure) return undefined;

    const updatedProcedure: ImplementedProcedure = {
      ...procedure,
      ...updates,
      updatedAt: new Date()
    };

    this.procedures.set(procedureId, updatedProcedure);

    // Update the procedure in the control's procedures array
    const control = this.controls.get(procedure.controlId);
    if (control) {
      const idx = control.procedures.findIndex(p => p.id === procedureId);
      if (idx !== -1) {
        control.procedures[idx] = updatedProcedure;
      }
    }

    this.persistAll();

    return updatedProcedure;
  }

  deleteProcedure(procedureId: string): boolean {
    const procedure = this.procedures.get(procedureId);
    if (!procedure) return false;

    // Remove from control's procedures array
    const control = this.controls.get(procedure.controlId);
    if (control) {
      control.procedures = control.procedures.filter(p => p.id !== procedureId);
    }

    const deleted = this.procedures.delete(procedureId);
    if (deleted) {
      this.persistAll();
    }

    return deleted;
  }

  // ==================== SUMMARY AND REPORTING ====================

  getImplementationSummary(framework: ComplianceFramework, frameworkControlId: string): ControlImplementationSummary {
    const controls = this.getControlsForFrameworkControl(framework, frameworkControlId);
    
    let overallStatus = ControlStatus.NOT_IMPLEMENTED;
    let overallEffectiveness = ControlEffectiveness.NOT_TESTED;
    let proceduresCount = 0;

    if (controls.length > 0) {
      // Determine overall status based on the most advanced implementation
      const statusPriority: Record<ControlStatus, number> = {
        [ControlStatus.IMPLEMENTED]: 5,
        [ControlStatus.PARTIALLY_IMPLEMENTED]: 4,
        [ControlStatus.IN_PROGRESS]: 3,
        [ControlStatus.PLANNED]: 2,
        [ControlStatus.NOT_APPLICABLE]: 1,
        [ControlStatus.NOT_IMPLEMENTED]: 0
      };

      const effectivenessPriority: Record<ControlEffectiveness, number> = {
        [ControlEffectiveness.HIGHLY_EFFECTIVE]: 4,
        [ControlEffectiveness.EFFECTIVE]: 3,
        [ControlEffectiveness.PARTIALLY_EFFECTIVE]: 2,
        [ControlEffectiveness.INEFFECTIVE]: 1,
        [ControlEffectiveness.NOT_TESTED]: 0
      };

      overallStatus = controls.reduce((best, control) => 
        statusPriority[control.status] > statusPriority[best] ? control.status : best,
        ControlStatus.NOT_IMPLEMENTED as ControlStatus
      );

      overallEffectiveness = controls.reduce((best, control) =>
        effectivenessPriority[control.effectiveness] > effectivenessPriority[best] ? control.effectiveness : best,
        ControlEffectiveness.NOT_TESTED as ControlEffectiveness
      );

      proceduresCount = controls.reduce((sum, control) => sum + control.procedures.length, 0);
    }

    return {
      frameworkControlId,
      frameworkControlTitle: '', // Will be populated by caller
      framework,
      implementedControlsCount: controls.length,
      proceduresCount,
      overallStatus,
      overallEffectiveness
    };
  }

  getFrameworkImplementationSummary(framework: ComplianceFramework): Map<string, ControlImplementationSummary> {
    const summaries = new Map<string, ControlImplementationSummary>();
    
    // Get all unique framework control IDs for this framework
    const frameworkControlIds = new Set<string>();
    this.controls.forEach(control => {
      if (control.framework === framework) {
        frameworkControlIds.add(control.frameworkControlId);
      }
    });

    frameworkControlIds.forEach(controlId => {
      summaries.set(controlId, this.getImplementationSummary(framework, controlId));
    });

    return summaries;
  }

  getComplianceStats(organization: string): {
    totalControls: number;
    implemented: number;
    partiallyImplemented: number;
    inProgress: number;
    planned: number;
    notImplemented: number;
    totalProcedures: number;
    byFramework: Record<string, { controls: number; procedures: number }>;
  } {
    const orgControls = this.getControlsByOrganization(organization);
    
    const stats = {
      totalControls: orgControls.length,
      implemented: 0,
      partiallyImplemented: 0,
      inProgress: 0,
      planned: 0,
      notImplemented: 0,
      totalProcedures: 0,
      byFramework: {} as Record<string, { controls: number; procedures: number }>
    };

    orgControls.forEach(control => {
      switch (control.status) {
        case ControlStatus.IMPLEMENTED:
          stats.implemented++;
          break;
        case ControlStatus.PARTIALLY_IMPLEMENTED:
          stats.partiallyImplemented++;
          break;
        case ControlStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case ControlStatus.PLANNED:
          stats.planned++;
          break;
        case ControlStatus.NOT_IMPLEMENTED:
          stats.notImplemented++;
          break;
      }

      stats.totalProcedures += control.procedures.length;

      if (!stats.byFramework[control.framework]) {
        stats.byFramework[control.framework] = { controls: 0, procedures: 0 };
      }
      stats.byFramework[control.framework].controls++;
      stats.byFramework[control.framework].procedures += control.procedures.length;
    });

    return stats;
  }

  // ==================== SEARCH ====================

  searchControls(query: string): ImplementedControl[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.controls.values()).filter(control =>
      control.controlName.toLowerCase().includes(lowerQuery) ||
      control.controlDescription.toLowerCase().includes(lowerQuery) ||
      control.frameworkControlId.toLowerCase().includes(lowerQuery) ||
      control.controlOwner.toLowerCase().includes(lowerQuery)
    );
  }

  searchProcedures(query: string): ImplementedProcedure[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.procedures.values()).filter(procedure =>
      procedure.procedureName.toLowerCase().includes(lowerQuery) ||
      procedure.procedureDescription.toLowerCase().includes(lowerQuery) ||
      procedure.procedureOwner.toLowerCase().includes(lowerQuery)
    );
  }

  private persistAll(): void {
    localStoreService.setControls(Array.from(this.controls.values()));
    localStoreService.setProcedures(Array.from(this.procedures.values()));
  }
}

export default ControlImplementationService;
