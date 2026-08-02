import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MermaidRenderer } from '@/components/views/mermaid-renderer';

const SVG = '<svg id="test-diagram"><text>Xero</text></svg>';

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock('mermaid', () => ({ default: mermaidMock }));

describe('MermaidRenderer', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickedLinks: HTMLAnchorElement[];
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mermaidMock.render.mockResolvedValue({ svg: SVG });

    createObjectURL = vi.fn().mockReturnValue('blob:diagram');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    // Downloads happen through a detached anchor, so capture clicks on those
    clickedLinks = [];
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = originalCreateElement(tag, options);
      if (tag === 'a') {
        const anchor = el as HTMLAnchorElement;
        anchor.click = () => clickedLinks.push(anchor);
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the diagram Mermaid produces', async () => {
    render(<MermaidRenderer syntax="graph TB\n  a[Xero]" />);

    await waitFor(() => {
      expect(document.getElementById('test-diagram')).toBeInTheDocument();
    });
  });

  it('renders with strict security and SVG text labels', async () => {
    render(<MermaidRenderer syntax="graph TB\n  a[Xero]" />);

    await waitFor(() => expect(mermaidMock.initialize).toHaveBeenCalled());
    expect(mermaidMock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        flowchart: expect.objectContaining({ htmlLabels: false }),
      }),
    );
  });

  it('exports the SVG exactly as rendered', async () => {
    const user = userEvent.setup();
    render(<MermaidRenderer syntax="graph TB\n  a[Xero]" />);

    const button = await screen.findByRole('button', { name: /export as svg/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('image/svg+xml');
    await expect(blob.text()).resolves.toBe(SVG);

    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].download).toBe('stackmap-diagram.svg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:diagram');
  });

  it('disables the export buttons until there is a diagram', () => {
    mermaidMock.render.mockReturnValue(new Promise(() => {}));
    render(<MermaidRenderer syntax="graph TB\n  a[Xero]" />);

    expect(screen.getByRole('button', { name: /export as svg/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export as png/i })).toBeDisabled();
  });

  it('shows the raw syntax when a diagram fails to render', async () => {
    mermaidMock.render.mockRejectedValue(new Error('Parse error on line 2'));
    render(<MermaidRenderer syntax="graph TB\n  broken[" />);

    expect(await screen.findByText(/diagram rendering failed/i)).toBeInTheDocument();
    expect(screen.getByText(/parse error on line 2/i)).toBeInTheDocument();
    expect(screen.getByText(/view raw mermaid syntax/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MermaidRenderer syntax="graph TB\n  a[Xero]" />);
    await screen.findByRole('button', { name: /export as svg/i });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
