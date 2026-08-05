import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { SystemEditForm } from '@/components/views/system-edit-form';
import type { OrgFunction, System } from '@/lib/types';

const FUNCTIONS: OrgFunction[] = [
  { id: 'fn-finance', name: 'Finance', type: 'finance', isActive: true },
  { id: 'fn-ops', name: 'Operations', type: 'operations', isActive: true },
];

function system(overrides: Partial<System> = {}): System {
  return {
    id: 'sys-1',
    name: 'Xero',
    type: 'finance',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    ...overrides,
  };
}

function renderForm(overrides: Partial<System> = {}) {
  const onSave = vi.fn();
  render(
    <SystemEditForm
      system={system(overrides)}
      owners={[]}
      functions={FUNCTIONS}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );
  return { onSave, user: userEvent.setup() };
}

describe('SystemEditForm', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <SystemEditForm
        system={system()}
        owners={[]}
        functions={FUNCTIONS}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('what the system is used for', () => {
    // Without this a system that arrived with no function — anything imported
    // before the import learned to file things — could only be attached by
    // walking the wizard again, so it stayed loose on the diagram.

    it('offers every function on the map', () => {
      renderForm();

      expect(screen.getByRole('checkbox', { name: 'Finance' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Operations' })).toBeInTheDocument();
    });

    it('shows the ones already set', () => {
      renderForm({ functionIds: ['fn-ops'] });

      expect(screen.getByRole('checkbox', { name: 'Operations' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Finance' })).not.toBeChecked();
    });

    it('attaches a system that had none', async () => {
      const { onSave, user } = renderForm();

      await user.click(screen.getByRole('checkbox', { name: 'Finance' }));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ functionIds: ['fn-finance'] }),
      );
    });

    it('allows a system used in more than one place', async () => {
      const { onSave, user } = renderForm({ functionIds: ['fn-finance'] });

      await user.click(screen.getByRole('checkbox', { name: 'Operations' }));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ functionIds: ['fn-finance', 'fn-ops'] }),
      );
    });

    it('lets a system be detached again', async () => {
      const { onSave, user } = renderForm({ functionIds: ['fn-finance'] });

      await user.click(screen.getByRole('checkbox', { name: 'Finance' }));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ functionIds: [] }));
    });

    it('leaves the picker out when the map has no functions yet', () => {
      render(
        <SystemEditForm
          system={system()}
          owners={[]}
          functions={[]}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.queryByText(/what it is used for/i)).not.toBeInTheDocument();
    });
  });
});
