import { SupportCard } from "./SupportCard";
import { DeckEvaluator } from "./DeckEvaluator";
import {
    CardData,
    RaceTypes,
    RunningTypes,
    StatsDict,
} from "../types/cardTypes";

interface TierlistCard {
    id: number;
    card_name: string;
    card_rarity: string;
    limit_break: number;
    card_type: string;
    hints: any;
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
        statContributions: Array<{
            stat: string;
            value: number;
            weight: number;
            contribution: number;
        }>;
        activeRaceTypes: string[];
        staminaThreshold: number;
    };
}

interface TierlistEntry {
    id: number;
    card_name: string;
    card_rarity: string;
    limit_break: number;
    card_type: string;
    hints: any;
    stats: StatsDict;
    score: number;
}

interface TierlistResponse {
    tierlist: Record<string, TierlistEntry[]>;
    deck: TierlistDeck;
    inputDeck: {
        cardCount: number;
        raceTypes: RaceTypes;
        runningTypes: RunningTypes;
    };
}

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

        console.log(raceTypes);

        let weights: Record<string, number> = {};
        const allWeights = {
            Sprint: {
                Speed: 2.25,
                Stamina: 0.5,
                Power: 1,
                Guts: 0.5,
                Wit: 0.75,
                "Skill Points": 0.2,
            },
            Mile: {
                Speed: 2,
                Stamina: 0.75,
                Power: 1.0,
                Guts: 0.5,
                Wit: 0.75,
                "Skill Points": 0.2,
            },
            Medium: {
                Speed: 1.5,
                Stamina: 1.25,
                Power: 1.0,
                Guts: 0.5,
                Wit: 0.75,
                "Skill Points": 0.2,
            },
            Long: {
                Speed: 1,
                Stamina: 1.75,
                Power: 1,
                Guts: 0.5,
                Wit: 0.75,
                "Skill Points": 0.2,
            },
        };

        // Calculate average weights for all selected race types
        const selectedRaceTypes = [];
        for (const key of ["Long", "Medium", "Mile", "Sprint"]) {
            if ((raceTypes as any)[key]) {
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
            };

            // Sum up weights from all selected race types
            for (const raceType of selectedRaceTypes) {
                const raceWeights = (allWeights as any)[raceType];
                for (const [stat, weight] of Object.entries(raceWeights)) {
                    weights[stat] = (weights[stat] || 0) + (weight as number);
                }
            }

            // Calculate average by dividing by number of selected race types
            for (const stat in weights) {
                weights[stat] = weights[stat] / selectedRaceTypes.length;
            }

            console.log(
                `Using average weights for ${selectedRaceTypes.join(", ")}:`,
                weights,
            );
        }

        // Create a deep copy of the deck
        const originalDeck = this.deepCopyDeck(deckObject);
        const baseResultForDeck = deckObject.evaluateStats();
        const baseResultEmptyDeck = new DeckEvaluator().evaluateStats();

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
        deck.stats = {
            Speed: 0,
            Stamina: 0,
            Power: 0,
            Guts: 0,
        };
        for (const k of Object.keys(baseResultForDeck)) {
            (deck.stats as any)[k] =
                (baseResultForDeck as any)[k] - (baseResultEmptyDeck as any)[k];
        }
        deck.hints = hintsForDeck;

        // Calculate deck score using delta stats (consistent with individual card scoring)
        deck.score = this.resultsToScore(
            deck.stats,
            hintsForDeck,
            weights,
            raceTypes,
        );

        // Generate score breakdown for the deck using the delta stats
        deck.scoreBreakdown = this.getScoreBreakdown(
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

                    const result = tempDeck.evaluateStats();
                    const cardHints = card.evaluateCardHints(
                        raceTypesArray,
                        runningTypesArray,
                    );
                    const deckHints = tempDeck.evaluateHints();

                    const deltaStat: any = {};
                    const baseDeckStats = deckObject
                        ? baseResultForDeck
                        : baseResultEmptyDeck;
                    for (const k of Object.keys(result)) {
                        deltaStat[k] =
                            (result as any)[k] - (baseDeckStats as any)[k];
                    }

                    const score = this.resultsToScore(
                        deltaStat,
                        deckHints,
                        weights,
                        raceTypes,
                    );

                    results.push({
                        id: cardId,
                        card_name: cardName,
                        card_rarity: cardRarity,
                        limit_break: limitBreak,
                        card_type: cardType,
                        hints: cardHints,
                        stats: deltaStat,
                        score: score,
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
        raceTypes?: RaceTypes,
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
            };
        }

        const weightsCopy = { ...weights };

        let score = 0;
        for (const [k, v] of Object.entries(resultDict)) {
            const weight = weightsCopy[k] || 0;
            score += v * weight;
        }

        // Apply stamina penalty based on race type focus
        const stamina = resultDict.Stamina || 0;
        let staminaPenalty = 1.0; // No penalty by default

        if (raceTypes) {
            // Determine the dominant race type from the actual raceTypes object
            const activeRaceTypes = Object.entries(raceTypes)
                .filter(([_, isActive]) => isActive)
                .map(([raceType, _]) => raceType);

            if (activeRaceTypes.length > 0) {
                // Set stamina thresholds based on race types
                const staminaThresholds: Record<string, number> = {
                    Sprint: 100,
                    Mile: 300,
                    Medium: 400,
                    Long: 700,
                };

                // Use the highest threshold among active race types (most demanding)
                const maxThreshold = Math.max(
                    ...activeRaceTypes.map(raceType => staminaThresholds[raceType] || 400)
                );

                if (stamina < maxThreshold - 100) {
                    staminaPenalty = 0.8; // 20% penalty
                } else if (stamina < maxThreshold) {
                    staminaPenalty = 0.9; // 10% penalty
                }
            }
        }

        return score * staminaPenalty;
    }

    public getScoreBreakdown(
        resultDict: StatsDict,
        hintDict: Record<string, number>,
        weights: Record<string, number>,
        raceTypes?: RaceTypes,
    ): {
        totalScore: number;
        baseScore: number;
        staminaPenalty: number;
        staminaPenaltyReason: string;
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
            };
        }

        const weightsCopy = { ...weights };

        // Calculate stat contributions
        const statContributions = [];
        let baseScore = 0;
        for (const [k, v] of Object.entries(resultDict)) {
            const weight = weightsCopy[k] || 0;
            const contribution = v * weight;
            baseScore += contribution;
            statContributions.push({
                stat: k,
                value: v,
                weight: weight,
                contribution: contribution,
            });
        }

        // Calculate stamina penalty details
        const stamina = resultDict.Stamina || 0;
        let staminaPenalty = 1.0;
        let staminaPenaltyReason = "No penalty applied";
        let activeRaceTypes: string[] = [];
        let staminaThreshold = 400;

        if (raceTypes) {
            activeRaceTypes = Object.entries(raceTypes)
                .filter(([_, isActive]) => isActive)
                .map(([raceType, _]) => raceType);

            if (activeRaceTypes.length > 0) {
                const staminaThresholds: Record<string, number> = {
                    Sprint: 100,
                    Mile: 300,
                    Medium: 400,
                    Long: 700,
                };

                staminaThreshold = Math.max(
                    ...activeRaceTypes.map(raceType => staminaThresholds[raceType] || 400)
                );

                if (stamina < staminaThreshold - 100) {
                    staminaPenalty = 0.8;
                    staminaPenaltyReason = `20% penalty: Stamina ${stamina} is significantly below threshold ${staminaThreshold} for ${activeRaceTypes.join(", ")}`;
                } else if (stamina < staminaThreshold) {
                    staminaPenalty = 0.9;
                    staminaPenaltyReason = `10% penalty: Stamina ${stamina} is below threshold ${staminaThreshold} for ${activeRaceTypes.join(", ")}`;
                } else {
                    staminaPenaltyReason = `No penalty: Stamina ${stamina} meets threshold ${staminaThreshold} for ${activeRaceTypes.join(", ")}`;
                }
            }
        }

        const totalScore = baseScore * staminaPenalty;

        return {
            totalScore,
            baseScore,
            staminaPenalty,
            staminaPenaltyReason,
            statContributions: statContributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
            activeRaceTypes,
            staminaThreshold,
        };
    }

    private deepCopyDeck(deck: DeckEvaluator): DeckEvaluator {
        const newDeck = new DeckEvaluator();
        // Note: This is a shallow copy of cards. For a true deep copy,
        // you might need to recreate the SupportCard objects as well.
        newDeck.deck = [...deck.deck];
        return newDeck;
    }
}
