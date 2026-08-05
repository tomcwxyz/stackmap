import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechFreedomToggle } from '@/components/techfreedom/toggle';

const mockSetTechFreedomEnabled = vi.fn();

// Mock useAppConfig
vi.mock('@/hooks/useAppConfig', () => ({
  useAppConfig: vi.fn(() => ({
    config: { techFreedomAvailable: true },
    updateConfig: vi.fn(),
  })),
}));

// Mock useArchitecture
vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: vi.fn(() => ({
    architecture: {
      organisation: { id: '1', name: 'Test', type: 'charity', createdAt: '', updatedAt: '' },
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
        stackmapVersion: '0.1.0',
        mappingPath: 'function_first',
        techFreedomEnabled: false,
      },
    },
    isLoading: false,
    setTechFreedomEnabled: mockSetTechFreedomEnabled,
  })),
}));

// Import mocked modules so we can override per-test
import { useAppConfig } from '@/hooks/useAppConfig';
import { useArchitecture } from '@/hooks/useArchitecture';

const mockedUseAppConfig = vi.mocked(useAppConfig);
const mockedUseArchitecture = vi.mocked(useArchitecture);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAppConfig.mockReturnValue({
    config: { techFreedomAvailable: true },
    updateConfig: vi.fn(),
  });
  mockedUseArchitecture.mockReturnValue({
    architecture: {
      organisation: { id: '1', name: 'Test', type: 'charity', createdAt: '', updatedAt: '' },
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
        stackmapVersion: '0.1.0',
        mappingPath: 'function_first',
        techFreedomEnabled: false,
      },
    },
    isLoading: false,
    setTechFreedomEnabled: mockSetTechFreedomEnabled,
  } as unknown as ReturnType<typeof useArchitecture>);
});

describe('TechFreedomToggle', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<TechFreedomToggle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders when techFreedomAvailable is true', () => {
    render(<TechFreedomToggle />);
    expect(screen.getByText('Include TechFreedom risk assessment')).toBeInTheDocument();
    expect(screen.getByText(/Assess your technology stack/)).toBeInTheDocument();
  });

  it('renders nothing when techFreedomAvailable is false', () => {
    mockedUseAppConfig.mockReturnValue({
      config: { techFreedomAvailable: false },
      updateConfig: vi.fn(),
    });
    const { container } = render(<TechFreedomToggle />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing while loading', () => {
    mockedUseArchitecture.mockReturnValue({
      architecture: null,
      isLoading: true,
      setTechFreedomEnabled: mockSetTechFreedomEnabled,
    } as unknown as ReturnType<typeof useArchitecture>);
    const { container } = render(<TechFreedomToggle />);
    expect(container.innerHTML).toBe('');
  });

  it('checkbox is unchecked when techFreedomEnabled is false', () => {
    render(<TechFreedomToggle />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('checkbox is checked when techFreedomEnabled is true', () => {
    mockedUseArchitecture.mockReturnValue({
      architecture: {
        organisation: { id: '1', name: 'Test', type: 'charity', createdAt: '', updatedAt: '' },
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
          stackmapVersion: '0.1.0',
          mappingPath: 'function_first',
          techFreedomEnabled: true,
        },
      },
      isLoading: false,
      setTechFreedomEnabled: mockSetTechFreedomEnabled,
    } as unknown as ReturnType<typeof useArchitecture>);
    render(<TechFreedomToggle />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls setTechFreedomEnabled on toggle', () => {
    render(<TechFreedomToggle />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockSetTechFreedomEnabled).toHaveBeenCalledWith(true);
  });
});
