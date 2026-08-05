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
      render(
        <ImportDialog
          open
          mode="merge"
          onClose={vi.fn()}
          onImport={vi.fn()}
          onImportSpend={vi.fn()}
        />,
      );

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
      const props = {
        mode: 'merge' as const,
        onClose: vi.fn(),
        onImport: vi.fn(),
        onImportSpend: vi.fn(),
      };
      const { rerender } = render(<ImportDialog open {...props} />);
      await user.click(screen.getByText(/systems list/i));
      expect(screen.getByText(/select a .csv file/i)).toBeInTheDocument();

      rerender(<ImportDialog open={false} {...props} />);
      rerender(<ImportDialog open {...props} />);

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

    describe('choosing the columns', () => {
      // A real Starling export. Not one of these headers is a name the
      // importer was originally written to look for.
      const starlingCsv = [
        'Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP)',
        '02/05/2026,Google Cloud,Google Workspace_good-,CARD SUBSCRIPTION,-26.08,1101.78',
        '02/06/2026,Google Cloud,Google Workspace_good-,CARD SUBSCRIPTION,-26.08,2025.86',
        '02/07/2026,Google Cloud,Google Workspace_good-,CARD SUBSCRIPTION,-26.08,5338.98',
      ].join('\n');

      const unfamiliarCsv = ['Col1,Col2', 'Xero,33.00', 'Xero,33.00'].join('\n');

      async function upload(csv: string) {
        const user = userEvent.setup();
        render(
          <ImportDialog
            open
            mode="merge"
            onClose={vi.fn()}
            onImport={vi.fn()}
            onImportSpend={vi.fn()}
          />,
        );
        await user.click(screen.getByText(/accounting or bank export/i));
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(input, createFile(csv, 'spend.csv', 'text/csv'));
        return user;
      }

      it('reads a bank export whose headers it has never seen, without asking', async () => {
        await upload(starlingCsv);

        expect(await screen.findByTestId('spend-summary')).toHaveTextContent(
          /1 payee that looks like a tool/i,
        );
      });

      it('asks which columns to use rather than giving up on an odd file', async () => {
        await upload(unfamiliarCsv);

        expect(await screen.findByLabelText(/who was paid/i)).toBeInTheDocument();
        expect(screen.getByText(/none of these headers looked familiar/i)).toBeInTheDocument();
      });

      it('shows example values, since a header name often does not say enough', async () => {
        await upload(unfamiliarCsv);

        const select = await screen.findByLabelText(/who was paid/i);
        expect(within(select).getByRole('option', { name: /Col1 — e.g. Xero/ })).toBeInTheDocument();
      });

      it('cannot be confirmed until both required columns are chosen', async () => {
        const user = await upload(unfamiliarCsv);
        const confirm = screen.getByRole('button', { name: /read the file/i });
        expect(confirm).toBeDisabled();

        await user.selectOptions(screen.getByLabelText(/who was paid/i), 'Col1');
        expect(confirm).toBeDisabled();

        await user.selectOptions(screen.getByLabelText(/how much/i), 'Col2');
        expect(confirm).toBeEnabled();
      });

      it('reads the file once the user has said which column is which', async () => {
        const user = await upload(unfamiliarCsv);

        await user.selectOptions(screen.getByLabelText(/who was paid/i), 'Col1');
        await user.selectOptions(screen.getByLabelText(/how much/i), 'Col2');
        await user.click(screen.getByRole('button', { name: /read the file/i }));

        expect(await screen.findByTestId('spend-summary')).toHaveTextContent(
          /1 payee that looks like a tool/i,
        );
      });

      it('lets a wrong guess be corrected without picking the file again', async () => {
        const user = await upload(starlingCsv);
        await screen.findByTestId('spend-summary');

        await user.click(screen.getByRole('button', { name: /choose them yourself/i }));

        // The guess is filled in, ready to be changed
        expect(await screen.findByLabelText(/who was paid/i)).toHaveValue('Counter Party');

        await user.selectOptions(screen.getByLabelText(/who was paid/i), 'Reference');
        await user.click(screen.getByRole('button', { name: /read the file/i }));

        expect(await screen.findByTestId('spend-summary')).toBeInTheDocument();
      });

      it('says which column is missing rather than failing vaguely', async () => {
        const user = await upload(unfamiliarCsv);

        await user.selectOptions(screen.getByLabelText(/who was paid/i), 'Col1');
        await user.selectOptions(screen.getByLabelText(/how much/i), 'Col1');
        await user.click(screen.getByRole('button', { name: /read the file/i }));

        // Both mapped to the payee column, so nothing parses as an amount
        expect(
          await screen.findByText(/no rows with both a payee and an amount/i),
        ).toBeInTheDocument();
      });
    });

    it('reassures the user the file stays in their browser', async () => {
      const user = userEvent.setup();
      render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} onImportSpend={vi.fn()} />);
      await user.click(screen.getByText(/accounting or bank export/i));

      expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
    });

    it('is not offered where nothing would receive it', () => {
      // Spend adds systems rather than replacing the map, so it needs its own
      // handler. Offered without one, choosing it led to a dead end: the
      // preview accepted a selection and then did nothing.
      render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} />);

      expect(screen.queryByText(/accounting or bank export/i)).not.toBeInTheDocument();
      expect(screen.getByText(/systems list/i)).toBeInTheDocument();
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

    it('asks about unfamiliar headers instead of rejecting the file', async () => {
      // This used to be a dead end. A file whose headers we do not recognise
      // is almost always a perfectly good file, so ask rather than refuse.
      const user = userEvent.setup();
      render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} onImportSpend={vi.fn()} />);
      await user.click(screen.getByText(/accounting or bank export/i));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, createFile('foo,bar\n1,2\n', 'bad.csv', 'text/csv'));

      expect(await screen.findByLabelText(/who was paid/i)).toBeInTheDocument();
    });

    it('reports a file with nothing in it', async () => {
      const user = userEvent.setup();
      render(<ImportDialog open onClose={vi.fn()} onImport={vi.fn()} onImportSpend={vi.fn()} />);
      await user.click(screen.getByText(/accounting or bank export/i));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, createFile('Payee,Amount\n', 'empty.csv', 'text/csv'));

      expect(await screen.findByText(/no rows in it/i)).toBeInTheDocument();
    });
  });
});
