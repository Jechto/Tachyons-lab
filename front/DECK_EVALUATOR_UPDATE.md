# DeckEvaluator Update - Combinatorics Implementation

## What Changed

The `DeckEvaluator` class has been replaced with a **combinatorics-based implementation** that more accurately models card appearance probabilities and their combinations.

## Key Improvements

### 1. **Combinatorial Card Combinations**
- Previously: Used probability-weighted averages for card presence
- Now: Calculates all possible combinations of cards appearing at training (2^N combinations)
- Each combination is weighted by its actual probability

### 2. **More Accurate Stat Predictions**
- Accounts for rare but high-value scenarios (e.g., all cards appearing together)
- Models crowd bonuses more precisely
- Captures stacking friendship bonuses correctly

### 3. **Probability Calculations**
```typescript
// For each training facility with N cards:
// - Generate all 2^N possible card combinations
// - Calculate probability of each combination appearing
// - Calculate stat gains for that specific combination
// - Weight by probability and sum for expected value
```

## How It Works

### Card Appearance Probabilities
```typescript
// Specialty training: 20% base + specialty priority bonus
rainbowSpecialty = min(1.0, 0.2 + specialtyPriority/100)

// Off-specialty training: 5% (20% divided by 4 other facilities)
offSpecialty = 0.05
```

### Combination Probability
For a specific combination at a training:
- Multiply probabilities of all cards IN the combination appearing
- Multiply by probabilities of all cards NOT in combination staying away

Example with 3 Speed cards [A, B, C] at Speed training:
- Combo [A, B]: P(A appears) × P(B appears) × P(C doesn't appear)
- Each combination contributes: probability × stat_gains

### Expected Value
The final stat gain is the sum of all combinations weighted by their probabilities:
```
E[stats] = Σ (P(combination_i) × gains(combination_i))
```

## Comparison with Competitor

This implementation is similar to the competitor's approach in `umamusume-tierlist-main`:
- Uses same combinatorial methodology
- Calculates all possible card arrangements
- Weights outcomes by probability
- More mathematically complete than simple averages

## Files Modified

- **`DeckEvaluator.ts`**: Complete rewrite with combinatorics approach
- **`Tierlist.ts`**: No changes needed (uses same interface)
- **Backup**: Original implementation saved as `DeckEvaluator.original.ts`

## Performance

- Complexity: O(2^N) per training facility per turn, where N = cards of that type
- In practice: Fast enough for real-time use (max 6 cards = 64 combinations)
- Each turn at each facility evaluates all combinations

## Backward Compatibility

✅ **Fully compatible** - Same interface as original DeckEvaluator:
- Same public methods
- Same return types
- Drop-in replacement

## Testing

The implementation maintains the same API, so all existing components should work without changes:
- `Tierlist.bestCardForDeck()` - unchanged interface
- `CardCollectionManager` - no changes needed
- `TierlistDisplay` - works as before

## Restoring Original Implementation

If needed, the original deterministic implementation is backed up:
```bash
# Restore original
Copy-Item "DeckEvaluator.original.ts" "DeckEvaluator.ts"
```
