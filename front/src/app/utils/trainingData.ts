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
            raceCareerRewards: {
                finaleRace: [10, 10, 10, 10, 10, 60],
                careerRace: [3, 3, 3, 3, 3, 45],
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
}
