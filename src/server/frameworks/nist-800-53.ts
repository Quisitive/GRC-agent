/**
 * NIST SP 800-53 Security Controls Catalog
 * Federal Information Security Management Act (FISMA) compliance
 */

import { FrameworkInfo, ControlRequirement, ComplianceFramework } from '../types/framework.js';

export const nist80053: FrameworkInfo = {
  id: ComplianceFramework.NIST_800_53,
  name: 'NIST SP 800-53 Security Controls',
  version: 'Rev. 5',
  description: 'NIST Special Publication 800-53 provides recommended security controls for federal information and information systems.',
  organization: 'National Institute of Standards and Technology (NIST)',
  total_controls: 988,
  categories: [
    'Access Control', 'Audit and Accountability', 'Assessment, Authorization, and Monitoring',
    'Security Awareness and Training', 'Audit and Accountability', 'Configuration Management',
    'Contingency Planning', 'Identification and Authentication', 'Incident Response',
    'Maintenance', 'Media Protection', 'Physical and Environmental Protection',
    'Planning', 'Personnel Security', 'Risk Assessment', 'System and Services Acquisition',
    'System and Information Integrity'
  ],
  url: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'
};

export const nist80053Controls: Record<string, ControlRequirement> = {
  'AC-2': {
    id: 'AC-2',
    title: 'Account Management',
    description: 'The information system manages information system accounts including creation, enablement, modification, disablement, and removal.',
    implementation: 'Establish account management procedures, automate user provisioning, enforce account lifecycle policies, and maintain account records.',
    assessment: 'Review account management policies and procedures. Verify implementation through testing of account creation and removal.',
    relatedControls: ['AC-1', 'IA-4', 'AU-9']
  },
  'AU-2': {
    id: 'AU-2',
    title: 'Audit Events',
    description: 'The organization determines that the information system is capable of auditing the following events.',
    implementation: 'Define auditable events, configure system logging, ensure log integrity, and establish log retention policies.',
    assessment: 'Review audit event configuration and verify logging of critical security events.',
    relatedControls: ['AU-3', 'AU-12', 'SI-4']
  },
  'IR-1': {
    id: 'IR-1',
    title: 'Incident Response Policy and Procedures',
    description: 'The organization develops, disseminates, and reviews/updates a formal, documented incident response policy.',
    implementation: 'Develop comprehensive incident response policy, establish procedures, populate incident response team, and maintain documentation.',
    assessment: 'Review incident response policy and verify team appointment and incident response testing records.',
    relatedControls: ['IR-2', 'IR-4', 'IR-6']
  },
  'IA-5': {
    id: 'IA-5',
    title: 'Authentication Mechanisms',
    description: 'The information system implements authentication mechanisms for user and device identity verification.',
    implementation: 'Implement strong authentication methods, enforce password policies, use multi-factor authentication, and monitor authentication events.',
    assessment: 'Test authentication mechanisms and verify password requirements compliance.',
    relatedControls: ['IA-2', 'IA-4', 'IA-8']
  },
  'SC-7': {
    id: 'SC-7',
    title: 'Boundary Protection',
    description: 'The information system monitors and controls communications at the network boundary.',
    implementation: 'Deploy firewalls, configure network segmentation, implement DMZ, and monitor boundary traffic.',
    assessment: 'Review network architecture, verify firewall configuration, and test boundary protections.',
    relatedControls: ['AC-3', 'SC-3', 'SI-4']
  },
  'SI-4': {
    id: 'SI-4',
    title: 'Information System Monitoring',
    description: 'The organization monitors the information system and its environment of operation for attacks and indicators of potential attacks.',
    implementation: 'Deploy monitoring tools, configure alerting, establish baseline metrics, and analyze logs for suspicious activity.',
    assessment: 'Verify monitoring tool deployment and review detected security events.',
    relatedControls: ['AU-13', 'DE.AE-02', 'SI-2']
  }
};

export function getNIST80053Controls(): ControlRequirement[] {
  return Object.values(nist80053Controls);
}

export function getNIST80053Control(controlId: string): ControlRequirement | undefined {
  return nist80053Controls[controlId];
}

export function getNIST80053ControlsByCategory(category: string): ControlRequirement[] {
  return Object.values(nist80053Controls).filter(c => c.id.startsWith(category.substring(0, 2)));
}
