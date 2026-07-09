/**
 * Exemption Service
 * Tracks risk-accepted gaps with explicit ownership, mitigation, and review cadence.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ComplianceFramework,
  GapExemption,
  GapExemptionRequest
} from '../types/framework.js';
import { localStoreService } from './local-store-service.js';

export class ExemptionService {
  private exemptions: Map<string, GapExemption> = new Map();

  constructor() {
    localStoreService.getGapExemptions().forEach(exemption => {
      this.exemptions.set(exemption.id, exemption);
    });
  }

  createExemption(request: GapExemptionRequest): GapExemption {
    const now = new Date();
    const exemption: GapExemption = {
      id: uuidv4(),
      organization: request.organization,
      framework: request.framework,
      controlId: request.controlId,
      gapDescription: request.gapDescription,
      acceptanceJustification: request.acceptanceJustification,
      riskIdentified: request.riskIdentified,
      mitigationsInPlace: request.mitigationsInPlace,
      residualRisk: request.residualRisk,
      riskOwner: request.riskOwner,
      riskOwnerEmail: request.riskOwnerEmail,
      status: request.status || 'proposed',
      approvedBy: request.approvedBy,
      approvalNotes: request.approvalNotes,
      nextReviewDate: new Date(request.nextReviewDate),
      createdAt: now,
      updatedAt: now
    };

    this.exemptions.set(exemption.id, exemption);
    this.persist();

    return exemption;
  }

  listExemptions(filters?: {
    organization?: string;
    framework?: ComplianceFramework;
    status?: GapExemption['status'];
  }): GapExemption[] {
    let items = Array.from(this.exemptions.values());

    if (filters?.organization) {
      const organization = filters.organization.toLowerCase();
      items = items.filter(item => item.organization.toLowerCase() === organization);
    }

    if (filters?.framework) {
      items = items.filter(item => item.framework === filters.framework);
    }

    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }

    return items.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
  }

  getExemption(id: string): GapExemption | undefined {
    return this.exemptions.get(id);
  }

  updateExemption(id: string, updates: Partial<GapExemptionRequest>): GapExemption | undefined {
    const current = this.exemptions.get(id);
    if (!current) {
      return undefined;
    }

    const updated: GapExemption = {
      ...current,
      ...updates,
      nextReviewDate: updates.nextReviewDate ? new Date(updates.nextReviewDate) : current.nextReviewDate,
      updatedAt: new Date()
    };

    this.exemptions.set(id, updated);
    this.persist();

    return updated;
  }

  private persist(): void {
    localStoreService.setGapExemptions(Array.from(this.exemptions.values()));
  }
}

export default ExemptionService;
