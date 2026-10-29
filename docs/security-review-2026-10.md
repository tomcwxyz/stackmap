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
