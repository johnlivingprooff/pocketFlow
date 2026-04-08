export function parseJsonNumberArray(value: string | null | undefined): number[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item));
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
  const left = Array.from(new Set(a)).sort((x, y) => x - y);
  const right = Array.from(new Set(b)).sort((x, y) => x - y);

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
