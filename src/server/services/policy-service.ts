/**
 * Policy Service - Policy generation and lifecycle management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PolicyDocument,
  PolicyGenerationRequest,
  ComplianceFramework
} from '../types/framework.js';
import FrameworkRegistry from '../frameworks/index.js';
import { localStoreService } from './local-store-service.js';
import ImprovementPlaybookService from './improvement-playbook-service.js';

export class PolicyService {
  private policies: Map<string, PolicyDocument> = new Map();
  private improvementPlaybookService: ImprovementPlaybookService;

  constructor() {
    this.improvementPlaybookService = new ImprovementPlaybookService();
    localStoreService.getPolicies().forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  async generatePolicy(request: PolicyGenerationRequest): Promise<PolicyDocument> {
    const id = uuidv4();
    const now = new Date();
    const injection = this.improvementPlaybookService.buildInjectionBrief({
      frameworks: request.frameworks,
      limit: 3
    });

    const content = await this.generatePolicyContent(request, injection.guidance);

    const policy: PolicyDocument = {
      id,
      title: request.title,
      organization: request.organization,
      framework: request.frameworks[0] || ComplianceFramework.NIST_CSF,
      content,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      version: '1.0.0'
    };

    this.policies.set(id, policy);
    this.persist();

    if (injection.insightIds.length > 0) {
      this.improvementPlaybookService.recordInjectionOutcome({
        artifactType: 'policy',
        artifactId: policy.id,
        artifactTitle: policy.title,
        organization: policy.organization,
        frameworks: request.frameworks,
        injectedInsightIds: injection.insightIds,
        injectionSummary: injection.guidance
      });
    }

    return policy;
  }

  private async generatePolicyContent(request: PolicyGenerationRequest, injectionGuidance?: string): Promise<string> {
    const frameworks = request.frameworks.map(f => {
      const fw = FrameworkRegistry.getFramework(f);
      return fw?.name || f;
    }).join(', ');

    const content = `# ${request.title}

## Policy Document
**Organization:** ${request.organization}
**Frameworks:** ${frameworks}
**Created:** ${new Date().toISOString()}

## 1. Purpose and Scope

This policy establishes requirements for ${request.title.toLowerCase()} within ${request.organization}.

### Scope
${request.scope || 'This policy applies to all organizational units and personnel.'}

### Audience
${request.audience || 'All employees, contractors, and partners'}

## 2. Policy Objectives

Align cybersecurity practices with the following frameworks:
${request.frameworks.map(f => `- ${FrameworkRegistry.getFramework(f)?.name}`).join('\n')}

## 3. Policy Requirements

${request.frameworks.map(f => `### ${FrameworkRegistry.getFramework(f)?.name}

The organization shall comply with all applicable requirements from this framework.`).join('\n\n')}

## 4. Roles and Responsibilities

- **Policy Owner:** Designated executive sponsor
- **Policy Administrator:** Day-to-day management and updates
- **Policy Reviewers:** Compliance and security professionals
- **Policy Audiences:** All covered personnel

## 5. Compliance and Enforcement

Violations of this policy may result in disciplinary action up to and including termination of employment.

## 6. Policy Review

This policy shall be reviewed annually or when regulatory requirements change.

${injectionGuidance ? `## 7. Continuous Improvement Guidance

Use the following curated lessons-learned recommendations when implementing and reviewing this policy:

${injectionGuidance}

` : ''}

---
**Status:** Draft
**Version:** 1.0.0
**Last Updated:** ${new Date().toISOString()}
`;

    return content;
  }

  getPolicy(id: string): PolicyDocument | undefined {
    return this.policies.get(id);
  }

  listPolicies(): PolicyDocument[] {
    return Array.from(this.policies.values());
  }

  listPoliciesByFramework(framework: ComplianceFramework): PolicyDocument[] {
    return Array.from(this.policies.values()).filter(p => p.framework === framework);
  }

  updatePolicy(id: string, updates: Partial<PolicyDocument>): PolicyDocument | undefined {
    const policy = this.policies.get(id);
    if (!policy) return undefined;

    const updated: PolicyDocument = {
      ...policy,
      ...updates,
      updatedAt: new Date()
    };

    this.policies.set(id, updated);
    this.persist();
    return updated;
  }

  deletePolicy(id: string): boolean {
    const deleted = this.policies.delete(id);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  exportPolicyAsMarkdown(id: string): string | undefined {
    const policy = this.policies.get(id);
    if (!policy) return undefined;
    return policy.content;
  }

  exportPolicyAsJSON(id: string): string | undefined {
    const policy = this.policies.get(id);
    if (!policy) return undefined;
    return JSON.stringify(policy, null, 2);
  }

  approvePolicy(id: string, approver: string): PolicyDocument | undefined {
    const policy = this.policies.get(id);
    if (!policy) return undefined;

    return this.updatePolicy(id, {
      status: 'approved',
      approvedBy: approver
    });
  }

  publishPolicy(id: string): PolicyDocument | undefined {
    const policy = this.policies.get(id);
    if (!policy) return undefined;

    return this.updatePolicy(id, {
      status: 'published'
    });
  }

  private persist(): void {
    localStoreService.setPolicies(Array.from(this.policies.values()));
  }
}

export default PolicyService;
