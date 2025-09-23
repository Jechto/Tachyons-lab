import React from "react";
import Image from "next/image";
import { DeckEvaluator } from "../classes/DeckEvaluator";
import { SupportCard } from "../classes/SupportCard";
import { CardData } from "../types/cardTypes";

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
}: StatPreviewerProps) {
    const calculateStatDifference = (
        currentDeck: DeckCard[],
    ): { currentStats: StatData; statDifference: StatDifference } => {
        try {
            // Create empty deck evaluator
            const emptyDeckEvaluator = new DeckEvaluator();
            const emptyStats = emptyDeckEvaluator.evaluateStats();

            // Create current deck evaluator
            const currentDeckEvaluator = new DeckEvaluator();

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

            const currentStats = currentDeckEvaluator.evaluateStats();

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
                return "/images/icons/Speed.png";
            case "Stamina":
                return "/images/icons/Stamina.png";
            case "Power":
                return "/images/icons/Power.png";
            case "Guts":
                return "/images/icons/Guts.png";
            case "Wit":
                return "/images/icons/Intelligence.png";
            case "Skill Points":
                return "/images/icons/SkillPoints.png"; // You'll create this
            default:
                return "/images/icons/Support.png";
        }
    };

    const formatStatValue = (value: number): string => {
        if (value > 0) return `+${value}`;
        return value.toString();
    };

    const formatAbsoluteValue = (value: number): string => {
        return value.toString();
    };

    // Don't show component if deck is empty
    if (currentDeck.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                    Deck Stat Preview
                </h4>
                <div className="text-sm text-purple-600 dark:text-purple-400">
                    NOTE: Total stats exclude events from main story and
                    inspiration
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(currentStats).map(
                    ([statName, currentValue]) => {
                        const deltaValue =
                            statDifference[statName as keyof StatDifference];
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
                                            const parent = target.parentElement;
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
                                                    "Skill Points": "⭐",
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
                💡 Shows total stats from your deck with the delta compared to
                an empty deck in parentheses
            </div>
        </div>
    );
}
