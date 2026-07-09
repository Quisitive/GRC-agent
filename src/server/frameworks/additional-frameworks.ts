/**
 * Additional Compliance Frameworks
 * NIST 800-171, NYDFS, FedRAMP, FISMA, EU AI Act, NIST AI RMF,
 * ISO 27001, ISO 27701, State Privacy Laws, and Federal regulations
 */

import { FrameworkInfo, ControlRequirement, ComplianceFramework } from '../types/framework.js';

// ============================================================================
// NIST SP 800-171 - Protecting CUI in Nonfederal Systems
// ============================================================================
export const nist800171Framework: FrameworkInfo = {
  id: ComplianceFramework.NIST_800_171,
  name: 'NIST SP 800-171',
  version: 'Rev 3',
  description: 'Protecting Controlled Unclassified Information (CUI) in Nonfederal Systems and Organizations. Required for DoD contractors and organizations handling CUI.',
  organization: 'National Institute of Standards and Technology (NIST)',
  total_controls: 110,
  categories: ['Access Control', 'Awareness and Training', 'Audit and Accountability', 'Configuration Management', 'Identification and Authentication', 'Incident Response', 'Maintenance', 'Media Protection', 'Personnel Security', 'Physical Protection', 'Risk Assessment', 'Security Assessment', 'System and Communications Protection', 'System and Information Integrity'],
  url: 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-3/final'
};

export const nist800171Controls: Record<string, ControlRequirement> = {
  '3.1.1': { id: '3.1.1', title: 'Limit system access to authorized users', description: 'Limit system access to authorized users, processes acting on behalf of authorized users, and devices.', implementation: 'Implement access control mechanisms, user authentication, and device authorization.', assessment: 'Review access control policies and test enforcement mechanisms.', relatedControls: ['3.1.2', '3.1.3'] },
  '3.1.2': { id: '3.1.2', title: 'Limit system access to authorized functions', description: 'Limit system access to the types of transactions and functions that authorized users are permitted to execute.', implementation: 'Implement role-based access control, function-level authorization.', assessment: 'Review RBAC implementation and test function restrictions.', relatedControls: ['3.1.1'] },
  '3.1.3': { id: '3.1.3', title: 'Control CUI flow', description: 'Control the flow of CUI in accordance with approved authorizations.', implementation: 'Implement information flow controls, boundary protection, and data marking.', assessment: 'Review flow control policies and test boundary enforcement.', relatedControls: ['3.1.1', '3.13.1'] },
  '3.1.5': { id: '3.1.5', title: 'Employ least privilege', description: 'Employ the principle of least privilege, including for specific security functions and privileged accounts.', implementation: 'Implement least privilege, separate duties, limit privileged account use.', assessment: 'Review privilege assignments and test least privilege enforcement.', relatedControls: ['3.1.1', '3.1.2'] },
  '3.1.7': { id: '3.1.7', title: 'Prevent non-privileged users from executing privileged functions', description: 'Prevent non-privileged users from executing privileged functions and capture the execution of such functions in audit logs.', implementation: 'Implement privilege separation, audit privileged function execution.', assessment: 'Test privilege controls and review audit logs.', relatedControls: ['3.1.5', '3.3.1'] },
  '3.2.1': { id: '3.2.1', title: 'Security awareness training', description: 'Ensure that managers, systems administrators, and users of organizational systems are made aware of the security risks.', implementation: 'Develop and deliver security awareness training, track completion.', assessment: 'Review training records and test awareness levels.', relatedControls: ['3.2.2'] },
  '3.2.2': { id: '3.2.2', title: 'Role-based security training', description: 'Ensure that personnel are trained to carry out their assigned information security-related duties and responsibilities.', implementation: 'Provide role-specific training for security personnel and administrators.', assessment: 'Review training program and completion records.', relatedControls: ['3.2.1'] },
  '3.3.1': { id: '3.3.1', title: 'Create and retain audit records', description: 'Create and retain system audit logs and records to the extent needed to enable monitoring, analysis, investigation, and reporting.', implementation: 'Configure audit logging, establish retention policies, protect audit data.', assessment: 'Review audit configuration and retention compliance.', relatedControls: ['3.3.2', '3.3.5'] },
  '3.3.2': { id: '3.3.2', title: 'Ensure individual accountability', description: 'Ensure that the actions of individual system users can be uniquely traced to those users.', implementation: 'Implement individual user accounts, audit user actions.', assessment: 'Test traceability of user actions in audit logs.', relatedControls: ['3.3.1'] },
  '3.4.1': { id: '3.4.1', title: 'Establish configuration baselines', description: 'Establish and maintain baseline configurations and inventories of organizational systems.', implementation: 'Define baselines, maintain system inventory, track configuration changes.', assessment: 'Review baselines and compare against actual configurations.', relatedControls: ['3.4.2', '3.4.6'] },
  '3.4.2': { id: '3.4.2', title: 'Establish security configuration settings', description: 'Establish and enforce security configuration settings for IT products employed in organizational systems.', implementation: 'Apply security benchmarks, harden configurations, monitor for drift.', assessment: 'Scan configurations against benchmarks.', relatedControls: ['3.4.1'] },
  '3.5.1': { id: '3.5.1', title: 'Identify system users and processes', description: 'Identify system users, processes acting on behalf of users, and devices.', implementation: 'Implement user identification, service account management, device identification.', assessment: 'Review identification mechanisms and test enforcement.', relatedControls: ['3.5.2'] },
  '3.5.2': { id: '3.5.2', title: 'Authenticate users and devices', description: 'Authenticate the identities of users, processes, or devices as a prerequisite to allowing access.', implementation: 'Implement multi-factor authentication, certificate-based auth for devices.', assessment: 'Test authentication mechanisms and MFA enforcement.', relatedControls: ['3.5.1', '3.5.3'] },
  '3.6.1': { id: '3.6.1', title: 'Establish incident handling capability', description: 'Establish an operational incident-handling capability for organizational systems.', implementation: 'Develop IR plan, establish IR team, define procedures.', assessment: 'Review IR plan and test through exercises.', relatedControls: ['3.6.2'] },
  '3.6.2': { id: '3.6.2', title: 'Track and report incidents', description: 'Track, document, and report incidents to designated officials and/or authorities.', implementation: 'Implement incident tracking, establish reporting channels.', assessment: 'Review incident reports and tracking completeness.', relatedControls: ['3.6.1'] },
  '3.8.1': { id: '3.8.1', title: 'Protect system media', description: 'Protect system media containing CUI, both paper and digital.', implementation: 'Implement media protection, encryption, access controls on media.', assessment: 'Review media handling procedures and encryption.', relatedControls: ['3.8.2', '3.8.3'] },
  '3.11.1': { id: '3.11.1', title: 'Periodically assess risk', description: 'Periodically assess the risk to organizational operations, assets, and individuals.', implementation: 'Conduct regular risk assessments, document findings, track remediation.', assessment: 'Review risk assessment reports and remediation status.', relatedControls: ['3.11.2', '3.11.3'] },
  '3.12.1': { id: '3.12.1', title: 'Periodically assess security controls', description: 'Periodically assess the security controls to determine if controls are effective.', implementation: 'Conduct security assessments, penetration testing, control effectiveness reviews.', assessment: 'Review assessment reports and remediation plans.', relatedControls: ['3.12.2', '3.12.3'] },
  '3.13.1': { id: '3.13.1', title: 'Monitor communications at system boundaries', description: 'Monitor, control, and protect communications at external and key internal boundaries.', implementation: 'Deploy boundary protection, monitor traffic, implement firewalls.', assessment: 'Review boundary controls and monitoring configuration.', relatedControls: ['3.13.2', '3.13.5'] },
  '3.13.8': { id: '3.13.8', title: 'Implement cryptographic mechanisms', description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission.', implementation: 'Implement TLS, VPN, encrypted protocols for CUI transmission.', assessment: 'Review cryptographic implementations and key management.', relatedControls: ['3.13.1'] },
  '3.14.1': { id: '3.14.1', title: 'Identify and manage flaws', description: 'Identify, report, and correct system flaws in a timely manner.', implementation: 'Implement vulnerability management, patch management, flaw remediation.', assessment: 'Review vulnerability scan results and patching compliance.', relatedControls: ['3.14.2', '3.14.3'] },
  '3.14.2': { id: '3.14.2', title: 'Provide protection from malicious code', description: 'Provide protection from malicious code at designated locations within organizational systems.', implementation: 'Deploy antimalware, configure real-time scanning, update signatures.', assessment: 'Review antimalware deployment and effectiveness.', relatedControls: ['3.14.1', '3.14.4'] },
};

// ============================================================================
// NYDFS Cybersecurity Regulation (23 NYCRR 500)
// ============================================================================
export const nydfsFramework: FrameworkInfo = {
  id: ComplianceFramework.NYDFS,
  name: 'NYDFS Cybersecurity Regulation',
  version: '23 NYCRR 500 (2023 Amendment)',
  description: 'New York Department of Financial Services Cybersecurity Regulation requiring financial services companies to establish and maintain a cybersecurity program.',
  organization: 'New York Department of Financial Services',
  total_controls: 23,
  categories: ['Cybersecurity Program', 'Governance', 'Access Controls', 'Risk Assessment', 'Third-Party Security', 'Incident Response', 'Data Protection', 'Monitoring'],
  url: 'https://www.dfs.ny.gov/industry_guidance/cybersecurity'
};

export const nydfsControls: Record<string, ControlRequirement> = {
  '500.1': { id: '500.1', title: 'Definitions', description: 'Definitions for terms used throughout the regulation.', implementation: 'Understand and apply definitions consistently across compliance documentation.', assessment: 'Review organizational definitions against regulatory definitions.', relatedControls: [] },
  '500.2': { id: '500.2', title: 'Cybersecurity Program', description: 'Maintain a cybersecurity program designed to protect confidentiality, integrity, and availability of information systems.', implementation: 'Develop comprehensive cybersecurity program with policies, procedures, and controls.', assessment: 'Review cybersecurity program documentation and implementation.', relatedControls: ['500.3', '500.4'] },
  '500.3': { id: '500.3', title: 'Cybersecurity Policy', description: 'Implement and maintain a written cybersecurity policy approved by senior officer or board.', implementation: 'Develop cybersecurity policy covering all required areas, obtain board approval.', assessment: 'Review policy completeness, approval records, and review schedule.', relatedControls: ['500.2'] },
  '500.4': { id: '500.4', title: 'Chief Information Security Officer', description: 'Designate a qualified individual to serve as CISO.', implementation: 'Appoint CISO, define responsibilities, establish reporting to board.', assessment: 'Review CISO appointment, qualifications, and reporting structure.', relatedControls: ['500.2', '500.3'] },
  '500.5': { id: '500.5', title: 'Penetration Testing and Vulnerability Assessment', description: 'Conduct annual penetration testing and bi-annual vulnerability assessments.', implementation: 'Establish pen test program, conduct vulnerability assessments, remediate findings.', assessment: 'Review pen test reports, vulnerability scan results, and remediation.', relatedControls: ['500.2'] },
  '500.6': { id: '500.6', title: 'Audit Trail', description: 'Maintain audit trail systems to detect and respond to cybersecurity events.', implementation: 'Implement comprehensive logging, maintain records for required retention period.', assessment: 'Review audit trail configuration, retention compliance.', relatedControls: ['500.14'] },
  '500.7': { id: '500.7', title: 'Access Privileges and Management', description: 'Limit access privileges to information systems and periodically review access.', implementation: 'Implement least privilege, conduct periodic access reviews, remove unnecessary access.', assessment: 'Review access management procedures and periodic review records.', relatedControls: ['500.2'] },
  '500.8': { id: '500.8', title: 'Application Security', description: 'Written procedures for secure development practices for in-house applications.', implementation: 'Implement SDLC security, code reviews, application security testing.', assessment: 'Review SDLC procedures and security testing results.', relatedControls: ['500.5'] },
  '500.9': { id: '500.9', title: 'Risk Assessment', description: 'Conduct periodic risk assessments sufficient to inform cybersecurity program design.', implementation: 'Conduct regular risk assessments, document findings, update program based on results.', assessment: 'Review risk assessment methodology, findings, and program updates.', relatedControls: ['500.2', '500.3'] },
  '500.10': { id: '500.10', title: 'Cybersecurity Personnel and Intelligence', description: 'Employ qualified cybersecurity personnel and provide regular training.', implementation: 'Hire qualified staff, provide ongoing training, leverage threat intelligence.', assessment: 'Review staff qualifications, training records, and intelligence program.', relatedControls: ['500.4'] },
  '500.11': { id: '500.11', title: 'Third-Party Service Provider Security', description: 'Written policies for third-party service providers with access to information systems.', implementation: 'Develop third-party security policy, assess vendors, include security requirements in contracts.', assessment: 'Review third-party policies, assessments, and contract requirements.', relatedControls: ['500.2'] },
  '500.12': { id: '500.12', title: 'Multi-Factor Authentication', description: 'Implement MFA for accessing internal networks from external networks.', implementation: 'Deploy MFA for remote access, privileged accounts, and third-party access.', assessment: 'Review MFA deployment and test enforcement.', relatedControls: ['500.7'] },
  '500.13': { id: '500.13', title: 'Limitations on Data Retention', description: 'Develop policies for secure disposal of nonpublic information no longer necessary.', implementation: 'Implement data retention schedule, secure disposal procedures.', assessment: 'Review retention policies and disposal records.', relatedControls: ['500.15'] },
  '500.14': { id: '500.14', title: 'Training and Monitoring', description: 'Implement risk-based monitoring and provide regular cybersecurity awareness training.', implementation: 'Deploy monitoring tools, develop training program, track completion.', assessment: 'Review monitoring configuration and training records.', relatedControls: ['500.6', '500.10'] },
  '500.15': { id: '500.15', title: 'Encryption of Nonpublic Information', description: 'Encrypt nonpublic information in transit and at rest based on risk assessment.', implementation: 'Implement encryption for data at rest and in transit, manage keys.', assessment: 'Review encryption implementations and key management practices.', relatedControls: ['500.13'] },
  '500.16': { id: '500.16', title: 'Incident Response Plan', description: 'Establish a written incident response plan.', implementation: 'Develop IR plan, define roles, establish notification procedures, test annually.', assessment: 'Review IR plan completeness and test results.', relatedControls: ['500.17'] },
  '500.17': { id: '500.17', title: 'Notices to Superintendent', description: 'Notify the superintendent within 72 hours of a cybersecurity event.', implementation: 'Establish notification procedures, define triggering events, maintain contacts.', assessment: 'Review notification procedures and test response times.', relatedControls: ['500.16'] },
};

// ============================================================================
// FedRAMP (Federal Risk and Authorization Management Program)
// ============================================================================
export const fedrampFramework: FrameworkInfo = {
  id: ComplianceFramework.FEDRAMP,
  name: 'FedRAMP',
  version: 'Rev 5 Baselines',
  description: 'Federal Risk and Authorization Management Program providing a standardized approach for security assessment, authorization, and continuous monitoring for cloud products and services used by federal agencies.',
  organization: 'U.S. General Services Administration (GSA)',
  total_controls: 325,
  categories: ['Access Control', 'Audit & Accountability', 'Security Assessment', 'Configuration Management', 'Contingency Planning', 'Identification & Authentication', 'Incident Response', 'Maintenance', 'Media Protection', 'Physical & Environmental', 'Planning', 'Personnel Security', 'Risk Assessment', 'System & Services Acquisition', 'System & Communications Protection', 'System & Information Integrity'],
  url: 'https://www.fedramp.gov/'
};

export const fedrampControls: Record<string, ControlRequirement> = {
  'AC-1': { id: 'AC-1', title: 'Access Control Policy and Procedures', description: 'Develop, document, and disseminate access control policy and procedures.', implementation: 'Document access control policy, define procedures, review annually.', assessment: 'Review access control policy and procedures documentation.', relatedControls: ['AC-2', 'AC-3'] },
  'AC-2': { id: 'AC-2', title: 'Account Management', description: 'Manage system accounts including establishing, activating, modifying, reviewing, disabling, and removing accounts.', implementation: 'Implement account lifecycle management, periodic reviews, automated deactivation.', assessment: 'Review account management procedures and audit records.', relatedControls: ['AC-1', 'AC-3'] },
  'AU-2': { id: 'AU-2', title: 'Audit Events', description: 'Identify and select events to be audited, review and update audited event selection.', implementation: 'Define auditable events, configure logging, review annually.', assessment: 'Review audit event selection and logging configuration.', relatedControls: ['AU-3', 'AU-12'] },
  'CA-7': { id: 'CA-7', title: 'Continuous Monitoring', description: 'Develop a continuous monitoring strategy and implement continuous monitoring program.', implementation: 'Implement ConMon program, automate scanning, report monthly.', assessment: 'Review ConMon strategy and monthly reporting.', relatedControls: ['CA-2', 'RA-5'] },
  'CM-6': { id: 'CM-6', title: 'Configuration Settings', description: 'Establish and document configuration settings for IT products.', implementation: 'Define configuration baselines using STIG/CIS benchmarks, monitor compliance.', assessment: 'Review configuration baselines and compliance scan results.', relatedControls: ['CM-2', 'CM-7'] },
  'CP-9': { id: 'CP-9', title: 'System Backup', description: 'Conduct backups of user-level and system-level information.', implementation: 'Implement backup strategy, test restoration, protect backup media.', assessment: 'Review backup procedures and restoration test results.', relatedControls: ['CP-2', 'CP-10'] },
  'IA-2': { id: 'IA-2', title: 'Identification and Authentication', description: 'Uniquely identify and authenticate organizational users.', implementation: 'Implement user identification, MFA, PIV/CAC for privileged access.', assessment: 'Test identification and authentication mechanisms.', relatedControls: ['IA-5', 'AC-2'] },
  'IR-4': { id: 'IR-4', title: 'Incident Handling', description: 'Implement an incident handling capability for security incidents.', implementation: 'Establish incident handling procedures, define escalation paths.', assessment: 'Review incident handling procedures and test through exercises.', relatedControls: ['IR-5', 'IR-6'] },
  'RA-5': { id: 'RA-5', title: 'Vulnerability Monitoring and Scanning', description: 'Monitor and scan for vulnerabilities, remediate in accordance with risk assessment.', implementation: 'Deploy vulnerability scanners, scan monthly, remediate within timeframes.', assessment: 'Review scan results and remediation timelines.', relatedControls: ['CA-7', 'SI-2'] },
  'SC-7': { id: 'SC-7', title: 'Boundary Protection', description: 'Monitor and control communications at external and key internal managed interfaces.', implementation: 'Deploy firewalls, IDS/IPS, implement DMZ architecture.', assessment: 'Review boundary protection architecture and monitoring.', relatedControls: ['SC-8', 'AC-4'] },
  'SI-2': { id: 'SI-2', title: 'Flaw Remediation', description: 'Identify, report, and correct system flaws; install software patches within defined timeframes.', implementation: 'Implement patch management, remediate critical within 30 days.', assessment: 'Review patching compliance and remediation timelines.', relatedControls: ['RA-5', 'SI-3'] },
};

// ============================================================================
// FISMA (Federal Information Security Modernization Act)
// ============================================================================
export const fismaFramework: FrameworkInfo = {
  id: ComplianceFramework.FISMA,
  name: 'FISMA',
  version: '2014',
  description: 'Federal Information Security Modernization Act requiring federal agencies to develop, document, and implement information security programs.',
  organization: 'U.S. Congress / OMB / CISA',
  total_controls: 20,
  categories: ['Program Management', 'Risk Management', 'Continuous Monitoring', 'Incident Response', 'Security Authorization', 'Training'],
  url: 'https://www.cisa.gov/topics/cyber-threats-and-advisories/federal-information-security-modernization-act'
};

export const fismaControls: Record<string, ControlRequirement> = {
  'FISMA.1': { id: 'FISMA.1', title: 'Information Security Program', description: 'Develop, document, and implement an agency-wide information security program.', implementation: 'Create comprehensive ISP covering all FISMA requirements.', assessment: 'Review ISP documentation and implementation evidence.', relatedControls: ['FISMA.2'] },
  'FISMA.2': { id: 'FISMA.2', title: 'Risk Assessment', description: 'Conduct periodic assessments of risk and magnitude of harm from unauthorized access.', implementation: 'Perform annual risk assessments, categorize systems.', assessment: 'Review risk assessment reports and system categorizations.', relatedControls: ['FISMA.1', 'FISMA.3'] },
  'FISMA.3': { id: 'FISMA.3', title: 'Security Policies and Procedures', description: 'Develop and implement risk-based policies and procedures.', implementation: 'Document policies aligned with NIST framework, review annually.', assessment: 'Review policy currency and coverage.', relatedControls: ['FISMA.1'] },
  'FISMA.4': { id: 'FISMA.4', title: 'Security Plans', description: 'Develop and maintain security plans for systems.', implementation: 'Create System Security Plans for each system.', assessment: 'Review SSPs for completeness and accuracy.', relatedControls: ['FISMA.2'] },
  'FISMA.5': { id: 'FISMA.5', title: 'Security Awareness Training', description: 'Provide security awareness training to all personnel.', implementation: 'Implement annual security training, role-based training.', assessment: 'Review training completion rates.', relatedControls: ['FISMA.1'] },
  'FISMA.6': { id: 'FISMA.6', title: 'Incident Response', description: 'Develop and implement procedures for detecting, reporting, and responding to security incidents.', implementation: 'Establish incident response capability, report to US-CERT.', assessment: 'Review IR procedures and reporting compliance.', relatedControls: ['FISMA.1'] },
  'FISMA.7': { id: 'FISMA.7', title: 'Continuity of Operations', description: 'Plans and procedures for continuity of information system operations.', implementation: 'Develop contingency plans, test annually.', assessment: 'Review contingency plans and test results.', relatedControls: ['FISMA.4'] },
  'FISMA.8': { id: 'FISMA.8', title: 'Continuous Monitoring', description: 'Implement continuous monitoring of information security programs.', implementation: 'Deploy automated monitoring, report to OMB via CyberScope.', assessment: 'Review monitoring tools and reporting compliance.', relatedControls: ['FISMA.2'] },
};

// ============================================================================
// NIST AI Risk Management Framework (AI RMF)
// ============================================================================
export const nistAIRMFFramework: FrameworkInfo = {
  id: ComplianceFramework.NIST_AI_RMF,
  name: 'NIST AI Risk Management Framework',
  version: '1.0',
  description: 'Framework for managing risks associated with AI systems across their lifecycle, addressing trustworthiness, bias, transparency, and safety.',
  organization: 'National Institute of Standards and Technology (NIST)',
  total_controls: 72,
  categories: ['Govern', 'Map', 'Measure', 'Manage'],
  url: 'https://www.nist.gov/artificial-intelligence/ai-risk-management-framework'
};

export const nistAIRMFControls: Record<string, ControlRequirement> = {
  'GOV.1': { id: 'GOV.1', title: 'AI Governance Policies', description: 'Policies, processes, procedures, and practices across the organization related to the mapping, measuring, and managing of AI risks are in place.', implementation: 'Establish AI governance framework with clear policies for AI development and deployment.', assessment: 'Review AI governance documentation and organizational adoption.', relatedControls: ['GOV.2', 'GOV.3'] },
  'GOV.2': { id: 'GOV.2', title: 'AI Accountability', description: 'Accountability structures are in place so that the appropriate teams and individuals are empowered, responsible, and trained for mapping, measuring, and managing AI risks.', implementation: 'Define AI accountability roles, establish oversight committees.', assessment: 'Review accountability structures and training records.', relatedControls: ['GOV.1'] },
  'GOV.3': { id: 'GOV.3', title: 'AI Workforce Diversity', description: 'Workforce diversity, equity, inclusion, and accessibility processes are prioritized in the mapping, measuring, and managing of AI risks.', implementation: 'Implement DEIA practices in AI teams, ensure diverse perspectives in AI development.', assessment: 'Review DEIA metrics and practices in AI programs.', relatedControls: ['GOV.1'] },
  'GOV.4': { id: 'GOV.4', title: 'Organizational Context', description: 'Organizational teams are committed to a culture that considers and communicates AI risk.', implementation: 'Foster risk-aware AI culture, communicate AI risks across organization.', assessment: 'Review organizational AI risk culture and communication.', relatedControls: ['GOV.1'] },
  'MAP.1': { id: 'MAP.1', title: 'Context Establishment', description: 'Context is established and understood for AI system risk assessment.', implementation: 'Document AI system context, intended use, and deployment environment.', assessment: 'Review context documentation for completeness.', relatedControls: ['MAP.2', 'MAP.3'] },
  'MAP.2': { id: 'MAP.2', title: 'AI System Categorization', description: 'Categorization of the AI system is performed to determine potential impacts.', implementation: 'Categorize AI systems by risk level, document potential impacts.', assessment: 'Review categorization methodology and results.', relatedControls: ['MAP.1'] },
  'MAP.3': { id: 'MAP.3', title: 'Benefits and Costs Assessment', description: 'AI capabilities, targeted usage, goals, and expected benefits and costs are understood.', implementation: 'Document expected benefits, costs, and potential negative impacts.', assessment: 'Review benefit-cost documentation.', relatedControls: ['MAP.1'] },
  'MAP.5': { id: 'MAP.5', title: 'Impacts to Individuals and Communities', description: 'Likelihood and magnitude of each identified impact based on expected use and past uses of AI systems.', implementation: 'Assess potential impacts on individuals, communities, and ecosystems.', assessment: 'Review impact assessments and stakeholder engagement.', relatedControls: ['MAP.1', 'MAP.2'] },
  'MEASURE.1': { id: 'MEASURE.1', title: 'AI Risk Metrics', description: 'Appropriate methods and metrics are identified and applied for measuring AI risks.', implementation: 'Define AI risk metrics, implement measurement tools, track over time.', assessment: 'Review metrics selection and measurement methodology.', relatedControls: ['MEASURE.2'] },
  'MEASURE.2': { id: 'MEASURE.2', title: 'AI System Evaluation', description: 'AI systems are evaluated for trustworthy characteristics.', implementation: 'Test for bias, fairness, robustness, explainability, and safety.', assessment: 'Review evaluation results and testing methodology.', relatedControls: ['MEASURE.1', 'MEASURE.3'] },
  'MEASURE.3': { id: 'MEASURE.3', title: 'Mechanisms for Tracking Metrics', description: 'Mechanisms for tracking identified AI risks over time are in place.', implementation: 'Implement ongoing monitoring of AI risk metrics and drift detection.', assessment: 'Review monitoring systems and trend analysis.', relatedControls: ['MEASURE.1'] },
  'MANAGE.1': { id: 'MANAGE.1', title: 'AI Risk Prioritization', description: 'AI risks based on assessments and other analytical output are prioritized, responded to, and managed.', implementation: 'Prioritize identified risks, develop response plans, allocate resources.', assessment: 'Review risk prioritization and response plans.', relatedControls: ['MANAGE.2', 'MANAGE.3'] },
  'MANAGE.2': { id: 'MANAGE.2', title: 'AI Risk Treatment', description: 'Strategies to maximize AI benefits and minimize negative impacts are planned and implemented.', implementation: 'Implement risk mitigation strategies, document residual risks.', assessment: 'Review treatment strategies and effectiveness.', relatedControls: ['MANAGE.1'] },
  'MANAGE.3': { id: 'MANAGE.3', title: 'AI Risk Response', description: 'Pre-defined responses to AI risks are in place.', implementation: 'Define incident response for AI failures, establish rollback procedures.', assessment: 'Review response procedures and test through exercises.', relatedControls: ['MANAGE.1', 'MANAGE.4'] },
  'MANAGE.4': { id: 'MANAGE.4', title: 'AI System Decommissioning', description: 'Risk treatments, including response and recovery, are documented and monitored regularly.', implementation: 'Establish procedures for AI system retirement and safe decommissioning.', assessment: 'Review decommissioning procedures and historical records.', relatedControls: ['MANAGE.3'] },
};

// ============================================================================
// EU AI Act
// ============================================================================
export const euAIActFramework: FrameworkInfo = {
  id: ComplianceFramework.EU_AI_ACT,
  name: 'EU Artificial Intelligence Act',
  version: '2024',
  description: 'European Union regulation establishing harmonized rules for artificial intelligence, classifying AI systems by risk level and imposing requirements accordingly.',
  organization: 'European Union',
  total_controls: 85,
  categories: ['Prohibited Practices', 'High-Risk AI Systems', 'Transparency', 'General-Purpose AI', 'Governance', 'Fundamental Rights Impact Assessment'],
  url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj'
};

export const euAIActControls: Record<string, ControlRequirement> = {
  'Art.5': { id: 'Art.5', title: 'Prohibited AI Practices', description: 'AI systems that pose unacceptable risks are prohibited, including social scoring and real-time biometric identification in public spaces.', implementation: 'Ensure no AI systems deploy prohibited techniques. Conduct classification review.', assessment: 'Review AI system inventory against prohibited practices list.', relatedControls: ['Art.6'] },
  'Art.6': { id: 'Art.6', title: 'High-Risk AI Classification', description: 'Classification rules for high-risk AI systems based on intended purpose and deployment context.', implementation: 'Classify all AI systems per Annex III criteria, document classification decisions.', assessment: 'Review classification methodology and decisions.', relatedControls: ['Art.5', 'Art.9'] },
  'Art.9': { id: 'Art.9', title: 'Risk Management System', description: 'High-risk AI systems require a risk management system throughout the lifecycle.', implementation: 'Implement continuous risk management for high-risk AI, including testing and monitoring.', assessment: 'Review risk management system documentation and effectiveness.', relatedControls: ['Art.6', 'Art.10'] },
  'Art.10': { id: 'Art.10', title: 'Data Governance', description: 'Training, validation, and testing data shall be subject to appropriate data governance practices.', implementation: 'Implement data governance for AI training data, ensure representativeness and quality.', assessment: 'Review data governance practices and data quality metrics.', relatedControls: ['Art.9'] },
  'Art.11': { id: 'Art.11', title: 'Technical Documentation', description: 'Technical documentation shall be drawn up before high-risk AI systems are placed on the market.', implementation: 'Create comprehensive technical documentation per Annex IV requirements.', assessment: 'Review technical documentation completeness.', relatedControls: ['Art.9'] },
  'Art.12': { id: 'Art.12', title: 'Record-Keeping', description: 'High-risk AI systems shall technically allow for automatic recording of events (logs).', implementation: 'Implement logging capability for AI system operations and decisions.', assessment: 'Review logging implementation and retention.', relatedControls: ['Art.11'] },
  'Art.13': { id: 'Art.13', title: 'Transparency and Provision of Information', description: 'High-risk AI systems shall be designed and developed to ensure sufficient transparency.', implementation: 'Provide clear documentation of AI capabilities, limitations, and intended use.', assessment: 'Review transparency documentation and user information.', relatedControls: ['Art.50'] },
  'Art.14': { id: 'Art.14', title: 'Human Oversight', description: 'High-risk AI systems shall be designed to allow effective human oversight.', implementation: 'Implement human-in-the-loop or human-on-the-loop mechanisms.', assessment: 'Review human oversight mechanisms and effectiveness.', relatedControls: ['Art.9'] },
  'Art.15': { id: 'Art.15', title: 'Accuracy, Robustness, and Cybersecurity', description: 'High-risk AI systems shall achieve appropriate levels of accuracy, robustness, and cybersecurity.', implementation: 'Test and validate AI accuracy, implement robustness measures, secure AI systems.', assessment: 'Review accuracy metrics, robustness testing, and security controls.', relatedControls: ['Art.9'] },
  'Art.27': { id: 'Art.27', title: 'Fundamental Rights Impact Assessment', description: 'Deployers of high-risk AI shall perform a fundamental rights impact assessment.', implementation: 'Conduct FRIA before deployment, document impacts on fundamental rights.', assessment: 'Review FRIA documentation and mitigation measures.', relatedControls: ['Art.6'] },
  'Art.50': { id: 'Art.50', title: 'Transparency for General-Purpose AI', description: 'Providers of AI systems intended to directly interact with natural persons shall ensure transparency.', implementation: 'Notify users they are interacting with AI, mark AI-generated content.', assessment: 'Review notification mechanisms and content marking.', relatedControls: ['Art.13'] },
  'Art.53': { id: 'Art.53', title: 'GPAI Model Obligations', description: 'General-purpose AI model providers shall comply with transparency and documentation obligations.', implementation: 'Document model capabilities, training data summaries, provide technical documentation.', assessment: 'Review GPAI model documentation and compliance.', relatedControls: ['Art.50'] },
};

// ============================================================================
// ISO 27001
// ============================================================================
export const iso27001Framework: FrameworkInfo = {
  id: ComplianceFramework.ISO_27001,
  name: 'ISO/IEC 27001',
  version: '2022',
  description: 'International standard for information security management systems (ISMS), providing requirements for establishing, implementing, maintaining, and continually improving an ISMS.',
  organization: 'International Organization for Standardization (ISO)',
  total_controls: 93,
  categories: ['Organizational Controls', 'People Controls', 'Physical Controls', 'Technological Controls'],
  url: 'https://www.iso.org/standard/27001'
};

export const iso27001Controls: Record<string, ControlRequirement> = {
  'A.5.1': { id: 'A.5.1', title: 'Policies for Information Security', description: 'A set of policies for information security shall be defined, approved by management, published, and communicated.', implementation: 'Develop information security policies, obtain management approval, distribute.', assessment: 'Review policy documentation, approval records, and distribution.', relatedControls: ['A.5.2'] },
  'A.5.2': { id: 'A.5.2', title: 'Information Security Roles', description: 'Information security roles and responsibilities shall be defined and allocated.', implementation: 'Define security roles, assign responsibilities, document in job descriptions.', assessment: 'Review role definitions and assignments.', relatedControls: ['A.5.1'] },
  'A.5.23': { id: 'A.5.23', title: 'Information Security for Cloud Services', description: 'Processes for acquisition, use, management, and exit from cloud services shall be established.', implementation: 'Define cloud security requirements, assess providers, monitor compliance.', assessment: 'Review cloud security policies and provider assessments.', relatedControls: ['A.5.21'] },
  'A.6.1': { id: 'A.6.1', title: 'Screening', description: 'Background verification checks on candidates shall be carried out.', implementation: 'Implement pre-employment screening, ongoing verification as required.', assessment: 'Review screening procedures and records.', relatedControls: ['A.6.2'] },
  'A.7.1': { id: 'A.7.1', title: 'Physical Security Perimeters', description: 'Security perimeters shall be defined and used to protect areas containing information.', implementation: 'Define physical security zones, implement access controls.', assessment: 'Review physical security perimeter documentation.', relatedControls: ['A.7.2'] },
  'A.8.1': { id: 'A.8.1', title: 'User Endpoint Devices', description: 'Information stored on, processed by, or accessible via user endpoint devices shall be protected.', implementation: 'Implement endpoint protection, encryption, and MDM.', assessment: 'Review endpoint security configuration.', relatedControls: ['A.8.2'] },
  'A.8.5': { id: 'A.8.5', title: 'Secure Authentication', description: 'Secure authentication technologies and procedures shall be established.', implementation: 'Implement MFA, strong password policies, certificate-based auth.', assessment: 'Review authentication mechanisms and policies.', relatedControls: ['A.8.1'] },
  'A.8.8': { id: 'A.8.8', title: 'Management of Technical Vulnerabilities', description: 'Information about technical vulnerabilities shall be obtained, exposure evaluated, and appropriate measures taken.', implementation: 'Implement vulnerability management program, scan regularly, patch promptly.', assessment: 'Review vulnerability management process and compliance.', relatedControls: ['A.8.9'] },
  'A.8.15': { id: 'A.8.15', title: 'Logging', description: 'Logs that record activities, exceptions, faults, and other relevant events shall be produced, stored, protected, and analyzed.', implementation: 'Implement centralized logging, protect log integrity, regular analysis.', assessment: 'Review logging configuration and analysis procedures.', relatedControls: ['A.8.16'] },
  'A.8.16': { id: 'A.8.16', title: 'Monitoring Activities', description: 'Networks, systems, and applications shall be monitored for anomalous behavior.', implementation: 'Deploy SIEM, configure alerting, establish monitoring procedures.', assessment: 'Review monitoring tools and alert handling.', relatedControls: ['A.8.15'] },
  'A.8.24': { id: 'A.8.24', title: 'Use of Cryptography', description: 'Rules for the effective use of cryptography, including key management, shall be defined and implemented.', implementation: 'Define cryptographic policy, implement encryption, manage keys.', assessment: 'Review cryptographic implementations and key management.', relatedControls: ['A.8.15'] },
};

// ============================================================================
// ISO 27701 (Privacy Information Management)
// ============================================================================
export const iso27701Framework: FrameworkInfo = {
  id: ComplianceFramework.ISO_27701,
  name: 'ISO/IEC 27701',
  version: '2019',
  description: 'Extension to ISO 27001 for privacy information management (PIMS), providing guidance for PII controllers and processors.',
  organization: 'International Organization for Standardization (ISO)',
  total_controls: 49,
  categories: ['PIMS-specific Requirements', 'PII Controllers', 'PII Processors', 'Privacy Governance'],
  url: 'https://www.iso.org/standard/71670.html'
};

export const iso27701Controls: Record<string, ControlRequirement> = {
  '7.2.1': { id: '7.2.1', title: 'Identify and Document Purpose', description: 'Identify and document the specific purposes for which PII will be processed.', implementation: 'Document processing purposes, maintain records of processing activities.', assessment: 'Review purpose documentation and ROPA.', relatedControls: ['7.2.2'] },
  '7.2.2': { id: '7.2.2', title: 'Identify Lawful Basis', description: 'Determine, document, and comply with the relevant lawful basis for processing PII.', implementation: 'Identify legal basis for each processing activity, document justifications.', assessment: 'Review lawful basis documentation.', relatedControls: ['7.2.1'] },
  '7.3.1': { id: '7.3.1', title: 'Determine Obligations to PII Principals', description: 'Determine and fulfill obligations to PII principals (data subjects).', implementation: 'Identify and implement data subject rights, provide mechanisms for exercising rights.', assessment: 'Review data subject rights implementation.', relatedControls: ['7.3.2'] },
  '7.4.1': { id: '7.4.1', title: 'Limit Collection', description: 'Limit collection of PII to what is adequate, relevant, and necessary.', implementation: 'Implement data minimization, review collection practices.', assessment: 'Review data collection against stated purposes.', relatedControls: ['7.4.2'] },
  '7.5.1': { id: '7.5.1', title: 'PII De-identification and Deletion', description: 'Mechanisms shall exist to de-identify and delete PII.', implementation: 'Implement anonymization/pseudonymization, secure deletion procedures.', assessment: 'Review de-identification methods and deletion procedures.', relatedControls: ['7.4.1'] },
};

// ============================================================================
// CPRA (California Privacy Rights Act - successor to CCPA)
// ============================================================================
export const cpraFramework: FrameworkInfo = {
  id: ComplianceFramework.CPRA,
  name: 'California Privacy Rights Act',
  version: 'CPRA 2023',
  description: 'Amends and expands the CCPA, establishing the California Privacy Protection Agency and introducing new consumer rights for personal information.',
  organization: 'State of California',
  total_controls: 18,
  categories: ['Consumer Rights', 'Business Obligations', 'Sensitive Personal Information', 'Automated Decision-Making', 'Data Minimization'],
  url: 'https://cppa.ca.gov/'
};

export const cpraControls: Record<string, ControlRequirement> = {
  'CPRA.1798.100': { id: 'CPRA.1798.100', title: 'Right to Know/Access', description: 'Consumers have the right to know what personal information is collected, used, shared, or sold.', implementation: 'Implement data inventory, provide access request mechanisms.', assessment: 'Review access request processes and response times.', relatedControls: ['CPRA.1798.105'] },
  'CPRA.1798.105': { id: 'CPRA.1798.105', title: 'Right to Delete', description: 'Consumers have the right to request deletion of their personal information.', implementation: 'Implement deletion request handling, notify service providers.', assessment: 'Review deletion procedures and compliance.', relatedControls: ['CPRA.1798.100'] },
  'CPRA.1798.106': { id: 'CPRA.1798.106', title: 'Right to Correct', description: 'Consumers have the right to request correction of inaccurate personal information.', implementation: 'Implement correction request mechanisms and verification.', assessment: 'Review correction procedures.', relatedControls: ['CPRA.1798.100'] },
  'CPRA.1798.121': { id: 'CPRA.1798.121', title: 'Right to Opt-Out of Sharing', description: 'Consumers have the right to opt-out of sharing personal information for cross-context behavioral advertising.', implementation: 'Implement opt-out mechanisms, honor Global Privacy Control signals.', assessment: 'Review opt-out implementation and GPC compliance.', relatedControls: ['CPRA.1798.135'] },
  'CPRA.1798.185.15': { id: 'CPRA.1798.185.15', title: 'Automated Decision-Making', description: 'Consumers have the right to opt out of automated decision-making technology.', implementation: 'Identify automated decisions, provide opt-out, enable human review.', assessment: 'Review automated decision inventory and opt-out mechanisms.', relatedControls: ['CPRA.1798.100'] },
};

// ============================================================================
// Virginia Consumer Data Protection Act (VCDPA)
// ============================================================================
export const vcdpaFramework: FrameworkInfo = {
  id: ComplianceFramework.VCDPA,
  name: 'Virginia Consumer Data Protection Act',
  version: '2023',
  description: 'Virginia comprehensive consumer data privacy law requiring data protection assessments and consumer rights.',
  organization: 'Commonwealth of Virginia',
  total_controls: 12,
  categories: ['Consumer Rights', 'Controller Obligations', 'Data Protection Assessments', 'Processor Requirements'],
  url: 'https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/'
};

export const vcdpaControls: Record<string, ControlRequirement> = {
  'VCDPA.4.1': { id: 'VCDPA.4.1', title: 'Right to Access', description: 'Consumers have the right to confirm and access their personal data.', implementation: 'Implement access request mechanisms, verify identity, respond within 45 days.', assessment: 'Review access request processes.', relatedControls: ['VCDPA.4.2'] },
  'VCDPA.4.2': { id: 'VCDPA.4.2', title: 'Right to Delete', description: 'Consumers have the right to delete personal data provided by or obtained about them.', implementation: 'Implement deletion procedures, comply within 45 days.', assessment: 'Review deletion compliance.', relatedControls: ['VCDPA.4.1'] },
  'VCDPA.4.5': { id: 'VCDPA.4.5', title: 'Right to Opt Out', description: 'Consumers have the right to opt out of targeted advertising, sale, or profiling.', implementation: 'Provide opt-out mechanisms for targeted advertising and profiling.', assessment: 'Review opt-out implementation.', relatedControls: ['VCDPA.4.1'] },
  'VCDPA.5.4': { id: 'VCDPA.5.4', title: 'Data Protection Assessment', description: 'Controllers must conduct and document data protection assessments for high-risk processing.', implementation: 'Conduct DPAs for targeted advertising, profiling, sensitive data, and sale of data.', assessment: 'Review DPA documentation and methodology.', relatedControls: ['VCDPA.4.5'] },
};

// ============================================================================
// Colorado Privacy Act
// ============================================================================
export const cpaCoFramework: FrameworkInfo = {
  id: ComplianceFramework.CPA_CO,
  name: 'Colorado Privacy Act',
  version: '2023',
  description: 'Colorado comprehensive privacy law providing consumer rights and requiring data protection assessments.',
  organization: 'State of Colorado',
  total_controls: 11,
  categories: ['Consumer Rights', 'Controller Duties', 'Data Protection Assessments', 'Universal Opt-Out'],
  url: 'https://coag.gov/resources/colorado-privacy-act/'
};

export const cpaCoControls: Record<string, ControlRequirement> = {
  'CPA.6-1-1304': { id: 'CPA.6-1-1304', title: 'Consumer Rights', description: 'Rights to access, correct, delete, obtain copy, and opt out.', implementation: 'Implement all consumer rights mechanisms, respond within 45 days.', assessment: 'Review rights implementation and response times.', relatedControls: ['CPA.6-1-1309'] },
  'CPA.6-1-1308': { id: 'CPA.6-1-1308', title: 'Data Protection Assessment', description: 'Controllers must conduct DPAs for processing that presents heightened risk.', implementation: 'Conduct DPAs, document findings, submit to AG upon request.', assessment: 'Review DPA documentation.', relatedControls: ['CPA.6-1-1304'] },
  'CPA.6-1-1309': { id: 'CPA.6-1-1309', title: 'Universal Opt-Out Mechanism', description: 'Controllers must recognize universal opt-out mechanisms.', implementation: 'Implement GPC signal recognition, honor opt-out preferences.', assessment: 'Test GPC compliance.', relatedControls: ['CPA.6-1-1304'] },
};

// ============================================================================
// Connecticut Data Privacy Act (CTDPA)
// ============================================================================
export const ctdpaFramework: FrameworkInfo = {
  id: ComplianceFramework.CTDPA,
  name: 'Connecticut Data Privacy Act',
  version: '2023',
  description: 'Connecticut comprehensive privacy law providing consumer data rights and controller obligations.',
  organization: 'State of Connecticut',
  total_controls: 10,
  categories: ['Consumer Rights', 'Controller Obligations', 'Consent', 'Data Protection Assessments'],
  url: 'https://portal.ct.gov/AG/Sections/Privacy/The-Connecticut-Data-Privacy-Act'
};

export const ctdpaControls: Record<string, ControlRequirement> = {
  'CTDPA.6': { id: 'CTDPA.6', title: 'Consumer Rights', description: 'Rights to access, correct, delete, portability, and opt-out.', implementation: 'Implement consumer rights mechanisms, respond within 45 days.', assessment: 'Review rights implementation.', relatedControls: ['CTDPA.10'] },
  'CTDPA.10': { id: 'CTDPA.10', title: 'Data Protection Assessment', description: 'Controllers must conduct and document data protection assessments.', implementation: 'Conduct DPAs for targeted advertising, profiling, sensitive data.', assessment: 'Review DPA documentation.', relatedControls: ['CTDPA.6'] },
};

// ============================================================================
// NY SHIELD Act
// ============================================================================
export const shieldActFramework: FrameworkInfo = {
  id: ComplianceFramework.SHIELD_ACT,
  name: 'NY SHIELD Act',
  version: '2020',
  description: 'Stop Hacks and Improve Electronic Data Security Act - New York state law requiring reasonable safeguards for private information of NY residents.',
  organization: 'State of New York',
  total_controls: 8,
  categories: ['Administrative Safeguards', 'Technical Safeguards', 'Physical Safeguards', 'Breach Notification'],
  url: 'https://ag.ny.gov/internet/data-breach'
};

export const shieldActControls: Record<string, ControlRequirement> = {
  'SHIELD.899-bb.2.b.i': { id: 'SHIELD.899-bb.2.b.i', title: 'Administrative Safeguards', description: 'Designate employee(s) to coordinate security program, identify risks, assess safeguards, train employees.', implementation: 'Designate security coordinator, conduct risk assessments, implement training.', assessment: 'Review security program documentation and training records.', relatedControls: ['SHIELD.899-bb.2.b.ii'] },
  'SHIELD.899-bb.2.b.ii': { id: 'SHIELD.899-bb.2.b.ii', title: 'Technical Safeguards', description: 'Assess risks in network and software design, detect and respond to attacks, test security controls.', implementation: 'Implement network security, vulnerability testing, intrusion detection.', assessment: 'Review technical security controls and testing results.', relatedControls: ['SHIELD.899-bb.2.b.i'] },
  'SHIELD.899-bb.2.b.iii': { id: 'SHIELD.899-bb.2.b.iii', title: 'Physical Safeguards', description: 'Assess risks of information storage and disposal, detect and prevent intrusions, protect against unauthorized access.', implementation: 'Implement physical access controls, secure disposal, intrusion detection.', assessment: 'Review physical security controls.', relatedControls: ['SHIELD.899-bb.2.b.i'] },
  'SHIELD.899-aa': { id: 'SHIELD.899-aa', title: 'Breach Notification', description: 'Notify affected NY residents and AG of breaches involving private information.', implementation: 'Establish breach notification procedures, define timelines, maintain contacts.', assessment: 'Review notification procedures and test response.', relatedControls: ['SHIELD.899-bb.2.b.i'] },
};

// ============================================================================
// EO 14110 (Executive Order on Safe, Secure, and Trustworthy AI)
// ============================================================================
export const eo14110Framework: FrameworkInfo = {
  id: ComplianceFramework.EO_14110,
  name: 'Executive Order 14110 - AI Safety',
  version: '2023',
  description: 'Presidential Executive Order on the Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence, establishing requirements for AI safety and security.',
  organization: 'Executive Office of the President',
  total_controls: 15,
  categories: ['AI Safety', 'AI Security', 'Privacy', 'Equity', 'Consumer Protection', 'Workforce', 'Innovation', 'Government Use'],
  url: 'https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/'
};

export const eo14110Controls: Record<string, ControlRequirement> = {
  'EO.4.1': { id: 'EO.4.1', title: 'Dual-Use Foundation Model Reporting', description: 'Companies developing dual-use foundation models must report to the federal government.', implementation: 'Report model development activities, red-team testing results to government.', assessment: 'Review reporting compliance and documentation.', relatedControls: ['EO.4.2'] },
  'EO.4.2': { id: 'EO.4.2', title: 'AI Red-Teaming Standards', description: 'Establish standards and best practices for AI red-teaming and safety testing.', implementation: 'Implement AI red-teaming program aligned with NIST guidelines.', assessment: 'Review red-teaming methodology and results.', relatedControls: ['EO.4.1'] },
  'EO.4.5': { id: 'EO.4.5', title: 'AI Content Authentication', description: 'Develop standards for content authentication and watermarking of AI-generated content.', implementation: 'Implement content provenance, watermarking for AI-generated content.', assessment: 'Review content authentication mechanisms.', relatedControls: ['EO.4.1'] },
  'EO.8': { id: 'EO.8', title: 'Privacy-Preserving Techniques', description: 'Advance privacy-preserving techniques including differential privacy and federated learning.', implementation: 'Evaluate and implement privacy-preserving AI techniques.', assessment: 'Review privacy techniques in AI systems.', relatedControls: ['EO.4.1'] },
  'EO.9': { id: 'EO.9', title: 'AI Equity and Civil Rights', description: 'Address algorithmic discrimination and advance equity in AI deployment.', implementation: 'Test for bias, implement fairness measures, conduct equity assessments.', assessment: 'Review bias testing results and equity assessments.', relatedControls: ['EO.4.2'] },
};

// ============================================================================
// FERPA (Family Educational Rights and Privacy Act)
// ============================================================================
export const ferpaFramework: FrameworkInfo = {
  id: ComplianceFramework.FERPA,
  name: 'FERPA',
  version: '20 U.S.C. § 1232g',
  description: 'Federal law protecting the privacy of student education records, applicable to educational institutions receiving federal funding.',
  organization: 'U.S. Department of Education',
  total_controls: 8,
  categories: ['Access Rights', 'Consent', 'Directory Information', 'Disclosure Exceptions', 'Record Amendment'],
  url: 'https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html'
};

export const ferpaControls: Record<string, ControlRequirement> = {
  'FERPA.99.10': { id: 'FERPA.99.10', title: 'Right to Inspect Records', description: 'Parents/students have the right to inspect and review education records.', implementation: 'Provide access mechanisms, respond within 45 days of request.', assessment: 'Review access request procedures.', relatedControls: ['FERPA.99.20'] },
  'FERPA.99.20': { id: 'FERPA.99.20', title: 'Right to Amend Records', description: 'Right to request amendment of inaccurate or misleading records.', implementation: 'Implement amendment request process, provide hearing if denied.', assessment: 'Review amendment procedures.', relatedControls: ['FERPA.99.10'] },
  'FERPA.99.30': { id: 'FERPA.99.30', title: 'Consent for Disclosure', description: 'Written consent required before disclosing personally identifiable information.', implementation: 'Obtain consent before disclosure, document consent records.', assessment: 'Review consent procedures and records.', relatedControls: ['FERPA.99.31'] },
  'FERPA.99.31': { id: 'FERPA.99.31', title: 'Disclosure Exceptions', description: 'Permitted disclosures without consent (school officials, health/safety, etc.).', implementation: 'Document exception criteria, train staff on permitted disclosures.', assessment: 'Review disclosure records and exception application.', relatedControls: ['FERPA.99.30'] },
};

// ============================================================================
// COPPA (Children's Online Privacy Protection Act)
// ============================================================================
export const coppaFramework: FrameworkInfo = {
  id: ComplianceFramework.COPPA,
  name: 'COPPA',
  version: '16 CFR Part 312',
  description: 'Federal law protecting the online privacy of children under 13, requiring verifiable parental consent for data collection.',
  organization: 'Federal Trade Commission (FTC)',
  total_controls: 10,
  categories: ['Notice', 'Parental Consent', 'Data Collection Limits', 'Data Security', 'Data Retention'],
  url: 'https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa'
};

export const coppaControls: Record<string, ControlRequirement> = {
  'COPPA.312.3': { id: 'COPPA.312.3', title: 'Prohibition Against Collection', description: 'Operators may not collect personal information from children without parental consent.', implementation: 'Implement age verification, obtain verifiable parental consent.', assessment: 'Review age verification and consent mechanisms.', relatedControls: ['COPPA.312.4'] },
  'COPPA.312.4': { id: 'COPPA.312.4', title: 'Notice Requirements', description: 'Operators must provide clear and comprehensive notice of data practices.', implementation: 'Post privacy notice, provide direct notice to parents.', assessment: 'Review notice content and delivery mechanisms.', relatedControls: ['COPPA.312.3'] },
  'COPPA.312.5': { id: 'COPPA.312.5', title: 'Parental Consent', description: 'Obtain verifiable parental consent before collecting children\'s personal information.', implementation: 'Implement consent verification methods (signed form, credit card, video).', assessment: 'Review consent mechanisms and records.', relatedControls: ['COPPA.312.3'] },
  'COPPA.312.8': { id: 'COPPA.312.8', title: 'Confidentiality and Security', description: 'Maintain confidentiality, security, and integrity of children\'s personal information.', implementation: 'Implement security measures appropriate to sensitivity of children\'s data.', assessment: 'Review security controls for children\'s data.', relatedControls: ['COPPA.312.10'] },
  'COPPA.312.10': { id: 'COPPA.312.10', title: 'Data Retention and Deletion', description: 'Retain personal information only as long as necessary and delete when no longer needed.', implementation: 'Implement retention limits, secure deletion for children\'s data.', assessment: 'Review retention practices and deletion procedures.', relatedControls: ['COPPA.312.8'] },
};

// ============================================================================
// Texas HB 4 (Texas Data Privacy and Security Act)
// ============================================================================
export const texasHB4Framework: FrameworkInfo = {
  id: ComplianceFramework.TEXAS_HB4,
  name: 'Texas Data Privacy and Security Act',
  version: 'HB 4 (2024)',
  description: 'Texas comprehensive consumer data privacy law establishing consumer rights and business obligations for personal data processing.',
  organization: 'State of Texas',
  total_controls: 10,
  categories: ['Consumer Rights', 'Controller Obligations', 'Data Protection Assessments', 'Sensitive Data'],
  url: 'https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB4'
};

export const texasHB4Controls: Record<string, ControlRequirement> = {
  'TDPSA.541.101': { id: 'TDPSA.541.101', title: 'Consumer Rights', description: 'Rights to access, correct, delete, portability, and opt-out of targeted advertising and sale.', implementation: 'Implement consumer rights mechanisms, respond within 45 days.', assessment: 'Review rights implementation and response compliance.', relatedControls: ['TDPSA.541.107'] },
  'TDPSA.541.107': { id: 'TDPSA.541.107', title: 'Data Protection Assessment', description: 'Controllers must conduct DPAs for processing involving targeted advertising, sale, profiling, or sensitive data.', implementation: 'Conduct DPAs, maintain records, make available to AG on request.', assessment: 'Review DPA documentation.', relatedControls: ['TDPSA.541.101'] },
};

// ============================================================================
// CMIA (Confidentiality of Medical Information Act - California)
// ============================================================================
export const cmiaFramework: FrameworkInfo = {
  id: ComplianceFramework.CMIA,
  name: 'CMIA',
  version: 'California Civil Code §56',
  description: 'California Confidentiality of Medical Information Act protecting the confidentiality of medical information by healthcare providers, health plans, and contractors.',
  organization: 'State of California',
  total_controls: 8,
  categories: ['Confidentiality', 'Authorization', 'Disclosure Limits', 'Patient Rights', 'Breach Notification'],
  url: 'https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?tocCode=CIV&division=1.&title=&part=2.6.&chapter=&article='
};

export const cmiaControls: Record<string, ControlRequirement> = {
  'CMIA.56.10': { id: 'CMIA.56.10', title: 'Confidentiality of Medical Information', description: 'Providers shall not disclose medical information without authorization.', implementation: 'Implement confidentiality controls, require written authorization for disclosure.', assessment: 'Review disclosure controls and authorization procedures.', relatedControls: ['CMIA.56.11'] },
  'CMIA.56.11': { id: 'CMIA.56.11', title: 'Authorization Requirements', description: 'Written authorization must meet specific requirements for valid disclosure.', implementation: 'Implement authorization forms meeting statutory requirements.', assessment: 'Review authorization form compliance.', relatedControls: ['CMIA.56.10'] },
  'CMIA.56.101': { id: 'CMIA.56.101', title: 'Breach Notification', description: 'Report unauthorized access or disclosure to affected patients and CDPH.', implementation: 'Establish breach notification procedures, define timelines.', assessment: 'Review notification procedures and compliance.', relatedControls: ['CMIA.56.10'] },
};
