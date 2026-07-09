/**
 * Framework Registry - Centralized management of all compliance frameworks
 */

import { FrameworkInfo, ControlRequirement, ComplianceFramework, SearchResult } from '../types/framework.js';
import { nistCSF20, nistCSFControls } from './nist-csf.js';
import { nist80053, nist80053Controls } from './nist-800-53.js';
import { hipaaFramework, hipaaControls } from './hipaa.js';
import { soc2Framework, soc2Controls } from './soc2.js';
import { gdprFramework, gdprControls } from './gdpr.js';
import { ccpaFramework, ccpaControls } from './ccpa.js';
import { glbaFramework, glbaControls } from './glba.js';
import { cisControlsFramework, cisControlsControls } from './cis-controls.js';
import { hitrustFramework, hitrustControls } from './hitrust.js';
import { soxFramework, soxControls } from './sox.js';
import { cmmcFramework, cmmcControls } from './cmmc.js';
import { cjisFramework, cjisControls } from './cjis.js';
import { pciDSSFramework, pciDSSControls } from './pci-dss.js';
import {
  nist800171Framework, nist800171Controls,
  nydfsFramework, nydfsControls,
  fedrampFramework, fedrampControls,
  fismaFramework, fismaControls,
  nistAIRMFFramework, nistAIRMFControls,
  euAIActFramework, euAIActControls,
  iso27001Framework, iso27001Controls,
  iso27701Framework, iso27701Controls,
  cpraFramework, cpraControls,
  vcdpaFramework, vcdpaControls,
  cpaCoFramework, cpaCoControls,
  ctdpaFramework, ctdpaControls,
  shieldActFramework, shieldActControls,
  eo14110Framework, eo14110Controls,
  ferpaFramework, ferpaControls,
  coppaFramework, coppaControls,
  texasHB4Framework, texasHB4Controls,
  cmiaFramework, cmiaControls,
} from './additional-frameworks.js';

export class FrameworkRegistry {
  private static frameworks: Map<string, FrameworkInfo> = new Map();
  private static controls: Map<string, Map<string, ControlRequirement>> = new Map();

  static {
    // Initialize frameworks with full detail
    this.frameworks.set(ComplianceFramework.NIST_CSF, nistCSF20);
    this.frameworks.set(ComplianceFramework.NIST_800_53, nist80053);
    this.frameworks.set(ComplianceFramework.NIST_CMMC, cmmcFramework);
    this.frameworks.set(ComplianceFramework.HIPAA, hipaaFramework);
    this.frameworks.set(ComplianceFramework.HITRUST, hitrustFramework);
    this.frameworks.set(ComplianceFramework.SOX, soxFramework);
    this.frameworks.set(ComplianceFramework.SOC2, soc2Framework);
    this.frameworks.set(ComplianceFramework.GDPR, gdprFramework);
    this.frameworks.set(ComplianceFramework.CCPA, ccpaFramework);
    this.frameworks.set(ComplianceFramework.GLBA, glbaFramework);
    this.frameworks.set(ComplianceFramework.CIS_CONTROLS, cisControlsFramework);
    this.frameworks.set(ComplianceFramework.CJIS, cjisFramework);
    this.frameworks.set(ComplianceFramework.PCI_DSS, pciDSSFramework);
    this.frameworks.set(ComplianceFramework.NIST_800_171, nist800171Framework);
    this.frameworks.set(ComplianceFramework.NYDFS, nydfsFramework);
    this.frameworks.set(ComplianceFramework.FEDRAMP, fedrampFramework);
    this.frameworks.set(ComplianceFramework.FISMA, fismaFramework);
    this.frameworks.set(ComplianceFramework.NIST_AI_RMF, nistAIRMFFramework);
    this.frameworks.set(ComplianceFramework.EU_AI_ACT, euAIActFramework);
    this.frameworks.set(ComplianceFramework.ISO_27001, iso27001Framework);
    this.frameworks.set(ComplianceFramework.ISO_27701, iso27701Framework);
    this.frameworks.set(ComplianceFramework.CPRA, cpraFramework);
    this.frameworks.set(ComplianceFramework.VCDPA, vcdpaFramework);
    this.frameworks.set(ComplianceFramework.CPA_CO, cpaCoFramework);
    this.frameworks.set(ComplianceFramework.CTDPA, ctdpaFramework);
    this.frameworks.set(ComplianceFramework.SHIELD_ACT, shieldActFramework);
    this.frameworks.set(ComplianceFramework.EO_14110, eo14110Framework);
    this.frameworks.set(ComplianceFramework.FERPA, ferpaFramework);
    this.frameworks.set(ComplianceFramework.COPPA, coppaFramework);
    this.frameworks.set(ComplianceFramework.TEXAS_HB4, texasHB4Framework);
    this.frameworks.set(ComplianceFramework.CMIA, cmiaFramework);
    
    // Initialize all controls
    this.controls.set(ComplianceFramework.NIST_CSF, new Map(Object.entries(nistCSFControls)));
    this.controls.set(ComplianceFramework.NIST_800_53, new Map(Object.entries(nist80053Controls)));
    this.controls.set(ComplianceFramework.NIST_CMMC, new Map(Object.entries(cmmcControls)));
    this.controls.set(ComplianceFramework.HIPAA, new Map(Object.entries(hipaaControls)));
    this.controls.set(ComplianceFramework.HITRUST, new Map(Object.entries(hitrustControls)));
    this.controls.set(ComplianceFramework.SOX, new Map(Object.entries(soxControls)));
    this.controls.set(ComplianceFramework.SOC2, new Map(Object.entries(soc2Controls)));
    this.controls.set(ComplianceFramework.GDPR, new Map(Object.entries(gdprControls)));
    this.controls.set(ComplianceFramework.CCPA, new Map(Object.entries(ccpaControls)));
    this.controls.set(ComplianceFramework.GLBA, new Map(Object.entries(glbaControls)));
    this.controls.set(ComplianceFramework.CIS_CONTROLS, new Map(Object.entries(cisControlsControls)));
    this.controls.set(ComplianceFramework.CJIS, new Map(Object.entries(cjisControls)));
    this.controls.set(ComplianceFramework.PCI_DSS, new Map(Object.entries(pciDSSControls)));
    this.controls.set(ComplianceFramework.NIST_800_171, new Map(Object.entries(nist800171Controls)));
    this.controls.set(ComplianceFramework.NYDFS, new Map(Object.entries(nydfsControls)));
    this.controls.set(ComplianceFramework.FEDRAMP, new Map(Object.entries(fedrampControls)));
    this.controls.set(ComplianceFramework.FISMA, new Map(Object.entries(fismaControls)));
    this.controls.set(ComplianceFramework.NIST_AI_RMF, new Map(Object.entries(nistAIRMFControls)));
    this.controls.set(ComplianceFramework.EU_AI_ACT, new Map(Object.entries(euAIActControls)));
    this.controls.set(ComplianceFramework.ISO_27001, new Map(Object.entries(iso27001Controls)));
    this.controls.set(ComplianceFramework.ISO_27701, new Map(Object.entries(iso27701Controls)));
    this.controls.set(ComplianceFramework.CPRA, new Map(Object.entries(cpraControls)));
    this.controls.set(ComplianceFramework.VCDPA, new Map(Object.entries(vcdpaControls)));
    this.controls.set(ComplianceFramework.CPA_CO, new Map(Object.entries(cpaCoControls)));
    this.controls.set(ComplianceFramework.CTDPA, new Map(Object.entries(ctdpaControls)));
    this.controls.set(ComplianceFramework.SHIELD_ACT, new Map(Object.entries(shieldActControls)));
    this.controls.set(ComplianceFramework.EO_14110, new Map(Object.entries(eo14110Controls)));
    this.controls.set(ComplianceFramework.FERPA, new Map(Object.entries(ferpaControls)));
    this.controls.set(ComplianceFramework.COPPA, new Map(Object.entries(coppaControls)));
    this.controls.set(ComplianceFramework.TEXAS_HB4, new Map(Object.entries(texasHB4Controls)));
    this.controls.set(ComplianceFramework.CMIA, new Map(Object.entries(cmiaControls)));
  }

  static getFramework(id: ComplianceFramework): FrameworkInfo | undefined {
    return this.frameworks.get(id);
  }

  static getAllFrameworks(): FrameworkInfo[] {
    return Array.from(this.frameworks.values());
  }

  static getFrameworksByIds(ids: ComplianceFramework[]): FrameworkInfo[] {
    return ids
      .map(id => this.frameworks.get(id))
      .filter((fw): fw is FrameworkInfo => fw !== undefined);
  }

  static getFrameworksSummary(): { id: string; name: string; version: string }[] {
    return Array.from(this.frameworks.values()).map(fw => ({
      id: fw.id,
      name: fw.name,
      version: fw.version
    }));
  }

  static searchFrameworks(keyword: string): FrameworkInfo[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.frameworks.values()).filter(fw =>
      fw.name.toLowerCase().includes(lowerKeyword) ||
      fw.description.toLowerCase().includes(lowerKeyword) ||
      fw.organization.toLowerCase().includes(lowerKeyword)
    );
  }

  static getFrameworkControls(framework: ComplianceFramework): ControlRequirement[] {
    const controls = this.controls.get(framework);
    return controls ? Array.from(controls.values()) : [];
  }

  static getControlRequirements(framework: ComplianceFramework, controlId: string): ControlRequirement | undefined {
    return this.controls.get(framework)?.get(controlId);
  }

  static searchControls(framework: ComplianceFramework, keyword: string): ControlRequirement[] {
    const controls = this.controls.get(framework);
    if (!controls) return [];

    const lowerKeyword = keyword.toLowerCase();
    return Array.from(controls.values()).filter(control =>
      control.title.toLowerCase().includes(lowerKeyword) ||
      control.description.toLowerCase().includes(lowerKeyword) ||
      control.implementation.toLowerCase().includes(lowerKeyword)
    );
  }

  static globalSearch(keyword: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lowerKeyword = keyword.toLowerCase();

    this.frameworks.forEach((framework, frameworkId) => {
      const controlMap = this.controls.get(frameworkId as ComplianceFramework);
      if (controlMap) {
        controlMap.forEach((control, controlId) => {
          let relevance = 0;

          if (control.id.toLowerCase().includes(lowerKeyword)) relevance += 3;
          if (control.title.toLowerCase().includes(lowerKeyword)) relevance += 2;
          if (control.description.toLowerCase().includes(lowerKeyword)) relevance += 1;
          if (control.implementation.toLowerCase().includes(lowerKeyword)) relevance += 0.5;

          if (relevance > 0) {
            results.push({
              framework: frameworkId as ComplianceFramework,
              controlId: control.id,
              controlTitle: control.title,
              relevance,
              description: control.description
            });
          }
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  static compareFrameworks(framework1: ComplianceFramework, framework2: ComplianceFramework): {
    overlapping: string[];
    unique_to_first: string[];
    unique_to_second: string[];
  } {
    const controls1 = new Set(this.controls.get(framework1)?.keys() ?? []);
    const controls2 = new Set(this.controls.get(framework2)?.keys() ?? []);

    const overlapping = Array.from(controls1).filter(c => controls2.has(c));
    const unique_to_first = Array.from(controls1).filter(c => !controls2.has(c));
    const unique_to_second = Array.from(controls2).filter(c => !controls1.has(c));

    return { overlapping, unique_to_first, unique_to_second };
  }

  static getFrameworkSummary(framework: ComplianceFramework): string {
    const fw = this.frameworks.get(framework);
    if (!fw) return '';

    return `
${fw.name} v${fw.version}
Organization: ${fw.organization}
Total Controls: ${fw.total_controls}
Categories: ${fw.categories.join(', ')}
Description: ${fw.description}
More info: ${fw.url || 'N/A'}
    `.trim();
  }
}

export default FrameworkRegistry;
