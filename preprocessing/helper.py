
import json

from typing import Any


def parse_signed_int(s: str) -> int:
    s = s.strip()
    if '/' in s:
        parts = s.split('/')
        if len(parts) == 2:
            try:
                n1 = int(parts[0])
                n2 = int(parts[1])
                return (n1 + n2) // 2
            except ValueError:
                pass
    return int(s)

def read_json_file(path: str) -> Any:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    
    
from typing import List, Tuple, Dict

def lerp_levels(values: Tuple[int, ...] | List[int]) -> Dict[str, int]:
    """
    Given a list or tuple of values (with -1 as missing), interpolate missing values linearly between known values.
    Returns a list of computed values.
    """
    n = len(values)
    # Convert tuple to list for mutability
    result = list(values)
    # Find indices of known values
    known = [(i, v) for i, v in enumerate(values) if v != -1]
    if not known:
        # All values are missing
        return [-1 for _ in range(n)]
    first_known_idx = next((i for i, v in enumerate(values) if v != -1), None)
    for idx, val in enumerate(values):
        if val == -1:
            # If before the first known value, keep as -1
            if first_known_idx is not None and idx < first_known_idx:
                result[idx] = -1
                continue
            # Find previous and next known
            prev = next((k for k in reversed(known) if k[0] < idx), None)
            nxt = next((k for k in known if k[0] > idx), None)
            if prev and nxt:
                # Linear interpolation
                i0, v0 = prev
                i1, v1 = nxt
                interp = v0 + (v1 - v0) * (idx - i0) // (i1 - i0)
                result[idx] = interp
            elif prev:
                result[idx] = prev[1]
            elif nxt:
                result[idx] = nxt[1]
            else:
                result[idx] = -1
    return result

