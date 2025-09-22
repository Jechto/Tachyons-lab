// Helper functions ported from helper.py
export function parseSignedInt(s: string): number {
  s = s.trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      try {
        const n1 = parseInt(parts[0]);
        const n2 = parseInt(parts[1]);
        return Math.floor((n1 + n2) / 2);
      } catch {
        // Fall through to regular parsing
      }
    }
  }
  return parseInt(s);
}

export function lerpLevels(values: number[]): number[] {
  const n = values.length;
  const result = [...values];
  
  // Find indices of known values
  const known: Array<[number, number]> = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== -1) {
      known.push([i, values[i]]);
    }
  }
  
  if (known.length === 0) {
    return new Array(n).fill(-1);
  }
  
  const firstKnownIdx = values.findIndex(v => v !== -1);
  
  for (let idx = 0; idx < values.length; idx++) {
    if (values[idx] === -1) {
      // If before the first known value, keep as -1
      if (firstKnownIdx !== -1 && idx < firstKnownIdx) {
        result[idx] = -1;
        continue;
      }
      
      // Find previous and next known
      const prev = known.slice().reverse().find(([i]) => i < idx);
      const next = known.find(([i]) => i > idx);
      
      if (prev && next) {
        // Linear interpolation
        const [i0, v0] = prev;
        const [i1, v1] = next;
        const interp = v0 + Math.floor((v1 - v0) * (idx - i0) / (i1 - i0));
        result[idx] = interp;
      } else if (prev) {
        result[idx] = prev[1];
      } else if (next) {
        result[idx] = next[1];
      } else {
        result[idx] = -1;
      }
    }
  }
  
  return result;
}