'use client';

import { BoardReport } from '@/components/views/board-report';
import { ArchitectureProvider } from '@/hooks/useArchitecture';

export default function ReportPage() {
  return (
    <ArchitectureProvider>
      <BoardReport />
    </ArchitectureProvider>
  );
}
