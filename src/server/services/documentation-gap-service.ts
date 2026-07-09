/**
 * Documentation Gap Service
 * Scans local documentation and estimates control coverage for selected frameworks.
 */

import fs from 'fs';
import path from 'path';
import FrameworkRegistry from '../frameworks/index.js';
import {
  ComplianceFramework,
  ControlGap,
  DocumentationGapAnalysisRequest,
  FrameworkDocumentationGapResult
} from '../types/framework.js';

interface DocumentationGapAnalysisResponse {
  generatedAt: Date;
  filesAnalyzed: string[];
  results: FrameworkDocumentationGapResult[];
  overallCoverage: number;
  recommendations: string[];
}

export class DocumentationGapService {
  analyzeDocumentation(request: DocumentationGapAnalysisRequest): DocumentationGapAnalysisResponse {
    const docsRoot = path.join(process.cwd(), 'docs');
    const files = this.getDocumentationFiles(docsRoot, request.includeFiles);
    const corpus = files.map(file => this.readLower(file)).join('\n\n');

    const results: FrameworkDocumentationGapResult[] = request.frameworks.map(framework => {
      const controls = FrameworkRegistry.getFrameworkControls(framework);

      let coveredControls = 0;
      const uncovered: ControlGap[] = [];

      controls.forEach(control => {
        if (this.controlIsCovered(control, corpus)) {
          coveredControls += 1;
          return;
        }

        uncovered.push({
          controlId: control.id,
          controlTitle: control.title,
          description: control.description,
          severity: this.assessControlSeverity(control.title, control.description),
          effort: this.assessImplementationEffort(control.title, control.description),
          implementationSteps: [
            `Map ${control.id} to an explicit policy/procedure section.`,
            'Document implementation ownership and operational evidence.',
            'Add review cadence and validation approach to documentation.'
          ]
        });
      });

      const coverage = controls.length === 0
        ? 100
        : Math.round((coveredControls / controls.length) * 100);

      return {
        framework,
        totalControls: controls.length,
        coveredControls,
        coverage,
        uncoveredControls: uncovered.slice(0, 150)
      };
    });

    const overallCoverage = results.length === 0
      ? 0
      : Math.round(results.reduce((sum, result) => sum + result.coverage, 0) / results.length);

    return {
      generatedAt: new Date(),
      filesAnalyzed: files.map(file => path.relative(process.cwd(), file).replace(/\\/g, '/')),
      results,
      overallCoverage,
      recommendations: this.buildRecommendations(results)
    };
  }

  private getDocumentationFiles(rootPath: string, includeFiles?: string[]): string[] {
    if (!fs.existsSync(rootPath)) {
      return [];
    }

    if (includeFiles && includeFiles.length > 0) {
      return includeFiles
        .map(file => path.join(process.cwd(), file))
        .filter(file => fs.existsSync(file) && fs.statSync(file).isFile());
    }

    const files: string[] = [];

    const walk = (currentPath: string): void => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (entry.isFile() && /\.(md|txt|rtf)$/i.test(entry.name)) {
          files.push(fullPath);
        }
      });
    };

    walk(rootPath);
    return files;
  }

  private readLower(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8').toLowerCase();
    } catch {
      return '';
    }
  }

  private controlIsCovered(control: { id: string; title: string; description: string }, corpus: string): boolean {
    const keywordCandidates = [
      control.id.toLowerCase(),
      ...this.extractKeywords(control.title),
      ...this.extractKeywords(control.description)
    ];

    const keywords = Array.from(new Set(keywordCandidates)).slice(0, 10);

    // Require at least one strong indicator (ID) or two keyword indicators.
    if (corpus.includes(control.id.toLowerCase())) {
      return true;
    }

    let matches = 0;
    for (const keyword of keywords) {
      if (keyword.length < 5) {
        continue;
      }
      if (corpus.includes(keyword)) {
        matches += 1;
      }
      if (matches >= 2) {
        return true;
      }
    }

    return false;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'that', 'this', 'shall', 'must', 'into',
      'your', 'their', 'have', 'has', 'are', 'was', 'were', 'will', 'can', 'may',
      'organization', 'system', 'policy', 'process', 'control', 'controls'
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word && !stopWords.has(word) && word.length >= 5)
      .slice(0, 8);
  }

  private assessControlSeverity(title: string, description: string): 'critical' | 'high' | 'medium' | 'low' {
    const text = `${title} ${description}`.toLowerCase();

    if (/auth|identity|encryption|incident|boundary|monitor|logging|audit/.test(text)) {
      return 'critical';
    }

    if (/vulnerability|detection|response|backup|recovery|network/.test(text)) {
      return 'high';
    }

    if (/training|awareness|procedure|review/.test(text)) {
      return 'medium';
    }

    return 'low';
  }

  private assessImplementationEffort(title: string, description: string): 'low' | 'medium' | 'high' | 'very-high' {
    const text = `${title} ${description}`.toLowerCase();

    if (/infrastructure|continuous|automated|architecture/.test(text)) {
      return 'high';
    }

    if (/cross|integration|enterprise|program/.test(text)) {
      return 'very-high';
    }

    if (/procedure|policy|documentation|review/.test(text)) {
      return 'low';
    }

    return 'medium';
  }

  private buildRecommendations(results: FrameworkDocumentationGapResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      if (result.coverage < 50) {
        recommendations.push(
          `${result.framework}: Coverage below 50%. Prioritize a control-to-document traceability matrix and required evidence sections.`
        );
      } else if (result.coverage < 80) {
        recommendations.push(
          `${result.framework}: Coverage between 50% and 80%. Add targeted control references and strengthen implementation evidence language.`
        );
      } else {
        recommendations.push(
          `${result.framework}: Coverage above 80%. Maintain quarterly documentation verification to prevent drift.`
        );
      }
    });

    return recommendations;
  }
}

export default DocumentationGapService;
