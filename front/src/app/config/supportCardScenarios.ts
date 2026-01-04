/**
 * Configuration for support cards that are limited to specific scenarios
 */

export const SupportCardScenarioLimits: Record<string, string[]> = {
    "20021": ["URA"],// Aoi Kiryuin SR
    "10022": ["URA"], // Aoi Kiryuin R
    "30021": ["URA"], // Tazuna Hayakawa SSR
    "10021": ["URA"], // Tazuna Hayakawa R
    "30036": ["Unity"], // Riko Kashimoto SSR
    "10060": ["Unity"], // Riko Kashimoto R
};

/**
 * Check if a support card is allowed in a given scenario
 * @param cardId The support card ID
 * @param scenarioName The scenario name (e.g., "URA", "Unity")
 * @returns true if the card is allowed, false otherwise
 */
export function isSupportCardAllowedInScenario(cardId: string, scenarioName: string): boolean {
    const allowedScenarios = SupportCardScenarioLimits[cardId];
    
    // If card is not in the limits list, it's allowed in all scenarios
    if (!allowedScenarios) {
        return true;
    }
    
    // Check if the scenario is in the allowed list
    return allowedScenarios.includes(scenarioName);
}
