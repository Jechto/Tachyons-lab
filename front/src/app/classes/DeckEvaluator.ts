import { SupportCard } from "./SupportCard";
import { TrainingData } from "../config/trainingData";
import { StatsDict } from "../types/cardTypes";
import { isSupportCardAllowedInScenario } from "../config/supportCardScenarios";

interface CardAppearance {
    card: SupportCard;
    index: number;
    cardType: string;
    rainbowSpecialty: number; // Probability of appearing on specialty training when bonded
    offSpecialty: number; // Probability of appearing on off-specialty training
}

interface TrainingCombination {
    cards: CardAppearance[];
    probability: number;
}

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
        const trainingDistribution = [0.2, 0.2, 0.2, 0.2, 0.2];

        for (const card of this.deck) {
            const idx = DeckEvaluator.typeToIndex[card.cardType.type];
            if (idx !== undefined) {
                trainingDistribution[idx] +=
                    (card.cardBonus["Specialty Priority"] !== -1
                        ? card.cardBonus["Specialty Priority"] || 0
                        : 0) / 100;
            }
        }

        // Normalize
        const total = trainingDistribution.reduce((sum, val) => sum + val, 0);
        let normalizedDistribution: number[];
        if (total !== 0) {
            normalizedDistribution = trainingDistribution.map((x) => x / total);
        } else {
            normalizedDistribution = [0.2, 0.2, 0.2, 0.2, 0.2];
        }

        // Cap at 50%
        const maxTrainingPercentage = 0.5;
        const maxValue = Math.max(...normalizedDistribution);
        if (maxValue > maxTrainingPercentage) {
            const maxIndex = normalizedDistribution.indexOf(maxValue);
            const excess = maxValue - maxTrainingPercentage;
            normalizedDistribution[maxIndex] = maxTrainingPercentage;
            
            const remainingSum = normalizedDistribution.reduce((sum, val, idx) => 
                idx === maxIndex ? sum : sum + val, 0);
            
            if (remainingSum > 0) {
                for (let i = 0; i < normalizedDistribution.length; i++) {
                    if (i !== maxIndex) {
                        normalizedDistribution[i] += excess * (normalizedDistribution[i] / remainingSum);
                    }
                }
            } else {
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

    /**
     * Generate all possible combinations of cards (power set)
     */
    private getCombinations(cards: CardAppearance[], minLength: number = 0): CardAppearance[][] {
        const combinations: CardAppearance[][] = [];
        const count = Math.pow(2, cards.length);

        for (let i = 0; i < count; i++) {
            const temp: CardAppearance[] = [];
            for (let j = 0; j < cards.length; j++) {
                if (i & Math.pow(2, j)) {
                    temp.push(cards[j]);
                }
            }
            if (temp.length >= minLength) {
                combinations.push(temp);
            }
        }

        return combinations;
    }

    /**
     * Calculate the probability of a specific combination appearing at a training
     */
    private calculateCombinationProbability(
        combination: CardAppearance[],
        allCards: CardAppearance[],
        trainingType: string
    ): number {
        // Probability that all cards in combination appear
        let probability = 1.0;
        for (const card of combination) {
            if (card.cardType === trainingType) {
                probability *= card.rainbowSpecialty;
            } else {
                probability *= card.offSpecialty;
            }
        }

        // Probability that all other cards DON'T appear
        const otherCards = allCards.filter(
            (c) => !combination.some((d) => c.index === d.index)
        );
        for (const card of otherCards) {
            if (card.cardType === trainingType) {
                probability *= (1 - card.rainbowSpecialty);
            } else {
                probability *= (1 - card.offSpecialty);
            }
        }

        return probability;
    }

    /**
     * Calculate stat gains for a specific training session with a combination of cards
     */
    private calculateTrainingGains(
        baseStats: number[], // [Speed, Stamina, Power, Guts, Wit, SkillPts]
        cards: CardAppearance[],
        facilitySupportCard: SupportCard | null, // The card being evaluated
        trainingType: string,
        isBonded: boolean,
        scenarioName: string,
        facilityMultiplier: number,
        moodBonus: number,
        globalTrainingEffectiveness: number = 0 // Training effectiveness from all cards (including Support)
    ): number[] {
        const gains = [0, 0, 0, 0, 0, 0]; // Speed, Stamina, Power, Guts, Wit, SkillPts

        if (!facilitySupportCard) {
            return gains;
        }

        // Base training effectiveness (starts at 1.0 + global from all cards)
        let trainingEffectiveness = 1.0 + globalTrainingEffectiveness;
        let friendshipBonus = 1.0;
        let moodEffect = 1.0;

        // Stat bonuses from all cards appearing
        const statBonuses = [0, 0, 0, 0, 0, 0];
        
        // Add the facility card's bonuses
        statBonuses[0] += facilitySupportCard.cardBonus["Speed Bonus"] !== -1 ? facilitySupportCard.cardBonus["Speed Bonus"] || 0 : 0;
        statBonuses[1] += facilitySupportCard.cardBonus["Stamina Bonus"] !== -1 ? facilitySupportCard.cardBonus["Stamina Bonus"] || 0 : 0;
        statBonuses[2] += facilitySupportCard.cardBonus["Power Bonus"] !== -1 ? facilitySupportCard.cardBonus["Power Bonus"] || 0 : 0;
        statBonuses[3] += facilitySupportCard.cardBonus["Guts Bonus"] !== -1 ? facilitySupportCard.cardBonus["Guts Bonus"] || 0 : 0;
        statBonuses[4] += facilitySupportCard.cardBonus["Wit Bonus"] !== -1 ? facilitySupportCard.cardBonus["Wit Bonus"] || 0 : 0;

        trainingEffectiveness += (facilitySupportCard.cardBonus["Training Effectiveness"] !== -1 
            ? facilitySupportCard.cardBonus["Training Effectiveness"] || 0 
            : 0) / 100;

        if (isBonded) {
            friendshipBonus += (facilitySupportCard.cardBonus["Friendship Bonus"] !== -1 
                ? facilitySupportCard.cardBonus["Friendship Bonus"] || 0 
                : 0) / 100;
            moodEffect += (facilitySupportCard.cardBonus["Mood Effect"] !== -1 
                ? facilitySupportCard.cardBonus["Mood Effect"] || 0 
                : 0) / 100;
        }

        // Add bonuses from cards in the combination
        for (const cardAppearance of cards) {
            const card = cardAppearance.card;
            statBonuses[0] += card.cardBonus["Speed Bonus"] !== -1 ? card.cardBonus["Speed Bonus"] || 0 : 0;
            statBonuses[1] += card.cardBonus["Stamina Bonus"] !== -1 ? card.cardBonus["Stamina Bonus"] || 0 : 0;
            statBonuses[2] += card.cardBonus["Power Bonus"] !== -1 ? card.cardBonus["Power Bonus"] || 0 : 0;
            statBonuses[3] += card.cardBonus["Guts Bonus"] !== -1 ? card.cardBonus["Guts Bonus"] || 0 : 0;
            statBonuses[4] += card.cardBonus["Wit Bonus"] !== -1 ? card.cardBonus["Wit Bonus"] || 0 : 0;

            trainingEffectiveness += (card.cardBonus["Training Effectiveness"] !== -1 
                ? card.cardBonus["Training Effectiveness"] || 0 
                : 0) / 100;

            if (isBonded && card.cardType.type === trainingType) {
                friendshipBonus *= 1 + ((card.cardBonus["Friendship Bonus"] !== -1 
                    ? card.cardBonus["Friendship Bonus"] || 0 
                    : 0) / 100);
                moodEffect += (card.cardBonus["Mood Effect"] !== -1 
                    ? card.cardBonus["Mood Effect"] || 0 
                    : 0) / 100;
            }
        }

        // Crowd bonus: 5% per card appearing (including the facility card)
        const crowdBonus = 1.0 + (0.05 * (cards.length + 1));

        // Calculate gains for each stat (capped at 100 per training)
        for (let i = 0; i < 5; i++) {
            const baseStat = baseStats[i] + statBonuses[i];
            const calculatedGain = Math.floor(
                baseStat *
                facilityMultiplier *
                moodBonus *
                moodEffect *
                trainingEffectiveness *
                friendshipBonus *
                crowdBonus
            );
            gains[i] = Math.min(calculatedGain, 100);
        }

        // Skill points (if applicable, not capped)
        if (baseStats[5]) {
            gains[5] = Math.floor(
                (baseStats[5] + statBonuses[5]) *
                facilityMultiplier *
                moodBonus *
                trainingEffectiveness *
                crowdBonus
            );
        }

        return gains;
    }

    public evaluateStats(
        scenarioName: string = "URA",
        averageMoodBonus: number = 20,
        optionalRaces: number = 0,
        forcedRaces: number = 8,
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

        let eventEffectiveness = 0;
        let eventRecovery = 0;
        let raceBonus = 0;

        // Calculate global training effectiveness from ALL cards (including Support)
        // This applies to all facilities based on training distribution
        const globalTrainingEffectiveness: number[] = [0, 0, 0, 0, 0]; // Per facility type

        const maxTrainingTurns = 72 + 6 - 3 - forcedRaces - optionalRaces;

        // Prepare card appearances with specialty rates
        const cardAppearances: CardAppearance[] = [];
        
        for (let i = 0; i < this.deck.length; i++) {
            const card = this.deck[i];
            
            // Check if support card is allowed in this scenario
            if (!isSupportCardAllowedInScenario(card.id.toString(), scenarioName)) {
                continue; // Skip cards not allowed in this scenario
            }
            
            // Skip Support and Unknown card types - they don't appear at training facilities
            if (
                card.cardType.type === "Support" ||
                card.cardType.type === "Unknown"
            ) {
                // Still add their event stats and initial stats below
                // Add event stats
                totalStatsGained.Speed += (card.eventsStatReward.Speed || 0) * (1 + eventEffectiveness);
                totalStatsGained.Stamina += (card.eventsStatReward.Stamina || 0) * (1 + eventEffectiveness);
                totalStatsGained.Power += (card.eventsStatReward.Power || 0) * (1 + eventEffectiveness);
                totalStatsGained.Guts += (card.eventsStatReward.Guts || 0) * (1 + eventEffectiveness);
                totalStatsGained.Wit! += (card.eventsStatReward.Wit || 0) * (1 + eventEffectiveness);
                totalStatsGained["Skill Points"]! += (card.eventsStatReward.Potential || 0) * (1 + eventEffectiveness);

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

                eventEffectiveness += (card.cardBonus["Event Effectiveness"] !== -1
                    ? card.cardBonus["Event Effectiveness"] || 0
                    : 0) / 100;
                eventRecovery += (card.cardBonus["Event Recovery"] !== -1
                    ? card.cardBonus["Event Recovery"] || 0
                    : 0) / 100;
                raceBonus += (card.cardBonus["Race Bonus"] !== -1
                    ? card.cardBonus["Race Bonus"] || 0
                    : 0) / 100;
                
                continue; // Skip adding to cardAppearances
            }
            
            // Calculate specialty rates
            const specialtyRate = card.cardBonus["Specialty Priority"] !== -1 
                ? card.cardBonus["Specialty Priority"] || 0 
                : 0;
            
            // Base 20% chance + specialty bonus
            const rainbowSpecialty = Math.min(1.0, 0.2 + (specialtyRate / 100));
            
            // Off-specialty is base 20% divided by 4 other facilities
            const offSpecialty = 0.05;

            cardAppearances.push({
                card: card,
                index: i,
                cardType: card.cardType.type,
                rainbowSpecialty: rainbowSpecialty,
                offSpecialty: offSpecialty,
            });

            // Add event stats
            totalStatsGained.Speed += (card.eventsStatReward.Speed || 0) * (1 + eventEffectiveness);
            totalStatsGained.Stamina += (card.eventsStatReward.Stamina || 0) * (1 + eventEffectiveness);
            totalStatsGained.Power += (card.eventsStatReward.Power || 0) * (1 + eventEffectiveness);
            totalStatsGained.Guts += (card.eventsStatReward.Guts || 0) * (1 + eventEffectiveness);
            totalStatsGained.Wit! += (card.eventsStatReward.Wit || 0) * (1 + eventEffectiveness);
            totalStatsGained["Skill Points"]! += (card.eventsStatReward.Potential || 0) * (1 + eventEffectiveness);

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

            eventEffectiveness += (card.cardBonus["Event Effectiveness"] !== -1
                ? card.cardBonus["Event Effectiveness"] || 0
                : 0) / 100;
            eventRecovery += (card.cardBonus["Event Recovery"] !== -1
                ? card.cardBonus["Event Recovery"] || 0
                : 0) / 100;
            raceBonus += (card.cardBonus["Race Bonus"] !== -1
                ? card.cardBonus["Race Bonus"] || 0
                : 0) / 100;

            // Add global training effectiveness from ALL cards to all facilities
            for (let t = 0; t < 5; t++) {
                globalTrainingEffectiveness[t] += 
                    ((card.cardBonus["Training Effectiveness"] !== -1
                        ? card.cardBonus["Training Effectiveness"] || 0
                        : 0) / 100) * trainingDistribution[t];
            }
        }

        // Calculate training turns to bond for each card
        for (const card of this.deck) {
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
        }

        // Simulate training at each facility using combinatorics
        const baseTrainingStats = TrainingData.getBaseTrainingStats(scenarioName);
        const facilityMultipliers = TrainingData.getFacilityMultipliers(scenarioName);
        const moodBonus = 1 + averageMoodBonus / 100;

        let index = 0;
        for (const [name, stats] of Object.entries(baseTrainingStats)) {
            const turnsToTrainAtThisFacility = maxTrainingTurns * trainingDistribution[index];
            const coreStats = stats.slice(0, -1); // Exclude energy cost
            const facilityMultiplierValue = facilityMultipliers[name] || 0;

            // Get cards that match this facility type
            const facilityCards = cardAppearances.filter(
                (ca) => ca.cardType === name
            );

            if (facilityCards.length === 0) {
                // No cards at this facility - just base training
                for (let turn = 0; turn < Math.ceil(turnsToTrainAtThisFacility); turn++) {
                    const facilityMultiplier = 1 + Math.min(Math.floor(turn / 4), 4) * facilityMultiplierValue;
                    
                    const averageStatsPerTurn = coreStats.map((stat) =>
                        Math.floor(stat * facilityMultiplier * moodBonus)
                    );

                    if (turn === Math.ceil(turnsToTrainAtThisFacility) - 1) {
                        const fraction = turnsToTrainAtThisFacility % 1;
                        if (fraction > 0) {
                            totalStatsGained.Speed += averageStatsPerTurn[0] * fraction;
                            totalStatsGained.Stamina += averageStatsPerTurn[1] * fraction;
                            totalStatsGained.Power += averageStatsPerTurn[2] * fraction;
                            totalStatsGained.Guts += averageStatsPerTurn[3] * fraction;
                            totalStatsGained.Wit! += averageStatsPerTurn[4] * fraction;
                            totalStatsGained["Skill Points"]! += (averageStatsPerTurn[5] || 0) * fraction;
                        }
                    } else {
                        totalStatsGained.Speed += averageStatsPerTurn[0];
                        totalStatsGained.Stamina += averageStatsPerTurn[1];
                        totalStatsGained.Power += averageStatsPerTurn[2];
                        totalStatsGained.Guts += averageStatsPerTurn[3];
                        totalStatsGained.Wit! += averageStatsPerTurn[4];
                        totalStatsGained["Skill Points"]! += averageStatsPerTurn[5] || 0;
                    }
                }
            } else {
                // Use combinatorics approach: generate all possible combinations of cards appearing
                // Generate all non-empty combinations (at least 1 card must appear)
                const allCombinations = this.getCombinations(facilityCards, 1);
                
                console.log(`\n[${name}] ${facilityCards.length} cards, ${allCombinations.length} combos, ${Math.ceil(turnsToTrainAtThisFacility)} turns`);
                
                // Debug: Show first combo details for first card
                if (facilityCards.length === 1) {
                    const card = facilityCards[0];
                    console.log(`  Single card: ${card.card.id}, rainbow specialty: ${(card.rainbowSpecialty * 100).toFixed(1)}%`);
                    console.log(`  Expected: ~${(card.rainbowSpecialty * 100).toFixed(1)}% probability for 1-card combo`);
                }
                
                if (facilityCards.length === 2 && name === "Guts") {
                    console.log(`  Card 1: ${facilityCards[0].card.id}, P=${(facilityCards[0].rainbowSpecialty * 100).toFixed(1)}%`);
                    console.log(`  Card 2: ${facilityCards[1].card.id}, P=${(facilityCards[1].rainbowSpecialty * 100).toFixed(1)}%`);
                    console.log(`  Combo probabilities should be:`);
                    const p1 = facilityCards[0].rainbowSpecialty;
                    const p2 = facilityCards[1].rainbowSpecialty;
                    console.log(`    [Card1 only]: ${(p1 * (1-p2) * 100).toFixed(2)}%`);
                    console.log(`    [Card2 only]: ${((1-p1) * p2 * 100).toFixed(2)}%`);
                    console.log(`    [Both]: ${(p1 * p2 * 100).toFixed(2)}%`);
                    console.log(`    Total: ${((p1 * (1-p2) + (1-p1) * p2 + p1 * p2) * 100).toFixed(2)}%`);
                }
                
                // Track gains for debug
                let totalTurnGains = [0, 0, 0, 0, 0, 0];
                let totalProbability = 0;
                
                // For each turn, evaluate all possible combinations
                for (let turn = 0; turn < Math.ceil(turnsToTrainAtThisFacility); turn++) {
                    const facilityMultiplier = 1 + Math.min(Math.floor(turn / 4), 4) * facilityMultiplierValue;
                    
                    // Calculate expected gains across all combinations
                    const expectedGains = [0, 0, 0, 0, 0, 0];
                    let turnProbSum = 0;
                    
                    for (const combination of allCombinations) {
                        // Calculate probability of this exact combination appearing
                        const probability = this.calculateCombinationProbability(
                            combination,
                            facilityCards,
                            name
                        );
                        
                        turnProbSum += probability;
                        
                        // Pick the first card in the combination as the "primary" card for bonus calculation
                        const primaryCard = combination[0].card;
                        const otherCards = combination.slice(1);
                        const isBonded = turn >= primaryCard.turnsToMaxBond;
                        
                        const gains = this.calculateTrainingGains(
                            coreStats,
                            otherCards,
                            primaryCard,
                            name,
                            isBonded,
                            scenarioName,
                            facilityMultiplier,
                            moodBonus,
                            globalTrainingEffectiveness[index]
                        );
                        
                        for (let i = 0; i < 6; i++) {
                            expectedGains[i] += gains[i] * probability;
                        }
                    }
                    
                    // Handle partial turns
                    let turnMultiplier = 1.0;
                    if (turn === Math.ceil(turnsToTrainAtThisFacility) - 1) {
                        const fraction = turnsToTrainAtThisFacility % 1;
                        if (fraction > 0) {
                            turnMultiplier = fraction;
                        }
                    }
                    
                    totalStatsGained.Speed += expectedGains[0] * turnMultiplier;
                    totalStatsGained.Stamina += expectedGains[1] * turnMultiplier;
                    totalStatsGained.Power += expectedGains[2] * turnMultiplier;
                    totalStatsGained.Guts += expectedGains[3] * turnMultiplier;
                    totalStatsGained.Wit! += expectedGains[4] * turnMultiplier;
                    totalStatsGained["Skill Points"]! += expectedGains[5] * turnMultiplier;
                    
                    totalTurnGains[3] += expectedGains[3] * turnMultiplier;
                    
                    if (turn === 0) {
                        totalProbability = turnProbSum;
                    }
                }
                
                console.log(`  Probability check: sum of all combo probabilities = ${(totalProbability * 100).toFixed(2)}%`);
                console.log(`  Total from card scenarios: G:${totalTurnGains[3].toFixed(1)}`);
                
                // Add base training for turns when NO cards appear
                // Calculate probability that NO cards appear
                let probabilityNoneAppear = 1.0;
                for (const card of facilityCards) {
                    probabilityNoneAppear *= (1 - card.rainbowSpecialty);
                }
                const noCardProbability = probabilityNoneAppear;
                
                let noCardGuts = 0;
                if (noCardProbability > 0) {
                    for (let turn = 0; turn < Math.ceil(turnsToTrainAtThisFacility); turn++) {
                        const facilityMultiplier = 1 + Math.min(Math.floor(turn / 4), 4) * facilityMultiplierValue;
                        
                        // Base training with just global training effectiveness
                        const baseTrainingEffectiveness = 1.0 + globalTrainingEffectiveness[index];
                        const baseStatsPerTurn = coreStats.map((stat) =>
                            Math.floor(stat * facilityMultiplier * moodBonus * baseTrainingEffectiveness)
                        );

                        // Handle partial turns
                        let turnMultiplier = 1.0;
                        if (turn === Math.ceil(turnsToTrainAtThisFacility) - 1) {
                            const fraction = turnsToTrainAtThisFacility % 1;
                            if (fraction > 0) {
                                turnMultiplier = fraction;
                            }
                        }

                        totalStatsGained.Speed += baseStatsPerTurn[0] * noCardProbability * turnMultiplier;
                        totalStatsGained.Stamina += baseStatsPerTurn[1] * noCardProbability * turnMultiplier;
                        totalStatsGained.Power += baseStatsPerTurn[2] * noCardProbability * turnMultiplier;
                        totalStatsGained.Guts += baseStatsPerTurn[3] * noCardProbability * turnMultiplier;
                        totalStatsGained.Wit! += baseStatsPerTurn[4] * noCardProbability * turnMultiplier;
                        totalStatsGained["Skill Points"]! += (baseStatsPerTurn[5] || 0) * noCardProbability * turnMultiplier;
                        
                        noCardGuts += baseStatsPerTurn[3] * noCardProbability * turnMultiplier;
                    }
                }
                
                const facilityTotal = totalTurnGains[3] + noCardGuts;
                console.log(`  From no-card scenarios: G:${noCardGuts.toFixed(1)}`);
                console.log(`  This facility total: G:${facilityTotal.toFixed(1)} (cumulative: ${(totalStatsGained.Guts || 0).toFixed(1)})\n`);
            }

            index++;
        }

        // Add race rewards
        const careerRaces = TrainingData.getRaceCareerRewards(scenarioName);
        const finaleRace = careerRaces.finaleRace || [0, 0, 0, 0, 0, 0];
        const careerRace = careerRaces.careerRace || [0, 0, 0, 0, 0, 0];
        const optionalRaceRewards = careerRaces.optionalRace || [2, 2, 2, 2, 2, 30];

        totalStatsGained.Speed += finaleRace[0] * 3 + careerRace[0] * 8 * (1 + raceBonus);
        totalStatsGained.Stamina += finaleRace[1] * 3 + careerRace[1] * 8 * (1 + raceBonus);
        totalStatsGained.Power += finaleRace[2] * 3 + careerRace[2] * 8 * (1 + raceBonus);
        totalStatsGained.Guts += finaleRace[3] * 3 + careerRace[3] * 8 * (1 + raceBonus);
        totalStatsGained.Wit! += finaleRace[4] * 3 + careerRace[4] * 8 * (1 + raceBonus);
        totalStatsGained["Skill Points"]! += finaleRace[5] * 3 + careerRace[5] * 8 * (1 + raceBonus);

        totalStatsGained.Speed += optionalRaces * optionalRaceRewards[0] * (1 + raceBonus);
        totalStatsGained.Stamina += optionalRaces * optionalRaceRewards[1] * (1 + raceBonus);
        totalStatsGained.Power += optionalRaces * optionalRaceRewards[2] * (1 + raceBonus);
        totalStatsGained.Guts += optionalRaces * optionalRaceRewards[3] * (1 + raceBonus);
        totalStatsGained.Wit! += optionalRaces * optionalRaceRewards[4] * (1 + raceBonus);
        totalStatsGained["Skill Points"]! += optionalRaces * optionalRaceRewards[5] * (1 + raceBonus);

        // Add scenario bonuses
        const scenarioBonus = TrainingData.getScenarioBonusStats(scenarioName);
        totalStatsGained.Speed += scenarioBonus.Speed || 0;
        totalStatsGained.Stamina += scenarioBonus.Stamina || 0;
        totalStatsGained.Power += scenarioBonus.Power || 0;
        totalStatsGained.Guts += scenarioBonus.Guts || 0;
        totalStatsGained.Wit! += scenarioBonus.Intelligence || 0;

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
