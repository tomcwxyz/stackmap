'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Architecture } from '@/lib/types';
import {
  generateMermaidDiagram,
  generateSystemDiagram,
  generateFunctionDiagram,
  generateServiceDiagram,
  generateDataFlowDiagram,
} from '@/lib/diagram/mermaid';
import { calculateCostSummary, formatCurrency } from '@/lib/cost-analysis';

// Dynamic import of the Mermaid renderer — SSR disabled since Mermaid needs DOM
const MermaidRenderer = dynamic(
  () => import('./mermaid-renderer').then((m) => ({ default: m.MermaidRenderer })),
  { ssr: false, loading: () => <DiagramSkeleton /> },
);

type DiagramMode = 'full' | 'systems' | 'functions' | 'services' | 'data';

interface DiagramViewProps {
  architecture: Architecture | null;
  isLoading?: boolean;
}

function DiagramSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-surface-200 p-6 animate-pulse">
      <div className="h-64 bg-surface-100 rounded" />
    </div>
  );
}

const MODE_LABELS: Record<DiagramMode, string> = {
  full: 'Full diagram',
  systems: 'Systems only',
  functions: 'Functions only',
  services: 'Services',
  data: 'Data flow',
};

export function DiagramView({ architecture, isLoading }: DiagramViewProps) {
  const [mode, setMode] = useState<DiagramMode>('full');
  const [zoom, setZoom] = useState(1);

  const reviewPath = architecture?.metadata.mappingPath === 'service_first'
    ? '/wizard/services/review'
    : '/wizard/functions/review';

  const mermaidSyntax = useMemo(() => {
    if (!architecture) return '';
    switch (mode) {
      case 'systems':
        return generateSystemDiagram(architecture);
      case 'functions':
        return generateFunctionDiagram(architecture);
      case 'services':
        return generateServiceDiagram(architecture);
      case 'data':
        return generateDataFlowDiagram(architecture);
      default:
        return generateMermaidDiagram(architecture);
    }
  }, [architecture, mode]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <DiagramSkeleton />
      </div>
    );
  }

  if (!architecture) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-primary-900 font-display mb-4">
          No architecture data yet
        </h2>
        <p className="text-primary-600 mb-8">
          Use the wizard to map your organisation&apos;s technology, then come back here to see your diagram.
        </p>
        <Link href="/wizard" className="btn-primary px-6 py-2.5 rounded-lg inline-flex items-center gap-2">
          Start mapping
        </Link>
      </div>
    );
  }

  const hasData = architecture.systems.length > 0 || architecture.functions.length > 0;

  if (!hasData) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-primary-900 font-display mb-4">
          Your map is empty
        </h2>
        <p className="text-primary-600 mb-8">
          Add some functions and systems in the wizard to generate a diagram.
        </p>
        <Link href={reviewPath} className="btn-primary px-6 py-2.5 rounded-lg inline-flex items-center gap-2">
          Edit your map
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 font-display">
            Architecture diagram
          </h1>
          <p className="text-sm text-primary-600 mt-1">
            {architecture.organisation.name || 'Your organisation'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/view/report"
            className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            Board report
          </Link>
          <Link
            href="/view/systems"
            className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 3h10M2 7h10M2 11h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Your systems
          </Link>
          <Link
            href={reviewPath}
            className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 7h10M6 3l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit your map
          </Link>
        </div>
      </div>

      {/* Cost summary line */}
      {(() => {
        const cs = calculateCostSummary(architecture.systems, architecture.functions);
        if (cs.systemCount === 0) return null;
        return (
          <p className="text-sm text-primary-600 mb-4" data-testid="diagram-cost-summary">
            Total annual cost: {formatCurrency(cs.totalAnnual)} across {cs.systemCount} {cs.systemCount === 1 ? 'system' : 'systems'}
          </p>
        );
      })()}

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-6">
        {(Object.keys(MODE_LABELS) as DiagramMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 text-primary-700 hover:bg-surface-200'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-primary-500 mr-1">Zoom</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          className="w-7 h-7 rounded border border-surface-300 bg-white text-primary-700 hover:bg-surface-100 text-sm font-medium flex items-center justify-center"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="text-xs text-primary-600 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="w-7 h-7 rounded border border-surface-300 bg-white text-primary-700 hover:bg-surface-100 text-sm font-medium flex items-center justify-center"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="text-xs text-primary-500 hover:text-primary-700 ml-1"
        >
          Reset
        </button>
      </div>

      {/* Diagram container with zoom */}
      <div
        className="origin-top-left transition-transform duration-150"
        style={{ transform: `scale(${zoom})` }}
      >
        <MermaidRenderer syntax={mermaidSyntax} key={mode} id={`diagram-${mode}`} />
      </div>
    </div>
  );
}
