import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageNotice } from '@/components/layout/storage-notice';
import {
  DEFAULT_STORAGE_STATUS,
  type StorageStatus,
} from '@/hooks/useStorageStatus';

const mockStatus = vi.hoisted(() => ({ current: null as StorageStatus | null }));

vi.mock('@/hooks/useStorageStatus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useStorageStatus')>();
  return {
    ...actual,
    useStorageStatus: () => mockStatus.current ?? actual.DEFAULT_STORAGE_STATUS,
  };
});

describe('StorageNotice', () => {
  beforeEach(() => {
    mockStatus.current = null;
  });

  it('renders nothing when storage is healthy', () => {
    mockStatus.current = DEFAULT_STORAGE_STATUS;
    const { container } = render(<StorageNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing after a successful save', () => {
    mockStatus.current = { ...DEFAULT_STORAGE_STATUS, saveState: 'saved' };
    const { container } = render(<StorageNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns when the map could not be saved, and says what to do', () => {
    mockStatus.current = {
      saveState: 'error',
      saveError: 'There is no room left in this browser’s storage, so your map could not be saved.',
      loadReport: null,
    };

    render(<StorageNotice />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/no room left in this browser/i)).toBeInTheDocument();
    expect(screen.getByText(/export your map/i)).toBeInTheDocument();
  });

  it('explains that unreadable data was backed up rather than deleted', () => {
    mockStatus.current = {
      ...DEFAULT_STORAGE_STATUS,
      loadReport: { droppedCount: 0, backedUp: true },
    };

    render(<StorageNotice />);

    expect(screen.getByText(/could not read your saved map/i)).toBeInTheDocument();
    expect(screen.getByText(/has not been deleted/i)).toBeInTheDocument();
    expect(screen.getByText('stackmap_architecture_backup')).toBeInTheDocument();
  });

  it('reports how many items could not be restored', () => {
    mockStatus.current = {
      ...DEFAULT_STORAGE_STATUS,
      loadReport: { droppedCount: 3, backedUp: false },
    };

    render(<StorageNotice />);

    expect(screen.getByText(/3 items were incomplete/i)).toBeInTheDocument();
  });

  it('uses the singular for a single dropped item', () => {
    mockStatus.current = {
      ...DEFAULT_STORAGE_STATUS,
      loadReport: { droppedCount: 1, backedUp: false },
    };

    render(<StorageNotice />);

    expect(screen.getByText(/1 item was incomplete/i)).toBeInTheDocument();
  });

  it('can be dismissed', async () => {
    const user = userEvent.setup();
    mockStatus.current = {
      saveState: 'error',
      saveError: 'Your map could not be saved in this browser.',
      loadReport: null,
    };

    render(<StorageNotice />);
    await user.click(screen.getByRole('button', { name: /dismiss storage warning/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockStatus.current = {
      saveState: 'error',
      saveError: 'Your map could not be saved in this browser.',
      loadReport: { droppedCount: 2, backedUp: false },
    };

    const { container } = render(<StorageNotice />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
