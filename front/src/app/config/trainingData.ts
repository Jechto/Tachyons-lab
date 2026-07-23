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
            // Base training gains (Facility Level 1). Facility levels up every 4
            // trainings at that facility, like URA Finale. These are the RAW guide
            // values — the progressive CONCERT BONUSES (Friendship Bonus and
            // Speciality Priority Up) are NOT folded in here; they are modelled
            // per-card via `cardBuffs` (see below) so that decks stacked with
            // friendship / specialty cards benefit more, matching the scenario's
            // design and the guide's "increases ... of all your Support Cards".
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
            // Flat one-time stats from the LESSONS economy (Mastery bonuses are one
            // time by definition per the guide, so they live here — NOT in the
            // distributed lump). Conservatively capped by the Performance-Points
            // economy (~840 PP over a run, shared with energy/SP/skill lessons):
            //   - 5 Concert Great Successes (~4/5 assumed great): +40 all
            //   - GIRLS' LEGEND U (18 Songs achieved):            +10 all
            //   - Technique Lessons (stat-type, ~1/3 of ~47):     +20 all
            //   - Song Mastery flat stat grants (e.g. Full Speed
            //     Ahead Speed+22, Treasure Box Speed+26, ...):   +25 all
            // (Note: "Make Debut!" raises Performance Point *caps*, not stats.)
            scenarioBonusStats: {
                Speed: 40 + 10 + 20 + 25,
                Stamina: 40 + 10 + 20 + 25,
                Power: 40 + 10 + 20 + 25,
                Guts: 40 + 10 + 20 + 25,
                Intelligence: 40 + 10 + 20 + 25,
            },
            scenarioTrainingDistributedBonusStats: 0,
            // PROGRESSIVE CARD BUFFS, modelled as the time-weighted average of the
            // cumulative buff active over the ~70 trainable career turns, then
            // applied PER-CARD in DeckEvaluator (added to each card's own bonus).
            // Generic name (`cardBuffs`) so future scenarios can reuse the same
            // mechanism for any per-card progressive bonus.
            //
            // For Grand Concert these are the Concert Bonuses that take effect
            // after the next concert and last the rest of the career:
            // "Active share" = fraction of remaining turns a Song bought before a
            // given concert is active for:
            //   start / "+4 turns": 0.90  | after C1: 0.73 | after C2: 0.56
            //   after C3: 0.39                | senior Dec: 0.15
            //
            //   Speciality Priority Up +5 (per Song):
            //     Make Debut! (auto, +4 turns):  5 * 0.90 = 4.50
            //     Believe in Miracles (start):   5 * 0.95 = 4.75
            //     Run For Our Dream (after C1):  5 * 0.73 = 3.65
            //     => time-weighted avg ~ +12 (rounded down)
            //
            //   Friendship Bonus (+5% / +10% per Song):
            //     RUNxRUN (start):               5 * 0.95 = 4.75
            //     Treasure Box (after C3, +10): 10 * 0.39 = 3.90
            //     GIRLS' LEGEND U (18-Song goal, 10 * 0.15 = 1.50
            //       senior Dec, +10):
            //     => time-weighted avg ~ +10
            //
            // Applied per-card so a deck stacked with high-Friendship-Bonus /
            // high-Specialty-Priority cards benefits more (matching the guide:
            // "Friendship Bonus +X%" / "Speciality Priority Up +5" apply to ALL
            // your Support Cards). Note: as a uniform career-average applied to
            // every appearance, this flattens the back-loading (the buffs really
            // concentrate in late high-facility-level turns) — an acceptable
            // approximation; cards without a given bonus (cardBonus === -1) are
            // skipped at the injection sites so friend/group cards are unaffected.
            cardBuffs: {
                "Specialty Priority": 12,
                "Friendship Bonus": 10,
            },
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

    // Progressive per-card buffs granted by a scenario's mechanics (currently used
    // by Grand Concert's Concert Bonuses: Speciality Priority Up and Friendship
    // Bonus). Returned in the SAME units as SupportCard.cardBonus (Specialty
    // Priority in priority points; Friendship Bonus in percentage points).
    // Defaults to 0 for scenarios that have no such mechanic (MANT / Unity / URA).
    // Adding new scenarios: add a `cardBuffs` entry to baseStats with the same
    // keys (or extend this return type) and the per-card injection in
    // DeckEvaluator picks them up automatically.
    static getCardBuffs(
        scenarioName: string = "URA",
    ): { "Specialty Priority": number; "Friendship Bonus": number } {
        const buffs = (this.baseStats as Record<string, { cardBuffs?: { "Specialty Priority": number; "Friendship Bonus": number } }>)[
            scenarioName
        ]?.cardBuffs;
        return buffs ?? { "Specialty Priority": 0, "Friendship Bonus": 0 };
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
