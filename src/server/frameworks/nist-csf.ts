/** NIST Cybersecurity Framework 2.0 framework metadata and catalog access. */

import { FrameworkInfo, ControlRequirement, ComplianceFramework } from '../types/framework.js';
import { nistCSFControls } from './nist-csf-catalog.js';

export const nistCSF20: FrameworkInfo = {
  id: ComplianceFramework.NIST_CSF,
  name: 'NIST Cybersecurity Framework',
  version: '2.0',
  description: 'The NIST Cybersecurity Framework (NIST CSF) is a risk-based framework with six functions and 106 core subcategory outcomes.',
  organization: 'National Institute of Standards and Technology (NIST)',
  total_controls: 106,
  categories: ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
  url: 'https://csrc.nist.gov/projects/cybersecurity-framework'
};
export { nistCSFControls };

export function getNISTCSFControls(): ControlRequirement[] {
  return Object.values(nistCSFControls);
}

export function getNISTCSFControl(controlId: string): ControlRequirement | undefined {
  return nistCSFControls[controlId];
}

export function getNISTCSFControlsByCategory(category: string): ControlRequirement[] {
  const categoryPrefix = category.trim().toUpperCase();
  const functionPrefixes: Record<string, string> = {
    GOVERN: 'GV', IDENTIFY: 'ID', PROTECT: 'PR', DETECT: 'DE', RESPOND: 'RS', RECOVER: 'RC'
  };
  const prefix = functionPrefixes[categoryPrefix] ?? categoryPrefix;
  return Object.values(nistCSFControls).filter(control =>
    control.id.startsWith(prefix) || control.category?.toUpperCase().startsWith(prefix)
  );
}
