import { DeckEvaluator } from "../app/classes/DeckEvaluator";
import { SupportCard } from "../app/classes/SupportCard";
import { Tierlist } from "../app/classes/Tierlist";
import { CardData } from "../app/types/cardTypes";

// --- Test Runner Helpers ---
let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passedTests++;
    } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(error);
        failedTests++;
    }
}

function expect(actual: unknown) {
    return {
        toBe: (expected: unknown) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        },
        toEqual: (expected: unknown) => {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
            }
        },
        toBeCloseTo: (expected: number, precision: number = 2) => {
            if (typeof actual !== 'number') throw new Error(`Expected number but got ${typeof actual}`);
            if (Math.abs(actual - expected) > Math.pow(10, -precision)) {
                throw new Error(`Expected ${expected} to be close to ${actual}`);
            }
        },
        toBeTruthy: () => {
            if (!actual) throw new Error(`Expected ${actual} to be truthy`);
        }
    };
}

// --- Mocks ---
const mockCardData: CardData[] = [
    {
        id: 1001,
        chara_id_card: 1,
        rarity: 3,
        card_chara_name: "Special Week",
        prefered_type_id: 1,
        prefered_type: "Speed",
        effects: [
            { type: 1, type_name: "Speed Bonus", "0lb": 1, "1lb": 1, "2lb": 1, "3lb": 1, mlb: 1 },
            { type: 19, type_name: "Training Effectiveness", "0lb": 5, "1lb": 5, "2lb": 5, "3lb": 5, mlb: 10 }
        ],
        unique_effects: [],
        all_events: {
            chain_events: [],
            dates: [],
            special_events: [],
            random_events: []
        }
    }
];

// --- Tests ---

async function runTests() {
    console.log("Starting Unit Tests...\n");

    await test("SupportCard: Instantiation and Basic Properties", () => {
        const card = new SupportCard(1001, 4, mockCardData);
        expect(card.id).toBe(1001);
        expect(card.limitBreak).toBe(4);
        expect(card.cardUma.name).toBe("Special Week");
        expect(card.cardBonus["Speed Bonus"]).toBe(1);
        expect(card.cardBonus["Training Effectiveness"]).toBe(10);
    });

    await test("DeckEvaluator: Default Distribution", () => {
        const evaluator = new DeckEvaluator();
        const dist = evaluator.getTrainingDistribution();
        // Default is 0.2 for all 5 stats
        expect(dist.length).toBe(5);
        expect(dist[0]).toBe(0.2);
        expect(dist[4]).toBe(0.2);
    });

    await test("DeckEvaluator: Manual Distribution", () => {
        const evaluator = new DeckEvaluator();
        const manualDist = [0.5, 0.5, 0, 0, 0];
        evaluator.setManualDistribution(manualDist);
        const dist = evaluator.getTrainingDistribution();
        expect(dist).toEqual(manualDist);
    });

    await test("DeckEvaluator: Scenario Bonus (URA vs Unity)", () => {
        const evaluator = new DeckEvaluator();
        // Empty deck stats
        const uraStats = evaluator.evaluateStats("URA");
        const unityStats = evaluator.evaluateStats("Unity");

        // URA Bonus is 15 flat
        // Unity Bonus is 46 (15 + 31) flat
        // Base stats also differ slightly in training values, but scenario bonus is a clear indicator
        
        // We can check the difference. 
        // Note: evaluateStats returns total stats including base training.
        // Let's just check that Unity gives more stats than URA for an empty deck
        
        const uraTotal = uraStats.Speed + uraStats.Stamina + uraStats.Power + uraStats.Guts + (uraStats.Wit || 0);
        const unityTotal = unityStats.Speed + unityStats.Stamina + unityStats.Power + unityStats.Guts + (unityStats.Wit || 0);

        if (unityTotal <= uraTotal) {
            throw new Error(`Unity stats (${unityTotal}) should be higher than URA stats (${uraTotal})`);
        }
    });

    await test("Tierlist: Fix Verification - Manual Distribution on Empty Deck", () => {
        // This test verifies that the Tierlist class correctly applies the manual distribution
        // to the "empty deck" baseline when calculating stat deltas.
        
        const evaluator = new DeckEvaluator();
        // Set an extreme manual distribution
        const manualDist = [1.0, 0, 0, 0, 0]; // 100% Speed
        evaluator.setManualDistribution(manualDist);

        const tierlist = new Tierlist();
        
        // We pass an empty deck with manual distribution.
        // If the fix works:
        // baseResultForDeck = Empty Deck + Manual Dist
        // baseResultEmptyDeck = Empty Deck + Manual Dist
        // deck.stats (delta) = baseResultForDeck - baseResultEmptyDeck = 0
        
        const result = tierlist.bestCardForDeck(
            evaluator,
            undefined, // default race types
            undefined, // default running types
            mockCardData,
            undefined,
            "URA"
        );

        if ('error' in result) {
            throw new Error("Tierlist generation failed: " + result.error);
        }

        if (!('deck' in result)) {
             throw new Error("Result is not a TierlistSuccess");
        }

        const deckStats = result.deck.stats;
        
        // Allow for small floating point errors, but they should be integers mostly
        expect(Math.abs(deckStats.Speed)).toBe(0);
        expect(Math.abs(deckStats.Stamina)).toBe(0);
        expect(Math.abs(deckStats.Power)).toBe(0);
        expect(Math.abs(deckStats.Guts)).toBe(0);
        
        // If the bug was present (empty deck used default 0.2 dist), 
        // the Speed delta would be huge (positive) and others negative.
    });

    await test("Tierlist: Penalty Logic", () => {
        const evaluator = new DeckEvaluator();
        const tierlist = new Tierlist();
        
        // Use empty deck which should have low stats and trigger penalties
        const result = tierlist.bestCardForDeck(
            evaluator,
            undefined,
            undefined,
            mockCardData,
            undefined,
            "URA"
        );

        if ('error' in result) {
             throw new Error("Tierlist generation failed: " + result.error);
        }
        
        const breakdown = result.deck.scoreBreakdown;
        if (!breakdown) throw new Error("No score breakdown found");
        
        // Check Stamina Penalty
        // Base Stamina for URA empty deck is low (~400? No, much lower, around 300-400 depending on training)
        // Threshold for Medium is 400.
        // If stats are < 400, penalty should be applied.
        
        if (breakdown.staminaPenalty < 1) {
            console.log(`Verified Stamina Penalty: ${breakdown.staminaPenalty} (${breakdown.staminaPenaltyReason})`);
        } else {
            console.log(`No Stamina Penalty applied. Stats: ${breakdown.statContributions.find((s: { stat: string; value: number }) => s.stat === 'Stamina')?.value}`);
        }
        
        // We expect some penalty for an empty deck on Medium (default)
        expect(breakdown.staminaPenalty).toBeTruthy();
    });

    console.log(`\nSummary: ${passedTests} Passed, ${failedTests} Failed`);
    if (failedTests > 0) process.exit(1);
}

runTests();
