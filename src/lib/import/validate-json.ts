import { ArchitectureSchema } from '@/lib/schema';
import type { Architecture } from '@/lib/types';

interface ValidationSuccess {
  success: true;
  data: Architecture;
}

interface ValidationFailure {
  success: false;
  error: string;
  errors?: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateArchitectureJson(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: 'This file isn\u2019t valid JSON.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { success: false, error: 'Expected a JSON object.' };
  }

  // Strip computed fields that exports add
  const { costSummary, overlaps, duplication, riskSummary, ...rest } = parsed as Record<string, unknown>;

  const result = ArchitectureSchema.safeParse(rest);
  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    return {
      success: false,
      error: 'This file doesn\u2019t match the Stackmap format.',
      errors,
    };
  }

  return { success: true, data: result.data as Architecture };
}
