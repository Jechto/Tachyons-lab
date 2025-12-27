// Centralized configuration for penalty calculations
// This ensures consistency across all penalty calculation methods

export interface PenaltyConfig {
    stamina: {
        thresholds: Record<string, number>;
        penalties: {
            major: number; // Penalty when significantly below threshold
            minor: number; // Penalty when slightly below threshold
            buffer: number; // Buffer zone (threshold - buffer = major penalty trigger)
        };
    };
    speed: {
        thresholds: Record<string, number>;
        penalties: {
            major: number; // Penalty when significantly below threshold
            minor: number; // Penalty when slightly below threshold
            buffer: number; // Buffer zone (threshold - buffer = major penalty trigger)
        };
    };
    hints: {
        thresholds: {
            major: number; // Below this rate = major penalty
            minor: number; // Below this rate = minor penalty
        };
        penalties: {
            major: number; // 20% penalty
            minor: number; // 10% penalty
        };
    };
}

// Default penalty configuration
export const DEFAULT_PENALTY_CONFIG: PenaltyConfig = {
    stamina: {
        thresholds: {
            Sprint: 200,
            Mile: 300,
            Medium: 400,
            Long: 500,
        },
        penalties: {
            major: 0.2, // 20% penalty
            minor: 0.1, // 10% penalty
            buffer: 100, // threshold - 100 = major penalty trigger
        },
    },
    speed: {
        thresholds: {
            Sprint: 900,
            Mile: 800,
            Medium: 700,
            Long: 600,
        },
        penalties: {
            major: 0.2, // 20% penalty
            minor: 0.1, // 10% penalty
            buffer: 100, // threshold - 100 = major penalty trigger
        },
    },
    hints: {
        thresholds: {
            major: 0.25, // 25%
            minor: 0.5,  // 50%
        },
        penalties: {
            major: 0.2, // 20% penalty
            minor: 0.1, // 10% penalty
        },
    }
};

// You can create custom configurations for different scenarios
export const ALTERNATIVE_PENALTY_CONFIG: PenaltyConfig = {
    ...DEFAULT_PENALTY_CONFIG,
    stamina: {
        ...DEFAULT_PENALTY_CONFIG.stamina,
        thresholds: {
            Sprint: 150,
            Mile: 250,
            Medium: 350,
            Long: 450,
        },
    }
};

// Export the active configuration (easy to switch)
export const ACTIVE_PENALTY_CONFIG = DEFAULT_PENALTY_CONFIG;