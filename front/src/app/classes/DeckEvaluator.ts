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
    public manualDistribution: number[] | null = null;

    constructor() {
        this.deck = [];
    }

    public setManualDistribution(distribution: number[] | null): void {
        this.manualDistribution = distribution;
    }

    public addCard(card: SupportCard): void {
        this.deck.push(card);
    }

    public getTrainingDistribution(): number[] {
        if (this.manualDistribution) {
            return this.manualDistribution;
        }

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
            // Add Speed, Stamina, Power, and Guts from events
            totalStatsGained.Speed += (card.eventsStatReward.Speed || 0) * (1 + eventEffectiveness);
            totalStatsGained.Stamina += (card.eventsStatReward.Stamina || 0) * (1 + eventEffectiveness);
            totalStatsGained.Power += (card.eventsStatReward.Power || 0) * (1 + eventEffectiveness);
            totalStatsGained.Guts += (card.eventsStatReward.Guts || 0) * (1 + eventEffectiveness);
            
            // Add Wit if present
            if (card.eventsStatReward.Wit) {
                totalStatsGained.Wit = (totalStatsGained.Wit || 0) + card.eventsStatReward.Wit * (1 + eventEffectiveness);
            }

            totalEnergySpent +=
                (card.eventsStatReward.Energy || 0) *
                (1 + eventRecovery);
            totalStatsGained["Skill Points"]! +=
                (card.eventsStatReward.Potential || 0) *
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

        // Add energy cost for optional races (assuming 15 energy per race)
        totalEnergySpent -= optionalRaces * 15;

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

            // NEW APPROACH: More realistic card presence calculation
            // Only one card can be primary trainer, others contribute based on specialty priority
            const facilityCards = this.deck.filter(card => 
                card.cardType.type === name && 
                card.cardType.type !== "Support" && 
                card.cardType.type !== "Unknown"
            );
            
            let effectiveMoodEffect = 0;
            let effectiveTrainingEffectiveness = 0;
            
            if (facilityCards.length === 0) {
                // No cards at this facility
                effectiveMoodEffect = 0;
                effectiveTrainingEffectiveness = 0;
            } else if (facilityCards.length === 1) {
                // Single card: full effect (same as before)
                const card = facilityCards[0];
                effectiveMoodEffect = card.cardBonus["Mood Effect"] !== -1 
                    ? card.cardBonus["Mood Effect"] || 0 
                    : 0;
                effectiveTrainingEffectiveness = card.cardBonus["Training Effectiveness"] !== -1
                    ? card.cardBonus["Training Effectiveness"] || 0
                    : 0;
            } else {
                // Multiple cards: use deterministic expected value approach
                // Each card has 1/n chance of being primary, others contribute partially
                for (const primaryCard of facilityCards) {
                    const primaryWeight = 1.0 / facilityCards.length;
                    
                    // Primary card contribution (full effect)
                    let moodContribution = primaryCard.cardBonus["Mood Effect"] !== -1 
                        ? primaryCard.cardBonus["Mood Effect"] || 0 
                        : 0;
                    let trainingContribution = primaryCard.cardBonus["Training Effectiveness"] !== -1
                        ? primaryCard.cardBonus["Training Effectiveness"] || 0
                        : 0;
                    
                    // Secondary cards contribution (partial effect based on specialty priority)
                    for (const secondaryCard of facilityCards) {
                        if (secondaryCard !== primaryCard) {
                            const specialtyPriority = secondaryCard.cardBonus["Specialty Priority"] !== -1
                                ? secondaryCard.cardBonus["Specialty Priority"] || 0
                                : 0;
                            const presenceChance = 0.2 + (specialtyPriority / 100); // 20% base + specialty bonus
                            
                            const secondaryMood = secondaryCard.cardBonus["Mood Effect"] !== -1
                                ? secondaryCard.cardBonus["Mood Effect"] || 0
                                : 0;
                            const secondaryTraining = secondaryCard.cardBonus["Training Effectiveness"] !== -1
                                ? secondaryCard.cardBonus["Training Effectiveness"] || 0
                                : 0;
                            
                            moodContribution += secondaryMood * presenceChance;
                            trainingContribution += secondaryTraining * presenceChance;
                        }
                    }
                    
                    // Add weighted contribution to totals
                    effectiveMoodEffect += moodContribution * primaryWeight;
                    effectiveTrainingEffectiveness += trainingContribution * primaryWeight;
                }
            }

            const moodEffect = effectiveMoodEffect / 100 + 1;
            const trainingEffectiveness = Math.max(
                effectiveTrainingEffectiveness / 100 + 1,
                1,
            ); // Ensure it's never below 1
            
            // Calculate effective friendship bonus using same approach as mood/training
            let effectiveFriendshipBonus = 0;
            if (facilityCards.length === 0) {
                effectiveFriendshipBonus = 0;
            } else if (facilityCards.length === 1) {
                const card = facilityCards[0];
                effectiveFriendshipBonus = card.cardBonus["Friendship Bonus"] !== -1
                    ? card.cardBonus["Friendship Bonus"] || 0
                    : 0;
            } else {
                // Multiple cards: use same deterministic approach
                for (const primaryCard of facilityCards) {
                    const primaryWeight = 1.0 / facilityCards.length;
                    let friendshipContribution = primaryCard.cardBonus["Friendship Bonus"] !== -1
                        ? primaryCard.cardBonus["Friendship Bonus"] || 0
                        : 0;
                    
                    for (const secondaryCard of facilityCards) {
                        if (secondaryCard !== primaryCard) {
                            const specialtyPriority = secondaryCard.cardBonus["Specialty Priority"] !== -1
                                ? secondaryCard.cardBonus["Specialty Priority"] || 0
                                : 0;
                            const presenceChance = 0.2 + (specialtyPriority / 100);
                            
                            const secondaryFriendship = secondaryCard.cardBonus["Friendship Bonus"] !== -1
                                ? secondaryCard.cardBonus["Friendship Bonus"] || 0
                                : 0;
                            
                            friendshipContribution += secondaryFriendship * presenceChance;
                        }
                    }
                    
                    effectiveFriendshipBonus += friendshipContribution * primaryWeight;
                }
            }
            
            const friendshipBonus = effectiveFriendshipBonus / 100 + 1;

            // Debug logging
            if (isNaN(effectiveTrainingEffectiveness)) {
                console.warn(`Training effectiveness is NaN for ${name}:`, {
                    raw: effectiveTrainingEffectiveness,
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

                // Calculate effective stat bonuses using same approach as mood/training
                let effectiveStatBonuses = [0, 0, 0, 0, 0]; // Speed, Stamina, Power, Guts, Wit
                
                if (facilityCards.length === 0) {
                    effectiveStatBonuses = [0, 0, 0, 0, 0];
                } else if (facilityCards.length === 1) {
                    const card = facilityCards[0];
                    effectiveStatBonuses = [
                        card.cardBonus["Speed Bonus"] !== -1 ? card.cardBonus["Speed Bonus"] || 0 : 0,
                        card.cardBonus["Stamina Bonus"] !== -1 ? card.cardBonus["Stamina Bonus"] || 0 : 0,
                        card.cardBonus["Power Bonus"] !== -1 ? card.cardBonus["Power Bonus"] || 0 : 0,
                        card.cardBonus["Guts Bonus"] !== -1 ? card.cardBonus["Guts Bonus"] || 0 : 0,
                        card.cardBonus["Wit Bonus"] !== -1 ? card.cardBonus["Wit Bonus"] || 0 : 0,
                    ];
                } else {
                    // Multiple cards: use deterministic approach
                    for (const primaryCard of facilityCards) {
                        const primaryWeight = 1.0 / facilityCards.length;
                        const statContributions = [
                            primaryCard.cardBonus["Speed Bonus"] !== -1 ? primaryCard.cardBonus["Speed Bonus"] || 0 : 0,
                            primaryCard.cardBonus["Stamina Bonus"] !== -1 ? primaryCard.cardBonus["Stamina Bonus"] || 0 : 0,
                            primaryCard.cardBonus["Power Bonus"] !== -1 ? primaryCard.cardBonus["Power Bonus"] || 0 : 0,
                            primaryCard.cardBonus["Guts Bonus"] !== -1 ? primaryCard.cardBonus["Guts Bonus"] || 0 : 0,
                            primaryCard.cardBonus["Wit Bonus"] !== -1 ? primaryCard.cardBonus["Wit Bonus"] || 0 : 0,
                        ];
                        
                        for (const secondaryCard of facilityCards) {
                            if (secondaryCard !== primaryCard) {
                                const specialtyPriority = secondaryCard.cardBonus["Specialty Priority"] !== -1
                                    ? secondaryCard.cardBonus["Specialty Priority"] || 0
                                    : 0;
                                const presenceChance = 0.2 + (specialtyPriority / 100);
                                
                                statContributions[0] += (secondaryCard.cardBonus["Speed Bonus"] !== -1 ? secondaryCard.cardBonus["Speed Bonus"] || 0 : 0) * presenceChance;
                                statContributions[1] += (secondaryCard.cardBonus["Stamina Bonus"] !== -1 ? secondaryCard.cardBonus["Stamina Bonus"] || 0 : 0) * presenceChance;
                                statContributions[2] += (secondaryCard.cardBonus["Power Bonus"] !== -1 ? secondaryCard.cardBonus["Power Bonus"] || 0 : 0) * presenceChance;
                                statContributions[3] += (secondaryCard.cardBonus["Guts Bonus"] !== -1 ? secondaryCard.cardBonus["Guts Bonus"] || 0 : 0) * presenceChance;
                                statContributions[4] += (secondaryCard.cardBonus["Wit Bonus"] !== -1 ? secondaryCard.cardBonus["Wit Bonus"] || 0 : 0) * presenceChance;
                            }
                        }
                        
                        for (let i = 0; i < 5; i++) {
                            effectiveStatBonuses[i] += statContributions[i] * primaryWeight;
                        }
                    }
                }

                // Add effective stat bonuses
                averageStatsPerTurn[0] += effectiveStatBonuses[0];
                averageStatsPerTurn[1] += effectiveStatBonuses[1];
                averageStatsPerTurn[2] += effectiveStatBonuses[2];
                averageStatsPerTurn[3] += effectiveStatBonuses[3];
                averageStatsPerTurn[4] += effectiveStatBonuses[4];

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
        const optionalRaceRewards = careerRaces.optionalRace || [2, 2, 2, 2, 2, 30];

        totalStatsGained.Speed += finaleRace[0] * 3 + careerRace[0] * 8;
        totalStatsGained.Stamina += finaleRace[1] * 3 + careerRace[1] * 8;
        totalStatsGained.Power += finaleRace[2] * 3 + careerRace[2] * 8;
        totalStatsGained.Guts += finaleRace[3] * 3 + careerRace[3] * 8;
        totalStatsGained.Wit! += finaleRace[4] * 3 + careerRace[4] * 8;
        totalStatsGained["Skill Points"]! +=
            finaleRace[5] * 3 + careerRace[5] * 8;

        // Add optional race stats
        totalStatsGained.Speed += optionalRaces * optionalRaceRewards[0];
        totalStatsGained.Stamina += optionalRaces * optionalRaceRewards[1];
        totalStatsGained.Power += optionalRaces * optionalRaceRewards[2];
        totalStatsGained.Guts += optionalRaces * optionalRaceRewards[3];
        totalStatsGained.Wit! += optionalRaces * optionalRaceRewards[4];
        totalStatsGained["Skill Points"]! += optionalRaces * optionalRaceRewards[5];

        // Add scenario bonus stats
        const scenarioBonus = TrainingData.getScenarioBonusStats(scenarioName);
        totalStatsGained.Speed += scenarioBonus.Speed || 0;
        totalStatsGained.Stamina += scenarioBonus.Stamina || 0;
        totalStatsGained.Power += scenarioBonus.Power || 0;
        totalStatsGained.Guts += scenarioBonus.Guts || 0;
        totalStatsGained.Wit! += scenarioBonus.Intelligence || 0;

        // Add scenario distributed bonus stats
        const scenarioDistributedBonus = TrainingData.getScenarioTrainingDistributedBonusStats(scenarioName);
        if (scenarioDistributedBonus > 0) {
            totalStatsGained.Speed += scenarioDistributedBonus * trainingDistribution[0];
            totalStatsGained.Stamina += scenarioDistributedBonus * trainingDistribution[1];
            totalStatsGained.Power += scenarioDistributedBonus * trainingDistribution[2];
            totalStatsGained.Guts += scenarioDistributedBonus * trainingDistribution[3];
            totalStatsGained.Wit! += scenarioDistributedBonus * trainingDistribution[4];
        }

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