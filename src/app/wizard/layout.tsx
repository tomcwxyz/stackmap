'use client';

import { useState, useCallback } from 'react';
import { ArchitectureProvider, useArchitecture } from '@/hooks/useArchitecture';
import { Stepper } from '@/components/wizard/stepper';
import { LiveMapSidebar } from '@/components/wizard/live-map-sidebar';
import { StorageNotice } from '@/components/layout/storage-notice';
import { ImportDialog } from '@/components/import/import-dialog';
import { mergeCsvIntoArchitecture } from '@/lib/import';
import type { CsvSystemRow } from '@/lib/import';
import type { ReactNode } from 'react';

function WizardHeader() {
  const { architecture, replaceArchitecture } = useArchitecture();
  const [showImport, setShowImport] = useState(false);

  const handleMergeCsv = useCallback((rows: CsvSystemRow[]) => {
    if (!architecture) return;
    const merged = mergeCsvIntoArchitecture(rows, architecture);
    replaceArchitecture(merged);
    setShowImport(false);
  }, [architecture, replaceArchitecture]);

  return (
    <>
      <header className="border-b border-surface-200 bg-white/80 backdrop-blur-sm">
        <Stepper
          trailing={
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="text-xs px-2.5 py-1 rounded border border-surface-300 text-primary-600 hover:bg-surface-50 transition-colors whitespace-nowrap"
            >
              Import
            </button>
          }
        />
      </header>
      <ImportDialog
        open={showImport}
        mode="merge"
        existingArchitecture={architecture}
        onClose={() => setShowImport(false)}
        onImport={(arch) => {
          replaceArchitecture(arch);
          setShowImport(false);
        }}
        onMergeCsv={handleMergeCsv}
      />
    </>
  );
}

export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <ArchitectureProvider>
      <div className="min-h-screen bg-surface-50">
        <WizardHeader />
        <StorageNotice />
        <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          {children}
        </main>
        <LiveMapSidebar />
      </div>
    </ArchitectureProvider>
  );
}
