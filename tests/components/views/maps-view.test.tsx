import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapsView } from '@/components/views/maps-view';
import { resetWorkspaceCache } from '@/hooks/useWorkspace';
import { STORAGE_KEY, WORKSPACE_KEY, mapStorageKey } from '@/lib/storage/keys';
import { snapshotsStorageKey } from '@/lib/storage/workspace';
import type { Architecture } from '@/lib/types';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function architecture(name = 'Sunrise Trust'): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name,
      type: 'charity',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
    functions: [],
    services: [],
    systems: [],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

describe('MapsView', () => {
  beforeEach(() => {
    localStorage.clear();
    resetWorkspaceCache();
    vi.clearAllMocks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(architecture()));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MapsView />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('adopts an existing map rather than starting the user from nothing', () => {
    render(<MapsView />);

    expect(screen.getByText('Sunrise Trust')).toBeInTheDocument();
    expect(screen.getByText('Working on this')).toBeInTheDocument();
  });

  it('starts another map without switching away from the current one', async () => {
    const user = userEvent.setup();
    render(<MapsView />);

    await user.type(screen.getByLabelText(/what is it called/i), 'Riverside Trust');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Riverside Trust')).toBeInTheDocument();
    // The original is still the one being worked on
    expect(
      within(screen.getByText('Sunrise Trust').closest('li')!).getByText('Working on this'),
    ).toBeInTheDocument();
  });

  it('will not add a map with no name', async () => {
    render(<MapsView />);

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('copies the current map, leaving the original alone', async () => {
    const user = userEvent.setup();
    render(<MapsView />);

    await user.click(screen.getByRole('button', { name: /or copy sunrise trust/i }));

    expect(screen.getByText('Copy of Sunrise Trust')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).organisation.name).toBe('Sunrise Trust');
  });

  it('renames a map', async () => {
    const user = userEvent.setup();
    render(<MapsView />);

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const field = screen.getByLabelText('New name');
    await user.clear(field);
    await user.type(field, 'Sunrise Trust (2026)');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByText('Sunrise Trust (2026)')).toBeInTheDocument();
  });

  it('leaves the page when switching, because everything else reads on mount', async () => {
    const user = userEvent.setup();
    render(<MapsView />);

    await user.type(screen.getByLabelText(/what is it called/i), 'Riverside Trust');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: 'Switch to this' }));

    expect(push).toHaveBeenCalledWith('/view/systems');
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)!).activeMapId).not.toBe('default');
  });

  it('will not let the last map be deleted', () => {
    render(<MapsView />);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('asks before deleting a map, and says what goes with it', async () => {
    const user = userEvent.setup();
    render(<MapsView />);

    await user.type(screen.getByLabelText(/what is it called/i), 'Riverside Trust');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(within(screen.getByText('Riverside Trust').closest('li')!).getByRole('button', { name: 'Delete' }));

    expect(
      screen.getByText(/delete riverside trust, and everything snapshotted of it/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Riverside Trust')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /yes, delete it/i }));

    expect(screen.queryByText('Riverside Trust')).not.toBeInTheDocument();
  });

  it('keeps the map when the deletion is called off', async () => {
    const user = userEvent.setup();
    render(<MapsView />);

    await user.type(screen.getByLabelText(/what is it called/i), 'Riverside Trust');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(within(screen.getByText('Riverside Trust').closest('li')!).getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: /keep it/i }));

    expect(screen.getByText('Riverside Trust')).toBeInTheDocument();
  });

  describe('snapshots', () => {
    it('saves the map as it is now', async () => {
      const user = userEvent.setup();
      render(<MapsView />);

      await user.type(screen.getByLabelText(/save a snapshot/i), 'Before the move');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('Before the move')).toBeInTheDocument();
      const stored = JSON.parse(localStorage.getItem(snapshotsStorageKey('default'))!);
      expect(stored[0].architecture.organisation.name).toBe('Sunrise Trust');
    });

    it('puts a snapshot back, and keeps what was there in case that was wrong', async () => {
      const user = userEvent.setup();
      render(<MapsView />);

      await user.type(screen.getByLabelText(/save a snapshot/i), 'Original');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      localStorage.setItem(mapStorageKey('default'), JSON.stringify(architecture('Changed')));
      await user.click(screen.getByRole('button', { name: 'Restore' }));

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).organisation.name).toBe(
        'Sunrise Trust',
      );
      expect(screen.getByText('Before restoring')).toBeInTheDocument();
      expect(screen.getByText(/what was there was snapshotted first/i)).toBeInTheDocument();
    });

    it('asks before deleting a snapshot', async () => {
      const user = userEvent.setup();
      render(<MapsView />);

      await user.type(screen.getByLabelText(/save a snapshot/i), 'Before the move');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await user.click(screen.getByRole('button', { name: 'Delete snapshot Before the move' }));
      await user.click(screen.getByRole('button', { name: /yes, delete it/i }));

      expect(screen.queryByText('Before the move')).not.toBeInTheDocument();
    });

    it('shows only the active map’s snapshots', async () => {
      const user = userEvent.setup();
      render(<MapsView />);

      await user.type(screen.getByLabelText(/save a snapshot/i), 'On the first map');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await user.type(screen.getByLabelText(/what is it called/i), 'Riverside Trust');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await user.click(screen.getByRole('button', { name: 'Switch to this' }));

      expect(screen.queryByText('On the first map')).not.toBeInTheDocument();
    });
  });
});
