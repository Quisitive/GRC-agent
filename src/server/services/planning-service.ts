/**
 * Planning Service - Security and compliance plan generation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SecurityPlan,
  PlanSection,
  PlanGenerationRequest,
  PlanType,
  ComplianceFramework
} from '../types/framework.js';
import FrameworkRegistry from '../frameworks/index.js';
import { localStoreService } from './local-store-service.js';
import ImprovementPlaybookService from './improvement-playbook-service.js';

export class PlanningService {
  private plans: Map<string, SecurityPlan> = new Map();
  private improvementPlaybookService: ImprovementPlaybookService;

  constructor() {
    this.improvementPlaybookService = new ImprovementPlaybookService();
    localStoreService.getPlans().forEach(plan => {
      this.plans.set(plan.id, plan);
    });
  }

  async generatePlan(request: PlanGenerationRequest): Promise<SecurityPlan> {
    const id = uuidv4();
    const now = new Date();
    const injection = this.improvementPlaybookService.buildInjectionBrief({
      frameworks: request.frameworks,
      limit: 3
    });

    const sections = await this.generatePlanSections(request);
    if (injection.guidance) {
      sections.push({
        title: 'Continuous Improvement Guidance',
        content: `Apply the following validated lessons-learned recommendations while executing this plan:\n${injection.guidance}`,
        responsibilities: ['Plan Owner', 'Compliance Lead', 'Security Operations'],
        timeline: 'Review recommendations at each plan milestone and quarterly governance checkpoints'
      });
    }
    const title = this.generateTitle(request.type, request.title);

    const plan: SecurityPlan = {
      id,
      type: request.type,
      title,
      organization: request.organization,
      framework: request.frameworks[0],
      sections,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      owner: 'Not Assigned'
    };

    this.plans.set(id, plan);
    this.persist();

    if (injection.insightIds.length > 0) {
      this.improvementPlaybookService.recordInjectionOutcome({
        artifactType: 'plan',
        artifactId: plan.id,
        artifactTitle: plan.title,
        organization: plan.organization,
        frameworks: request.frameworks,
        injectedInsightIds: injection.insightIds,
        injectionSummary: injection.guidance
      });
    }

    return plan;
  }

  private generateTitle(type: PlanType, baseTitle: string): string {
    const typeNames: Record<PlanType, string> = {
      [PlanType.SSP]: 'System Security Plan (SSP)',
      [PlanType.IRP]: 'Incident Response Plan (IRP)',
      [PlanType.BRP]: 'Breach Response Plan (BRP)',
      [PlanType.BCDR]: 'Business Continuity & Disaster Recovery Plan',
      [PlanType.TEST_FAILOVER]: 'Test & Failover Plan'
    };

    return `${typeNames[type]} - ${baseTitle}`;
  }

  private async generatePlanSections(request: PlanGenerationRequest): Promise<PlanSection[]> {
    switch (request.type) {
      case PlanType.SSP:
        return this.generateSSPSections(request);
      case PlanType.IRP:
        return this.generateIRPSections(request);
      case PlanType.BRP:
        return this.generateBRPSections(request);
      case PlanType.BCDR:
        return this.generateBCDRSections(request);
      case PlanType.TEST_FAILOVER:
        return this.generateTestFailoverSections(request);
      default:
        return this.generateGenericSections(request);
    }
  }

  private generateSSPSections(request: PlanGenerationRequest): PlanSection[] {
    return [
      {
        title: '1. System Overview',
        content: `This System Security Plan (SSP) documents the security controls for ${request.title} within ${request.organization}.`,
        subsections: [
          { title: 'System Description', content: 'Detailed description of system purpose, scope, and environment.' },
          { title: 'System Environment', content: 'Description of the system boundary, interconnections, and data flows.' },
          { title: 'Authorization Basis', content: `Authorization boundary and alignment with ${request.frameworks.map(f => FrameworkRegistry.getFramework(f)?.name).join(', ')}.` }
        ],
        responsibilities: ['System Owner', 'CISO', 'Security Architect']
      },
      {
        title: '2. Security Controls',
        content: 'Implementation of required security controls mapped to applicable frameworks.',
        subsections: request.frameworks.map(f => ({
          title: `${FrameworkRegistry.getFramework(f)?.name} Controls`,
          content: `Controls implemented to address ${FrameworkRegistry.getFramework(f)?.name} requirements.`
        })),
        responsibilities: ['Security Team', 'System Administrator']
      },
      {
        title: '3. System Security Plan Update',
        content: 'Process for keeping the SSP current and accurate.',
        responsibilities: ['System Owner'],
        timeline: 'Annual review or upon significant system changes'
      },
      {
        title: '4. System Interconnections',
        content: 'Identification and description of interconnected systems.',
        responsibilities: ['Network Administrator', 'System Owner'],
        timeline: 'Document at implementation and update on change'
      },
      {
        title: '5. Compliance and Monitoring',
        content: 'Ongoing monitoring and assessment activities to maintain compliance.',
        responsibilities: ['Security Team', 'Compliance Officer'],
        timeline: 'Continuous monitoring with quarterly reviews'
      },
      {
        title: '6. Plan Approval',
        content: 'Authorization and approval of the security plan.',
        responsibilities: ['CISO', 'System Owner', 'Information Security Officer']
      }
    ];
  }

  private generateIRPSections(request: PlanGenerationRequest): PlanSection[] {
    return [
      {
        title: '1. Introduction',
        content: 'Purpose: To coordinate incident response activities.',
        responsibilities: ['Incident Response Team', 'CISO']
      },
      {
        title: '2. Incident Response Team',
        content: 'Designation of incident response personnel and responsibilities.',
        subsections: [
          { title: 'Team Members', content: 'Names, titles, and contact information of key personnel.' },
          { title: 'Roles and Responsibilities', content: 'Specific duties for incident detection, response, and recovery.' }
        ],
        responsibilities: ['CISO', 'Incident Response Coordinator']
      },
      {
        title: '3. Incident Detection and Analysis',
        content: 'Procedures for identifying and analyzing security incidents.',
        subsections: [
          { title: 'Detection Methods', content: 'Tools and techniques used to identify incidents.' },
          { title: 'Analysis Process', content: 'Steps to analyze incident severity and scope.' }
        ],
        responsibilities: ['Security Operations Center', 'Incident Response Team'],
        timeline: '1 hour for initial assessment'
      },
      {
        title: '4. Containment, Eradication, and Recovery',
        content: 'Procedures for limiting damage and restoring systems.',
        subsections: [
          { title: 'Short-term Containment', content: 'Immediate steps to prevent incident spread.' },
          { title: 'Long-term Containment', content: 'Sustained containment measures.' }
        ],
        responsibilities: ['Incident Response Team', 'System Administrators'],
        timeline: 'Varies by incident severity'
      },
      {
        title: '5. Post-Incident Activities',
        content: 'Review and improvement following incident response.',
        subsections: [
          { title: 'Lessons Learned', content: 'After-action review of incident response effectiveness.' },
          { title: 'System Hardening', content: 'Improvements to prevent similar incidents.' }
        ],
        responsibilities: ['Incident Response Team', 'Management'],
        timeline: 'Within 5 days of incident closure'
      },
      {
        title: '6. Appendices',
        content: 'Reference materials and contact information.',
        responsibilities: ['CISO']
      }
    ];
  }

  private generateBRPSections(request: PlanGenerationRequest): PlanSection[] {
    return [
      {
        title: '1. Breach Response Team',
        content: 'Identification of team members and their roles in breach response.',
        responsibilities: ['Privacy Officer', 'Legal', 'CISO', 'Communications']
      },
      {
        title: '2. Breach Detection and Assessment',
        content: 'Process for identifying and assessing data breaches.',
        subsections: [
          { title: 'Detection Methods', content: 'Tools and monitoring to identify breaches.' },
          { title: 'Assessment Criteria', content: 'Factors in determining breach severity and scope.' }
        ],
        responsibilities: ['Incident Response Team', 'Data Protection Officer'],
        timeline: '24-72 hours for initial assessment'
      },
      {
        title: '3. Notification Procedures',
        content: 'Requirements and procedures for notifying affected individuals.',
        subsections: [
          { title: 'Regulatory Notification', content: 'Notification to regulatory bodies as required.' },
          { title: 'Individual Notification', content: 'Communication with affected individuals.' },
          { title: 'Media and Public Notification', content: 'Handling of public disclosure if required.' }
        ],
        responsibilities: ['Communications', 'Legal', 'Privacy Officer'],
        timeline: 'Per regulatory requirements (e.g., GDPR 72 hours)'
      },
      {
        title: '4. Investigation and Remediation',
        content: 'Conducting breach investigation and implementing remediation.',
        responsibilities: ['Forensics Team', 'IT Operations', 'Security'],
        timeline: 'Ongoing investigation'
      },
      {
        title: '5. Follow-up and Improvement',
        content: 'Post-breach review and improvement measures.',
        responsibilities: ['Management', 'CISO', 'Legal']
      }
    ];
  }

  private generateBCDRSections(request: PlanGenerationRequest): PlanSection[] {
    return [
      {
        title: '1. Executive Summary',
        content: `Business continuity and disaster recovery plan for ${request.organization}.`,
        responsibilities: ['Executive Leadership', 'CISO']
      },
      {
        title: '2. Recovery Objectives',
        content: 'Definition of recovery time objectives (RTO) and recovery point objectives (RPO).',
        subsections: [
          { title: 'RTO Definition', content: 'Maximum acceptable downtime for each critical system.' },
          { title: 'RPO Definition', content: 'Maximum acceptable data loss for each critical system.' }
        ],
        responsibilities: ['Business Continuity Manager', 'System Owner']
      },
      {
        title: '3. Backup and Restoration',
        content: 'Procedures for backing up and restoring critical systems.',
        subsections: [
          { title: 'Backup Schedule', content: 'Frequency and retention of system backups.' },
          { title: 'Restoration Testing', content: 'Regular testing of backup restoration procedures.' }
        ],
        responsibilities: ['IT Operations', 'Backup Administrator'],
        timeline: 'Quarterly restoration testing'
      },
      {
        title: '4. Disaster Recovery Sites',
        content: 'Identification and maintenance of disaster recovery facilities.',
        responsibilities: ['Facilities', 'IT Operations'],
        timeline: 'Annual site review and updates'
      },
      {
        title: '5. Communication and Coordination',
        content: 'Procedures for communicating during recovery operations.',
        responsibilities: ['Crisis Communication Team', 'BCP Coordinator']
      }
    ];
  }

  private generateTestFailoverSections(request: PlanGenerationRequest): PlanSection[] {
    return [
      {
        title: '1. Test Objectives',
        content: 'Goals and objectives for failover testing.',
        responsibilities: ['Test Manager', 'Project Lead']
      },
      {
        title: '2. Test Scope',
        content: 'Systems and processes included in the test.',
        responsibilities: ['Systems Owner', 'Test Manager']
      },
      {
        title: '3. Test Procedures',
        content: 'Step-by-step procedures for conducting failover testing.',
        subsections: [
          { title: 'Pre-Test Activities', content: 'Preparation and notification.' },
          { title: 'Test Execution', content: 'Implementation of test procedures.' },
          { title: 'Post-Test Activities', content: 'Validation and rollback procedures.' }
        ],
        responsibilities: ['Test Team', 'IT Operations'],
        timeline: 'Scheduled testing window'
      },
      {
        title: '4. Success Criteria',
        content: 'Metrics and criteria for determining test success.',
        responsibilities: ['Test Manager', 'Quality Assurance']
      },
      {
        title: '5. Results and Remediation',
        content: 'Documentation of test results and remediation of identified issues.',
        responsibilities: ['Test Result Analysis Team', 'Management']
      }
    ];
  }

  private generateGenericSections(request: PlanGenerationRequest): PlanSection[] {
    return [
      {
        title: '1. Overview',
        content: `Strategic plan for ${request.title} within ${request.organization}.`,
        responsibilities: ['Plan Owner']
      },
      {
        title: '2. Goals and Objectives',
        content: 'High-level goals and specific, measurable objectives',
        responsibilities: ['Plan Owner', 'Stakeholders']
      },
      {
        title: '3. Implementation Strategy',
        content: 'Approach for achieving objectives aligned with ' + request.frameworks.map(f => FrameworkRegistry.getFramework(f)?.name).join(', '),
        responsibilities: ['Implementation Team']
      },
      {
        title: '4. Timeline',
        content: 'Schedule for plan implementation and review.',
        responsibilities: ['Project Manager']
      },
      {
        title: '5. Metrics and Monitoring',
        content: 'Measures for tracking progress and effectiveness.',
        responsibilities: ['Monitoring Team', 'Management']
      }
    ];
  }

  getPlan(id: string): SecurityPlan | undefined {
    return this.plans.get(id);
  }

  listPlans(): SecurityPlan[] {
    return Array.from(this.plans.values());
  }

  listPlansByType(type: PlanType): SecurityPlan[] {
    return Array.from(this.plans.values()).filter(p => p.type === type);
  }

  updatePlan(id: string, updates: Partial<SecurityPlan>): SecurityPlan | undefined {
    const plan = this.plans.get(id);
    if (!plan) return undefined;

    const updated: SecurityPlan = {
      ...plan,
      ...updates,
      updatedAt: new Date()
    };

    this.plans.set(id, updated);
    this.persist();
    return updated;
  }

  deletePlan(id: string): boolean {
    const deleted = this.plans.delete(id);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  exportPlanAsMarkdown(id: string): string | undefined {
    const plan = this.plans.get(id);
    if (!plan) return undefined;

    let markdown = `# ${plan.title}\n\n`;
    markdown += `**Organization:** ${plan.organization}\n`;
    markdown += `**Plan Type:** ${plan.type}\n`;
    markdown += `**Created:** ${plan.createdAt.toISOString()}\n`;
    markdown += `**Status:** ${plan.status}\n\n`;

    for (const section of plan.sections) {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;

      if (section.subsections) {
        for (const sub of section.subsections) {
          markdown += `### ${sub.title}\n\n${sub.content}\n\n`;
        }
      }

      if (section.responsibilities) {
        markdown += `**Responsibilities:** ${section.responsibilities.join(', ')}\n\n`;
      }

      if (section.timeline) {
        markdown += `**Timeline:** ${section.timeline}\n\n`;
      }
    }

    return markdown;
  }

  approvePlan(id: string, approver: string): SecurityPlan | undefined {
    return this.updatePlan(id, { status: 'approved', owner: approver });
  }

  private persist(): void {
    localStoreService.setPlans(Array.from(this.plans.values()));
  }
}

export default PlanningService;
