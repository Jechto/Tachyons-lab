import { SupportCard } from "./SupportCard";
import { TrainingData } from "../utils/trainingData";
import { StatsDict, HintResult } from "../types/cardTypes";

export class DeckEvaluator {
    private static readonly typeToIndex: Record<string, number> = {
        Speed: 0,
        Stamina: 1,
        Power: 2,
        Guts: 3,
        Intelligence: 4,
    };

    public deck: SupportCard[] = [];

    constructor() {
        this.deck = [];
    }

    public addCard(card: SupportCard): void {
        this.deck.push(card);
    }

    public getTrainingDistribution(): number[] {
        // Start with base equal distribution
        const trainingDistribution = [0.2, 0.2, 0.2, 0.2, 0.2]; // Speed, Stamina, Power, Guts, Wit

        for (const card of this.deck) {
            // Add specialty priority bonus to the preferred training type, if any
            const idx = DeckEvaluator.typeToIndex[card.cardType.type];
            if (idx !== undefined) {
                trainingDistribution[idx] +=
                    (card.cardBonus["Specialty Priority"] !== -1
                        ? card.cardBonus["Specialty Priority"] || 0
                        : 0) / 100;
            }
        }

        // Normalize first
        const total = trainingDistribution.reduce((sum, val) => sum + val, 0);
        let normalizedDistribution: number[];
        if (total !== 0) {
            normalizedDistribution = trainingDistribution.map((x) => x / total);
        } else {
            normalizedDistribution = [0.2, 0.2, 0.2, 0.2, 0.2]; // Fallback to equal distribution
        }

        // Cap any single training type at 50% after normalization
        const maxTrainingPercentage = 0.5;
        
        // Find the maximum value and cap it if needed
        const maxValue = Math.max(...normalizedDistribution);
        if (maxValue > maxTrainingPercentage) {
            // Find the index of the maximum value
            const maxIndex = normalizedDistribution.indexOf(maxValue);
            
            // Calculate how much excess we need to redistribute
            const excess = maxValue - maxTrainingPercentage;
            
            // Cap the maximum value
            normalizedDistribution[maxIndex] = maxTrainingPercentage;
            
            // Redistribute the excess proportionally to other categories
            const remainingSum = normalizedDistribution.reduce((sum, val, idx) => 
                idx === maxIndex ? sum : sum + val, 0);
            
            if (remainingSum > 0) {
                for (let i = 0; i < normalizedDistribution.length; i++) {
                    if (i !== maxIndex) {
                        normalizedDistribution[i] += excess * (normalizedDistribution[i] / remainingSum);
                    }
                }
            } else {
                // If all other values are 0, distribute equally
                const redistributed = excess / (normalizedDistribution.length - 1);
                for (let i = 0; i < normalizedDistribution.length; i++) {
                    if (i !== maxIndex) {
                        normalizedDistribution[i] += redistributed;
                    }
                }
            }
        }

        return normalizedDistribution;
    }

    public evaluateStats(
        scenarioName: string = "URA",
        averageMoodBonus: number = 20,
        optionalRaces: number = 0,
    ): StatsDict {
        const trainingDistribution = this.getTrainingDistribution();

        const totalStatsGained: StatsDict = {
            Speed: 0,
            Stamina: 0,
            Power: 0,
            Guts: 0,
            Wit: 0,
            "Skill Points": 0,
        };

        // Bonuses calculated for facilities
        const totalFacilityBonus: Record<string, Record<string, number>> = {
            Speed: {},
            Stamina: {},
            Power: {},
            Guts: {},
            Intelligence: {},
        };

        let totalEnergySpent = 0;
        let eventEffectiveness = 0;
        let eventRecovery = 0;
        let raceBonus = 0;

        const maxTrainingTurns = 72 + 6 - 11 - optionalRaces;

        // Aggregating all card stats first
        for (const card of this.deck) {
            const idx = DeckEvaluator.typeToIndex[card.cardType.type] ?? -1;
            const trainingDistributionForCard =
                idx !== -1 ? trainingDistribution[idx] : 0.2;

            const bondNeededToFriendship = Math.max(
                80 -
                    (card.cardBonus["Initial Friendship Gauge"] !== -1
                        ? card.cardBonus["Initial Friendship Gauge"] || 0
                        : 0) -
                    (card.eventsStatReward.Bond || 0),
                0,
            );

            card.turnsToMaxBond = Math.ceil(bondNeededToFriendship / 7);
            card.maxFriendshipTurns = maxTrainingTurns - card.turnsToMaxBond;

            // Add training effectiveness for all types
            for (const t of [
                "Speed",
                "Stamina",
                "Power",
                "Guts",
                "Intelligence",
            ]) {
                const typeIdx = DeckEvaluator.typeToIndex[t];
                if (typeIdx !== undefined) {
                    if (!totalFacilityBonus[t]["Training Effectiveness"]) {
                        totalFacilityBonus[t]["Training Effectiveness"] = 0;
                    }
                    totalFacilityBonus[t]["Training Effectiveness"] +=
                        (card.cardBonus["Training Effectiveness"] !== -1
                            ? card.cardBonus["Training Effectiveness"] || 0
                            : 0) * trainingDistribution[typeIdx];
                }
            }

            if (
                card.cardType.type === "Support" ||
                card.cardType.type === "Unknown"
            ) {
                continue;
            }

            const cardTypeKey = card.cardType.type;
            if (!totalFacilityBonus[cardTypeKey]) {
                totalFacilityBonus[cardTypeKey] = {};
            }

            // Initialize bonus properties if they don't exist
            const bonusKeys = [
                "Speed Bonus",
                "Stamina Bonus",
                "Power Bonus",
                "Guts Bonus",
                "Wit Bonus",
                "Friendship Bonus",
                "Mood Effect",
                "Wit Friendship Recovery",
                "Total support cards",
                "Turns To Max Bond",
            ];

            for (const key of bonusKeys) {
                if (totalFacilityBonus[cardTypeKey][key] === undefined) {
                    totalFacilityBonus[cardTypeKey][key] = 0;
                }
            }

            // Add bonuses
            totalFacilityBonus[cardTypeKey]["Speed Bonus"] +=
                card.cardBonus["Speed Bonus"] !== -1
                    ? card.cardBonus["Speed Bonus"]
                    : 0;
            totalFacilityBonus[cardTypeKey]["Stamina Bonus"] +=
                card.cardBonus["Stamina Bonus"] !== -1
                    ? card.cardBonus["Stamina Bonus"]
                    : 0;
            totalFacilityBonus[cardTypeKey]["Power Bonus"] +=
                card.cardBonus["Power Bonus"] !== -1
                    ? card.cardBonus["Power Bonus"]
                    : 0;
            totalFacilityBonus[cardTypeKey]["Guts Bonus"] +=
                card.cardBonus["Guts Bonus"] !== -1
                    ? card.cardBonus["Guts Bonus"]
                    : 0;
            totalFacilityBonus[cardTypeKey]["Wit Bonus"] +=
                card.cardBonus["Wit Bonus"] !== -1
                    ? card.cardBonus["Wit Bonus"]
                    : 0;

            totalFacilityBonus[cardTypeKey]["Friendship Bonus"] +=
                card.cardBonus["Friendship Bonus"] !== -1
                    ? card.cardBonus["Friendship Bonus"] || 0
                    : 0;
            totalFacilityBonus[cardTypeKey]["Mood Effect"] +=
                card.cardBonus["Mood Effect"] !== -1
                    ? card.cardBonus["Mood Effect"] || 0
                    : 0;
            totalFacilityBonus[cardTypeKey]["Wit Friendship Recovery"] +=
                card.cardBonus["Wit Friendship Recovery"] !== -1
                    ? card.cardBonus["Wit Friendship Recovery"]
                    : 0;

            totalFacilityBonus[cardTypeKey]["Total support cards"] += 1;
            totalFacilityBonus[cardTypeKey]["Turns To Max Bond"] +=
                card.turnsToMaxBond;

            eventEffectiveness +=
                (card.cardBonus["Event Effectiveness"] !== -1
                    ? card.cardBonus["Event Effectiveness"] || 0
                    : 0) / 100;
            eventRecovery +=
                (card.cardBonus["Event Recovery"] !== -1
                    ? card.cardBonus["Event Recovery"] || 0
                    : 0) / 100;
            raceBonus +=
                (card.cardBonus["Race Bonus"] !== -1
                    ? card.cardBonus["Race Bonus"] || 0
                    : 0) / 100;
        }

        // Calculating time to max bond
        for (const cardType of [
            "Speed",
            "Stamina",
            "Power",
            "Guts",
            "Intelligence",
        ]) {
            if (totalFacilityBonus[cardType]["Total support cards"] > 0) {
                totalFacilityBonus[cardType]["Turns To Max Bond"] /=
                    totalFacilityBonus[cardType]["Total support cards"];
            }
        }

        // Add event stats
        for (const card of this.deck) {
            for (const [stat, value] of Object.entries(totalStatsGained)) {
                const eventValue = (card.eventsStatReward as any)[stat] || 0;
                (totalStatsGained as any)[stat] +=
                    eventValue * (1 + eventEffectiveness);
            }
            totalEnergySpent +=
                ((card.eventsStatReward as any).Energy || 0) *
                (1 + eventRecovery);
            totalStatsGained["Skill Points"]! +=
                ((card.eventsStatReward as any).Potential || 0) *
                (1 + eventEffectiveness);

            // Add initial stats
            if (card.cardBonus["Initial Speed"] !== -1) {
                totalStatsGained.Speed += card.cardBonus["Initial Speed"];
            }
            if (card.cardBonus["Initial Stamina"] !== -1) {
                totalStatsGained.Stamina += card.cardBonus["Initial Stamina"];
            }
            if (card.cardBonus["Initial Power"] !== -1) {
                totalStatsGained.Power += card.cardBonus["Initial Power"];
            }
            if (card.cardBonus["Initial Guts"] !== -1) {
                totalStatsGained.Guts += card.cardBonus["Initial Guts"];
            }
            if (card.cardBonus["Initial Wit"] !== -1) {
                totalStatsGained.Wit! += card.cardBonus["Initial Wit"];
            }
        }

        // Simulate energy cost
        let index = 0;
        const baseTrainingStats =
            TrainingData.getBaseTrainingStats(scenarioName);

        for (const [name, stats] of Object.entries(baseTrainingStats)) {
            const turnsToTrainAtThisFacility =
                maxTrainingTurns * trainingDistribution[index];
            const energyCost = stats[stats.length - 1]; // Last element is energy cost

            // Ensure facility bonus exists
            if (!totalFacilityBonus[name]) {
                totalFacilityBonus[name] = {};
            }

            if (index === 4) {
                // Intelligence/Wit facility
                const witRecovery =
                    totalFacilityBonus[name]["Wit Friendship Recovery"] !== -1
                        ? totalFacilityBonus[name]["Wit Friendship Recovery"] ||
                          0
                        : 0;
                totalEnergySpent +=
                    energyCost * turnsToTrainAtThisFacility * (1 + witRecovery);
            } else {
                totalEnergySpent += energyCost * turnsToTrainAtThisFacility;
            }
            index++;
        }

        const turnsWasted = Math.max((totalEnergySpent / (56 + 15)) * -1, 0);
        const adjustedMaxTrainingTurns = maxTrainingTurns - turnsWasted;

        // Simulate training at each facility
        index = 0;
        for (const [name, stats] of Object.entries(baseTrainingStats)) {
            const turnsToTrainAtThisFacility =
                adjustedMaxTrainingTurns * trainingDistribution[index];
            const coreStats = stats.slice(0, -1); // Energy is not part of "Friendship Training Calculation Formula"

            const moodBonus = 1 + averageMoodBonus / 100;

            // Ensure facility bonus exists for this training type
            if (!totalFacilityBonus[name]) {
                totalFacilityBonus[name] = {};
            }

            // Calculate effective card presence based on training distribution
            // Multiplier ranges from 0 to 1, where 1 = all cards present, 0 = none present
            // If there's 1 card, multiplier is always 1 (guaranteed presence)
            const totalCardsAtFacility = totalFacilityBonus[name]["Total support cards"] || 0;
            const cardPresenceMultiplier = totalCardsAtFacility <= 1 
                ? 1  // Single card or no cards = full presence
                : Math.max(1/totalCardsAtFacility, Math.min(1, (1 + (totalCardsAtFacility - 1) * trainingDistribution[index]) / totalCardsAtFacility));

            const moodEffect =
                ((totalFacilityBonus[name]["Mood Effect"] || 0) * cardPresenceMultiplier) / 100 + 1;
            const trainingEffectivenessRaw =
                totalFacilityBonus[name]["Training Effectiveness"] || 0;
            const trainingEffectiveness = Math.max(
                trainingEffectivenessRaw / 100 + 1,
                1,
            ); // Ensure it's never below 1
            const friendshipBonus =
                ((totalFacilityBonus[name]["Friendship Bonus"] || 0) * cardPresenceMultiplier) / 100 + 1;

            // Debug logging
            if (isNaN(trainingEffectivenessRaw)) {
                console.warn(`Training effectiveness is NaN for ${name}:`, {
                    raw: trainingEffectivenessRaw,
                    facilityBonus:
                        totalFacilityBonus[name]["Training Effectiveness"],
                    totalFacilityBonus: totalFacilityBonus[name],
                });
            }

            const facilityMultipliers =
                TrainingData.getFacilityMultipliers(scenarioName);
            const facilityMultiplierValue = facilityMultipliers[name] || 0;

            for (
                let turn = 0;
                turn < Math.ceil(turnsToTrainAtThisFacility);
                turn++
            ) {
                const facilityMultiplier =
                    1 +
                    Math.min(Math.floor(turn / 4), 4) * facilityMultiplierValue;

                const rainbow =
                    turn >=
                        (totalFacilityBonus[name]["Turns To Max Bond"] || 0) &&
                    (totalFacilityBonus[name]["Total support cards"] || 0) > 0;

                let averageStatsPerTurn: number[];
                if (rainbow) {
                    averageStatsPerTurn = coreStats.map((stat) =>
                        Math.floor(
                            stat *
                                facilityMultiplier *
								cardPresenceMultiplier *
                                moodBonus *
                                moodEffect *
                                trainingEffectiveness *
                                friendshipBonus,
                        ),
                    );
                } else {
                    averageStatsPerTurn = coreStats.map((stat) =>
                        Math.floor(
                            stat *
                                facilityMultiplier *
								cardPresenceMultiplier *
                                moodBonus *
                                trainingEffectiveness,
                        ),
                    );
                }

                // Handle partial turns
                if (turn === Math.ceil(turnsToTrainAtThisFacility) - 1) {
                    const fraction = turnsToTrainAtThisFacility % 1;
                    if (fraction > 0) {
                        averageStatsPerTurn = averageStatsPerTurn.map(
                            (x) => x * fraction,
                        );
                    }
                }

                // Add facility bonuses with card presence scaling
                averageStatsPerTurn[0] +=
                    ((totalFacilityBonus[name]["Speed Bonus"] || 0) * cardPresenceMultiplier);
                averageStatsPerTurn[1] +=
                    ((totalFacilityBonus[name]["Stamina Bonus"] || 0) * cardPresenceMultiplier);
                averageStatsPerTurn[2] +=
                    ((totalFacilityBonus[name]["Power Bonus"] || 0) * cardPresenceMultiplier);
                averageStatsPerTurn[3] +=
                    ((totalFacilityBonus[name]["Guts Bonus"] || 0) * cardPresenceMultiplier);
                averageStatsPerTurn[4] +=
                    ((totalFacilityBonus[name]["Wit Bonus"] || 0) * cardPresenceMultiplier);

                totalStatsGained.Speed += averageStatsPerTurn[0];
                totalStatsGained.Stamina += averageStatsPerTurn[1];
                totalStatsGained.Power += averageStatsPerTurn[2];
                totalStatsGained.Guts += averageStatsPerTurn[3];
                totalStatsGained.Wit! += averageStatsPerTurn[4];
                totalStatsGained["Skill Points"]! +=
                    averageStatsPerTurn[5] || 0;
            }
            index++;
        }

        // Add career race rewards
        const careerRaces = TrainingData.getRaceCareerRewards(scenarioName);
        const finaleRace = careerRaces.finaleRace || [0, 0, 0, 0, 0, 0];
        const careerRace = careerRaces.careerRace || [0, 0, 0, 0, 0, 0];

        totalStatsGained.Speed += finaleRace[0] * 3 + careerRace[0] * 8;
        totalStatsGained.Stamina += finaleRace[1] * 3 + careerRace[1] * 8;
        totalStatsGained.Power += finaleRace[2] * 3 + careerRace[2] * 8;
        totalStatsGained.Guts += finaleRace[3] * 3 + careerRace[3] * 8;
        totalStatsGained.Wit! += finaleRace[4] * 3 + careerRace[4] * 8;
        totalStatsGained["Skill Points"]! +=
            finaleRace[5] * 3 + careerRace[5] * 8;

        // Add optional race stats
        totalStatsGained.Speed += optionalRaces * 2;
        totalStatsGained.Stamina += optionalRaces * 2;
        totalStatsGained.Power += optionalRaces * 2;
        totalStatsGained.Guts += optionalRaces * 2;
        totalStatsGained.Wit! += optionalRaces * 2;
        totalStatsGained["Skill Points"]! += optionalRaces * 30;

        return totalStatsGained;
    }

    public evaluateHints(): Record<string, number> {
        const totalHintsGained: Record<string, number> = {};

        for (const card of this.deck) {
            const hintForCard = card.evaluateCardHints();
            for (const [k, v] of Object.entries(hintForCard)) {
                totalHintsGained[k] = (totalHintsGained[k] || 0) + v;
            }
        }

        if (this.deck.length > 0) {
            totalHintsGained["hint_frequency"] /= this.deck.length;
            totalHintsGained["useful_hints_rate"] /= this.deck.length;
        }

        return totalHintsGained;
    }
}