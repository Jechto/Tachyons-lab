import { SupportCard } from "./SupportCard";
import { DeckEvaluator } from "./DeckEvaluator";
import {
    CardData,
    RaceTypes,
    RunningTypes,
    StatsDict,
    HintResult,
} from "../types/cardTypes";
import { ACTIVE_PENALTY_CONFIG, PenaltyConfig } from "../config/penaltyConfig";
import { TrainingData } from "../config/trainingData";
import { WEIGHTS_CONFIG } from "../config/weightsConfig";

interface TierlistCard {
    id: number;
    chara_id: number;
    card_name: string;
    card_rarity: string;
    limit_break: number;
    card_type: string;
    hints: HintResult;
}

interface TierlistDeck {
    cards: TierlistCard[];
    score: number;
    stats: StatsDict;
    hints?: HintResult;
    scoreBreakdown?: {
        totalScore: number;
        baseScore: number;
        staminaPenalty: number;
        staminaPenaltyReason: string;
        speedPenalty: number;
        speedPenaltyReason: string;
        usefulHintsPenalty: number;
        usefulHintsPenaltyReason: string;
        statOverbuiltPenalty: number;
        statOverbuiltPenaltyReason: string;
        statContributions: Array<{
            stat: string;
            value: number;
            weight: number;
            contribution: number;
        }>;
        activeRaceTypes: string[];
        staminaThreshold: number;
        speedThreshold: number;
    };
}

export interface TierlistEntry {
    id: number;
    chara_id: number;
    card_name: string;
    card_rarity: string;
    limit_break: number;
    card_type: string;
    hints: HintResult;
    hintTypes: string[];
    stats: StatsDict;
    stats_diff_only_added_to_deck: StatsDict;
    score: number;
}

export interface TierlistSuccess {
    tierlist: Record<string, TierlistEntry[]>;
    deck: TierlistDeck;
    inputDeck: {
        cardCount: number;
        raceTypes: RaceTypes;
        runningTypes: RunningTypes;
    };
}

export interface TierlistError {
    success: false;
    error: string;
}

export type TierlistResponse = TierlistSuccess | TierlistError;
export interface LimitBreakFilter {
    R: number[]; // Which limit breaks to include for R cards (0-4)
    SR: number[]; // Which limit breaks to include for SR cards (0-4)
    SSR: number[]; // Which limit breaks to include for SSR cards (0-4)
}

export class Tierlist {
    private static readonly rarityToSymbol: Record<number, string> = {
        1: "R",
        2: "SR",
        3: "SSR",
    };

    public bestCardForDeck(
        deckObject: DeckEvaluator = new DeckEvaluator(),
        raceTypes?: RaceTypes,
        runningTypes?: RunningTypes,
        allData: CardData[] = [],
        filter?: LimitBreakFilter,
        scenarioName: string = "URA",
        optionalRaces: number = 0,
    ): TierlistResponse {
        // Default race types
        if (!raceTypes) {
            raceTypes = {
                Sprint: false,
                Mile: false,
                Medium: true,
                Long: false,
            };
        }

        // Default running types
        if (!runningTypes) {
            runningTypes = {
                "Front Runner": false,
                "Pace Chaser": true,
                "Late Surger": false,
                "End Closer": false,
            };
        }

        if (!filter) {
            filter = {
                R: [0, 4],
                SR: [0, 4],
                SSR: [0, 4],
            };
        }

        let weights: Record<string, number> = {};
        const allWeights = WEIGHTS_CONFIG;

        // Calculate average weights for all selected race types
        const selectedRaceTypes: string[] = [];
        for (const key of ["Long", "Medium", "Mile", "Sprint"] as const) {
            if (raceTypes[key as keyof RaceTypes]) {
                selectedRaceTypes.push(key);
            }
        }

        if (selectedRaceTypes.length > 0) {
            // Initialize weights to zero
            weights = {
                Speed: 0,
                Stamina: 0,
                Power: 0,
                Guts: 0,
                Wit: 0,
                "Skill Points": 0,
                Hints: 0,
            };

            // Sum up weights from all selected race types
            for (const raceType of selectedRaceTypes) {
                const raceWeights = allWeights[raceType as keyof typeof allWeights];
                for (const [stat, weight] of Object.entries(raceWeights)) {
                    weights[stat] = (weights[stat] || 0) + (weight as number);
                }
            }

            // Calculate average by dividing by number of selected race types
            for (const stat in weights) {
                weights[stat] = weights[stat] / selectedRaceTypes.length;
            }
        }

        // Create a deep copy of the deck
        const originalDeck = this.deepCopyDeck(deckObject);
        const baseResultForDeck = deckObject.evaluateStats(scenarioName, 20, optionalRaces);
        
        const emptyDeckEvaluator = new DeckEvaluator();
        if (deckObject.manualDistribution) {
            emptyDeckEvaluator.setManualDistribution(deckObject.manualDistribution);
        }
        // Base result for empty deck should be with 0 optional races to correctly calculate the delta
        const baseResultEmptyDeck = emptyDeckEvaluator.evaluateStats(scenarioName, 20, 0);

        const raceTypesArray = [
            raceTypes.Sprint,
            raceTypes.Mile,
            raceTypes.Medium,
            raceTypes.Long,
        ];

        const runningTypesArray = [
            runningTypes["Front Runner"],
            runningTypes["Pace Chaser"],
            runningTypes["Late Surger"],
            runningTypes["End Closer"],
        ];

        const deck: TierlistDeck = {
            cards: [],
            score: 0,
            stats: {
                Speed: 0,
                Stamina: 0,
                Power: 0,
                Guts: 0,
            },
            scoreBreakdown: {
                totalScore: 0,
                baseScore: 0,
                staminaPenalty: 0,
                staminaPenaltyReason: "",
                speedPenalty: 0,
                speedPenaltyReason: "",
                usefulHintsPenalty: 0,
                usefulHintsPenaltyReason: "",
                statOverbuiltPenalty: 0,
                statOverbuiltPenaltyReason: "",
                statContributions: [],
                activeRaceTypes: [],
                staminaThreshold: 0,
                speedThreshold: 0,
            },
        };

        let hintsForDeck: HintResult = {
            hint_frequency: 0,
            hints_from_events: 0,
            useful_hints_rate: 0,
            "hints from training": 0,
            total_hints: 0,
            gold_skills: [],
        };

        for (const card of originalDeck.deck) {
            if (card) {
                const hintForCard = card.evaluateCardHints(
                    raceTypesArray,
                    runningTypesArray,
                    optionalRaces,
                    {
                        Speed: baseResultForDeck.Speed || 0,
                        Stamina: baseResultForDeck.Stamina || 0,
                        Power: baseResultForDeck.Power || 0,
                        Guts: baseResultForDeck.Guts || 0,
                        Wit: baseResultForDeck.Wit || 0,
                    },
                    {
                        Speed: weights.Speed || 0,
                        Stamina: weights.Stamina || 0,
                        Power: weights.Power || 0,
                        Guts: weights.Guts || 0,
                        Wit: weights.Wit || 0,
                    }
                );
                deck.cards.push({
                    id: card.id,
                    chara_id: card.cardUma.id,
                    card_name: card.cardUma.name,
                    card_rarity:
                        Tierlist.rarityToSymbol[card.rarity] || "Unknown",
                    limit_break: card.limitBreak,
                    card_type: card.cardType.type,
                    hints: hintForCard,
                });
            }

            // This matches the Python bug where these lines are inside the loop
            hintsForDeck = deckObject.evaluateHints(
                raceTypesArray, 
                runningTypesArray, 
                optionalRaces,
                {
                    Speed: baseResultForDeck.Speed || 0,
                    Stamina: baseResultForDeck.Stamina || 0,
                    Power: baseResultForDeck.Power || 0,
                    Guts: baseResultForDeck.Guts || 0,
                    Wit: baseResultForDeck.Wit || 0,
                },
                {
                    Speed: weights.Speed || 0,
                    Stamina: weights.Stamina || 0,
                    Power: weights.Power || 0,
                    Guts: weights.Guts || 0,
                    Wit: weights.Wit || 0,
                }
            );
        }

        // Calculate deck stats delta
        deck.stats = this.calculateStatsDelta(baseResultForDeck, baseResultEmptyDeck);
        deck.hints = hintsForDeck;

        // Calculate deck score using delta stats (consistent with individual card scoring)
        deck.score = this.resultsWithPenaltyToScore(
            baseResultForDeck,
            deck.stats,
            hintsForDeck,
            weights,
            raceTypes,
        );

        // Generate score breakdown for the deck using the delta stats
        deck.scoreBreakdown = this.getScoreBreakdown(
            baseResultForDeck,
            deck.stats,
            hintsForDeck,
            weights,
            raceTypes,
        );

        const results: TierlistEntry[] = [];

        // Iterate through all cards in data
        for (const cardEntry of allData) {
            const cardId = cardEntry.id;
            if (!cardId) continue;

            const charaId = cardEntry.chara_id_card || -1;
            const cardName = cardEntry.card_chara_name || "Unknown";
            const cardRarity =
                Tierlist.rarityToSymbol[cardEntry.rarity || -1] || "Unknown";
            let cardType = cardEntry.prefered_type || "Unknown";
            cardType = cardType === "Intelligence" ? "Wit" : cardType;

            // Get the allowed limit breaks for this rarity
            const allowedLimitBreaks =
                filter[cardRarity as keyof LimitBreakFilter] || [];

            for (let limitBreak = 0; limitBreak < 5; limitBreak++) {
                // Skip this limit break if it's not in the filter
                if (!allowedLimitBreaks.includes(limitBreak)) {
                    continue;
                }
                try {
                    const card = new SupportCard(cardId, limitBreak, allData);
                    const tempDeck = deckObject
                        ? this.deepCopyDeck(deckObject)
                        : new DeckEvaluator();
                    tempDeck.addCard(card);

                    const result = tempDeck.evaluateStats(scenarioName, 20, optionalRaces);
                    const cardHints = card.evaluateCardHints(
                        raceTypesArray,
                        runningTypesArray,
                        optionalRaces,
                        {
                            Speed: result.Speed || 0,
                            Stamina: result.Stamina || 0,
                            Power: result.Power || 0,
                            Guts: result.Guts || 0,
                            Wit: result.Wit || 0,
                        },
                        {
                            Speed: weights.Speed || 0,
                            Stamina: weights.Stamina || 0,
                            Power: weights.Power || 0,
                            Guts: weights.Guts || 0,
                            Wit: weights.Wit || 0,
                        }
                    );
                    const deckHints = tempDeck.evaluateHints(
                        raceTypesArray,
                        runningTypesArray,
                        optionalRaces,
                        {
                            Speed: result.Speed || 0,
                            Stamina: result.Stamina || 0,
                            Power: result.Power || 0,
                            Guts: result.Guts || 0,
                            Wit: result.Wit || 0,
                        },
                        {
                            Speed: weights.Speed || 0,
                            Stamina: weights.Stamina || 0,
                            Power: weights.Power || 0,
                            Guts: weights.Guts || 0,
                            Wit: weights.Wit || 0,
                        }
                    );

                    // Calculate delta from empty deck (consistent with deck.score calculation)
                    const deltaStat = this.calculateStatsDelta(result, baseResultEmptyDeck);
                    const deltaCardStat = this.calculateStatsDelta(result, baseResultForDeck);
                    // Calculate what the new deck's total score would be with this card added
                    const newDeckScore = this.resultsWithPenaltyToScore(
                        result, // total stats of deck + this card
                        deltaStat, // delta from empty deck (consistent with deck.score)
                        deckHints, // hints of deck + this card
                        weights,
                        raceTypes,
                    );

                    // The card's actual impact is the difference between new deck score and current deck score
                    const currentDeckScore = deck.score;
                    const cardImpact = newDeckScore - currentDeckScore;



                    // Extract hint types for this card
                    const cardInstance = new SupportCard(cardId, limitBreak, allData);
                    const hintTypes = cardInstance.extractHintTypes();

                    results.push({
                        id: cardId,
                        chara_id: charaId,
                        card_name: cardName,
                        card_rarity: cardRarity,
                        limit_break: limitBreak,
                        card_type: cardType,
                        hints: cardHints,
                        hintTypes: hintTypes,
                        stats: deltaStat,
                        stats_diff_only_added_to_deck: deltaCardStat,
                        score: cardImpact,
                    });
                } catch (error) {
                    // Skip cards that can't be instantiated
                    console.warn(
                        `Failed to create card ${cardId} at ${limitBreak}lb:`,
                        error,
                    );
                    continue;
                }
            }
        }

        // Group and sort results by card_type
        const grouped: Record<string, TierlistEntry[]> = {};
        for (const entry of results) {
            if (!grouped[entry.card_type]) {
                grouped[entry.card_type] = [];
            }
            grouped[entry.card_type].push(entry);
        }

        const response: Record<string, TierlistEntry[]> = {};
        for (const [cardType, entries] of Object.entries(grouped)) {
            response[cardType] = entries.sort((a, b) => b.score - a.score);
        }

        return {
            tierlist: response,
            deck: deck,
            inputDeck: {
                cardCount: originalDeck.deck.length,
                raceTypes: raceTypes,
                runningTypes: runningTypes,
            },
        };
    }

    private resultsToScore(
        resultDict: StatsDict,
        hintDict: HintResult,
        weights: Record<string, number>,
    ): number {
        // TODO: Add more sophisticated scoring // use hint_dict
        if (!weights || Object.keys(weights).length === 0) {
            weights = {
                Speed: 1.0,
                Stamina: 1.0,
                Power: 1.0,
                Guts: 1.0,
                Wit: 1.0,
                "Skill Points": 0.2,
                Hints: 4.0,
            };
        }

        const weightsCopy = { ...weights };

        let score = 0;
        // Score regular stats
        for (const [k, v] of Object.entries(resultDict)) {
            const weight = weightsCopy[k] || 0;
            score += v * weight;
        }

        // Add hints contribution using direct weight, multiplied by useful hints rate
        const totalHints = hintDict.total_hints || 0;
        const usefulHintsRate = hintDict.useful_hints_rate || 0;
        const hintsWeight = weightsCopy["Hints"] || 4.0;
        score += totalHints * usefulHintsRate * hintsWeight;

        // Add gold skills contribution
        const goldSkills = hintDict.gold_skills || [];
        const goldSkillWeight = weightsCopy["Gold Skills"] || 1.0;
        for (const goldSkill of goldSkills) {
            score += goldSkill.value * goldSkill.multiplier * goldSkillWeight;
        }

        return score;
    }

    private resultsWithPenaltyToScore(
        rawStats: StatsDict,
        deltaStats: StatsDict,
        hintDict: HintResult,
        weights: Record<string, number>,
        raceTypes?: RaceTypes,
        penaltyConfig: PenaltyConfig = ACTIVE_PENALTY_CONFIG,
    ): number {
        // Clamp stats to max values before calculating score
        const maxStats = TrainingData.getMaxStats("URA"); // Assuming URA for now, or pass scenario
        
        const clampedRawStats = { ...rawStats };
        const clampedDeltaStats = { ...deltaStats };

        // Apply clamping
        for (const stat of ["Speed", "Stamina", "Power", "Guts", "Wit"] as const) {
            const statKey = stat === "Wit" ? "Intelligence" : stat;
            const maxVal = maxStats[statKey] || 1200;
            const currentVal = rawStats[stat] || 0;
            
            if (currentVal > maxVal) {
                clampedRawStats[stat] = maxVal;
                // Adjust delta: newDelta = clampedTotal - base
                // base = currentTotal - currentDelta
                const baseVal = currentVal - (deltaStats[stat] || 0);
                clampedDeltaStats[stat] = maxVal - baseVal;
            }
        }

        // Get base score from clamped delta stats
        const baseScore = this.resultsToScore(clampedDeltaStats, hintDict, weights);

        // Calculate stamina penalty based on raw stats (using original raw stats for penalties?)
        // User said "1310 speed would be rounded down to 1200 when calculated"
        // But penalties usually apply to meeting thresholds.
        // If I have 1310 speed, I definitely meet the 1200 threshold.
        // So using rawStats for threshold checks is correct.

        let staminaPenaltyPercent = 0; // Penalty as percentage (0.2 = 20%)
        let speedPenaltyPercent = 0; // Penalty as percentage

        if (raceTypes) {
            const stamina = rawStats.Stamina || 0;
            const speed = rawStats.Speed || 0;

            // Determine the active race types
            const activeRaceTypes = Object.entries(raceTypes)
                .filter(([_, isActive]) => isActive)
                .map(([raceType, _]) => raceType);

            if (activeRaceTypes.length > 0) {
                // Use stamina thresholds from config
                const staminaThresholds = penaltyConfig.stamina.thresholds;
                const speedThresholds = penaltyConfig.speed.thresholds;

                // Use the highest threshold among active race types (most demanding)
                const maxStaminaThreshold = Math.max(
                    ...activeRaceTypes.map(
                        (raceType) => staminaThresholds[raceType] || 400,
                    ),
                );

                const maxSpeedThreshold = Math.max(
                    ...activeRaceTypes.map(
                        (raceType) => speedThresholds[raceType] || 1200,
                    ),
                );

                if (stamina < maxStaminaThreshold - penaltyConfig.stamina.penalties.buffer) {
                    staminaPenaltyPercent = penaltyConfig.stamina.penalties.major;
                } else if (stamina < maxStaminaThreshold) {
                    staminaPenaltyPercent = penaltyConfig.stamina.penalties.minor;
                }

                if (speed < maxSpeedThreshold - penaltyConfig.speed.penalties.buffer) {
                    speedPenaltyPercent = penaltyConfig.speed.penalties.major;
                } else if (speed < maxSpeedThreshold) {
                    speedPenaltyPercent = penaltyConfig.speed.penalties.minor;
                }
            }
        }

        // Useful hints penalty removed - now using useful hints count directly in score

        // Stat overbuilt penalty removed as requested

        // Apply additive penalties (like taxes)
        const totalPenaltyPercent =
            staminaPenaltyPercent + speedPenaltyPercent;
        const finalMultiplier = 1.0 - totalPenaltyPercent;

        const finalScore = baseScore * finalMultiplier;

        return finalScore;
    }

    public getScoreBreakdown(
        rawStats: StatsDict,
        deltaStats: StatsDict,
        hintDict: HintResult,
        weights: Record<string, number>,
        raceTypes?: RaceTypes,
        penaltyConfig: PenaltyConfig = ACTIVE_PENALTY_CONFIG,
    ): {
        totalScore: number;
        baseScore: number;
        staminaPenalty: number;
        staminaPenaltyReason: string;
        speedPenalty: number;
        speedPenaltyReason: string;
        usefulHintsPenalty: number;
        usefulHintsPenaltyReason: string;
        statOverbuiltPenalty: number;
        statOverbuiltPenaltyReason: string;
        statContributions: Array<{
            stat: string;
            value: number;
            weight: number;
            contribution: number;
        }>;
        activeRaceTypes: string[];
        staminaThreshold: number;
        speedThreshold: number;
    } {
        // TODO: Add more sophisticated scoring // use hint_dict
        if (!weights || Object.keys(weights).length === 0) {
            weights = {
                Speed: 1.0,
                Stamina: 1.0,
                Power: 1.0,
                Guts: 1.0,
                Wit: 1.0,
                "Skill Points": 0.2,
                Hints: 4.0,
            };
        }

        // Clamp stats to max values before calculating score
        const maxStats = TrainingData.getMaxStats("URA"); // Assuming URA for now
        
        const clampedDeltaStats = { ...deltaStats };

        // Apply clamping to delta stats for breakdown
        for (const stat of ["Speed", "Stamina", "Power", "Guts", "Wit"] as const) {
            const statKey = stat === "Wit" ? "Intelligence" : stat;
            const maxVal = maxStats[statKey] || 1200;
            const currentVal = rawStats[stat] || 0;
            
            if (currentVal > maxVal) {
                // Adjust delta: newDelta = clampedTotal - base
                // base = currentTotal - currentDelta
                const baseVal = currentVal - (deltaStats[stat] || 0);
                clampedDeltaStats[stat] = maxVal - baseVal;
            }
        }

        // Calculate base score using clamped delta stats
        const baseScore = this.resultsToScore(clampedDeltaStats, hintDict, weights);

        // Calculate stat contributions from clamped delta stats
        const statContributions = [];
        for (const [k, v] of Object.entries(clampedDeltaStats)) {
            const weight = weights[k] || 0;
            const contribution = v * weight;
            statContributions.push({
                stat: k,
                value: v,
                weight: weight,
                contribution: contribution,
            });
        }

        // Add hints contribution to stat contributions, multiplied by useful hints rate
        const totalHints = hintDict.total_hints || 0;
        const usefulHintsRate = hintDict.useful_hints_rate || 0;
        const usefulHintsCount = totalHints * usefulHintsRate;
        const hintsWeight = weights["Hints"] || 4.0;
        const hintsContribution = usefulHintsCount * hintsWeight;
        statContributions.push({
            stat: "Useful Hints",
            value: usefulHintsCount,
            weight: hintsWeight,
            contribution: hintsContribution,
        });

        // Add each gold skill as a separate line item
        const goldSkills = hintDict.gold_skills || [];
        const goldSkillWeight = weights["Gold Skills"] || 1.0;
        
        for (const goldSkill of goldSkills) {
            const skillContribution = goldSkill.value * goldSkill.multiplier * goldSkillWeight;
            statContributions.push({
                stat: goldSkill.name,
                value: goldSkill.value * goldSkill.multiplier,
                weight: goldSkillWeight,
                contribution: skillContribution,
            });
        }

        // Calculate stamina penalty details using raw stats
        const stamina = rawStats.Stamina || 0;
        let staminaPenalty = 1.0;
        let staminaPenaltyPercent = 0;
        let staminaPenaltyReason = "No penalty applied";
        
        // Calculate speed penalty details using raw stats
        const speed = rawStats.Speed || 0;
        let speedPenalty = 1.0;
        let speedPenaltyPercent = 0;
        let speedPenaltyReason = "No penalty applied";

        let activeRaceTypes: string[] = [];
        let staminaThreshold = 400;
        let speedThreshold = 1200;

        if (raceTypes) {
            activeRaceTypes = Object.entries(raceTypes)
                .filter(([_, isActive]) => isActive)
                .map(([raceType, _]) => raceType);

            if (activeRaceTypes.length > 0) {
                const staminaThresholds = penaltyConfig.stamina.thresholds;
                const speedThresholds = penaltyConfig.speed.thresholds;

                staminaThreshold = Math.max(
                    ...activeRaceTypes.map(
                        (raceType) => staminaThresholds[raceType] || 400,
                    ),
                );

                speedThreshold = Math.max(
                    ...activeRaceTypes.map(
                        (raceType) => speedThresholds[raceType] || 1200,
                    ),
                );

                if (stamina < staminaThreshold - penaltyConfig.stamina.penalties.buffer) {
                    staminaPenaltyPercent = penaltyConfig.stamina.penalties.major;
                    staminaPenalty = 1 - staminaPenaltyPercent;
                    staminaPenaltyReason = `${Math.round(staminaPenaltyPercent * 100)}% penalty: Stamina ${Math.round(stamina)} is significantly below threshold ${staminaThreshold} for ${activeRaceTypes.join(", ")}`;
                } else if (stamina < staminaThreshold) {
                    staminaPenaltyPercent = penaltyConfig.stamina.penalties.minor;
                    staminaPenalty = 1 - staminaPenaltyPercent;
                    staminaPenaltyReason = `${Math.round(staminaPenaltyPercent * 100)}% penalty: Stamina ${Math.round(stamina)} is below threshold ${staminaThreshold} for ${activeRaceTypes.join(", ")}`;
                } else {
                    staminaPenaltyReason = `No penalty: Stamina ${Math.round(stamina)} meets threshold ${staminaThreshold} for ${activeRaceTypes.join(", ")}`;
                }

                if (speed < speedThreshold - penaltyConfig.speed.penalties.buffer) {
                    speedPenaltyPercent = penaltyConfig.speed.penalties.major;
                    speedPenalty = 1 - speedPenaltyPercent;
                    speedPenaltyReason = `${Math.round(speedPenaltyPercent * 100)}% penalty: Speed ${Math.round(speed)} is significantly below threshold ${speedThreshold} for ${activeRaceTypes.join(", ")}`;
                } else if (speed < speedThreshold) {
                    speedPenaltyPercent = penaltyConfig.speed.penalties.minor;
                    speedPenalty = 1 - speedPenaltyPercent;
                    speedPenaltyReason = `${Math.round(speedPenaltyPercent * 100)}% penalty: Speed ${Math.round(speed)} is below threshold ${speedThreshold} for ${activeRaceTypes.join(", ")}`;
                } else {
                    speedPenaltyReason = `No penalty: Speed ${Math.round(speed)} meets threshold ${speedThreshold} for ${activeRaceTypes.join(", ")}`;
                }
            }
        }

        // Useful hints penalty removed - now using useful hints count directly in score
        const usefulHintsPenalty = 1.0;
        const usefulHintsPenaltyPercent = 0;
        const usefulHintsPenaltyReason = `No penalty: Using useful hints count (${Math.round(usefulHintsRate * 100)}% of total hints)`;

        // Stat overbuilt penalty removed
        const statOverbuiltPenalty = 1.0;
        const statOverbuiltPenaltyReason = "No penalty: Overbuilt penalty disabled";
        const statOverbuiltPenaltyPercent = 0;

        // Apply additive penalties (like taxes)
        const totalPenaltyPercent =
            staminaPenaltyPercent + speedPenaltyPercent + statOverbuiltPenaltyPercent;
        const finalMultiplier = 1.0 - totalPenaltyPercent;
        const totalScore = baseScore * finalMultiplier;

        return {
            totalScore,
            baseScore,
            staminaPenalty,
            staminaPenaltyReason,
            speedPenalty,
            speedPenaltyReason,
            usefulHintsPenalty,
            usefulHintsPenaltyReason,
            statOverbuiltPenalty,
            statOverbuiltPenaltyReason,
            statContributions: statContributions.sort(
                (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
            ),
            activeRaceTypes,
            staminaThreshold,
            speedThreshold,
        };
    }
    private calculateStatsDelta(stats1: StatsDict, stats2: StatsDict): StatsDict {
        const result: StatsDict = {
            Speed: (stats1.Speed || 0) - (stats2.Speed || 0),
            Stamina: (stats1.Stamina || 0) - (stats2.Stamina || 0),
            Power: (stats1.Power || 0) - (stats2.Power || 0),
            Guts: (stats1.Guts || 0) - (stats2.Guts || 0),
        };

        // Handle optional properties - butnp,it and Skill Points since they're commonly used
        if (stats1.Intelligence !== undefined || stats2.Intelligence !== undefined) {
            result.Intelligence = (stats1.Intelligence || 0) - (stats2.Intelligence || 0);
        }
        
        // Always include Wit and Skill Points as they're part of the standard calculations
        result.Wit = (stats1.Wit || 0) - (stats2.Wit || 0);
        result["Skill Points"] = (stats1["Skill Points"] || 0) - (stats2["Skill Points"] || 0);
        
        if (stats1.Energy !== undefined || stats2.Energy !== undefined) {
            result.Energy = (stats1.Energy || 0) - (stats2.Energy || 0);
        }
        if (stats1.Potential !== undefined || stats2.Potential !== undefined) {
            result.Potential = (stats1.Potential || 0) - (stats2.Potential || 0);
        }
        if (stats1.Bond !== undefined || stats2.Bond !== undefined) {
            result.Bond = (stats1.Bond || 0) - (stats2.Bond || 0);
        }
        if (stats1["Skill Hint"] !== undefined || stats2["Skill Hint"] !== undefined) {
            result["Skill Hint"] = (stats1["Skill Hint"] || 0) - (stats2["Skill Hint"] || 0);
        }

        return result;
    }
    private deepCopyDeck(deck: DeckEvaluator): DeckEvaluator {
        const newDeck = new DeckEvaluator();
        // Note: This is a shallow copy of cards. For a true deep copy,
        // you might need to recreate the SupportCard objects as well.
        newDeck.deck = [...deck.deck];
        if (deck.manualDistribution) {
            newDeck.setManualDistribution([...deck.manualDistribution]);
        }
        return newDeck;
    }
}
