/**
 * Main API Server - REST API for GRC Agent
 * Vite handles the frontend serving in development
 */

import express, { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import * as XLSX from 'xlsx';
import 'dotenv/config';
import GRCAgent from './agent/index.js';
import FrameworkRegistry from './frameworks/index.js';
import { compareFrameworksByDomain } from './frameworks/cross-mappings.js';
import {
  GRCAgentRequest,
  ComplianceFramework,
  ControlImplementationRequest,
  ControlStatus,
  ControlEffectiveness,
  ProcedureRequest,
  ClientDocumentIngestionRequest,
  DocumentationGapAnalysisRequest,
  GapExemptionRequest,
  ImprovementInsightRequest,
  ImprovementOutcomeUpdateRequest
} from './types/framework.js';
import { ControlImplementationService } from './services/control-implementation-service.js';
import { localStoreService } from './services/local-store-service.js';
import { DocumentIngestionService } from './services/document-ingestion-service.js';
import { ExemptionService } from './services/exemption-service.js';
import { DocumentationGapService } from './services/documentation-gap-service.js';
import { ImprovementPlaybookService } from './services/improvement-playbook-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS for Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Create agent instance
const agent = new GRCAgent();

// Create control implementation service
const controlService = new ControlImplementationService();
const documentIngestionService = new DocumentIngestionService();
const exemptionService = new ExemptionService();
const documentationGapService = new DocumentationGapService();
const improvementPlaybookService = new ImprovementPlaybookService();

// ====================
// Routes
// ====================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'grc-agent-api',
    timestamp: new Date().toISOString()
  });
});

// API Documentation
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'GRC Agent API',
    version: '1.0.0',
    description: 'Governance, Risk, Compliance AI Assistant API',
    endpoints: {
      'POST /api/grc/process': 'Process user message through agent',
      'GET /api/grc/frameworks': 'List all available frameworks',
      'GET /api/grc/frameworks/:id': 'Get framework details',
      'GET /api/grc/frameworks/:id/controls': 'List framework controls',
      'GET /api/grc/search': 'Search frameworks and controls',
      'GET /api/grc/agent': 'Get agent info and conversation history',
      'POST /api/grc/agent/clear': 'Clear conversation history',
      'GET /api/grc/offline/package': 'Get full local offline package snapshot',
      'POST /api/grc/documents/ingest': 'Ingest client artifacts (policy/procedure/plan)',
      'POST /api/grc/documentation/gap-analysis': 'Run documentation coverage gap analysis',
      'POST /api/grc/exemptions': 'Create a risk acceptance exemption record',
      'GET /api/grc/improvement/insights': 'List lessons learned and improvement insights',
      'GET /api/grc/improvement/outcomes': 'List tracked improvement-injection outcomes',
      'PUT /api/grc/improvement/outcomes/:id': 'Update improvement outcome status and metrics'
    }
  });
});

// Process message through agent
app.post('/api/grc/process', async (req: Request, res: Response) => {
  try {
    const { message, userId, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const agentRequest: GRCAgentRequest = {
      message,
      userId: userId || 'anonymous',
      conversationId: conversationId || 'default',
      context: req.body.context
    };

    const response = await agent.processMessage(agentRequest);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Agent error:', error);
    improvementPlaybookService.recordRuntimeError(
      error instanceof Error ? error.message : String(error),
      '/api/grc/process'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

// List all frameworks
app.get('/api/grc/frameworks', (req: Request, res: Response) => {
  try {
    const frameworks = FrameworkRegistry.getAllFrameworks();
    res.json({
      success: true,
      count: frameworks.length,
      frameworks
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve frameworks' });
  }
});

// Get framework details
app.get('/api/grc/frameworks/:id', (req: Request, res: Response) => {
  try {
    const framework = FrameworkRegistry.getFramework(req.params.id as any);

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    res.json({
      success: true,
      framework,
      summary: FrameworkRegistry.getFrameworkSummary(req.params.id as any)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve framework' });
  }
});

// Get framework controls
app.get('/api/grc/frameworks/:id/controls', (req: Request, res: Response) => {
  try {
    const controls = FrameworkRegistry.getFrameworkControls(req.params.id as any);

    if (!controls) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    res.json({
      success: true,
      frameworkId: req.params.id,
      count: controls.length,
      controls
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve controls' });
  }
});

// Search frameworks and controls
app.get('/api/grc/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = FrameworkRegistry.globalSearch(query);

    res.json({
      success: true,
      query,
      resultCount: results.length,
      results: results.slice(0, 20) // Limit to 20 results
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ====================
// Cross-Framework Comparison
// ====================

// Compare 2-3 frameworks by mapped security domains
app.post('/api/grc/frameworks/compare', (req: Request, res: Response) => {
  try {
    const { frameworks } = req.body as { frameworks: string[] };

    if (!frameworks || !Array.isArray(frameworks) || frameworks.length < 2 || frameworks.length > 3) {
      return res.status(400).json({ error: 'Provide 2 or 3 framework IDs to compare' });
    }

    const validFrameworks = frameworks.filter(f =>
      FrameworkRegistry.getFramework(f as any)
    ) as ComplianceFramework[];

    if (validFrameworks.length < 2) {
      return res.status(400).json({ error: 'At least 2 valid framework IDs are required' });
    }

    const comparison = compareFrameworksByDomain(validFrameworks);
    const frameworkDetails = validFrameworks.map(f => FrameworkRegistry.getFramework(f as any));

    res.json({
      success: true,
      frameworks: frameworkDetails,
      domains: comparison
    });
  } catch (error) {
    res.status(500).json({ error: 'Comparison failed' });
  }
});

// ====================
// Organization Compliance Ingestion
// ====================

// In-memory store for ingested compliance posture (per session)
const compliancePosture: Map<string, {
  organization: string;
  framework: string;
  controls: { controlId: string; status: string; notes?: string }[];
  ingestedAt: string;
}> = new Map();

// Ingest org compliance posture against a framework
app.post('/api/grc/compliance/ingest', (req: Request, res: Response) => {
  try {
    const { organization, framework, controls } = req.body as {
      organization: string;
      framework: string;
      controls: { controlId: string; status: string; notes?: string }[];
    };

    if (!organization || !framework || !controls || !Array.isArray(controls)) {
      return res.status(400).json({
        error: 'Provide organization, framework, and controls array'
      });
    }

    const key = `${organization}::${framework}`;
    compliancePosture.set(key, {
      organization,
      framework,
      controls,
      ingestedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Ingested ${controls.length} control statuses for ${organization} against ${framework}`,
      key
    });
  } catch (error) {
    res.status(500).json({ error: 'Ingestion failed' });
  }
});

// Get ingested compliance posture
app.get('/api/grc/compliance/posture', (req: Request, res: Response) => {
  try {
    const org = req.query.organization as string;
    const fw = req.query.framework as string;

    if (org && fw) {
      const key = `${org}::${fw}`;
      const posture = compliancePosture.get(key);
      if (!posture) {
        return res.status(404).json({ error: 'No posture found for this organization/framework' });
      }
      return res.json({ success: true, posture });
    }

    // Return all postures
    const all = Array.from(compliancePosture.values());
    res.json({ success: true, count: all.length, postures: all });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve posture' });
  }
});

// Cross-map org compliance posture to other frameworks
app.post('/api/grc/compliance/cross-map', (req: Request, res: Response) => {
  try {
    const { organization, sourceFramework, targetFrameworks } = req.body as {
      organization: string;
      sourceFramework: string;
      targetFrameworks: string[];
    };

    if (!organization || !sourceFramework || !targetFrameworks?.length) {
      return res.status(400).json({
        error: 'Provide organization, sourceFramework, and targetFrameworks'
      });
    }

    const key = `${organization}::${sourceFramework}`;
    const posture = compliancePosture.get(key);
    if (!posture) {
      return res.status(404).json({
        error: `No posture ingested for ${organization} against ${sourceFramework}. Ingest first.`
      });
    }

    // Build a status lookup by controlId
    const statusMap = new Map(posture.controls.map(c => [c.controlId, c.status]));

    // Get the cross-mapping for all selected frameworks
    const allFw = [sourceFramework, ...targetFrameworks] as ComplianceFramework[];
    const comparison = compareFrameworksByDomain(allFw);

    // For each domain, determine the org's posture from the source framework controls
    const crossMapped = comparison.map(item => {
      const sourceControls = item.mappings[sourceFramework] || [];
      const statuses = sourceControls.map(cid => statusMap.get(cid)).filter(Boolean);

      let domainStatus = 'not-assessed';
      if (statuses.length > 0) {
        const implemented = statuses.filter(s => s === 'implemented').length;
        const partial = statuses.filter(s => s === 'partially-implemented' || s === 'in-progress').length;
        if (implemented === statuses.length) domainStatus = 'implemented';
        else if (implemented + partial === statuses.length) domainStatus = 'partially-implemented';
        else if (implemented > 0 || partial > 0) domainStatus = 'partially-implemented';
        else domainStatus = 'not-implemented';
      }

      return {
        domain: item.domain,
        sourceStatus: domainStatus,
        sourceControls,
        targetMappings: Object.fromEntries(
          targetFrameworks.map(tf => [tf, item.mappings[tf] || []])
        )
      };
    });

    res.json({
      success: true,
      organization,
      sourceFramework,
      targetFrameworks,
      crossMap: crossMapped
    });
  } catch (error) {
    res.status(500).json({ error: 'Cross-mapping failed' });
  }
});

// ====================
// Policy Management
// ====================

// List all policies
app.get('/api/grc/policies', (req: Request, res: Response) => {
  try {
    const policies = agent.listPolicies();
    res.json({
      success: true,
      count: policies.length,
      policies
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list policies' });
  }
});

// Get specific policy
app.get('/api/grc/policies/:id', (req: Request, res: Response) => {
  try {
    const policy = agent.getPolicy(req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.json({
      success: true,
      policy
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve policy' });
  }
});

// Export policy as markdown
app.get('/api/grc/policies/:id/export', (req: Request, res: Response) => {
  try {
    const markdown = agent.exportPolicyAsMarkdown(req.params.id);
    if (!markdown) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="policy-${req.params.id}.md"`);
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export policy' });
  }
});

// ====================
// Plan Management
// ====================

// List all plans
app.get('/api/grc/plans', (req: Request, res: Response) => {
  try {
    const plans = agent.listPlans();
    res.json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

// Get specific plan
app.get('/api/grc/plans/:id', (req: Request, res: Response) => {
  try {
    const plan = agent.getPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json({
      success: true,
      plan
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve plan' });
  }
});

// Export plan as markdown
app.get('/api/grc/plans/:id/export', (req: Request, res: Response) => {
  try {
    const markdown = agent.exportPlanAsMarkdown(req.params.id);
    if (!markdown) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="plan-${req.params.id}.md"`);
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export plan' });
  }
});

// Get agent info
app.get('/api/grc/agent', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      agent: {
        name: 'GRC Agent',
        version: '1.0.0',
        status: 'ready',
        capabilities: [
          'Policy Generation',
          'Gap Analysis',
          'Plan Generation',
          'Framework Information'
        ]
      },
      conversationHistory: agent.getConversationHistory()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve agent info' });
  }
});

// Clear conversation history
app.post('/api/grc/agent/clear', (req: Request, res: Response) => {
  try {
    agent.clearHistory();
    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// ====================
// Control Implementations
// ====================

// List all implemented controls
app.get('/api/grc/controls', (req: Request, res: Response) => {
  try {
    const { framework, organization } = req.query;
    
    let controls;
    if (framework) {
      controls = controlService.getControlsByFramework(framework as ComplianceFramework);
    } else if (organization) {
      controls = controlService.getControlsByOrganization(organization as string);
    } else {
      controls = controlService.getAllControls();
    }
    
    res.json({
      success: true,
      count: controls.length,
      controls
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve controls' });
  }
});

// Get controls for a specific framework control requirement
app.get('/api/grc/frameworks/:frameworkId/controls/:controlId/implementations', (req: Request, res: Response) => {
  try {
    const { frameworkId, controlId } = req.params;
    const controls = controlService.getControlsForFrameworkControl(
      frameworkId as ComplianceFramework,
      controlId
    );
    
    const summary = controlService.getImplementationSummary(
      frameworkId as ComplianceFramework,
      controlId
    );
    
    res.json({
      success: true,
      frameworkControlId: controlId,
      framework: frameworkId,
      summary,
      implementedControls: controls
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve control implementations' });
  }
});

// Create a new implemented control
app.post('/api/grc/controls', (req: Request, res: Response) => {
  try {
    const controlRequest: ControlImplementationRequest = req.body;
    
    if (!controlRequest.frameworkControlId || !controlRequest.framework || !controlRequest.organization) {
      return res.status(400).json({ error: 'frameworkControlId, framework, and organization are required' });
    }
    
    const control = controlService.createControl(controlRequest);
    res.status(201).json({
      success: true,
      control
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create control' });
  }
});

// Get a specific implemented control
app.get('/api/grc/controls/:id', (req: Request, res: Response) => {
  try {
    const control = controlService.getControl(req.params.id);
    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }
    res.json({
      success: true,
      control
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve control' });
  }
});

// Update an implemented control
app.put('/api/grc/controls/:id', (req: Request, res: Response) => {
  try {
    const updates: Partial<ControlImplementationRequest> = req.body;
    const control = controlService.updateControl(req.params.id, updates);
    
    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }
    
    res.json({
      success: true,
      control
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update control' });
  }
});

// Delete an implemented control
app.delete('/api/grc/controls/:id', (req: Request, res: Response) => {
  try {
    const deleted = controlService.deleteControl(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Control not found' });
    }
    res.json({
      success: true,
      message: 'Control deleted'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete control' });
  }
});

// ====================
// Procedures
// ====================

// Get procedures for a control
app.get('/api/grc/controls/:controlId/procedures', (req: Request, res: Response) => {
  try {
    const procedures = controlService.getProceduresForControl(req.params.controlId);
    res.json({
      success: true,
      count: procedures.length,
      procedures
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve procedures' });
  }
});

// Create a procedure for a control
app.post('/api/grc/controls/:controlId/procedures', (req: Request, res: Response) => {
  try {
    const procedureRequest: ProcedureRequest = {
      ...req.body,
      controlId: req.params.controlId
    };
    
    if (!procedureRequest.procedureName || !procedureRequest.frequency) {
      return res.status(400).json({ error: 'procedureName and frequency are required' });
    }
    
    const procedure = controlService.createProcedure(procedureRequest);
    if (!procedure) {
      return res.status(404).json({ error: 'Control not found' });
    }
    
    res.status(201).json({
      success: true,
      procedure
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create procedure' });
  }
});

// Get a specific procedure
app.get('/api/grc/procedures/:id', (req: Request, res: Response) => {
  try {
    const procedure = controlService.getProcedure(req.params.id);
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json({
      success: true,
      procedure
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve procedure' });
  }
});

// Update a procedure
app.put('/api/grc/procedures/:id', (req: Request, res: Response) => {
  try {
    const updates: Partial<ProcedureRequest> = req.body;
    const procedure = controlService.updateProcedure(req.params.id, updates);
    
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    
    res.json({
      success: true,
      procedure
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update procedure' });
  }
});

// Delete a procedure
app.delete('/api/grc/procedures/:id', (req: Request, res: Response) => {
  try {
    const deleted = controlService.deleteProcedure(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json({
      success: true,
      message: 'Procedure deleted'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete procedure' });
  }
});

// ====================
// Compliance Stats
// ====================

// Get compliance stats for an organization
app.get('/api/grc/stats/:organization', (req: Request, res: Response) => {
  try {
    const stats = controlService.getComplianceStats(req.params.organization);
    res.json({
      success: true,
      organization: req.params.organization,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve compliance stats' });
  }
});

// Get framework implementation summary
app.get('/api/grc/frameworks/:id/implementation-summary', (req: Request, res: Response) => {
  try {
    const summary = controlService.getFrameworkImplementationSummary(req.params.id as ComplianceFramework);
    res.json({
      success: true,
      framework: req.params.id,
      controlCount: summary.size,
      implementations: Object.fromEntries(summary)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve implementation summary' });
  }
});

// CSF 2.0 Maturity Analytics — full Function/Category/Subcategory breakdown
app.get('/api/grc/analytics/csf-maturity', (req: Request, res: Response) => {
  try {
    const organization = req.query.organization as string | undefined;

    // Get all CSF and CIS controls for this organization
    let controls = organization
      ? controlService.getControlsByOrganization(organization)
      : controlService.getAllControls();

    // Filter to CSF and CIS frameworks
    const csfControls = controls.filter(c => c.framework === ComplianceFramework.NIST_CSF);
    const cisControls = controls.filter(c => c.framework === ComplianceFramework.CIS_CONTROLS);

    // CSF 2.0 taxonomy: Functions → Categories → Subcategories
    const csfTaxonomy: Record<string, { name: string; color: string; categories: Record<string, { name: string; subcategories: string[] }> }> = {
      'GV': { name: 'Govern', color: '#9b59b6', categories: {
        'GV.OC': { name: 'Organizational Context', subcategories: ['GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04', 'GV.OC-05'] },
        'GV.RM': { name: 'Risk Management Strategy', subcategories: ['GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07'] },
        'GV.RR': { name: 'Roles, Responsibilities & Authorities', subcategories: ['GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04'] },
        'GV.PO': { name: 'Policy', subcategories: ['GV.PO-01', 'GV.PO-02'] },
        'GV.OV': { name: 'Oversight', subcategories: ['GV.OV-01', 'GV.OV-02', 'GV.OV-03'] },
        'GV.SC': { name: 'Cybersecurity Supply Chain Risk Management', subcategories: ['GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07', 'GV.SC-08', 'GV.SC-09', 'GV.SC-10'] }
      }},
      'ID': { name: 'Identify', color: '#3498db', categories: {
        'ID.AM': { name: 'Asset Management', subcategories: ['ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08'] },
        'ID.RA': { name: 'Risk Assessment', subcategories: ['ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07', 'ID.RA-08', 'ID.RA-09', 'ID.RA-10'] },
        'ID.IM': { name: 'Improvement', subcategories: ['ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04'] }
      }},
      'PR': { name: 'Protect', color: '#27ae60', categories: {
        'PR.AA': { name: 'Identity Management, Authentication & Access Control', subcategories: ['PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06'] },
        'PR.AT': { name: 'Awareness and Training', subcategories: ['PR.AT-01', 'PR.AT-02'] },
        'PR.DS': { name: 'Data Security', subcategories: ['PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11'] },
        'PR.PS': { name: 'Platform Security', subcategories: ['PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06'] },
        'PR.IR': { name: 'Technology Infrastructure Resilience', subcategories: ['PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04'] }
      }},
      'DE': { name: 'Detect', color: '#f39c12', categories: {
        'DE.CM': { name: 'Continuous Monitoring', subcategories: ['DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09'] },
        'DE.AE': { name: 'Adverse Event Analysis', subcategories: ['DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08'] }
      }},
      'RS': { name: 'Respond', color: '#e74c3c', categories: {
        'RS.MA': { name: 'Incident Management', subcategories: ['RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05'] },
        'RS.AN': { name: 'Incident Analysis', subcategories: ['RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08'] },
        'RS.CO': { name: 'Incident Response Reporting and Communication', subcategories: ['RS.CO-02', 'RS.CO-03'] },
        'RS.MI': { name: 'Incident Mitigation', subcategories: ['RS.MI-01', 'RS.MI-02'] }
      }},
      'RC': { name: 'Recover', color: '#1abc9c', categories: {
        'RC.RP': { name: 'Incident Recovery Plan Execution', subcategories: ['RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06'] },
        'RC.CO': { name: 'Incident Recovery Communication', subcategories: ['RC.CO-03', 'RC.CO-04'] }
      }}
    };

    // Map implemented controls by their frameworkControlId
    const csfStatusMap = new Map<string, { status: string; effectiveness: string; name: string }>();
    csfControls.forEach(c => {
      csfStatusMap.set(c.frameworkControlId.toUpperCase(), {
        status: c.status,
        effectiveness: c.effectiveness,
        name: c.controlName
      });
    });

    // Build the analytics response
    const functions: Array<{
      id: string;
      name: string;
      color: string;
      totalSubcategories: number;
      implemented: number;
      partial: number;
      planned: number;
      notImplemented: number;
      score: number;
      categories: Array<{
        id: string;
        name: string;
        totalSubcategories: number;
        implemented: number;
        partial: number;
        planned: number;
        notImplemented: number;
        score: number;
        subcategories: Array<{ id: string; status: string; effectiveness: string; name: string }>;
      }>;
    }> = [];

    let totalSubcats = 0;
    let totalImplemented = 0;
    let totalPartial = 0;

    for (const [funcId, func] of Object.entries(csfTaxonomy)) {
      const funcResult = {
        id: funcId,
        name: func.name,
        color: func.color,
        totalSubcategories: 0,
        implemented: 0,
        partial: 0,
        planned: 0,
        notImplemented: 0,
        score: 0,
        categories: [] as any[]
      };

      for (const [catId, cat] of Object.entries(func.categories)) {
        const catResult = {
          id: catId,
          name: cat.name,
          totalSubcategories: cat.subcategories.length,
          implemented: 0,
          partial: 0,
          planned: 0,
          notImplemented: 0,
          score: 0,
          subcategories: [] as any[]
        };

        for (const subId of cat.subcategories) {
          const impl = csfStatusMap.get(subId);
          let status = 'not-assessed';
          let effectiveness = 'not-tested';
          let name = subId;

          if (impl) {
            status = impl.status;
            effectiveness = impl.effectiveness;
            name = impl.name || subId;
            if (impl.status === 'implemented') catResult.implemented++;
            else if (impl.status === 'partially-implemented' || impl.status === 'in-progress') catResult.partial++;
            else if (impl.status === 'planned') catResult.planned++;
            else catResult.notImplemented++;
          } else {
            catResult.notImplemented++;
          }

          catResult.subcategories.push({ id: subId, status, effectiveness, name });
        }

        catResult.score = catResult.totalSubcategories > 0
          ? Math.round(((catResult.implemented + catResult.partial * 0.5) / catResult.totalSubcategories) * 100)
          : 0;

        funcResult.totalSubcategories += catResult.totalSubcategories;
        funcResult.implemented += catResult.implemented;
        funcResult.partial += catResult.partial;
        funcResult.planned += catResult.planned;
        funcResult.notImplemented += catResult.notImplemented;
        funcResult.categories.push(catResult);
      }

      funcResult.score = funcResult.totalSubcategories > 0
        ? Math.round(((funcResult.implemented + funcResult.partial * 0.5) / funcResult.totalSubcategories) * 100)
        : 0;

      totalSubcats += funcResult.totalSubcategories;
      totalImplemented += funcResult.implemented;
      totalPartial += funcResult.partial;
      functions.push(funcResult);
    }

    const overallScore = totalSubcats > 0
      ? Math.round(((totalImplemented + totalPartial * 0.5) / totalSubcats) * 100)
      : 0;

    res.json({
      success: true,
      organization: organization || 'all',
      overallScore,
      totalSubcategories: totalSubcats,
      totalImplemented,
      totalPartial,
      totalNotAssessed: totalSubcats - totalImplemented - totalPartial,
      cisControlsCount: cisControls.length,
      csfControlsCount: csfControls.length,
      functions
    });
  } catch (error: any) {
    res.status(500).json({ error: `CSF maturity analytics failed: ${error?.message || 'Unknown error'}` });
  }
});

// Framework Comparison Analytics — compare any two frameworks side-by-side
app.get('/api/grc/analytics/framework-comparison', (req: Request, res: Response) => {
  try {
    const framework1 = req.query.framework1 as string;
    const framework2 = req.query.framework2 as string;
    const organization = req.query.organization as string | undefined;

    if (!framework1 || !framework2) {
      return res.status(400).json({ error: 'Both framework1 and framework2 query parameters are required' });
    }

    const fw1Info = FrameworkRegistry.getFramework(framework1 as ComplianceFramework);
    const fw2Info = FrameworkRegistry.getFramework(framework2 as ComplianceFramework);
    if (!fw1Info || !fw2Info) {
      return res.status(404).json({ error: 'One or both frameworks not found', available: FrameworkRegistry.getFrameworksSummary() });
    }

    // Get all framework controls (taxonomy)
    const fw1Controls = FrameworkRegistry.getFrameworkControls(framework1 as ComplianceFramework);
    const fw2Controls = FrameworkRegistry.getFrameworkControls(framework2 as ComplianceFramework);

    // Get implemented controls from organization
    let allImplemented = organization
      ? controlService.getControlsByOrganization(organization)
      : controlService.getAllControls();

    const fw1Implemented = allImplemented.filter(c => c.framework === framework1 as ComplianceFramework);
    const fw2Implemented = allImplemented.filter(c => c.framework === framework2 as ComplianceFramework);

    // Build status maps
    const fw1StatusMap = new Map(fw1Implemented.map(c => [c.frameworkControlId, { status: c.status, effectiveness: c.effectiveness }]));
    const fw2StatusMap = new Map(fw2Implemented.map(c => [c.frameworkControlId, { status: c.status, effectiveness: c.effectiveness }]));

    // Categorize controls by category for each framework
    const inferCategory = (ctrl: { id: string; title: string; category?: string }, frameworkId: string): string => {
      if (ctrl.category) return ctrl.category;
      // CSF: GV.RO-01 → GV (Govern), PR.AC-01 → PR (Protect)
      if (frameworkId === 'nist-csf') {
        const prefix = ctrl.id.split('.')[0];
        const names: Record<string, string> = { GV: 'Govern', ID: 'Identify', PR: 'Protect', DE: 'Detect', RS: 'Respond', RC: 'Recover' };
        return names[prefix] || prefix;
      }
      // CIS: CIS.1.1 → CIS.1 (Inventory and Control of Enterprise Assets)
      if (frameworkId === 'cis-controls') {
        const parts = ctrl.id.split('.');
        if (parts.length >= 2) return `CIS Control ${parts[1]}`;
      }
      // NIST 800-53: AC-1 → AC (Access Control)
      if (frameworkId === 'nist-800-53') {
        const family = ctrl.id.split('-')[0];
        const names: Record<string, string> = { AC: 'Access Control', AT: 'Awareness & Training', AU: 'Audit & Accountability', CA: 'Assessment', CM: 'Configuration Mgmt', CP: 'Contingency Planning', IA: 'Identification & Auth', IR: 'Incident Response', MA: 'Maintenance', MP: 'Media Protection', PE: 'Physical & Environmental', PL: 'Planning', PM: 'Program Management', PS: 'Personnel Security', PT: 'PII Processing', RA: 'Risk Assessment', SA: 'System Acquisition', SC: 'System & Comms Protection', SI: 'System & Info Integrity', SR: 'Supply Chain' };
        return names[family] || family;
      }
      // HIPAA: §164.XXX → Section grouping
      if (frameworkId === 'hipaa') {
        if (ctrl.id.includes('164.3')) return 'Administrative Safeguards';
        if (ctrl.id.includes('164.4')) return 'Physical Safeguards';
        if (ctrl.id.includes('164.5')) return 'Technical Safeguards';
        if (ctrl.id.includes('164.6')) return 'Organizational Requirements';
        return 'General';
      }
      // SOC2: TSC prefix
      if (frameworkId === 'soc2') {
        if (ctrl.id.startsWith('CC')) return 'Common Criteria';
        if (ctrl.id.startsWith('A')) return 'Availability';
        if (ctrl.id.startsWith('PI')) return 'Processing Integrity';
        if (ctrl.id.startsWith('C')) return 'Confidentiality';
        if (ctrl.id.startsWith('P')) return 'Privacy';
        return 'Security';
      }
      // PCI-DSS: Req X
      if (frameworkId === 'pci-dss') {
        const match = ctrl.id.match(/(\d+)/);
        if (match) return `Requirement ${match[1]}`;
      }
      // Default: use first segment before dot/dash
      const sep = ctrl.id.includes('.') ? '.' : ctrl.id.includes('-') ? '-' : '';
      return sep ? ctrl.id.split(sep)[0] : 'General';
    };

    const buildCategoryBreakdown = (controls: typeof fw1Controls, statusMap: Map<string, { status: string; effectiveness: string }>, frameworkId: string) => {
      const categories = new Map<string, { controls: Array<{ id: string; title: string; status: string; effectiveness: string }>; implemented: number; partial: number; planned: number; notAssessed: number }>();
      for (const ctrl of controls) {
        const cat = inferCategory(ctrl, frameworkId);
        if (!categories.has(cat)) categories.set(cat, { controls: [], implemented: 0, partial: 0, planned: 0, notAssessed: 0 });
        const entry = categories.get(cat)!;
        const impl = statusMap.get(ctrl.id);
        const status = impl?.status || 'not-assessed';
        const effectiveness = impl?.effectiveness || 'not-tested';
        entry.controls.push({ id: ctrl.id, title: ctrl.title, status, effectiveness });
        if (status === 'implemented') entry.implemented++;
        else if (status === 'partially-implemented' || status === 'in-progress') entry.partial++;
        else if (status === 'planned') entry.planned++;
        else entry.notAssessed++;
      }
      return Array.from(categories.entries()).map(([name, data]) => ({
        name,
        totalControls: data.controls.length,
        implemented: data.implemented,
        partial: data.partial,
        planned: data.planned,
        notAssessed: data.notAssessed,
        score: data.controls.length > 0 ? Math.round(((data.implemented + data.partial * 0.5) / data.controls.length) * 100) : 0,
        controls: data.controls
      }));
    };

    const fw1Categories = buildCategoryBreakdown(fw1Controls, fw1StatusMap, framework1);
    const fw2Categories = buildCategoryBreakdown(fw2Controls, fw2StatusMap, framework2);

    const computeOverall = (cats: typeof fw1Categories) => {
      const total = cats.reduce((s, c) => s + c.totalControls, 0);
      const impl = cats.reduce((s, c) => s + c.implemented, 0);
      const partial = cats.reduce((s, c) => s + c.partial, 0);
      return { total, implemented: impl, partial, score: total > 0 ? Math.round(((impl + partial * 0.5) / total) * 100) : 0 };
    };

    const fw1Overall = computeOverall(fw1Categories);
    const fw2Overall = computeOverall(fw2Categories);

    // Cross-mapping: find category-level overlaps (semantic name matching)
    const fw1CatNames = new Set(fw1Categories.map(c => c.name.toLowerCase()));
    const fw2CatNames = new Set(fw2Categories.map(c => c.name.toLowerCase()));
    const sharedCategories = [...fw1CatNames].filter(n => fw2CatNames.has(n));

    res.json({
      success: true,
      organization: organization || 'all',
      framework1: {
        id: fw1Info.id,
        name: fw1Info.name,
        version: fw1Info.version,
        totalControls: fw1Info.total_controls,
        overallScore: fw1Overall.score,
        implemented: fw1Overall.implemented,
        partial: fw1Overall.partial,
        notAssessed: fw1Overall.total - fw1Overall.implemented - fw1Overall.partial,
        categories: fw1Categories
      },
      framework2: {
        id: fw2Info.id,
        name: fw2Info.name,
        version: fw2Info.version,
        totalControls: fw2Info.total_controls,
        overallScore: fw2Overall.score,
        implemented: fw2Overall.implemented,
        partial: fw2Overall.partial,
        notAssessed: fw2Overall.total - fw2Overall.implemented - fw2Overall.partial,
        categories: fw2Categories
      },
      comparison: {
        sharedCategoryCount: sharedCategories.length,
        sharedCategories,
        fw1UniqueCategories: [...fw1CatNames].filter(n => !fw2CatNames.has(n)),
        fw2UniqueCategories: [...fw2CatNames].filter(n => !fw1CatNames.has(n)),
        scoreDelta: fw1Overall.score - fw2Overall.score
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: `Framework comparison failed: ${error?.message || 'Unknown error'}` });
  }
});

// Search controls and procedures
app.get('/api/grc/controls/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const controls = controlService.searchControls(query);
    const procedures = controlService.searchProcedures(query);
    
    res.json({
      success: true,
      query,
      results: {
        controls: controls.slice(0, 20),
        procedures: procedures.slice(0, 20)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ====================
// Offline Continuity
// ====================

app.get('/api/grc/offline/status', (req: Request, res: Response) => {
  try {
    const pkg = localStoreService.getOfflinePackage();
    const totalControls = pkg.frameworks.reduce((sum, item) => sum + item.controls.length, 0);

    res.json({
      success: true,
      status: {
        generatedAt: pkg.generatedAt,
        schemaVersion: pkg.schemaVersion,
        frameworkCount: pkg.frameworks.length,
        frameworkControlCount: totalControls,
        policyCount: pkg.policies.length,
        planCount: pkg.plans.length,
        implementedControlCount: pkg.controls.length,
        procedureCount: pkg.procedures.length,
        documentCount: pkg.clientDocuments.length,
        exemptionCount: pkg.gapExemptions.length,
        insightCount: pkg.improvementInsights.length,
        outcomeCount: pkg.improvementOutcomes.length,
        connections: pkg.connections
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve offline status' });
  }
});

app.get('/api/grc/offline/package', (req: Request, res: Response) => {
  try {
    const pkg = localStoreService.getOfflinePackage();
    res.json({
      success: true,
      package: pkg
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve offline package' });
  }
});

app.put('/api/grc/offline/connections/:id', (req: Request, res: Response) => {
  try {
    const { name, endpoint, status, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const connection = localStoreService.upsertConnection({
      id: req.params.id,
      name,
      endpoint,
      status,
      notes,
      lastCheckedAt: new Date()
    });

    res.json({
      success: true,
      connection
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update connection status' });
  }
});

// ====================
// Client Document Ingestion
// ====================

app.post('/api/grc/documents/ingest', (req: Request, res: Response) => {
  try {
    const request: ClientDocumentIngestionRequest = req.body;

    if (!request.organization || !request.title || !request.content) {
      return res.status(400).json({
        error: 'organization, title, and content are required'
      });
    }

    const artifact = documentIngestionService.ingestDocument(request);

    res.status(201).json({
      success: true,
      artifact
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ingest document' });
  }
});

// ==================== MATURITY IMPORT ====================
app.post('/api/grc/controls/import-maturity', (req: Request, res: Response) => {
  try {
    const { content, encoding, filename, organization, defaultStatus, defaultEffectiveness } = req.body;

    if (!content || !organization) {
      return res.status(400).json({ error: 'content and organization are required' });
    }

    // Decode base64 xlsx
    let buffer: Buffer;
    if (encoding === 'base64') {
      const base64Data = content.includes(',') ? content.split(',')[1] : content;
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ error: 'Only base64-encoded xlsx files are supported for maturity import' });
    }

    // Parse xlsx
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Spreadsheet has no data rows' });
    }

    // Detect column mapping by inspecting headers
    const headers = Object.keys(rows[0]).map(h => h.toLowerCase());
    
    // Look for CIS-related columns
    const cisControlCol = Object.keys(rows[0]).find(h => /cis.*control|control.*\#|control.*id/i.test(h));
    const cisSafeguardCol = Object.keys(rows[0]).find(h => /safeguard|sub.?control|cis.*safeguard/i.test(h));
    const cisTitleCol = Object.keys(rows[0]).find(h => /safeguard.*title|control.*title|title|description/i.test(h));
    const cisAssetTypeCol = Object.keys(rows[0]).find(h => /asset.*type/i.test(h));
    const cisSecFuncCol = Object.keys(rows[0]).find(h => /security.*function/i.test(h));
    const cisIGCol = Object.keys(rows[0]).find(h => /implementation.*group|ig\d?/i.test(h));
    
    // Look for CSF-related columns
    const csfFunctionCol = Object.keys(rows[0]).find(h => /csf.*function|function/i.test(h));
    const csfCategoryCol = Object.keys(rows[0]).find(h => /csf.*category|category/i.test(h));
    const csfSubcategoryCol = Object.keys(rows[0]).find(h => /csf.*subcategory|subcategory/i.test(h));

    // Look for maturity/status columns
    const statusCol = Object.keys(rows[0]).find(h => /status|maturity|implementation|implemented|state/i.test(h));
    const effectivenessCol = Object.keys(rows[0]).find(h => /effectiveness|efficacy|rating/i.test(h));
    const notesCol = Object.keys(rows[0]).find(h => /notes|comments|remarks/i.test(h));

    const controlService = new ControlImplementationService();
    const imported: { cisControls: number; csfControls: number; skipped: number } = { cisControls: 0, csfControls: 0, skipped: 0 };
    const detectedFrameworks: ComplianceFramework[] = [];
    const importedDetails: Array<{ id: string; name: string; framework: string; status: string }> = [];

    const resolveStatus = (row: Record<string, string>): ControlStatus => {
      if (statusCol) {
        const val = (row[statusCol] || '').toLowerCase().trim();
        if (val.includes('implement') || val === 'yes' || val === 'complete' || val === 'done') return ControlStatus.IMPLEMENTED;
        if (val.includes('partial') || val === 'in progress' || val === 'in-progress') return ControlStatus.PARTIALLY_IMPLEMENTED;
        if (val.includes('plan') || val === 'scheduled') return ControlStatus.PLANNED;
        if (val.includes('n/a') || val === 'not applicable') return ControlStatus.NOT_APPLICABLE;
        if (val.includes('not') || val === 'no') return ControlStatus.NOT_IMPLEMENTED;
      }
      return (defaultStatus as ControlStatus) || ControlStatus.IMPLEMENTED;
    };

    const resolveEffectiveness = (row: Record<string, string>): ControlEffectiveness => {
      if (effectivenessCol) {
        const val = (row[effectivenessCol] || '').toLowerCase().trim();
        if (val.includes('highly') || val === '5' || val === 'excellent') return ControlEffectiveness.HIGHLY_EFFECTIVE;
        if (val.includes('effective') || val === '4' || val === 'good') return ControlEffectiveness.EFFECTIVE;
        if (val.includes('partial') || val === '3' || val === 'moderate') return ControlEffectiveness.PARTIALLY_EFFECTIVE;
        if (val.includes('ineffective') || val === '2' || val === '1' || val === 'poor') return ControlEffectiveness.INEFFECTIVE;
      }
      return (defaultEffectiveness as ControlEffectiveness) || ControlEffectiveness.NOT_TESTED;
    };

    // Process each row
    for (const row of rows) {
      const status = resolveStatus(row);
      const effectiveness = resolveEffectiveness(row);
      const notes = notesCol ? row[notesCol] : undefined;

      // Import CIS Control
      if (cisSafeguardCol || cisControlCol) {
        const safeguardId = cisSafeguardCol ? row[cisSafeguardCol]?.toString().trim() : '';
        const controlId = cisControlCol ? row[cisControlCol]?.toString().trim() : '';
        const title = cisTitleCol ? row[cisTitleCol]?.toString().trim() : `CIS Safeguard ${safeguardId || controlId}`;

        if (safeguardId || controlId) {
          const frameworkControlId = safeguardId ? `CIS-${safeguardId}` : `CIS-${controlId}`;
          controlService.createControl({
            frameworkControlId,
            framework: ComplianceFramework.CIS_CONTROLS,
            organization,
            controlName: title,
            controlDescription: title,
            controlOwner: organization,
            controlType: 'preventive',
            status,
            effectiveness,
            notes: notes || undefined
          });
          importedDetails.push({ id: frameworkControlId, name: title, framework: 'CIS Controls v8', status });
          imported.cisControls++;
          if (!detectedFrameworks.includes(ComplianceFramework.CIS_CONTROLS)) {
            detectedFrameworks.push(ComplianceFramework.CIS_CONTROLS);
          }
        }
      }

      // Import CSF subcategory mapping
      if (csfSubcategoryCol) {
        const subcategory = row[csfSubcategoryCol]?.toString().trim();
        if (subcategory && /^(GV|ID|PR|DE|RS|RC)\./i.test(subcategory)) {
          const safeguardTitle = cisTitleCol ? row[cisTitleCol]?.toString().trim() : '';
          controlService.createControl({
            frameworkControlId: subcategory.toUpperCase(),
            framework: ComplianceFramework.NIST_CSF,
            organization,
            controlName: safeguardTitle || `CSF ${subcategory}`,
            controlDescription: safeguardTitle || `NIST CSF 2.0 Subcategory ${subcategory}`,
            controlOwner: organization,
            controlType: 'preventive',
            status,
            effectiveness,
            notes: notes || undefined
          });
          importedDetails.push({ id: subcategory.toUpperCase(), name: safeguardTitle || `CSF ${subcategory}`, framework: 'NIST CSF 2.0', status });
          imported.csfControls++;
          if (!detectedFrameworks.includes(ComplianceFramework.NIST_CSF)) {
            detectedFrameworks.push(ComplianceFramework.NIST_CSF);
          }
        }
      }

      if (!cisSafeguardCol && !cisControlCol && !csfSubcategoryCol) {
        imported.skipped++;
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${imported.cisControls} CIS Controls and ${imported.csfControls} CSF subcategories for ${organization}`,
      imported,
      totalRows: rows.length,
      sheetName,
      filename: filename || 'unknown',
      detectedFrameworks,
      controls: importedDetails,
      detectedColumns: {
        cisControl: cisControlCol || null,
        cisSafeguard: cisSafeguardCol || null,
        cisTitle: cisTitleCol || null,
        csfSubcategory: csfSubcategoryCol || null,
        status: statusCol || null,
        effectiveness: effectivenessCol || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: `Maturity import failed: ${error?.message || 'Unknown error'}` });
  }
});

app.get('/api/grc/documents', (req: Request, res: Response) => {
  try {
    const documents = documentIngestionService.listDocuments({
      organization: req.query.organization as string | undefined,
      type: req.query.type as any,
      framework: req.query.framework as ComplianceFramework | undefined
    });

    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

app.get('/api/grc/documents/:id', (req: Request, res: Response) => {
  try {
    const document = documentIngestionService.getDocument(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

app.put('/api/grc/documents/:id', (req: Request, res: Response) => {
  try {
    const document = documentIngestionService.updateDocument(req.params.id, req.body);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// ====================
// Documentation Gap Analysis
// ====================

app.post('/api/grc/documentation/gap-analysis', (req: Request, res: Response) => {
  try {
    const payload: DocumentationGapAnalysisRequest = req.body;
    const frameworks = payload.frameworks && payload.frameworks.length > 0
      ? payload.frameworks
      : [
          ComplianceFramework.NIST_CSF,
          ComplianceFramework.NIST_800_53,
          ComplianceFramework.HIPAA
        ];

    const analysis = documentationGapService.analyzeDocumentation({
      frameworks,
      includeFiles: payload.includeFiles
    });

    const insights = improvementPlaybookService.captureDocumentationGapInsights(analysis.results);

    res.json({
      success: true,
      ...analysis,
      insightsCaptured: insights.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run documentation gap analysis' });
  }
});

// ====================
// Enhanced CSF Gap Analysis — hierarchical breakdown with document & control mapping
// ====================
app.post('/api/grc/gap-analysis/csf-hierarchy', (req: Request, res: Response) => {
  try {
    const { organization, framework } = req.body;
    const fw = framework || 'nist-csf';

    // CSF 2.0 taxonomy
    const csfTaxonomy: Record<string, { name: string; color: string; categories: Record<string, { name: string; subcategories: string[] }> }> = {
      'GV': { name: 'Govern', color: '#9b59b6', categories: {
        'GV.OC': { name: 'Organizational Context', subcategories: ['GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04', 'GV.OC-05'] },
        'GV.RM': { name: 'Risk Management Strategy', subcategories: ['GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07'] },
        'GV.RR': { name: 'Roles, Responsibilities & Authorities', subcategories: ['GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04'] },
        'GV.PO': { name: 'Policy', subcategories: ['GV.PO-01', 'GV.PO-02'] },
        'GV.OV': { name: 'Oversight', subcategories: ['GV.OV-01', 'GV.OV-02', 'GV.OV-03'] },
        'GV.SC': { name: 'Cybersecurity Supply Chain Risk Management', subcategories: ['GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07', 'GV.SC-08', 'GV.SC-09', 'GV.SC-10'] }
      }},
      'ID': { name: 'Identify', color: '#3498db', categories: {
        'ID.AM': { name: 'Asset Management', subcategories: ['ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08'] },
        'ID.RA': { name: 'Risk Assessment', subcategories: ['ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07', 'ID.RA-08', 'ID.RA-09', 'ID.RA-10'] },
        'ID.IM': { name: 'Improvement', subcategories: ['ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04'] }
      }},
      'PR': { name: 'Protect', color: '#27ae60', categories: {
        'PR.AA': { name: 'Identity Management, Authentication & Access Control', subcategories: ['PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06'] },
        'PR.AT': { name: 'Awareness and Training', subcategories: ['PR.AT-01', 'PR.AT-02'] },
        'PR.DS': { name: 'Data Security', subcategories: ['PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11'] },
        'PR.PS': { name: 'Platform Security', subcategories: ['PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06'] },
        'PR.IR': { name: 'Technology Infrastructure Resilience', subcategories: ['PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04'] }
      }},
      'DE': { name: 'Detect', color: '#f39c12', categories: {
        'DE.CM': { name: 'Continuous Monitoring', subcategories: ['DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09'] },
        'DE.AE': { name: 'Adverse Event Analysis', subcategories: ['DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08'] }
      }},
      'RS': { name: 'Respond', color: '#e74c3c', categories: {
        'RS.MA': { name: 'Incident Management', subcategories: ['RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05'] },
        'RS.AN': { name: 'Incident Analysis', subcategories: ['RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08'] },
        'RS.CO': { name: 'Incident Response Reporting and Communication', subcategories: ['RS.CO-02', 'RS.CO-03'] },
        'RS.MI': { name: 'Incident Mitigation', subcategories: ['RS.MI-01', 'RS.MI-02'] }
      }},
      'RC': { name: 'Recover', color: '#1abc9c', categories: {
        'RC.RP': { name: 'Incident Recovery Plan Execution', subcategories: ['RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06'] },
        'RC.CO': { name: 'Incident Recovery Communication', subcategories: ['RC.CO-03', 'RC.CO-04'] }
      }}
    };

    // Gather all evidence: ingested documents + implemented controls
    const docs = documentIngestionService.listDocuments(organization ? { organization } : undefined);
    const controls = organization
      ? controlService.getControlsByOrganization(organization)
      : controlService.getAllControls();
    const csfControls = controls.filter(c => c.framework === ComplianceFramework.NIST_CSF);

    // Build a set of all covered subcategory/category IDs from documents and controls
    const coveredIds = new Set<string>();
    const coverageSource: Record<string, { documents: string[]; controls: string[] }> = {};

    const addCoverage = (id: string, source: string, type: 'documents' | 'controls') => {
      const upper = id.toUpperCase();
      coveredIds.add(upper);
      if (!coverageSource[upper]) coverageSource[upper] = { documents: [], controls: [] };
      coverageSource[upper][type].push(source);
    };

    // From ingested documents: extract control IDs and map them
    docs.forEach(doc => {
      (doc.extractedControlIds || []).forEach((rawId: string) => {
        const id = rawId.toUpperCase().replace(/\s+/g, '');
        addCoverage(id, doc.title, 'documents');
        // If mapped at subcategory level (e.g. GV.OC-01), also mark category as partially covered
        const catMatch = id.match(/^([A-Z]{2}\.[A-Z]{2})/);
        if (catMatch) addCoverage(catMatch[1], doc.title, 'documents');
        // Mark function level
        const funcMatch = id.match(/^([A-Z]{2})/);
        if (funcMatch) addCoverage(funcMatch[1], doc.title, 'documents');
      });
    });

    // From implemented controls
    csfControls.forEach(c => {
      const id = c.frameworkControlId.toUpperCase().replace(/\s+/g, '');
      const label = `${c.controlName} [${c.status}]`;
      addCoverage(id, label, 'controls');
      const catMatch = id.match(/^([A-Z]{2}\.[A-Z]{2})/);
      if (catMatch) addCoverage(catMatch[1], label, 'controls');
      const funcMatch = id.match(/^([A-Z]{2})/);
      if (funcMatch) addCoverage(funcMatch[1], label, 'controls');
    });

    // Detect partial mappings: subcategory covered but function NOT explicitly mapped
    const partialMappings: Array<{ subcategory: string; category: string; issue: string }> = [];

    // Build hierarchical result
    const functions: Array<{
      id: string; name: string; color: string;
      totalSubcategories: number; covered: number; gaps: number;
      coveragePercent: number;
      explicitlyMapped: boolean;
      categories: Array<{
        id: string; name: string;
        totalSubcategories: number; covered: number; gaps: number;
        coveragePercent: number;
        explicitlyMapped: boolean;
        subcategories: Array<{
          id: string; covered: boolean;
          sources: { documents: string[]; controls: string[] };
        }>;
        gapSubcategories: string[];
      }>;
    }> = [];

    let totalSubs = 0;
    let totalCovered = 0;

    for (const [funcId, func] of Object.entries(csfTaxonomy)) {
      const funcExplicit = coveredIds.has(funcId);
      const funcResult: typeof functions[0] = {
        id: funcId, name: func.name, color: func.color,
        totalSubcategories: 0, covered: 0, gaps: 0,
        coveragePercent: 0, explicitlyMapped: funcExplicit,
        categories: []
      };

      for (const [catId, cat] of Object.entries(func.categories)) {
        const catExplicit = coveredIds.has(catId);
        const catResult: typeof funcResult.categories[0] = {
          id: catId, name: cat.name,
          totalSubcategories: cat.subcategories.length,
          covered: 0, gaps: 0, coveragePercent: 0,
          explicitlyMapped: catExplicit,
          subcategories: [],
          gapSubcategories: []
        };

        for (const subId of cat.subcategories) {
          const subUpper = subId.toUpperCase();
          // A subcategory is covered if:
          // 1. Directly referenced by ID (e.g. GV.OC-01)
          // 2. Its parent category is mapped as a whole (e.g. "GV.OC" covers all under it if category-level mapping)
          const directlyCovered = coveredIds.has(subUpper);
          const coveredByCategory = catExplicit && !directlyCovered;
          const isCovered = directlyCovered || coveredByCategory;

          const sources = coverageSource[subUpper] || { documents: [], controls: [] };

          // If covered by category-level mapping, inherit category sources
          if (coveredByCategory && coverageSource[catId]) {
            sources.documents = [...new Set([...sources.documents, ...coverageSource[catId].documents])];
            sources.controls = [...new Set([...sources.controls, ...coverageSource[catId].controls])];
          }

          catResult.subcategories.push({ id: subId, covered: isCovered, sources });

          if (isCovered) {
            catResult.covered++;
          } else {
            catResult.gaps++;
            catResult.gapSubcategories.push(subId);
          }

          // Detect partial mapping: subcategory documented but function not explicitly referenced
          if (directlyCovered && !funcExplicit) {
            partialMappings.push({
              subcategory: subId,
              category: catId,
              issue: `Subcategory ${subId} is documented but parent Function "${func.name}" (${funcId}) has no explicit governance mapping`
            });
          }
        }

        catResult.coveragePercent = catResult.totalSubcategories > 0
          ? Math.round((catResult.covered / catResult.totalSubcategories) * 100) : 0;

        funcResult.totalSubcategories += catResult.totalSubcategories;
        funcResult.covered += catResult.covered;
        funcResult.gaps += catResult.gaps;
        funcResult.categories.push(catResult);
      }

      funcResult.coveragePercent = funcResult.totalSubcategories > 0
        ? Math.round((funcResult.covered / funcResult.totalSubcategories) * 100) : 0;

      totalSubs += funcResult.totalSubcategories;
      totalCovered += funcResult.covered;
      functions.push(funcResult);
    }

    const overallCoverage = totalSubs > 0 ? Math.round((totalCovered / totalSubs) * 100) : 0;

    // Build recommendations
    const recommendations: string[] = [];
    const uncoveredFunctions = functions.filter(f => f.coveragePercent === 0);
    if (uncoveredFunctions.length > 0) {
      recommendations.push(`${uncoveredFunctions.length} function(s) have zero documentation coverage: ${uncoveredFunctions.map(f => f.name).join(', ')}. Prioritize these.`);
    }
    const lowCategories = functions.flatMap(f => f.categories).filter(c => c.coveragePercent > 0 && c.coveragePercent < 50);
    if (lowCategories.length > 0) {
      recommendations.push(`${lowCategories.length} categories have partial coverage (<50%): ${lowCategories.slice(0, 5).map(c => `${c.id} ${c.name}`).join(', ')}${lowCategories.length > 5 ? '...' : ''}`);
    }
    if (partialMappings.length > 0) {
      recommendations.push(`${partialMappings.length} subcategories are mapped without explicit function-level governance documentation. Consider adding function-level policy documents.`);
    }

    res.json({
      success: true,
      framework: 'nist-csf-2.0',
      organization: organization || 'all',
      overallCoverage,
      totalSubcategories: totalSubs,
      totalCovered,
      totalGaps: totalSubs - totalCovered,
      documentsAnalyzed: docs.length,
      controlsAnalyzed: csfControls.length,
      functions,
      partialMappings: partialMappings.slice(0, 20),
      recommendations
    });
  } catch (error: any) {
    res.status(500).json({ error: `CSF hierarchical gap analysis failed: ${error?.message || 'Unknown error'}` });
  }
});

// ====================
// Gap Exemptions / Risk Acceptance
// ====================

app.post('/api/grc/exemptions', (req: Request, res: Response) => {
  try {
    const request: GapExemptionRequest = req.body;
    const requiredFields = [
      'organization',
      'gapDescription',
      'acceptanceJustification',
      'riskIdentified',
      'mitigationsInPlace',
      'residualRisk',
      'riskOwner',
      'nextReviewDate'
    ];

    const missing = requiredFields.filter(field => !(request as any)[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    const exemption = exemptionService.createExemption({
      ...request,
      nextReviewDate: new Date(request.nextReviewDate)
    });

    res.status(201).json({
      success: true,
      exemption
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exemption' });
  }
});

app.get('/api/grc/exemptions', (req: Request, res: Response) => {
  try {
    const exemptions = exemptionService.listExemptions({
      organization: req.query.organization as string | undefined,
      framework: req.query.framework as ComplianceFramework | undefined,
      status: req.query.status as any
    });

    res.json({
      success: true,
      count: exemptions.length,
      exemptions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list exemptions' });
  }
});

app.get('/api/grc/exemptions/:id', (req: Request, res: Response) => {
  try {
    const exemption = exemptionService.getExemption(req.params.id);

    if (!exemption) {
      return res.status(404).json({ error: 'Exemption not found' });
    }

    res.json({
      success: true,
      exemption
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve exemption' });
  }
});

app.put('/api/grc/exemptions/:id', (req: Request, res: Response) => {
  try {
    const updates = { ...req.body };
    if (updates.nextReviewDate) {
      updates.nextReviewDate = new Date(updates.nextReviewDate);
    }

    const exemption = exemptionService.updateExemption(req.params.id, updates);

    if (!exemption) {
      return res.status(404).json({ error: 'Exemption not found' });
    }

    res.json({
      success: true,
      exemption
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exemption' });
  }
});

// ====================
// Continuous Improvement Insights
// ====================

app.post('/api/grc/improvement/insights', (req: Request, res: Response) => {
  try {
    const request: ImprovementInsightRequest = req.body;

    if (!request.title || !request.source || !request.observation || !request.recommendation) {
      return res.status(400).json({
        error: 'title, source, observation, and recommendation are required'
      });
    }

    const insight = improvementPlaybookService.recordInsight(request);
    res.status(201).json({
      success: true,
      insight
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create insight' });
  }
});

app.post('/api/grc/improvement/runtime-errors', (req: Request, res: Response) => {
  try {
    const { errorMessage, context } = req.body;

    if (!errorMessage) {
      return res.status(400).json({ error: 'errorMessage is required' });
    }

    const insight = improvementPlaybookService.recordRuntimeError(errorMessage, context);
    res.status(201).json({
      success: true,
      insight
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to capture runtime error insight' });
  }
});

app.get('/api/grc/improvement/insights', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const insights = improvementPlaybookService.listInsights({
      source: req.query.source as any,
      limit: Number.isNaN(limit as number) ? undefined : limit
    });

    res.json({
      success: true,
      count: insights.length,
      insights
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve improvement insights' });
  }
});

app.post('/api/grc/improvement/insights/:id/feedback', (req: Request, res: Response) => {
  try {
    const { feedback } = req.body;
    if (feedback !== 'helpful' && feedback !== 'harmful') {
      return res.status(400).json({ error: "feedback must be 'helpful' or 'harmful'" });
    }

    const insight = improvementPlaybookService.updateFeedback(req.params.id, feedback);
    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json({
      success: true,
      insight
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update insight feedback' });
  }
});

app.get('/api/grc/improvement/outcomes', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const outcomes = improvementPlaybookService.listOutcomes({
      artifactType: req.query.artifactType as any,
      status: req.query.status as any,
      limit: Number.isNaN(limit as number) ? undefined : limit
    });

    const summary = outcomes.reduce((acc, outcome) => {
      acc.byStatus[outcome.status] = (acc.byStatus[outcome.status] || 0) + 1;
      acc.byArtifactType[outcome.artifactType] = (acc.byArtifactType[outcome.artifactType] || 0) + 1;
      return acc;
    }, {
      byStatus: {} as Record<string, number>,
      byArtifactType: {} as Record<string, number>
    });

    res.json({
      success: true,
      count: outcomes.length,
      outcomes,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve improvement outcomes' });
  }
});

app.put('/api/grc/improvement/outcomes/:id', (req: Request, res: Response) => {
  try {
    const updates: ImprovementOutcomeUpdateRequest = req.body;

    if (updates.qualityRating !== undefined) {
      const rating = Number(updates.qualityRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'qualityRating must be between 1 and 5' });
      }
      updates.qualityRating = rating;
    }

    const outcome = improvementPlaybookService.updateOutcome(req.params.id, updates);
    if (!outcome) {
      return res.status(404).json({ error: 'Improvement outcome not found' });
    }

    res.json({
      success: true,
      outcome
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update improvement outcome' });
  }
});

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(clientPath));
  
  // SPA fallback
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  improvementPlaybookService.recordRuntimeError(
    err?.message || String(err),
    `${req.method} ${req.path}`
  );
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';
const server = app.listen(port, host, () => {
  console.log(`GRC Agent API server listening on ${host}:${port}`);
  console.log(`API: http://localhost:${port}/api`);
  console.log(`Health: http://localhost:${port}/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Frontend dev server: http://localhost:5173`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
