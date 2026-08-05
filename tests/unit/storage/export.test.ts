import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportAsJson, downloadJson } from '@/lib/storage/export';
import type { Architecture } from '@/lib/types';

const mockArchitecture: Architecture = {
  organisation: {
    id: 'org-1',
    name: 'Acme Corp',
    type: 'charity',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  functions: [
    { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
  ],
  services: [],
  systems: [
    {
      id: 'sys-1',
      name: 'CRM',
      type: 'crm',
      hosting: 'cloud',
      status: 'active',
      functionIds: ['fn-1'],
      serviceIds: [],
    },
  ],
  dataCategories: [],
  integrations: [],
  owners: [],
  externalParties: [],
  dataFlows: [],
  metadata: {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    stackmapVersion: '0.1.0',
    mappingPath: 'function_first',
  },
};

describe('exportAsJson', () => {
  it('returns a valid JSON string', () => {
    const json = exportAsJson(mockArchitecture);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(mockArchitecture);
  });

  it('returns pretty-printed JSON with 2-space indent', () => {
    const json = exportAsJson(mockArchitecture);
    expect(json).toBe(JSON.stringify(mockArchitecture, null, 2));
  });
});

describe('downloadJson', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let capturedAnchor: HTMLAnchorElement;

  beforeEach(() => {
    clickSpy = vi.fn();
    capturedAnchor = Object.create(HTMLAnchorElement.prototype, {
      href: { value: '', writable: true, configurable: true },
      download: { value: '', writable: true, configurable: true },
      click: { value: clickSpy, writable: true, configurable: true },
    }) as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(capturedAnchor as unknown as HTMLElement);
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('triggers a download with default filename', () => {
    downloadJson(mockArchitecture);

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('uses a custom filename when provided', () => {
    downloadJson(mockArchitecture, 'my-export.json');

    expect(capturedAnchor.download).toBe('my-export.json');
  });

  it('uses default filename stackmap-architecture.json', () => {
    downloadJson(mockArchitecture);

    expect(capturedAnchor.download).toBe('stackmap-architecture.json');
  });
});
