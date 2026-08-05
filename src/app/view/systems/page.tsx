'use client';

import { SystemsTable } from '@/components/views/systems-table';
import { ArchitectureProvider } from '@/hooks/useArchitecture';
import { StorageNotice } from '@/components/layout/storage-notice';

export default function SystemsPage() {
  return (
    <ArchitectureProvider>
      <StorageNotice />
      <SystemsTable />
    </ArchitectureProvider>
  );
}
