'use client';

import { RopaView } from '@/components/views/ropa-view';
import { ArchitectureProvider } from '@/hooks/useArchitecture';
import { StorageNotice } from '@/components/layout/storage-notice';

export default function RopaPage() {
  return (
    <ArchitectureProvider>
      <StorageNotice />
      <RopaView />
    </ArchitectureProvider>
  );
}
