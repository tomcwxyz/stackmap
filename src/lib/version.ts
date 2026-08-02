/**
 * Single source of truth for the version strings written into exported and
 * stored architectures. Keep STACKMAP_VERSION in step with package.json and the
 * changelog.
 */

/** Application version — matches package.json. */
export const STACKMAP_VERSION = '0.3.0';

/**
 * Version of the Architecture document shape itself. Bump this when the stored
 * structure changes in a way that needs a migration in `lib/storage/migrate`.
 */
export const SCHEMA_VERSION = '1.0.0';
