// Blue spark configuration: a player can equip up to 6 blue sparks, each tied to
// a stat (Speed/Stamina/Power/Guts/Wit) with a star rank that grants a cap raise
// and flat starting stats.
export type SparkStar = 1 | 2 | 3;

export interface SparkSlot {
    stat: string | null; // "Speed" | "Stamina" | "Power" | "Guts" | "Wit" | null
    star: SparkStar | null;
}

export const MAX_SPARKS = 6;

// star -> { cap raise, flat stats }
export const SPARK_BONUSES: Record<SparkStar, { cap: number; stats: number }> = {
    1: { cap: 4, stats: 5 },
    2: { cap: 9, stats: 12 },
    3: { cap: 16, stats: 21 },
};

// Training data constants ported from training_data.py
export class TrainingData {
    private static readonly baseStats = {
        MANT: {
            name: "Trackblazers",
            // Assuming a 30% stat increase from base stats (megaphone)
            training: {
                Speed: [8*1.3, 0, 4*1.3, 0, 0, 2*1.3, -19],
                Stamina: [0, 7*1.3, 0, 3*1.3, 0, 2*1.3, -17],
                Power: [0, 4*1.3, 6*1.3, 0, 0, 2*1.3, -18],
                Guts: [3*1.3, 0, 3*1.3, 6*1.3, 0, 4*1.3, -20],
                Intelligence: [2*1.3, 0, 0, 0, 6*1.3, 3*1.3, 5],
            },
            facilityMultipliers: {
                Speed: 1 / 8,
                Stamina: 1 / 7,
                Power: 1 / 6,
                Guts: 1 / 6,
                Intelligence: 1 / 6,
            },
            maxStats: {
                Speed: 1200,
                Stamina: 1900,
                Power: 1200,
                Guts: 1200,
                Intelligence: 1500
            },
            ForcedRaces: 0,
            DefaultOptional: [2+6+8, 5+5+5, 1+0+0], // G1, G2or3, PreOPorOP
            raceCareerRewards: {
                finaleRace: [10*1.35, 10*1.35, 10*1.35, 10*1.35, 10*1.35, 60*1.35], // assuming we use 3 golden hammers on finale.
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2*1.2, 2*1.2, 2*1.2, 2*1.2, 2*1.2, 45*1.2], // assuming we use normal hammers on G1s
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            raceCareerRewardsFixed: { // Assuming we have 2.5 scrolls to use after each race. scrolls are random. 
                finaleRace: [0, 0, 0, 0, 0, 0],
                careerRace: [0, 0, 0, 0, 0, 0],
                G1: [3*2.5, 3*2.5, 3*2.5, 3*2.5, 3*2.5, 0],
                G2or3: [3*2.5, 3*2.5, 3*2.5, 3*2.5, 3*2.5, 0],
                PreOPorOP: [3*2.5, 3*2.5, 3*2.5, 3*2.5, 3*2.5, 0],
            },
            // 31 are the level up rewards F -> S
            scenarioBonusStats: {
                Speed: 15+21+10,
                Stamina: 15+21+10,
                Power: 15+21+10,
                Guts: 15+21+10,
                Intelligence: 15+21+10,
            },
            scenarioTrainingDistributedBonusStats: 0,
        },
        Unity: {
            name: "Unity Cup",
            // A flat assumption of an average 2 UMA unity training (white flame training). With the rare 3 Uma trainings (+0.25 to second stat)
            training: {
                Speed: [8+2, 0, 4+0.25, 0, 0, 4, -19],
                Stamina: [0, 8+2, 0, 6+0.25, 0, 4, -20],
                Power: [0, 4+0.25, 9+2, 0, 0, 4, -20],
                Guts: [3+0.125, 0, 3+0.125, 6+2, 0, 4, -22],
                Intelligence: [3+0.25, 0, 0, 0, 10+1, 5, 0],
            },
            facilityMultipliers: {
                Speed: 1 / 8,
                Stamina: 1 / 8,
                Power: 1 / 9,
                Guts: 1 / 6,
                Intelligence: 1 / 10,
            },
            maxStats: {
                Speed: 1300,
                Stamina: 1300,
                Power: 1300,
                Guts: 1300,
                Intelligence: 1500
            },
            ForcedRaces: 8,
            DefaultOptional: [0, 0, 0], // G1, G2or3, PreOPorOP
            raceCareerRewards: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2, 2, 2, 2, 2, 45],
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            raceCareerRewardsFixed: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2, 2, 2, 2, 2, 45],
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            // 41 are the level up rewards F -> S+
            scenarioBonusStats: {
                Speed: 15+41,
                Stamina: 15+41,
                Power: 15+41,
                Guts: 15+41,
                Intelligence: 15+41,
            },
            scenarioTrainingDistributedBonusStats: 8*30+8*15+8*7, // 8 spirit bursts of 15 mainstat + 7 substat each assumed ( updated with 8 super spirit bursts of 30 mainstats aswell)
        },
        URA: {
            name: "URA Finals",
            training: {
                Speed: [10, 0, 5, 0, 0, 2, -21],
                Stamina: [0, 9, 0, 4, 0, 2, -19],
                Power: [0, 5, 8, 0, 0, 2, -20],
                Guts: [4, 0, 4, 8, 0, 2, -22],
                Intelligence: [2, 0, 0, 0, 9, 4, 5],
            },
            facilityMultipliers: {
                Speed: 1 / 10,
                Stamina: 1 / 9,
                Power: 1 / 8,
                Guts: 1 / 8,
                Intelligence: 1 / 9,
            },
            maxStats: {
                Speed: 1400,
                Stamina: 1400,
                Power: 1400,
                Guts: 1400,
                Intelligence: 1400
            },
            ForcedRaces: 8,
            DefaultOptional: [0, 0, 0], // G1, G2or3, PreOPorOP
            raceCareerRewards: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2, 2, 2, 2, 2, 45],
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            raceCareerRewardsFixed: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2, 2, 2, 2, 2, 45],
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            scenarioBonusStats: {
                Speed: 15,
                Stamina: 15,
                Power: 15,
                Guts: 15,
                Intelligence: 15,
            },
            scenarioTrainingDistributedBonusStats: 0,
        },
        GrandConcert: {
            name: "Grand Concert",
            // Base training gains (Facility Level 1). Facility levels up every 4 trainings
            // at that facility, like URA Finale.
            training: {
                Speed: [8, 0, 4, 0, 0, 4, -19],
                Stamina: [0, 8, 0, 6, 0, 4, -20],
                Power: [0, 4, 9, 0, 0, 4, -20],
                Guts: [2, 0, 2, 7, 0, 4, -20],
                Intelligence: [2, 0, 0, 0, 6, 5, 5],
            },
            // Per-level facility growth derived from the level table:
            // multiplier = 1 + min(floor(turn/4), 4) * facilityMultiplier.
            facilityMultipliers: {
                Speed: 1 / 8,
                Stamina: 1 / 8,
                Power: 1 / 9,
                Guts: 1 / 7,
                Intelligence: 1 / 6,
            },
            maxStats: {
                Speed: 1600,
                Stamina: 1300,
                Power: 1300,
                Guts: 1500,
                Intelligence: 1300
            },
            // 5 forced Concerts (end of each half-year); they consume a turn like races.
            ForcedRaces: 5,
            // Races give no Performance Points, so optional races are skipped.
            DefaultOptional: [0, 0, 0], // G1, G2or3, PreOPorOP
            raceCareerRewards: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2, 2, 2, 2, 2, 45],
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            raceCareerRewardsFixed: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                G1: [2, 2, 2, 2, 2, 45],
                G2or3: [1.5, 1.5, 1.5, 1.5, 1.5, 30],
                PreOPorOP: [1, 1, 1, 1, 1, 15],
            },
            // Flat scenario bonuses: 5 Concert Great Successes (+10 all stats each),
            // plus Make Debut! (+10 all stats), plus Technique Lesson stat gains.
            scenarioBonusStats: {
                Speed: 60 + 10 + 20,
                Stamina: 60 + 10 + 20,
                Power: 60 + 10 + 20,
                Guts: 60 + 10 + 20,
                Intelligence: 60 + 10 + 20,
            },
            // Song training bonuses (e.g. Speed/Wit Training +1/+2, SP Bonus, Friendship Bonus)
            // averaged over the career, folded in like Unity's spirit bursts.
            scenarioTrainingDistributedBonusStats: 4 * 30, // ~4 Song training bonuses of ~+1.5 avg per relevant training
        },
    };

    static getBaseTrainingStats(
        scenarioName: string = "URA",
    ): Record<string, number[]> {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.training || {}
        );
    }

    static getFacilityMultipliers(
        scenarioName: string = "URA",
    ): Record<string, number> {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.facilityMultipliers || {}
        );
    }

    static getRaceCareerRewards(
        scenarioName: string = "URA",
    ): Record<string, number[]> {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.raceCareerRewards || {}
        );
    }

    static getRaceCareerRewardsFixed(
        scenarioName: string = "URA",
    ): Record<string, number[]> {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.raceCareerRewardsFixed || {}
        );
    }

    static getScenarioBonusStats(
        scenarioName: string = "URA",
    ): Record<string, number> {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.scenarioBonusStats || {
                    Speed: 0,
                    Stamina: 0,
                    Power: 0,
                    Guts: 0,
                    Intelligence: 0,
                }
        );
    }

    static getScenarioTrainingDistributedBonusStats(
        scenarioName: string = "URA",
    ): number {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.scenarioTrainingDistributedBonusStats || 0
        );
    }

    static getMaxStats(
        scenarioName: string = "URA",
    ): Record<string, number> {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.maxStats || {
                    Speed: 1200,
                    Stamina: 1200,
                    Power: 1200,
                    Guts: 1200,
                    Intelligence: 1200,
                }
        );
    }

    // Soft cap: training gains above this threshold are halved for all scenarios (JP update).
    static readonly SOFT_STAT_CAP = 1200;

    // Converts a raw stat total into its effective value under the soft-cap rules:
    //   - at/below 1200: unchanged
    //   - between 1200 and the scenario max: 1200 + (raw - 1200) / 2 (halved gains)
    //   - above the scenario max: clamped to 1200 + (max - 1200) / 2
    static getEffectiveStat(rawValue: number, maxVal: number): number {
        if (rawValue <= this.SOFT_STAT_CAP) return rawValue;
        const cappedRaw = Math.min(rawValue, maxVal);
        return this.SOFT_STAT_CAP + (cappedRaw - this.SOFT_STAT_CAP) / 2;
    }

    // Sums equipped blue sparks into per-stat cap and flat-stat bonuses.
    // Keys are aligned with maxStats (Wit is stored as "Intelligence").
    static getSparkBonuses(sparks: SparkSlot[] = []): {
        capBonus: Record<string, number>;
        flatStats: Record<string, number>;
    } {
        const capBonus: Record<string, number> = {};
        const flatStats: Record<string, number> = {};

        for (const spark of sparks) {
            if (!spark || !spark.stat || !spark.star) continue;
            const bonus = SPARK_BONUSES[spark.star];
            if (!bonus) continue;
            const statKey = spark.stat === "Wit" ? "Intelligence" : spark.stat;
            capBonus[statKey] = (capBonus[statKey] || 0) + bonus.cap;
            flatStats[statKey] = (flatStats[statKey] || 0) + bonus.stats;
        }

        return { capBonus, flatStats };
    }

    static getForcedRaces(
        scenarioName: string = "URA",
    ): number {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.ForcedRaces || 0
        );
    }

    static getDefaultOptional(
        scenarioName: string = "URA",
    ): number[] {
        return (
            this.baseStats[scenarioName as keyof typeof this.baseStats]
                ?.DefaultOptional || [0, 0, 0]
        );
    }

    static getScenarios(): Array<{ key: string; name: string }> {
        return Object.entries(this.baseStats).map(([key, data]) => ({
            key,
            name: data.name,
        }));
    }

    static getScenarioName(scenarioKey: string): string {
        return (
            this.baseStats[scenarioKey as keyof typeof this.baseStats]?.name || scenarioKey
        );
    }
}
