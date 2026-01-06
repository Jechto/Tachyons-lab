/**
 * SkillHintEvaluator - Evaluates the value of skill hints
 * Currently only evaluates gold (rarity 2) skills
 */

import { stat } from "fs";

interface SkillData {
    id: number;
    rarity: number;
    group_id: number;
    icon_id: number;
    grade_value: number;
    condition_1: string;
    skill_time_active: number;
    skill_cooldown_time: number;
    ability_type: number;
    ability_value: number;
    skill_name: string;
    skill_desc: string;
}

interface TriggerCondition {
    type: 'running_style' | 'distance_type' | 'phase' | 'position' | 'ground_type' | 'other';
    value: number;
    operator: string;
    label?: string;
}

interface ConditionNode {
    and?: ConditionNode[];
    or?: ConditionNode[];
}

export class SkillHintEvaluator {
    private skillData: SkillData;
    private raceTypes: boolean[];
    private runningTypes: boolean[];
    private wit: number;

    constructor(skillData: SkillData) {
        this.skillData = skillData;
        this.raceTypes = [false, false, false, false];
        this.runningTypes = [false, false, false, false];
        this.wit = 0;
    }

    /**
     * Evaluates the skill hint and returns its value and multiplier
     * Currently only gold skills (rarity 2) are evaluated
     * Returns [value, multiplier] tuple
     * @param deckStats - Current stats of the deck {Speed, Stamina, Power, Guts, Wit}
     * @param raceTypes - Array of booleans [Sprint, Mile, Medium, Long]
     * @param runningTypes - Array of booleans [Front Runner, Pace Chaser, Late Surger, End Closer]
     * @param statWeights - Weights for each stat {Speed, Stamina, Power, Guts, Wit}
     */
    public evaluateSkillValue(
        deckStats: {Speed: number, Stamina: number, Power: number, Guts: number, Wit: number},
        raceTypes: boolean[] = [false, false, false, false],
        runningTypes: boolean[] = [false, false, false, false],
        statWeights: {Speed: number, Stamina: number, Power: number, Guts: number, Wit: number} = {Speed: 1, Stamina: 1, Power: 1, Guts: 1, Wit: 1}
    ): [number, number] {
        // Store race and running types for use in probability calculations
        this.raceTypes = raceTypes;
        this.runningTypes = runningTypes;
        this.wit = deckStats.Wit;

        // Only evaluate gold skills (rarity 2)
        //if (this.skillData.rarity !== 2 && this.skillData.rarity !== 1) {
        //    return [0, 0];
        //}

        const raceTypeNames = ["Sprint", "Mile", "Medium", "Long"];
        const runningTypeNames = ["Front Runner", "Pace Chaser", "Late Surger", "End Closer"];
        
        const activeRaceTypes = raceTypes
            .map((active, idx) => active ? raceTypeNames[idx] : null)
            .filter(Boolean)
            .join(", ");
        
        const activeRunningTypes = runningTypes
            .map((active, idx) => active ? runningTypeNames[idx] : null)
            .filter(Boolean)
            .join(", ");

        const skillValue = this.calculateSkillValueOnly(this.skillData.ability_type,this.skillData.ability_value, statWeights);
        const procChance = this.calculateProcChance(this.skillData.condition_1);

        if (skillValue === -1) {
            console.log("=== Evaluating Unknown Skill Hint ===");
            console.log(`Skill Name: ${this.skillData.skill_name}`);
            console.log(`Skill Description: ${this.skillData.skill_desc}`);
            console.log(`Rarity: ${this.skillData.rarity} (Gold)`);
            console.log(`Grade Value: ${this.skillData.grade_value}`);
            console.log(`Ability Type: ${this.skillData.ability_type}`);
            console.log(`Ability Value: ${this.skillData.ability_value}`);
            console.log(`Condition: ${this.skillData.condition_1}`);
            console.log(`Cooldown: ${this.skillData.skill_cooldown_time}`);
            console.log(`Deck Stats: Speed=${deckStats.Speed}, Stamina=${deckStats.Stamina}, Power=${deckStats.Power}, Guts=${deckStats.Guts}, Wit=${deckStats.Wit}`);
            console.log(`Stat Weights: Speed=${statWeights.Speed}, Stamina=${statWeights.Stamina}, Power=${statWeights.Power}, Guts=${statWeights.Guts}, Wit=${statWeights.Wit}`);
            console.log(`Race Types: ${activeRaceTypes || "None"}`);
            console.log(`Running Types: ${activeRunningTypes || "None"}`);
            console.log("============================");
        }

        
        // Return tuple: [grade_value, multiplier]
        return [skillValue, procChance];
    }

    public calculateSkillValueOnly(ability_type: number,ability_value: number, statWeights: {Speed: number, Stamina: number, Power: number, Guts: number, Wit: number} = {Speed: 1, Stamina: 1, Power: 1, Guts: 1, Wit: 1}): number {
        if (ability_type === 9) { // Stamina Recovery
            return statWeights.Stamina * ability_value * 200/550; // Approximation based on in-game effectiveness, Swinging Maestro = approx 200 stam
        }
        if (ability_type === 10) { // Decrease Reaction Time
            return statWeights.Speed * ability_value * 20/4000;
        }
        if (ability_type === 27) { // Increase Speed
            return statWeights.Speed * ability_value * 60/4000;
        }
        if (ability_type === 28) { // Increase Navigation
            return 0; // Navigation currently has no stat equivalent 
        }
        if (ability_type === 31) { // Increase Acceleration
            return statWeights.Power * ability_value * 60/4000; 
        }

        return -1
    }

    public getSkillWitProcChance(wit: number): number {
        if (wit === 0) {
            return 0;
        }
        return Math.max(1-(90/wit),0.2);
    }

    public getSkillName(): string {
        return this.skillData.skill_name;
    }

    /**
     * Gets the skill icon ID
     */
    public getIconId(): number {
        return this.skillData.icon_id;
    }

    /**
     * Gets the skill rarity
     */
    public getSkillRarity(): number {
        return this.skillData.rarity;
    }

    /**
     * Checks if this is a gold skill
     */
    public isGoldSkill(): boolean {
        return this.skillData.rarity === 2;
    }

    /**
     * Parses a condition string into structured conditions
     * Example: "distance_type==1&ground_type==1@distance_type==2&ground_type==1"
     * Returns an array of OR groups, each containing AND conditions
     */
    public parseConditionString(conditionStr: string): Array<Array<{field: string, operator: string, value: number}>> {
        if (!conditionStr || conditionStr.trim() === '') {
            return [];
        }

        // Split by @ for OR conditions
        const orGroups = conditionStr.split('@');
        
        return orGroups.map(orGroup => {
            // Split by & for AND conditions
            const andConditions = orGroup.split('&');
            
            return andConditions.map(condition => {
                // Parse individual condition (e.g., "distance_type==1")
                const match = condition.trim().match(/^([a-zA-Z_]+)(==|!=|<=|>=|<|>)(.+)$/);
                
                if (!match) {
                    throw new Error(`Invalid condition format: ${condition}`);
                }
                
                const [, field, operator, valueStr] = match;
                const value = parseFloat(valueStr);
                
                if (isNaN(value)) {
                    throw new Error(`Invalid numeric value in condition: ${condition}`);
                }
                
                return {
                    field: field.trim(),
                    operator: operator,
                    value: value
                };
            });
        });
    }

    /**
     * Calculates the probability that a single condition is met
     * @param field - The field name (e.g., "distance_type", "ground_type")
     * @param operator - The comparison operator (e.g., "==", "!=", "<", ">", "<=", ">=")
     * @param value - The value to compare against
     * @returns Probability between 0 and 1
     */
    private calculateConditionProbability(field: string, operator: string, value: number): number {
        
        // Values: 1=Front Runner, 2=Pace Chaser, 3=Late Surger, 4=End Closer
        if (field === "running_style") {
            const runningStyleIndex = value - 1; // Convert 1-based to 0-based index
            
            if (runningStyleIndex < 0 || runningStyleIndex >= this.runningTypes.length) {
                return 0; 
            }
            
            if (operator === "==") {
                return this.runningTypes[runningStyleIndex] ? 1 : 0;
            } else if (operator === "!=") {
                return this.runningTypes[runningStyleIndex] ? 0 : 1;
            }
        }
        
        // Values: 1=Sprint, 2=Mile, 3=Medium, 4=Long
        if (field === "distance_type") {
            const distanceTypeIndex = value - 1; // Convert 1-based to 0-based index
            
            if (distanceTypeIndex < 0 || distanceTypeIndex >= this.raceTypes.length) {
                return 0; // Invalid distance type
            }
            
            if (operator === "==") {
                return this.raceTypes[distanceTypeIndex] ? 1 : 0;
            } else if (operator === "!=") {
                return this.raceTypes[distanceTypeIndex] ? 0 : 1;
            }
        }

        if (field === "is_badstart") {
            return 0.25;
        }
        if (field === "order_rate") {
            return 1;
        }
        if (field === "always") {
            return 1;
        }
        if (field === "is_lastspurt") {
            return 1;
        }
        if (field === "hp_per") {
            return 1;
        }
        if (field === "phase") {
            return 1;
        }
        if (field === "is_surrounded") {
            return 0.8;
        }
        if (field === "change_order_onetime") {
            return 0.8;
        }
        // Default for unimplemented field types
        return this.getSkillWitProcChance(this.wit);
    }

    /**
     * Calculates the overall proc chance for a skill based on its conditions
     * @param conditionStr - The condition string to parse and evaluate
     * @returns Probability between 0 and 1
     */
    public calculateProcChance(conditionStr: string): number {
        try {
            const parsedConditions = this.parseConditionString(conditionStr);
            
            if (parsedConditions.length === 0) {
                return 1; // No conditions means always procs
            }
            
            // Calculate probability for each OR group
            const orProbabilities = parsedConditions.map(andGroup => {
                // For AND conditions, multiply probabilities (all must be true)
                let andProbability = 1;
                
                for (const condition of andGroup) {
                    const condProb = this.calculateConditionProbability(
                        condition.field,
                        condition.operator,
                        condition.value
                    );
                    andProbability *= condProb;
                }
                
                return andProbability;
            });
            
            // For OR conditions, calculate: 1 - product(1 - p_i)
            // This is the probability that at least one OR group is true
            let finalProbability = 0;
            for (const orProb of orProbabilities) {
                finalProbability = finalProbability + orProb - (finalProbability * orProb);
            }
            
            return finalProbability;
        } catch (error) {
            console.error(`Error calculating proc chance: ${error}`);
            return 0;
        }
    }
}
