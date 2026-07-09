/**
 * GRC Agent Web Application
 * Client-side logic for the web interface
 */

class GRCWebApp {
    constructor() {
        this.apiEndpoint = localStorage.getItem('apiEndpoint') || 'http://localhost:3000';
        this.currentPage = 'chat';
        this.messages = [];
        this.policies = [];
        this.plans = [];
        this.frameworks = [];
        this.stats = { policies: 0, plans: 0, messages: 0 };
        this.activity = [];
    }

    async init() {
        this.setupEventListeners();
        await this.loadFrameworks();
        this.loadSettings();
        this.addActivity('App initialized');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = btn.dataset.page;
                this.navigateTo(page);
            });
        });

        // Chat
        document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
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
            this.searchFrameworks(e.target.value);
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
        });

        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input?.value.trim();

        if (!message) return;

        // Add user message
        this.addChatMessage(message, 'user');
        input.value = '';

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
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

    handleQuickAction(action) {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = action;
            this.sendMessage();
        }
    }

    addChatMessage(content, sender) {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message message-${sender}`;
        messageEl.innerHTML = `<div class="message-content">${this.escapeHtml(content)}</div>`;

        messagesDiv.appendChild(messageEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        this.messages.push({ content, sender, timestamp: new Date() });
    }

    async generatePolicy() {
        const title = document.getElementById('policyTitle')?.value;
        const organization = document.getElementById('organization')?.value;
        const frameworks = Array.from(document.getElementById('policyFrameworks')?.selectedOptions || [])
            .map(opt => opt.value);

        if (!title || !organization) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Generate a ${frameworks.join(', ')} policy titled "${title}" for ${organization}`
                })
            });

            const data = await response.json();
            if (data.success) {
                this.stats.policies++;
                this.updatePoliciesList();
                alert('Policy generated successfully!');
                this.addActivity(`Generated policy: ${title}`);
            }
        } catch (error) {
            console.error('Error generating policy:', error);
            alert('Failed to generate policy');
        }
    }

    async generatePlan() {
        const type = document.getElementById('planType')?.value;
        const title = document.getElementById('planTitle')?.value;
        const organization = document.getElementById('planOrganization')?.value;
        const frameworks = Array.from(document.getElementById('planFrameworks')?.selectedOptions || [])
            .map(opt => opt.value);

        if (!type || !title || !organization) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Generate a ${type} plan titled "${title}" for ${organization} aligned with ${frameworks.join(', ')}`
                })
            });

            const data = await response.json();
            if (data.success) {
                this.stats.plans++;
                this.updatePlansList();
                alert('Plan generated successfully!');
                this.addActivity(`Generated plan: ${title}`);
            }
        } catch (error) {
            console.error('Error generating plan:', error);
            alert('Failed to generate plan');
        }
    }

    async loadFrameworks() {
        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/frameworks`);
            const data = await response.json();

            if (data.success) {
                this.frameworks = data.frameworks;
                this.displayFrameworks();
            }
        } catch (error) {
            console.error('Error loading frameworks:', error);
        }
    }

    displayFrameworks(filter = '') {
        const container = document.getElementById('frameworksList');
        if (!container) return;

        const filtered = filter
            ? this.frameworks.filter(f => 
                f.name.toLowerCase().includes(filter.toLowerCase()) ||
                f.organization.toLowerCase().includes(filter.toLowerCase())
            )
            : this.frameworks;

        container.innerHTML = filtered.map(fw => `
            <div class="framework-card" onclick="app.showFrameworkDetail('${fw.id}')">
                <div class="card-title">${fw.name}</div>
                <div style="font-size: 12px; color: var(--gray);">v${fw.version}</div>
                <div style="font-size: 12px; margin-top: 8px;">${fw.total_controls} controls</div>
            </div>
        `).join('');
    }

    searchFrameworks(query) {
        this.displayFrameworks(query);
    }

    // ==========================
    // Framework Tab Switching
    // ==========================
    switchFrameworkTab(tab) {
        document.querySelectorAll('.fw-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const tabEl = document.getElementById(`fw-tab-${tab}`);
        if (tabEl) tabEl.style.display = 'block';
        document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
    }

    // ==========================
    // Cross-Framework Comparison
    // ==========================
    async runComparison() {
        const fw1 = document.getElementById('compareFramework1')?.value;
        const fw2 = document.getElementById('compareFramework2')?.value;
        const fw3 = document.getElementById('compareFramework3')?.value;

        const frameworks = [fw1, fw2, fw3].filter(Boolean);
        if (frameworks.length < 2) {
            alert('Please select at least 2 frameworks to compare.');
            return;
        }

        const container = document.getElementById('comparisonResults');
        container.innerHTML = '<p>Loading comparison...</p>';

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/frameworks/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frameworks })
            });
            const data = await response.json();

            if (!data.success) {
                container.innerHTML = `<p class="empty-state">Error: ${data.error}</p>`;
                return;
            }

            const fwNames = {};
            data.frameworks.forEach(fw => { fwNames[fw.id] = fw.name; });

            let html = `<table class="comparison-table"><thead><tr><th>Security Domain</th>`;
            frameworks.forEach(fid => {
                html += `<th>${fwNames[fid] || fid}</th>`;
            });
            html += `</tr></thead><tbody>`;

            data.domains.forEach(item => {
                html += `<tr><td class="domain-cell">${item.domain}</td>`;
                frameworks.forEach(fid => {
                    const controls = item.mappings[fid] || [];
                    html += `<td>${controls.length > 0
                        ? controls.map(c => `<span class="control-tag">${this.escapeHtml(c)}</span>`).join(' ')
                        : '<span style="color:var(--gray)">—</span>'
                    }</td>`;
                });
                html += `</tr>`;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
            this.addActivity(`Compared frameworks: ${frameworks.join(', ')}`);
        } catch (error) {
            console.error('Comparison error:', error);
            container.innerHTML = '<p class="empty-state">Failed to load comparison. Is the server running?</p>';
        }
    }

    // ==========================
    // Compliance Ingestion
    // ==========================
    async ingestCompliance() {
        const org = document.getElementById('complianceOrg')?.value?.trim();
        const framework = document.getElementById('complianceFramework')?.value;
        const rawData = document.getElementById('complianceData')?.value?.trim();

        if (!org || !framework || !rawData) {
            alert('Please fill in organization, framework, and compliance data.');
            return;
        }

        // Parse CSV-ish input
        const controls = rawData.split('\n').map(line => {
            const parts = line.split(',').map(p => p.trim());
            return { controlId: parts[0], status: parts[1] || 'not-assessed', notes: parts[2] || '' };
        }).filter(c => c.controlId);

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/compliance/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organization: org, framework, controls })
            });
            const data = await response.json();

            if (data.success) {
                alert(`Ingested ${controls.length} control statuses for ${org}.`);
                this.addActivity(`Ingested compliance: ${org} / ${framework} (${controls.length} controls)`);
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Ingestion error:', error);
            alert('Failed to ingest. Is the server running?');
        }
    }

    // ==========================
    // Cross-Map Compliance Posture
    // ==========================
    async runCrossMap() {
        const org = document.getElementById('complianceOrg')?.value?.trim();
        const sourceFramework = document.getElementById('complianceFramework')?.value;
        const t1 = document.getElementById('crossmapTarget1')?.value;
        const t2 = document.getElementById('crossmapTarget2')?.value;
        const targetFrameworks = [t1, t2].filter(Boolean);

        if (!org || !sourceFramework) {
            alert('Please enter your organization name and source framework above first.');
            return;
        }
        if (targetFrameworks.length === 0) {
            alert('Please select at least one target framework.');
            return;
        }

        const container = document.getElementById('crossmapResults');
        container.innerHTML = '<p>Loading cross-map...</p>';

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/compliance/cross-map`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organization: org, sourceFramework, targetFrameworks })
            });
            const data = await response.json();

            if (!data.success) {
                container.innerHTML = `<p class="empty-state">Error: ${data.error}</p>`;
                return;
            }

            let html = `<h3 style="margin-bottom:12px;">Cross-Map: ${org} (${sourceFramework}) → ${targetFrameworks.join(', ')}</h3>`;
            html += `<table class="comparison-table"><thead><tr>`;
            html += `<th>Security Domain</th><th>Your Status</th>`;
            targetFrameworks.forEach(tf => { html += `<th>${tf} Controls</th>`; });
            html += `</tr></thead><tbody>`;

            data.crossMap.forEach(item => {
                const statusClass = `status-${item.sourceStatus}`;
                html += `<tr>`;
                html += `<td class="domain-cell">${item.domain}</td>`;
                html += `<td><span class="status-badge ${statusClass}">${item.sourceStatus}</span></td>`;
                targetFrameworks.forEach(tf => {
                    const controls = item.targetMappings[tf] || [];
                    html += `<td>${controls.length > 0
                        ? controls.map(c => `<span class="control-tag">${this.escapeHtml(c)}</span>`).join(' ')
                        : '<span style="color:var(--gray)">—</span>'
                    }</td>`;
                });
                html += `</tr>`;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;
            this.addActivity(`Cross-mapped ${org}: ${sourceFramework} → ${targetFrameworks.join(', ')}`);
        } catch (error) {
            console.error('Cross-map error:', error);
            container.innerHTML = '<p class="empty-state">Failed to cross-map. Is the server running?</p>';
        }
    }

    async showFrameworkDetail(frameworkId) {
        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/frameworks/${frameworkId}`);
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

    updatePoliciesList() {
        const list = document.getElementById('policiesList');
        if (!list) return;

        if (this.policies.length === 0) {
            list.innerHTML = '<p class="empty-state">No policies yet. Generate one above!</p>';
        } else {
            list.innerHTML = this.policies.map(p => `
                <div class="policy-card">
                    <div class="card-title">${p.title}</div>
                    <div class="card-meta">
                        <span>📋 ${p.framework}</span>
                        <span>🏢 ${p.organization}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-small" onclick="app.exportPolicy('${p.id}')">Export</button>
                        <button class="btn btn-small btn-danger" onclick="app.deletePolicy('${p.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }

    updatePlansList() {
        const list = document.getElementById('plansList');
        if (!list) return;

        if (this.plans.length === 0) {
            list.innerHTML = '<p class="empty-state">No plans yet. Generate one above!</p>';
        } else {
            list.innerHTML = this.plans.map(p => `
                <div class="plan-card">
                    <div class="card-title">${p.title}</div>
                    <div class="card-meta">
                        <span>📊 ${p.type}</span>
                        <span>📋 ${p.status}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-small" onclick="app.exportPlan('${p.id}')">Export</button>
                        <button class="btn btn-small btn-danger" onclick="app.deletePlan('${p.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }

    navigateTo(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

        // Remove active from nav items
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected page
        const pageEl = document.getElementById(`${page}-page`);
        if (pageEl) {
            pageEl.style.display = 'flex';
        }

        // Mark nav item as active
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        this.currentPage = page;
    }

    updateAnalytics() {
        document.getElementById('policiesCount').textContent = this.stats.policies;
        document.getElementById('plansCount').textContent = this.stats.plans;
        document.getElementById('messagesCount').textContent = this.stats.messages;
    }

    updateActivityLog() {
        const log = document.getElementById('activityLog');
        if (!log) return;

        if (this.activity.length === 0) {
            log.innerHTML = '<p class="empty-state">No activity yet</p>';
        } else {
            log.innerHTML = this.activity.slice(-10).reverse().map(a => 
                `<div class="activity-item">📌 ${a}</div>`
            ).join('');
        }
    }

    addActivity(action) {
        const time = new Date().toLocaleTimeString();
        this.activity.push(`[${time}] ${action}`);
        this.updateActivityLog();
    }

    exportPolicy(policyId) {
        // Placeholder
        alert(`Exporting policy ${policyId}`);
        this.addActivity(`Exported policy: ${policyId}`);
    }

    exportPlan(planId) {
        // Placeholder
        alert(`Exporting plan ${planId}`);
        this.addActivity(`Exported plan: ${planId}`);
    }

    deletePolicy(policyId) {
        if (confirm('Are you sure you want to delete this policy?')) {
            this.policies = this.policies.filter(p => p.id !== policyId);
            this.updatePoliciesList();
            this.addActivity(`Deleted policy: ${policyId}`);
        }
    }

    deletePlan(planId) {
        if (confirm('Are you sure you want to delete this plan?')) {
            this.plans = this.plans.filter(p => p.id !== planId);
            this.updatePlansList();
            this.addActivity(`Deleted plan: ${planId}`);
        }
    }

    clearHistory() {
        if (confirm('Clear all chat history?')) {
            document.getElementById('messages').innerHTML = '';
            this.messages = [];
            this.addActivity('Cleared chat history');
        }
    }

    saveSettings() {
        const endpoint = document.getElementById('apiEndpoint')?.value;
        if (endpoint) {
            localStorage.setItem('apiEndpoint', endpoint);
            this.apiEndpoint = endpoint;
            alert('Settings saved!');
        }
    }

    loadSettings() {
        const endpoint = localStorage.getItem('apiEndpoint');
        const darkMode = localStorage.getItem('darkMode') === 'true';

        if (endpoint) {
            const input = document.getElementById('apiEndpoint');
            if (input) input.value = endpoint;
        }

        if (darkMode) {
            document.body.classList.add('dark-mode');
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = true;
        }
    }

    toggleElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'flex' : 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===================== DOCUMENT UPLOAD & ANALYSIS =====================

    async uploadDocument() {
        const organization = document.getElementById('docOrganization')?.value.trim();
        const title = document.getElementById('docTitle')?.value.trim();
        const type = document.getElementById('docType')?.value || undefined;
        const tagsRaw = document.getElementById('docTags')?.value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

        // Get content from paste or file mode
        const pasteMode = document.getElementById('paste-mode');
        let content = '';
        if (pasteMode && pasteMode.style.display !== 'none') {
            content = document.getElementById('docContent')?.value.trim() || '';
        } else {
            content = document.getElementById('docFileContent')?.value.trim() || '';
        }

        if (!organization || !title || !content) {
            alert('Please fill in Organization, Title, and Document Content.');
            return;
        }

        const body = { organization, title, content };
        if (type) body.type = type;
        if (tags.length) body.tags = tags;

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/documents/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json();

            const resultDiv = document.getElementById('uploadResult');
            const resultContent = document.getElementById('uploadResultContent');
            if (resultDiv && resultContent) {
                const doc = result.artifact || result.document || result;
                resultContent.innerHTML = `
                    <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 16px; font-size:13px;">
                        <strong>ID:</strong><span>${this.escapeHtml(doc.id || 'N/A')}</span>
                        <strong>Title:</strong><span>${this.escapeHtml(doc.title || title)}</span>
                        <strong>Type:</strong><span><span class="status-badge">${this.escapeHtml(doc.type || doc.artifactType || 'auto-detected')}</span></span>
                        <strong>Frameworks Detected:</strong><span>${(doc.mappedFrameworks || doc.detectedFrameworks || []).map(f => `<span class="control-tag">${this.escapeHtml(f)}</span>`).join(' ') || 'None'}</span>
                        <strong>Controls Found:</strong><span>${(doc.extractedControlIds || []).slice(0, 15).map(c => `<span class="control-tag">${this.escapeHtml(c)}</span>`).join(' ') || 'None'}${(doc.extractedControlIds || []).length > 15 ? ` <em>+${doc.extractedControlIds.length - 15} more</em>` : ''}</span>
                    </div>
                `;
                resultDiv.style.display = 'block';
            }
            this.addActivity(`Document uploaded: ${title}`);
        } catch (err) {
            alert(`Upload failed: ${err.message}`);
        }
    }

    async loadDocuments() {
        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/documents`);
            const result = await response.json();
            const docs = result.documents || result || [];
            this._documents = docs;
            this.renderDocumentList(docs);
            this.populateGapDocSelect(docs);
        } catch (err) {
            const el = document.getElementById('documentsList');
            if (el) el.innerHTML = `<p style="color:red;">Failed to load documents: ${err.message}</p>`;
        }
    }

    filterDocuments() {
        const filter = (document.getElementById('docSearchFilter')?.value || '').toLowerCase();
        if (!this._documents) return;
        const filtered = this._documents.filter(d =>
            (d.title || '').toLowerCase().includes(filter) ||
            (d.organization || '').toLowerCase().includes(filter)
        );
        this.renderDocumentList(filtered);
    }

    renderDocumentList(docs) {
        const el = document.getElementById('documentsList');
        if (!el) return;
        if (!docs || docs.length === 0) {
            el.innerHTML = '<p style="color:#666; text-align:center; padding:40px;">No documents found.</p>';
            return;
        }
        el.innerHTML = docs.map(doc => `
            <div class="document-card" style="background:var(--light-gray); padding:14px; border-radius:8px; margin-bottom:10px; border-left:4px solid var(--primary-color);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${this.escapeHtml(doc.title || 'Untitled')}</strong>
                    <span class="status-badge">${this.escapeHtml(doc.type || doc.artifactType || 'unknown')}</span>
                </div>
                <div style="font-size:12px; color:#666; margin-top:4px;">
                    <span>Org: ${this.escapeHtml(doc.organization || 'N/A')}</span>
                    ${(doc.mappedFrameworks || doc.detectedFrameworks || []).length ? ` | Frameworks: ${(doc.mappedFrameworks || doc.detectedFrameworks || []).map(f => `<span class="control-tag">${this.escapeHtml(f)}</span>`).join(' ')}` : ''}
                </div>
                <div style="font-size:11px; color:#999; margin-top:4px;">
                    ID: ${this.escapeHtml(doc.id)} | Ingested: ${doc.ingestedAt ? new Date(doc.ingestedAt).toLocaleDateString() : 'unknown'}
                </div>
            </div>
        `).join('');
    }

    populateGapDocSelect(docs) {
        const select = document.getElementById('gapDocSelect');
        if (!select) return;
        select.innerHTML = '<option value="">-- Select a document --</option>' +
            docs.map(d => `<option value="${this.escapeHtml(d.id)}">${this.escapeHtml(d.title)} (${this.escapeHtml(d.organization || '')})</option>`).join('');
    }

    async runGapAnalysis() {
        const documentId = document.getElementById('gapDocSelect')?.value;
        const frameworkId = document.getElementById('gapFrameworkSelect')?.value;

        if (!documentId || !frameworkId) {
            alert('Please select both a document and a target framework.');
            return;
        }

        const resultDiv = document.getElementById('gapAnalysisResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<p style="color:#666;">Running gap analysis...</p>';
        }

        try {
            const response = await fetch(`${this.apiEndpoint}/api/grc/documentation/gap-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, frameworkId })
            });
            const result = await response.json();

            if (resultDiv) {
                const gaps = result.gaps || [];
                const covered = result.coveredControls || [];
                const total = gaps.length + covered.length;
                const coverage = total > 0 ? Math.round((covered.length / total) * 100) : 0;

                resultDiv.innerHTML = `
                    <div style="background:var(--light-gray); padding:16px; border-radius:8px; border-left:4px solid ${coverage >= 70 ? '#27ae60' : coverage >= 40 ? '#f39c12' : '#e74c3c'};">
                        <h3>Gap Analysis Results</h3>
                        <div style="display:flex; gap:24px; margin:12px 0;">
                            <div><strong style="font-size:24px;">${coverage}%</strong><br><small>Coverage</small></div>
                            <div><strong style="font-size:24px; color:#27ae60;">${covered.length}</strong><br><small>Covered</small></div>
                            <div><strong style="font-size:24px; color:#e74c3c;">${gaps.length}</strong><br><small>Gaps</small></div>
                        </div>
                        ${gaps.length > 0 ? `
                            <h4 style="margin-top:16px;">Identified Gaps</h4>
                            <div style="max-height:300px; overflow-y:auto; margin-top:8px;">
                                ${gaps.slice(0, 50).map(g => `
                                    <div style="padding:6px 10px; margin:4px 0; background:white; border-radius:4px; font-size:12px; border-left:3px solid #e74c3c;">
                                        <strong>${this.escapeHtml(g.controlId || g.id || '')}</strong> — ${this.escapeHtml(g.title || g.description || 'Missing control')}
                                    </div>
                                `).join('')}
                                ${gaps.length > 50 ? `<p style="color:#666;"><em>+${gaps.length - 50} more gaps</em></p>` : ''}
                            </div>
                        ` : '<p style="color:#27ae60; margin-top:12px;">✅ Full coverage — no gaps identified!</p>'}
                    </div>
                `;
            }
            this.addActivity(`Gap analysis completed: ${frameworkId}`);
        } catch (err) {
            if (resultDiv) resultDiv.innerHTML = `<p style="color:red;">Gap analysis failed: ${err.message}</p>`;
        }
    }
}

// Initialize app
const app = new GRCWebApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Expose functions for HTML onclick handlers
function sendMessage() {
    app.sendMessage();
}

function handleQuickAction(action) {
    app.handleQuickAction(action);
}

function clearHistory() {
    app.clearHistory();
}

function saveSettings() {
    app.saveSettings();
}

function toggleElement(id) {
    app.toggleElement(id);
}

// Document page helpers
function switchDocTab(tab) {
    document.querySelectorAll('.doc-tab-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`doc-tab-${tab}`);
    if (target) target.style.display = 'block';
    // Update active tab button
    const parent = target?.closest('.page');
    parent?.querySelectorAll('.doc-tabs .tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab));
    });
    // Auto-load docs when switching to list or gap tab
    if (tab === 'list' || tab === 'gap') {
        app.loadDocuments();
    }
}

function switchUploadMode(mode) {
    const pasteEl = document.getElementById('paste-mode');
    const fileEl = document.getElementById('file-mode');
    const btnPaste = document.getElementById('btn-paste-mode');
    const btnFile = document.getElementById('btn-file-mode');
    if (mode === 'paste') {
        if (pasteEl) pasteEl.style.display = 'block';
        if (fileEl) fileEl.style.display = 'none';
        if (btnPaste) btnPaste.classList.add('active');
        if (btnFile) btnFile.classList.remove('active');
    } else {
        if (pasteEl) pasteEl.style.display = 'none';
        if (fileEl) fileEl.style.display = 'block';
        if (btnPaste) btnPaste.classList.remove('active');
        if (btnFile) btnFile.classList.add('active');
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById('docFileContent').value = content;
        // Auto-fill title from filename if empty
        const titleInput = document.getElementById('docTitle');
        if (titleInput && !titleInput.value) {
            titleInput.value = file.name.replace(/\.[^.]+$/, '');
        }
    };
    reader.readAsText(file);
}

// ===================== CONTROLS PAGE =====================

GRCWebApp.prototype.switchControlsTab = function(tab) {
    document.querySelectorAll('.ctrl-tab-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`ctrl-tab-${tab}`);
    if (target) target.style.display = 'block';
    const parent = target?.closest('.page');
    parent?.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab === 'manage' ? 'manage' : tab === 'create' ? 'add' : 'upload'));
    });
    if (tab === 'manage') this.loadControls();
};

GRCWebApp.prototype.loadControls = async function() {
    const framework = document.getElementById('controlFrameworkFilter')?.value || '';
    const url = framework
        ? `${this.apiEndpoint}/api/grc/controls?framework=${framework}`
        : `${this.apiEndpoint}/api/grc/controls`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        this._controls = data.controls || [];
        this.renderControlsList(this._controls);
        this.populateProcControlSelect(this._controls);
    } catch (err) {
        const el = document.getElementById('controlsList');
        if (el) el.innerHTML = `<p style="color:red;">Failed to load controls: ${err.message}</p>`;
    }
};

GRCWebApp.prototype.filterControls = function() {
    const q = (document.getElementById('controlSearchFilter')?.value || '').toLowerCase();
    if (!this._controls) return;
    const filtered = this._controls.filter(c =>
        (c.title || c.frameworkControlId || '').toLowerCase().includes(q) ||
        (c.organization || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
    this.renderControlsList(filtered);
};

GRCWebApp.prototype.renderControlsList = function(controls) {
    const el = document.getElementById('controlsList');
    if (!el) return;
    if (!controls || controls.length === 0) {
        el.innerHTML = '<p class="empty-state">No controls found. Add your first control implementation.</p>';
        return;
    }
    el.innerHTML = controls.map(ctrl => {
        const statusColor = ctrl.status === 'implemented' ? '#27ae60' :
            ctrl.status === 'partially-implemented' ? '#f39c12' :
            ctrl.status === 'planned' ? '#3498db' : '#e74c3c';
        return `
        <div class="document-card" style="background:var(--light-gray); padding:14px; border-radius:8px; margin-bottom:10px; border-left:4px solid ${statusColor};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${this.escapeHtml(ctrl.frameworkControlId || '')} — ${this.escapeHtml(ctrl.title || 'Untitled')}</strong>
                <span class="status-badge" style="background:${statusColor}; color:white;">${this.escapeHtml(ctrl.status || 'unknown')}</span>
            </div>
            <div style="font-size:12px; color:#666; margin-top:4px;">
                Framework: ${this.escapeHtml(ctrl.framework || '')} | Org: ${this.escapeHtml(ctrl.organization || '')}
                ${ctrl.owner ? ` | Owner: ${this.escapeHtml(ctrl.owner)}` : ''}
            </div>
            ${ctrl.description ? `<div style="font-size:12px; margin-top:6px;">${this.escapeHtml(ctrl.description).substring(0, 150)}${ctrl.description.length > 150 ? '...' : ''}</div>` : ''}
            <div style="margin-top:8px; display:flex; gap:8px;">
                <button class="btn btn-small" onclick="app.viewControlDetail('${ctrl.id}')">View</button>
                <button class="btn btn-small btn-danger" onclick="app.deleteControl('${ctrl.id}')">Delete</button>
            </div>
        </div>`;
    }).join('');
};

GRCWebApp.prototype.createControl = async function() {
    const organization = document.getElementById('ctrlOrganization')?.value.trim();
    const framework = document.getElementById('ctrlFramework')?.value;
    const frameworkControlId = document.getElementById('ctrlControlId')?.value.trim();
    const title = document.getElementById('ctrlTitle')?.value.trim();
    const description = document.getElementById('ctrlDescription')?.value.trim();
    const status = document.getElementById('ctrlStatus')?.value;
    const evidence = document.getElementById('ctrlEvidence')?.value.trim();
    const owner = document.getElementById('ctrlOwner')?.value.trim();

    if (!organization || !framework || !frameworkControlId || !title) {
        alert('Please fill in Organization, Framework, Control ID, and Title.');
        return;
    }

    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/controls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organization, framework, frameworkControlId, title, description, status, evidence, owner })
        });
        const data = await response.json();
        const resultDiv = document.getElementById('createControlResult');
        if (data.success && resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `✅ Control registered: <strong>${this.escapeHtml(frameworkControlId)}</strong> — ${this.escapeHtml(title)}`;
            this.addActivity(`Control created: ${frameworkControlId} - ${title}`);
        }
    } catch (err) {
        alert('Failed to create control: ' + err.message);
    }
};

GRCWebApp.prototype.uploadControlEvidence = async function() {
    const organization = document.getElementById('ctrlUploadOrg')?.value.trim();
    const framework = document.getElementById('ctrlUploadFramework')?.value || undefined;
    const content = document.getElementById('ctrlUploadContent')?.value.trim();

    if (!organization || !content) {
        alert('Please provide Organization and Content.');
        return;
    }

    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/documents/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organization,
                title: `Control Evidence - ${organization}`,
                content,
                type: 'policy',
                tags: ['control-evidence', framework || 'auto-detect']
            })
        });
        const result = await response.json();
        const resultDiv = document.getElementById('ctrlUploadResult');
        if (resultDiv) {
            const doc = result.artifact || result;
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h4>✅ Control Evidence Analyzed</h4>
                <div style="margin-top:8px; font-size:13px;">
                    <p><strong>Type Detected:</strong> ${this.escapeHtml(doc.type || doc.artifactType || 'policy')}</p>
                    <p><strong>Frameworks Detected:</strong> ${(doc.mappedFrameworks || doc.detectedFrameworks || []).map(f => `<span class="control-tag">${this.escapeHtml(f)}</span>`).join(' ') || 'None'}</p>
                    <p><strong>Controls Extracted:</strong> ${(doc.extractedControlIds || []).slice(0, 20).map(c => `<span class="control-tag">${this.escapeHtml(c)}</span>`).join(' ') || 'None'}</p>
                </div>
            `;
            this.addActivity(`Control evidence uploaded for ${organization}`);
        }
    } catch (err) {
        alert('Upload failed: ' + err.message);
    }
};

GRCWebApp.prototype.viewControlDetail = async function(id) {
    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/controls/${id}`);
        const data = await response.json();
        if (data.success && data.control) {
            const c = data.control;
            alert(`Control: ${c.frameworkControlId}\nTitle: ${c.title}\nStatus: ${c.status}\nFramework: ${c.framework}\nOrg: ${c.organization}\nDescription: ${c.description || 'N/A'}\nOwner: ${c.owner || 'N/A'}\nEvidence: ${c.evidence || 'N/A'}`);
        }
    } catch (err) {
        alert('Failed to load control details.');
    }
};

GRCWebApp.prototype.deleteControl = async function(id) {
    if (!confirm('Delete this control implementation?')) return;
    try {
        await fetch(`${this.apiEndpoint}/api/grc/controls/${id}`, { method: 'DELETE' });
        this.loadControls();
        this.addActivity(`Control deleted: ${id}`);
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
};

// ===================== PROCEDURES PAGE =====================

GRCWebApp.prototype.switchProceduresTab = function(tab) {
    document.querySelectorAll('.proc-tab-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`proc-tab-${tab}`);
    if (target) target.style.display = 'block';
    const parent = target?.closest('.page');
    parent?.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab === 'list' ? 'procedures' : tab === 'create' ? 'create' : 'upload'));
    });
    if (tab === 'list') this.loadProcedures();
};

GRCWebApp.prototype.populateProcControlSelect = function(controls) {
    const select = document.getElementById('procControlId');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select a control --</option>' +
        (controls || []).map(c => `<option value="${this.escapeHtml(c.id)}">${this.escapeHtml(c.frameworkControlId)} — ${this.escapeHtml(c.title)} (${this.escapeHtml(c.organization || '')})</option>`).join('');
};

GRCWebApp.prototype.loadProcedures = async function() {
    // First get all controls, then get procedures for each
    try {
        const ctrlResp = await fetch(`${this.apiEndpoint}/api/grc/controls`);
        const ctrlData = await ctrlResp.json();
        const controls = ctrlData.controls || [];
        this._controls = controls;
        this.populateProcControlSelect(controls);

        let allProcedures = [];
        for (const ctrl of controls) {
            try {
                const procResp = await fetch(`${this.apiEndpoint}/api/grc/controls/${ctrl.id}/procedures`);
                const procData = await procResp.json();
                const procs = (procData.procedures || []).map(p => ({ ...p, _controlTitle: ctrl.title, _controlId: ctrl.frameworkControlId }));
                allProcedures = allProcedures.concat(procs);
            } catch (e) { /* skip */ }
        }
        this._procedures = allProcedures;
        this.renderProceduresList(allProcedures);
    } catch (err) {
        const el = document.getElementById('proceduresList');
        if (el) el.innerHTML = `<p style="color:red;">Failed to load: ${err.message}</p>`;
    }
};

GRCWebApp.prototype.filterProcedures = function() {
    const q = (document.getElementById('procSearchFilter')?.value || '').toLowerCase();
    if (!this._procedures) return;
    const filtered = this._procedures.filter(p =>
        (p.procedureName || '').toLowerCase().includes(q) ||
        (p._controlId || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
    this.renderProceduresList(filtered);
};

GRCWebApp.prototype.renderProceduresList = function(procedures) {
    const el = document.getElementById('proceduresList');
    if (!el) return;
    if (!procedures || procedures.length === 0) {
        el.innerHTML = '<p class="empty-state">No procedures found. Create one or load controls first.</p>';
        return;
    }
    el.innerHTML = procedures.map(proc => `
        <div class="document-card" style="background:var(--light-gray); padding:14px; border-radius:8px; margin-bottom:10px; border-left:4px solid #8e44ad;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${this.escapeHtml(proc.procedureName || 'Untitled Procedure')}</strong>
                <span class="status-badge" style="background:#8e44ad; color:white;">${this.escapeHtml(proc.frequency || 'N/A')}</span>
            </div>
            <div style="font-size:12px; color:#666; margin-top:4px;">
                Control: ${this.escapeHtml(proc._controlId || 'N/A')} — ${this.escapeHtml(proc._controlTitle || '')}
                ${proc.owner ? ` | Owner: ${this.escapeHtml(proc.owner)}` : ''}
            </div>
            ${proc.steps && proc.steps.length > 0 ? `<div style="font-size:11px; margin-top:6px; color:#555;">${proc.steps.length} steps defined</div>` : ''}
            <div style="margin-top:8px; display:flex; gap:8px;">
                <button class="btn btn-small btn-danger" onclick="app.deleteProcedure('${proc.id}')">Delete</button>
            </div>
        </div>
    `).join('');
};

GRCWebApp.prototype.createProcedure = async function() {
    const controlId = document.getElementById('procControlId')?.value;
    const procedureName = document.getElementById('procName')?.value.trim();
    const description = document.getElementById('procDescription')?.value.trim();
    const frequency = document.getElementById('procFrequency')?.value;
    const owner = document.getElementById('procOwner')?.value.trim();
    const stepsRaw = document.getElementById('procSteps')?.value.trim();
    const steps = stepsRaw ? stepsRaw.split('\n').filter(Boolean).map((s, i) => ({
        stepNumber: i + 1,
        description: s.replace(/^Step\s*\d+[:\s]*/i, '').trim(),
        responsible: owner || 'TBD'
    })) : [];

    if (!controlId || !procedureName || !frequency) {
        alert('Please select a control, provide a name, and select frequency.');
        return;
    }

    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/controls/${controlId}/procedures`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ procedureName, description, frequency, owner, steps })
        });
        const data = await response.json();
        const resultDiv = document.getElementById('createProcResult');
        if (data.success && resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `✅ Procedure created: <strong>${this.escapeHtml(procedureName)}</strong> (${frequency})`;
            this.addActivity(`Procedure created: ${procedureName}`);
        } else if (!data.success) {
            alert('Error: ' + (data.error || 'Unknown'));
        }
    } catch (err) {
        alert('Failed to create procedure: ' + err.message);
    }
};

GRCWebApp.prototype.uploadProcedureDoc = async function() {
    const organization = document.getElementById('procUploadOrg')?.value.trim();
    const title = document.getElementById('procUploadTitle')?.value.trim();
    const content = document.getElementById('procUploadContent')?.value.trim();

    if (!organization || !title || !content) {
        alert('Please fill in Organization, Title, and Content.');
        return;
    }

    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/documents/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organization, title, content, type: 'procedure', tags: ['procedure'] })
        });
        const result = await response.json();
        const resultDiv = document.getElementById('procUploadResult');
        if (resultDiv) {
            const doc = result.artifact || result;
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h4>✅ Procedure Document Analyzed</h4>
                <div style="margin-top:8px; font-size:13px;">
                    <p><strong>Type:</strong> ${this.escapeHtml(doc.type || doc.artifactType || 'procedure')}</p>
                    <p><strong>Frameworks Detected:</strong> ${(doc.mappedFrameworks || doc.detectedFrameworks || []).map(f => `<span class="control-tag">${this.escapeHtml(f)}</span>`).join(' ') || 'None'}</p>
                    <p><strong>Controls Referenced:</strong> ${(doc.extractedControlIds || []).slice(0, 15).map(c => `<span class="control-tag">${this.escapeHtml(c)}</span>`).join(' ') || 'None'}</p>
                </div>
            `;
            this.addActivity(`Procedure doc uploaded: ${title}`);
        }
    } catch (err) {
        alert('Upload failed: ' + err.message);
    }
};

GRCWebApp.prototype.deleteProcedure = async function(id) {
    if (!confirm('Delete this procedure?')) return;
    try {
        await fetch(`${this.apiEndpoint}/api/grc/procedures/${id}`, { method: 'DELETE' });
        this.loadProcedures();
        this.addActivity(`Procedure deleted: ${id}`);
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
};

// ===================== CONTINUITY PAGE =====================

GRCWebApp.prototype._bcTests = [];

GRCWebApp.prototype.switchContinuityTab = function(tab) {
    document.querySelectorAll('.bc-tab-content').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`bc-tab-${tab}`);
    if (target) target.style.display = 'block';
    const parent = target?.closest('.page');
    parent?.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        const isActive = (tab === 'overview' && text.includes('overview')) ||
            (tab === 'generate' && text.includes('generate')) ||
            (tab === 'upload' && text.includes('upload')) ||
            (tab === 'test' && text.includes('test'));
        btn.classList.toggle('active', isActive);
    });
    if (tab === 'overview') this.loadBCPlans();
};

GRCWebApp.prototype.loadBCPlans = async function() {
    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/plans`);
        const data = await response.json();
        const allPlans = data.plans || [];
        // Filter for BC/DR related plans
        const bcPlans = allPlans.filter(p =>
            (p.type || '').match(/bcdr|bcp|drp|continuity|disaster|failover/i) ||
            (p.title || '').match(/continuity|disaster|recovery|failover|bcdr|bcp|drp/i)
        );
        document.getElementById('bcPlansCount').textContent = bcPlans.length;
        document.getElementById('bcTestsCount').textContent = this._bcTests?.length || 0;

        const el = document.getElementById('bcPlansList');
        if (!el) return;
        if (bcPlans.length === 0) {
            el.innerHTML = '<p class="empty-state">No BC/DR plans found. Generate or upload one to get started.</p>';
            return;
        }
        el.innerHTML = bcPlans.map(plan => `
            <div class="document-card" style="background:var(--light-gray); padding:14px; border-radius:8px; margin-bottom:10px; border-left:4px solid #2980b9;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${this.escapeHtml(plan.title || 'Untitled Plan')}</strong>
                    <span class="status-badge" style="background:#2980b9; color:white;">${this.escapeHtml(plan.type || 'BCDR')}</span>
                </div>
                <div style="font-size:12px; color:#666; margin-top:4px;">ID: ${this.escapeHtml(plan.id || '')}</div>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('bcPlansList').innerHTML = `<p style="color:red;">Failed to load plans: ${err.message}</p>`;
    }
};

GRCWebApp.prototype.generateBCPlan = async function() {
    const organization = document.getElementById('bcOrganization')?.value.trim();
    const planType = document.getElementById('bcPlanType')?.value;
    const title = document.getElementById('bcTitle')?.value.trim();
    const rto = document.getElementById('bcRTO')?.value.trim();
    const rpo = document.getElementById('bcRPO')?.value.trim();
    const frameworks = Array.from(document.getElementById('bcFrameworks')?.selectedOptions || []).map(o => o.value);
    const criticalSystems = document.getElementById('bcCriticalSystems')?.value.trim();

    if (!organization || !title) {
        alert('Please fill in Organization and Title.');
        return;
    }

    const message = `Generate a ${planType} plan titled "${title}" for ${organization} aligned with ${frameworks.join(', ')}. RTO: ${rto || 'TBD'}. RPO: ${rpo || 'TBD'}. Critical systems: ${criticalSystems || 'Not specified'}.`;

    try {
        const response = await fetch(`${this.apiEndpoint}/api/grc/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        const resultDiv = document.getElementById('bcGenerateResult');
        if (data.success && resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h4>✅ BC/DR Plan Generated</h4>
                <div style="margin-top:8px; white-space:pre-wrap; font-size:13px; max-height:400px; overflow-y:auto; background:white; padding:12px; border-radius:6px;">${this.escapeHtml(data.response || 'Plan generated successfully.')}</div>
            `;
            if (rto) document.getElementById('bcRtoTarget').textContent = rto;
            if (rpo) document.getElementById('bcRpoTarget').textContent = rpo;
            this.addActivity(`BC/DR plan generated: ${title}`);
            this.stats.plans++;
        }
    } catch (err) {
        alert('Plan generation failed: ' + err.message);
    }
};

GRCWebApp.prototype.uploadBCDoc = async function() {
    const organization = document.getElementById('bcUploadOrg')?.value.trim();
    const title = document.getElementById('bcUploadTitle')?.value.trim();
    const framework = document.getElementById('bcUploadFramework')?.value;
    const content = document.getElementById('bcUploadContent')?.value.trim();

    if (!organization || !title || !content) {
        alert('Please fill in Organization, Title, and Content.');
        return;
    }

    try {
        // First ingest the document
        const ingestResp = await fetch(`${this.apiEndpoint}/api/grc/documents/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organization, title, content, type: 'security-plan', tags: ['bcdr', 'continuity', 'disaster-recovery'] })
        });
        const ingestResult = await ingestResp.json();
        const doc = ingestResult.artifact || ingestResult;

        // Then run gap analysis against the selected framework
        let gapHtml = '';
        if (doc.id) {
            try {
                const gapResp = await fetch(`${this.apiEndpoint}/api/grc/documentation/gap-analysis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId: doc.id, frameworkId: framework })
                });
                const gapResult = await gapResp.json();
                const gaps = gapResult.gaps || [];
                const covered = gapResult.coveredControls || [];
                const total = gaps.length + covered.length;
                const coverage = total > 0 ? Math.round((covered.length / total) * 100) : 0;
                gapHtml = `
                    <h4 style="margin-top:16px;">Gap Analysis vs ${framework}</h4>
                    <div style="display:flex; gap:16px; margin:8px 0;">
                        <div><strong style="font-size:20px;">${coverage}%</strong> Coverage</div>
                        <div><strong style="color:#27ae60;">${covered.length}</strong> Covered</div>
                        <div><strong style="color:#e74c3c;">${gaps.length}</strong> Gaps</div>
                    </div>
                    ${gaps.length > 0 ? `<div style="max-height:200px; overflow-y:auto;">${gaps.slice(0, 20).map(g => `<div style="font-size:12px; padding:4px 8px; margin:2px 0; background:white; border-radius:4px; border-left:3px solid #e74c3c;"><strong>${this.escapeHtml(g.controlId || g.id || '')}</strong> — ${this.escapeHtml(g.title || g.description || '')}</div>`).join('')}</div>` : '<p style="color:#27ae60;">Full coverage!</p>'}
                `;
            } catch (e) { /* gap analysis optional */ }
        }

        const resultDiv = document.getElementById('bcUploadResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h4>✅ BC/DR Document Ingested & Analyzed</h4>
                <div style="margin-top:8px; font-size:13px;">
                    <p><strong>Frameworks Detected:</strong> ${(doc.mappedFrameworks || doc.detectedFrameworks || []).map(f => `<span class="control-tag">${this.escapeHtml(f)}</span>`).join(' ') || 'None'}</p>
                    <p><strong>Controls Found:</strong> ${(doc.extractedControlIds || []).slice(0, 15).map(c => `<span class="control-tag">${this.escapeHtml(c)}</span>`).join(' ') || 'None'}</p>
                </div>
                ${gapHtml}
            `;
            this.addActivity(`BC/DR document uploaded: ${title}`);
        }
    } catch (err) {
        alert('Upload failed: ' + err.message);
    }
};

GRCWebApp.prototype.recordBCTest = function() {
    const testType = document.getElementById('testType')?.value;
    const testDate = document.getElementById('testDate')?.value;
    const scenario = document.getElementById('testScenario')?.value.trim();
    const participants = document.getElementById('testParticipants')?.value.trim();
    const results = document.getElementById('testResults')?.value.trim();
    const lessons = document.getElementById('testLessons')?.value.trim();

    if (!testType || !scenario) {
        alert('Please provide at least a test type and scenario.');
        return;
    }

    const test = {
        id: 'test-' + Date.now(),
        type: testType,
        date: testDate || new Date().toISOString().split('T')[0],
        scenario,
        participants,
        results,
        lessons,
        recordedAt: new Date().toISOString()
    };

    if (!this._bcTests) this._bcTests = [];
    this._bcTests.push(test);

    const resultDiv = document.getElementById('bcTestResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `✅ Test recorded: <strong>${this.escapeHtml(testType)}</strong> on ${test.date}`;
    }

    document.getElementById('bcTestsCount').textContent = this._bcTests.length;
    this.renderBCTestHistory();
    this.addActivity(`BC test recorded: ${testType} - ${scenario.substring(0, 50)}`);

    // Also record as an improvement insight
    fetch(`${this.apiEndpoint}/api/grc/improvement/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: 'bc-test',
            description: `${testType} exercise: ${scenario}`,
            recommendation: lessons || results || 'Review results',
            priority: 'medium',
            source: 'continuity-testing'
        })
    }).catch(() => {});
};

GRCWebApp.prototype.renderBCTestHistory = function() {
    const el = document.getElementById('bcTestHistory');
    if (!el || !this._bcTests || this._bcTests.length === 0) return;
    el.innerHTML = `<h4>Test History</h4>` + this._bcTests.slice().reverse().map(t => `
        <div style="background:var(--light-gray); padding:10px; border-radius:6px; margin-top:8px; border-left:4px solid #2980b9; font-size:13px;">
            <strong>${this.escapeHtml(t.type)}</strong> — ${this.escapeHtml(t.date)}
            <div style="color:#666; margin-top:4px;">${this.escapeHtml(t.scenario)}</div>
            ${t.results ? `<div style="margin-top:4px;"><em>Results:</em> ${this.escapeHtml(t.results).substring(0, 100)}</div>` : ''}
        </div>
    `).join('');
};

// ===== POLICY MODULE: Upload, Gap Assessment, CAP/POA&M =====

GRCWebApp.prototype._policyDocs = [];

GRCWebApp.prototype.switchPolicyTab = function(tab) {
    document.querySelectorAll('.pol-tab-content').forEach(el => el.style.display = 'none');
    document.querySelector('#policies-page .tabs')?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById('pol-tab-' + tab);
    if (target) target.style.display = 'block';
    event.target.classList.add('active');
    if (tab === 'library') this.loadPolicyLibrary();
    if (tab === 'gap') this.populatePolicyGapDropdown();
};

GRCWebApp.prototype.switchPolUploadMode = function(mode) {
    document.getElementById('pol-paste-mode').style.display = mode === 'paste' ? 'block' : 'none';
    document.getElementById('pol-file-mode').style.display = mode === 'file' ? 'block' : 'none';
    document.getElementById('pol-btn-paste').classList.toggle('active', mode === 'paste');
    document.getElementById('pol-btn-file').classList.toggle('active', mode === 'file');
};

GRCWebApp.prototype.handlePolFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('polUploadFileContent').value = e.target.result;
    };
    reader.readAsText(file);
};

GRCWebApp.prototype.uploadAndAssessPolicy = async function() {
    const org = document.getElementById('polUploadOrg').value.trim();
    const title = document.getElementById('polUploadTitle').value.trim();
    const framework = document.getElementById('polUploadFramework').value;
    const content = document.getElementById('polUploadContent').value.trim() || document.getElementById('polUploadFileContent').value.trim();
    const resultDiv = document.getElementById('polUploadResult');

    if (!title || !content) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:red;">⚠️ Please provide a title and document content.</div>';
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#2980b9;">⏳ Uploading and assessing policy document...</div>';

    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/documents/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: content,
                type: 'policy',
                organization: org,
                frameworks: [framework]
            })
        });
        const data = await resp.json();

        // Store locally for gap dropdown
        this._policyDocs.push({ id: data.document?.id || Date.now().toString(), title, framework, content });

        resultDiv.innerHTML = `
            <div style="background:#d4edda; border:1px solid #c3e6cb; border-radius:8px; padding:16px;">
                <h4 style="color:#155724;">✅ Policy Uploaded & Assessed</h4>
                <p><strong>Title:</strong> ${this.escapeHtml(title)}</p>
                <p><strong>Framework:</strong> ${framework}</p>
                <p><strong>Type Detected:</strong> ${data.document?.type || 'policy'}</p>
                <p><strong>Controls Mapped:</strong> ${(data.document?.controlIds || []).length}</p>
                ${data.document?.controlIds?.length ? `<p style="font-size:12px; color:#666;">Controls: ${data.document.controlIds.join(', ')}</p>` : ''}
                <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.05); border-radius:6px;">
                    <strong>Next Steps:</strong> Go to the <em>Gap Assessment</em> tab to analyze gaps, then <em>CAP & POA&M</em> to generate remediation plans.
                </div>
            </div>`;
        this.addActivity(`Policy uploaded: ${title}`);
    } catch (err) {
        resultDiv.innerHTML = `<div style="color:red;">❌ Upload failed: ${err.message}</div>`;
    }
};

GRCWebApp.prototype.populatePolicyGapDropdown = function() {
    const sel = document.getElementById('polGapDocSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select a policy document --</option>';
    this._policyDocs.forEach((doc, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = doc.title + ' (' + doc.framework + ')';
        sel.appendChild(opt);
    });
};

GRCWebApp.prototype.runPolicyGapAssessment = async function() {
    const docIdx = document.getElementById('polGapDocSelect').value;
    const framework = document.getElementById('polGapFramework').value;
    const resultDiv = document.getElementById('polGapResult');

    if (docIdx === '' || !this._policyDocs[docIdx]) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:red;">⚠️ Please select a policy document first.</div>';
        return;
    }

    const doc = this._policyDocs[docIdx];
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#2980b9;">⏳ Running gap assessment...</div>';

    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/documentation/gap-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentContent: doc.content,
                framework: framework,
                documentType: 'policy',
                title: doc.title
            })
        });
        const data = await resp.json();
        const gaps = data.gaps || data.analysis?.gaps || [];
        const gapText = gaps.map(g => typeof g === 'string' ? g : `${g.controlId || g.control || ''} — ${g.description || g.gap || g.finding || ''}`).join('\n');

        // Auto-populate CAP tab
        const capGapsEl = document.getElementById('polCapGaps');
        if (capGapsEl && gapText) capGapsEl.value = gapText;

        resultDiv.innerHTML = `
            <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:16px;">
                <h4 style="color:#856404;">🔍 Gap Assessment Results</h4>
                <p><strong>Policy:</strong> ${this.escapeHtml(doc.title)}</p>
                <p><strong>Framework:</strong> ${framework}</p>
                <p><strong>Gaps Found:</strong> ${gaps.length}</p>
                <div style="margin-top:12px; max-height:300px; overflow-y:auto;">
                    ${gaps.length > 0 ? gaps.map((g, i) => `
                        <div style="background:white; padding:10px; border-radius:6px; margin-top:8px; border-left:4px solid #e74c3c; font-size:13px;">
                            <strong>${typeof g === 'string' ? g : (g.controlId || g.control || 'Gap ' + (i+1))}</strong>
                            ${typeof g !== 'string' ? `<div style="color:#666; margin-top:4px;">${this.escapeHtml(g.description || g.gap || g.finding || '')}</div>` : ''}
                            ${g.recommendation ? `<div style="color:#27ae60; margin-top:4px;"><em>Recommendation:</em> ${this.escapeHtml(g.recommendation)}</div>` : ''}
                        </div>
                    `).join('') : '<p style="color:#155724;">No gaps found — policy appears compliant.</p>'}
                </div>
                ${gaps.length > 0 ? `<div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.05); border-radius:6px;">
                    <strong>Next:</strong> Gaps have been auto-loaded into the <em>CAP & POA&M</em> tab. Click it to generate remediation plans.
                </div>` : ''}
            </div>`;
        this.addActivity(`Gap assessment: ${doc.title} vs ${framework} — ${gaps.length} gaps`);
    } catch (err) {
        resultDiv.innerHTML = `<div style="color:red;">❌ Gap assessment failed: ${err.message}</div>`;
    }
};

GRCWebApp.prototype.generatePolicyCAP = async function() {
    const org = document.getElementById('polCapOrg').value.trim() || 'Organization';
    const type = document.getElementById('polCapType').value;
    const framework = document.getElementById('polCapFramework').value;
    const gaps = document.getElementById('polCapGaps').value.trim();
    const timeline = document.getElementById('polCapTimeline').value;
    const resultDiv = document.getElementById('polCapResult');

    if (!gaps) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:red;">⚠️ Please provide gaps. Run a Gap Assessment first or enter gaps manually.</div>';
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#2980b9;">⏳ Generating ' + (type === 'both' ? 'CAP and POA&M' : type.toUpperCase()) + '...</div>';

    const typeLabel = type === 'cap' ? 'Corrective Action Plan' : type === 'poam' ? 'Plan of Action & Milestones' : 'Corrective Action Plan and Plan of Action & Milestones';
    const prompt = `Generate a detailed ${typeLabel} for ${org} based on the following compliance gaps identified against the ${framework} framework.

Timeline: ${timeline} days for remediation.

Identified Gaps:
${gaps}

For each gap, provide:
1. Finding ID and description
2. Risk level (Critical/High/Medium/Low)
3. Responsible party/role
4. Remediation actions (specific, actionable steps)
5. Target completion date (phased within ${timeline}-day window)
6. Resources required
7. Success criteria / evidence of completion
${type === 'poam' || type === 'both' ? '\nFor POA&M specifically include: Milestone checkpoints, scheduled status review dates, and acceptance criteria.' : ''}
${type === 'cap' || type === 'both' ? '\nFor CAP specifically include: Root cause for each gap, corrective actions, preventive actions, and verification method.' : ''}

Format as a professional document ready for compliance review.`;

    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const data = await resp.json();
        const response = data.response || data.message || 'No response generated';

        resultDiv.innerHTML = `
            <div style="background:#d1ecf1; border:1px solid #bee5eb; border-radius:8px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color:#0c5460;">📋 ${this.escapeHtml(typeLabel)}</h4>
                    <button class="btn btn-primary" style="font-size:12px; padding:6px 12px;" onclick="app.exportCAP('policy', '${type}')">📥 Export</button>
                </div>
                <p style="font-size:12px; color:#666; margin-bottom:12px;">${org} | ${framework} | ${timeline}-day timeline</p>
                <div style="background:white; padding:16px; border-radius:6px; max-height:500px; overflow-y:auto; white-space:pre-wrap; font-family:system-ui; font-size:13px; line-height:1.6;">${this.escapeHtml(response)}</div>
            </div>`;
        this._lastCAPResult = { type, content: response, org, framework, timeline };
        this.addActivity(`Generated ${type.toUpperCase()} for policy gaps (${framework})`);
    } catch (err) {
        resultDiv.innerHTML = `<div style="color:red;">❌ Generation failed: ${err.message}</div>`;
    }
};

GRCWebApp.prototype.loadPolicyLibrary = async function() {
    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/policies`);
        const data = await resp.json();
        const list = document.getElementById('policiesList');
        if (!list) return;
        const policies = data.policies || [];
        if (policies.length === 0) {
            list.innerHTML = '<p class="empty-state">No policies yet. Upload or generate one to get started.</p>';
            return;
        }
        list.innerHTML = policies.map(p => `
            <div style="background:var(--light-gray); padding:12px; border-radius:8px; margin-bottom:8px; border-left:4px solid var(--primary-color);">
                <strong>${this.escapeHtml(p.title || p.id)}</strong>
                <div style="font-size:12px; color:#666; margin-top:4px;">${p.frameworks?.join(', ') || ''} | ${p.createdAt || ''}</div>
            </div>`).join('');
    } catch (err) {
        console.error('Failed to load policies:', err);
    }
};

GRCWebApp.prototype.filterPolicyLibrary = function() {
    // Simple client-side filter
    const filter = (document.getElementById('polLibraryFilter')?.value || '').toLowerCase();
    document.querySelectorAll('#policiesList > div').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
};

// ===== PLAN MODULE: Upload, Gap Assessment, CAP/POA&M =====

GRCWebApp.prototype._planDocs = [];

GRCWebApp.prototype.switchPlanTab = function(tab) {
    document.querySelectorAll('.plan-tab-content').forEach(el => el.style.display = 'none');
    document.querySelector('#plans-page .tabs')?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById('plan-tab-' + tab);
    if (target) target.style.display = 'block';
    event.target.classList.add('active');
    if (tab === 'library') this.loadPlanLibrary();
    if (tab === 'gap') this.populatePlanGapDropdown();
};

GRCWebApp.prototype.switchPlanUploadMode = function(mode) {
    document.getElementById('plan-paste-mode').style.display = mode === 'paste' ? 'block' : 'none';
    document.getElementById('plan-file-mode').style.display = mode === 'file' ? 'block' : 'none';
    document.getElementById('plan-btn-paste').classList.toggle('active', mode === 'paste');
    document.getElementById('plan-btn-file').classList.toggle('active', mode === 'file');
};

GRCWebApp.prototype.handlePlanFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('planUploadFileContent').value = e.target.result;
    };
    reader.readAsText(file);
};

GRCWebApp.prototype.uploadAndAssessPlan = async function() {
    const org = document.getElementById('planUploadOrg').value.trim();
    const title = document.getElementById('planUploadTitle').value.trim();
    const planType = document.getElementById('planUploadType').value;
    const framework = document.getElementById('planUploadFramework').value;
    const content = document.getElementById('planUploadContent').value.trim() || document.getElementById('planUploadFileContent').value.trim();
    const resultDiv = document.getElementById('planUploadResult');

    if (!title || !content) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:red;">⚠️ Please provide a title and document content.</div>';
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#2980b9;">⏳ Uploading and assessing plan document...</div>';

    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/documents/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: content,
                type: planType || 'security-plan',
                organization: org,
                frameworks: [framework]
            })
        });
        const data = await resp.json();

        this._planDocs.push({ id: data.document?.id || Date.now().toString(), title, framework, content, planType });

        resultDiv.innerHTML = `
            <div style="background:#d4edda; border:1px solid #c3e6cb; border-radius:8px; padding:16px;">
                <h4 style="color:#155724;">✅ Plan Uploaded & Assessed</h4>
                <p><strong>Title:</strong> ${this.escapeHtml(title)}</p>
                <p><strong>Type:</strong> ${planType || 'Auto-detected'}</p>
                <p><strong>Framework:</strong> ${framework}</p>
                <p><strong>Controls Mapped:</strong> ${(data.document?.controlIds || []).length}</p>
                ${data.document?.controlIds?.length ? `<p style="font-size:12px; color:#666;">Controls: ${data.document.controlIds.join(', ')}</p>` : ''}
                <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.05); border-radius:6px;">
                    <strong>Next Steps:</strong> Go to <em>Gap Assessment</em> tab to analyze gaps, then <em>CAP & POA&M</em> to generate remediation plans.
                </div>
            </div>`;
        this.addActivity(`Plan uploaded: ${title}`);
    } catch (err) {
        resultDiv.innerHTML = `<div style="color:red;">❌ Upload failed: ${err.message}</div>`;
    }
};

GRCWebApp.prototype.populatePlanGapDropdown = function() {
    const sel = document.getElementById('planGapDocSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select a plan document --</option>';
    this._planDocs.forEach((doc, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = doc.title + ' (' + doc.framework + ')';
        sel.appendChild(opt);
    });
};

GRCWebApp.prototype.runPlanGapAssessment = async function() {
    const docIdx = document.getElementById('planGapDocSelect').value;
    const framework = document.getElementById('planGapFramework').value;
    const resultDiv = document.getElementById('planGapResult');

    if (docIdx === '' || !this._planDocs[docIdx]) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:red;">⚠️ Please select a plan document first.</div>';
        return;
    }

    const doc = this._planDocs[docIdx];
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#2980b9;">⏳ Running gap assessment on plan...</div>';

    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/documentation/gap-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentContent: doc.content,
                framework: framework,
                documentType: doc.planType || 'security-plan',
                title: doc.title
            })
        });
        const data = await resp.json();
        const gaps = data.gaps || data.analysis?.gaps || [];
        const gapText = gaps.map(g => typeof g === 'string' ? g : `${g.controlId || g.control || ''} — ${g.description || g.gap || g.finding || ''}`).join('\n');

        const capGapsEl = document.getElementById('planCapGaps');
        if (capGapsEl && gapText) capGapsEl.value = gapText;

        resultDiv.innerHTML = `
            <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:16px;">
                <h4 style="color:#856404;">🔍 Plan Gap Assessment Results</h4>
                <p><strong>Plan:</strong> ${this.escapeHtml(doc.title)}</p>
                <p><strong>Framework:</strong> ${framework}</p>
                <p><strong>Gaps Found:</strong> ${gaps.length}</p>
                <div style="margin-top:12px; max-height:300px; overflow-y:auto;">
                    ${gaps.length > 0 ? gaps.map((g, i) => `
                        <div style="background:white; padding:10px; border-radius:6px; margin-top:8px; border-left:4px solid #e74c3c; font-size:13px;">
                            <strong>${typeof g === 'string' ? g : (g.controlId || g.control || 'Gap ' + (i+1))}</strong>
                            ${typeof g !== 'string' ? `<div style="color:#666; margin-top:4px;">${this.escapeHtml(g.description || g.gap || g.finding || '')}</div>` : ''}
                            ${g.recommendation ? `<div style="color:#27ae60; margin-top:4px;"><em>Recommendation:</em> ${this.escapeHtml(g.recommendation)}</div>` : ''}
                        </div>
                    `).join('') : '<p style="color:#155724;">No gaps found — plan appears compliant.</p>'}
                </div>
                ${gaps.length > 0 ? `<div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.05); border-radius:6px;">
                    <strong>Next:</strong> Gaps auto-loaded into <em>CAP & POA&M</em> tab. Go generate your remediation plan.
                </div>` : ''}
            </div>`;
        this.addActivity(`Plan gap assessment: ${doc.title} vs ${framework} — ${gaps.length} gaps`);
    } catch (err) {
        resultDiv.innerHTML = `<div style="color:red;">❌ Gap assessment failed: ${err.message}</div>`;
    }
};

GRCWebApp.prototype.generatePlanCAP = async function() {
    const org = document.getElementById('planCapOrg').value.trim() || 'Organization';
    const type = document.getElementById('planCapType').value;
    const framework = document.getElementById('planCapFramework').value;
    const gaps = document.getElementById('planCapGaps').value.trim();
    const timeline = document.getElementById('planCapTimeline').value;
    const resultDiv = document.getElementById('planCapResult');

    if (!gaps) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:red;">⚠️ Please provide gaps. Run a Gap Assessment first or enter gaps manually.</div>';
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:#2980b9;">⏳ Generating ' + (type === 'both' ? 'CAP and POA&M' : type.toUpperCase()) + '...</div>';

    const typeLabel = type === 'cap' ? 'Corrective Action Plan' : type === 'poam' ? 'Plan of Action & Milestones' : 'Corrective Action Plan and Plan of Action & Milestones';
    const prompt = `Generate a detailed ${typeLabel} for ${org} based on the following security plan gaps identified against the ${framework} framework.

Timeline: ${timeline} days for remediation.

Identified Gaps:
${gaps}

For each gap, provide:
1. Finding ID and description
2. Risk level (Critical/High/Medium/Low)
3. Responsible party/role
4. Remediation actions (specific steps)
5. Target completion date (phased within ${timeline}-day window)
6. Resources required
7. Completion criteria
${type === 'poam' || type === 'both' ? '\nPOA&M format: Include milestone checkpoints, scheduled status reviews, acceptance criteria, and risk-based prioritization.' : ''}
${type === 'cap' || type === 'both' ? '\nCAP format: Include root cause analysis, corrective actions, preventive actions, and verification method for each finding.' : ''}

Format as a professional document ready for compliance/audit review.`;

    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const data = await resp.json();
        const response = data.response || data.message || 'No response generated';

        resultDiv.innerHTML = `
            <div style="background:#d1ecf1; border:1px solid #bee5eb; border-radius:8px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color:#0c5460;">📋 ${this.escapeHtml(typeLabel)}</h4>
                    <button class="btn btn-primary" style="font-size:12px; padding:6px 12px;" onclick="app.exportCAP('plan', '${type}')">📥 Export</button>
                </div>
                <p style="font-size:12px; color:#666; margin-bottom:12px;">${org} | ${framework} | ${timeline}-day timeline</p>
                <div style="background:white; padding:16px; border-radius:6px; max-height:500px; overflow-y:auto; white-space:pre-wrap; font-family:system-ui; font-size:13px; line-height:1.6;">${this.escapeHtml(response)}</div>
            </div>`;
        this._lastCAPResult = { type, content: response, org, framework, timeline };
        this.addActivity(`Generated ${type.toUpperCase()} for plan gaps (${framework})`);
    } catch (err) {
        resultDiv.innerHTML = `<div style="color:red;">❌ Generation failed: ${err.message}</div>`;
    }
};

GRCWebApp.prototype.loadPlanLibrary = async function() {
    try {
        const resp = await fetch(`${this.apiEndpoint}/api/grc/plans`);
        const data = await resp.json();
        const list = document.getElementById('plansList');
        if (!list) return;
        const plans = data.plans || [];
        if (plans.length === 0) {
            list.innerHTML = '<p class="empty-state">No plans yet. Upload or generate one to get started.</p>';
            return;
        }
        list.innerHTML = plans.map(p => `
            <div style="background:var(--light-gray); padding:12px; border-radius:8px; margin-bottom:8px; border-left:4px solid #27ae60;">
                <strong>${this.escapeHtml(p.title || p.id)}</strong>
                <div style="font-size:12px; color:#666; margin-top:4px;">${p.type || ''} | ${p.frameworks?.join(', ') || ''} | ${p.createdAt || ''}</div>
            </div>`).join('');
    } catch (err) {
        console.error('Failed to load plans:', err);
    }
};

GRCWebApp.prototype.filterPlanLibrary = function() {
    const filter = (document.getElementById('planLibraryFilter')?.value || '').toLowerCase();
    document.querySelectorAll('#plansList > div').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
};

// ===== EXPORT UTILITY =====

GRCWebApp.prototype.exportCAP = function(module, type) {
    if (!this._lastCAPResult) return;
    const content = this._lastCAPResult.content;
    const filename = `${this._lastCAPResult.org}_${type}_${this._lastCAPResult.framework}_${new Date().toISOString().slice(0,10)}.txt`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};
