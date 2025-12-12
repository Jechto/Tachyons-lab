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

interface TierlistCard {
    id: number;
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
    hints?: Record<string, number>;
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
        const allWeights = {
            Sprint: {
                Speed: 1.75,
                Stamina: 0.25,
                Power: 1.75,
                Guts: 0.25,
                Wit: 1,
                "Skill Points": 0.4, 
                Hints: 7.5, // Hint is equal to 6 speed+ 2 Power points
            },
            Mile: {
                Speed: 1.5,
                Stamina: 0.75,
                Power: 1.25,
                Guts: 0.5,
                Wit: 1,
                "Skill Points": 0.4,
                Hints: 7.5, // Hint is equal to 6 speed+ 2 Power points
            },
            Medium: {
                Speed: 1.5,
                Stamina: 1.0,
                Power: 1.0,
                Guts: 0.75,
                Wit: 0.75,
                "Skill Points": 0.4,
                Hints: 7.5, // Hint is equal to 6 speed+ 2 Power points
            },
            Long: {
                Speed: 1,
                Stamina: 1.5,
                Power: 0.5,
                Guts: 1.25,
                Wit: 0.75,
                "Skill Points": 0.4,
                Hints: 7.5, // Hint is equal to 6 speed+ 2 Power points
            },
        };

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
        const baseResultForDeck = deckObject.evaluateStats(scenarioName);
        
        const emptyDeckEvaluator = new DeckEvaluator();
        if (deckObject.manualDistribution) {
            emptyDeckEvaluator.setManualDistribution(deckObject.manualDistribution);
        }
        const baseResultEmptyDeck = emptyDeckEvaluator.evaluateStats(scenarioName);

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
        };

        let hintsForDeck: Record<string, number> = {};

        for (const card of originalDeck.deck) {
            if (card) {
                const hintForCard = card.evaluateCardHints(
                    raceTypesArray,
                    runningTypesArray,
                );
                deck.cards.push({
                    id: card.id,
                    card_name: card.cardUma.name,
                    card_rarity:
                        Tierlist.rarityToSymbol[card.rarity] || "Unknown",
                    limit_break: card.limitBreak,
                    card_type: card.cardType.type,
                    hints: hintForCard,
                });
            }

            // This matches the Python bug where these lines are inside the loop
            hintsForDeck = deckObject.evaluateHints();
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

                    const result = tempDeck.evaluateStats(scenarioName);
                    const cardHints = card.evaluateCardHints(
                        raceTypesArray,
                        runningTypesArray,
                    );
                    const deckHints = tempDeck.evaluateHints();

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
        hintDict: Record<string, number>,
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

        // Add hints contribution using direct weight
        const totalHints = hintDict.total_hints || 0;
        const hintsWeight = weightsCopy["Hints"] || 4.0;
        score += totalHints * hintsWeight;

        return score;
    }

    private resultsWithPenaltyToScore(
        rawStats: StatsDict,
        deltaStats: StatsDict,
        hintDict: Record<string, number>,
        weights: Record<string, number>,
        raceTypes?: RaceTypes,
        penaltyConfig: PenaltyConfig = ACTIVE_PENALTY_CONFIG,
    ): number {
        // Get base score from delta stats
        const baseScore = this.resultsToScore(deltaStats, hintDict, weights);

        // Calculate stamina penalty based on raw stats
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

        // Calculate useful hints rate penalty
        let usefulHintsPenaltyPercent = 0; // Penalty as percentage
        const usefulHintsRate = hintDict.useful_hints_rate || 0;

        if (usefulHintsRate < penaltyConfig.hints.thresholds.major) {
            usefulHintsPenaltyPercent = penaltyConfig.hints.penalties.major;
        } else if (usefulHintsRate < penaltyConfig.hints.thresholds.minor) {
            usefulHintsPenaltyPercent = penaltyConfig.hints.penalties.minor;
        }

        // Calculate stat overbuilt penalty
        let statOverbuiltPenaltyPercent = 0; // Penalty as percentage
        
        // Check each stat for being overbuilt
        for (const [statName, value] of Object.entries(rawStats)) {
            if (typeof value === 'number' && value > penaltyConfig.statOverbuilt.threshold) {
                const excessPoints = value - penaltyConfig.statOverbuilt.threshold;
                const excessIncrements = Math.floor(excessPoints / penaltyConfig.statOverbuilt.incrementSize);
                
                // Base penalty + additional penalty per increment, max cap
                const statPenalty = Math.min(
                    penaltyConfig.statOverbuilt.basePenalty + (excessIncrements * penaltyConfig.statOverbuilt.incrementPenalty), 
                    penaltyConfig.statOverbuilt.maxPenalty
                );
                
                // Take the highest penalty among all overbuilt stats
                statOverbuiltPenaltyPercent = Math.max(statOverbuiltPenaltyPercent, statPenalty);
            }
        }

        // Apply additive penalties (like taxes)
        const totalPenaltyPercent =
            staminaPenaltyPercent + speedPenaltyPercent + usefulHintsPenaltyPercent + statOverbuiltPenaltyPercent;
        const finalMultiplier = 1.0 - totalPenaltyPercent;

        const finalScore = baseScore * finalMultiplier;

        return finalScore;
    }

    public getScoreBreakdown(
        rawStats: StatsDict,
        deltaStats: StatsDict,
        hintDict: Record<string, number>,
        weights: Record<string, number>,
        raceTypes?: RaceTypes,
        penaltyConfig: PenaltyConfig = ACTIVE_PENALTY_CONFIG,
    ): {
        totalScore: number;
        baseScore: number;
        staminaPenalty: number;
        staminaPenaltyReason: string;
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

        // Calculate base score using delta stats
        const baseScore = this.resultsToScore(deltaStats, hintDict, weights);

        // Calculate stat contributions from delta stats
        const statContributions = [];
        for (const [k, v] of Object.entries(deltaStats)) {
            const weight = weights[k] || 0;
            const contribution = v * weight;
            statContributions.push({
                stat: k,
                value: v,
                weight: weight,
                contribution: contribution,
            });
        }

        // Add hints contribution to stat contributions
        const totalHints = hintDict.total_hints || 0;
        const hintsWeight = weights["Hints"] || 4.0;
        const hintsContribution = totalHints * hintsWeight;
        statContributions.push({
            stat: "Hints",
            value: totalHints,
            weight: hintsWeight,
            contribution: hintsContribution,
        });

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

        // Calculate useful hints rate penalty details
        let usefulHintsPenalty = 1.0;
        let usefulHintsPenaltyPercent = 0;
        let usefulHintsPenaltyReason = "No penalty applied";
        const usefulHintsRate = hintDict.useful_hints_rate || 0;

        if (usefulHintsRate < penaltyConfig.hints.thresholds.major) {
            usefulHintsPenaltyPercent = penaltyConfig.hints.penalties.major;
            usefulHintsPenalty = 1 - usefulHintsPenaltyPercent;
            usefulHintsPenaltyReason = `${Math.round(usefulHintsPenaltyPercent * 100)}% penalty: Useful hints rate ${Math.round(usefulHintsRate * 100)}% is below ${Math.round(penaltyConfig.hints.thresholds.major * 100)}%`;
        } else if (usefulHintsRate < penaltyConfig.hints.thresholds.minor) {
            usefulHintsPenaltyPercent = penaltyConfig.hints.penalties.minor;
            usefulHintsPenalty = 1 - usefulHintsPenaltyPercent;
            usefulHintsPenaltyReason = `${Math.round(usefulHintsPenaltyPercent * 100)}% penalty: Useful hints rate ${Math.round(usefulHintsRate * 100)}% is below ${Math.round(penaltyConfig.hints.thresholds.minor * 100)}%`;
        } else {
            usefulHintsPenaltyReason = `No penalty: Useful hints rate ${Math.round(usefulHintsRate * 100)}% meets threshold`;
        }

        // Calculate stat overbuilt penalty details
        let statOverbuiltPenalty = 1.0;
        let statOverbuiltPenaltyPercent = 0;
        let statOverbuiltPenaltyReason = "No penalty applied";
        const overbuiltStats: string[] = [];
        let maxOverbuiltPenalty = 0;

        // Check each stat for being overbuilt
        for (const [statName, value] of Object.entries(rawStats)) {
            if (typeof value === 'number' && value > penaltyConfig.statOverbuilt.threshold) {
                const excessPoints = value - penaltyConfig.statOverbuilt.threshold;
                const excessIncrements = Math.floor(excessPoints / penaltyConfig.statOverbuilt.incrementSize);
                
                // Base penalty + additional penalty per increment, max cap
                const statPenalty = Math.min(
                    penaltyConfig.statOverbuilt.basePenalty + (excessIncrements * penaltyConfig.statOverbuilt.incrementPenalty), 
                    penaltyConfig.statOverbuilt.maxPenalty
                );
                
                overbuiltStats.push(`${statName}: ${Math.round(value)} (${Math.round(statPenalty * 100)}% penalty)`);
                
                // Take the highest penalty among all overbuilt stats
                if (statPenalty > maxOverbuiltPenalty) {
                    maxOverbuiltPenalty = statPenalty;
                }
            }
        }

        if (maxOverbuiltPenalty > 0) {
            statOverbuiltPenaltyPercent = maxOverbuiltPenalty;
            statOverbuiltPenalty = 1.0 - maxOverbuiltPenalty;
            statOverbuiltPenaltyReason = `${Math.round(maxOverbuiltPenalty * 100)}% penalty: Overbuilt stats - ${overbuiltStats.join(", ")}`;
        } else {
            statOverbuiltPenaltyReason = `No penalty: All stats below ${penaltyConfig.statOverbuilt.threshold} threshold`;
        }

        // Apply additive penalties (like taxes)
        const totalPenaltyPercent =
            staminaPenaltyPercent + speedPenaltyPercent + usefulHintsPenaltyPercent + statOverbuiltPenaltyPercent;
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
