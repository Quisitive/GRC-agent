/**
 * GRC Agent Web Application
 * Client-side logic for the web interface - Vite + TypeScript
 */

import './style.css';

interface Framework {
  id: string;
  name: string;
  version: string;
  organization: string;
  total_controls: number;
  categories: string[];
  description: string;
  url?: string;
}

interface Policy {
  id: string;
  title: string;
  framework: string;
  organization: string;
}

interface Plan {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface Message {
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface Stats {
  policies: number;
  plans: number;
  messages: number;
}

interface ImplementedControl {
  id: string;
  frameworkControlId: string;
  framework: string;
  controlName: string;
  description: string;
  organization: string;
  owner?: string;
  controlType: string;
  status: string;
  effectiveness: string;
  lastReviewed?: string;
  evidenceLinks: string[];
  notes?: string;
  procedures: ImplementedProcedure[];
  createdAt: string;
  updatedAt: string;
}

interface ImplementedProcedure {
  id: string;
  procedureName: string;
  description: string;
  steps: ProcedureStep[];
  frequency: string;
  lastExecuted?: string;
}

interface ProcedureStep {
  stepNumber: number;
  description: string;
  responsible?: string;
  expectedOutput?: string;
}

interface ControlStats {
  total: number;
  implemented: number;
  inProgress: number;
  notImplemented: number;
  planned: number;
  partiallyImplemented: number;
  notApplicable: number;
}

interface ProcedureStats {
  total: number;
  active: number;
  dueSoon: number;
  overdue: number;
}

interface StandaloneProcedure extends ImplementedProcedure {
  controlId: string;
  controlName?: string;
  owner?: string;
}

interface OfflineStatusSummary {
  generatedAt: string;
  schemaVersion: string;
  frameworkCount: number;
  frameworkControlCount: number;
  policyCount: number;
  planCount: number;
  implementedControlCount: number;
  procedureCount: number;
  documentCount: number;
  exemptionCount: number;
  insightCount: number;
  outcomeCount: number;
  connections: Array<{
    id: string;
    name: string;
    status: string;
    lastCheckedAt: string;
  }>;
}

interface ClientDocumentArtifact {
  id: string;
  organization: string;
  title: string;
  type: string;
  source: string;
  content: string;
  mappedFrameworks: string[];
  extractedControlIds: string[];
  tags?: string[];
  ingestedBy?: string;
  ingestedAt: string;
  updatedAt: string;
  checksum: string;
}

interface GapExemption {
  id: string;
  organization: string;
  framework?: string;
  controlId?: string;
  gapDescription: string;
  acceptanceJustification: string;
  riskIdentified: string;
  mitigationsInPlace: string;
  residualRisk: string;
  riskOwner: string;
  riskOwnerEmail?: string;
  status: 'proposed' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  approvalNotes?: string;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

interface ImprovementInsight {
  id: string;
  title: string;
  source: string;
  observation: string;
  rootCause?: string;
  recommendation: string;
  reinforcementActions: string[];
  relatedFrameworks?: string[];
  relatedControls?: string[];
  helpfulCount: number;
  harmfulCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentationGapResult {
  framework: string;
  totalControls: number;
  coveredControls: number;
  coverage: number;
  uncoveredControls: Array<{
    controlId: string;
    controlTitle: string;
    severity: string;
    effort: string;
  }>;
}

interface DocumentationGapAnalysisResponse {
  generatedAt: string;
  filesAnalyzed: string[];
  results: DocumentationGapResult[];
  overallCoverage: number;
  recommendations: string[];
  insightsCaptured: number;
}

interface ImprovementOutcome {
  id: string;
  artifactType: 'policy' | 'plan' | 'procedure';
  artifactId: string;
  artifactTitle: string;
  organization: string;
  frameworks?: string[];
  injectedInsightIds: string[];
  injectionSummary?: string;
  status: 'pending' | 'adopted' | 'deferred' | 'rejected';
  qualityRating?: number;
  implementationDelta?: string;
  reviewer?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ImprovementOutcomeSummary {
  byStatus: Record<string, number>;
  byArtifactType: Record<string, number>;
}

interface TenantClient {
  id: string;
  name: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  sharedWith: string[]; // emails
}

class GRCWebApp {
  private apiEndpoint: string;
  private currentPage: string = 'chat';
  private messages: Message[] = [];
  private policies: Policy[] = [];
  private plans: Plan[] = [];
  private frameworks: Framework[] = [];
  private controls: ImplementedControl[] = [];
  private procedures: StandaloneProcedure[] = [];
  private stats: Stats = { policies: 0, plans: 0, messages: 0 };
  private controlStats: ControlStats = { total: 0, implemented: 0, inProgress: 0, notImplemented: 0, planned: 0, partiallyImplemented: 0, notApplicable: 0 };
  private procedureStats: ProcedureStats = { total: 0, active: 0, dueSoon: 0, overdue: 0 };
  private activity: string[] = [];
  private editingControlId: string | null = null;
  private editingProcedureId: string | null = null;
  private procedureStepCount: number = 0;
  private offlineStatus: OfflineStatusSummary | null = null;
  private clientDocuments: ClientDocumentArtifact[] = [];
  private gapExemptions: GapExemption[] = [];
  private improvementInsights: ImprovementInsight[] = [];
  private improvementOutcomes: ImprovementOutcome[] = [];
  private improvementOutcomeSummary: ImprovementOutcomeSummary | null = null;

  // Multi-tenant state
  private consultantName: string = '';
  private consultantEmail: string = '';
  private activeClientId: string | null = null;
  private clients: TenantClient[] = [];
  private uploadedDocs: { id: string; title: string; type: string; framework: string }[] = [];

  constructor() {
    this.apiEndpoint = localStorage.getItem('apiEndpoint') || '/api';
  }

  async init(): Promise<void> {
    this.loadTenantState();
    this.setupEventListeners();
    this.setupTenantListeners();
    this.setupUploadListeners();
    this.setupTabListeners();

    if (this.activeClientId) {
      this.showApp();
      await this.loadAppData();
    } else {
      this.showTenantScreen();
    }
  }

  private async loadAppData(): Promise<void> {
    await this.loadFrameworks();
    await this.loadPolicies();
    await this.loadPlans();
    await this.loadControls();
    await this.loadProcedures();
    await this.refreshContinuityData();
    this.loadSettings();
    this.addActivity('App initialized');
  }

  // =============== TENANT MANAGEMENT ===============
  private loadTenantState(): void {
    this.consultantName = localStorage.getItem('grc_consultantName') || '';
    this.consultantEmail = localStorage.getItem('grc_consultantEmail') || '';
    this.activeClientId = localStorage.getItem('grc_activeClientId') || null;
    this.clients = JSON.parse(localStorage.getItem('grc_clients') || '[]');
    const nameInput = document.getElementById('consultantName') as HTMLInputElement;
    const emailInput = document.getElementById('consultantEmail') as HTMLInputElement;
    if (nameInput) nameInput.value = this.consultantName;
    if (emailInput) emailInput.value = this.consultantEmail;
    this.renderClientList();
  }

  private saveTenantState(): void {
    localStorage.setItem('grc_consultantName', this.consultantName);
    localStorage.setItem('grc_consultantEmail', this.consultantEmail);
    localStorage.setItem('grc_activeClientId', this.activeClientId || '');
    localStorage.setItem('grc_clients', JSON.stringify(this.clients));
  }

  private showTenantScreen(): void {
    const tenantScreen = document.getElementById('tenantScreen');
    const appContainer = document.getElementById('appContainer');
    if (tenantScreen) tenantScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    this.renderClientList();
  }

  private showApp(): void {
    const tenantScreen = document.getElementById('tenantScreen');
    const appContainer = document.getElementById('appContainer');
    if (tenantScreen) tenantScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    const badge = document.getElementById('activeClientBadge');
    const client = this.clients.find(c => c.id === this.activeClientId);
    if (badge && client) badge.textContent = `📁 ${client.name}`;
  }

  private renderClientList(): void {
    const listEl = document.getElementById('clientList');
    if (!listEl) return;
    // Only show clients consultant created or was granted access to
    const visible = this.clients.filter(c =>
      c.createdByEmail === this.consultantEmail ||
      c.sharedWith.includes(this.consultantEmail)
    );
    if (visible.length === 0) {
      listEl.innerHTML = '<p style="color:var(--gray);font-size:13px;">No clients yet. Create one below.</p>';
      return;
    }
    listEl.innerHTML = visible.map(c => `
      <div class="client-card" data-client-id="${c.id}">
        <div><div class="client-name">${c.name}</div><div class="client-meta">Created ${new Date(c.createdAt).toLocaleDateString()} by ${c.createdBy}</div></div>
        <span style="font-size:20px;">→</span>
      </div>`).join('');
    listEl.querySelectorAll('.client-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.clientId;
        if (id) this.selectClient(id);
      });
    });
  }

  private createClient(name: string): void {
    if (!name.trim()) return;
    if (!this.consultantName || !this.consultantEmail) {
      alert('Please enter your name and email first.');
      return;
    }
    const client: TenantClient = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdBy: this.consultantName,
      createdByEmail: this.consultantEmail,
      createdAt: new Date().toISOString(),
      sharedWith: [],
    };
    this.clients.push(client);
    this.saveTenantState();
    this.renderClientList();
    (document.getElementById('newClientName') as HTMLInputElement).value = '';
  }

  private selectClient(clientId: string): void {
    this.activeClientId = clientId;
    this.saveTenantState();
    this.showApp();
    this.loadAppData();
  }

  private setupTenantListeners(): void {
    document.getElementById('createClientBtn')?.addEventListener('click', () => {
      const input = document.getElementById('newClientName') as HTMLInputElement;
      this.createClient(input?.value || '');
    });
    document.getElementById('newClientName')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('newClientName') as HTMLInputElement;
        this.createClient(input?.value || '');
      }
    });
    document.getElementById('consultantName')?.addEventListener('change', (e) => {
      this.consultantName = (e.target as HTMLInputElement).value;
      this.saveTenantState();
      this.renderClientList();
    });
    document.getElementById('consultantEmail')?.addEventListener('change', (e) => {
      this.consultantEmail = (e.target as HTMLInputElement).value;
      this.saveTenantState();
      this.renderClientList();
    });
    document.getElementById('switchClientBtn')?.addEventListener('click', () => {
      this.showTenantScreen();
    });
    document.getElementById('clientAccessModalClose')?.addEventListener('click', () => {
      this.toggleElement('clientAccessModal');
    });
  }

  // =============== TAB SWITCHING ===============
  private setupTabListeners(): void {
    document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        if (!tabId) return;
        const container = btn.closest('.page') || btn.closest('section');
        if (!container) return;
        container.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll<HTMLElement>('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = container.querySelector(`#${tabId}`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // =============== UPLOAD TOGGLE & FILE HANDLING ===============
  private setupUploadListeners(): void {
    // Toggle paste/file
    document.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const mode = btn.dataset.mode;
        if (!target || !mode) return;
        const parent = btn.closest('.form-group') || btn.parentElement?.parentElement;
        parent?.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pasteArea = document.getElementById(`${target}-paste-area`);
        const fileArea = document.getElementById(`${target}-file-area`);
        if (pasteArea) pasteArea.style.display = mode === 'paste' ? '' : 'none';
        if (fileArea) fileArea.style.display = mode === 'file' ? '' : 'none';
      });
    });

    // File input handlers
    this.setupFileInput('polUploadFile', 'polFilePreview');
    this.setupFileInput('planUploadFile', 'planFilePreview');
    this.setupFileInput('procUploadFile', 'procFilePreview');
    this.setupFileInput('ctrlEvidenceFile', 'ctrlFilePreview');
    this.setupFileInput('docUploadFile', 'docFilePreview');

    // Upload buttons
    document.getElementById('polUploadBtn')?.addEventListener('click', () => this.uploadAndAssess('policy'));
    document.getElementById('planUploadBtn')?.addEventListener('click', () => this.uploadAndAssess('plan'));
    document.getElementById('procUploadBtn')?.addEventListener('click', () => this.uploadAndAssess('procedure'));
    document.getElementById('ctrlUploadBtn')?.addEventListener('click', () => this.uploadEvidence());
    document.getElementById('docUploadBtn')?.addEventListener('click', () => this.uploadDocument());
    document.getElementById('maturityImportBtn')?.addEventListener('click', () => this.importMaturity());

    // Gap buttons
    document.getElementById('polGapBtn')?.addEventListener('click', () => this.runGapAnalysis('policy'));
    document.getElementById('planGapBtn')?.addEventListener('click', () => this.runGapAnalysis('plan'));
    document.getElementById('ctrlGapBtn')?.addEventListener('click', () => this.runGapAnalysis('controls'));
    document.getElementById('procGapBtn')?.addEventListener('click', () => this.runGapAnalysis('procedures'));
    document.getElementById('docGapBtn')?.addEventListener('click', () => this.runGapAnalysis('documents'));

    // CAP buttons
    document.getElementById('polCapBtn')?.addEventListener('click', () => this.generateCAP('policy'));
    document.getElementById('planCapBtn')?.addEventListener('click', () => this.generateCAP('plan'));
    document.getElementById('ctrlCapBtn')?.addEventListener('click', () => this.generateCAP('controls'));
    document.getElementById('procCapBtn')?.addEventListener('click', () => this.generateCAP('procedures'));

    // Library
    document.getElementById('polRefreshBtn')?.addEventListener('click', () => this.loadPolicies());
    document.getElementById('planRefreshBtn')?.addEventListener('click', () => this.loadPlans());
    document.getElementById('docRefreshBtn')?.addEventListener('click', () => this.loadDocuments());
  }

  private static BINARY_EXTENSIONS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'xlsm', 'xlsb',
    'ppt', 'pptx', 'pptm', 'one', 'onetoc2', 'vsd', 'vsdx',
    'msg', 'eml', 'pub', 'accdb', 'mpp',
    'ods', 'odt', 'odp', 'rtf',
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'svg'
  ]);

  private isBinaryFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return GRCWebApp.BINARY_EXTENSIONS.has(ext);
  }

  private setupFileInput(inputId: string, previewId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const preview = document.getElementById(previewId) as HTMLTextAreaElement;
      if (this.isBinaryFile(file.name)) {
        // Read as base64 for binary files
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string) || '';
          // Store base64 data in a data attribute, show friendly preview
          if (preview) {
            preview.dataset.base64 = base64;
            preview.dataset.filename = file.name;
            preview.dataset.binary = 'true';
            const ext = file.name.split('.').pop()?.toUpperCase() || '';
            const sizeKB = Math.round(file.size / 1024);
            preview.value = `[Binary file: ${file.name}]\n[Type: ${ext} | Size: ${sizeKB} KB]\n\nFile will be sent to server for text extraction.`;
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Read as text for text-based files
        const reader = new FileReader();
        reader.onload = (e) => {
          if (preview) {
            preview.value = e.target?.result as string || '';
            preview.dataset.binary = 'false';
            delete preview.dataset.base64;
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // =============== UPLOAD & ASSESS ===============
  private getUploadContent(prefix: string): string {
    const pasteArea = document.getElementById(`${prefix}-paste-area`);
    if (pasteArea && pasteArea.style.display !== 'none') {
      return (document.getElementById(`${prefix}UploadContent`) as HTMLTextAreaElement)?.value || '';
    }
    return (document.getElementById(`${prefix}FilePreview`) as HTMLTextAreaElement)?.value || '';
  }

  private getUploadPayload(prefix: string): { content: string; encoding?: string; filename?: string } {
    const pasteArea = document.getElementById(`${prefix}-paste-area`);
    if (pasteArea && pasteArea.style.display !== 'none') {
      return { content: (document.getElementById(`${prefix}UploadContent`) as HTMLTextAreaElement)?.value || '' };
    }
    const preview = document.getElementById(`${prefix}FilePreview`) as HTMLTextAreaElement;
    if (preview?.dataset.binary === 'true' && preview.dataset.base64) {
      return { content: preview.dataset.base64, encoding: 'base64', filename: preview.dataset.filename };
    }
    return { content: preview?.value || '' };
  }

  private async uploadAndAssess(type: 'policy' | 'plan' | 'procedure'): Promise<void> {
    const prefix = type === 'policy' ? 'pol' : type === 'plan' ? 'plan' : 'proc';
    const title = (document.getElementById(`${prefix}UploadTitle`) as HTMLInputElement)?.value || '';
    const framework = (document.getElementById(`${prefix}UploadFramework`) as HTMLSelectElement)?.value || 'nist-csf';
    const payload = this.getUploadPayload(prefix);
    if (!payload.content.trim()) { alert('Please provide document content.'); return; }
    const resultEl = document.getElementById(`${prefix}UploadResult`);
    if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<p>⏳ Uploading and assessing...</p>'; }

    const fileName = payload.filename || title || 'Untitled';
    const displayTitle = title || fileName;
    const isFile = payload.encoding === 'base64';

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: displayTitle, content: payload.content, encoding: payload.encoding, filename: payload.filename, type, framework, organization: this.getActiveClientName() }),
      });
      const data = await response.json();
      if (data.success || data.document) {
        const doc = data.artifact || data.document || data;
        this.uploadedDocs.push({ id: doc.id || crypto.randomUUID(), title: displayTitle, type, framework });
        this.updateUploadedDocSelects();
        const frameworks = doc.mappedFrameworks || [framework];
        const controlIds = doc.extractedControlIds || [];
        const typeEmoji = type === 'policy' ? '📜' : type === 'plan' ? '📋' : '🔧';

        if (resultEl) resultEl.innerHTML = `
          <h4 class="success">✅ ${typeEmoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Uploaded & Assessed</h4>
          <div style="background:var(--surface-alt, #1a2a3a);padding:12px;border-radius:8px;margin:10px 0;">
            <p style="margin:0 0 4px;font-size:1.1em;font-weight:600;">${this.escapeHtml(displayTitle)}</p>
            ${isFile ? `<p style="margin:0;font-size:0.85em;opacity:0.7;">📁 ${this.escapeHtml(fileName)}</p>` : '<p style="margin:0;font-size:0.85em;opacity:0.7;">📋 Pasted content</p>'}
          </div>
          <table style="width:100%;font-size:0.9em;">
            <tr><td style="padding:4px 0;font-weight:600;width:130px;">🏢 Organization</td><td>${this.escapeHtml(this.getActiveClientName())}</td></tr>
            <tr><td style="padding:4px 0;font-weight:600;">🔗 Frameworks</td><td>${frameworks.map((f: string) => `<span style="background:var(--primary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8em;margin-right:4px;">${this.escapeHtml(f)}</span>`).join('')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:600;">🎛️ Controls</td><td>${controlIds.length} identified${controlIds.length > 0 ? ` — <span style="font-family:monospace;font-size:0.85em;">${controlIds.slice(0, 5).map((id: string) => this.escapeHtml(id)).join(', ')}${controlIds.length > 5 ? ' ...' : ''}</span>` : ''}</td></tr>
          </table>`;
        this.addActivity(`Uploaded ${type}: ${displayTitle}`);
      } else {
        if (resultEl) resultEl.innerHTML = `<p class="danger">❌ ${data.error || 'Upload failed'}</p>`;
      }
    } catch (error) {
      if (resultEl) resultEl.innerHTML = `<p class="danger">❌ Network error</p>`;
    }
  }

  private async uploadEvidence(): Promise<void> {
    const title = (document.getElementById('ctrlEvidenceTitle') as HTMLInputElement)?.value || 'Evidence';
    const controlId = (document.getElementById('ctrlEvidenceControl') as HTMLSelectElement)?.value;
    const payload = this.getUploadPayload('ctrl');
    if (!payload.content.trim()) { alert('Please provide evidence content.'); return; }
    const resultEl = document.getElementById('ctrlUploadResult');
    if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<p>⏳ Uploading...</p>'; }
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: payload.content, encoding: payload.encoding, filename: payload.filename, type: 'evidence', controlId, organization: this.getActiveClientName() }),
      });
      const data = await response.json();
      if (data.success || data.document) {
        if (resultEl) resultEl.innerHTML = `<h4 class="success">✅ Evidence Uploaded</h4><p>${this.escapeHtml(title)} linked to control.</p>`;
        this.loadRecentDocuments('ctrl');
      } else {
        if (resultEl) resultEl.innerHTML = `<p class="danger">❌ ${data.error || 'Failed'}</p>`;
      }
    } catch { if (resultEl) resultEl.innerHTML = '<p class="danger">❌ Network error</p>'; }
  }

  private async uploadDocument(): Promise<void> {
    const title = (document.getElementById('docUploadTitle') as HTMLInputElement)?.value || '';
    const type = (document.getElementById('docUploadType') as HTMLSelectElement)?.value || '';
    const payload = this.getUploadPayload('doc');
    if (!payload.content.trim()) { alert('Please provide document content.'); return; }
    const resultEl = document.getElementById('docUploadResult');
    if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<p>⏳ Uploading...</p>'; }

    // Gather file context for display
    const fileName = payload.filename || title || 'Untitled';
    const fileExt = fileName.split('.').pop()?.toUpperCase() || '';
    const isFile = payload.encoding === 'base64';
    const displayTitle = title || fileName;

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: displayTitle, content: payload.content, encoding: payload.encoding, filename: payload.filename, type: type || undefined, organization: this.getActiveClientName() }),
      });
      const data = await response.json();
      if (data.success || data.document) {
        const doc = data.artifact || data.document || data;
        const frameworks = doc.mappedFrameworks || [];
        const controlIds = doc.extractedControlIds || [];
        const docType = doc.type || type || 'other';
        const typeLabels: Record<string, string> = { 'policy': '📜 Policy', 'procedure': '📋 Procedure', 'evidence': '🔍 Evidence', 'audit-report': '📊 Audit Report', 'security-plan': '🛡️ Security Plan', 'ssp': '🏛️ System Security Plan', 'irp': '🚨 Incident Response Plan', 'risk-assessment': '⚠️ Risk Assessment', 'system-plan': '🖥️ System Plan', 'other': '📄 Document' };

        const frameworkBadges = frameworks.length > 0
          ? frameworks.map((f: string) => `<span style="background:var(--primary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8em;margin-right:4px;">${this.escapeHtml(f)}</span>`).join('')
          : '<span style="opacity:0.6;">None auto-detected — try Import as Maturity for spreadsheets</span>';

        const controlPreview = controlIds.length > 0
          ? `<span style="font-family:monospace;font-size:0.85em;">${controlIds.slice(0, 8).map((id: string) => this.escapeHtml(id)).join(', ')}${controlIds.length > 8 ? ` (+${controlIds.length - 8} more)` : ''}</span>`
          : '<span style="opacity:0.6;">None extracted</span>';

        if (resultEl) resultEl.innerHTML = `
          <h4 class="success">✅ Document Ingested Successfully</h4>
          <div style="background:var(--surface-alt, #1a2a3a);padding:12px;border-radius:8px;margin:10px 0;">
            <p style="margin:0 0 4px;font-size:1.1em;font-weight:600;">${this.escapeHtml(displayTitle)}</p>
            ${isFile ? `<p style="margin:0;font-size:0.85em;opacity:0.7;">📁 ${this.escapeHtml(fileName)} (${fileExt})</p>` : '<p style="margin:0;font-size:0.85em;opacity:0.7;">📋 Pasted content</p>'}
          </div>
          <table style="width:100%;font-size:0.9em;margin-top:8px;">
            <tr><td style="padding:4px 0;font-weight:600;width:130px;">🏢 Organization</td><td>${this.escapeHtml(this.getActiveClientName())}</td></tr>
            <tr><td style="padding:4px 0;font-weight:600;">📂 Classified As</td><td>${typeLabels[docType] || docType}</td></tr>
            <tr><td style="padding:4px 0;font-weight:600;">🔗 Frameworks</td><td>${frameworkBadges}</td></tr>
            <tr><td style="padding:4px 0;font-weight:600;">🎛️ Controls</td><td>${controlIds.length} found — ${controlPreview}</td></tr>
          </table>
          ${isFile && frameworks.length === 0 ? '<p style="margin-top:12px;padding:8px;background:#2a3a1a;border-radius:6px;font-size:0.85em;">💡 <strong>Tip:</strong> For mapping spreadsheets, use <strong>"Import as Maturity Assessment"</strong> above to import controls with status tracking.</p>' : ''}`;
        this.addActivity(`Document uploaded: ${displayTitle}`);
        // Auto-refresh document library
        this.loadDocuments();
      } else {
        if (resultEl) resultEl.innerHTML = `<p class="danger">❌ ${data.error || 'Failed'}</p>`;
      }
    } catch { if (resultEl) resultEl.innerHTML = '<p class="danger">❌ Network error</p>'; }
  }

  // =============== MATURITY IMPORT ===============
  private async importMaturity(): Promise<void> {
    const payload = this.getUploadPayload('doc');
    if (!payload.content.trim() || payload.encoding !== 'base64') {
      alert('Please select a spreadsheet file (.xlsx, .xls, .csv) using the File tab to import maturity data.');
      return;
    }
    const defaultStatus = (document.getElementById('maturityDefaultStatus') as HTMLSelectElement)?.value || 'implemented';
    const defaultEffectiveness = (document.getElementById('maturityDefaultEffectiveness') as HTMLSelectElement)?.value || 'not-tested';
    const resultEl = document.getElementById('docUploadResult');
    if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<p>⏳ Importing maturity data from spreadsheet...</p>'; }
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/controls/import-maturity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: payload.content,
          encoding: payload.encoding,
          filename: payload.filename,
          organization: this.getActiveClientName(),
          defaultStatus,
          defaultEffectiveness
        }),
      });
      const data = await response.json();
      if (data.success) {
        const totalControls = (data.imported?.cisControls || 0) + (data.imported?.csfControls || 0);
        const controls: Array<{ id: string; name: string; framework: string; status: string }> = data.controls || [];
        const statusLabel = (s: string) => {
          const map: Record<string, string> = { 'implemented': '🟢 Implemented', 'partially-implemented': '🟡 Partial', 'in-progress': '🔵 In Progress', 'planned': '⚪ Planned', 'not-implemented': '🔴 Not Implemented', 'not-applicable': '⚫ N/A' };
          return map[s] || s;
        };

        // Build controls table
        let controlsTable = '';
        if (controls.length > 0) {
          const displayControls = controls.slice(0, 25);
          controlsTable = `<table class="import-table" style="width:100%;border-collapse:collapse;margin-top:12px;font-size:0.85em;">
            <thead><tr style="border-bottom:2px solid var(--border);text-align:left;">
              <th style="padding:6px 8px;">ID</th>
              <th style="padding:6px 8px;">Control Name</th>
              <th style="padding:6px 8px;">Framework</th>
              <th style="padding:6px 8px;">Status</th>
            </tr></thead><tbody>${displayControls.map(c => `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:5px 8px;font-family:monospace;font-weight:600;">${this.escapeHtml(c.id)}</td>
              <td style="padding:5px 8px;">${this.escapeHtml(c.name.length > 60 ? c.name.substring(0, 57) + '...' : c.name)}</td>
              <td style="padding:5px 8px;">${this.escapeHtml(c.framework)}</td>
              <td style="padding:5px 8px;">${statusLabel(c.status)}</td>
            </tr>`).join('')}</tbody></table>`;
          if (controls.length > 25) {
            controlsTable += `<p style="margin-top:6px;font-size:0.85em;opacity:0.7;">... and ${controls.length - 25} more controls</p>`;
          }
        }

        if (resultEl) resultEl.innerHTML = `
          <h4 class="success">✅ Maturity Assessment Imported</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;">
            <div style="background:var(--surface-alt, #1a2a3a);padding:12px;border-radius:8px;text-align:center;">
              <div style="font-size:1.8em;font-weight:700;">${totalControls}</div>
              <div style="font-size:0.85em;opacity:0.8;">Controls Imported</div>
            </div>
            <div style="background:var(--surface-alt, #1a2a3a);padding:12px;border-radius:8px;text-align:center;">
              <div style="font-size:1.8em;font-weight:700;">${data.totalRows}</div>
              <div style="font-size:0.85em;opacity:0.8;">Rows Processed</div>
            </div>
          </div>
          <p><strong>📁 File:</strong> ${this.escapeHtml(data.filename || payload.filename || 'spreadsheet')}</p>
          <p><strong>📋 Sheet:</strong> ${this.escapeHtml(data.sheetName || 'Sheet1')}</p>
          <p><strong>🏢 Organization:</strong> ${this.escapeHtml(this.getActiveClientName())}</p>
          <p><strong>🔗 Frameworks:</strong> ${(data.detectedFrameworks || []).map((f: string) => `<span style="background:var(--primary);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8em;margin-right:4px;">${this.escapeHtml(f)}</span>`).join('') || 'None detected'}</p>
          ${data.imported?.cisControls ? `<p><strong>🛡️ CIS Controls:</strong> ${data.imported.cisControls} safeguards</p>` : ''}
          ${data.imported?.csfControls ? `<p><strong>🏛️ NIST CSF 2.0:</strong> ${data.imported.csfControls} subcategories</p>` : ''}
          ${controlsTable}
          <p style="margin-top:12px;font-size:0.85em;opacity:0.7;">💡 View imported controls on the <strong>Controls</strong> page.</p>`;
        this.addActivity(`Maturity imported: ${payload.filename || 'spreadsheet'} (${totalControls} controls)`);
      } else {
        if (resultEl) resultEl.innerHTML = `<p class="danger">❌ ${this.escapeHtml(data.error || 'Import failed')}</p>`;
      }
    } catch (error) {
      if (resultEl) resultEl.innerHTML = '<p class="danger">❌ Network error during maturity import</p>';
    }
  }

  // =============== GAP ANALYSIS ===============
  private async runGapAnalysis(type: string): Promise<void> {
    let framework = '';
    let resultElId = '';
    if (type === 'policy') { framework = (document.getElementById('polGapFramework') as HTMLSelectElement)?.value; resultElId = 'polGapResult'; }
    else if (type === 'plan') { framework = (document.getElementById('planGapFramework') as HTMLSelectElement)?.value; resultElId = 'planGapResult'; }
    else if (type === 'controls') { framework = (document.getElementById('ctrlGapFramework') as HTMLSelectElement)?.value; resultElId = 'ctrlGapResult'; }
    else if (type === 'procedures') { framework = (document.getElementById('procGapFramework') as HTMLSelectElement)?.value; resultElId = 'procGapResult'; }
    else if (type === 'documents') { framework = (document.getElementById('docGapFramework') as HTMLSelectElement)?.value; resultElId = 'docGapResult'; }
    const resultEl = document.getElementById(resultElId);
    if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<p>⏳ Running gap analysis...</p>'; }

    // For CSF: use the hierarchical endpoint with full Function/Category/Subcategory breakdown
    if (framework === 'nist-csf') {
      return this.runCsfHierarchicalGap(resultEl, type);
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documentation/gap-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: this.getActiveClientName(), frameworks: [framework] }),
      });
      const data = await response.json();
      if (data.success !== false && data.results) {
        const r = data.results[0] || data;
        const gapLines = (r.uncoveredControls || []).map((g: any) => `${g.controlId} — ${g.controlTitle} [${g.severity}]`).join('\n');
        if (resultEl) resultEl.innerHTML = `<h4>Gap Analysis Results</h4>
          <p><strong>Framework:</strong> ${r.framework || framework}</p>
          <p><strong>Coverage:</strong> <span class="${(r.coverage||0) > 70 ? 'success' : 'danger'}">${r.coverage || 0}%</span></p>
          <p><strong>Covered:</strong> ${r.coveredControls || 0} / ${r.totalControls || 0}</p>
          <p><strong>Gaps (${(r.uncoveredControls||[]).length}):</strong></p>
          <pre>${gapLines || 'None — fully covered!'}</pre>
          <p>${(data.recommendations || []).map((rec: string) => `• ${rec}`).join('<br>')}</p>`;
        this.populateCapGaps(type, gapLines);
        this.addActivity(`Gap analysis: ${framework} → ${r.coverage || 0}% coverage`);
      } else {
        if (resultEl) resultEl.innerHTML = `<p class="warning">⚠️ ${data.error || 'No results'}</p>`;
      }
    } catch { if (resultEl) resultEl.innerHTML = '<p class="danger">❌ Network error</p>'; }
  }

  private async runCsfHierarchicalGap(resultEl: HTMLElement | null, type: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/gap-analysis/csf-hierarchy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: this.getActiveClientName(), framework: 'nist-csf' }),
      });
      const data = await response.json();
      if (!data.success) {
        if (resultEl) resultEl.innerHTML = `<p class="warning">⚠️ ${data.error || 'No results'}</p>`;
        return;
      }

      // Build hierarchical HTML
      const coverageClass = data.overallCoverage > 70 ? 'success' : data.overallCoverage > 40 ? 'warning' : 'danger';

      let html = `<div class="csf-gap-report">
        <h4>NIST CSF 2.0 — Hierarchical Gap Analysis</h4>
        <div class="csf-gap-summary">
          <div class="csf-gap-stat"><span class="csf-gap-value ${coverageClass}">${data.overallCoverage}%</span><span class="csf-gap-label">Overall Coverage</span></div>
          <div class="csf-gap-stat"><span class="csf-gap-value">${data.totalCovered}</span><span class="csf-gap-label">Covered</span></div>
          <div class="csf-gap-stat"><span class="csf-gap-value">${data.totalGaps}</span><span class="csf-gap-label">Gaps</span></div>
          <div class="csf-gap-stat"><span class="csf-gap-value">${data.totalSubcategories}</span><span class="csf-gap-label">Total Subcategories</span></div>
          <div class="csf-gap-stat"><span class="csf-gap-value">${data.documentsAnalyzed}</span><span class="csf-gap-label">Documents</span></div>
          <div class="csf-gap-stat"><span class="csf-gap-value">${data.controlsAnalyzed}</span><span class="csf-gap-label">Controls</span></div>
        </div>`;

      // Functions breakdown
      for (const func of data.functions) {
        const fCovClass = func.coveragePercent > 70 ? 'success' : func.coveragePercent > 40 ? 'warning' : 'danger';
        html += `<div class="csf-gap-function" style="border-left: 4px solid ${func.color};">
          <div class="csf-gap-func-header">
            <strong>${func.id}: ${this.escapeHtml(func.name)}</strong>
            <span class="badge ${fCovClass === 'success' ? 'badge-success' : fCovClass === 'danger' ? 'badge-danger' : 'badge-warning'}">${func.coveragePercent}%</span>
            <span style="font-size:11px;opacity:0.7;">${func.covered}/${func.totalSubcategories} subcategories</span>
            ${!func.explicitlyMapped && func.covered > 0 ? '<span class="badge badge-warning" title="Subcategories mapped but no explicit function-level documentation">⚠ Partial</span>' : ''}
          </div>`;

        // Categories
        for (const cat of func.categories) {
          const cCovClass = cat.coveragePercent > 70 ? 'success' : cat.coveragePercent > 40 ? 'warning' : 'danger';
          html += `<div class="csf-gap-category">
            <div class="csf-gap-cat-header">
              <span class="csf-gap-cat-id">${cat.id}</span>
              <span class="csf-gap-cat-name">${this.escapeHtml(cat.name)}</span>
              <span class="badge ${cCovClass === 'success' ? 'badge-success' : cCovClass === 'danger' ? 'badge-danger' : 'badge-warning'}">${cat.coveragePercent}%</span>
              ${cat.explicitlyMapped ? '<span class="badge badge-secondary" title="Mapped at category identifier level">📋 Cat. Mapped</span>' : ''}
            </div>
            <div class="csf-gap-subcats">`;

          for (const sub of cat.subcategories) {
            const subClass = sub.covered ? 'csf-sub-covered' : 'csf-sub-gap';
            const icon = sub.covered ? '✅' : '❌';
            const sourceInfo = sub.sources.documents.length > 0 || sub.sources.controls.length > 0
              ? ` title="${[...sub.sources.documents.slice(0, 3), ...sub.sources.controls.slice(0, 3)].map((s: string) => this.escapeHtml(s)).join(', ')}"`
              : '';
            html += `<span class="csf-sub-badge ${subClass}"${sourceInfo}>${icon} ${sub.id}</span>`;
          }

          html += `</div>`;

          // Show gap subcategories explicitly
          if (cat.gapSubcategories.length > 0 && cat.gapSubcategories.length <= cat.totalSubcategories) {
            html += `<div class="csf-gap-details"><em>Gaps:</em> ${cat.gapSubcategories.join(', ')}</div>`;
          }

          html += `</div>`;
        }

        html += `</div>`;
      }

      // Partial mappings warnings
      if (data.partialMappings && data.partialMappings.length > 0) {
        html += `<div class="csf-gap-warnings">
          <h5>⚠️ Partial Mapping Warnings (${data.partialMappings.length})</h5>
          <p class="hint">These subcategories have documentation but their parent Function lacks explicit governance-level mapping.</p>
          <ul>${data.partialMappings.slice(0, 10).map((pm: any) => `<li><code>${this.escapeHtml(pm.subcategory)}</code> → ${this.escapeHtml(pm.issue)}</li>`).join('')}</ul>
        </div>`;
      }

      // Recommendations
      if (data.recommendations && data.recommendations.length > 0) {
        html += `<div class="csf-gap-recs"><h5>📋 Recommendations</h5><ul>${data.recommendations.map((r: string) => `<li>${this.escapeHtml(r)}</li>`).join('')}</ul></div>`;
      }

      html += `</div>`;

      if (resultEl) resultEl.innerHTML = html;

      // Populate CAP gaps text
      const gapLines = data.functions
        .flatMap((f: any) => f.categories.flatMap((c: any) => c.gapSubcategories))
        .join('\n');
      this.populateCapGaps(type, gapLines);
      this.addActivity(`CSF 2.0 gap analysis → ${data.overallCoverage}% coverage (${data.totalCovered}/${data.totalSubcategories})`);
    } catch { if (resultEl) resultEl.innerHTML = '<p class="danger">❌ Network error</p>'; }
  }

  private populateCapGaps(type: string, gaps: string): void {
    if (type === 'policy') (document.getElementById('polCapGaps') as HTMLTextAreaElement).value = gaps;
    else if (type === 'plan') (document.getElementById('planCapGaps') as HTMLTextAreaElement).value = gaps;
    else if (type === 'controls') (document.getElementById('ctrlCapGaps') as HTMLTextAreaElement).value = gaps;
    else if (type === 'procedures') (document.getElementById('procCapGaps') as HTMLTextAreaElement).value = gaps;
  }

  // =============== CAP & POA&M GENERATION ===============
  private async generateCAP(type: string): Promise<void> {
    let gapsText = '', timeline = '90', capType = 'both', framework = '', resultElId = '';
    if (type === 'policy') {
      gapsText = (document.getElementById('polCapGaps') as HTMLTextAreaElement)?.value;
      timeline = (document.getElementById('polCapTimeline') as HTMLSelectElement)?.value;
      capType = (document.getElementById('polCapType') as HTMLSelectElement)?.value;
      framework = (document.getElementById('polCapFramework') as HTMLSelectElement)?.value;
      resultElId = 'polCapResult';
    } else if (type === 'plan') {
      gapsText = (document.getElementById('planCapGaps') as HTMLTextAreaElement)?.value;
      timeline = (document.getElementById('planCapTimeline') as HTMLSelectElement)?.value;
      capType = (document.getElementById('planCapType') as HTMLSelectElement)?.value || 'both';
      resultElId = 'planCapResult';
    } else if (type === 'controls') {
      gapsText = (document.getElementById('ctrlCapGaps') as HTMLTextAreaElement)?.value;
      timeline = (document.getElementById('ctrlCapTimeline') as HTMLSelectElement)?.value;
      capType = (document.getElementById('ctrlCapType') as HTMLSelectElement)?.value;
      resultElId = 'ctrlCapResult';
    } else if (type === 'procedures') {
      gapsText = (document.getElementById('procCapGaps') as HTMLTextAreaElement)?.value;
      timeline = (document.getElementById('procCapTimeline') as HTMLSelectElement)?.value;
      resultElId = 'procCapResult';
    }
    if (!gapsText.trim()) { alert('No gaps to remediate. Run Gap Analysis first.'); return; }
    const resultEl = document.getElementById(resultElId);
    if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<p>⏳ Generating CAP / POA&M...</p>'; }
    const gaps = gapsText.split('\n').filter(l => l.trim()).map(l => {
      const [id, ...desc] = l.split('—');
      return { controlId: (id||'').trim(), description: (desc.join('—')||'').trim() };
    });
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a ${capType === 'both' ? 'CAP and POA&M' : capType.toUpperCase()} for the following gaps against ${framework || 'the assessed framework'} with a ${timeline}-day remediation timeline:\n\n${gapsText}`,
        }),
      });
      const data = await response.json();
      if (data.success && data.response) {
        if (resultEl) resultEl.innerHTML = `<h4 class="success">✅ CAP / POA&M Generated</h4><pre>${data.response}</pre>`;
        this.addActivity(`Generated ${capType} for ${gaps.length} gaps`);
      } else {
        if (resultEl) resultEl.innerHTML = `<p class="danger">❌ ${data.error || 'Generation failed'}</p>`;
      }
    } catch { if (resultEl) resultEl.innerHTML = '<p class="danger">❌ Network error</p>'; }
  }

  // =============== HELPERS ===============
  private getActiveClientName(): string {
    const client = this.clients.find(c => c.id === this.activeClientId);
    return client?.name || 'Default';
  }

  private updateUploadedDocSelects(): void {
    const polSelect = document.getElementById('polGapDoc') as HTMLSelectElement;
    const planSelect = document.getElementById('planGapDoc') as HTMLSelectElement;
    if (polSelect) {
      const polDocs = this.uploadedDocs.filter(d => d.type === 'policy');
      polSelect.innerHTML = polDocs.length
        ? polDocs.map(d => `<option value="${d.id}">${d.title}</option>`).join('')
        : '<option value="">-- Upload a policy first --</option>';
    }
    if (planSelect) {
      const planDocs = this.uploadedDocs.filter(d => d.type === 'plan');
      planSelect.innerHTML = planDocs.length
        ? planDocs.map(d => `<option value="${d.id}">${d.title}</option>`).join('')
        : '<option value="">-- Upload a plan first --</option>';
    }
    // Update control evidence select
    const ctrlSelect = document.getElementById('ctrlEvidenceControl') as HTMLSelectElement;
    if (ctrlSelect && this.controls.length) {
      ctrlSelect.innerHTML = this.controls.map(c => `<option value="${c.id}">${c.frameworkControlId} - ${c.controlName}</option>`).join('');
    }
  }

  private async loadDocuments(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents`);
      const data = await response.json();
      const docs = data.documents || data || [];
      const listEl = document.getElementById('documentsList');
      if (listEl) {
        if (docs.length === 0) { listEl.innerHTML = '<p class="empty-state">No documents yet.</p>'; return; }
        listEl.innerHTML = docs.map((d: any) => `<div class="list-item"><strong>${this.escapeHtml(d.title)}</strong><span class="badge">${d.type || 'unknown'}</span><span class="badge badge-secondary">${(d.mappedFrameworks || []).join(', ') || '—'}</span><span>${new Date(d.ingestedAt || d.createdAt || '').toLocaleDateString()}</span></div>`).join('');
      }
    } catch { /* silent */ }
  }

  private async loadRecentDocuments(target: 'ctrl' | 'proc'): Promise<void> {
    const containerId = target === 'ctrl' ? 'ctrlRecentDocs' : 'procRecentDocs';
    let container = document.getElementById(containerId);
    if (!container) return;
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents`);
      const data = await response.json();
      const docs: any[] = (data.documents || data || []).slice(0, 10);
      if (docs.length === 0) {
        container.innerHTML = '<p class="empty-state">No documents uploaded yet. Upload via the Documents page.</p>';
        return;
      }
      container.innerHTML = docs.map((d: any) => {
        const frameworks = (d.mappedFrameworks || []).map((f: string) => `<span class="badge badge-sm">${this.escapeHtml(f)}</span>`).join(' ');
        const controlIds = (d.extractedControlIds || []).slice(0, 5);
        const ctrlBadges = controlIds.length > 0
          ? controlIds.map((id: string) => `<code style="font-size:10px;">${this.escapeHtml(id)}</code>`).join(' ') + (d.extractedControlIds.length > 5 ? ` <em>+${d.extractedControlIds.length - 5}</em>` : '')
          : '';
        return `<div class="list-item recent-doc-item">
          <div><strong>${this.escapeHtml(d.title)}</strong> <span class="badge">${d.type || 'unknown'}</span></div>
          <div style="font-size:11px;margin-top:2px;">${frameworks} ${ctrlBadges}</div>
        </div>`;
      }).join('');
    } catch { container.innerHTML = '<p class="empty-state">Could not load documents.</p>'; }
  }

  private setupEventListeners(): void {
    // Navigation
    const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-item');
    console.log(`Found ${navButtons.length} nav buttons, attaching listeners...`);
    
    navButtons.forEach((btn) => {
      const page = btn.dataset.page;
      btn.addEventListener('click', () => {
        console.log(`Clicked nav button: ${page}`);
        if (page) this.navigateTo(page);
      });
    });
    console.log(`Nav event listeners attached!\n`);

    // Chat
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    document.getElementById('sendBtn')?.addEventListener('click', () => {
      this.sendMessage();
    });

    // Quick Actions
    document.querySelectorAll<HTMLButtonElement>('#quickActions .btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action) this.handleQuickAction(action);
      });
    });

    // Settings and Help
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.toggleElement('settingsModal');
    });

    document.getElementById('helpBtn')?.addEventListener('click', () => {
      this.toggleElement('helpModal');
    });

    // Forms
    document.getElementById('policyForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.generatePolicy();
    });

    document.getElementById('planForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.generatePlan();
    });

    // Framework search
    document.getElementById('frameworkSearch')?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.searchFrameworks(target.value);
    });

    // Dark mode toggle
    document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
      }
    });

    // Modal close buttons
    document.getElementById('settingsModalClose')?.addEventListener('click', () => {
      this.toggleElement('settingsModal');
    });

    document.getElementById('helpModalClose')?.addEventListener('click', () => {
      this.toggleElement('helpModal');
    });

    document.getElementById('frameworkModalClose')?.addEventListener('click', () => {
      this.toggleElement('frameworkModal');
    });

    // Clear history
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      this.clearHistory();
    });

    // CSF Maturity refresh
    document.getElementById('refreshCsfMaturity')?.addEventListener('click', () => {
      this.loadCsfMaturity();
    });

    // Framework comparison
    document.getElementById('runComparisonBtn')?.addEventListener('click', () => {
      this.runFrameworkComparison();
    });

    // Save settings
    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Controls page
    document.getElementById('addControlBtn')?.addEventListener('click', () => {
      this.openControlModal();
    });

    document.getElementById('controlModalClose')?.addEventListener('click', () => {
      this.closeControlModal();
    });

    document.getElementById('cancelControlBtn')?.addEventListener('click', () => {
      this.closeControlModal();
    });

    document.getElementById('controlDetailModalClose')?.addEventListener('click', () => {
      this.toggleElement('controlDetailModal');
    });

    document.getElementById('controlForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveControl();
    });

    document.getElementById('controlFrameworkFilter')?.addEventListener('change', () => {
      this.filterControls();
    });

    document.getElementById('controlStatusFilter')?.addEventListener('change', () => {
      this.filterControls();
    });

    // Procedures page
    document.getElementById('addProcedureBtn')?.addEventListener('click', () => {
      this.openProcedureModal();
    });

    document.getElementById('procedureModalClose')?.addEventListener('click', () => {
      this.closeProcedureModal();
    });

    document.getElementById('cancelProcedureBtn')?.addEventListener('click', () => {
      this.closeProcedureModal();
    });

    document.getElementById('procedureDetailModalClose')?.addEventListener('click', () => {
      this.toggleElement('procedureDetailModal');
    });

    document.getElementById('procedureForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProcedure();
    });

    document.getElementById('procedureControlFilter')?.addEventListener('change', () => {
      this.filterProcedures();
    });

    document.getElementById('procedureFrequencyFilter')?.addEventListener('change', () => {
      this.filterProcedures();
    });

    document.getElementById('addProcedureStepBtn')?.addEventListener('click', () => {
      this.addProcedureStep();
    });

    // Continuity page
    document.getElementById('refreshOfflineStatusBtn')?.addEventListener('click', () => {
      void this.loadOfflineStatus();
    });

    document.getElementById('documentIngestForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.ingestDocument();
    });

    document.getElementById('gapAnalysisForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.runDocumentationGapAnalysis();
    });

    document.getElementById('exemptionForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.createExemption();
    });

    document.getElementById('insightForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.createInsight();
    });

    document.getElementById('refreshInsightsBtn')?.addEventListener('click', () => {
      void this.loadInsights();
    });

    document.getElementById('insightSourceFilter')?.addEventListener('change', () => {
      void this.loadInsights();
    });

    document.getElementById('refreshOutcomesBtn')?.addEventListener('click', () => {
      void this.loadOutcomes();
    });

    document.getElementById('outcomeStatusFilter')?.addEventListener('change', () => {
      void this.loadOutcomes();
    });
  }

  async sendMessage(): Promise<void> {
    const input = document.getElementById('messageInput') as HTMLInputElement | null;
    const message = input?.value.trim();

    if (!message) return;

    // Add user message
    this.addChatMessage(message, 'user');
    if (input) input.value = '';

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (data.success) {
        this.addChatMessage(data.response, 'assistant');
        this.addActivity(`Processed: ${message.substring(0, 50)}...`);
        this.stats.messages++;
        this.updateAnalytics();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addChatMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }
  }

  handleQuickAction(action: string): void {
    const input = document.getElementById('messageInput') as HTMLInputElement | null;
    if (input) {
      input.value = action;
      this.sendMessage();
    }
  }

  private addChatMessage(content: string, sender: 'user' | 'assistant'): void {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message message-${sender}`;
    messageEl.innerHTML = `<div class="message-content">${this.escapeHtml(content)}</div>`;

    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    this.messages.push({ content, sender, timestamp: new Date() });
  }

  private async generatePolicy(): Promise<void> {
    const title = (document.getElementById('policyTitle') as HTMLInputElement)?.value;
    const organization = (document.getElementById('organization') as HTMLInputElement)?.value;
    const frameworkSelect = document.getElementById('policyFrameworks') as HTMLSelectElement;
    const frameworks = Array.from(frameworkSelect?.selectedOptions || []).map((opt) => opt.value);

    if (!title || !organization) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a ${frameworks.join(', ')} policy titled "${title}" for ${organization}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await this.loadPolicies(); // Reload policies from backend
        alert('Policy generated successfully!');
        this.addActivity(`Generated policy: ${title}`);
      }
    } catch (error) {
      console.error('Error generating policy:', error);
      alert('Failed to generate policy');
    }
  }

  private async generatePlan(): Promise<void> {
    const type = (document.getElementById('planType') as HTMLSelectElement)?.value;
    const title = (document.getElementById('planTitle') as HTMLInputElement)?.value;
    const organization = (document.getElementById('planOrganization') as HTMLInputElement)?.value;
    const frameworkSelect = document.getElementById('planFrameworks') as HTMLSelectElement;
    const frameworks = Array.from(frameworkSelect?.selectedOptions || []).map((opt) => opt.value);

    if (!type || !title || !organization) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a ${type} plan titled "${title}" for ${organization} aligned with ${frameworks.join(', ')}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await this.loadPlans(); // Reload plans from backend
        alert('Plan generated successfully!');
        this.addActivity(`Generated plan: ${title}`);
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate plan');
    }
  }

  private async loadFrameworks(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/frameworks`);
      const data = await response.json();

      if (data.success) {
        this.frameworks = data.frameworks;
        this.displayFrameworks();
      }
    } catch (error) {
      console.error('Error loading frameworks:', error);
    }
  }

  private async loadPolicies(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/policies`);
      const data = await response.json();

      if (data.success) {
        this.policies = data.policies;
        this.stats.policies = this.policies.length;
        this.updatePoliciesList();
        this.updateStats();
      }
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  }

  private async loadPlans(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/plans`);
      const data = await response.json();

      if (data.success) {
        this.plans = data.plans;
        this.stats.plans = this.plans.length;
        this.updatePlansList();
        this.updateStats();
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  }

  private displayFrameworks(filter: string = ''): void {
    const container = document.getElementById('frameworksList');
    if (!container) return;

    const filtered = filter
      ? this.frameworks.filter(
          (f) =>
            f.name.toLowerCase().includes(filter.toLowerCase()) ||
            f.organization.toLowerCase().includes(filter.toLowerCase())
        )
      : this.frameworks;

    container.innerHTML = filtered
      .map(
        (fw) => `
            <div class="framework-card" data-framework-id="${fw.id}">
                <div class="card-title">${fw.name}</div>
                <div style="font-size: 12px; color: var(--gray);">v${fw.version}</div>
                <div style="font-size: 12px; margin-top: 8px;">${fw.total_controls} controls</div>
            </div>
        `
      )
      .join('');

    // Add click handlers
    container.querySelectorAll<HTMLElement>('.framework-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.frameworkId;
        if (id) this.showFrameworkDetail(id);
      });
    });
  }

  private searchFrameworks(query: string): void {
    this.displayFrameworks(query);
  }

  private async showFrameworkDetail(frameworkId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/frameworks/${frameworkId}`);
      const data = await response.json();

      if (data.success) {
        const detail = document.getElementById('frameworkDetail');
        if (detail) {
          detail.innerHTML = `
                        <h2>${data.framework.name}</h2>
                        <p><strong>Version:</strong> ${data.framework.version}</p>
                        <p><strong>Organization:</strong> ${data.framework.organization}</p>
                        <p><strong>Total Controls:</strong> ${data.framework.total_controls}</p>
                        <p><strong>Categories:</strong> ${data.framework.categories.join(', ')}</p>
                        <p><strong>Description:</strong> ${data.framework.description}</p>
                        ${data.framework.url ? `<p><a href="${data.framework.url}" target="_blank">More Info →</a></p>` : ''}
                    `;
          this.toggleElement('frameworkModal');
        }
      }
    } catch (error) {
      console.error('Error loading framework detail:', error);
    }
  }

  private updatePoliciesList(): void {
    const list = document.getElementById('policiesList');
    if (!list) return;

    if (this.policies.length === 0) {
      list.innerHTML = '<p class="empty-state">No policies yet. Generate one above!</p>';
    } else {
      list.innerHTML = this.policies
        .map(
          (p) => `
                <div class="policy-card">
                    <div class="card-title">${p.title}</div>
                    <div class="card-meta">
                        <span>📋 ${p.framework}</span>
                        <span>🏢 ${p.organization}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-small" data-export-policy="${p.id}">Export</button>
                        <button class="btn btn-small btn-danger" data-delete-policy="${p.id}">Delete</button>
                    </div>
                </div>
            `
        )
        .join('');

      // Add event listeners
      list.querySelectorAll<HTMLButtonElement>('[data-export-policy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.exportPolicy;
          if (id) this.exportPolicy(id);
        });
      });

      list.querySelectorAll<HTMLButtonElement>('[data-delete-policy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.deletePolicy;
          if (id) this.deletePolicy(id);
        });
      });
    }
  }

  private updatePlansList(): void {
    const list = document.getElementById('plansList');
    if (!list) return;

    if (this.plans.length === 0) {
      list.innerHTML = '<p class="empty-state">No plans yet. Generate one above!</p>';
    } else {
      list.innerHTML = this.plans
        .map(
          (p) => `
                <div class="plan-card">
                    <div class="card-title">${p.title}</div>
                    <div class="card-meta">
                        <span>📊 ${p.type}</span>
                        <span>📋 ${p.status}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-small" data-export-plan="${p.id}">Export</button>
                        <button class="btn btn-small btn-danger" data-delete-plan="${p.id}">Delete</button>
                    </div>
                </div>
            `
        )
        .join('');

      // Add event listeners
      list.querySelectorAll<HTMLButtonElement>('[data-export-plan]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.exportPlan;
          if (id) this.exportPlan(id);
        });
      });

      list.querySelectorAll<HTMLButtonElement>('[data-delete-plan]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.deletePlan;
          if (id) this.deletePlan(id);
        });
      });
    }
  }

  private navigateTo(page: string): void {
    console.log(`Navigating to page: ${page}`);
    
    // Remove active from all pages
    document.querySelectorAll<HTMLElement>('.page').forEach((p) => p.classList.remove('active'));

    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.remove('active'));

    // Show selected page
    const pageEl = document.getElementById(`${page}-page`);
    if (pageEl) {
      pageEl.classList.add('active');
      console.log(`Successfully switched to ${page} page`);
    } else {
      console.error(`Could not find page element: ${page}-page`);
    }

    // Mark nav item as active
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    this.currentPage = page;

    if (page === 'continuity') {
      this.refreshContinuityData().catch((error) => {
        console.error('Error refreshing continuity data:', error);
      });
    }

    if (page === 'analytics') {
      this.loadCsfMaturity();
      this.populateFrameworkSelectors();
    }

    if (page === 'documents') {
      this.loadDocuments();
    }

    if (page === 'controls') {
      this.loadRecentDocuments('ctrl');
    }

    if (page === 'procedures') {
      this.loadRecentDocuments('proc');
    }
  }

  private updateAnalytics(): void {
    const policiesEl = document.getElementById('policiesCount');
    const plansEl = document.getElementById('plansCount');
    const messagesEl = document.getElementById('messagesCount');

    if (policiesEl) policiesEl.textContent = String(this.stats.policies);
    if (plansEl) plansEl.textContent = String(this.stats.plans);
    if (messagesEl) messagesEl.textContent = String(this.stats.messages);
  }

  private updateStats(): void {
    this.updateAnalytics();
  }

  private async loadCsfMaturity(): Promise<void> {
    const container = document.getElementById('csfMaturityDashboard');
    if (!container) return;
    container.innerHTML = '<p class="empty-state">Loading CSF maturity data...</p>';
    try {
      const org = this.getActiveClientName() || 'default';
      const res = await fetch(`/api/grc/analytics/csf-maturity?organization=${encodeURIComponent(org)}`);
      const data = await res.json();
      if (!data.success) { container.innerHTML = '<p class="empty-state">Failed to load maturity data.</p>'; return; }
      this.renderCsfMaturity(container, data);
    } catch (e) {
      container.innerHTML = '<p class="empty-state">Error loading CSF maturity data.</p>';
      console.error(e);
    }
  }

  private renderCsfMaturity(container: HTMLElement, data: any): void {
    const statusIcon = (s: string) => {
      switch (s) {
        case 'implemented': return '<span class="csf-status csf-implemented" title="Implemented">●</span>';
        case 'partially-implemented': return '<span class="csf-status csf-partial" title="Partially Implemented">◐</span>';
        case 'planned': return '<span class="csf-status csf-planned" title="Planned">○</span>';
        case 'not-implemented': return '<span class="csf-status csf-not-impl" title="Not Implemented">✕</span>';
        default: return '<span class="csf-status csf-not-assessed" title="Not Assessed">—</span>';
      }
    };

    let html = `
      <div class="csf-summary-bar">
        <div class="csf-score-big">
          <div class="csf-score-circle" style="--score:${data.overallScore}">
            <span>${data.overallScore}%</span>
          </div>
          <div class="csf-score-label">Overall Maturity</div>
        </div>
        <div class="csf-summary-stats">
          <div><strong>${data.totalSubcategories}</strong> Subcategories</div>
          <div><span class="csf-implemented">●</span> ${data.totalImplemented} Implemented</div>
          <div><span class="csf-partial">◐</span> ${data.totalPartial} Partial</div>
          <div><span class="csf-not-assessed">—</span> ${data.totalNotAssessed} Not Assessed</div>
          <div>CIS Controls: ${data.cisControlsCount} | CSF Controls: ${data.csfControlsCount}</div>
        </div>
        <div class="csf-legend">
          <span class="csf-implemented">● Implemented</span>
          <span class="csf-partial">◐ Partial</span>
          <span class="csf-planned">○ Planned</span>
          <span class="csf-not-impl">✕ Not Impl.</span>
          <span class="csf-not-assessed">— Not Assessed</span>
        </div>
      </div>
      <div class="csf-functions">`;

    for (const fn of data.functions) {
      html += `
        <div class="csf-function" style="--fn-color:${fn.color}">
          <div class="csf-function-header">
            <div class="csf-fn-title"><span class="csf-fn-badge" style="background:${fn.color}">${fn.id}</span> ${fn.name}</div>
            <div class="csf-fn-score">${fn.score}%</div>
          </div>
          <div class="csf-fn-bar"><div class="csf-fn-bar-fill" style="width:${fn.score}%;background:${fn.color}"></div></div>
          <div class="csf-categories">`;

      for (const cat of fn.categories) {
        html += `
            <div class="csf-category">
              <div class="csf-cat-header">
                <span class="csf-cat-id">${cat.id}</span>
                <span class="csf-cat-name">${cat.name}</span>
                <span class="csf-cat-score">${cat.score}%</span>
              </div>
              <div class="csf-subcategories">`;
        for (const sub of cat.subcategories) {
          html += `<div class="csf-sub" title="${sub.id}: ${sub.name}\nStatus: ${sub.status}\nEffectiveness: ${sub.effectiveness || 'N/A'}">
                    ${statusIcon(sub.status)} <span class="csf-sub-id">${sub.id}</span>
                  </div>`;
        }
        html += `</div></div>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  }

  private async populateFrameworkSelectors(): Promise<void> {
    try {
      const res = await fetch('/api/grc/frameworks');
      const data = await res.json();
      if (!data.success) return;
      const options = data.frameworks.map((fw: any) => `<option value="${fw.id}">${fw.name} (${fw.version})</option>`).join('');
      const sel1 = document.getElementById('compareFw1') as HTMLSelectElement;
      const sel2 = document.getElementById('compareFw2') as HTMLSelectElement;
      if (sel1) sel1.innerHTML = '<option value="">Select framework...</option>' + options;
      if (sel2) sel2.innerHTML = '<option value="">Select framework...</option>' + options;
    } catch (e) { console.error('Failed to load frameworks for comparison', e); }
  }

  private async runFrameworkComparison(): Promise<void> {
    const fw1 = (document.getElementById('compareFw1') as HTMLSelectElement)?.value;
    const fw2 = (document.getElementById('compareFw2') as HTMLSelectElement)?.value;
    const container = document.getElementById('comparisonDashboard');
    if (!container) return;

    if (!fw1 || !fw2) {
      container.innerHTML = '<p class="empty-state">Please select two frameworks to compare.</p>';
      return;
    }
    if (fw1 === fw2) {
      container.innerHTML = '<p class="empty-state">Please select two different frameworks.</p>';
      return;
    }

    container.innerHTML = '<p class="empty-state">Loading comparison...</p>';
    try {
      const org = this.getActiveClientName() || 'default';
      const res = await fetch(`/api/grc/analytics/framework-comparison?framework1=${encodeURIComponent(fw1)}&framework2=${encodeURIComponent(fw2)}&organization=${encodeURIComponent(org)}`);
      const data = await res.json();
      if (!data.success) { container.innerHTML = `<p class="empty-state">Error: ${data.error || 'Unknown'}</p>`; return; }
      this.renderFrameworkComparison(container, data);
      this.addActivity(`Compared frameworks: ${data.framework1.name} vs ${data.framework2.name}`);
    } catch (e) {
      container.innerHTML = '<p class="empty-state">Failed to load comparison data.</p>';
      console.error(e);
    }
  }

  private renderFrameworkComparison(container: HTMLElement, data: any): void {
    const { framework1: f1, framework2: f2, comparison } = data;

    const statusIcon = (s: string) => {
      switch (s) {
        case 'implemented': return '<span class="csf-implemented">●</span>';
        case 'partially-implemented': case 'in-progress': return '<span class="csf-partial">◐</span>';
        case 'planned': return '<span class="csf-planned">○</span>';
        case 'not-implemented': return '<span class="csf-not-impl">✕</span>';
        default: return '<span class="csf-not-assessed">—</span>';
      }
    };

    const scoreColor = (s: number) => s >= 70 ? '#27ae60' : s >= 40 ? '#f39c12' : '#e74c3c';

    let html = `
      <div class="compare-summary">
        <div class="compare-fw-card">
          <h4>${f1.name} <span class="compare-version">${f1.version}</span></h4>
          <div class="compare-score" style="--score:${f1.overallScore};--score-color:${scoreColor(f1.overallScore)}">
            <span>${f1.overallScore}%</span>
          </div>
          <div class="compare-breakdown">
            <div>${f1.totalControls} controls total</div>
            <div><span class="csf-implemented">●</span> ${f1.implemented} implemented</div>
            <div><span class="csf-partial">◐</span> ${f1.partial} partial</div>
            <div><span class="csf-not-assessed">—</span> ${f1.notAssessed} not assessed</div>
          </div>
        </div>
        <div class="compare-delta">
          <div class="compare-delta-score" style="color:${comparison.scoreDelta >= 0 ? '#27ae60' : '#e74c3c'}">
            ${comparison.scoreDelta >= 0 ? '+' : ''}${comparison.scoreDelta}%
          </div>
          <div class="compare-delta-label">Score Delta</div>
          <div class="compare-shared">${comparison.sharedCategoryCount} shared categories</div>
        </div>
        <div class="compare-fw-card">
          <h4>${f2.name} <span class="compare-version">${f2.version}</span></h4>
          <div class="compare-score" style="--score:${f2.overallScore};--score-color:${scoreColor(f2.overallScore)}">
            <span>${f2.overallScore}%</span>
          </div>
          <div class="compare-breakdown">
            <div>${f2.totalControls} controls total</div>
            <div><span class="csf-implemented">●</span> ${f2.implemented} implemented</div>
            <div><span class="csf-partial">◐</span> ${f2.partial} partial</div>
            <div><span class="csf-not-assessed">—</span> ${f2.notAssessed} not assessed</div>
          </div>
        </div>
      </div>

      <div class="compare-categories">
        <div class="compare-col">
          <h4>${f1.name} — Categories</h4>`;

    for (const cat of f1.categories) {
      html += `
          <div class="compare-cat-row">
            <div class="compare-cat-info">
              <span class="compare-cat-name">${cat.name}</span>
              <span class="compare-cat-count">${cat.totalControls} ctrls</span>
            </div>
            <div class="compare-cat-bar"><div class="compare-cat-fill" style="width:${cat.score}%;background:${scoreColor(cat.score)}"></div></div>
            <span class="compare-cat-pct">${cat.score}%</span>
          </div>`;
    }

    html += `</div><div class="compare-col"><h4>${f2.name} — Categories</h4>`;

    for (const cat of f2.categories) {
      html += `
          <div class="compare-cat-row">
            <div class="compare-cat-info">
              <span class="compare-cat-name">${cat.name}</span>
              <span class="compare-cat-count">${cat.totalControls} ctrls</span>
            </div>
            <div class="compare-cat-bar"><div class="compare-cat-fill" style="width:${cat.score}%;background:${scoreColor(cat.score)}"></div></div>
            <span class="compare-cat-pct">${cat.score}%</span>
          </div>`;
    }

    html += `</div></div>`;

    // Detailed control-level grid for each framework
    html += `<details class="compare-details"><summary>📋 Detailed Control Status — ${f1.name}</summary><div class="compare-control-grid">`;
    for (const cat of f1.categories) {
      html += `<div class="compare-ctrl-cat"><strong>${cat.name}</strong><div class="csf-subcategories">`;
      for (const ctrl of cat.controls) {
        html += `<div class="csf-sub" title="${ctrl.id}: ${ctrl.title}\nStatus: ${ctrl.status}\nEffectiveness: ${ctrl.effectiveness}">${statusIcon(ctrl.status)} <span class="csf-sub-id">${ctrl.id}</span></div>`;
      }
      html += `</div></div>`;
    }
    html += `</div></details>`;

    html += `<details class="compare-details"><summary>📋 Detailed Control Status — ${f2.name}</summary><div class="compare-control-grid">`;
    for (const cat of f2.categories) {
      html += `<div class="compare-ctrl-cat"><strong>${cat.name}</strong><div class="csf-subcategories">`;
      for (const ctrl of cat.controls) {
        html += `<div class="csf-sub" title="${ctrl.id}: ${ctrl.title}\nStatus: ${ctrl.status}\nEffectiveness: ${ctrl.effectiveness}">${statusIcon(ctrl.status)} <span class="csf-sub-id">${ctrl.id}</span></div>`;
      }
      html += `</div></div>`;
    }
    html += `</div></details>`;

    container.innerHTML = html;
  }

  private updateActivityLog(): void {
    const log = document.getElementById('activityLog');
    if (!log) return;

    if (this.activity.length === 0) {
      log.innerHTML = '<p class="empty-state">No activity yet</p>';
    } else {
      log.innerHTML = this.activity
        .slice(-10)
        .reverse()
        .map((a) => `<div class="activity-item">📌 ${a}</div>`)
        .join('');
    }
  }

  private addActivity(action: string): void {
    const time = new Date().toLocaleTimeString();
    this.activity.push(`[${time}] ${action}`);
    this.updateActivityLog();
  }

  private exportPolicy(policyId: string): void {
    alert(`Exporting policy ${policyId}`);
    this.addActivity(`Exported policy: ${policyId}`);
  }

  private exportPlan(planId: string): void {
    alert(`Exporting plan ${planId}`);
    this.addActivity(`Exported plan: ${planId}`);
  }

  private deletePolicy(policyId: string): void {
    if (confirm('Are you sure you want to delete this policy?')) {
      this.policies = this.policies.filter((p) => p.id !== policyId);
      this.updatePoliciesList();
      this.addActivity(`Deleted policy: ${policyId}`);
    }
  }

  private deletePlan(planId: string): void {
    if (confirm('Are you sure you want to delete this plan?')) {
      this.plans = this.plans.filter((p) => p.id !== planId);
      this.updatePlansList();
      this.addActivity(`Deleted plan: ${planId}`);
    }
  }

  private clearHistory(): void {
    if (confirm('Clear all chat history?')) {
      const messagesEl = document.getElementById('messages');
      if (messagesEl) messagesEl.innerHTML = '';
      this.messages = [];
      this.addActivity('Cleared chat history');
    }
  }

  private saveSettings(): void {
    const endpointInput = document.getElementById('apiEndpoint') as HTMLInputElement | null;
    const endpoint = endpointInput?.value;
    if (endpoint) {
      localStorage.setItem('apiEndpoint', endpoint);
      this.apiEndpoint = endpoint;
      alert('Settings saved!');
    }
  }

  private loadSettings(): void {
    const endpoint = localStorage.getItem('apiEndpoint');
    const darkMode = localStorage.getItem('darkMode') === 'true';

    if (endpoint) {
      const input = document.getElementById('apiEndpoint') as HTMLInputElement | null;
      if (input) input.value = endpoint;
    }

    if (darkMode) {
      document.body.classList.add('dark-mode');
      const toggle = document.getElementById('darkModeToggle') as HTMLInputElement | null;
      if (toggle) toggle.checked = true;
    }
  }

  private toggleElement(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'flex' : 'none';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Control Management Methods
  private async loadControls(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/controls`);
      const data = await response.json();

      if (data.success) {
        this.controls = data.controls;
        this.updateControlStats();
        this.displayControls();
      }
    } catch (error) {
      console.error('Error loading controls:', error);
    }
  }

  private updateControlStats(): void {
    this.controlStats = {
      total: this.controls.length,
      implemented: this.controls.filter(c => c.status === 'implemented').length,
      inProgress: this.controls.filter(c => c.status === 'in-progress').length,
      notImplemented: this.controls.filter(c => c.status === 'not-implemented').length,
      planned: this.controls.filter(c => c.status === 'planned').length,
      partiallyImplemented: this.controls.filter(c => c.status === 'partially-implemented').length,
      notApplicable: this.controls.filter(c => c.status === 'not-applicable').length
    };

    const totalEl = document.getElementById('totalControls');
    const implEl = document.getElementById('implementedControls');
    const progEl = document.getElementById('inProgressControls');
    const notImplEl = document.getElementById('notImplementedControls');

    if (totalEl) totalEl.textContent = String(this.controlStats.total);
    if (implEl) implEl.textContent = String(this.controlStats.implemented);
    if (progEl) progEl.textContent = String(this.controlStats.inProgress + this.controlStats.planned);
    if (notImplEl) notImplEl.textContent = String(this.controlStats.notImplemented);
  }

  private displayControls(filter?: { framework?: string; status?: string }): void {
    const container = document.getElementById('controlsList');
    if (!container) return;

    let filtered = this.controls;
    if (filter?.framework) {
      filtered = filtered.filter(c => c.framework === filter.framework);
    }
    if (filter?.status) {
      filtered = filtered.filter(c => c.status === filter.status);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">No controls documented yet. Add one above!</p>';
      return;
    }

    container.innerHTML = filtered.map(control => `
      <div class="control-card" data-control-id="${control.id}">
        <div class="control-header">
          <div class="control-title">
            <span class="control-id">${control.frameworkControlId}</span>
            <span class="control-name">${this.escapeHtml(control.controlName)}</span>
          </div>
          <span class="status-badge status-${control.status}">${this.formatStatus(control.status)}</span>
        </div>
        <div class="control-meta">
          <span>🔗 ${control.framework.toUpperCase()}</span>
          <span>🏢 ${this.escapeHtml(control.organization)}</span>
          <span>📋 ${control.controlType}</span>
          ${control.owner ? `<span>👤 ${this.escapeHtml(control.owner)}</span>` : ''}
        </div>
        ${control.description ? `<p class="control-description">${this.escapeHtml(control.description.substring(0, 150))}${control.description.length > 150 ? '...' : ''}</p>` : ''}
        <div class="control-footer">
          <span class="effectiveness-badge eff-${control.effectiveness}">${this.formatEffectiveness(control.effectiveness)}</span>
          <span class="procedures-count">${control.procedures?.length || 0} procedures</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-small" data-view-control="${control.id}">View</button>
          <button class="btn btn-small" data-edit-control="${control.id}">Edit</button>
          <button class="btn btn-small btn-danger" data-delete-control="${control.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll<HTMLButtonElement>('[data-view-control]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.viewControl;
        if (id) this.viewControlDetail(id);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-edit-control]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editControl;
        if (id) this.editControl(id);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-delete-control]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteControl;
        if (id) this.deleteControl(id);
      });
    });
  }

  private filterControls(): void {
    const frameworkFilter = (document.getElementById('controlFrameworkFilter') as HTMLSelectElement)?.value;
    const statusFilter = (document.getElementById('controlStatusFilter') as HTMLSelectElement)?.value;
    
    this.displayControls({
      framework: frameworkFilter || undefined,
      status: statusFilter || undefined
    });
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'not-implemented': 'Not Implemented',
      'planned': 'Planned',
      'in-progress': 'In Progress',
      'implemented': 'Implemented',
      'partially-implemented': 'Partial',
      'not-applicable': 'N/A'
    };
    return statusMap[status] || status;
  }

  private formatEffectiveness(effectiveness: string): string {
    const effMap: Record<string, string> = {
      'not-tested': 'Not Tested',
      'ineffective': 'Ineffective',
      'partially-effective': 'Partial',
      'effective': 'Effective',
      'highly-effective': 'Highly Effective'
    };
    return effMap[effectiveness] || effectiveness;
  }

  private openControlModal(controlId?: string): void {
    this.editingControlId = controlId || null;
    const title = document.getElementById('controlModalTitle');
    
    if (controlId) {
      const control = this.controls.find(c => c.id === controlId);
      if (control) {
        if (title) title.textContent = 'Edit Control';
        this.populateControlForm(control);
      }
    } else {
      if (title) title.textContent = 'Add New Control';
      this.resetControlForm();
    }
    
    this.toggleElement('controlModal');
  }

  private closeControlModal(): void {
    this.editingControlId = null;
    this.resetControlForm();
    const modal = document.getElementById('controlModal');
    if (modal) modal.style.display = 'none';
  }

  private resetControlForm(): void {
    (document.getElementById('controlId') as HTMLInputElement).value = '';
    (document.getElementById('controlFramework') as HTMLSelectElement).value = '';
    (document.getElementById('frameworkControlId') as HTMLInputElement).value = '';
    (document.getElementById('controlName') as HTMLInputElement).value = '';
    (document.getElementById('controlDescription') as HTMLTextAreaElement).value = '';
    (document.getElementById('controlOrganization') as HTMLInputElement).value = '';
    (document.getElementById('controlOwner') as HTMLInputElement).value = '';
    (document.getElementById('controlType') as HTMLSelectElement).value = 'technical';
    (document.getElementById('controlStatus') as HTMLSelectElement).value = 'not-implemented';
    (document.getElementById('controlEffectiveness') as HTMLSelectElement).value = 'not-tested';
    (document.getElementById('controlLastReviewed') as HTMLInputElement).value = '';
    (document.getElementById('controlEvidence') as HTMLTextAreaElement).value = '';
    (document.getElementById('controlNotes') as HTMLTextAreaElement).value = '';
  }

  private populateControlForm(control: ImplementedControl): void {
    (document.getElementById('controlId') as HTMLInputElement).value = control.id;
    (document.getElementById('controlFramework') as HTMLSelectElement).value = control.framework;
    (document.getElementById('frameworkControlId') as HTMLInputElement).value = control.frameworkControlId;
    (document.getElementById('controlName') as HTMLInputElement).value = control.controlName;
    (document.getElementById('controlDescription') as HTMLTextAreaElement).value = control.description || '';
    (document.getElementById('controlOrganization') as HTMLInputElement).value = control.organization;
    (document.getElementById('controlOwner') as HTMLInputElement).value = control.owner || '';
    (document.getElementById('controlType') as HTMLSelectElement).value = control.controlType;
    (document.getElementById('controlStatus') as HTMLSelectElement).value = control.status;
    (document.getElementById('controlEffectiveness') as HTMLSelectElement).value = control.effectiveness;
    (document.getElementById('controlLastReviewed') as HTMLInputElement).value = control.lastReviewed || '';
    (document.getElementById('controlEvidence') as HTMLTextAreaElement).value = control.evidenceLinks?.join('\n') || '';
    (document.getElementById('controlNotes') as HTMLTextAreaElement).value = control.notes || '';
  }

  private async saveControl(): Promise<void> {
    const controlData = {
      framework: (document.getElementById('controlFramework') as HTMLSelectElement).value,
      frameworkControlId: (document.getElementById('frameworkControlId') as HTMLInputElement).value,
      controlName: (document.getElementById('controlName') as HTMLInputElement).value,
      description: (document.getElementById('controlDescription') as HTMLTextAreaElement).value,
      organization: (document.getElementById('controlOrganization') as HTMLInputElement).value,
      owner: (document.getElementById('controlOwner') as HTMLInputElement).value || undefined,
      controlType: (document.getElementById('controlType') as HTMLSelectElement).value,
      status: (document.getElementById('controlStatus') as HTMLSelectElement).value,
      effectiveness: (document.getElementById('controlEffectiveness') as HTMLSelectElement).value,
      lastReviewed: (document.getElementById('controlLastReviewed') as HTMLInputElement).value || undefined,
      evidenceLinks: (document.getElementById('controlEvidence') as HTMLTextAreaElement).value.split('\n').filter(l => l.trim()),
      notes: (document.getElementById('controlNotes') as HTMLTextAreaElement).value || undefined
    };

    try {
      let response;
      if (this.editingControlId) {
        response = await fetch(`${this.apiEndpoint}/grc/controls/${this.editingControlId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(controlData)
        });
      } else {
        response = await fetch(`${this.apiEndpoint}/grc/controls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(controlData)
        });
      }

      const data = await response.json();
      if (data.success) {
        await this.loadControls();
        this.closeControlModal();
        this.addActivity(`${this.editingControlId ? 'Updated' : 'Created'} control: ${controlData.controlName}`);
        alert(`Control ${this.editingControlId ? 'updated' : 'created'} successfully!`);
      } else {
        alert('Failed to save control: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving control:', error);
      alert('Failed to save control');
    }
  }

  private editControl(controlId: string): void {
    this.openControlModal(controlId);
  }

  private async deleteControl(controlId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this control?')) return;

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/controls/${controlId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        await this.loadControls();
        this.addActivity(`Deleted control: ${controlId}`);
      } else {
        alert('Failed to delete control');
      }
    } catch (error) {
      console.error('Error deleting control:', error);
      alert('Failed to delete control');
    }
  }

  private viewControlDetail(controlId: string): void {
    const control = this.controls.find(c => c.id === controlId);
    if (!control) return;

    const detail = document.getElementById('controlDetail');
    if (detail) {
      detail.innerHTML = `
        <h2>${this.escapeHtml(control.controlName)}</h2>
        <div class="control-detail-header">
          <span class="control-id">${control.frameworkControlId}</span>
          <span class="status-badge status-${control.status}">${this.formatStatus(control.status)}</span>
        </div>
        
        <div class="control-detail-section">
          <h3>General Information</h3>
          <table class="detail-table">
            <tr><td><strong>Framework:</strong></td><td>${control.framework.toUpperCase()}</td></tr>
            <tr><td><strong>Organization:</strong></td><td>${this.escapeHtml(control.organization)}</td></tr>
            <tr><td><strong>Owner:</strong></td><td>${control.owner ? this.escapeHtml(control.owner) : 'Not assigned'}</td></tr>
            <tr><td><strong>Control Type:</strong></td><td>${control.controlType}</td></tr>
            <tr><td><strong>Effectiveness:</strong></td><td>${this.formatEffectiveness(control.effectiveness)}</td></tr>
            <tr><td><strong>Last Reviewed:</strong></td><td>${control.lastReviewed || 'Never'}</td></tr>
          </table>
        </div>

        ${control.description ? `
        <div class="control-detail-section">
          <h3>Description</h3>
          <p>${this.escapeHtml(control.description)}</p>
        </div>
        ` : ''}

        ${control.evidenceLinks?.length > 0 ? `
        <div class="control-detail-section">
          <h3>Evidence</h3>
          <ul>
            ${control.evidenceLinks.map(link => `<li><a href="${this.escapeHtml(link)}" target="_blank">${this.escapeHtml(link)}</a></li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${control.procedures?.length > 0 ? `
        <div class="control-detail-section">
          <h3>Procedures (${control.procedures.length})</h3>
          ${control.procedures.map(proc => `
            <div class="procedure-card">
              <h4>${this.escapeHtml(proc.procedureName)}</h4>
              <p><strong>Frequency:</strong> ${proc.frequency}</p>
              ${proc.lastExecuted ? `<p><strong>Last Executed:</strong> ${proc.lastExecuted}</p>` : ''}
              ${proc.description ? `<p>${this.escapeHtml(proc.description)}</p>` : ''}
              ${proc.steps?.length > 0 ? `
                <ol class="procedure-steps">
                  ${proc.steps.map(step => `
                    <li>
                      ${this.escapeHtml(step.description)}
                      ${step.responsible ? `<br><small>Responsible: ${this.escapeHtml(step.responsible)}</small>` : ''}
                    </li>
                  `).join('')}
                </ol>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${control.notes ? `
        <div class="control-detail-section">
          <h3>Notes</h3>
          <p>${this.escapeHtml(control.notes)}</p>
        </div>
        ` : ''}

        <div class="control-detail-footer">
          <small>Created: ${new Date(control.createdAt).toLocaleString()}</small>
          <small>Updated: ${new Date(control.updatedAt).toLocaleString()}</small>
        </div>
      `;
      this.toggleElement('controlDetailModal');
    }
  }

  // Procedure Management Methods
  private async loadProcedures(): Promise<void> {
    try {
      // Load all procedures from all controls
      this.procedures = [];
      for (const control of this.controls) {
        if (control.procedures?.length > 0) {
          const procs = control.procedures.map(p => ({
            ...p,
            controlId: control.id,
            controlName: control.controlName,
            owner: control.owner
          }));
          this.procedures.push(...procs);
        }
      }
      this.updateProcedureStats();
      this.displayProcedures();
      this.populateProcedureControlDropdowns();
    } catch (error) {
      console.error('Error loading procedures:', error);
    }
  }

  private updateProcedureStats(): void {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    this.procedureStats = {
      total: this.procedures.length,
      active: this.procedures.length,
      dueSoon: this.procedures.filter(p => {
        if (!p.lastExecuted) return false;
        const nextDue = this.getNextDueDate(p.lastExecuted, p.frequency);
        return nextDue && nextDue <= sevenDaysFromNow && nextDue > now;
      }).length,
      overdue: this.procedures.filter(p => {
        if (!p.lastExecuted) return true; // Never executed = overdue
        const nextDue = this.getNextDueDate(p.lastExecuted, p.frequency);
        return nextDue && nextDue < now;
      }).length
    };

    const totalEl = document.getElementById('totalProcedures');
    const activeEl = document.getElementById('activeProcedures');
    const dueEl = document.getElementById('dueProcedures');
    const overdueEl = document.getElementById('overdueProcedures');

    if (totalEl) totalEl.textContent = String(this.procedureStats.total);
    if (activeEl) activeEl.textContent = String(this.procedureStats.active);
    if (dueEl) dueEl.textContent = String(this.procedureStats.dueSoon);
    if (overdueEl) overdueEl.textContent = String(this.procedureStats.overdue);
  }

  private getNextDueDate(lastExecuted: string, frequency: string): Date | null {
    const last = new Date(lastExecuted);
    const next = new Date(last);
    
    switch (frequency) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'annually': next.setFullYear(next.getFullYear() + 1); break;
      case 'continuous':
      case 'as-needed':
      default: return null;
    }
    return next;
  }

  private displayProcedures(filter?: { controlId?: string; frequency?: string }): void {
    const container = document.getElementById('proceduresList');
    if (!container) return;

    let filtered = this.procedures;
    if (filter?.controlId) {
      filtered = filtered.filter(p => p.controlId === filter.controlId);
    }
    if (filter?.frequency) {
      filtered = filtered.filter(p => p.frequency === filter.frequency);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">No procedures documented yet. Add one above!</p>';
      return;
    }

    container.innerHTML = filtered.map(procedure => {
      const isOverdue = this.isProcedureOverdue(procedure);
      const isDueSoon = this.isProcedureDueSoon(procedure);
      
      return `
        <div class="procedure-list-card ${isOverdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''}" data-procedure-id="${procedure.id}">
          <div class="procedure-header">
            <div class="procedure-title">
              <span class="procedure-name">${this.escapeHtml(procedure.procedureName)}</span>
              ${isOverdue ? '<span class="badge badge-danger">Overdue</span>' : ''}
              ${isDueSoon && !isOverdue ? '<span class="badge badge-warning">Due Soon</span>' : ''}
            </div>
            <span class="frequency-badge freq-${procedure.frequency}">${this.formatFrequency(procedure.frequency)}</span>
          </div>
          <div class="procedure-meta">
            <span>🎛️ ${this.escapeHtml(procedure.controlName || 'Unknown Control')}</span>
            ${procedure.owner ? `<span>👤 ${this.escapeHtml(procedure.owner)}</span>` : ''}
            <span>📋 ${procedure.steps?.length || 0} steps</span>
          </div>
          ${procedure.description ? `<p class="procedure-description">${this.escapeHtml(procedure.description.substring(0, 120))}${procedure.description.length > 120 ? '...' : ''}</p>` : ''}
          <div class="procedure-footer">
            <span class="last-executed">Last: ${procedure.lastExecuted ? new Date(procedure.lastExecuted).toLocaleDateString() : 'Never'}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-small" data-view-procedure="${procedure.id}">View</button>
            <button class="btn btn-small" data-edit-procedure="${procedure.id}">Edit</button>
            <button class="btn btn-small btn-success" data-execute-procedure="${procedure.id}">Mark Executed</button>
            <button class="btn btn-small btn-danger" data-delete-procedure="${procedure.id}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    container.querySelectorAll<HTMLButtonElement>('[data-view-procedure]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.viewProcedure;
        if (id) this.viewProcedureDetail(id);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-edit-procedure]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editProcedure;
        if (id) this.editProcedure(id);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-execute-procedure]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.executeProcedure;
        if (id) this.markProcedureExecuted(id);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-delete-procedure]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteProcedure;
        if (id) this.deleteProcedure(id);
      });
    });
  }

  private isProcedureOverdue(procedure: StandaloneProcedure): boolean {
    if (!procedure.lastExecuted) return true;
    const nextDue = this.getNextDueDate(procedure.lastExecuted, procedure.frequency);
    return nextDue !== null && nextDue < new Date();
  }

  private isProcedureDueSoon(procedure: StandaloneProcedure): boolean {
    if (!procedure.lastExecuted) return false;
    const nextDue = this.getNextDueDate(procedure.lastExecuted, procedure.frequency);
    if (!nextDue) return false;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextDue <= sevenDaysFromNow && nextDue > now;
  }

  private formatFrequency(frequency: string): string {
    const freqMap: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'annually': 'Annually',
      'as-needed': 'As Needed',
      'continuous': 'Continuous'
    };
    return freqMap[frequency] || frequency;
  }

  private filterProcedures(): void {
    const controlFilter = (document.getElementById('procedureControlFilter') as HTMLSelectElement)?.value;
    const frequencyFilter = (document.getElementById('procedureFrequencyFilter') as HTMLSelectElement)?.value;
    
    this.displayProcedures({
      controlId: controlFilter || undefined,
      frequency: frequencyFilter || undefined
    });
  }

  private populateProcedureControlDropdowns(): void {
    const filterSelect = document.getElementById('procedureControlFilter') as HTMLSelectElement;
    const formSelect = document.getElementById('procedureControlId') as HTMLSelectElement;
    
    const controlOptions = this.controls.map(c => 
      `<option value="${c.id}">${this.escapeHtml(c.controlName)} (${c.frameworkControlId})</option>`
    ).join('');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">All Controls</option>' + controlOptions;
    }
    if (formSelect) {
      formSelect.innerHTML = '<option value="">Select a Control</option>' + controlOptions;
    }
  }

  private openProcedureModal(procedureId?: string): void {
    this.editingProcedureId = procedureId || null;
    const title = document.getElementById('procedureModalTitle');
    
    if (procedureId) {
      const procedure = this.procedures.find(p => p.id === procedureId);
      if (procedure) {
        if (title) title.textContent = 'Edit Procedure';
        this.populateProcedureForm(procedure);
      }
    } else {
      if (title) title.textContent = 'Add New Procedure';
      this.resetProcedureForm();
    }
    
    this.toggleElement('procedureModal');
  }

  private closeProcedureModal(): void {
    this.editingProcedureId = null;
    this.resetProcedureForm();
    const modal = document.getElementById('procedureModal');
    if (modal) modal.style.display = 'none';
  }

  private resetProcedureForm(): void {
    (document.getElementById('procedureId') as HTMLInputElement).value = '';
    (document.getElementById('procedureControlId') as HTMLSelectElement).value = '';
    (document.getElementById('procedureName') as HTMLInputElement).value = '';
    (document.getElementById('procedureDescription') as HTMLTextAreaElement).value = '';
    (document.getElementById('procedureFrequency') as HTMLSelectElement).value = 'monthly';
    (document.getElementById('procedureLastExecuted') as HTMLInputElement).value = '';
    (document.getElementById('procedureOwner') as HTMLInputElement).value = '';
    
    const stepsList = document.getElementById('procedureStepsList');
    if (stepsList) stepsList.innerHTML = '';
    this.procedureStepCount = 0;
  }

  private populateProcedureForm(procedure: StandaloneProcedure): void {
    (document.getElementById('procedureId') as HTMLInputElement).value = procedure.id;
    (document.getElementById('procedureControlId') as HTMLSelectElement).value = procedure.controlId;
    (document.getElementById('procedureName') as HTMLInputElement).value = procedure.procedureName;
    (document.getElementById('procedureDescription') as HTMLTextAreaElement).value = procedure.description || '';
    (document.getElementById('procedureFrequency') as HTMLSelectElement).value = procedure.frequency;
    (document.getElementById('procedureLastExecuted') as HTMLInputElement).value = procedure.lastExecuted || '';
    (document.getElementById('procedureOwner') as HTMLInputElement).value = procedure.owner || '';
    
    const stepsList = document.getElementById('procedureStepsList');
    if (stepsList) {
      stepsList.innerHTML = '';
      this.procedureStepCount = 0;
      procedure.steps?.forEach(step => {
        this.addProcedureStep(step);
      });
    }
  }

  private addProcedureStep(existingStep?: ProcedureStep): void {
    this.procedureStepCount++;
    const stepsList = document.getElementById('procedureStepsList');
    if (!stepsList) return;

    const stepDiv = document.createElement('div');
    stepDiv.className = 'procedure-step-item';
    stepDiv.dataset.stepNumber = String(this.procedureStepCount);
    stepDiv.innerHTML = `
      <div class="step-header">
        <span class="step-number">Step ${this.procedureStepCount}</span>
        <button type="button" class="btn btn-small btn-danger remove-step-btn">&times;</button>
      </div>
      <div class="form-group">
        <input type="text" class="step-description" placeholder="Step description*" value="${existingStep ? this.escapeHtml(existingStep.description) : ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <input type="text" class="step-responsible" placeholder="Responsible person" value="${existingStep?.responsible ? this.escapeHtml(existingStep.responsible) : ''}" />
        </div>
        <div class="form-group">
          <input type="text" class="step-output" placeholder="Expected output" value="${existingStep?.expectedOutput ? this.escapeHtml(existingStep.expectedOutput) : ''}" />
        </div>
      </div>
    `;

    stepDiv.querySelector('.remove-step-btn')?.addEventListener('click', () => {
      stepDiv.remove();
      this.renumberSteps();
    });

    stepsList.appendChild(stepDiv);
  }

  private renumberSteps(): void {
    const stepsList = document.getElementById('procedureStepsList');
    if (!stepsList) return;

    const steps = stepsList.querySelectorAll('.procedure-step-item');
    steps.forEach((step, index) => {
      const stepNumber = step.querySelector('.step-number');
      if (stepNumber) stepNumber.textContent = `Step ${index + 1}`;
      (step as HTMLElement).dataset.stepNumber = String(index + 1);
    });
    this.procedureStepCount = steps.length;
  }

  private async saveProcedure(): Promise<void> {
    const controlId = (document.getElementById('procedureControlId') as HTMLSelectElement).value;
    
    // Gather steps
    const steps: ProcedureStep[] = [];
    const stepItems = document.querySelectorAll('.procedure-step-item');
    stepItems.forEach((item, index) => {
      const description = (item.querySelector('.step-description') as HTMLInputElement)?.value;
      const responsible = (item.querySelector('.step-responsible') as HTMLInputElement)?.value;
      const expectedOutput = (item.querySelector('.step-output') as HTMLInputElement)?.value;
      
      if (description) {
        steps.push({
          stepNumber: index + 1,
          description,
          responsible: responsible || undefined,
          expectedOutput: expectedOutput || undefined
        });
      }
    });

    const procedureData = {
      procedureName: (document.getElementById('procedureName') as HTMLInputElement).value,
      description: (document.getElementById('procedureDescription') as HTMLTextAreaElement).value,
      frequency: (document.getElementById('procedureFrequency') as HTMLSelectElement).value,
      lastExecuted: (document.getElementById('procedureLastExecuted') as HTMLInputElement).value || undefined,
      steps
    };

    try {
      let response;
      if (this.editingProcedureId) {
        response = await fetch(`${this.apiEndpoint}/grc/procedures/${this.editingProcedureId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(procedureData)
        });
      } else {
        response = await fetch(`${this.apiEndpoint}/grc/controls/${controlId}/procedures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(procedureData)
        });
      }

      const data = await response.json();
      if (data.success) {
        await this.loadControls();
        await this.loadProcedures();
        this.closeProcedureModal();
        this.addActivity(`${this.editingProcedureId ? 'Updated' : 'Created'} procedure: ${procedureData.procedureName}`);
        alert(`Procedure ${this.editingProcedureId ? 'updated' : 'created'} successfully!`);
      } else {
        alert('Failed to save procedure: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving procedure:', error);
      alert('Failed to save procedure');
    }
  }

  private editProcedure(procedureId: string): void {
    this.openProcedureModal(procedureId);
  }

  private async deleteProcedure(procedureId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this procedure?')) return;

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/procedures/${procedureId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        await this.loadControls();
        await this.loadProcedures();
        this.addActivity(`Deleted procedure: ${procedureId}`);
      } else {
        alert('Failed to delete procedure');
      }
    } catch (error) {
      console.error('Error deleting procedure:', error);
      alert('Failed to delete procedure');
    }
  }

  private async markProcedureExecuted(procedureId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/procedures/${procedureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastExecuted: new Date().toISOString().split('T')[0] })
      });

      const data = await response.json();
      if (data.success) {
        await this.loadControls();
        await this.loadProcedures();
        this.addActivity(`Executed procedure: ${procedureId}`);
      } else {
        alert('Failed to mark procedure as executed');
      }
    } catch (error) {
      console.error('Error marking procedure executed:', error);
      alert('Failed to mark procedure as executed');
    }
  }

  private viewProcedureDetail(procedureId: string): void {
    const procedure = this.procedures.find(p => p.id === procedureId);
    if (!procedure) return;

    const detail = document.getElementById('procedureDetail');
    if (detail) {
      const nextDue = procedure.lastExecuted ? this.getNextDueDate(procedure.lastExecuted, procedure.frequency) : null;
      
      detail.innerHTML = `
        <h2>${this.escapeHtml(procedure.procedureName)}</h2>
        <div class="procedure-detail-header">
          <span class="frequency-badge freq-${procedure.frequency}">${this.formatFrequency(procedure.frequency)}</span>
          ${this.isProcedureOverdue(procedure) ? '<span class="badge badge-danger">Overdue</span>' : ''}
          ${this.isProcedureDueSoon(procedure) ? '<span class="badge badge-warning">Due Soon</span>' : ''}
        </div>
        
        <div class="procedure-detail-section">
          <h3>General Information</h3>
          <table class="detail-table">
            <tr><td><strong>Control:</strong></td><td>${this.escapeHtml(procedure.controlName || 'Unknown')}</td></tr>
            <tr><td><strong>Owner:</strong></td><td>${procedure.owner ? this.escapeHtml(procedure.owner) : 'Not assigned'}</td></tr>
            <tr><td><strong>Frequency:</strong></td><td>${this.formatFrequency(procedure.frequency)}</td></tr>
            <tr><td><strong>Last Executed:</strong></td><td>${procedure.lastExecuted ? new Date(procedure.lastExecuted).toLocaleDateString() : 'Never'}</td></tr>
            <tr><td><strong>Next Due:</strong></td><td>${nextDue ? nextDue.toLocaleDateString() : 'N/A'}</td></tr>
          </table>
        </div>

        ${procedure.description ? `
        <div class="procedure-detail-section">
          <h3>Description</h3>
          <p>${this.escapeHtml(procedure.description)}</p>
        </div>
        ` : ''}

        ${procedure.steps?.length > 0 ? `
        <div class="procedure-detail-section">
          <h3>Procedure Steps (${procedure.steps.length})</h3>
          <ol class="procedure-steps-detail">
            ${procedure.steps.map(step => `
              <li class="step-detail-item">
                <div class="step-description">${this.escapeHtml(step.description)}</div>
                ${step.responsible ? `<div class="step-meta"><strong>Responsible:</strong> ${this.escapeHtml(step.responsible)}</div>` : ''}
                ${step.expectedOutput ? `<div class="step-meta"><strong>Expected Output:</strong> ${this.escapeHtml(step.expectedOutput)}</div>` : ''}
              </li>
            `).join('')}
          </ol>
        </div>
        ` : ''}

        <div class="procedure-detail-actions">
          <button class="btn btn-success" onclick="window.app.markProcedureExecuted('${procedure.id}'); document.getElementById('procedureDetailModal').style.display='none';">Mark as Executed</button>
        </div>
      `;
      this.toggleElement('procedureDetailModal');
    }
  }

  // Continuity Methods
  private async refreshContinuityData(): Promise<void> {
    await Promise.all([
      this.loadOfflineStatus(),
      this.loadClientDocuments(),
      this.loadExemptions(),
      this.loadInsights(),
      this.loadOutcomes()
    ]);
  }

  private async loadOfflineStatus(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/offline/status`);
      const data = await response.json();

      if (data.success) {
        this.offlineStatus = data.status as OfflineStatusSummary;
        this.displayOfflineStatus();
      }
    } catch (error) {
      console.error('Error loading offline status:', error);
    }
  }

  private displayOfflineStatus(): void {
    const cards = document.getElementById('offlineStatusCards');
    const generatedAt = document.getElementById('offlineGeneratedAt');
    if (!cards) return;

    if (!this.offlineStatus) {
      cards.innerHTML = '<p class="empty-state">Offline status is not available.</p>';
      if (generatedAt) generatedAt.textContent = '';
      return;
    }

    const stats = [
      { label: 'Frameworks', value: this.offlineStatus.frameworkCount },
      { label: 'Framework Controls', value: this.offlineStatus.frameworkControlCount },
      { label: 'Policies', value: this.offlineStatus.policyCount },
      { label: 'Plans', value: this.offlineStatus.planCount },
      { label: 'Implemented Controls', value: this.offlineStatus.implementedControlCount },
      { label: 'Procedures', value: this.offlineStatus.procedureCount },
      { label: 'Artifacts', value: this.offlineStatus.documentCount },
      { label: 'Exemptions', value: this.offlineStatus.exemptionCount },
      { label: 'Insights', value: this.offlineStatus.insightCount },
      { label: 'Outcomes', value: this.offlineStatus.outcomeCount || 0 }
    ];

    cards.innerHTML = stats.map(stat => `
      <div class="mini-stat">
        <div class="mini-stat-value">${stat.value}</div>
        <div class="mini-stat-label">${stat.label}</div>
      </div>
    `).join('');

    if (generatedAt) {
      const timestamp = new Date(this.offlineStatus.generatedAt).toLocaleString();
      generatedAt.textContent = `Generated: ${timestamp} | Schema: ${this.offlineStatus.schemaVersion}`;
    }
  }

  private async ingestDocument(): Promise<void> {
    const organization = (document.getElementById('documentOrganization') as HTMLInputElement | null)?.value.trim();
    const title = (document.getElementById('documentTitle') as HTMLInputElement | null)?.value.trim();
    const content = (document.getElementById('documentContent') as HTMLTextAreaElement | null)?.value.trim();
    const type = (document.getElementById('documentType') as HTMLSelectElement | null)?.value;
    const source = (document.getElementById('documentSource') as HTMLSelectElement | null)?.value;
    const tagsValue = (document.getElementById('documentTags') as HTMLInputElement | null)?.value || '';
    const ingestedBy = (document.getElementById('documentIngestedBy') as HTMLInputElement | null)?.value.trim();

    if (!organization || !title || !content) {
      alert('Organization, title, and content are required.');
      return;
    }

    const tags = tagsValue
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    const payload = {
      organization,
      title,
      content,
      type: type || undefined,
      source: source || 'manual',
      tags: tags.length > 0 ? tags : undefined,
      ingestedBy: ingestedBy || undefined
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        const form = document.getElementById('documentIngestForm') as HTMLFormElement | null;
        form?.reset();
        (document.getElementById('documentSource') as HTMLSelectElement | null)!.value = 'manual';
        await Promise.all([this.loadClientDocuments(), this.loadOfflineStatus()]);
        this.addActivity(`Ingested document: ${title}`);
        alert('Client artifact ingested successfully.');
      } else {
        alert('Failed to ingest artifact: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error ingesting document:', error);
      alert('Failed to ingest artifact');
    }
  }

  private async loadClientDocuments(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documents`);
      const data = await response.json();

      if (data.success) {
        this.clientDocuments = data.documents as ClientDocumentArtifact[];
        this.displayClientDocuments();
      }
    } catch (error) {
      console.error('Error loading client documents:', error);
    }
  }

  private displayClientDocuments(): void {
    const container = document.getElementById('documentsList');
    if (!container) return;

    if (this.clientDocuments.length === 0) {
      container.innerHTML = '<p class="empty-state">No client artifacts ingested yet.</p>';
      return;
    }

    container.innerHTML = this.clientDocuments.map(document => {
      const frameworkText = document.mappedFrameworks.length > 0
        ? document.mappedFrameworks.join(', ')
        : 'None detected';
      const tags = document.tags && document.tags.length > 0
        ? document.tags.map(tag => `<span class="chip">${this.escapeHtml(tag)}</span>`).join('')
        : '';
      const preview = this.escapeHtml(document.content.substring(0, 180));

      return `
        <div class="continuity-card">
          <div class="continuity-card-header">
            <div class="card-title">${this.escapeHtml(document.title)}</div>
            <span class="badge badge-success">${this.escapeHtml(document.type)}</span>
          </div>
          <div class="card-meta">
            <span>🏢 ${this.escapeHtml(document.organization)}</span>
            <span>📥 ${this.escapeHtml(document.source)}</span>
            <span>🔎 ${document.extractedControlIds.length} control refs</span>
          </div>
          <p class="continuity-preview">${preview}${document.content.length > 180 ? '...' : ''}</p>
          <p class="continuity-note"><strong>Frameworks:</strong> ${this.escapeHtml(frameworkText)}</p>
          ${tags ? `<div class="chip-row">${tags}</div>` : ''}
          <p class="continuity-note">Updated: ${new Date(document.updatedAt).toLocaleString()}</p>
        </div>
      `;
    }).join('');
  }

  private async runDocumentationGapAnalysis(): Promise<void> {
    const frameworkSelect = document.getElementById('gapFrameworks') as HTMLSelectElement | null;
    const includeFiles = (document.getElementById('gapIncludeFiles') as HTMLInputElement | null)?.value || '';
    const frameworks = Array.from(frameworkSelect?.selectedOptions || []).map(option => option.value);
    const includeFilesArray = includeFiles
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/documentation/gap-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameworks,
          includeFiles: includeFilesArray.length > 0 ? includeFilesArray : undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        this.displayGapAnalysisResult(data as DocumentationGapAnalysisResponse);
        await Promise.all([this.loadInsights(), this.loadOfflineStatus()]);
        this.addActivity(`Ran documentation gap analysis (${data.overallCoverage}% coverage)`);
      } else {
        alert('Failed to run gap analysis: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error running gap analysis:', error);
      alert('Failed to run documentation gap analysis');
    }
  }

  private displayGapAnalysisResult(result: DocumentationGapAnalysisResponse): void {
    const container = document.getElementById('gapAnalysisResult');
    if (!container) return;

    const frameworkCards = result.results.map(item => `
      <div class="continuity-card">
        <div class="continuity-card-header">
          <div class="card-title">${this.escapeHtml(item.framework)}</div>
          <span class="status-badge status-${item.coverage >= 80 ? 'implemented' : item.coverage >= 50 ? 'in-progress' : 'not-implemented'}">${item.coverage}%</span>
        </div>
        <div class="card-meta">
          <span>Covered: ${item.coveredControls}/${item.totalControls}</span>
          <span>Missing: ${item.uncoveredControls.length}</span>
        </div>
      </div>
    `).join('');

    const recommendations = result.recommendations.length > 0
      ? `<ul class="continuity-list">${result.recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('')}</ul>`
      : '<p class="empty-state">No recommendations generated.</p>';

    const analyzedFiles = result.filesAnalyzed.length > 0
      ? result.filesAnalyzed.map(file => this.escapeHtml(file)).join(', ')
      : 'None provided';

    container.innerHTML = `
      <div class="analysis-summary">
        <div class="stat-value">${result.overallCoverage}%</div>
        <div class="stat-label">Overall Documentation Coverage</div>
        <p class="panel-note">Generated: ${new Date(result.generatedAt).toLocaleString()} | Insights captured: ${result.insightsCaptured}</p>
        <p class="panel-note"><strong>Files:</strong> ${analyzedFiles}</p>
      </div>
      <div class="list">${frameworkCards}</div>
      <h4>Recommendations</h4>
      ${recommendations}
    `;
  }

  private async createExemption(): Promise<void> {
    const organization = (document.getElementById('exemptionOrganization') as HTMLInputElement | null)?.value.trim();
    const framework = (document.getElementById('exemptionFramework') as HTMLSelectElement | null)?.value;
    const controlId = (document.getElementById('exemptionControlId') as HTMLInputElement | null)?.value.trim();
    const nextReviewDate = (document.getElementById('exemptionNextReviewDate') as HTMLInputElement | null)?.value;
    const gapDescription = (document.getElementById('exemptionGapDescription') as HTMLTextAreaElement | null)?.value.trim();
    const acceptanceJustification = (document.getElementById('exemptionJustification') as HTMLTextAreaElement | null)?.value.trim();
    const riskIdentified = (document.getElementById('exemptionRiskIdentified') as HTMLTextAreaElement | null)?.value.trim();
    const mitigationsInPlace = (document.getElementById('exemptionMitigations') as HTMLTextAreaElement | null)?.value.trim();
    const residualRisk = (document.getElementById('exemptionResidualRisk') as HTMLTextAreaElement | null)?.value.trim();
    const riskOwner = (document.getElementById('exemptionRiskOwner') as HTMLInputElement | null)?.value.trim();
    const riskOwnerEmail = (document.getElementById('exemptionRiskOwnerEmail') as HTMLInputElement | null)?.value.trim();

    if (!organization || !nextReviewDate || !gapDescription || !acceptanceJustification || !riskIdentified || !mitigationsInPlace || !residualRisk || !riskOwner) {
      alert('Please complete all required exemption fields.');
      return;
    }

    const payload = {
      organization,
      framework: framework || undefined,
      controlId: controlId || undefined,
      gapDescription,
      acceptanceJustification,
      riskIdentified,
      mitigationsInPlace,
      residualRisk,
      riskOwner,
      riskOwnerEmail: riskOwnerEmail || undefined,
      nextReviewDate
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/exemptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        const form = document.getElementById('exemptionForm') as HTMLFormElement | null;
        form?.reset();
        await Promise.all([this.loadExemptions(), this.loadOfflineStatus()]);
        this.addActivity(`Created exemption for ${organization}`);
        alert('Gap exemption created successfully.');
      } else {
        alert('Failed to create exemption: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating exemption:', error);
      alert('Failed to create exemption');
    }
  }

  private async loadExemptions(): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/exemptions`);
      const data = await response.json();

      if (data.success) {
        this.gapExemptions = data.exemptions as GapExemption[];
        this.displayExemptions();
      }
    } catch (error) {
      console.error('Error loading exemptions:', error);
    }
  }

  private displayExemptions(): void {
    const container = document.getElementById('exemptionsList');
    if (!container) return;

    if (this.gapExemptions.length === 0) {
      container.innerHTML = '<p class="empty-state">No exemptions submitted yet.</p>';
      return;
    }

    container.innerHTML = this.gapExemptions.map(exemption => `
      <div class="continuity-card">
        <div class="continuity-card-header">
          <div class="card-title">${this.escapeHtml(exemption.gapDescription.substring(0, 80))}${exemption.gapDescription.length > 80 ? '...' : ''}</div>
          <span class="status-badge status-${exemption.status}">${this.escapeHtml(exemption.status)}</span>
        </div>
        <div class="card-meta">
          <span>🏢 ${this.escapeHtml(exemption.organization)}</span>
          ${exemption.framework ? `<span>🔗 ${this.escapeHtml(exemption.framework)}</span>` : ''}
          ${exemption.controlId ? `<span>🎛️ ${this.escapeHtml(exemption.controlId)}</span>` : ''}
        </div>
        <p class="continuity-note"><strong>Risk Owner:</strong> ${this.escapeHtml(exemption.riskOwner)}</p>
        <p class="continuity-note"><strong>Next Review:</strong> ${new Date(exemption.nextReviewDate).toLocaleDateString()}</p>
        <p class="continuity-preview">${this.escapeHtml(exemption.residualRisk.substring(0, 180))}${exemption.residualRisk.length > 180 ? '...' : ''}</p>
        <div class="card-actions">
          ${exemption.status === 'proposed' ? `<button class="btn btn-small btn-success" data-exemption-status="approved" data-exemption-id="${exemption.id}">Approve</button>` : ''}
          ${exemption.status === 'proposed' ? `<button class="btn btn-small btn-danger" data-exemption-status="rejected" data-exemption-id="${exemption.id}">Reject</button>` : ''}
          ${exemption.status === 'approved' ? `<button class="btn btn-small btn-secondary" data-exemption-status="expired" data-exemption-id="${exemption.id}">Mark Expired</button>` : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll<HTMLButtonElement>('[data-exemption-id][data-exemption-status]').forEach(button => {
      button.addEventListener('click', () => {
        const exemptionId = button.dataset.exemptionId;
        const status = button.dataset.exemptionStatus as GapExemption['status'] | undefined;
        if (exemptionId && status) {
          void this.updateExemptionStatus(exemptionId, status);
        }
      });
    });
  }

  private async updateExemptionStatus(exemptionId: string, status: GapExemption['status']): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/exemptions/${exemptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        await Promise.all([this.loadExemptions(), this.loadOfflineStatus()]);
        this.addActivity(`Updated exemption ${exemptionId} to ${status}`);
      } else {
        alert('Failed to update exemption status');
      }
    } catch (error) {
      console.error('Error updating exemption:', error);
      alert('Failed to update exemption status');
    }
  }

  private async createInsight(): Promise<void> {
    const title = (document.getElementById('insightTitle') as HTMLInputElement | null)?.value.trim();
    const source = (document.getElementById('insightSource') as HTMLSelectElement | null)?.value;
    const observation = (document.getElementById('insightObservation') as HTMLTextAreaElement | null)?.value.trim();
    const rootCause = (document.getElementById('insightRootCause') as HTMLTextAreaElement | null)?.value.trim();
    const recommendation = (document.getElementById('insightRecommendation') as HTMLTextAreaElement | null)?.value.trim();
    const actions = (document.getElementById('insightActions') as HTMLTextAreaElement | null)?.value || '';

    if (!title || !source || !observation || !recommendation) {
      alert('Title, source, observation, and recommendation are required.');
      return;
    }

    const reinforcementActions = actions
      .split('\n')
      .map(action => action.trim())
      .filter(Boolean);

    const payload = {
      title,
      source,
      observation,
      rootCause: rootCause || undefined,
      recommendation,
      reinforcementActions
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/improvement/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        const form = document.getElementById('insightForm') as HTMLFormElement | null;
        form?.reset();
        (document.getElementById('insightSource') as HTMLSelectElement | null)!.value = 'manual';
        await Promise.all([this.loadInsights(), this.loadOfflineStatus()]);
        this.addActivity(`Captured insight: ${title}`);
        alert('Improvement insight saved.');
      } else {
        alert('Failed to save insight: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating insight:', error);
      alert('Failed to save insight');
    }
  }

  private async loadInsights(): Promise<void> {
    const sourceFilter = (document.getElementById('insightSourceFilter') as HTMLSelectElement | null)?.value || '';
    const query = sourceFilter ? `?source=${encodeURIComponent(sourceFilter)}` : '';

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/improvement/insights${query}`);
      const data = await response.json();

      if (data.success) {
        this.improvementInsights = data.insights as ImprovementInsight[];
        this.displayInsights();
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  }

  private displayInsights(): void {
    const container = document.getElementById('insightsList');
    if (!container) return;

    if (this.improvementInsights.length === 0) {
      container.innerHTML = '<p class="empty-state">No improvement insights captured yet.</p>';
      return;
    }

    container.innerHTML = this.improvementInsights.map(insight => {
      const actions = insight.reinforcementActions?.length
        ? `<ul class="continuity-list">${insight.reinforcementActions.map(action => `<li>${this.escapeHtml(action)}</li>`).join('')}</ul>`
        : '<p class="continuity-note">No reinforcement actions listed.</p>';

      return `
        <div class="continuity-card">
          <div class="continuity-card-header">
            <div class="card-title">${this.escapeHtml(insight.title)}</div>
            <span class="badge badge-warning">${this.escapeHtml(insight.source)}</span>
          </div>
          <p class="continuity-note"><strong>Observation:</strong> ${this.escapeHtml(insight.observation)}</p>
          <p class="continuity-note"><strong>Recommendation:</strong> ${this.escapeHtml(insight.recommendation)}</p>
          ${insight.rootCause ? `<p class="continuity-note"><strong>Root Cause:</strong> ${this.escapeHtml(insight.rootCause)}</p>` : ''}
          ${actions}
          <div class="card-meta">
            <span>👍 ${insight.helpfulCount}</span>
            <span>👎 ${insight.harmfulCount}</span>
            <span>Updated: ${new Date(insight.updatedAt).toLocaleDateString()}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-small btn-secondary" data-insight-feedback="helpful" data-insight-id="${insight.id}">Helpful</button>
            <button class="btn btn-small btn-secondary" data-insight-feedback="harmful" data-insight-id="${insight.id}">Harmful</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll<HTMLButtonElement>('[data-insight-id][data-insight-feedback]').forEach(button => {
      button.addEventListener('click', () => {
        const insightId = button.dataset.insightId;
        const feedback = button.dataset.insightFeedback as 'helpful' | 'harmful' | undefined;
        if (insightId && feedback) {
          void this.submitInsightFeedback(insightId, feedback);
        }
      });
    });
  }

  private async submitInsightFeedback(insightId: string, feedback: 'helpful' | 'harmful'): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/grc/improvement/insights/${insightId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });

      const data = await response.json();
      if (data.success) {
        await this.loadInsights();
        this.addActivity(`Rated insight ${insightId} as ${feedback}`);
      } else {
        alert('Failed to submit insight feedback');
      }
    } catch (error) {
      console.error('Error submitting insight feedback:', error);
      alert('Failed to submit insight feedback');
    }
  }

  private async loadOutcomes(): Promise<void> {
    const statusFilter = (document.getElementById('outcomeStatusFilter') as HTMLSelectElement | null)?.value || '';
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/improvement/outcomes${query}`);
      const data = await response.json();

      if (data.success) {
        this.improvementOutcomes = data.outcomes as ImprovementOutcome[];
        this.improvementOutcomeSummary = data.summary as ImprovementOutcomeSummary;
        this.displayOutcomes();
      }
    } catch (error) {
      console.error('Error loading outcomes:', error);
    }
  }

  private displayOutcomes(): void {
    const summaryContainer = document.getElementById('outcomesSummary');
    const listContainer = document.getElementById('outcomesList');
    if (!summaryContainer || !listContainer) return;

    if (!this.improvementOutcomeSummary || this.improvementOutcomes.length === 0) {
      summaryContainer.innerHTML = '<p class="empty-state">No outcome metrics yet.</p>';
      listContainer.innerHTML = '<p class="empty-state">No injection outcomes recorded yet.</p>';
      return;
    }

    const statusOrder = ['pending', 'adopted', 'deferred', 'rejected'];
    summaryContainer.innerHTML = statusOrder.map(status => `
      <div class="mini-stat">
        <div class="mini-stat-value">${this.improvementOutcomeSummary?.byStatus[status] || 0}</div>
        <div class="mini-stat-label">${status}</div>
      </div>
    `).join('');

    listContainer.innerHTML = this.improvementOutcomes.map(outcome => `
      <div class="continuity-card">
        <div class="continuity-card-header">
          <div class="card-title">${this.escapeHtml(outcome.artifactTitle)}</div>
          <span class="status-badge status-${outcome.status}">${this.escapeHtml(outcome.status)}</span>
        </div>
        <div class="card-meta">
          <span>🧱 ${this.escapeHtml(outcome.artifactType)}</span>
          <span>🏢 ${this.escapeHtml(outcome.organization)}</span>
          <span>🧠 ${outcome.injectedInsightIds.length} injected insights</span>
        </div>
        ${outcome.frameworks && outcome.frameworks.length > 0 ? `<p class="continuity-note"><strong>Frameworks:</strong> ${this.escapeHtml(outcome.frameworks.join(', '))}</p>` : ''}
        ${outcome.injectionSummary ? `<p class="continuity-preview">${this.escapeHtml(outcome.injectionSummary.substring(0, 220))}${outcome.injectionSummary.length > 220 ? '...' : ''}</p>` : ''}
        ${outcome.qualityRating ? `<p class="continuity-note"><strong>Quality Rating:</strong> ${outcome.qualityRating}/5</p>` : ''}
        ${outcome.implementationDelta ? `<p class="continuity-note"><strong>Observed Delta:</strong> ${this.escapeHtml(outcome.implementationDelta)}</p>` : ''}
        <p class="continuity-note">Updated: ${new Date(outcome.updatedAt).toLocaleString()}</p>
        <div class="card-actions">
          ${outcome.status === 'pending' ? `<button class="btn btn-small btn-success" data-outcome-status="adopted" data-outcome-id="${outcome.id}">Mark Adopted</button>` : ''}
          ${outcome.status === 'pending' ? `<button class="btn btn-small btn-secondary" data-outcome-status="deferred" data-outcome-id="${outcome.id}">Defer</button>` : ''}
          ${outcome.status === 'pending' ? `<button class="btn btn-small btn-danger" data-outcome-status="rejected" data-outcome-id="${outcome.id}">Reject</button>` : ''}
        </div>
      </div>
    `).join('');

    listContainer.querySelectorAll<HTMLButtonElement>('[data-outcome-id][data-outcome-status]').forEach(button => {
      button.addEventListener('click', () => {
        const outcomeId = button.dataset.outcomeId;
        const status = button.dataset.outcomeStatus as ImprovementOutcome['status'] | undefined;
        if (outcomeId && status) {
          void this.updateOutcome(outcomeId, status);
        }
      });
    });
  }

  private async updateOutcome(outcomeId: string, status: ImprovementOutcome['status']): Promise<void> {
    const ratingInput = prompt('Optional quality rating (1-5):', '4');
    let qualityRating: number | undefined;

    if (ratingInput && ratingInput.trim().length > 0) {
      const parsed = Number(ratingInput);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
        alert('Quality rating must be between 1 and 5.');
        return;
      }
      qualityRating = parsed;
    }

    const implementationDelta = prompt('Optional implementation delta notes:', '') || undefined;
    const reviewer = prompt('Optional reviewer name:', '') || undefined;

    try {
      const response = await fetch(`${this.apiEndpoint}/grc/improvement/outcomes/${outcomeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          qualityRating,
          implementationDelta,
          reviewer
        })
      });

      const data = await response.json();
      if (data.success) {
        await Promise.all([this.loadOutcomes(), this.loadOfflineStatus()]);
        this.addActivity(`Updated outcome ${outcomeId} to ${status}`);
      } else {
        alert('Failed to update outcome status');
      }
    } catch (error) {
      console.error('Error updating outcome:', error);
      alert('Failed to update outcome status');
    }
  }
}

// Initialize app
const app = new GRCWebApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Export for global access if needed
declare global {
  interface Window {
    app: GRCWebApp;
  }
}
window.app = app;
