// Training data constants ported from training_data.py
export class TrainingData {
    private static readonly baseStats = {
        URA: {
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
                Speed: 1200,
                Stamina: 1200,
                Power: 1200,
                Guts: 1200,
                Intelligence: 1200
            },
            raceCareerRewards: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                optionalRace: [1, 1, 1, 1, 1, 45],
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
        Unity: {
            // A flat assumption of an average 2 UMA unity training (white flame training). With the rare 3 Uma trainings (+1 to second stat)
            training: {
                Speed: [8+2, 0, 4, 0, 0, 4, -19],
                Stamina: [0, 8+2, 0, 6, 0, 4, -20],
                Power: [0, 4, 9+2, 0, 0, 4, -20],
                Guts: [3, 0, 3, 6+2, 0, 4, -22],
                Intelligence: [3, 0, 0, 0, 10+1, 5, 0],
            },
            facilityMultipliers: {
                Speed: 1 / 8,
                Stamina: 1 / 8,
                Power: 1 / 9,
                Guts: 1 / 6,
                Intelligence: 1 / 10,
            },
            maxStats: {
                Speed: 1200,
                Stamina: 1200,
                Power: 1200,
                Guts: 1200,
                Intelligence: 1200
            },
            raceCareerRewards: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
                optionalRace: [1, 1, 1, 1, 1, 45], // +5 to random stat -15 stam
            },
            // 31 are the level up rewards F -> S
            scenarioBonusStats: {
                Speed: 15+31,
                Stamina: 15+31,
                Power: 15+31,
                Guts: 15+31,
                Intelligence: 15+31,
            },
            scenarioTrainingDistributedBonusStats: 8*15+8*7, // 8 spirit bursts of 15 mainstat + 7 substat each assumed
        }
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
}
