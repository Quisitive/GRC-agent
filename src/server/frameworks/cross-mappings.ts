/**
 * Cross-Framework Control Mappings
 * Maps controls between CIS Controls v8, HITRUST CSF v11, and NIST CSF 2.0
 * These mappings are based on published framework alignment guides.
 */

import { ComplianceFramework } from '../types/framework.js';

export interface CrossMapping {
  /** A short domain label for grouping (e.g. "Asset Management") */
  domain: string;
  /** Controls in each framework that address this domain */
  controls: Partial<Record<ComplianceFramework, string[]>>;
}

/**
 * Authoritative cross-framework mappings organized by security domain.
 * Each entry groups control IDs from different frameworks that address the same
 * security objective, enabling comparison and compliance transfer analysis.
 */
export const crossFrameworkMappings: CrossMapping[] = [
  {
    domain: 'Asset Management',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.1', 'CIS.1.1', 'CIS.1.2', 'CIS.1.3', 'CIS.2', 'CIS.2.1'],
      [ComplianceFramework.HITRUST]: ['07.a', '07.b'],
      [ComplianceFramework.NIST_CSF]: ['GV.RO-01'],
      [ComplianceFramework.NIST_800_53]: ['CM-8', 'PM-5'],
      [ComplianceFramework.NIST_800_171]: ['3.4.1'],
      [ComplianceFramework.HIPAA]: ['164.310(d)(1)'],
      [ComplianceFramework.PCI_DSS]: ['PCI.2.4', 'PCI.9.9'],
      [ComplianceFramework.FEDRAMP]: ['CM-6'],
      [ComplianceFramework.ISO_27001]: ['A.8.1'],
      [ComplianceFramework.NIST_CMMC]: ['AM.2.032'],
      [ComplianceFramework.CJIS]: ['CJIS.5.10.1.1'],
    }
  },
  {
    domain: 'Access Control',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.5', 'CIS.6'],
      [ComplianceFramework.HITRUST]: ['01.a', '01.b', '01.c', '01.d', '01.e', '01.f'],
      [ComplianceFramework.NIST_CSF]: ['PR.AC-01'],
      [ComplianceFramework.NIST_800_53]: ['AC-1', 'AC-2', 'AC-3', 'AC-6'],
      [ComplianceFramework.NIST_800_171]: ['3.1.1', '3.1.2', '3.1.5', '3.1.7'],
      [ComplianceFramework.HIPAA]: ['164.312(a)(1)', '164.312(d)'],
      [ComplianceFramework.SOC2]: ['CC6.1', 'CC6.2', 'CC6.3'],
      [ComplianceFramework.PCI_DSS]: ['PCI.7.1', 'PCI.7.2', 'PCI.8.1'],
      [ComplianceFramework.NYDFS]: ['500.7', '500.12'],
      [ComplianceFramework.FEDRAMP]: ['AC-1', 'AC-2', 'IA-2'],
      [ComplianceFramework.FISMA]: ['FISMA.1'],
      [ComplianceFramework.ISO_27001]: ['A.8.5'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
      [ComplianceFramework.NIST_CMMC]: ['AC.1.001', 'AC.1.002'],
      [ComplianceFramework.CJIS]: ['CJIS.5.5.2', 'CJIS.5.5.3'],
    }
  },
  {
    domain: 'Security Awareness & Training',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.14'],
      [ComplianceFramework.HITRUST]: ['02.a', '02.b', '02.c', '02.d', '02.e'],
      [ComplianceFramework.NIST_CSF]: ['GV.RO-01'],
      [ComplianceFramework.NIST_800_53]: ['AT-1', 'AT-2', 'AT-3'],
      [ComplianceFramework.NIST_800_171]: ['3.2.1', '3.2.2'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(5)'],
      [ComplianceFramework.SOC2]: ['CC1.4'],
      [ComplianceFramework.PCI_DSS]: ['PCI.12.6'],
      [ComplianceFramework.NYDFS]: ['500.10', '500.14'],
      [ComplianceFramework.FEDRAMP]: ['AC-1'],
      [ComplianceFramework.FISMA]: ['FISMA.5'],
      [ComplianceFramework.ISO_27001]: ['A.6.1'],
      [ComplianceFramework.CJIS]: ['CJIS.5.2.2'],
      [ComplianceFramework.NIST_CMMC]: ['AT.2.056'],
    }
  },
  {
    domain: 'Data Protection & Encryption',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.3'],
      [ComplianceFramework.HITRUST]: ['06.a', '06.b', '06.c', '06.d'],
      [ComplianceFramework.NIST_CSF]: ['PR.AC-01'],
      [ComplianceFramework.NIST_800_53]: ['SC-8', 'SC-13', 'SC-28'],
      [ComplianceFramework.NIST_800_171]: ['3.13.8'],
      [ComplianceFramework.HIPAA]: ['164.312(a)(2)(iv)', '164.312(e)(1)'],
      [ComplianceFramework.GDPR]: ['Art.32'],
      [ComplianceFramework.SOC2]: ['CC6.7'],
      [ComplianceFramework.PCI_DSS]: ['PCI.3.4', 'PCI.4.1'],
      [ComplianceFramework.NYDFS]: ['500.15'],
      [ComplianceFramework.FEDRAMP]: ['SC-7'],
      [ComplianceFramework.ISO_27001]: ['A.8.24'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
      [ComplianceFramework.CCPA]: ['CCPA.1798.150'],
      [ComplianceFramework.CJIS]: ['CJIS.5.10.1.2'],
      [ComplianceFramework.NIST_CMMC]: ['SC.3.177'],
      [ComplianceFramework.SHIELD_ACT]: ['SHIELD.899-bb.2.b.ii'],
    }
  },
  {
    domain: 'Vulnerability Management',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.7'],
      [ComplianceFramework.HITRUST]: ['10.a', '10.b', '10.c'],
      [ComplianceFramework.NIST_CSF]: ['DE.AE-01'],
      [ComplianceFramework.NIST_800_53]: ['RA-5', 'SI-2'],
      [ComplianceFramework.NIST_800_171]: ['3.14.1'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(1)'],
      [ComplianceFramework.SOC2]: ['CC7.1'],
      [ComplianceFramework.PCI_DSS]: ['PCI.6.1', 'PCI.6.2', 'PCI.11.2'],
      [ComplianceFramework.NYDFS]: ['500.5'],
      [ComplianceFramework.FEDRAMP]: ['RA-5', 'SI-2'],
      [ComplianceFramework.ISO_27001]: ['A.8.8'],
      [ComplianceFramework.NIST_CMMC]: ['RM.2.141'],
      [ComplianceFramework.CJIS]: ['CJIS.5.10.4.1'],
    }
  },
  {
    domain: 'Configuration Management',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.4'],
      [ComplianceFramework.HITRUST]: ['10.h', '10.i'],
      [ComplianceFramework.NIST_CSF]: ['PR.AC-01'],
      [ComplianceFramework.NIST_800_53]: ['CM-2', 'CM-6', 'CM-7'],
      [ComplianceFramework.NIST_800_171]: ['3.4.1', '3.4.2'],
      [ComplianceFramework.SOC2]: ['CC6.6'],
      [ComplianceFramework.PCI_DSS]: ['PCI.2.1', 'PCI.2.2'],
      [ComplianceFramework.FEDRAMP]: ['CM-6'],
      [ComplianceFramework.ISO_27001]: ['A.8.1'],
      [ComplianceFramework.NIST_CMMC]: ['CM.2.061'],
    }
  },
  {
    domain: 'Audit Logging & Monitoring',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.8'],
      [ComplianceFramework.HITRUST]: ['09.aa', '09.ab', '09.ac', '09.ad'],
      [ComplianceFramework.NIST_CSF]: ['DE.AE-01'],
      [ComplianceFramework.NIST_800_53]: ['AU-2', 'AU-3', 'AU-6', 'AU-12'],
      [ComplianceFramework.NIST_800_171]: ['3.3.1', '3.3.2'],
      [ComplianceFramework.HIPAA]: ['164.312(b)'],
      [ComplianceFramework.SOC2]: ['CC7.2', 'CC7.3'],
      [ComplianceFramework.PCI_DSS]: ['PCI.10.1', 'PCI.10.2', 'PCI.10.3'],
      [ComplianceFramework.NYDFS]: ['500.6', '500.14'],
      [ComplianceFramework.FEDRAMP]: ['AU-2'],
      [ComplianceFramework.FISMA]: ['FISMA.8'],
      [ComplianceFramework.ISO_27001]: ['A.8.15', 'A.8.16'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
      [ComplianceFramework.CJIS]: ['CJIS.5.4.1', 'CJIS.5.4.1.1'],
      [ComplianceFramework.NIST_CMMC]: ['AU.2.041'],
    }
  },
  {
    domain: 'Network Security',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.12', 'CIS.13'],
      [ComplianceFramework.HITRUST]: ['09.m', '09.n'],
      [ComplianceFramework.NIST_CSF]: ['DE.AE-01'],
      [ComplianceFramework.NIST_800_53]: ['SC-7', 'AC-4'],
      [ComplianceFramework.NIST_800_171]: ['3.13.1'],
      [ComplianceFramework.HIPAA]: ['164.312(e)(1)'],
      [ComplianceFramework.SOC2]: ['CC6.6'],
      [ComplianceFramework.PCI_DSS]: ['PCI.1.1', 'PCI.1.2', 'PCI.1.3'],
      [ComplianceFramework.FEDRAMP]: ['SC-7'],
      [ComplianceFramework.ISO_27001]: ['A.8.15'],
      [ComplianceFramework.CJIS]: ['CJIS.5.10.1'],
      [ComplianceFramework.NIST_CMMC]: ['SC.1.175'],
      [ComplianceFramework.SHIELD_ACT]: ['SHIELD.899-bb.2.b.ii'],
    }
  },
  {
    domain: 'Incident Response',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.17'],
      [ComplianceFramework.HITRUST]: ['11.a', '11.b', '11.c', '11.d', '11.e'],
      [ComplianceFramework.NIST_CSF]: ['RS.RP-01'],
      [ComplianceFramework.NIST_800_53]: ['IR-1', 'IR-2', 'IR-4', 'IR-5', 'IR-6'],
      [ComplianceFramework.NIST_800_171]: ['3.6.1', '3.6.2'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(6)'],
      [ComplianceFramework.SOC2]: ['CC7.4', 'CC7.5'],
      [ComplianceFramework.PCI_DSS]: ['PCI.12.10'],
      [ComplianceFramework.GDPR]: ['Art.33', 'Art.34'],
      [ComplianceFramework.NYDFS]: ['500.16', '500.17'],
      [ComplianceFramework.FEDRAMP]: ['IR-4'],
      [ComplianceFramework.FISMA]: ['FISMA.6'],
      [ComplianceFramework.ISO_27001]: ['A.8.16'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
      [ComplianceFramework.CJIS]: ['CJIS.5.3.1'],
      [ComplianceFramework.NIST_CMMC]: ['IR.2.092'],
      [ComplianceFramework.SHIELD_ACT]: ['SHIELD.899-aa'],
    }
  },
  {
    domain: 'Business Continuity & Recovery',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.11'],
      [ComplianceFramework.HITRUST]: ['12.a', '12.b', '12.c', '12.d', '12.e'],
      [ComplianceFramework.NIST_CSF]: ['RC.RP-01'],
      [ComplianceFramework.NIST_800_53]: ['CP-1', 'CP-2', 'CP-4', 'CP-9', 'CP-10'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(7)'],
      [ComplianceFramework.SOC2]: ['A1.2', 'A1.3'],
      [ComplianceFramework.PCI_DSS]: ['PCI.12.10'],
      [ComplianceFramework.FEDRAMP]: ['CP-9'],
      [ComplianceFramework.FISMA]: ['FISMA.7'],
      [ComplianceFramework.ISO_27001]: ['A.5.23'],
      [ComplianceFramework.NIST_CMMC]: ['RE.2.137'],
    }
  },
  {
    domain: 'Risk Management',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.1', 'CIS.2'],
      [ComplianceFramework.HITRUST]: ['03.a', '03.b', '03.c', '03.d'],
      [ComplianceFramework.NIST_CSF]: ['GV.RO-01', 'GV.PO-01'],
      [ComplianceFramework.NIST_800_53]: ['RA-1', 'RA-2', 'RA-3'],
      [ComplianceFramework.NIST_800_171]: ['3.11.1', '3.12.1'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(1)(ii)(A)'],
      [ComplianceFramework.SOC2]: ['CC3.1', 'CC3.2', 'CC3.3'],
      [ComplianceFramework.SOX]: ['SOX.302', 'SOX.404'],
      [ComplianceFramework.NYDFS]: ['500.9'],
      [ComplianceFramework.FEDRAMP]: ['RA-5'],
      [ComplianceFramework.FISMA]: ['FISMA.2'],
      [ComplianceFramework.ISO_27001]: ['A.5.1'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
      [ComplianceFramework.NIST_CMMC]: ['RM.2.141', 'RM.2.142'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.9'],
      [ComplianceFramework.NIST_AI_RMF]: ['MANAGE.1', 'MANAGE.2'],
    }
  },
  {
    domain: 'Security Governance & Policy',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.15'],
      [ComplianceFramework.HITRUST]: ['00.a', '00.b'],
      [ComplianceFramework.NIST_CSF]: ['GV.PO-01', 'GV.RO-01'],
      [ComplianceFramework.NIST_800_53]: ['PL-1', 'PL-2', 'PM-1'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(1)'],
      [ComplianceFramework.SOC2]: ['CC1.1', 'CC1.2', 'CC1.3'],
      [ComplianceFramework.NYDFS]: ['500.2', '500.3', '500.4'],
      [ComplianceFramework.FISMA]: ['FISMA.1', 'FISMA.3'],
      [ComplianceFramework.ISO_27001]: ['A.5.1', 'A.5.2'],
      [ComplianceFramework.SOX]: ['SOX.302'],
      [ComplianceFramework.NIST_CMMC]: ['CA.2.157'],
      [ComplianceFramework.NIST_AI_RMF]: ['GOV.1', 'GOV.2'],
    }
  },
  {
    domain: 'Third-Party / Vendor Management',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.15'],
      [ComplianceFramework.HITRUST]: ['05.a', '05.b', '05.c', '05.d'],
      [ComplianceFramework.NIST_CSF]: ['GV.RO-01'],
      [ComplianceFramework.NIST_800_53]: ['SA-4', 'SA-9', 'PS-7'],
      [ComplianceFramework.HIPAA]: ['164.308(b)(1)'],
      [ComplianceFramework.SOC2]: ['CC9.2'],
      [ComplianceFramework.PCI_DSS]: ['PCI.12.8', 'PCI.12.9'],
      [ComplianceFramework.NYDFS]: ['500.11'],
      [ComplianceFramework.ISO_27001]: ['A.5.23'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
    }
  },
  {
    domain: 'Physical & Environmental Security',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.1'],
      [ComplianceFramework.HITRUST]: ['08.a', '08.b', '08.c', '08.d'],
      [ComplianceFramework.NIST_CSF]: ['PR.AC-01'],
      [ComplianceFramework.NIST_800_53]: ['PE-1', 'PE-2', 'PE-3', 'PE-6'],
      [ComplianceFramework.HIPAA]: ['164.310(a)(1)', '164.310(a)(2)'],
      [ComplianceFramework.SOC2]: ['CC6.4'],
      [ComplianceFramework.PCI_DSS]: ['PCI.9.1', 'PCI.9.2'],
      [ComplianceFramework.ISO_27001]: ['A.7.1'],
      [ComplianceFramework.CJIS]: ['CJIS.5.9.1'],
      [ComplianceFramework.SHIELD_ACT]: ['SHIELD.899-bb.2.b.iii'],
    }
  },
  {
    domain: 'Malware & Endpoint Protection',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.9', 'CIS.10'],
      [ComplianceFramework.HITRUST]: ['09.j', '09.k'],
      [ComplianceFramework.NIST_CSF]: ['DE.AE-01'],
      [ComplianceFramework.NIST_800_53]: ['SI-3', 'SC-18'],
      [ComplianceFramework.NIST_800_171]: ['3.14.2'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(5)(ii)(B)'],
      [ComplianceFramework.SOC2]: ['CC6.8'],
      [ComplianceFramework.PCI_DSS]: ['PCI.5.1', 'PCI.5.2', 'PCI.5.3'],
      [ComplianceFramework.ISO_27001]: ['A.8.1'],
      [ComplianceFramework.NIST_CMMC]: ['SI.1.210'],
    }
  },
  {
    domain: 'Change Management',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.2'],
      [ComplianceFramework.HITRUST]: ['10.h'],
      [ComplianceFramework.NIST_CSF]: ['PR.AC-01'],
      [ComplianceFramework.NIST_800_53]: ['CM-3', 'CM-4', 'CM-5'],
      [ComplianceFramework.SOC2]: ['CC8.1'],
      [ComplianceFramework.PCI_DSS]: ['PCI.6.4'],
      [ComplianceFramework.NYDFS]: ['500.8'],
      [ComplianceFramework.ISO_27001]: ['A.8.8'],
    }
  },
  {
    domain: 'Privacy & Data Subject Rights',
    controls: {
      [ComplianceFramework.CIS_CONTROLS]: ['CIS.3'],
      [ComplianceFramework.HITRUST]: ['13.a', '13.b', '13.c'],
      [ComplianceFramework.NIST_CSF]: ['GV.PO-01'],
      [ComplianceFramework.NIST_800_53]: ['AP-1', 'AP-2', 'IP-1', 'IP-2'],
      [ComplianceFramework.HIPAA]: ['164.524', '164.526'],
      [ComplianceFramework.GDPR]: ['Art.15', 'Art.16', 'Art.17', 'Art.20'],
      [ComplianceFramework.CCPA]: ['CCPA.1798.100', 'CCPA.1798.105', 'CCPA.1798.110'],
      [ComplianceFramework.CPRA]: ['CPRA.1798.100', 'CPRA.1798.105', 'CPRA.1798.106'],
      [ComplianceFramework.VCDPA]: ['VCDPA.4.1', 'VCDPA.4.2', 'VCDPA.4.5'],
      [ComplianceFramework.CPA_CO]: ['CPA.6-1-1304'],
      [ComplianceFramework.CTDPA]: ['CTDPA.6'],
      [ComplianceFramework.TEXAS_HB4]: ['TDPSA.541.101'],
      [ComplianceFramework.ISO_27701]: ['7.3.1', '7.4.1', '7.5.1'],
      [ComplianceFramework.FERPA]: ['FERPA.99.10', 'FERPA.99.20'],
      [ComplianceFramework.COPPA]: ['COPPA.312.3', 'COPPA.312.5'],
      [ComplianceFramework.NYDFS]: ['500.13'],
    }
  },
  {
    domain: 'AI Governance & Trustworthiness',
    controls: {
      [ComplianceFramework.NIST_AI_RMF]: ['GOV.1', 'GOV.2', 'GOV.3', 'GOV.4'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.6', 'Art.9', 'Art.14', 'Art.27'],
      [ComplianceFramework.EO_14110]: ['EO.4.1', 'EO.4.2', 'EO.9'],
      [ComplianceFramework.ISO_27001]: ['A.5.1'],
      [ComplianceFramework.NIST_800_53]: ['PL-1', 'PM-1'],
    }
  },
  {
    domain: 'AI Transparency & Explainability',
    controls: {
      [ComplianceFramework.NIST_AI_RMF]: ['MAP.1', 'MAP.2', 'MAP.5', 'MEASURE.2'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.13', 'Art.50', 'Art.53'],
      [ComplianceFramework.EO_14110]: ['EO.4.5'],
      [ComplianceFramework.CPRA]: ['CPRA.1798.185.15'],
      [ComplianceFramework.GDPR]: ['Art.15'],
    }
  },
  {
    domain: 'AI Safety & Testing',
    controls: {
      [ComplianceFramework.NIST_AI_RMF]: ['MEASURE.1', 'MEASURE.2', 'MEASURE.3', 'MANAGE.3'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.9', 'Art.15'],
      [ComplianceFramework.EO_14110]: ['EO.4.1', 'EO.4.2'],
    }
  },
  {
    domain: 'AI Data Governance',
    controls: {
      [ComplianceFramework.NIST_AI_RMF]: ['MAP.1', 'MAP.3'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.10', 'Art.11', 'Art.12'],
      [ComplianceFramework.EO_14110]: ['EO.8'],
      [ComplianceFramework.GDPR]: ['Art.32'],
      [ComplianceFramework.ISO_27701]: ['7.2.1', '7.2.2'],
    }
  },
  {
    domain: 'Data Protection Assessments',
    controls: {
      [ComplianceFramework.GDPR]: ['Art.35'],
      [ComplianceFramework.VCDPA]: ['VCDPA.5.4'],
      [ComplianceFramework.CPA_CO]: ['CPA.6-1-1308'],
      [ComplianceFramework.CTDPA]: ['CTDPA.10'],
      [ComplianceFramework.TEXAS_HB4]: ['TDPSA.541.107'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.27'],
      [ComplianceFramework.ISO_27701]: ['7.2.1'],
    }
  },
  {
    domain: 'Breach Notification',
    controls: {
      [ComplianceFramework.GDPR]: ['Art.33', 'Art.34'],
      [ComplianceFramework.HIPAA]: ['164.308(a)(6)'],
      [ComplianceFramework.NYDFS]: ['500.17'],
      [ComplianceFramework.SHIELD_ACT]: ['SHIELD.899-aa'],
      [ComplianceFramework.CCPA]: ['CCPA.1798.150'],
      [ComplianceFramework.GLBA]: ['GLBA.501'],
      [ComplianceFramework.CMIA]: ['CMIA.56.101'],
      [ComplianceFramework.CJIS]: ['CJIS.5.3.1'],
      [ComplianceFramework.PCI_DSS]: ['PCI.12.10'],
    }
  },
  {
    domain: 'Children & Student Privacy',
    controls: {
      [ComplianceFramework.COPPA]: ['COPPA.312.3', 'COPPA.312.4', 'COPPA.312.5', 'COPPA.312.8', 'COPPA.312.10'],
      [ComplianceFramework.FERPA]: ['FERPA.99.10', 'FERPA.99.20', 'FERPA.99.30', 'FERPA.99.31'],
      [ComplianceFramework.GDPR]: ['Art.17'],
      [ComplianceFramework.EU_AI_ACT]: ['Art.5'],
    }
  },
];

/**
 * Given a set of selected frameworks, return comparison data grouped by domain.
 */
export function compareFrameworksByDomain(
  frameworkIds: ComplianceFramework[]
): { domain: string; mappings: Record<string, string[]> }[] {
  return crossFrameworkMappings
    .map(mapping => {
      const filteredMappings: Record<string, string[]> = {};
      let hasData = false;
      for (const fwId of frameworkIds) {
        const controls = mapping.controls[fwId];
        if (controls && controls.length > 0) {
          filteredMappings[fwId] = controls;
          hasData = true;
        } else {
          filteredMappings[fwId] = [];
        }
      }
      return hasData ? { domain: mapping.domain, mappings: filteredMappings } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
