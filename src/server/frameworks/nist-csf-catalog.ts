import type { ControlRequirement } from '../types/framework.js';

export type NISTCSFFunction = 'GOVERN' | 'IDENTIFY' | 'PROTECT' | 'DETECT' | 'RESPOND' | 'RECOVER';

export interface NISTCSFSubcategory {
  id: string;
  function: NISTCSFFunction;
  category: string;
  outcome: string;
}

const sourceRows = [
  "GV.RR-01|GOVERN|GV.RR Roles, Responsibilities, and Authorities|Organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical, and continually improving",
  "GV.RR-02|GOVERN|GV.RR Roles, Responsibilities, and Authorities|Roles, responsibilities, and authorities related to cybersecurity risk management are established, communicated, understood, and enforced",
  "GV.RR-04|GOVERN|GV.RR Roles, Responsibilities, and Authorities|Cybersecurity is included in human resources practices",
  "GV.SC-01|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders",
  "GV.SC-02|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Cybersecurity roles and responsibilities for suppliers, customers, and partners are established, communicated, and coordinated internally and externally",
  "GV.SC-04|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Suppliers are known and prioritized by criticality",
  "GV.SC-05|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Requirements to address cybersecurity risks in supply chains are established, prioritized, and integrated into contracts and other types of agreements with suppliers and other relevant third parties",
  "GV.SC-08|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Relevant suppliers and other third parties are included in incident planning, response, and recovery activities",
  "ID.AM-01|IDENTIFY|ID.AM Asset Management|Inventories of hardware managed by the organization are maintained",
  "ID.AM-02|IDENTIFY|ID.AM Asset Management|Inventories of software, services, and systems managed by the organization are maintained",
  "ID.AM-03|IDENTIFY|ID.AM Asset Management|Representations of the organization's authorized network communication and internal and external network data flows are maintained",
  "ID.AM-04|IDENTIFY|ID.AM Asset Management|Inventories of services provided by suppliers are maintained",
  "ID.AM-05|IDENTIFY|ID.AM Asset Management|Assets are prioritized based on classification, criticality, resources, and impact on the mission",
  "ID.AM-07|IDENTIFY|ID.AM Asset Management|Inventories of data and corresponding metadata for designated data types are maintained",
  "ID.AM-08|IDENTIFY|ID.AM Asset Management|Systems, hardware, software, services, and data are managed throughout their life cycles",
  "ID.IM-02|IDENTIFY|ID.IM Improvement|Improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties",
  "ID.RA-01|IDENTIFY|ID.RA Risk Assessment|Vulnerabilities in assets are identified, validated, and recorded",
  "PR.AA-05|PROTECT|PR.AA Identity Management, Authentication, and Access Control|Access permissions, entitlements, and authorizations are defined in a policy, managed, enforced, and reviewed, and incorporate the principles of least privilege and separation of duties",
  "PR.AT-01|PROTECT|PR.AT Awareness and Training|Personnel are provided with awareness and training so that they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind",
  "PR.AT-02|PROTECT|PR.AT Awareness and Training|Individuals in specialized roles are provided with awareness and training so that they possess the knowledge and skills to perform relevant tasks with cybersecurity risks in mind",
  "PR.DS-01|PROTECT|PR.DS Data Security|The confidentiality, integrity, and availability of data-at-rest are protected",
  "PR.DS-02|PROTECT|PR.DS Data Security|The confidentiality, integrity, and availability of data-in-transit are protected",
  "PR.DS-11|PROTECT|PR.DS Data Security|Backups of data are created, protected, maintained, and tested",
  "PR.IR-01|PROTECT|PR.IR Technology Infrastructure Resilience|Networks and environments are protected from unauthorized logical access and usage",
  "PR.PS-01|PROTECT|PR.PS Platform Security|Configuration management practices are established and applied",
  "PR.PS-02|PROTECT|PR.PS Platform Security|Software is maintained, replaced, and removed commensurate with risk",
  "PR.PS-03|PROTECT|PR.PS Platform Security|Hardware is maintained, replaced, and removed commensurate with risk",
  "PR.PS-04|PROTECT|PR.PS Platform Security|Log records are generated and made available for continuous monitoring",
  "PR.PS-05|PROTECT|PR.PS Platform Security|Installation and execution of unauthorized software are prevented",
  "PR.PS-06|PROTECT|PR.PS Platform Security|Secure software development practices are integrated, and their performance is monitored throughout the software development life cycle",
  "DE.AE-02|DETECT|DE.AE Adverse Event Analysis|Potentially adverse events are analyzed to better understand associated activities",
  "DE.CM-01|DETECT|DE.CM Continuous Monitoring|Networks and network services are monitored to find potentially adverse events",
  "DE.CM-03|DETECT|DE.CM Continuous Monitoring|Personnel activity and technology usage are monitored to find potentially adverse events",
  "DE.CM-06|DETECT|DE.CM Continuous Monitoring|External service provider activities and services are monitored to find potentially adverse events",
  "DE.CM-09|DETECT|DE.CM Continuous Monitoring|Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events",
  "RS.AN-03|RESPOND|RS.AN Incident Analysis|Analysis is performed to establish what has taken place during an incident and the root cause of the incident",
  "RS.CO-02|RESPOND|RS.CO Incident Response Reporting and Communication|Internal and external stakeholders are notified of incidents",
  "RS.CO-03|RESPOND|RS.CO Incident Response Reporting and Communication|Information is shared with designated internal and external stakeholders",
  "RS.MA-01|RESPOND|RS.MA Incident Management|The incident response plan is executed in coordination with relevant third parties once an incident is declared",
  "RC.CO-04|RECOVER|RC.CO Incident Recovery Communication|Public updates on incident recovery are shared using approved methods and messaging",
  "RC.RP-03|RECOVER|RC.RP Incident Recovery Plan Execution|The integrity of backups and other restoration assets is verified before using them for restoration",
  "GV.OC-01|GOVERN|GV.OC Organizational Context|The organizational mission is understood and informs cybersecurity risk management",
  "GV.OC-02|GOVERN|GV.OC Organizational Context|Internal and external stakeholders are understood, and their needs and expectations regarding cybersecurity risk management are understood and considered",
  "GV.OC-03|GOVERN|GV.OC Organizational Context|Legal, regulatory, and contractual requirements regarding cybersecurity - including privacy and civil liberties obligations - are understood and managed",
  "GV.OC-04|GOVERN|GV.OC Organizational Context|Critical objectives, capabilities, and services that external stakeholders depend on or expect from the organization are understood and communicated",
  "GV.OC-05|GOVERN|GV.OC Organizational Context|Outcomes, capabilities, and services that the organization depends on are understood and communicated",
  "GV.RM-01|GOVERN|GV.RM Risk Management Strategy|Risk management objectives are established and agreed to by organizational stakeholders",
  "GV.RM-02|GOVERN|GV.RM Risk Management Strategy|Risk appetite and risk tolerance statements are established, communicated, and maintained",
  "GV.RM-03|GOVERN|GV.RM Risk Management Strategy|Cybersecurity risk management activities and outcomes are included in enterprise risk management processes",
  "GV.RM-04|GOVERN|GV.RM Risk Management Strategy|Strategic direction that describes appropriate risk response options is established and communicated",
  "GV.RM-05|GOVERN|GV.RM Risk Management Strategy|Lines of communication across the organization are established for cybersecurity risks, including risks from suppliers and other third parties",
  "GV.RM-06|GOVERN|GV.RM Risk Management Strategy|A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks is established and communicated",
  "GV.RM-07|GOVERN|GV.RM Risk Management Strategy|Strategic opportunities (i.e., positive risks) are characterized and are included in organizational cybersecurity risk discussions",
  "GV.RR-03|GOVERN|GV.RR Roles, Responsibilities, and Authorities|Adequate resources are allocated commensurate with the cybersecurity risk strategy, roles, responsibilities, and policies",
  "GV.PO-01|GOVERN|GV.PO Policy|Policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy, and priorities and is communicated and enforced",
  "GV.PO-02|GOVERN|GV.PO Policy|Policy for managing cybersecurity risks is reviewed, updated, communicated, and enforced to reflect changes in requirements, threats, technology, and organizational mission",
  "GV.OV-01|GOVERN|GV.OV Oversight|Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction",
  "GV.OV-02|GOVERN|GV.OV Oversight|The cybersecurity risk management strategy is reviewed and adjusted to ensure coverage of organizational requirements and risks",
  "GV.OV-03|GOVERN|GV.OV Oversight|Organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed",
  "GV.SC-03|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Cybersecurity supply chain risk management is integrated into cybersecurity and enterprise risk management, risk assessment, and improvement processes",
  "GV.SC-06|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Planning and due diligence are performed to reduce risks before entering into formal supplier or other third-party relationships",
  "GV.SC-07|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|The risks posed by a supplier, their products and services, and other third parties are understood, recorded, prioritized, assessed, responded to, and monitored over the course of the relationship",
  "GV.SC-09|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Supply chain security practices are integrated into cybersecurity and enterprise risk management programs, and their performance is monitored throughout the technology product and service life cycle",
  "GV.SC-10|GOVERN|GV.SC Cybersecurity Supply Chain Risk Management|Cybersecurity supply chain risk management plans include provisions for activities that occur after the conclusion of a partnership or service agreement",
  "ID.RA-02|IDENTIFY|ID.RA Risk Assessment|Cyber threat intelligence is received from information sharing forums and sources",
  "ID.RA-03|IDENTIFY|ID.RA Risk Assessment|Internal and external threats to the organization are identified and recorded",
  "ID.RA-04|IDENTIFY|ID.RA Risk Assessment|Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded",
  "ID.RA-05|IDENTIFY|ID.RA Risk Assessment|Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform risk response prioritization",
  "ID.RA-06|IDENTIFY|ID.RA Risk Assessment|Risk responses are chosen, prioritized, planned, tracked, and communicated",
  "ID.RA-07|IDENTIFY|ID.RA Risk Assessment|Changes and exceptions are managed, assessed for risk impact, recorded, and tracked",
  "ID.RA-08|IDENTIFY|ID.RA Risk Assessment|Processes for receiving, analyzing, and responding to vulnerability disclosures are established",
  "ID.RA-09|IDENTIFY|ID.RA Risk Assessment|The authenticity and integrity of hardware and software are assessed prior to acquisition and use",
  "ID.RA-10|IDENTIFY|ID.RA Risk Assessment|Critical suppliers are assessed prior to acquisition",
  "ID.IM-01|IDENTIFY|ID.IM Improvement|Improvements are identified from evaluations",
  "ID.IM-03|IDENTIFY|ID.IM Improvement|Improvements are identified from execution of operational processes, procedures, and activities",
  "ID.IM-04|IDENTIFY|ID.IM Improvement|Incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained, and improved",
  "PR.AA-01|PROTECT|PR.AA Identity Management, Authentication, and Access Control|Identities and credentials for authorized users, services, and hardware are managed by the organization",
  "PR.AA-02|PROTECT|PR.AA Identity Management, Authentication, and Access Control|Identities are proofed and bound to credentials based on the context of interactions",
  "PR.AA-03|PROTECT|PR.AA Identity Management, Authentication, and Access Control|Users, services, and hardware are authenticated",
  "PR.AA-04|PROTECT|PR.AA Identity Management, Authentication, and Access Control|Identity assertions are protected, conveyed, and verified",
  "PR.AA-06|PROTECT|PR.AA Identity Management, Authentication, and Access Control|Physical access to assets is managed, monitored, and enforced commensurate with risk",
  "PR.DS-10|PROTECT|PR.DS Data Security|The confidentiality, integrity, and availability of data-in-use are protected",
  "PR.IR-02|PROTECT|PR.IR Technology Infrastructure Resilience|The organization's technology assets are protected from environmental threats",
  "PR.IR-03|PROTECT|PR.IR Technology Infrastructure Resilience|Mechanisms are implemented to achieve resilience requirements in normal and adverse situations",
  "PR.IR-04|PROTECT|PR.IR Technology Infrastructure Resilience|Adequate resource capacity to ensure availability is maintained",
  "DE.CM-02|DETECT|DE.CM Continuous Monitoring|The physical environment is monitored to find potentially adverse events",
  "DE.AE-03|DETECT|DE.AE Adverse Event Analysis|Information is correlated from multiple sources",
  "DE.AE-04|DETECT|DE.AE Adverse Event Analysis|The estimated impact and scope of adverse events are understood",
  "DE.AE-06|DETECT|DE.AE Adverse Event Analysis|Information on adverse events is provided to authorized staff and tools",
  "DE.AE-07|DETECT|DE.AE Adverse Event Analysis|Cyber threat intelligence and other contextual information are integrated into the analysis",
  "DE.AE-08|DETECT|DE.AE Adverse Event Analysis|Incidents are declared when adverse events meet the defined incident criteria",
  "RS.MA-02|RESPOND|RS.MA Incident Management|Incident reports are triaged and validated",
  "RS.MA-03|RESPOND|RS.MA Incident Management|Incidents are categorized and prioritized",
  "RS.MA-04|RESPOND|RS.MA Incident Management|Incidents are escalated or elevated as needed",
  "RS.MA-05|RESPOND|RS.MA Incident Management|The criteria for initiating incident recovery are applied",
  "RS.AN-06|RESPOND|RS.AN Incident Analysis|Actions performed during an investigation are recorded, and the records' integrity and provenance are preserved",
  "RS.AN-07|RESPOND|RS.AN Incident Analysis|Incident data and metadata are collected, and their integrity and provenance are preserved",
  "RS.AN-08|RESPOND|RS.AN Incident Analysis|An incident's magnitude is estimated and validated",
  "RS.MI-01|RESPOND|RS.MI Incident Mitigation|Incidents are contained",
  "RS.MI-02|RESPOND|RS.MI Incident Mitigation|Incidents are eradicated",
  "RC.RP-01|RECOVER|RC.RP Incident Recovery Plan Execution|The recovery portion of the incident response plan is executed once initiated from the incident response process",
  "RC.RP-02|RECOVER|RC.RP Incident Recovery Plan Execution|Recovery actions are selected, scoped, prioritized, and performed",
  "RC.RP-04|RECOVER|RC.RP Incident Recovery Plan Execution|Critical mission functions and cybersecurity risk management are considered to establish post-incident operational norms",
  "RC.RP-05|RECOVER|RC.RP Incident Recovery Plan Execution|The integrity of restored assets is verified, systems and services are restored, and normal operating status is confirmed",
  "RC.RP-06|RECOVER|RC.RP Incident Recovery Plan Execution|The end of incident recovery is declared based on criteria, and incident-related documentation is completed",
  "RC.CO-03|RECOVER|RC.CO Incident Recovery Communication|Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders"
];

export const nistCSFSubcategories: readonly NISTCSFSubcategory[] = sourceRows.map(row => {
  const [id, functionId, category, outcome] = row.split('|');
  return { id, function: functionId as NISTCSFFunction, category, outcome };
});

const functionImplementation: Record<NISTCSFFunction, string> = {
  GOVERN: 'Establish governance practices that define organizational context, risk strategy, roles, policies, oversight, and supply-chain responsibilities. Assign accountable owners, approve decision authority and resources, communicate requirements, and review outcomes through the organization risk governance process.',
  IDENTIFY: 'Maintain current inventories and context for assets, data, services, suppliers, threats, vulnerabilities, and risk. Define owners and update triggers, assess changes and dependencies, prioritize risk responses, and record improvement actions in the organization risk process.',
  PROTECT: 'Implement safeguards appropriate to identified risk, including identity and access management, workforce training, data security, platform configuration, and infrastructure resilience. Apply controlled changes, least privilege, approved exceptions, and recurring effectiveness checks.',
  DETECT: 'Define monitored populations, telemetry requirements, event criteria, analysis responsibilities, and escalation paths. Collect and correlate relevant information, test detection and notification, review exceptions, and improve coverage based on operational results.',
  RESPOND: 'Maintain incident triage, analysis, communication, coordination, and mitigation procedures. Assign decision authority, preserve evidence and provenance, involve relevant internal and external parties, and track response actions and lessons learned.',
  RECOVER: 'Maintain recovery plans, activation criteria, roles, dependencies, and communications. Select and prioritize recovery actions, verify restoration assets and restored systems, obtain operational acceptance, and review results for improvement.'
};

const functionAssessment: Record<NISTCSFFunction, string> = {
  GOVERN: 'Review approved governance artifacts, role assignments, risk records, policies, supplier records, and management-review evidence. Sample recent decisions and verify that accountable stakeholders received and acted on them.',
  IDENTIFY: 'Inspect the relevant inventories, risk assessments, change records, and improvement logs. Sample representative assets, suppliers, risks, or changes; verify ownership, accuracy, prioritization, and follow-up against source evidence.',
  PROTECT: 'Inspect approved requirements and technical or procedural evidence. Sample representative identities, systems, data, training, or recovery mechanisms; test operation and exceptions and verify review results.',
  DETECT: 'Inspect source coverage, monitoring configuration, analytic records, and alert procedures. Generate or select an authorized test event, verify collection and analysis, and sample timely triage and escalation evidence.',
  RESPOND: 'Inspect the approved response process, roles, reporting paths, and incident records. Sample an exercise or actual incident to verify triage, evidence handling, communication decisions, coordination, mitigation, and corrective-action tracking.',
  RECOVER: 'Inspect approved recovery plans and objectives, backup/recovery evidence, and communications. Sample a restoration test or exercise and verify integrity checks, recovery decisions, operational acceptance, and follow-up actions.'
};

if (nistCSFSubcategories.length !== 106 || new Set(nistCSFSubcategories.map(item => item.id)).size !== 106) {
  throw new Error('NIST CSF 2.0 catalog must contain exactly 106 unique subcategories.');
}

export const nistCSFControls: Record<string, ControlRequirement> = Object.fromEntries(
  nistCSFSubcategories.map(({ id, function: functionId, category, outcome }) => [id, {
    id,
    title: outcome,
    category,
    description: outcome,
    implementation: functionImplementation[functionId],
    assessment: functionAssessment[functionId]
  }])
);
