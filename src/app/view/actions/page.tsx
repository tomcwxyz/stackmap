'use client';

import { ArchitectureProvider } from '@/hooks/useArchitecture';
import { StorageNotice } from '@/components/layout/storage-notice';
import { ActionsView } from '@/components/views/actions-view';

export default function ActionsPage() {
  return (
    <ArchitectureProvider>
      <StorageNotice />
      <ActionsView />
    </ArchitectureProvider>
  );
}
