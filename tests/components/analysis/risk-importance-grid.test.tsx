import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { RiskImportanceGrid } from '@/components/analysis/risk-importance-grid';
import type { System, TechFreedomScore } from '@/lib/types';

function score(perDimension: number): TechFreedomScore {
  return {
    jurisdiction: perDimension,
    continuity: perDimension,
    surveillance: perDimension,
    lockIn: perDimension,
    costExposure: perDimension,
    isAutoScored: true,
  };
}

function system(
  id: string,
  name: string,
  importance?: number,
  perDimension?: number,
  extra: Partial<System> = {},
): System {
  return {
    id,
    name,
    type: 'other',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    importance,
    techFreedomScore: perDimension != null ? score(perDimension) : undefined,
    ...extra,
  };
}

function quadrant(name: RegExp) {
  return screen.getByRole('heading', { name }).closest('section')!;
}

describe('RiskImportanceGrid', () => {
  const systems = [
    system('s1', 'Salesforce', 9, 4), // critical, risk 20 — act first
    system('s2', 'Nextcloud', 9, 1), // critical, risk 5 — protect
    system('s3', 'Some SaaS', 2, 4), // not critical, risk 20 — reduce
    system('s4', 'Canva', 2, 1), // not critical, risk 5 — watch
  ];

  it('has no accessibility violations', async () => {
    const { container } = render(<RiskImportanceGrid systems={systems} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('places each system in the right quadrant', () => {
    render(<RiskImportanceGrid systems={systems} />);

    expect(within(quadrant(/critical and exposed/i)).getByText('Salesforce')).toBeInTheDocument();
    expect(within(quadrant(/critical and solid/i)).getByText('Nextcloud')).toBeInTheDocument();
    expect(within(quadrant(/exposed but not critical/i)).getByText('Some SaaS')).toBeInTheDocument();
    expect(within(quadrant(/low priority/i)).getByText('Canva')).toBeInTheDocument();
  });

  it('counts the systems in each quadrant', () => {
    render(<RiskImportanceGrid systems={systems} />);

    expect(
      screen.getByRole('heading', { name: /critical and exposed/i }),
    ).toHaveTextContent('(1)');
  });

  it('shows the scores behind the placement', () => {
    render(<RiskImportanceGrid systems={systems} />);

    expect(
      within(quadrant(/critical and exposed/i)).getByText(/importance 9\/10 · risk 20\/25/),
    ).toBeInTheDocument();
  });

  it('says what each quadrant means', () => {
    render(<RiskImportanceGrid systems={systems} />);

    expect(screen.getByText(/start here/i)).toBeInTheDocument();
    expect(screen.getByText(/often the easiest wins/i)).toBeInTheDocument();
  });

  it('marks an empty quadrant rather than hiding it', () => {
    render(<RiskImportanceGrid systems={[system('s1', 'Salesforce', 9, 4)]} />);

    expect(within(quadrant(/low priority/i)).getByText(/nothing here/i)).toBeInTheDocument();
  });

  it('flags shadow tools, since a critical unofficial tool is the point', () => {
    render(<RiskImportanceGrid systems={[system('s1', 'WhatsApp', 9, 4, { isShadow: true })]} />);

    expect(within(quadrant(/critical and exposed/i)).getByText('Shadow')).toBeInTheDocument();
  });

  it('says how many systems could not be placed', () => {
    render(
      <RiskImportanceGrid
        systems={[system('s1', 'Salesforce', 9, 4), system('s2', 'Unscored', 9)]}
      />,
    );

    expect(screen.getByText(/1 system is missing an importance or risk score/i)).toBeInTheDocument();
  });

  it('explains what is needed when nothing can be plotted', () => {
    render(<RiskImportanceGrid systems={[system('s1', 'Unscored')]} />);

    expect(screen.getByText(/needs both an importance score and a risk score/i)).toBeInTheDocument();
    expect(screen.queryByTestId('risk-importance-grid')).not.toBeInTheDocument();
  });
});
