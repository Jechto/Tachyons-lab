// Test script to validate penalty configuration consistency
import { Tierlist } from '../classes/Tierlist';
import { DEFAULT_PENALTY_CONFIG, ALTERNATIVE_PENALTY_CONFIG } from '../config/penaltyConfig';

// Test data
const testRawStats = {
    Speed: 800,
    Stamina: 150, // Below Sprint threshold
    Power: 700,
    Guts: 600,
    Wit: 1300, // Overbuilt (above 1200)
    "Skill Points": 50,
};

const testDeltaStats = {
    Speed: 100,
    Stamina: 50,
    Power: 80,
    Guts: 60,
    Wit: 120,
    "Skill Points": 10,
};

const testHintDict = {
    total_hints: 20,
    useful_hints_rate: 0.2, // Below 25% threshold
};

const testWeights = {
    Speed: 1.0,
    Stamina: 1.0,
    Power: 1.0,
    Guts: 1.0,
    Wit: 1.0,
    "Skill Points": 0.2,
    Hints: 4.0,
};

const testRaceTypes = {
    Sprint: true,
    Mile: false,
    Medium: false,
    Long: false,
};

export function testPenaltyConfigConsistency() {
    const tierlist = new Tierlist();
    
    console.log("=== Testing Penalty Configuration Consistency ===");
    
    // Test with default config
    console.log("\n--- Default Config Test ---");
    const defaultResult = (tierlist as any).resultsWithPenaltyToScore(
        testRawStats,
        testDeltaStats,
        testHintDict,
        testWeights,
        testRaceTypes,
        DEFAULT_PENALTY_CONFIG
    );
    
    const defaultBreakdown = tierlist.getScoreBreakdown(
        testRawStats,
        testDeltaStats,
        testHintDict,
        testWeights,
        testRaceTypes,
        DEFAULT_PENALTY_CONFIG
    );
    
    console.log(`Score: ${defaultResult}`);
    console.log(`Base Score: ${defaultBreakdown.baseScore}`);
    console.log(`Stamina Penalty: ${defaultBreakdown.staminaPenaltyReason}`);
    console.log(`Hints Penalty: ${defaultBreakdown.usefulHintsPenaltyReason}`);
    console.log(`Stat Overbuilt Penalty: ${defaultBreakdown.statOverbuiltPenaltyReason}`);
    
    // Test with alternative config
    console.log("\n--- Alternative Config Test ---");
    const altResult = (tierlist as any).resultsWithPenaltyToScore(
        testRawStats,
        testDeltaStats,
        testHintDict,
        testWeights,
        testRaceTypes,
        ALTERNATIVE_PENALTY_CONFIG
    );
    
    const altBreakdown = tierlist.getScoreBreakdown(
        testRawStats,
        testDeltaStats,
        testHintDict,
        testWeights,
        testRaceTypes,
        ALTERNATIVE_PENALTY_CONFIG
    );
    
    console.log(`Score: ${altResult}`);
    console.log(`Base Score: ${altBreakdown.baseScore}`);
    console.log(`Stamina Penalty: ${altBreakdown.staminaPenaltyReason}`);
    console.log(`Hints Penalty: ${altBreakdown.usefulHintsPenaltyReason}`);
    console.log(`Stat Overbuilt Penalty: ${altBreakdown.statOverbuiltPenaltyReason}`);
    
    // Verify consistency between methods
    console.log("\n--- Consistency Check ---");
    const scoreFromMethod = defaultResult;
    const scoreFromBreakdown = defaultBreakdown.totalScore;
    const isConsistent = Math.abs(scoreFromMethod - scoreFromBreakdown) < 0.01;
    
    console.log(`Score from resultsWithPenaltyToScore: ${scoreFromMethod}`);
    console.log(`Score from getScoreBreakdown: ${scoreFromBreakdown}`);
    console.log(`Consistent: ${isConsistent ? 'YES' : 'NO'}`);
    
    if (!isConsistent) {
        console.error("❌ CONSISTENCY ERROR: Scores don't match between methods!");
    } else {
        console.log("✅ Consistency verified!");
    }
    
    return {
        defaultScore: defaultResult,
        altScore: altResult,
        consistent: isConsistent,
        breakdown: defaultBreakdown,
    };
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
    testPenaltyConfigConsistency();
}