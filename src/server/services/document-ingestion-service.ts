/**
 * Document Ingestion Service
 * Ingests and classifies client artifacts (policies, procedures, plans) for reuse.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import FrameworkRegistry from '../frameworks/index.js';
import {
  ClientArtifactType,
  ClientDocumentArtifact,
  ClientDocumentIngestionRequest,
  ComplianceFramework
} from '../types/framework.js';
import { localStoreService } from './local-store-service.js';

export class DocumentIngestionService {
  private documents: Map<string, ClientDocumentArtifact> = new Map();

  constructor() {
    localStoreService.getClientDocuments().forEach(document => {
      this.documents.set(document.id, document);
    });
  }

  /**
   * Extract text content from base64-encoded binary files.
   * Supports xlsx, xls, csv, and falls back to storing metadata for unsupported types.
   */
  private extractTextFromBinary(base64Content: string, filename?: string): string {
    // Strip data URL prefix if present: "data:application/...;base64,XXXXXX"
    const base64Data = base64Content.includes(',')
      ? base64Content.split(',')[1]
      : base64Content;

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

    // Excel and CSV via xlsx library
    if (['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'ods'].includes(ext)) {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const textParts: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          textParts.push(`--- Sheet: ${sheetName} ---\n${csvText}`);
        }
        return textParts.join('\n\n');
      } catch (e) {
        return `[Binary file: ${filename || 'unknown'}] (Excel parsing failed)`;
      }
    }

    // For docx, pptx - extract what we can (they're ZIP with XML inside)
    if (['docx', 'pptx'].includes(ext)) {
      try {
        // docx/pptx are ZIP files; xlsx lib can open them as workbooks won't work
        // Basic approach: look for readable text in the buffer
        const text = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
        // Extract XML text content between tags
        const xmlText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (xmlText.length > 100) {
          return xmlText.substring(0, 50000); // Limit to 50K chars
        }
        return `[Binary file: ${filename || 'unknown'}] (${ext.toUpperCase()} - limited text extraction)`;
      } catch {
        return `[Binary file: ${filename || 'unknown'}] (${ext.toUpperCase()})`;
      }
    }

    // PDF - basic text extraction from buffer
    if (ext === 'pdf') {
      try {
        const text = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, '').replace(/\s+/g, ' ');
        if (text.length > 200) {
          return text.substring(0, 50000);
        }
        return `[Binary file: ${filename || 'unknown'}] (PDF - install pdf-parse for full extraction)`;
      } catch {
        return `[Binary file: ${filename || 'unknown'}] (PDF)`;
      }
    }

    // Fallback for other binary types
    return `[Binary file: ${filename || 'unknown'}] (${ext.toUpperCase()} format stored)`;
  }

  ingestDocument(request: ClientDocumentIngestionRequest): ClientDocumentArtifact {
    const now = new Date();

    // Decode binary content if base64-encoded
    let content = request.content;
    if (request.encoding === 'base64') {
      content = this.extractTextFromBinary(request.content, request.filename || request.title);
    }

    const type = request.type || this.detectArtifactType(request.title, content);
    const mappedFrameworks = this.detectFrameworks(request.title, content);
    const extractedControlIds = this.extractControlIds(content);

    const artifact: ClientDocumentArtifact = {
      id: uuidv4(),
      organization: request.organization,
      title: request.title,
      type,
      source: request.source || 'manual',
      content,
      mappedFrameworks,
      extractedControlIds,
      tags: request.tags || [],
      ingestedBy: request.ingestedBy,
      ingestedAt: now,
      updatedAt: now,
      checksum: this.generateChecksum(content)
    };

    this.documents.set(artifact.id, artifact);
    this.persist();

    return artifact;
  }

  listDocuments(filters?: {
    organization?: string;
    type?: ClientArtifactType;
    framework?: ComplianceFramework;
  }): ClientDocumentArtifact[] {
    let documents = Array.from(this.documents.values());

    if (filters?.organization) {
      const organization = filters.organization.toLowerCase();
      documents = documents.filter(document => document.organization.toLowerCase() === organization);
    }

    if (filters?.type) {
      documents = documents.filter(document => document.type === filters.type);
    }

    if (filters?.framework) {
      documents = documents.filter(document => document.mappedFrameworks.includes(filters.framework as ComplianceFramework));
    }

    return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getDocument(id: string): ClientDocumentArtifact | undefined {
    return this.documents.get(id);
  }

  updateDocument(id: string, updates: Partial<ClientDocumentIngestionRequest>): ClientDocumentArtifact | undefined {
    const current = this.documents.get(id);
    if (!current) {
      return undefined;
    }

    const content = updates.content ?? current.content;
    const title = updates.title ?? current.title;

    const updated: ClientDocumentArtifact = {
      ...current,
      ...updates,
      title,
      content,
      type: updates.type || this.detectArtifactType(title, content),
      mappedFrameworks: this.detectFrameworks(title, content),
      extractedControlIds: this.extractControlIds(content),
      checksum: this.generateChecksum(content),
      updatedAt: new Date()
    };

    this.documents.set(id, updated);
    this.persist();
    return updated;
  }

  private persist(): void {
    localStoreService.setClientDocuments(Array.from(this.documents.values()));
  }

  private detectArtifactType(title: string, content: string): ClientArtifactType {
    const text = `${title} ${content}`.toLowerCase();

    if (text.includes('procedure') || text.includes('runbook') || text.includes('workflow')) {
      return 'procedure';
    }

    if (text.includes('system security plan') || text.includes('ssp')) {
      return 'ssp';
    }

    if (text.includes('incident response plan') || text.includes('irp')) {
      return 'irp';
    }

    if (text.includes('security plan')) {
      return 'security-plan';
    }

    if (text.includes('system plan') || text.includes('architecture plan')) {
      return 'system-plan';
    }

    if (text.includes('policy') || text.includes('standard')) {
      return 'policy';
    }

    return 'other';
  }

  private detectFrameworks(title: string, content: string): ComplianceFramework[] {
    const text = `${title} ${content}`.toLowerCase();
    const matches: ComplianceFramework[] = [];

    const aliases: Array<[string, ComplianceFramework]> = [
      ['nist csf', ComplianceFramework.NIST_CSF],
      ['nist-csf', ComplianceFramework.NIST_CSF],
      ['nist_csf', ComplianceFramework.NIST_CSF],
      ['csf 2.0', ComplianceFramework.NIST_CSF],
      ['csf_2.0', ComplianceFramework.NIST_CSF],
      ['csf 2', ComplianceFramework.NIST_CSF],
      ['nist 800-53', ComplianceFramework.NIST_800_53],
      ['nist_800_53', ComplianceFramework.NIST_800_53],
      ['nist-800-53', ComplianceFramework.NIST_800_53],
      ['cmmc', ComplianceFramework.NIST_CMMC],
      ['hipaa', ComplianceFramework.HIPAA],
      ['hitrust', ComplianceFramework.HITRUST],
      ['soc 2', ComplianceFramework.SOC2],
      ['soc2', ComplianceFramework.SOC2],
      ['sox', ComplianceFramework.SOX],
      ['gdpr', ComplianceFramework.GDPR],
      ['ccpa', ComplianceFramework.CCPA],
      ['glba', ComplianceFramework.GLBA],
      ['cis controls', ComplianceFramework.CIS_CONTROLS],
      ['cis_controls', ComplianceFramework.CIS_CONTROLS],
      ['cis-controls', ComplianceFramework.CIS_CONTROLS],
      ['cis control', ComplianceFramework.CIS_CONTROLS],
      ['cjis', ComplianceFramework.CJIS],
      ['pci dss', ComplianceFramework.PCI_DSS],
      ['pci-dss', ComplianceFramework.PCI_DSS]
    ];

    aliases.forEach(([alias, framework]) => {
      if (text.includes(alias) && !matches.includes(framework)) {
        matches.push(framework);
      }
    });

    // Check against framework display names as a fallback.
    FrameworkRegistry.getAllFrameworks().forEach(framework => {
      const normalizedName = framework.name.toLowerCase();
      if (text.includes(normalizedName) && !matches.includes(framework.id)) {
        matches.push(framework.id);
      }
    });

    return matches;
  }

  private extractControlIds(content: string): string[] {
    const ids = new Set<string>();

    // Standard control IDs: AC-1, SC-7.1, CJIS-5.1, PCI-1.1.1
    const standard = content.toUpperCase().match(/\b([A-Z]{2,6}(?:[.-][A-Z0-9]{1,8}){1,3})\b/g) || [];
    standard.forEach(id => ids.add(id));

    // CSF 2.0 subcategories: GV.OC-01, ID.AM-01, PR.AA-03, DE.CM-09, RS.MA-01, RC.CO-04
    const csf = content.toUpperCase().match(/\b(GV|ID|PR|DE|RS|RC)\.[A-Z]{2,4}-\d{2}\b/g) || [];
    csf.forEach(id => ids.add(id));

    // CIS Safeguard IDs: 1.1, 2.3, 16.14 (only in context of numbered lists)
    const cisSafeguards = content.match(/\b(\d{1,2}\.\d{1,2})\b/g) || [];
    cisSafeguards.forEach(id => ids.add(`CIS-${id}`));

    return Array.from(ids).slice(0, 500);
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

export default DocumentIngestionService;
