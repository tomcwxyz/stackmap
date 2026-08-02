'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MermaidRendererProps {
  syntax: string;
  id?: string;
}

export function MermaidRenderer({ syntax, id = 'mermaid-diagram' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import('mermaid')).default;
        // Labels come from user data, including imported files, and the
        // rendered SVG is injected into the page. Strict mode plus SVG text
        // labels keeps that data from being treated as markup — and SVG text
        // also rasterises properly in the PNG export below, which foreignObject
        // labels did not.
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: false,
            curve: 'basis',
          },
        });

        const { svg } = await mermaid.render(id, syntax);
        if (!cancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvgContent(null);
        }
      }
    }

    if (syntax.trim()) {
      renderDiagram();
    }

    return () => {
      cancelled = true;
    };
  }, [syntax, id]);

  const handleExportSvg = useCallback(() => {
    if (!svgContent) return;

    // The SVG is what Mermaid already produced, so this export is exact —
    // no canvas, no rasterising, and it stays sharp at any size.
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'stackmap-diagram.svg';
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  }, [svgContent]);

  const handleExportPng = useCallback(async () => {
    if (!svgContent || !containerRef.current) return;

    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    const canvas = document.createElement('canvas');
    const bbox = svgEl.getBoundingClientRect();
    const scale = 2; // retina
    canvas.width = bbox.width * scale;
    canvas.height = bbox.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = 'stackmap-diagram.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }, [svgContent]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 text-sm text-accent-800">
          <p className="font-medium mb-1">Diagram rendering failed</p>
          <p className="text-accent-600">{error}</p>
        </div>
        <details className="bg-surface-100 rounded-lg p-4">
          <summary className="text-sm font-medium text-primary-700 cursor-pointer">
            View raw Mermaid syntax
          </summary>
          <pre className="mt-2 text-xs text-primary-600 whitespace-pre-wrap font-mono overflow-x-auto">
            {syntax}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleExportSvg}
          disabled={!svgContent}
          className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 10v2h10v-2M7 2v7M4 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export as SVG
        </button>
        <button
          type="button"
          onClick={handleExportPng}
          disabled={!svgContent}
          className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 10v2h10v-2M7 2v7M4 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export as PNG
        </button>
      </div>
      <div
        ref={containerRef}
        className="bg-white rounded-lg border border-surface-200 p-6 overflow-auto"
        dangerouslySetInnerHTML={svgContent ? { __html: svgContent } : undefined}
      />
    </div>
  );
}
