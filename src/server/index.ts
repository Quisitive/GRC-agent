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
import { compareFrameworksByDomain, crossFrameworkMappings } from './frameworks/cross-mappings.js';
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

// List all policies
app.get('/api/grc/policies', (req: Request, res: Response) => {
  try {
    const policies = localStoreService.getPolicies();
    res.json({
      success: true,
      count: policies.length,
      policies
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve policies' });
  }
});

// List all plans
app.get('/api/grc/plans', (req: Request, res: Response) => {
  try {
    const plans = localStoreService.getPlans();
    res.json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve plans' });
  }
});

// Reset all client data (policies, plans, controls, procedures, documents)
app.post('/api/grc/reset', (req: Request, res: Response) => {
  try {
    localStoreService.setPolicies([]);
    localStoreService.setPlans([]);
    localStoreService.setControls([]);
    localStoreService.setProcedures([]);
    localStoreService.setClientDocuments([]);
    localStoreService.setGapExemptions([]);
    localStoreService.setImprovementInsights([]);
    localStoreService.setImprovementOutcomes([]);
    agent.clearHistory();
    res.json({ success: true, message: 'All client data has been reset' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset data' });
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
      // CSF: GV.RR-01 → GV (Govern), PR.AA-05 → PR (Protect)
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

// Delete a document
app.delete('/api/grc/documents/:id', (req: Request, res: Response) => {
  try {
    const deleted = documentIngestionService.deleteDocument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
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
// CIS Controls v8.1 reference data — all 153 safeguards with IG levels
const CIS_V8_SAFEGUARDS: Record<string, { title: string; ig: 'IG1' | 'IG2' | 'IG3' }> = {
  '1.1': { title: 'Establish and Maintain Detailed Enterprise Asset Inventory', ig: 'IG1' },
  '1.2': { title: 'Address Unauthorized Assets', ig: 'IG1' },
  '1.3': { title: 'Utilize an Active Discovery Tool', ig: 'IG2' },
  '1.4': { title: 'Use DHCP Logging to Update Enterprise Asset Inventory', ig: 'IG2' },
  '1.5': { title: 'Use a Passive Asset Discovery Tool', ig: 'IG3' },
  '2.1': { title: 'Establish and Maintain a Software Inventory', ig: 'IG1' },
  '2.2': { title: 'Ensure Authorized Software is Currently Supported', ig: 'IG1' },
  '2.3': { title: 'Address Unauthorized Software', ig: 'IG1' },
  '2.4': { title: 'Utilize Automated Software Inventory Tools', ig: 'IG2' },
  '2.5': { title: 'Allowlist Authorized Software', ig: 'IG2' },
  '2.6': { title: 'Allowlist Authorized Libraries', ig: 'IG2' },
  '2.7': { title: 'Allowlist Authorized Scripts', ig: 'IG3' },
  '3.1': { title: 'Establish and Maintain a Data Management Process', ig: 'IG1' },
  '3.2': { title: 'Establish and Maintain a Data Inventory', ig: 'IG1' },
  '3.3': { title: 'Configure Data Access Control Lists', ig: 'IG1' },
  '3.4': { title: 'Enforce Data Retention', ig: 'IG1' },
  '3.5': { title: 'Securely Dispose of Data', ig: 'IG1' },
  '3.6': { title: 'Encrypt Data on End-User Devices', ig: 'IG1' },
  '3.7': { title: 'Establish and Maintain a Data Classification Scheme', ig: 'IG2' },
  '3.8': { title: 'Document Data Flows', ig: 'IG2' },
  '3.9': { title: 'Encrypt Data on Removable Media', ig: 'IG2' },
  '3.10': { title: 'Encrypt Sensitive Data in Transit', ig: 'IG2' },
  '3.11': { title: 'Encrypt Sensitive Data at Rest', ig: 'IG2' },
  '3.12': { title: 'Segment Data Processing and Storage Based on Sensitivity', ig: 'IG2' },
  '3.13': { title: 'Deploy a Data Loss Prevention Solution', ig: 'IG3' },
  '3.14': { title: 'Log Sensitive Data Access', ig: 'IG3' },
  '4.1': { title: 'Establish and Maintain a Secure Configuration Process', ig: 'IG1' },
  '4.2': { title: 'Establish and Maintain a Secure Configuration Process for Network Infrastructure', ig: 'IG1' },
  '4.3': { title: 'Configure Automatic Session Locking on Enterprise Assets', ig: 'IG1' },
  '4.4': { title: 'Implement and Manage a Firewall on Servers', ig: 'IG1' },
  '4.5': { title: 'Implement and Manage a Firewall on End-User Devices', ig: 'IG1' },
  '4.6': { title: 'Securely Manage Enterprise Assets and Software', ig: 'IG1' },
  '4.7': { title: 'Manage Default Accounts on Enterprise Assets and Software', ig: 'IG1' },
  '4.8': { title: 'Uninstall or Disable Unnecessary Services on Enterprise Assets and Software', ig: 'IG2' },
  '4.9': { title: 'Configure Trusted DNS Servers on Enterprise Assets', ig: 'IG2' },
  '4.10': { title: 'Enforce Automatic Device Lockout on Portable End-User Devices', ig: 'IG2' },
  '4.11': { title: 'Enforce Remote Wipe Capability on Portable End-User Devices', ig: 'IG2' },
  '4.12': { title: 'Separate Enterprise Workspaces on Mobile End-User Devices', ig: 'IG3' },
  '5.1': { title: 'Establish and Maintain an Inventory of Accounts', ig: 'IG1' },
  '5.2': { title: 'Use Unique Passwords', ig: 'IG1' },
  '5.3': { title: 'Disable Dormant Accounts', ig: 'IG1' },
  '5.4': { title: 'Restrict Administrator Privileges to Dedicated Administrator Accounts', ig: 'IG1' },
  '5.5': { title: 'Establish and Maintain an Inventory of Service Accounts', ig: 'IG2' },
  '5.6': { title: 'Centralize Account Management', ig: 'IG2' },
  '6.1': { title: 'Establish an Access Granting Process', ig: 'IG1' },
  '6.2': { title: 'Establish an Access Revoking Process', ig: 'IG1' },
  '6.3': { title: 'Require MFA for Externally-Exposed Applications', ig: 'IG1' },
  '6.4': { title: 'Require MFA for Remote Network Access', ig: 'IG1' },
  '6.5': { title: 'Require MFA for Administrative Access', ig: 'IG1' },
  '6.6': { title: 'Establish and Maintain an Inventory of Authentication and Authorization Systems', ig: 'IG2' },
  '6.7': { title: 'Centralize Access Control', ig: 'IG2' },
  '6.8': { title: 'Define and Maintain Role-Based Access Control', ig: 'IG3' },
  '7.1': { title: 'Establish and Maintain a Vulnerability Management Process', ig: 'IG1' },
  '7.2': { title: 'Establish and Maintain a Remediation Process', ig: 'IG1' },
  '7.3': { title: 'Perform Automated Operating System Patch Management', ig: 'IG1' },
  '7.4': { title: 'Perform Automated Application Patch Management', ig: 'IG1' },
  '7.5': { title: 'Perform Automated Vulnerability Scans of Internal Enterprise Assets', ig: 'IG2' },
  '7.6': { title: 'Perform Automated Vulnerability Scans of Externally-Exposed Enterprise Assets', ig: 'IG2' },
  '7.7': { title: 'Remediate Detected Vulnerabilities', ig: 'IG2' },
  '8.1': { title: 'Establish and Maintain an Audit Log Management Process', ig: 'IG1' },
  '8.2': { title: 'Collect Audit Logs', ig: 'IG1' },
  '8.3': { title: 'Ensure Adequate Audit Log Storage', ig: 'IG1' },
  '8.4': { title: 'Standardize Time Synchronization', ig: 'IG2' },
  '8.5': { title: 'Collect Detailed Audit Logs', ig: 'IG2' },
  '8.6': { title: 'Collect DNS Query Audit Logs', ig: 'IG2' },
  '8.7': { title: 'Collect URL Request Audit Logs', ig: 'IG2' },
  '8.8': { title: 'Collect Command-Line Audit Logs', ig: 'IG2' },
  '8.9': { title: 'Centralize Audit Logs', ig: 'IG2' },
  '8.10': { title: 'Retain Audit Logs', ig: 'IG2' },
  '8.11': { title: 'Conduct Audit Log Reviews', ig: 'IG2' },
  '8.12': { title: 'Collect Service Provider Logs', ig: 'IG3' },
  '9.1': { title: 'Ensure Use of Only Fully Supported Browsers and Email Clients', ig: 'IG1' },
  '9.2': { title: 'Use DNS Filtering Services', ig: 'IG1' },
  '9.3': { title: 'Maintain and Enforce Network-Based URL Filters', ig: 'IG2' },
  '9.4': { title: 'Restrict Unnecessary or Unauthorized Browser and Email Client Extensions', ig: 'IG2' },
  '9.5': { title: 'Implement DMARC', ig: 'IG2' },
  '9.6': { title: 'Block Unnecessary File Types', ig: 'IG2' },
  '9.7': { title: 'Deploy and Maintain Email Server Anti-Malware Protections', ig: 'IG1' },
  '10.1': { title: 'Deploy and Maintain Anti-Malware Software', ig: 'IG1' },
  '10.2': { title: 'Configure Automatic Anti-Malware Signature Updates', ig: 'IG1' },
  '10.3': { title: 'Disable Autorun and Autoplay for Removable Media', ig: 'IG1' },
  '10.4': { title: 'Configure Automatic Anti-Malware Scanning of Removable Media', ig: 'IG2' },
  '10.5': { title: 'Enable Anti-Exploitation Features', ig: 'IG2' },
  '10.6': { title: 'Centrally Manage Anti-Malware Software', ig: 'IG2' },
  '10.7': { title: 'Use Behavior-Based Anti-Malware Software', ig: 'IG2' },
  '11.1': { title: 'Establish and Maintain a Data Recovery Process', ig: 'IG1' },
  '11.2': { title: 'Perform Automated Backups', ig: 'IG1' },
  '11.3': { title: 'Protect Recovery Data', ig: 'IG1' },
  '11.4': { title: 'Establish and Maintain an Isolated Instance of Recovery Data', ig: 'IG1' },
  '11.5': { title: 'Test Data Recovery', ig: 'IG2' },
  '12.1': { title: 'Ensure Network Infrastructure is Up-to-Date', ig: 'IG1' },
  '12.2': { title: 'Establish and Maintain a Secure Network Architecture', ig: 'IG2' },
  '12.3': { title: 'Securely Manage Network Infrastructure', ig: 'IG2' },
  '12.4': { title: 'Establish and Maintain Architecture Diagram(s)', ig: 'IG2' },
  '12.5': { title: 'Centralize Network Authentication, Authorization, and Auditing (AAA)', ig: 'IG2' },
  '12.6': { title: 'Use of Secure Network Management and Communication Protocols', ig: 'IG2' },
  '12.7': { title: 'Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise\'s AAA Infrastructure', ig: 'IG2' },
  '12.8': { title: 'Establish and Maintain Dedicated Computing Resources for All Administrative Work', ig: 'IG3' },
  '13.1': { title: 'Centralize Security Event Alerting', ig: 'IG2' },
  '13.2': { title: 'Deploy a Host-Based Intrusion Detection Solution', ig: 'IG2' },
  '13.3': { title: 'Deploy a Network Intrusion Detection Solution', ig: 'IG2' },
  '13.4': { title: 'Perform Traffic Filtering Between Network Segments', ig: 'IG2' },
  '13.5': { title: 'Manage Access Control for Remote Assets', ig: 'IG2' },
  '13.6': { title: 'Collect Network Traffic Flow Logs', ig: 'IG2' },
  '13.7': { title: 'Deploy a Host-Based Intrusion Prevention Solution', ig: 'IG3' },
  '13.8': { title: 'Deploy a Network Intrusion Prevention Solution', ig: 'IG3' },
  '13.9': { title: 'Deploy Port-Level Access Control', ig: 'IG3' },
  '13.10': { title: 'Perform Application Layer Filtering', ig: 'IG3' },
  '13.11': { title: 'Tune Security Event Alerting Thresholds', ig: 'IG3' },
  '14.1': { title: 'Establish and Maintain a Security Awareness Program', ig: 'IG1' },
  '14.2': { title: 'Train Workforce Members to Recognize Social Engineering Attacks', ig: 'IG1' },
  '14.3': { title: 'Train Workforce Members on Authentication Best Practices', ig: 'IG1' },
  '14.4': { title: 'Train Workforce on Data Handling Best Practices', ig: 'IG1' },
  '14.5': { title: 'Train Workforce Members on Causes of Unintentional Data Exposure', ig: 'IG1' },
  '14.6': { title: 'Train Workforce Members on Recognizing and Reporting Security Incidents', ig: 'IG1' },
  '14.7': { title: 'Train Workforce on How to Identify and Report if Their Enterprise Assets are Missing Security Updates', ig: 'IG1' },
  '14.8': { title: 'Train Workforce on the Dangers of Connecting to and Transmitting Enterprise Data Over Insecure Networks', ig: 'IG1' },
  '14.9': { title: 'Conduct Role-Specific Security Awareness and Skills Training', ig: 'IG2' },
  '15.1': { title: 'Establish and Maintain an Inventory of Service Providers', ig: 'IG1' },
  '15.2': { title: 'Establish and Maintain a Service Provider Management Policy', ig: 'IG2' },
  '15.3': { title: 'Classify Service Providers', ig: 'IG2' },
  '15.4': { title: 'Ensure Service Provider Contracts Include Security Requirements', ig: 'IG2' },
  '15.5': { title: 'Assess Service Providers', ig: 'IG3' },
  '15.6': { title: 'Monitor Service Providers', ig: 'IG3' },
  '15.7': { title: 'Securely Decommission Service Providers', ig: 'IG3' },
  '16.1': { title: 'Establish and Maintain a Secure Application Development Process', ig: 'IG2' },
  '16.2': { title: 'Establish and Maintain a Process to Accept and Address Software Vulnerabilities', ig: 'IG2' },
  '16.3': { title: 'Perform Root Cause Analysis on Security Vulnerabilities', ig: 'IG2' },
  '16.4': { title: 'Establish and Manage an Inventory of Third-Party Software Components', ig: 'IG2' },
  '16.5': { title: 'Use Up-to-Date and Trusted Third-Party Software Components', ig: 'IG2' },
  '16.6': { title: 'Establish and Maintain a Severity Rating System and Process for Application Vulnerabilities', ig: 'IG2' },
  '16.7': { title: 'Use Standard Hardening Configuration Templates for Application Infrastructure', ig: 'IG2' },
  '16.8': { title: 'Separate Production and Non-Production Systems', ig: 'IG2' },
  '16.9': { title: 'Train Developers in Application Security Concepts and Secure Coding', ig: 'IG2' },
  '16.10': { title: 'Apply Secure Design Principles in Application Architectures', ig: 'IG2' },
  '16.11': { title: 'Leverage Vetted Modules or Services for Application Security Components', ig: 'IG2' },
  '16.12': { title: 'Implement Code-Level Security Checks', ig: 'IG3' },
  '16.13': { title: 'Conduct Application Penetration Testing', ig: 'IG3' },
  '16.14': { title: 'Conduct Threat Modeling', ig: 'IG3' },
  '17.1': { title: 'Designate Personnel to Manage Incident Handling', ig: 'IG1' },
  '17.2': { title: 'Establish and Maintain Contact Information for Reporting Security Incidents', ig: 'IG1' },
  '17.3': { title: 'Establish and Maintain an Enterprise Process for Reporting Incidents', ig: 'IG1' },
  '17.4': { title: 'Establish and Maintain an Incident Response Process', ig: 'IG2' },
  '17.5': { title: 'Assign Key Roles and Responsibilities', ig: 'IG2' },
  '17.6': { title: 'Define Mechanisms for Communicating During Incident Response', ig: 'IG2' },
  '17.7': { title: 'Conduct Routine Incident Response Exercises', ig: 'IG2' },
  '17.8': { title: 'Conduct Post-Incident Reviews', ig: 'IG2' },
  '17.9': { title: 'Establish and Maintain Security Incident Thresholds', ig: 'IG3' },
  '18.1': { title: 'Establish and Maintain a Penetration Testing Program', ig: 'IG2' },
  '18.2': { title: 'Perform Periodic External Penetration Tests', ig: 'IG2' },
  '18.3': { title: 'Remediate Penetration Test Findings', ig: 'IG2' },
  '18.4': { title: 'Validate Security Measures', ig: 'IG3' },
  '18.5': { title: 'Perform Periodic Internal Penetration Tests', ig: 'IG3' }
};

/**
 * Parse CIS Controls v8 → CSF 2.0 mapping from ingested spreadsheet content.
 * Each safeguard row contains: CISControl,Safeguard,AssetType,SecFunction,Title,Description,IG1,IG2,IG3,Relationship,CSFSubcategory,...
 * The CSF subcategory is embedded in column 10 of each CIS safeguard row.
 */
function parseCisToCsfMapping(content: string): Record<string, Array<{ id: string; title: string; ig: 'IG1' | 'IG2' | 'IG3'; mappingType: string }>> {
  const mapping: Record<string, Array<{ id: string; title: string; ig: 'IG1' | 'IG2' | 'IG3'; mappingType: string }>> = {};
  const lines = content.split('\n');

  // CIS safeguard row pattern: starts with control#,safeguard# like "1,1.1,"
  const cisSafeguardPattern = /^(\d{1,2}),(\d{1,2}\.\d{1,2}),/;
  // CSF subcategory ID pattern
  const csfIdPattern = /^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cisMatch = trimmed.match(cisSafeguardPattern);
    if (!cisMatch) continue;

    const safeguardId = cisMatch[2];

    // Parse CSV - handle quoted fields containing commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { fields.push(current); current = ''; }
      else { current += ch; }
    }
    fields.push(current);

    // Column layout: 0=Control, 1=Safeguard, 2=AssetType, 3=SecFunction, 4=Title, 5=Description,
    //               6=IG1, 7=IG2, 8=IG3, 9=Relationship, 10=CSFSubcategories, 11=...
    const ig1 = fields[6]?.trim() === 'X';
    const ig2 = fields[7]?.trim() === 'X';
    const ig3 = fields[8]?.trim() === 'X';
    const mappingType = fields[9]?.trim() || '';
    const csfSubcatRaw = fields[10]?.trim() || '';

    // Validate it's a real CSF subcategory ID
    if (!csfSubcatRaw || !csfIdPattern.test(csfSubcatRaw)) continue;

    // Determine IG level from reference data (authoritative) or from spreadsheet
    const ref = CIS_V8_SAFEGUARDS[safeguardId];
    const ig: 'IG1' | 'IG2' | 'IG3' = ref ? ref.ig : (ig1 ? 'IG1' : ig2 ? 'IG2' : 'IG3');
    const title = ref ? ref.title : (fields[4]?.trim() || safeguardId);

    if (!mapping[csfSubcatRaw]) mapping[csfSubcatRaw] = [];
    mapping[csfSubcatRaw].push({ id: safeguardId, title, ig, mappingType });
  }
  return mapping;
}

// Enhanced CSF Gap Analysis — hierarchical breakdown with document & control mapping
// ====================
app.post('/api/grc/gap-analysis/csf-hierarchy', (req: Request, res: Response) => {
  try {
    const { organization, framework } = req.body;
    const fw = framework || 'nist-csf';

    // CSF 2.0 Function descriptions
    const functionDescriptions: Record<string, string> = {
      'GV': 'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored',
      'ID': 'The organization\'s current cybersecurity risks are understood',
      'PR': 'Safeguards to manage the organization\'s cybersecurity risks are used',
      'DE': 'Possible cybersecurity attacks and compromises are found and analyzed',
      'RS': 'Actions regarding a detected cybersecurity incident are taken',
      'RC': 'Assets and operations affected by a cybersecurity incident are restored'
    };

    // CSF 2.0 Category descriptions
    const categoryDescriptions: Record<string, string> = {
      'GV.OC': 'The circumstances — mission, stakeholder expectations, dependencies, and legal, regulatory, and contractual requirements — surrounding the organization\'s cybersecurity risk management decisions are understood',
      'GV.RM': 'The organization\'s priorities, constraints, risk tolerance and appetite statements, and assumptions are established, communicated, and used to support operational risk decisions',
      'GV.RR': 'Cybersecurity roles, responsibilities, and authorities to foster accountability, performance assessment, and continuous improvement are established and communicated',
      'GV.PO': 'Organizational cybersecurity policy is established, communicated, and enforced',
      'GV.OV': 'Results of organization-wide cybersecurity risk management activities and performance are used to inform, improve, and adjust the risk management strategy',
      'GV.SC': 'Cyber supply chain risk management processes are identified, established, assessed, managed, and agreed to by organizational stakeholders',
      'ID.AM': 'Assets (e.g., data, hardware, software, systems, facilities, services, people) that enable the organization to achieve business purposes are identified and managed consistent with their relative importance to organizational objectives and the organization\'s risk strategy',
      'ID.RA': 'The organization understands the cybersecurity risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals',
      'ID.IM': 'Improvements to organizational cybersecurity risk management processes, procedures, and activities are identified across all CSF Functions',
      'PR.AA': 'Access to physical and logical assets is limited to authorized users, services, and hardware and managed commensurate with the assessed risk of unauthorized access',
      'PR.AT': 'The organization\'s personnel and partners are provided cybersecurity awareness education and are trained to perform their cybersecurity-related duties and responsibilities',
      'PR.DS': 'Data is managed consistent with the organization\'s risk strategy to protect the confidentiality, integrity, and availability of information',
      'PR.PS': 'The hardware, software (e.g., firmware, operating systems, applications), and services of physical and virtual platforms are managed consistent with the organization\'s risk strategy',
      'PR.IR': 'Security architectures are managed with the organization\'s risk strategy to protect asset confidentiality, integrity, and availability, and organizational resilience',
      'DE.CM': 'Information systems and assets are monitored to identify cybersecurity events and verify the effectiveness of protective measures',
      'DE.AE': 'Anomalous activity is detected and the potential impact of events is understood',
      'RS.MA': 'Response processes and procedures are executed and maintained, to ensure response to detected cybersecurity incidents',
      'RS.AN': 'Analysis is conducted to ensure effective response and support recovery activities',
      'RS.CO': 'Response activities are coordinated with internal and external stakeholders',
      'RS.MI': 'Activities are performed to prevent expansion of an event, mitigate its effects, and resolve the incident',
      'RC.RP': 'Recovery processes and procedures are executed and maintained to ensure restoration of systems or assets affected by cybersecurity incidents',
      'RC.CO': 'Restoration activities are coordinated with internal and external parties'
    };

    // CSF 2.0 Subcategory descriptions
    const subcategoryDescriptions: Record<string, string> = {
      'GV.OC-01': 'The organizational mission is understood and informs cybersecurity risk management',
      'GV.OC-02': 'Internal and external stakeholders are understood, and their needs and expectations regarding cybersecurity risk management are understood and considered',
      'GV.OC-03': 'Legal, regulatory, and contractual requirements regarding cybersecurity — including privacy and civil liberties obligations — are understood and managed',
      'GV.OC-04': 'Critical objectives, capabilities, and services that stakeholders depend on or expect from the organization are understood and communicated',
      'GV.OC-05': 'Outcomes, capabilities, and services that the organization depends on are understood and communicated',
      'GV.RM-01': 'Risk management objectives are established and agreed to by organizational stakeholders',
      'GV.RM-02': 'Risk appetite and risk tolerance statements are established, communicated, and maintained',
      'GV.RM-03': 'Cybersecurity risk management activities and outcomes are included in enterprise risk management processes',
      'GV.RM-04': 'Strategic direction that describes appropriate risk response options is established and communicated',
      'GV.RM-05': 'Lines of communication across the organization are established for cybersecurity risks, including risks from suppliers and other third parties',
      'GV.RM-06': 'A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks is established and communicated',
      'GV.RM-07': 'Strategic opportunities (i.e., positive risks) are characterized and are included in organizational cybersecurity risk discussions',
      'GV.RR-01': 'Organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical, and continually improving',
      'GV.RR-02': 'Roles, responsibilities, and authorities related to cybersecurity risk management are established, communicated, understood, and enforced',
      'GV.RR-03': 'Adequate resources are allocated commensurate with the cybersecurity risk strategy, roles, responsibilities, and policies',
      'GV.RR-04': 'Cybersecurity is included in human resources practices',
      'GV.PO-01': 'Policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy, and priorities and is communicated and enforced',
      'GV.PO-02': 'Policy for managing cybersecurity risks is reviewed, updated, communicated, and enforced to reflect changes in requirements, threats, technology, and organizational mission',
      'GV.OV-01': 'Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction',
      'GV.OV-02': 'The cybersecurity risk management strategy is reviewed and adjusted to ensure coverage of organizational requirements and risks',
      'GV.OV-03': 'Organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed',
      'GV.SC-01': 'A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders',
      'GV.SC-02': 'Cybersecurity roles and responsibilities for suppliers, customers, and partners are established, communicated, and coordinated internally and externally',
      'GV.SC-03': 'Cybersecurity supply chain risk management is integrated into cybersecurity and enterprise risk management, risk assessment, and improvement processes',
      'GV.SC-04': 'Suppliers are known and prioritized by criticality',
      'GV.SC-05': 'Requirements to address cybersecurity risks in supply chains are established, prioritized, and integrated into contracts and other types of agreements with suppliers and other relevant third parties',
      'GV.SC-06': 'Planning and due diligence are performed to reduce risks before entering into formal supplier or other third-party relationships',
      'GV.SC-07': 'The risks posed by a supplier, their products and services, and other third parties are understood, recorded, prioritized, assessed, responded to, and monitored over the course of the relationship',
      'GV.SC-08': 'Relevant suppliers and other third parties are included in incident planning, response, and recovery activities',
      'GV.SC-09': 'Supply chain security practices are integrated into cybersecurity and enterprise risk management programs, and their performance is monitored throughout the technology product and service life cycle',
      'GV.SC-10': 'Cybersecurity supply chain risk management plans include provisions for activities that occur after the conclusion of a partnership or service agreement',
      'ID.AM-01': 'Inventories of hardware managed by the organization are maintained',
      'ID.AM-02': 'Inventories of software, services, and systems managed by the organization are maintained',
      'ID.AM-03': 'Representations of the organization\'s authorized network communication and internal and external network data flows are maintained',
      'ID.AM-04': 'Inventories of services provided by suppliers are maintained',
      'ID.AM-05': 'Assets are prioritized based on classification, criticality, resources, and impact on the mission',
      'ID.AM-07': 'Inventories of data and corresponding metadata for designated data types are maintained',
      'ID.AM-08': 'Systems, hardware, software, services, and data are managed throughout their life cycles',
      'ID.RA-01': 'Vulnerabilities in assets are identified, validated, and recorded',
      'ID.RA-02': 'Cyber threat intelligence is received from information sharing forums and sources',
      'ID.RA-03': 'Internal and external threats to the organization are identified and recorded',
      'ID.RA-04': 'Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded',
      'ID.RA-05': 'Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform risk response prioritization',
      'ID.RA-06': 'Risk responses are chosen, prioritized, planned, tracked, and communicated',
      'ID.RA-07': 'Changes and exceptions are managed, assessed for risk impact, recorded, and tracked',
      'ID.RA-08': 'Processes for receiving, analyzing, and responding to vulnerability disclosures are established',
      'ID.RA-09': 'The authenticity and integrity of hardware and software are assessed prior to acquisition and use',
      'ID.RA-10': 'Critical suppliers are assessed prior to acquisition',
      'ID.IM-01': 'Improvements are identified from evaluations',
      'ID.IM-02': 'Improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties',
      'ID.IM-03': 'Improvements are identified from execution of operational processes, procedures, and activities',
      'ID.IM-04': 'Incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained, and improved',
      'PR.AA-01': 'Identities and credentials for authorized users, services, and hardware are managed by the organization',
      'PR.AA-02': 'Identities are proofed and bound to credentials based on the context of interactions',
      'PR.AA-03': 'Users, services, and hardware are authenticated',
      'PR.AA-04': 'Identity assertions are protected, conveyed, and verified',
      'PR.AA-05': 'Access permissions, entitlements, and authorizations are defined in a policy, managed, enforced, and reviewed, and incorporate the principles of least privilege and separation of duties',
      'PR.AA-06': 'Physical access to assets is managed, monitored, and enforced commensurate with risk',
      'PR.AT-01': 'Personnel are provided with awareness and training so that they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind',
      'PR.AT-02': 'Individuals in specialized roles are provided with awareness and training so that they possess the knowledge and skills to perform relevant tasks with cybersecurity risks in mind',
      'PR.DS-01': 'The confidentiality, integrity, and availability of data-at-rest are protected',
      'PR.DS-02': 'The confidentiality, integrity, and availability of data-in-transit are protected',
      'PR.DS-10': 'The confidentiality, integrity, and availability of data-in-use are protected',
      'PR.DS-11': 'Backups of data are created, protected, maintained, and tested',
      'PR.PS-01': 'Configuration management practices are established and applied',
      'PR.PS-02': 'Software is maintained, replaced, and removed commensurate with risk',
      'PR.PS-03': 'Hardware is maintained, replaced, and removed commensurate with risk',
      'PR.PS-04': 'Log records are generated and made available for continuous monitoring',
      'PR.PS-05': 'Installation and execution of unauthorized software are prevented',
      'PR.PS-06': 'Secure software development practices are integrated, and their performance is monitored throughout the software development life cycle',
      'PR.IR-01': 'Networks and environments are protected from unauthorized logical access and usage',
      'PR.IR-02': 'The organization\'s technology assets are protected from environmental threats',
      'PR.IR-03': 'Mechanisms are implemented to achieve resilience requirements in normal and adverse situations',
      'PR.IR-04': 'Adequate resource capacity to ensure availability is maintained',
      'DE.CM-01': 'Networks and network services are monitored to find potentially adverse events',
      'DE.CM-02': 'The physical environment is monitored to find potentially adverse events',
      'DE.CM-03': 'Personnel activity and technology usage are monitored to find potentially adverse events',
      'DE.CM-06': 'External service provider activities and services are monitored to find potentially adverse events',
      'DE.CM-09': 'Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events',
      'DE.AE-02': 'Potentially adverse events are analyzed to better understand associated activities',
      'DE.AE-03': 'Information is correlated from multiple sources',
      'DE.AE-04': 'The estimated impact and scope of adverse events are understood',
      'DE.AE-06': 'Information on adverse events is provided to authorized staff and tools',
      'DE.AE-07': 'Cyber threat intelligence and other contextual information are integrated into the analysis',
      'DE.AE-08': 'Incidents are declared when adverse events meet the defined incident criteria',
      'RS.MA-01': 'The incident response plan is executed in coordination with relevant third parties once an incident is declared',
      'RS.MA-02': 'Incident reports are triaged and validated',
      'RS.MA-03': 'Incidents are categorized and prioritized',
      'RS.MA-04': 'Incidents are escalated or elevated as needed',
      'RS.MA-05': 'The criteria for initiating incident recovery are applied',
      'RS.AN-03': 'Analysis is performed to determine what has taken place during an incident and the root cause of the incident',
      'RS.AN-06': 'Actions performed during an investigation are recorded, and the records\' integrity and provenance are preserved',
      'RS.AN-07': 'Incident data and metadata are collected, and their integrity and provenance are preserved',
      'RS.AN-08': 'An incident\'s magnitude is estimated and validated',
      'RS.CO-02': 'Internal and external stakeholders are notified of incidents',
      'RS.CO-03': 'Information is shared with designated internal and external stakeholders',
      'RS.MI-01': 'Incidents are contained',
      'RS.MI-02': 'Incidents are eradicated',
      'RC.RP-01': 'The recovery portion of the incident response plan is executed once initiated from the incident response process',
      'RC.RP-02': 'Recovery actions are selected, scoped, prioritized, and performed',
      'RC.RP-03': 'The integrity of backups and other restoration assets is verified before using them for restoration',
      'RC.RP-04': 'Critical mission functions and cybersecurity risk management are considered to establish post-incident operational norms',
      'RC.RP-05': 'The integrity of restored assets is verified, systems and services are restored, and normal operating status is confirmed',
      'RC.RP-06': 'The end of incident recovery is declared based on criteria, and incident-related documentation is completed',
      'RC.CO-03': 'Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders',
      'RC.CO-04': 'Public updates on incident recovery are shared using approved methods and messaging'
    };

    // CSF 2.0 taxonomy structure
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

    // Parse CIS → CSF mapping from any ingested CIS mapping document
    let cisToCsfMap: Record<string, Array<{ id: string; title: string; ig: 'IG1' | 'IG2' | 'IG3'; mappingType: string }>> = {};
    const cisDoc = docs.find(d => /cis/i.test(d.title) && /csf/i.test(d.title));
    if (cisDoc && cisDoc.content) {
      cisToCsfMap = parseCisToCsfMapping(cisDoc.content);
    }

    // Build a set of all covered subcategory/category IDs from documents and controls
    const coveredIds = new Set<string>();
    const coverageSource: Record<string, { documents: string[]; controls: string[]; cisV8Sources: string[] }> = {};

    const addCoverage = (id: string, source: string, type: 'documents' | 'controls', isCisSource: boolean) => {
      const upper = id.toUpperCase();
      coveredIds.add(upper);
      if (!coverageSource[upper]) coverageSource[upper] = { documents: [], controls: [], cisV8Sources: [] };
      coverageSource[upper][type].push(source);
      if (isCisSource) coverageSource[upper].cisV8Sources.push(source);
    };

    // From ingested documents: extract control IDs and map them
    docs.forEach(doc => {
      const isCis = /cis/i.test(doc.title);
      (doc.extractedControlIds || []).forEach((rawId: string) => {
        const id = rawId.toUpperCase().replace(/\s+/g, '');
        addCoverage(id, doc.title, 'documents', isCis);
        const catMatch = id.match(/^([A-Z]{2}\.[A-Z]{2})/);
        if (catMatch) addCoverage(catMatch[1], doc.title, 'documents', isCis);
        const funcMatch = id.match(/^([A-Z]{2})/);
        if (funcMatch) addCoverage(funcMatch[1], doc.title, 'documents', isCis);
      });
    });

    // From implemented controls
    csfControls.forEach(c => {
      const id = c.frameworkControlId.toUpperCase().replace(/\s+/g, '');
      const label = `${c.controlName} [${c.status}]`;
      addCoverage(id, label, 'controls', false);
      const catMatch = id.match(/^([A-Z]{2}\.[A-Z]{2})/);
      if (catMatch) addCoverage(catMatch[1], label, 'controls', false);
      const funcMatch = id.match(/^([A-Z]{2})/);
      if (funcMatch) addCoverage(funcMatch[1], label, 'controls', false);
    });

    // Detect partial mappings
    const partialMappings: Array<{ subcategory: string; category: string; issue: string }> = [];

    // Build hierarchical result
    const functions: Array<{
      id: string; name: string; description: string; color: string;
      totalSubcategories: number; covered: number; gaps: number;
      coveragePercent: number; explicitlyMapped: boolean;
      categories: Array<{
        id: string; name: string; description: string;
        totalSubcategories: number; covered: number; gaps: number;
        coveragePercent: number; explicitlyMapped: boolean;
        subcategories: Array<{
          id: string; description: string; covered: boolean;
          sources: { documents: string[]; controls: string[]; cisV8Sources: string[] };
          cisControls: Array<{ id: string; title: string; ig: 'IG1' | 'IG2' | 'IG3'; mappingType: string }>;
        }>;
        gapSubcategories: string[];
      }>;
    }> = [];

    let totalSubs = 0;
    let totalCovered = 0;

    for (const [funcId, func] of Object.entries(csfTaxonomy)) {
      const funcExplicit = coveredIds.has(funcId);
      const funcResult: typeof functions[0] = {
        id: funcId, name: func.name, description: functionDescriptions[funcId] || '', color: func.color,
        totalSubcategories: 0, covered: 0, gaps: 0,
        coveragePercent: 0, explicitlyMapped: funcExplicit,
        categories: []
      };

      for (const [catId, cat] of Object.entries(func.categories)) {
        const catExplicit = coveredIds.has(catId);
        const catResult: typeof funcResult.categories[0] = {
          id: catId, name: cat.name, description: categoryDescriptions[catId] || '',
          totalSubcategories: cat.subcategories.length,
          covered: 0, gaps: 0, coveragePercent: 0,
          explicitlyMapped: catExplicit,
          subcategories: [],
          gapSubcategories: []
        };

        for (const subId of cat.subcategories) {
          const subUpper = subId.toUpperCase();
          const directlyCovered = coveredIds.has(subUpper);
          const coveredByCategory = catExplicit && !directlyCovered;
          const isCovered = directlyCovered || coveredByCategory;

          const sources = coverageSource[subUpper] || { documents: [], controls: [], cisV8Sources: [] };
          if (coveredByCategory && coverageSource[catId]) {
            sources.documents = [...new Set([...sources.documents, ...coverageSource[catId].documents])];
            sources.controls = [...new Set([...sources.controls, ...coverageSource[catId].controls])];
            sources.cisV8Sources = [...new Set([...sources.cisV8Sources, ...coverageSource[catId].cisV8Sources])];
          }

          catResult.subcategories.push({
            id: subId,
            description: subcategoryDescriptions[subUpper] || subcategoryDescriptions[subId] || '',
            covered: isCovered,
            sources,
            cisControls: cisToCsfMap[subUpper] || cisToCsfMap[subId] || []
          });

          if (isCovered) {
            catResult.covered++;
          } else {
            catResult.gaps++;
            catResult.gapSubcategories.push(subId);
          }

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
// Cross-Framework Coverage Map (NIST CSF 2.0 base)
// ====================
app.post('/api/grc/analytics/cross-framework-coverage', (req: Request, res: Response) => {
  try {
    const { organization } = req.body;

    // Re-use CSF taxonomy from csf-hierarchy endpoint
    const csfTaxonomy: Record<string, { name: string; color: string; categories: Record<string, { name: string; subcategories: string[] }> }> = {
      'GV': { name: 'Govern', color: '#9b59b6', categories: {
        'GV.OC': { name: 'Organizational Context', subcategories: ['GV.OC-01','GV.OC-02','GV.OC-03','GV.OC-04','GV.OC-05'] },
        'GV.RM': { name: 'Risk Management Strategy', subcategories: ['GV.RM-01','GV.RM-02','GV.RM-03','GV.RM-04','GV.RM-05','GV.RM-06','GV.RM-07'] },
        'GV.RR': { name: 'Roles, Responsibilities & Authorities', subcategories: ['GV.RR-01','GV.RR-02','GV.RR-03','GV.RR-04'] },
        'GV.PO': { name: 'Policy', subcategories: ['GV.PO-01','GV.PO-02'] },
        'GV.OV': { name: 'Oversight', subcategories: ['GV.OV-01','GV.OV-02','GV.OV-03'] },
        'GV.SC': { name: 'Cybersecurity Supply Chain Risk Management', subcategories: ['GV.SC-01','GV.SC-02','GV.SC-03','GV.SC-04','GV.SC-05','GV.SC-06','GV.SC-07','GV.SC-08','GV.SC-09','GV.SC-10'] }
      }},
      'ID': { name: 'Identify', color: '#3498db', categories: {
        'ID.AM': { name: 'Asset Management', subcategories: ['ID.AM-01','ID.AM-02','ID.AM-03','ID.AM-04','ID.AM-05','ID.AM-07','ID.AM-08'] },
        'ID.RA': { name: 'Risk Assessment', subcategories: ['ID.RA-01','ID.RA-02','ID.RA-03','ID.RA-04','ID.RA-05','ID.RA-06','ID.RA-07','ID.RA-08','ID.RA-09','ID.RA-10'] },
        'ID.IM': { name: 'Improvement', subcategories: ['ID.IM-01','ID.IM-02','ID.IM-03','ID.IM-04'] }
      }},
      'PR': { name: 'Protect', color: '#27ae60', categories: {
        'PR.AA': { name: 'Identity Management, Authentication & Access Control', subcategories: ['PR.AA-01','PR.AA-02','PR.AA-03','PR.AA-04','PR.AA-05','PR.AA-06'] },
        'PR.AT': { name: 'Awareness and Training', subcategories: ['PR.AT-01','PR.AT-02'] },
        'PR.DS': { name: 'Data Security', subcategories: ['PR.DS-01','PR.DS-02','PR.DS-10','PR.DS-11'] },
        'PR.PS': { name: 'Platform Security', subcategories: ['PR.PS-01','PR.PS-02','PR.PS-03','PR.PS-04','PR.PS-05','PR.PS-06'] },
        'PR.IR': { name: 'Technology Infrastructure Resilience', subcategories: ['PR.IR-01','PR.IR-02','PR.IR-03','PR.IR-04'] }
      }},
      'DE': { name: 'Detect', color: '#f39c12', categories: {
        'DE.CM': { name: 'Continuous Monitoring', subcategories: ['DE.CM-01','DE.CM-02','DE.CM-03','DE.CM-06','DE.CM-09'] },
        'DE.AE': { name: 'Adverse Event Analysis', subcategories: ['DE.AE-02','DE.AE-03','DE.AE-04','DE.AE-06','DE.AE-07','DE.AE-08'] }
      }},
      'RS': { name: 'Respond', color: '#e74c3c', categories: {
        'RS.MA': { name: 'Incident Management', subcategories: ['RS.MA-01','RS.MA-02','RS.MA-03','RS.MA-04','RS.MA-05'] },
        'RS.AN': { name: 'Incident Analysis', subcategories: ['RS.AN-03','RS.AN-06','RS.AN-07','RS.AN-08'] },
        'RS.CO': { name: 'Incident Response Reporting and Communication', subcategories: ['RS.CO-02','RS.CO-03'] },
        'RS.MI': { name: 'Incident Mitigation', subcategories: ['RS.MI-01','RS.MI-02'] }
      }},
      'RC': { name: 'Recover', color: '#1abc9c', categories: {
        'RC.RP': { name: 'Incident Recovery Plan Execution', subcategories: ['RC.RP-01','RC.RP-02','RC.RP-03','RC.RP-04','RC.RP-05','RC.RP-06'] },
        'RC.CO': { name: 'Incident Recovery Communication', subcategories: ['RC.CO-03','RC.CO-04'] }
      }}
    };

    // Gather documents & implemented controls
    const docs = documentIngestionService.listDocuments(organization ? { organization } : undefined);
    const allControls = organization
      ? controlService.getControlsByOrganization(organization)
      : controlService.getAllControls();

    // Build reverse cross-mapping: CSF subcategory/category → other framework controls
    // From crossFrameworkMappings, each domain has a NIST_CSF reference + controls from other frameworks
    const csfToOtherFrameworks: Record<string, Array<{ framework: string; controlId: string; domain: string }>> = {};

    for (const mapping of crossFrameworkMappings) {
      const csfIds = mapping.controls[ComplianceFramework.NIST_CSF] || [];
      for (const csfId of csfIds) {
        // Map each non-CSF framework's controls to this CSF reference
        for (const [fw, controls] of Object.entries(mapping.controls)) {
          if (fw === ComplianceFramework.NIST_CSF) continue;
          const fwName = FrameworkRegistry.getFramework(fw as ComplianceFramework)?.name || fw;
          for (const ctrlId of controls as string[]) {
            if (!csfToOtherFrameworks[csfId]) csfToOtherFrameworks[csfId] = [];
            csfToOtherFrameworks[csfId].push({ framework: fwName, controlId: ctrlId, domain: mapping.domain });
          }
        }
      }
    }

    // Parse CIS→CSF mapping from ingested documents (for per-safeguard detail)
    let cisToCsfMap: Record<string, Array<{ id: string; title: string; ig: 'IG1' | 'IG2' | 'IG3'; mappingType: string }>> = {};
    const cisDoc = docs.find(d => /cis/i.test(d.title) && /csf/i.test(d.title));
    if (cisDoc && cisDoc.content) {
      cisToCsfMap = parseCisToCsfMapping(cisDoc.content);
    }

    // Build evidence map: which documents provide evidence for which framework controls
    // Group documents by framework
    const docsByFramework: Record<string, Array<{ title: string; controlIds: string[] }>> = {};
    docs.forEach(doc => {
      const frameworks = doc.mappedFrameworks || [];
      frameworks.forEach((fw: string) => {
        if (!docsByFramework[fw]) docsByFramework[fw] = [];
        docsByFramework[fw].push({ title: doc.title, controlIds: doc.extractedControlIds || [] });
      });
      // Also detect framework from title/content
      if (/cis/i.test(doc.title)) {
        if (!docsByFramework['cis-controls']) docsByFramework['cis-controls'] = [];
        docsByFramework['cis-controls'].push({ title: doc.title, controlIds: doc.extractedControlIds || [] });
      }
      if (/hipaa/i.test(doc.title)) {
        if (!docsByFramework['hipaa']) docsByFramework['hipaa'] = [];
        docsByFramework['hipaa'].push({ title: doc.title, controlIds: doc.extractedControlIds || [] });
      }
    });

    // Track which CSF subcategories are covered by which framework controls (with evidence)
    type CoverageEntry = {
      framework: string;
      controlId: string;
      source: 'cross-mapping' | 'document' | 'implemented-control' | 'cis-csf-mapping';
      evidence?: string; // document title or control name
      ig?: string; // CIS implementation group
    };

    const subcategoryCoverage: Record<string, CoverageEntry[]> = {};
    const addCoverageEntry = (subId: string, entry: CoverageEntry) => {
      const key = subId.toUpperCase();
      if (!subcategoryCoverage[key]) subcategoryCoverage[key] = [];
      // Deduplicate
      const exists = subcategoryCoverage[key].some(
        e => e.framework === entry.framework && e.controlId === entry.controlId && e.source === entry.source
      );
      if (!exists) subcategoryCoverage[key].push(entry);
    };

    // 1. From CIS-to-CSF detailed mapping (per-safeguard)
    for (const [subId, cisControls] of Object.entries(cisToCsfMap)) {
      for (const cis of cisControls) {
        addCoverageEntry(subId, {
          framework: 'CIS Controls v8.1',
          controlId: cis.id,
          source: 'cis-csf-mapping',
          evidence: cis.title,
          ig: cis.ig
        });
      }
    }

    // 2. From cross-framework mappings (domain-level → CSF categories/subcategories)
    for (const [csfRef, otherControls] of Object.entries(csfToOtherFrameworks)) {
      // csfRef might be a category (e.g. 'PR.AA-05') or just partial
      // Map it to any matching subcategory
      const csfUpper = csfRef.toUpperCase().replace(/\s+/g, '');
      for (const [, func] of Object.entries(csfTaxonomy)) {
        for (const [catId, cat] of Object.entries(func.categories)) {
          for (const subId of cat.subcategories) {
            // Match if the cross-map references this category
            if (subId.toUpperCase().startsWith(catId.toUpperCase()) && 
                (csfUpper.startsWith(catId.toUpperCase()) || catId.toUpperCase().startsWith(csfUpper))) {
              for (const ctrl of otherControls) {
                addCoverageEntry(subId, {
                  framework: ctrl.framework,
                  controlId: ctrl.controlId,
                  source: 'cross-mapping',
                  evidence: `Domain: ${ctrl.domain}`
                });
              }
            }
          }
        }
      }
    }

    // 3. From implemented controls (explicit CSF control implementations)
    allControls.forEach(c => {
      const fwName = FrameworkRegistry.getFramework(c.framework as ComplianceFramework)?.name || c.framework;
      const ctrlId = c.frameworkControlId.toUpperCase().replace(/\s+/g, '');
      // Direct CSF control implementations
      if (c.framework === ComplianceFramework.NIST_CSF) {
        addCoverageEntry(ctrlId, {
          framework: fwName,
          controlId: c.frameworkControlId,
          source: 'implemented-control',
          evidence: `${c.controlName} [${c.status}]`
        });
      }
    });

    // 4. From documents that explicitly reference CSF subcategory IDs
    docs.forEach(doc => {
      (doc.extractedControlIds || []).forEach((rawId: string) => {
        const id = rawId.toUpperCase().replace(/\s+/g, '');
        // Check if this looks like a CSF subcategory ID
        if (/^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$/.test(id)) {
          addCoverageEntry(id, {
            framework: 'NIST CSF 2.0',
            controlId: rawId,
            source: 'document',
            evidence: doc.title
          });
        }
      });
    });

    // Build the hierarchical result
    const frameworksSeen = new Set<string>();
    const functions: Array<{
      id: string; name: string; color: string;
      totalSubcategories: number; coveredCount: number; coveragePercent: number;
      categories: Array<{
        id: string; name: string;
        totalSubcategories: number; coveredCount: number; coveragePercent: number;
        subcategories: Array<{
          id: string;
          covered: boolean;
          coveringControls: CoverageEntry[];
          frameworkCount: number;
        }>;
      }>;
    }> = [];

    let totalSubs = 0;
    let totalCovered = 0;

    for (const [funcId, func] of Object.entries(csfTaxonomy)) {
      const funcResult: typeof functions[0] = {
        id: funcId, name: func.name, color: func.color,
        totalSubcategories: 0, coveredCount: 0, coveragePercent: 0,
        categories: []
      };

      for (const [catId, cat] of Object.entries(func.categories)) {
        const catResult: typeof funcResult.categories[0] = {
          id: catId, name: cat.name,
          totalSubcategories: cat.subcategories.length,
          coveredCount: 0, coveragePercent: 0,
          subcategories: []
        };

        for (const subId of cat.subcategories) {
          const coverage = subcategoryCoverage[subId.toUpperCase()] || [];
          const isCovered = coverage.length > 0;
          const uniqueFrameworks = new Set(coverage.map(c => c.framework));
          uniqueFrameworks.forEach(f => frameworksSeen.add(f));

          catResult.subcategories.push({
            id: subId,
            covered: isCovered,
            coveringControls: coverage,
            frameworkCount: uniqueFrameworks.size
          });

          if (isCovered) catResult.coveredCount++;
        }

        catResult.coveragePercent = catResult.totalSubcategories > 0
          ? Math.round((catResult.coveredCount / catResult.totalSubcategories) * 100) : 0;

        funcResult.totalSubcategories += catResult.totalSubcategories;
        funcResult.coveredCount += catResult.coveredCount;
        funcResult.categories.push(catResult);
      }

      funcResult.coveragePercent = funcResult.totalSubcategories > 0
        ? Math.round((funcResult.coveredCount / funcResult.totalSubcategories) * 100) : 0;

      totalSubs += funcResult.totalSubcategories;
      totalCovered += funcResult.coveredCount;
      functions.push(funcResult);
    }

    // Summary by contributing framework
    const frameworkSummary: Array<{ framework: string; subcategoriesCovered: number; controlCount: number }> = [];
    for (const fw of frameworksSeen) {
      const coveredSubs = new Set<string>();
      let controlCount = 0;
      for (const [subId, entries] of Object.entries(subcategoryCoverage)) {
        const fwEntries = entries.filter(e => e.framework === fw);
        if (fwEntries.length > 0) {
          coveredSubs.add(subId);
          controlCount += fwEntries.length;
        }
      }
      frameworkSummary.push({ framework: fw, subcategoriesCovered: coveredSubs.size, controlCount });
    }
    frameworkSummary.sort((a, b) => b.subcategoriesCovered - a.subcategoriesCovered);

    res.json({
      success: true,
      organization: organization || 'all',
      baseFramework: 'NIST CSF 2.0',
      overallCoverage: totalSubs > 0 ? Math.round((totalCovered / totalSubs) * 100) : 0,
      totalSubcategories: totalSubs,
      totalCovered,
      totalGaps: totalSubs - totalCovered,
      contributingFrameworks: frameworkSummary,
      documentsAnalyzed: docs.length,
      controlsAnalyzed: allControls.length,
      functions
    });
  } catch (error: any) {
    res.status(500).json({ error: `Cross-framework coverage analysis failed: ${error?.message || 'Unknown error'}` });
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
