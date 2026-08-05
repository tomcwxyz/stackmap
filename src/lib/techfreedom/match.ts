import type { KnownTool } from './types';

/**
 * Vendors whose name on a statement says nothing about which product it was.
 *
 * Everything else here reasons from the tools database, but the database's
 * coverage of a vendor is not evidence about what that vendor sells. Stackmap
 * knows one Amazon product — Amazon Web Services — and would happily read an
 * "AMAZON" line as a cloud hosting bill when it is almost always shopping.
 *
 * Only vendors that sell far more than software belong here. A vendor with a
 * single product, like Anthropic or Automattic, is not ambiguous and is
 * matched normally.
 */
const AMBIGUOUS_BRANDS = new Set(['amazon', 'apple']);

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/** Words, ignoring punctuation, so "Xerox" cannot be read as "Xero". */
function tokenise(value: string): string[] {
  return normalise(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** True when `needle` appears in `haystack` as a run of whole words. */
function containsWords(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;

  for (let start = 0; start <= haystack.length - needle.length; start++) {
    if (needle.every((word, i) => haystack[start + i] === word)) return true;
  }
  return false;
}

/**
 * Every vendor that sells more than one of the tools we know about.
 *
 * A bare "Microsoft" could be any of twelve products, so it identifies
 * nothing. Built from the tools passed in rather than a fixed list, so it
 * stays right as the database grows.
 */
function ambiguousVendors(tools: KnownTool[]): Set<string> {
  const counts = new Map<string, number>();
  for (const tool of tools) {
    const provider = normalise(tool.provider);
    counts.set(provider, (counts.get(provider) ?? 0) + 1);
  }

  const ambiguous = new Set(AMBIGUOUS_BRANDS);
  for (const [provider, count] of counts) {
    if (count > 1) ambiguous.add(provider);
  }
  return ambiguous;
}

/**
 * The tool a name most likely refers to, or null when nothing is certain
 * enough to be worth guessing.
 *
 * Reporting no match is cheap: the payee is listed for the user to identify.
 * Reporting a wrong one is not — imported tools arrive ticked, costed and
 * risk-scored, so a bad guess puts a shopping habit on the map as a hosting
 * bill. Every rule here is therefore anchored to whole words, and a vendor's
 * brand on its own is never taken to mean one of its products.
 */
export function findMatchingTool(input: string, tools: KnownTool[]): KnownTool | null {
  const query = normalise(input);
  if (query.length < 3) return null;

  const queryWords = tokenise(input);
  if (queryWords.length === 0) return null;

  // An exact name is not a guess at all
  const exact = tools.find((t) => normalise(t.name) === query);
  if (exact) return exact;

  const slugMatch = tools.find((t) => t.slug === query.replace(/\s+/g, '-'));
  if (slugMatch) return slugMatch;

  // A statement descriptor names the product in the vendor's own shorthand
  const aliased = tools.find((t) =>
    (t.aliases ?? []).some((alias) => containsWords(queryWords, tokenise(alias))),
  );
  if (aliased) return aliased;

  const vendors = ambiguousVendors(tools);
  const queryIsBareBrand = vendors.has(query);

  // Longest first, so "Google Sheets" is preferred over a shorter tool whose
  // name is also present in the text
  const byNameLength = [...tools].sort((a, b) => b.name.length - a.name.length);

  // The text names the tool in full: "GOOGLE WORKSPACE_stackmap"
  const named = byNameLength.find((t) => containsWords(queryWords, tokenise(t.name)));
  if (named) return named;

  // The text is part of a tool's name: "Teams" for Microsoft Teams. Refused
  // for a bare vendor brand, which identifies the seller and not the product.
  if (!queryIsBareBrand) {
    const partial = byNameLength.find((t) => containsWords(tokenise(t.name), queryWords));
    if (partial) return partial;
  }

  // Last resort: the text names a vendor that sells exactly one thing we know
  // about, as with "ANTHROPIC" for Claude.
  const byVendor = tools.filter(
    (t) => !vendors.has(normalise(t.provider)) && containsWords(queryWords, tokenise(t.provider)),
  );
  if (byVendor.length === 1) return byVendor[0];

  return null;
}
