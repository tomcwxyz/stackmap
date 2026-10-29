# Dependency security remediation — 29 October 2026

Issue: [#16](https://github.com/tomcwxyz/stackmap/issues/16)

## Assessment

The prior lockfile produced 27 npm audit findings in total
(1 critical, 17 high, 7 moderate, 2 low), including 18 in the
production dependency graph (1 critical, 12 high, 4 moderate, 1 low).
A package finding is not by itself proof of an exploitable route.

StackMap is built with Next.js as a **static export** and served by
Cloudflare Pages. It does not run a Next.js request server in production,
and its images are configured as unoptimised. Consequently many Next.js
server-side attacks are not reachable in the deployed architecture;
that distinction does **not** remove risks in the build environment
or browser-side dependencies such as Mermaid.

## Remediation strategy

- Upgrade the unsupported Next.js 14 series to a security-patched
  Next.js 16 release, and upgrade React 18 to React 19 with it.
- Keep the custom Webpack configuration by using `next build --webpack`.
- Upgrade Mermaid within 11.x to the patched 11.17.2 release;
  update directly declared PostCSS, Zod, UUID and development tooling.
- Regenerate the entire lockfile with npm 11, including non-breaking
  `npm audit fix` updates. Never hand-edit package integrity checksums.
- Check full and production-only audit results on the exact lockfile.
- Verify lint, types, unit tests, full browser tests, the static-export
  build, documentation build and Cloudflare deployment before release.

The dependency audit workflow retains full machine-readable npm JSON
results for each security PR. Neither a lower audit count nor a green
build substitutes for checking actual advisory exposure.

## Verified residual findings

The regenerated 29 October 2026 lockfile yields **two low-severity
entries** in the full graph and the production graph; **no medium,
high or critical advisories** remain. Both entries are caused by the
`mermaid@11.17.2` dependency on `katex`:

- [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7):
  KaTeX trust-restriction bypass in the presence of existing prototype
  pollution. npm attributes this both to KaTeX and to its parent Mermaid.
- npm proposes `mermaid@12.2.0` (a breaking major) to resolve those
  two low advisories. Keep Mermaid 11.17.2 with the current strict SVG
  rendering configuration for this security patch, and evaluate Mermaid
  12 independently with diagram/export regression tests.

The dependency-audit CI job fails for any new *moderate, high or critical*
npm advisory (full and production graph). Low findings remain visible
in the detailed report and workflow artifacts; they are **not** silently
exempted or deemed harmless. Update this review when the dependency
graph changes.
