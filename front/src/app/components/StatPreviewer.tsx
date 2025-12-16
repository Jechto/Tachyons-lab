import React, { useState } from "react";
import Image from "next/image";
import { DeckEvaluator } from "../classes/DeckEvaluator";
import { SupportCard } from "../classes/SupportCard";
import { CardData } from "../types/cardTypes";
import { getAssetPath } from "../utils/paths";

interface DeckCard {
    id: number;
    limitBreak: number;
    cardName: string;
    cardRarity: string;
    cardType: string;
}

interface StatPreviewerProps {
    currentDeck: DeckCard[];
    allData: CardData[];
    deckStats?: {
        Speed: number;
        Stamina: number;
        Power: number;
        Guts: number;
        Wit?: number;
        "Skill Points"?: number;
    };
    scoreBreakdown?: {
        totalScore: number;
        baseScore: number;
        staminaPenalty: number;
        staminaPenaltyReason: string;
        speedPenalty: number;
        speedPenaltyReason: string;
        usefulHintsPenalty: number;
        usefulHintsPenaltyReason: string;
        statOverbuiltPenalty: number;
        statOverbuiltPenaltyReason: string;
        statContributions: Array<{
            stat: string;
            value: number;
            weight: number;
            contribution: number;
        }>;
        activeRaceTypes: string[];
        staminaThreshold: number;
        speedThreshold: number;
    };
    scenarioName?: string;
    manualDistribution?: number[] | null;
    optionalRaces?: number;
}

interface StatData {
    Speed: number;
    Stamina: number;
    Power: number;
    Guts: number;
    Wit: number;
    "Skill Points": number;
}

interface StatDifference {
    Speed: number;
    Stamina: number;
    Power: number;
    Guts: number;
    Wit: number;
    "Skill Points": number;
}

export default function StatPreviewer({
    currentDeck,
    allData,
    deckStats,
    scoreBreakdown,
    scenarioName = "URA",
    manualDistribution = null,
    optionalRaces = 0,
}: StatPreviewerProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const calculateStatDifference = (
        currentDeck: DeckCard[],
    ): { currentStats: StatData; statDifference: StatDifference } => {
        // If we have deckStats from the API, use those for the delta stats
        if (deckStats && currentDeck.length > 0) {
            // deckStats from API are the delta stats (support card contributions)
            const deltaStats = {
                Speed: Math.round(deckStats.Speed || 0),
                Stamina: Math.round(deckStats.Stamina || 0),
                Power: Math.round(deckStats.Power || 0),
                Guts: Math.round(deckStats.Guts || 0),
                Wit: Math.round(deckStats.Wit || 0),
                "Skill Points": Math.round(deckStats["Skill Points"] || 0),
            };

            // Calculate what the total stats would be (base stats + deltas)
            // We need to get base stats from an empty deck
            try {
                const emptyDeckEvaluator = new DeckEvaluator();
                if (manualDistribution) {
                    emptyDeckEvaluator.setManualDistribution(manualDistribution);
                }
                const baseStats = emptyDeckEvaluator.evaluateStats(scenarioName, 20, optionalRaces);

                const totalStats = {
                    Speed: Math.round(
                        (baseStats.Speed || 0) + deltaStats.Speed,
                    ),
                    Stamina: Math.round(
                        (baseStats.Stamina || 0) + deltaStats.Stamina,
                    ),
                    Power: Math.round(
                        (baseStats.Power || 0) + deltaStats.Power,
                    ),
                    Guts: Math.round((baseStats.Guts || 0) + deltaStats.Guts),
                    Wit: Math.round((baseStats.Wit || 0) + deltaStats.Wit),
                    "Skill Points": Math.round(
                        (baseStats["Skill Points"] || 0) +
                            deltaStats["Skill Points"],
                    ),
                };

                return {
                    currentStats: totalStats,
                    statDifference: deltaStats,
                };
            } catch (error) {
                console.warn(
                    "Failed to calculate base stats, falling back to local calculation:",
                    error,
                );
            }
        }

        // Fallback: calculate locally if no API stats provided or if calculation failed
        try {
            // Create empty deck evaluator
            const emptyDeckEvaluator = new DeckEvaluator();
            if (manualDistribution) {
                emptyDeckEvaluator.setManualDistribution(manualDistribution);
            }
            const emptyStats = emptyDeckEvaluator.evaluateStats(scenarioName, 20, optionalRaces);

            // Create current deck evaluator
            const currentDeckEvaluator = new DeckEvaluator();
            if (manualDistribution) {
                currentDeckEvaluator.setManualDistribution(manualDistribution);
            }

            // Add cards to current deck
            for (const deckCard of currentDeck) {
                try {
                    const supportCard = new SupportCard(
                        deckCard.id,
                        deckCard.limitBreak,
                        allData,
                    );
                    currentDeckEvaluator.addCard(supportCard);
                } catch (error) {
                    console.warn(
                        `Failed to add card ${deckCard.id} to stat preview:`,
                        error,
                    );
                }
            }

            const currentStats = currentDeckEvaluator.evaluateStats(scenarioName, 20, optionalRaces);

            // Return both current stats and differences
            return {
                currentStats: {
                    Speed: Math.round(currentStats.Speed || 0),
                    Stamina: Math.round(currentStats.Stamina || 0),
                    Power: Math.round(currentStats.Power || 0),
                    Guts: Math.round(currentStats.Guts || 0),
                    Wit: Math.round(currentStats.Wit || 0),
                    "Skill Points": Math.round(
                        currentStats["Skill Points"] || 0,
                    ),
                },
                statDifference: {
                    Speed: Math.round(
                        (currentStats.Speed || 0) - (emptyStats.Speed || 0),
                    ),
                    Stamina: Math.round(
                        (currentStats.Stamina || 0) - (emptyStats.Stamina || 0),
                    ),
                    Power: Math.round(
                        (currentStats.Power || 0) - (emptyStats.Power || 0),
                    ),
                    Guts: Math.round(
                        (currentStats.Guts || 0) - (emptyStats.Guts || 0),
                    ),
                    Wit: Math.round(
                        (currentStats.Wit || 0) - (emptyStats.Wit || 0),
                    ),
                    "Skill Points": Math.round(
                        (currentStats["Skill Points"] || 0) -
                            (emptyStats["Skill Points"] || 0),
                    ),
                },
            };
        } catch (error) {
            console.error("Error calculating stat difference:", error);
            return {
                currentStats: {
                    Speed: 0,
                    Stamina: 0,
                    Power: 0,
                    Guts: 0,
                    Wit: 0,
                    "Skill Points": 0,
                },
                statDifference: {
                    Speed: 0,
                    Stamina: 0,
                    Power: 0,
                    Guts: 0,
                    Wit: 0,
                    "Skill Points": 0,
                },
            };
        }
    };

    const { currentStats, statDifference } =
        calculateStatDifference(currentDeck);

    const getStatColor = (value: number): string => {
        if (value > 0) return "text-green-600 dark:text-green-400";
        if (value < 0) return "text-red-600 dark:text-red-400";
        return "text-gray-600 dark:text-gray-400";
    };

    const getStatIcon = (statName: string): string => {
        switch (statName) {
            case "Speed":
                return getAssetPath("images/icons/Speed.png");
            case "Stamina":
                return getAssetPath("images/icons/Stamina.png");
            case "Power":
                return getAssetPath("images/icons/Power.png");
            case "Guts":
                return getAssetPath("images/icons/Guts.png");
            case "Wit":
                return getAssetPath("images/icons/Intelligence.png");
            case "Skill Points":
                return getAssetPath("images/icons/SkillPoint.png");
            case "Hints":
                return getAssetPath("images/icons/Hint.png");
            default:
                return getAssetPath("images/icons/Support.png");
        }
    };

    const formatStatValue = (value: number): string => {
        if (value > 0) return `+${value}`;
        return value.toString();
    };

    const formatAbsoluteValue = (value: number): string => {
        return value.toString();
    };

    // Always show component, but content is collapsible
    const hasContent = currentDeck.length > 0;

    return (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                    Deck Stat Preview
                </h4>
                <div className="flex items-center gap-3">
                    {hasContent && (
                        <div className="text-sm text-purple-600 dark:text-purple-400">
                            NOTE: Total stats exclude events from main story and
                            inspiration
                        </div>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
                        aria-label={
                            isExpanded
                                ? "Collapse deck preview"
                                : "Expand deck preview"
                        }
                    >
                        {isExpanded ? "▼" : "▶"}{" "}
                        {isExpanded ? "Collapse" : "Expand"}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(currentStats).map(
                            ([statName, currentValue]) => {
                                const deltaValue =
                                    statDifference[
                                        statName as keyof StatDifference
                                    ];
                                return (
                                    <div
                                        key={statName}
                                        className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-center"
                                    >
                                        <div className="flex justify-center mb-2">
                                            <Image
                                                src={getStatIcon(statName)}
                                                alt={`${statName} icon`}
                                                width={32}
                                                height={32}
                                                className="object-contain"
                                                onError={(e) => {
                                                    // Fallback to emoji if icon fails to load
                                                    const target =
                                                        e.target as HTMLImageElement;
                                                    const parent =
                                                        target.parentElement;
                                                    if (parent) {
                                                        const fallbackEmojis: Record<
                                                            string,
                                                            string
                                                        > = {
                                                            Speed: "🏃",
                                                            Stamina: "💪",
                                                            Power: "⚡",
                                                            Guts: "💖",
                                                            Wit: "🧠",
                                                            "Skill Points":
                                                                "⭐",
                                                        };
                                                        parent.innerHTML = `<div class="text-2xl">${fallbackEmojis[statName] || "📊"}</div>`;
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                            {statName}
                                        </div>
                                        <div className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
                                            {formatAbsoluteValue(currentValue)}
                                        </div>
                                        <div
                                            className={`text-sm font-medium ${getStatColor(deltaValue)}`}
                                        >
                                            ({formatStatValue(deltaValue)})
                                        </div>
                                    </div>
                                );
                            },
                        )}
                    </div>

                    <div className="mt-3 text-xs text-center text-purple-600 dark:text-purple-400">
                        💡 Shows total stats acquired from training and running with your deck.
                        Numbers in brackets show the delta compared to an empty deck
                    </div>

                    {/* Score Breakdown Section - Always show when expanded */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-900 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h5 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                            🔍 Deck Score Breakdown
                        </h5>

                        {scoreBreakdown ? (
                            /* Score Calculation Receipt with real data */
                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Score Calculation Receipt
                                </div>

                                {/* Receipt Table */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                                    {/* Table Header */}
                                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                                        <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                            <div>Stat</div>
                                            <div className="text-right">
                                                Units
                                            </div>
                                            <div className="text-right">
                                                Weight
                                            </div>
                                            <div className="text-right">
                                                ∑
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-gray-100 dark:divide-gray-600">
                                        {scoreBreakdown.statContributions.map(
                                            (stat, index) => (
                                                <div
                                                    key={stat.stat}
                                                    className={`px-4 py-3 grid grid-cols-4 gap-4 items-center ${
                                                        index % 2 === 0
                                                            ? "bg-white dark:bg-gray-800"
                                                            : "bg-gray-25 dark:bg-gray-750"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Image
                                                            src={getStatIcon(
                                                                stat.stat,
                                                            )}
                                                            alt={`${stat.stat} icon`}
                                                            width={16}
                                                            height={16}
                                                            className="object-contain"
                                                            onError={(e) => {
                                                                const target =
                                                                    e.target as HTMLImageElement;
                                                                const fallbackEmojis: Record<
                                                                    string,
                                                                    string
                                                                > = {
                                                                    Speed: "🏃",
                                                                    Stamina:
                                                                        "💪",
                                                                    Power: "⚡",
                                                                    Guts: "💖",
                                                                    Wit: "🧠",
                                                                    "Skill Points":
                                                                        "⭐",
                                                                    Hints: "💡",
                                                                };
                                                            }}
                                                        />
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            {stat.stat}
                                                        </span>
                                                    </div>
                                                    <div className="text-right text-sm text-gray-800 dark:text-gray-200 font-mono">
                                                        {Math.round(stat.value)}
                                                    </div>
                                                    <div className="text-right text-sm text-gray-600 dark:text-gray-400 font-mono">
                                                        ×
                                                        {stat.weight.toFixed(2)}
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">
                                                        {stat.contribution > 0
                                                            ? "+"
                                                            : ""}
                                                        {stat.contribution.toFixed(
                                                            0,
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}

                                        {/* Subtotal */}
                                        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500">
                                            <div className="grid grid-cols-4 gap-4 items-center">
                                                <div className="col-span-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Subtotal:
                                                </div>
                                                <div className="text-right text-base font-bold text-gray-800 dark:text-gray-200 font-mono">
                                                    {scoreBreakdown.baseScore.toFixed(
                                                        0,
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Penalties */}
                                        {scoreBreakdown.staminaPenalty < 1 && (
                                            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20">
                                                <div className="grid grid-cols-4 gap-4 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-red-600 dark:text-red-400">
                                                            ⚠️ Stamina Penalty
                                                        </span>
                                                        <div className="text-xs text-red-500 dark:text-red-400">
                                                            (
                                                            {(
                                                                100 -
                                                                scoreBreakdown.staminaPenalty *
                                                                    100
                                                            ).toFixed(0)}
                                                            % reduction)
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-red-600 dark:text-red-400 font-mono">
                                                        -
                                                        {(
                                                            scoreBreakdown.baseScore *
                                                            (1 -
                                                                scoreBreakdown.staminaPenalty)
                                                        ).toFixed(0)}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-red-600 dark:text-red-400 col-span-4">
                                                    {
                                                        scoreBreakdown.staminaPenaltyReason
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {/* Speed Penalty */}
                                        {scoreBreakdown.speedPenalty < 1 && (
                                            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20">
                                                <div className="grid grid-cols-4 gap-4 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-blue-600 dark:text-blue-400">
                                                            📉 Speed Penalty
                                                        </span>
                                                        <div className="text-xs text-blue-500 dark:text-blue-400">
                                                            (
                                                            {(
                                                                100 -
                                                                scoreBreakdown.speedPenalty * 100
                                                            ).toFixed(0)}
                                                            % reduction)
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono">
                                                        -
                                                        {(
                                                            scoreBreakdown.baseScore *
                                                            (1 - scoreBreakdown.speedPenalty)
                                                        ).toFixed(0)}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 col-span-4">
                                                    {scoreBreakdown.speedPenaltyReason}
                                                </div>
                                            </div>
                                        )}

                                        {/* Useful Hints Penalty */}
                                        {scoreBreakdown.usefulHintsPenalty <
                                            1 && (
                                            <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20">
                                                <div className="grid grid-cols-4 gap-4 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-orange-600 dark:text-orange-400">
                                                            💡 Hints Penalty
                                                        </span>
                                                        <div className="text-xs text-orange-500 dark:text-orange-400">
                                                            (
                                                            {(
                                                                100 -
                                                                scoreBreakdown.usefulHintsPenalty *
                                                                    100
                                                            ).toFixed(0)}
                                                            % reduction)
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-orange-600 dark:text-orange-400 font-mono">
                                                        -
                                                        {(
                                                            scoreBreakdown.baseScore *
                                                            (1 -
                                                                scoreBreakdown.usefulHintsPenalty)
                                                        ).toFixed(0)}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 col-span-4">
                                                    {
                                                        scoreBreakdown.usefulHintsPenaltyReason
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {/* Stat Overbuilt Penalty */}
                                        {scoreBreakdown.statOverbuiltPenalty < 1 && (
                                            <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20">
                                                <div className="grid grid-cols-4 gap-4 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-purple-600 dark:text-purple-400">
                                                            📊 Overbuilt Penalty
                                                        </span>
                                                        <div className="text-xs text-purple-500 dark:text-purple-400">
                                                            (
                                                            {(
                                                                100 -
                                                                scoreBreakdown.statOverbuiltPenalty * 100
                                                            ).toFixed(0)}
                                                            % reduction)
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
                                                        -
                                                        {(
                                                            scoreBreakdown.baseScore *
                                                            (1 - scoreBreakdown.statOverbuiltPenalty)
                                                        ).toFixed(0)}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 col-span-4">
                                                    {scoreBreakdown.statOverbuiltPenaltyReason}
                                                </div>
                                            </div>
                                        )}

                                        {/* Final Total */}
                                        <div className="px-4 py-4 bg-green-50 dark:bg-green-900/20 border-t-2 border-green-300 dark:border-green-600">
                                            <div className="grid grid-cols-4 gap-4 items-center">
                                                <div className="col-span-3 text-right text-lg font-bold text-green-700 dark:text-green-300">
                                                    Final Score:
                                                </div>
                                                <div className="text-right text-xl font-bold text-green-600 dark:text-green-400 font-mono">
                                                    {scoreBreakdown.totalScore.toFixed(
                                                        0,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Empty deck receipt with zeros */
                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Score Calculation Receipt
                                </div>

                                {/* Receipt Table */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                                    {/* Table Header */}
                                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                                        <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                            <div>Stat</div>
                                            <div className="text-right">
                                                Units
                                            </div>
                                            <div className="text-right">
                                                Weight
                                            </div>
                                            <div className="text-right">
                                                ∑
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table Body with empty deck values */}
                                    <div className="divide-y divide-gray-100 dark:divide-gray-600">
                                        {[
                                            "Speed",
                                            "Stamina",
                                            "Power",
                                            "Guts",
                                            "Wit",
                                            "Skill Points",
                                            "Hints",
                                        ].map((statName, index) => (
                                            <div
                                                key={statName}
                                                className={`px-4 py-3 grid grid-cols-4 gap-4 items-center ${
                                                    index % 2 === 0
                                                        ? "bg-white dark:bg-gray-800"
                                                        : "bg-gray-25 dark:bg-gray-750"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Image
                                                        src={getStatIcon(
                                                            statName,
                                                        )}
                                                        alt={`${statName} icon`}
                                                        width={16}
                                                        height={16}
                                                        className="object-contain"
                                                        onError={(e) => {
                                                            const target =
                                                                e.target as HTMLImageElement;
                                                            const fallbackEmojis: Record<
                                                                string,
                                                                string
                                                            > = {
                                                                Speed: "🏃",
                                                                Stamina:
                                                                    "💪",
                                                                Power: "⚡",
                                                                Guts: "💖",
                                                                Wit: "🧠",
                                                                "Skill Points":
                                                                    "⭐",
                                                                Hints: "💡",
                                                            };
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {statName}
                                                    </span>
                                                </div>
                                                <div className="text-right text-sm text-gray-400 dark:text-gray-500 font-mono">
                                                    0
                                                </div>
                                                <div className="text-right text-sm text-gray-400 dark:text-gray-500 font-mono">
                                                    ×1.00
                                                </div>
                                                <div className="text-right text-sm font-semibold text-gray-400 dark:text-gray-500 font-mono">
                                                    0.0
                                                </div>
                                            </div>
                                        ))}

                                        {/* Subtotal */}
                                        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500">
                                            <div className="grid grid-cols-4 gap-4 items-center">
                                                <div className="col-span-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Subtotal:
                                                </div>
                                                <div className="text-right text-base font-bold text-gray-400 dark:text-gray-500 font-mono">
                                                    0.0
                                                </div>
                                            </div>
                                        </div>

                                        {/* Final Total */}
                                        <div className="px-4 py-4 bg-green-50 dark:bg-green-900/20 border-t-2 border-green-300 dark:border-green-600">
                                            <div className="grid grid-cols-4 gap-4 items-center">
                                                <div className="col-span-3 text-right text-lg font-bold text-green-700 dark:text-green-300">
                                                    Final Score:
                                                </div>
                                                <div className="text-right text-xl font-bold text-gray-400 dark:text-gray-500 font-mono">
                                                    0.0
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                    Add support cards to your deck to see
                                    calculated values
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
