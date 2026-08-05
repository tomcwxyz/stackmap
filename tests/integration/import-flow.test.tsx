import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportDialog } from '@/components/import/import-dialog';
import type { Architecture } from '@/lib/types';

/**
 * Integration tests for the import flow.
 *
 * These tests exercise ImportDialog with the real import logic
 * (validate-json, parse-csv, csv-to-architecture) — nothing is mocked
 * except the onClose / onImport callbacks.
 */

function createFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

function makeValidArchitectureJson(): Record<string, unknown> {
  return {
    organisation: {
      id: 'o1',
      name: 'Test Org',
      type: 'charity',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    functions: [
      { id: 'f1', name: 'Finance', type: 'finance', isActive: true },
    ],
    services: [],
    systems: [
      {
        id: 's1',
        name: 'Xero',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['f1'],
        serviceIds: [],
      },
    ],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1',
      exportedAt: '2026-01-01T00:00:00Z',
      stackmapVersion: '0.1.0',
      mappingPath: 'function_first',
    },
  };
}

describe('Import flow integration', () => {
  const onClose = vi.fn();
  const onImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── JSON import ───────────────────────────────────────────────

  describe('JSON import', () => {
    it('has no accessibility violations on JSON preview step', async () => {
      const arch = makeValidArchitectureJson();
      const file = createFile(
        JSON.stringify(arch),
        'test.json',
        'application/json',
      );

      const { container } = render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/json/i));
      const input = screen.getByLabelText(/select a .json file/i);
      await user.upload(input, file);

      // Wait for preview
      await screen.findByText((_, el) =>
        el?.tagName === 'LI' && /1\s+function/.test(el.textContent ?? ''),
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('imports valid JSON and calls onImport with architecture', async () => {
      const arch = makeValidArchitectureJson();
      const file = createFile(
        JSON.stringify(arch),
        'test.json',
        'application/json',
      );

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      // Select JSON format
      await user.click(screen.getByText(/json/i));

      // Upload file
      const input = screen.getByLabelText(/select a .json file/i);
      await user.upload(input, file);

      // Wait for preview — counts are split across elements
      expect(
        await screen.findByText(
          (_, el) =>
            el?.tagName === 'LI' && /1\s+function/.test(el.textContent ?? ''),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          (_, el) =>
            el?.tagName === 'LI' && /1\s+system/.test(el.textContent ?? ''),
        ),
      ).toBeInTheDocument();

      // Click "Replace current data"
      await user.click(
        screen.getByRole('button', { name: /replace current data/i }),
      );
      expect(onImport).toHaveBeenCalledTimes(1);

      // Verify the architecture passed to onImport
      const importedArch = onImport.mock.calls[0][0] as Architecture;
      expect(importedArch.organisation.name).toBe('Test Org');
      expect(importedArch.systems).toHaveLength(1);
      expect(importedArch.systems[0].name).toBe('Xero');
      expect(importedArch.functions).toHaveLength(1);
    });

    it('shows validation errors for invalid JSON', async () => {
      const file = createFile('not json', 'bad.json', 'application/json');

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/json/i));
      const input = screen.getByLabelText(/select a .json file/i);
      await user.upload(input, file);

      expect(
        await screen.findByText(/isn.*t valid json/i),
      ).toBeInTheDocument();
      expect(onImport).not.toHaveBeenCalled();
    });

    it('shows Zod errors for wrong-shaped JSON', async () => {
      const file = createFile(
        JSON.stringify({ foo: 'bar' }),
        'wrong.json',
        'application/json',
      );

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/json/i));
      const input = screen.getByLabelText(/select a .json file/i);
      await user.upload(input, file);

      expect(
        await screen.findByText(/doesn.*t match/i),
      ).toBeInTheDocument();
      expect(onImport).not.toHaveBeenCalled();
    });

    it('can recover from error and try again', async () => {
      const badFile = createFile('oops', 'bad.json', 'application/json');
      const goodArch = makeValidArchitectureJson();
      const goodFile = createFile(
        JSON.stringify(goodArch),
        'good.json',
        'application/json',
      );

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      // First: upload bad file
      await user.click(screen.getByText(/json/i));
      const input = screen.getByLabelText(/select a .json file/i);
      await user.upload(input, badFile);
      await screen.findByText(/isn.*t valid json/i);

      // Click "Try again"
      await user.click(screen.getByRole('button', { name: /try again/i }));
      expect(screen.getByText(/select a .json file/i)).toBeInTheDocument();

      // Upload the good file
      const input2 = screen.getByLabelText(/select a .json file/i);
      await user.upload(input2, goodFile);

      // Should reach preview
      expect(
        await screen.findByText(
          (_, el) =>
            el?.tagName === 'LI' && /1\s+system/.test(el.textContent ?? ''),
        ),
      ).toBeInTheDocument();
    });
  });

  // ─── CSV import ────────────────────────────────────────────────

  describe('CSV import', () => {
    it('has no accessibility violations on CSV preview step', async () => {
      const csv =
        'name,vendor,type,cost,function\nSalesforce,Salesforce Inc,crm,1200,fundraising\nXero,Xero Ltd,finance,400,finance';
      const file = createFile(csv, 'systems.csv', 'text/csv');

      const { container } = render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/csv/i));
      const input = screen.getByLabelText(/select a .csv file/i);
      await user.upload(input, file);

      // Wait for the name input (unique because vendor differs)
      await screen.findByLabelText(/name for row 1/i);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('imports CSV and shows editable preview', async () => {
      const csv =
        'name,vendor,type,cost,function\nSalesforce,Salesforce Inc,crm,1200,fundraising\nXero,Xero Ltd,finance,400,finance';
      const file = createFile(csv, 'systems.csv', 'text/csv');

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/csv/i));
      const input = screen.getByLabelText(/select a .csv file/i);
      await user.upload(input, file);

      // Should show preview table with the rows — use label-based selectors
      const nameInput1 = await screen.findByLabelText(/name for row 1/i);
      expect(nameInput1).toHaveValue('Salesforce');
      const nameInput2 = screen.getByLabelText(/name for row 2/i);
      expect(nameInput2).toHaveValue('Xero');

      // Click import button
      await user.click(
        screen.getByRole('button', { name: /import 2 systems/i }),
      );
      expect(onImport).toHaveBeenCalledTimes(1);

      const importedArch = onImport.mock.calls[0][0] as Architecture;
      expect(importedArch.systems).toHaveLength(2);
      expect(importedArch.systems[0].name).toBe('Salesforce');
      expect(importedArch.systems[1].name).toBe('Xero');
    });

    it('creates functions from CSV function column', async () => {
      const csv =
        'name,type,function\nSalesforce,crm,fundraising\nXero,finance,finance\nSlack,messaging,operations';
      const file = createFile(csv, 'systems.csv', 'text/csv');

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/csv/i));
      const input = screen.getByLabelText(/select a .csv file/i);
      await user.upload(input, file);

      await screen.findByDisplayValue('Salesforce');

      await user.click(
        screen.getByRole('button', { name: /import 3 systems/i }),
      );

      const importedArch = onImport.mock.calls[0][0] as Architecture;
      // Should have 3 unique functions: fundraising, finance, operations
      expect(importedArch.functions).toHaveLength(3);
      const fnNames = importedArch.functions.map((f) => f.name).sort();
      expect(fnNames).toEqual(['Finance', 'Fundraising', 'Operations']);
    });

    it('allows editing rows before import', async () => {
      const csv = 'name,type\nSalesforce,crm';
      const file = createFile(csv, 'systems.csv', 'text/csv');

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/csv/i));
      const input = screen.getByLabelText(/select a .csv file/i);
      await user.upload(input, file);

      const nameInput = await screen.findByLabelText(/name for row 1/i);
      expect(nameInput).toHaveValue('Salesforce');

      // Edit the name
      await user.clear(nameInput);
      await user.type(nameInput, 'HubSpot');

      await user.click(
        screen.getByRole('button', { name: /import 1 system/i }),
      );

      const importedArch = onImport.mock.calls[0][0] as Architecture;
      expect(importedArch.systems[0].name).toBe('HubSpot');
    });

    it('shows error for empty CSV', async () => {
      const file = createFile('', 'empty.csv', 'text/csv');

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/csv/i));
      const input = screen.getByLabelText(/select a .csv file/i);
      await user.upload(input, file);

      expect(await screen.findByText(/empty/i)).toBeInTheDocument();
      expect(onImport).not.toHaveBeenCalled();
    });

    it('shows error for CSV with no name column', async () => {
      const csv = 'product,price\nThing,100';
      const file = createFile(csv, 'bad.csv', 'text/csv');

      render(
        <ImportDialog open onClose={onClose} onImport={onImport} />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText(/csv/i));
      const input = screen.getByLabelText(/select a .csv file/i);
      await user.upload(input, file);

      expect(
        await screen.findByText(/no name column found/i),
      ).toBeInTheDocument();
      expect(onImport).not.toHaveBeenCalled();
    });
  });
});
