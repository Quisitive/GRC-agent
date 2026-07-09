<!-- markdownlint-disable MD013 MD032 -->
# GRC-agent

AI-powered Governance, Risk, and Compliance (GRC) agent for Microsoft Teams, Web interfaces, and MCP (Model Context Protocol).

## Features

- **Policy Generation & Analysis** - Generate security policies aligned with compliance frameworks, or upload existing policies for gap analysis
- **Document Ingestion** - Upload and analyze existing organizational documents (policies, procedures, plans, SSPs) with automatic framework detection and control mapping
- **Gap Analysis** - Analyze policies against any supported framework to identify compliance gaps
- **Security Plans** - Create SSP, IRP, BRP, BC/DR, and Test/Failover plans
- **Cross-Framework Comparison** - Compare 2-3 frameworks side-by-side across 23 security domains to identify control overlap and gaps
- **Compliance Posture Management** - Ingest compliance status and cross-map to target frameworks
- **Offline Continuity Package** - Maintain a local package of frameworks, controls, policies, plans, procedures, and connection health
- **Gap Exemption Tracking** - Record risk acceptance, mitigation details, residual risk, risk owner, and review dates
- **Continuous Improvement Insights** - Capture runtime errors and gap-analysis lessons learned to reinforce recommendations
- **Multi-Framework Support** - 31 frameworks covering NIST, ISO, federal regulations, state privacy laws, and AI governance
- **Microsoft Teams Integration** - Bot interface for team-wide GRC assistance
- **MCP Server** - Expose GRC tools to AI assistants like Claude via Model Context Protocol

## Project Structure

```text
├── src/
│   ├── client/              # Vite frontend (TypeScript)
│   │   ├── main.ts          # Main application entry
│   │   └── style.css        # Styles
│   └── server/              # Express backend (TypeScript)
│       ├── index.ts         # Server entry point
│       ├── mcp/             # MCP server for AI assistants
│       ├── agent/           # GRC AI agent core
│       ├── frameworks/      # Compliance framework definitions & cross-mappings
│       ├── services/        # Policy, framework, planning, document ingestion services
│       ├── teams/           # Microsoft Teams bot integration
│       └── types/           # TypeScript type definitions
├── public/                  # Static web UI
│   ├── index.html           # Main application page
│   └── static/              # CSS & JavaScript
├── index.html               # Vite entry HTML
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config (client)
├── tsconfig.server.json     # TypeScript config (server)
├── mcp-config.example.json  # MCP configuration example
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

Run both frontend (Vite) and backend (Express) development servers:

```bash
npm run dev
```

- **Frontend**: <http://localhost:5173> (Vite dev server with HMR)
- **Backend API**: <http://localhost:3000/api> (Express server)

The Vite dev server proxies `/api/*` requests to the Express backend.

### Individual Development Servers

```bash
# Frontend only
npm run dev:client

# Backend only
npm run dev:server
```

### Production Build

```bash
npm run build
```

This builds:
- Client → `dist/client/` (static assets)
- Server → `dist/server/` (Node.js bundle)

### Production Start

```bash
npm start
```

## Supported Frameworks (31)

### NIST Frameworks

| Framework | Version | Description |
|-----------|---------|-------------|
| NIST CSF | 2.0 | Cybersecurity Framework |
| NIST SP 800-53 | Rev 5 | Security and Privacy Controls |
| NIST SP 800-171 | Rev 3 | Protecting CUI in Nonfederal Systems |
| CMMC | 2.0 | Cybersecurity Maturity Model Certification |
| NIST AI RMF | 1.0 | AI Risk Management Framework |

### Industry Standards

| Framework | Version | Description |
|-----------|---------|-------------|
| CIS Controls | v8 | Critical Security Controls |
| HITRUST CSF | v11 | Health Information Trust Alliance |
| ISO/IEC 27001 | 2022 | Information Security Management Systems |
| ISO/IEC 27701 | 2019 | Privacy Information Management |
| SOC 2 | 2022 | Trust Services Criteria |
| PCI DSS | 4.0 | Payment Card Industry Data Security Standard |

### Federal Regulations

| Framework | Version | Description |
|-----------|---------|-------------|
| HIPAA | 2013 | Health Insurance Portability and Accountability Act |
| FedRAMP | Rev 5 | Federal Risk and Authorization Management Program |
| FISMA | 2014 | Federal Information Security Modernization Act |
| CJIS | 5.9 | Criminal Justice Information Services |
| FERPA | §1232g | Family Educational Rights and Privacy Act |
| COPPA | 16 CFR 312 | Children's Online Privacy Protection Act |
| SOX | 2002 | Sarbanes-Oxley IT General Controls |
| GLBA | 1999 | Gramm-Leach-Bliley Financial Privacy |

### Privacy Laws

| Framework | Version | Description |
|-----------|---------|-------------|
| GDPR | 2018 | EU General Data Protection Regulation |
| CCPA | 2020 | California Consumer Privacy Act |
| CPRA | 2023 | California Privacy Rights Act |
| VCDPA | 2023 | Virginia Consumer Data Protection Act |
| CPA (Colorado) | 2023 | Colorado Privacy Act |
| CTDPA | 2023 | Connecticut Data Privacy Act |
| TDPSA (Texas) | 2024 | Texas Data Privacy and Security Act |
| NYDFS | 23 NYCRR 500 | NY Dept. of Financial Services Cybersecurity |
| NY SHIELD Act | 2020 | Stop Hacks and Improve Electronic Data Security |
| CMIA | Civil Code §56 | CA Confidentiality of Medical Information Act |

### AI & Emerging Regulations

| Framework | Version | Description |
|-----------|---------|-------------|
| EU AI Act | 2024 | EU Artificial Intelligence Act |
| EO 14110 | 2023 | Executive Order on Safe AI |

## Cross-Framework Comparison Domains (23)

The tool maps controls across frameworks in these security domains:
- Asset Management
- Access Control
- Security Awareness & Training
- Data Protection & Encryption
- Vulnerability Management
- Configuration Management
- Audit Logging & Monitoring
- Network Security
- Incident Response
- Business Continuity & Recovery
- Risk Management
- Security Governance & Policy
- Third-Party / Vendor Management
- Physical & Environmental Security
- Malware & Endpoint Protection
- Change Management
- Privacy & Data Subject Rights
- AI Governance & Trustworthiness
- AI Transparency & Explainability
- AI Safety & Testing
- AI Data Governance
- Data Protection Assessments
- Breach Notification
- Children & Student Privacy

## API Endpoints

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api` | API info |
| POST | `/api/grc/process` | Process natural language GRC request |

### Frameworks & Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grc/frameworks` | List all frameworks |
| GET | `/api/grc/frameworks/:id` | Get framework details |
| GET | `/api/grc/frameworks/:id/controls` | Get framework controls |
| GET | `/api/grc/search` | Global search across all frameworks |
| POST | `/api/grc/frameworks/compare` | Compare 2-3 frameworks by domain |
| GET | `/api/grc/frameworks/:id/implementation-summary` | Framework implementation summary |

### Document Ingestion & Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/grc/documents/ingest` | Upload/ingest document for analysis |
| GET | `/api/grc/documents` | List ingested documents |
| GET | `/api/grc/documents/:id` | Get specific document |
| PUT | `/api/grc/documents/:id` | Update document |
| POST | `/api/grc/documentation/gap-analysis` | Analyze document against framework |

### Compliance Posture

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/grc/compliance/ingest` | Ingest org compliance status |
| GET | `/api/grc/compliance/posture` | Get ingested posture |
| POST | `/api/grc/compliance/cross-map` | Cross-map posture to targets |

### Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grc/policies` | List all policies |
| GET | `/api/grc/policies/:id` | Get specific policy |
| GET | `/api/grc/policies/:id/export` | Export policy as Markdown |

### Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grc/plans` | List all plans |
| GET | `/api/grc/plans/:id` | Get specific plan |
| GET | `/api/grc/plans/:id/export` | Export plan as Markdown |

### Controls & Procedures

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grc/controls` | List control implementations |
| POST | `/api/grc/controls` | Create control implementation |
| GET | `/api/grc/controls/:id` | Get control implementation |
| PUT | `/api/grc/controls/:id` | Update control implementation |
| DELETE | `/api/grc/controls/:id` | Delete control implementation |
| GET | `/api/grc/controls/:controlId/procedures` | List procedures for control |
| POST | `/api/grc/controls/:controlId/procedures` | Create procedure |
| GET | `/api/grc/procedures/:id` | Get procedure |
| PUT | `/api/grc/procedures/:id` | Update procedure |
| DELETE | `/api/grc/procedures/:id` | Delete procedure |

### Exemptions & Improvement

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/grc/exemptions` | Create gap exemption |
| GET | `/api/grc/exemptions` | List exemptions |
| POST | `/api/grc/improvement/insights` | Record improvement insight |
| GET | `/api/grc/improvement/insights` | List improvement insights |

### Offline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grc/offline/status` | Offline package status |
| GET | `/api/grc/offline/package` | Full offline package export |

## Environment Variables

```bash
# Server
PORT=3000

# Microsoft Teams Bot (optional)
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_PASSWORD=your-app-password

# Azure OpenAI (optional - for enhanced AI)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

## Example Usage

### Upload and Analyze a Document

```bash
# Ingest an existing policy document
curl -X POST http://localhost:3000/api/grc/documents/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "organization": "Acme Corp",
    "title": "Access Control Policy v2.1",
    "content": "1. Purpose\nThis policy establishes access control...",
    "tags": ["access-control", "identity"]
  }'

# Run gap analysis against a framework
curl -X POST http://localhost:3000/api/grc/documentation/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "doc-id-here",
    "frameworkId": "nist-800-53"
  }'
```

### Cross-Compare Frameworks

```bash
curl -X POST http://localhost:3000/api/grc/frameworks/compare \
  -H "Content-Type: application/json" \
  -d '{"frameworks": ["cis-controls", "hitrust", "nist-csf"]}'
```

### Ingest Compliance Posture and Cross-Map

```bash
# Ingest control statuses
curl -X POST http://localhost:3000/api/grc/compliance/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "organization": "Acme Corp",
    "framework": "cis-controls",
    "controls": [
      {"controlId": "CIS.1", "status": "implemented"},
      {"controlId": "CIS.2", "status": "partially-implemented"}
    ]
  }'

# Cross-map to target frameworks
curl -X POST http://localhost:3000/api/grc/compliance/cross-map \
  -H "Content-Type: application/json" \
  -d '{
    "organization": "Acme Corp",
    "targetFrameworks": ["nist-csf", "hipaa"]
  }'
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both dev servers |
| `npm run dev:client` | Start Vite dev server |
| `npm run dev:server` | Start Express dev server (tsx watch) |
| `npm run dev:mcp` | Start MCP server in dev mode |
| `npm run build` | Build client and server |
| `npm run build:client` | Build Vite client |
| `npm run build:server` | Compile server TypeScript |
| `npm start` | Start production server |
| `npm run start:mcp` | Start MCP server |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove dist folder |

## MCP Server (Model Context Protocol)

The GRC Agent includes an MCP server that exposes GRC tools to AI assistants like Claude.

### MCP Tools

| Tool | Description |
|------|-------------|
| `generate_policy` | Generate security policies aligned with compliance frameworks |
| `analyze_policy` | Perform gap analysis on policies against frameworks |
| `generate_plan` | Create security plans (SSP, IRP, BRP, BC/DR, Test/Failover) |
| `list_frameworks` | List all available compliance frameworks |
| `get_framework_info` | Get detailed framework information |
| `get_framework_controls` | Get controls for a specific framework |
| `compare_frameworks` | Compare two frameworks for overlapping controls |
| `list_policies` | List all generated policies |
| `get_policy` | Get a specific policy by ID |
| `list_plans` | List all generated security plans |
| `get_plan` | Get a specific plan by ID |
| `export_policy_markdown` | Export policy as Markdown |
| `export_plan_markdown` | Export plan as Markdown |

### MCP Resources

- `grc://frameworks/{framework_id}` - Framework definitions
- `grc://frameworks/comparison-matrix` - Cross-reference matrix of all frameworks

### MCP Prompts

| Prompt | Description |
|--------|-------------|
| `policy_review` | Review a policy for compliance gaps |
| `compliance_roadmap` | Generate a compliance implementation roadmap |
| `incident_response_guide` | Generate incident response guidance |

### Configure MCP with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "grc-agent": {
      "command": "node",
      "args": ["dist/server/mcp/index.js"],
      "cwd": "/path/to/grc-agent"
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "grc-agent": {
      "command": "npx",
      "args": ["tsx", "src/server/mcp/index.ts"],
      "cwd": "/path/to/grc-agent"
    }
  }
}
```

### Example MCP Usage with Claude

Once configured, you can ask Claude:

- "Generate an access control policy for NIST CSF and HIPAA"
- "Analyze this policy against SOC 2 requirements: [paste policy]"
- "Create an incident response plan for my organization"
- "Compare NIST CSF with NIST 800-53 frameworks"
- "What are the HIPAA security controls?"

## License

MIT
