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

export class SkillHintEvaluator {
    private skillData: SkillData;

    constructor(skillData: SkillData) {
        this.skillData = skillData;
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

        if (skillValue === -1) {
            console.log("=== Evaluating Skill Hint ===");
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
        // Multiplier is always 1 for now
        return [skillValue, 1];
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

    public getSkillName(): string {
        return this.skillData.skill_name;
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
}
