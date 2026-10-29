import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionsView } from '@/components/views/actions-view';
import { buildRiversideAdvice } from '@/lib/examples/riverside-advice';
import { buildSuggestedActions } from '@/lib/analysis/action-plan';

const store = vi.hoisted(() => ({ arch: null as ReturnType<typeof buildRiversideAdvice> | null, replace: vi.fn() }));
vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => ({ architecture: store.arch, isLoading: false, replaceArchitecture: store.replace }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('ActionsView', () => {
  it('displays suggested actions and saves selected progress', async () => {
    store.arch = buildRiversideAdvice();
    store.replace.mockClear();
    const user = userEvent.setup();
    render(<ActionsView />);
    expect(screen.getByRole('heading', { name: 'Your actions' })).toBeInTheDocument();
    const action = buildSuggestedActions(store.arch)[0];
    await user.selectOptions(screen.getByRole('combobox', { name: 'Progress for ' + action.title }), 'planned');
    expect(store.replace).toHaveBeenCalled();
    expect(store.replace.mock.calls.at(-1)?.[0].actionDecisions.some(
      (d: { status: string }) => d.status === 'planned',
    )).toBe(true);
  });
});
