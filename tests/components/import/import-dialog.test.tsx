import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { ImportDialog } from '@/components/import/import-dialog';
import type { Architecture } from '@/lib/types';

function makeValidArchitecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Org',
      type: 'charity',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    functions: [
      { id: 'f1', name: 'Finance', type: 'finance', isActive: true },
      { id: 'f2', name: 'People', type: 'people', isActive: true },
    ],
    services: [
      {
        id: 's1',
        name: 'Advice Line',
        status: 'active',
        functionIds: ['f1'],
        systemIds: ['sys1'],
      },
    ],
    systems: [
      {
        id: 'sys1',
        name: 'Salesforce',
        type: 'crm',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['f1'],
        serviceIds: ['s1'],
      },
      {
        id: 'sys2',
        name: 'Xero',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['f1'],
        serviceIds: [],
      },
      {
        id: 'sys3',
        name: 'BreatheHR',
        type: 'hr',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['f2'],
        serviceIds: [],
      },
    ],
    dataCategories: [],
    integrations: [],
    owners: [{ id: 'o1', name: 'Jane', isExternal: false }],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1',
      exportedAt: '2024-01-01T00:00:00Z',
      stackmapVersion: '0.1.0',
      mappingPath: 'function_first',
    },
  };
}

function createFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

describe('ImportDialog', () => {
  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows format picker with JSON and CSV options', () => {
    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByText(/json/i)).toBeInTheDocument();
    expect(screen.getByText(/csv/i)).toBeInTheDocument();
  });

  it('is not visible when open is false', () => {
    render(<ImportDialog open={false} onClose={vi.fn()} onImport={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    render(<ImportDialog open onClose={onClose} onImport={vi.fn()} />);
    await userEvent.setup().keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('advances to file step when JSON format is selected', async () => {
    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));
    expect(screen.getByText(/select a .json file/i)).toBeInTheDocument();
  });

  it('advances to file step when CSV format is selected', async () => {
    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/csv/i));
    expect(screen.getByText(/select a .csv file/i)).toBeInTheDocument();
  });

  it('shows back button on file step', async () => {
    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('goes back to format picker when back button is clicked', async () => {
    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));
    await user.click(screen.getByRole('button', { name: /back/i }));
    // Should be back on format picker
    expect(screen.getByText(/full architecture/i)).toBeInTheDocument();
  });

  it('shows JSON preview with summary counts after valid JSON file upload', async () => {
    const arch = makeValidArchitecture();
    const file = createFile(JSON.stringify(arch), 'stack.json', 'application/json');

    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));

    const input = screen.getByLabelText(/select a .json file/i);
    await user.upload(input, file);

    // Should show preview with counts (text split across elements, so use substring matcher)
    expect(await screen.findByText((_, el) =>
      el?.tagName === 'LI' && /2\s+functions/.test(el.textContent ?? ''),
    )).toBeInTheDocument();
    expect(screen.getByText((_, el) =>
      el?.tagName === 'LI' && /3\s+systems/.test(el.textContent ?? ''),
    )).toBeInTheDocument();
    expect(screen.getByText((_, el) =>
      el?.tagName === 'LI' && /1\s+service/.test(el.textContent ?? ''),
    )).toBeInTheDocument();
    expect(screen.getByText((_, el) =>
      el?.tagName === 'LI' && /1\s+owner/.test(el.textContent ?? ''),
    )).toBeInTheDocument();
  });

  it('calls onImport with validated architecture when Replace button is clicked', async () => {
    const arch = makeValidArchitecture();
    const file = createFile(JSON.stringify(arch), 'stack.json', 'application/json');
    const onImport = vi.fn();

    render(<ImportDialog open onClose={vi.fn()} onImport={onImport} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));

    const input = screen.getByLabelText(/select a .json file/i);
    await user.upload(input, file);

    await screen.findByText((_, el) =>
      el?.tagName === 'LI' && /2\s+functions/.test(el.textContent ?? ''),
    );
    await user.click(screen.getByRole('button', { name: /replace current data/i }));

    expect(onImport).toHaveBeenCalledTimes(1);
    const importedArch = onImport.mock.calls[0][0] as Architecture;
    expect(importedArch.systems).toHaveLength(3);
    expect(importedArch.functions).toHaveLength(2);
  });

  it('shows error step for invalid JSON', async () => {
    const file = createFile('not json at all', 'bad.json', 'application/json');

    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));

    const input = screen.getByLabelText(/select a .json file/i);
    await user.upload(input, file);

    expect(await screen.findByText(/isn.*t valid json/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows Zod validation errors as a list', async () => {
    // Valid JSON but wrong structure
    const file = createFile(JSON.stringify({ foo: 'bar' }), 'bad.json', 'application/json');

    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));

    const input = screen.getByLabelText(/select a .json file/i);
    await user.upload(input, file);

    expect(await screen.findByText(/doesn.*t match the stackmap format/i)).toBeInTheDocument();
    // Should show a list of errors
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('goes back to file step when try again is clicked', async () => {
    const file = createFile('not json', 'bad.json', 'application/json');

    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));

    const input = screen.getByLabelText(/select a .json file/i);
    await user.upload(input, file);

    await screen.findByText(/isn.*t valid json/i);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText(/select a .json file/i)).toBeInTheDocument();
  });

  it('shows CSV preview with row count after valid CSV upload', async () => {
    const csv = 'name,type,vendor\nSalesforce,crm,Salesforce\nXero,finance,Xero\n';
    const file = createFile(csv, 'systems.csv', 'text/csv');

    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/csv/i));

    const input = screen.getByLabelText(/select a .csv file/i);
    await user.upload(input, file);

    // Placeholder CSV preview should show row count
    expect(await screen.findByText((_, el) =>
      el?.tagName === 'P' && /Found\s+2\s+systems/.test(el.textContent ?? ''),
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import 2 systems/i })).toBeInTheDocument();
  });

  it('shows error for invalid CSV (no name column)', async () => {
    const csv = 'foo,bar\n1,2\n';
    const file = createFile(csv, 'bad.csv', 'text/csv');

    render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText(/csv/i));

    const input = screen.getByLabelText(/select a .csv file/i);
    await user.upload(input, file);

    expect(await screen.findByText(/no name column found/i)).toBeInTheDocument();
  });

  describe('merge mode', () => {
    it('offers only the formats that add to an existing map', () => {
      render(<ImportDialog open mode="merge" onClose={vi.fn()} onImport={vi.fn()} />);

      // Replacing everything from a JSON export is not on offer mid-map
      expect(screen.queryByText(/full architecture/i)).not.toBeInTheDocument();
      expect(screen.getByText(/systems list/i)).toBeInTheDocument();
      expect(screen.getByText(/accounting or bank export/i)).toBeInTheDocument();
    });

    it('shows "Add N systems" button text in merge mode', async () => {
      const csv = `name\nSlack\nZoom`;
      const file = new File([csv], 'tools.csv', { type: 'text/csv' });
      const onMergeCsv = vi.fn();
      render(<ImportDialog open mode="merge" onClose={vi.fn()} onImport={vi.fn()} onMergeCsv={onMergeCsv} />);
      const user = userEvent.setup();
      await user.click(screen.getByText(/systems list/i));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);
      const addBtn = await screen.findByRole('button', { name: /add 2 systems/i });
      expect(addBtn).toBeInTheDocument();
    });

    it('says how many rows are already in the map', async () => {
      const csv = `name\nXero\nSlack`;
      const file = new File([csv], 'tools.csv', { type: 'text/csv' });
      render(
        <ImportDialog
          open
          mode="merge"
          onClose={vi.fn()}
          onImport={vi.fn()}
          onMergeCsv={vi.fn()}
          existingArchitecture={makeValidArchitecture()}
        />,
      );
      const user = userEvent.setup();
      await user.click(screen.getByText(/systems list/i));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      const preview = await screen.findByTestId('merge-preview');
      // Xero is already mapped; Slack is not
      expect(preview).toHaveTextContent(/1 system is new/i);
      expect(preview).toHaveTextContent(/1 is already in your map/i);
      expect(preview).toHaveTextContent(/updated rather than added again/i);
    });

    it('says when nothing in the file is already mapped', async () => {
      const csv = `name\nSlack\nZoom`;
      const file = new File([csv], 'tools.csv', { type: 'text/csv' });
      render(
        <ImportDialog
          open
          mode="merge"
          onClose={vi.fn()}
          onImport={vi.fn()}
          onMergeCsv={vi.fn()}
          existingArchitecture={makeValidArchitecture()}
        />,
      );
      const user = userEvent.setup();
      await user.click(screen.getByText(/systems list/i));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      const preview = await screen.findByTestId('merge-preview');
      expect(preview).toHaveTextContent(/2 systems are new/i);
      expect(preview).toHaveTextContent(/none of them are already in your map/i);
    });

    it('calls onMergeCsv instead of onImport in merge mode', async () => {
      const csv = `name\nSlack`;
      const file = new File([csv], 'tools.csv', { type: 'text/csv' });
      const onMergeCsv = vi.fn();
      const onImport = vi.fn();
      render(<ImportDialog open mode="merge" onClose={vi.fn()} onImport={onImport} onMergeCsv={onMergeCsv} />);
      const user = userEvent.setup();
      await user.click(screen.getByText(/systems list/i));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);
      const addBtn = await screen.findByRole('button', { name: /add 1 system/i });
      await user.click(addBtn);
      expect(onMergeCsv).toHaveBeenCalledTimes(1);
      expect(onImport).not.toHaveBeenCalled();
    });

    it('starts over when the dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ImportDialog open mode="merge" onClose={vi.fn()} onImport={vi.fn()} />,
      );
      await user.click(screen.getByText(/systems list/i));
      expect(screen.getByText(/select a .csv file/i)).toBeInTheDocument();

      rerender(<ImportDialog open={false} mode="merge" onClose={vi.fn()} onImport={vi.fn()} />);
      rerender(<ImportDialog open mode="merge" onClose={vi.fn()} onImport={vi.fn()} />);

      // Back at the start, with nothing carried over from last time
      expect(screen.getByText(/accounting or bank export/i)).toBeInTheDocument();
      expect(screen.queryByText(/select a .csv file/i)).not.toBeInTheDocument();
    });
  });

  it('resets state when dialog is closed and reopened', async () => {
    const { rerender } = render(
      <ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByText(/json/i));
    expect(screen.getByText(/select a .json file/i)).toBeInTheDocument();

    // Close dialog
    rerender(<ImportDialog open={false} onClose={vi.fn()} onImport={vi.fn()} />);
    // Reopen dialog
    rerender(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);

    // Should be back on format picker
    expect(screen.getByText(/full architecture/i)).toBeInTheDocument();
  });

  describe('spend import', () => {
    const spendCsv = [
      'Date,Payee,Amount',
      '05/01/2026,XERO LIMITED,33.00',
      '05/02/2026,XERO LIMITED,33.00',
      '05/03/2026,XERO LIMITED,33.00',
      '10/01/2026,BOB THE PLUMBER,150.00',
    ].join('\n');

    async function uploadSpend(onImportSpend = vi.fn()) {
      const user = userEvent.setup();
      render(
        <ImportDialog
          open
          mode="merge"
          onClose={vi.fn()}
          onImport={vi.fn()}
          onImportSpend={onImportSpend}
        />,
      );
      await user.click(screen.getByText(/accounting or bank export/i));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, createFile(spendCsv, 'spend.csv', 'text/csv'));
      return { user, onImportSpend };
    }

    it('reassures the user the file stays in their browser', async () => {
      const user = userEvent.setup();
      render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);
      await user.click(screen.getByText(/accounting or bank export/i));

      expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
    });

    it('shows what it recognised', async () => {
      await uploadSpend();

      expect(await screen.findByTestId('spend-summary')).toHaveTextContent(
        /1 payee that looks like a tool/i,
      );
      expect(screen.getByRole('checkbox', { name: /include xero/i })).toBeChecked();
    });

    it('does not tick payees it could not recognise', async () => {
      const { user } = await uploadSpend();
      await screen.findByTestId('spend-summary');

      await user.click(screen.getByText(/show the 1 it did not recognise/i));

      expect(screen.getByRole('checkbox', { name: /include bob the plumber/i })).not.toBeChecked();
    });

    it('passes on only the payees that are ticked', async () => {
      const { user, onImportSpend } = await uploadSpend();
      await screen.findByTestId('spend-summary');

      await user.click(screen.getByRole('button', { name: /add 1 system/i }));

      expect(onImportSpend).toHaveBeenCalledTimes(1);
      const chosen = onImportSpend.mock.calls[0][0];
      expect(chosen).toHaveLength(1);
      expect(chosen[0].tool.name).toBe('Xero');
    });

    it('can add a payee it did not recognise once ticked', async () => {
      const { user, onImportSpend } = await uploadSpend();
      await screen.findByTestId('spend-summary');

      await user.click(screen.getByText(/show the 1 it did not recognise/i));
      await user.click(screen.getByRole('checkbox', { name: /include bob the plumber/i }));
      await user.click(screen.getByRole('button', { name: /add 2 systems/i }));

      expect(onImportSpend.mock.calls[0][0]).toHaveLength(2);
    });

    it('cannot add nothing', async () => {
      const { user } = await uploadSpend();
      await screen.findByTestId('spend-summary');

      await user.click(screen.getByRole('checkbox', { name: /include xero/i }));

      expect(screen.getByRole('button', { name: /add 0 systems/i })).toBeDisabled();
    });

    it('reports a file it cannot read', async () => {
      const user = userEvent.setup();
      render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} onImportSpend={vi.fn()} />);
      await user.click(screen.getByText(/accounting or bank export/i));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, createFile('foo,bar\n1,2\n', 'bad.csv', 'text/csv'));

      expect(await screen.findByText(/payees or descriptions/i)).toBeInTheDocument();
    });
  });
});
