export function parseJsonNumberArray(value: string | null | undefined): number[] {
  if (!value || value === '[]') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Single pass, no intermediate map array (was map+filter = 2 passes)
    const out: number[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const n = Number(parsed[i]);
      if (Number.isInteger(n)) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

export function mergeUniqueNumbers(...lists: Array<readonly number[] | undefined>): number[] {
  const merged = new Set<number>();

  for (const list of lists) {
    if (!list) {
      continue;
    }

    for (const value of list) {
      if (Number.isInteger(value)) {
        merged.add(value);
      }
    }
  }

  return Array.from(merged);
}

export function haveSameNumberMembers(a: readonly number[], b: readonly number[]): boolean {
  // Fast path: length check first avoids Set+sort for the common unequal case.
  // Sort-based compare preserved for equal-length inputs (same result).
  if (a.length !== b.length) {
    // Lengths differ — still need dedup check (e.g. [1,1] vs [1]), so fall through
    // only when duplicates could explain it; small arrays so keep it simple:
    if (a.length === 0 || b.length === 0) return a.length === b.length;
  }
  const left = Array.from(new Set(a)).sort((x, y) => x - y);
  const right = Array.from(new Set(b)).sort((x, y) => x - y);

  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
