import { parseSignedInt } from "../utils/helpers";
import {
    CardData,
    CardBonus,
    CardEffect,
    StatsDict,
    HintData,
    HintEvaluation,
    HintResult,
    AllEvents,
    EventData,
} from "../types/cardTypes";
import { SkillHintEvaluator } from "./SkillHintEvaluator";

/**
 * SupportCard - Quantitative analysis engine for card performance
 * Applies scientific methodology to calculate training effectiveness
 * Following the Tachyon principle: Precision through mathematical modeling
 */
export class SupportCard {
    private static readonly nameToLmb: Record<number, string> = {
        0: "0lb",
        1: "1lb",
        2: "2lb",
        3: "3lb",
        4: "mlb",
    };

    private static readonly lmbToName: Record<string, number> = {
        "0lb": 0,
        "1lb": 1,
        "2lb": 2,
        "3lb": 3,
        mlb: 4,
    };

    public readonly id: number;
    public readonly limitBreak: number;
    public readonly cardUma: { name: string; id: number };
    public readonly cardType: { type: string; id: number };
    public readonly rarity: number;
    public readonly hints: HintData[];
    public readonly eventsStatReward: StatsDict;
    public readonly cardBonus: CardBonus;
    public turnsToMaxBond: number = 0;
    public maxFriendshipTurns: number = 0;

    constructor(id: number, limitBreak: number, allData: CardData[]) {
        this.id = id;
        this.limitBreak = limitBreak;

        const cardData = allData.find((entry) => entry.id === this.id);
        if (!cardData) {
            throw new Error(`SupportCard with id ${id} not found in data.`);
        }

        const effects = cardData.effects || [];
        const uniqueEffects = cardData.unique_effects || [];

        this.cardUma = {
            name: cardData.card_chara_name || "Unknown",
            id: cardData.chara_id_card || -1,
        };

        this.cardType = {
            type: cardData.prefered_type || "Unknown",
            id: cardData.prefered_type_id || -1,
        };

        this.rarity = cardData.rarity || -1;
        // Combine regular hints and event hints
        this.hints = [...(cardData.hints_table || []), ...(cardData.hints_event_table || [])];
        this.eventsStatReward = this.findBestEventChoice(
            cardData.all_events || { chain_events: [], dates: [], special_events: [], random_events: [] },
        );

        // Initialize card bonus with all effect names set to -1
        const effectNames = [
            "Friendship Bonus",
            "Mood Effect",
            "Speed Bonus",
            "Stamina Bonus",
            "Power Bonus",
            "Guts Bonus",
            "Wit Bonus",
            "Training Effectiveness",
            "Initial Speed",
            "Initial Stamina",
            "Initial Power",
            "Initial Guts",
            "Initial Wit",
            "Initial Friendship Gauge",
            "Race Bonus",
            "Fan Bonus",
            "Hint Levels",
            "Hint Frequency",
            "Specialty Priority",
            "Max Speed",
            "Max Stamina",
            "Max Power",
            "Max Guts",
            "Max Wit",
            "Event Recovery",
            "Event Effectiveness",
            "Failure Protection",
            "Energy Cost Reduction",
            "Minigame Effectiveness",
            "Skill Point Bonus",
            "Wit Friendship Recovery",
        ];

        const cardBonus = {} as Record<string, number>;
        effectNames.forEach((name) => {
            cardBonus[name] = -1;
        });

        // Use nameToLmb to convert limitBreak to the string key for effect lookup
        const lbKey = SupportCard.nameToLmb[this.limitBreak] || "mlb";

        for (const effect of effects) {
            const typeName = effect.type_name;
            if (typeName in cardBonus) {
                const value = (effect as CardEffect)[lbKey as keyof CardEffect];
                cardBonus[typeName] = typeof value === 'number' ? value : -1;
            }
        }

        // Note: Unique effects are now baked into the base effects during preprocessing
        // No need to process uniqueEffects here anymore
        
        this.cardBonus = cardBonus as unknown as CardBonus;
    }

    private evalStatArray(statDict: StatsDict): number {
        const weights = {
            Speed: 1,
            Stamina: 1,
            Power: 1,
            Guts: 1,
            Intelligence: 1,
            Energy: 2,
            Potential: 0.2, // Skill points
            Bond: 0,
        };

        let sum = 0;
        for (const [key, weight] of Object.entries(weights)) {
            const value = (statDict as unknown as Record<string, number>)[key] || 0;
            sum += value * weight;
        }
        return sum;
    }

    private findBestEventChoice(allEvents: AllEvents): StatsDict {
        const statKeys = [
            "Speed",
            "Stamina",
            "Power",
            "Guts",
            "Wit",
            "Energy",
            "Potential",
            "Bond",
            "Skill Hint",
        ];

        const totalBestStats: Record<string, number> = {};
        statKeys.forEach((key) => {
            totalBestStats[key] = 0;
        });

        const processEvents = (events: EventData[], isRandom: boolean = false) => {
            const accumulatedStats: Record<string, number> = {};
            statKeys.forEach((key) => {
                accumulatedStats[key] = 0;
            });

            for (const arrowEvent of events) {
                let bestEval = 0;
                const bestStats: Record<string, number> = {};
                statKeys.forEach((key) => {
                    bestStats[key] = 0;
                });

                for (const choice of arrowEvent.choices || []) {
                    // Split rewards by "di" separator - each section is a mutually exclusive outcome
                    const rewardGroups: Array<Array<{ type: string; value: string }>> = [];
                    let currentGroup: Array<{ type: string; value: string }> = [];
                    
                    for (const reward of choice.rewards || []) {
                        if (reward.type === "di") {
                            if (currentGroup.length > 0) {
                                rewardGroups.push(currentGroup);
                                currentGroup = [];
                            }
                        } else {
                            currentGroup.push(reward);
                        }
                    }
                    
                    // Add the last group if it exists
                    if (currentGroup.length > 0) {
                        rewardGroups.push(currentGroup);
                    }
                    
                    // If no groups (no rewards or all were "di"), skip this choice
                    if (rewardGroups.length === 0) {
                        continue;
                    }
                    
                    // Calculate expected value across all reward groups
                    const currentStatsForChoice: Record<string, number> = {};
                    statKeys.forEach((key) => {
                        currentStatsForChoice[key] = 0;
                    });
                    
                    // For groups with "di", pick the best group instead of averaging
                    // This represents choosing the best RNG outcome
                    if (rewardGroups.length > 1) {
                        let bestGroupStats: Record<string, number> | null = null;
                        let bestGroupEval = -Infinity;
                        
                        for (const group of rewardGroups) {
                            const groupStats: Record<string, number> = {};
                            statKeys.forEach((key) => {
                                groupStats[key] = 0;
                            });
                            
                            // Check if this group has "ee" (ends event chain)
                            const groupHasEe = group.some(reward => reward.type === "ee");
                            
                            for (const reward of group) {
                                const rtype = reward.type;
                                // Handle "All Stats" type - add value to all 5 main stats
                                if (rtype === "All Stats") {
                                    const value = parseSignedInt(reward.value);
                                    groupStats["Speed"] += value;
                                    groupStats["Stamina"] += value;
                                    groupStats["Power"] += value;
                                    groupStats["Guts"] += value;
                                    groupStats["Wit"] += value;
                                } else if (rtype === "Intelligence") {
                                    // Map "Intelligence" from events to "Wit" in stats
                                    groupStats["Wit"] += parseSignedInt(reward.value);
                                } else if (rtype in groupStats) {
                                    groupStats[rtype] += parseSignedInt(reward.value);
                                }
                            }
                            
                            let groupEval = this.evalStatArray(groupStats as unknown as StatsDict);
                            
                            // Heavily penalize groups that end the event chain
                            if (groupHasEe) {
                                groupEval -= 1000;
                            }
                            
                            if (groupEval > bestGroupEval) {
                                bestGroupEval = groupEval;
                                bestGroupStats = groupStats;
                            }
                        }
                        
                        // Use the best group's stats
                        if (bestGroupStats) {
                            Object.assign(currentStatsForChoice, bestGroupStats);
                        }
                    } else {
                        // Only one group, use it directly
                        const group = rewardGroups[0];
                        const groupStats: Record<string, number> = {};
                        statKeys.forEach((key) => {
                            groupStats[key] = 0;
                        });
                        
                        for (const reward of group) {
                            const rtype = reward.type;
                            // Handle "All Stats" type - add value to all 5 main stats
                            if (rtype === "All Stats") {
                                const value = parseSignedInt(reward.value);
                                groupStats["Speed"] += value;
                                groupStats["Stamina"] += value;
                                groupStats["Power"] += value;
                                groupStats["Guts"] += value;
                                groupStats["Wit"] += value;
                            } else if (rtype === "Intelligence") {
                                // Map "Intelligence" from events to "Wit" in stats
                                groupStats["Wit"] += parseSignedInt(reward.value);
                            } else if (rtype in groupStats) {
                                groupStats[rtype] += parseSignedInt(reward.value);
                            }
                        }
                        
                        Object.assign(currentStatsForChoice, groupStats);
                    }

                    const evalResult = this.evalStatArray(
                        currentStatsForChoice as unknown as StatsDict,
                    );
                    
                    if (evalResult > bestEval) {
                        bestEval = evalResult;
                        Object.assign(bestStats, currentStatsForChoice);
                    }
                }

                // Add best_stats for that event unto total best stats for that event chain
                for (const k of statKeys) {
                    accumulatedStats[k] += bestStats[k];
                }
            }

            if (isRandom && events.length > 0) {
                const expectedRandomEvents = 1;
                for (const k of statKeys) {
                    totalBestStats[k] += (accumulatedStats[k] / events.length) * expectedRandomEvents;
                }
            } else {
                for (const k of statKeys) {
                    totalBestStats[k] += accumulatedStats[k];
                }
            }
        };

        processEvents(allEvents.chain_events || []);
        processEvents(allEvents.dates || []);
        processEvents(allEvents.special_events || []);
        processEvents(allEvents.random_events || [], true);

        return totalBestStats as unknown as StatsDict;
    }

    private parseCondition(conditionStr?: string): Record<string, unknown> {
        if (!conditionStr || conditionStr.trim() === "") {
            return {};
        }

        const operators = ["==", "!=", ">=", "<=", ">", "<"];
        const opPattern = /(==|!=|>=|<=|>|<)/;

        const parseAtom = (atom: string) => {
            const match = atom.match(opPattern);
            if (!match) {
                throw new Error(
                    `Invalid condition: ${atom}, full string: ${conditionStr}`,
                );
            }
            const op = match[1];
            const [key, value] = atom.split(op);
            return { [key.trim()]: { op, value: value.trim() } };
        };

        const orParts = conditionStr.split("@");
        const orList = [];

        for (const orPart of orParts) {
            const andParts = orPart.split("&");
            const andList = [];
            for (const andPart of andParts) {
                andList.push(parseAtom(andPart));
            }
            if (andList.length === 1) {
                orList.push(andList[0]);
            } else {
                orList.push({ and: andList });
            }
        }

        if (orList.length === 1) {
            return orList[0];
        } else {
            return { or: orList };
        }
    }

    private parseTrigger(condition: unknown, triggerType: string): number {
        if (!condition) {
            return 0;
        }

        const conditionObj = condition as Record<string, unknown>;
        
        // If this is an OR node
        if (conditionObj.or) {
            for (const sub of conditionObj.or as unknown[]) {
                const result = this.parseTrigger(sub, triggerType);
                if (result !== 0) {
                    return result;
                }
            }
            return 0;
        }

        // If this is an AND node
        if (conditionObj.and) {
            for (const sub of conditionObj.and as unknown[]) {
                const result = this.parseTrigger(sub, triggerType);
                if (result !== 0) {
                    return result;
                }
            }
            return 0;
        }

        // Otherwise, check if this node is the trigger_type
        if (conditionObj[triggerType]) {
            const val = conditionObj[triggerType] as Record<string, unknown>;
            // val can be a dict like {"op": "==", "value": "1"}
            if (typeof val === "object" && val.op === "==") {
                try {
                    return parseInt((val.value as string) || "0");
                } catch {
                    return 0;
                }
            }
        }
        return 0;
    }

    public extractSkillHints(): HintEvaluation[] {
        const allHints: HintEvaluation[] = [];

        for (const cardHint of this.hints) {
            const skillData = cardHint.skill_data || {};
            const condition = this.parseCondition(skillData.condition_1);

            allHints.push({
                id: cardHint.skill_id || 0,
                name: skillData.skill_name || "Unknown",
                desc: skillData.skill_desc || "No description available.",
                running_style_trigger: this.parseTrigger(
                    condition,
                    "running_style",
                ),
                distance_type_trigger: this.parseTrigger(
                    condition,
                    "distance_type",
                ),
            });
        }

        return allHints;
    }

    public extractHintTypes(): string[] {
        const hintTypes = new Set<string>();
        
        for (const cardHint of this.hints) {
            const skillData = cardHint.skill_data || {};
            const condition = this.parseCondition(skillData.condition_1);
            
            // Check for running style specific hints
            const runningStyleTrigger = this.parseTrigger(condition, "running_style");
            if (runningStyleTrigger > 0) {
                const runningStyles = ["Front Runner", "Pace Chaser", "Late Surger", "End Closer"];
                if (runningStyleTrigger <= runningStyles.length) {
                    hintTypes.add(runningStyles[runningStyleTrigger - 1]);
                }
            }
            
            // Check for distance type specific hints
            const distanceTrigger = this.parseTrigger(condition, "distance_type");
            if (distanceTrigger > 0) {
                const distanceTypes = ["Sprint", "Mile", "Medium", "Long"];
                if (distanceTrigger <= distanceTypes.length) {
                    hintTypes.add(distanceTypes[distanceTrigger - 1]);
                }
            }
            
            // If no specific conditions, it's a general hint
            if (runningStyleTrigger === 0 && distanceTrigger === 0) {
                hintTypes.add("General");
            }
        }
        
        return Array.from(hintTypes);
    }

    public evaluateCardHints(
        raceTypes: boolean[] = [false, false, false, false],
        runningTypes: boolean[] = [false, false, false, false],
        optionalRaces: {G1: number, G2or3: number, PreOPorOP: number} = {G1: 0, G2or3: 0, PreOPorOP: 0},
        deckStats?: {Speed: number, Stamina: number, Power: number, Guts: number, Wit: number},
        statWeights?: {Speed: number, Stamina: number, Power: number, Guts: number, Wit: number},
    ): HintResult {
        const totalOptionalRaces = optionalRaces.G1 + optionalRaces.G2or3 + optionalRaces.PreOPorOP;
        const maxTrainingTurns = 72 + 6 - 11 - totalOptionalRaces;
        const hintFreq =
            (0.075 * (this.cardBonus["Hint Frequency"] + 100)) / 100;
        const hintFromEvents = this.eventsStatReward["Skill Hint"] || 0;

        let hintLevels = this.cardBonus["Hint Levels"];
        if (hintLevels <= 0) {
            hintLevels = 1;
        }

        const cardHints = this.extractSkillHints();
        let usefulHintCount = 0;
        const goldSkills: Array<{ name: string; value: number; multiplier: number; icon_id: number }> = [];

        // Default deck stats if not provided
        const stats = deckStats || {Speed: 0, Stamina: 0, Power: 0, Guts: 0, Wit: 0};
        const weights = statWeights || {Speed: 1, Stamina: 1, Power: 1, Guts: 1, Wit: 1};

        for (const hint of cardHints) {
            const distanceTypeTrigger = hint.distance_type_trigger;
            if (distanceTypeTrigger !== 0) {
                if (raceTypes[distanceTypeTrigger - 1] === false) {
                    // skill doesn't match race type
                    continue;
                }
            }

            const runningStyleTrigger = hint.running_style_trigger;
            if (runningStyleTrigger !== 0) {
                if (runningTypes[runningStyleTrigger - 1] === false) {
                    // skill doesn't match running style
                    continue;
                }
            }

            usefulHintCount += 1;

            // Calculate gold skill value for useful hints
            const hintData = this.hints.find(h => h.skill_id === hint.id);
            if (hintData?.skill_data) {
                const skillEvaluator = new SkillHintEvaluator(hintData.skill_data);
                if (skillEvaluator.isGoldSkill()) {
                    const [value, multiplier] = skillEvaluator.evaluateSkillValue(stats, raceTypes, runningTypes, weights);
                    if (value > 0) {
                        goldSkills.push({
                            name: skillEvaluator.getSkillName(),
                            value: value,
                            multiplier: multiplier,
                            icon_id: skillEvaluator.getIconId(),
                        });
                    }
                }
            }
        }

        const usefulHintsRate =
            cardHints.length > 0 ? usefulHintCount / cardHints.length : 0;
        const hintsFromTraining =
            maxTrainingTurns * hintFreq * hintLevels * usefulHintsRate;
        
        // Only count useful hints for scoring
        const usefulHintsFromEvents = hintFromEvents * usefulHintsRate;
        const totalUsefulHints = usefulHintsFromEvents + hintsFromTraining;

        return {
            hint_frequency: hintFreq,
            hints_from_events: hintFromEvents,
            useful_hints_rate: usefulHintsRate,
            "hints from training": hintsFromTraining,
            total_hints: totalUsefulHints,
            gold_skills: goldSkills,
        };
    }
}
