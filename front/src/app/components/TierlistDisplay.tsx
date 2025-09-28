import { StatsDict } from "../types/cardTypes";
import TierlistCard from "./TierlistCard";
import { TierlistEntry } from "../classes/Tierlist";
import { useState, useMemo } from "react";
import { getAssetPath } from "../utils/paths";
import Image from "next/image";

interface TierlistDisplayProps {
    tierlistData: Record<string, TierlistEntry[]>;
    onCardClick?: (card: TierlistEntry) => void;
    deckCardIds?: Set<string>;
    isCardDisabled?: (cardId: number, limitBreak: number) => boolean;
    getCardDisabledInfo?: (
        cardId: number,
        limitBreak: number,
    ) => { disabled: boolean; reason?: string };
}

type CardTypeFilter = "All" | "Speed" | "Stamina" | "Power" | "Guts" | "Wit" | "Support";

interface TierDefinition {
    name: string;
    color: string;
    textColor: string;
    minScore: number;
    maxScore: number;
}

export default function TierlistDisplay({
    tierlistData,
    onCardClick,
    deckCardIds = new Set(),
    isCardDisabled,
    getCardDisabledInfo,
}: TierlistDisplayProps) {
    // Filter state
    const [cardTypeFilter, setCardTypeFilter] = useState<CardTypeFilter>("All");
    const [hintTypeFilters, setHintTypeFilters] = useState<Set<string>>(new Set());

    // Get all cards from all types and flatten them
    const allCards = Object.values(tierlistData).flat();

    // Get all unique hint types from all cards (excluding "General" as it's not useful for filtering)
    const allHintTypes = useMemo(() => {
        const hintTypes = new Set<string>();
        allCards.forEach(card => {
            card.hintTypes?.forEach(hint => {
                if (hint !== "General") {
                    hintTypes.add(hint);
                }
            });
        });
        
        // Custom sort order for hint types
        const hintOrder = ['Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer', 'Sprint', 'Mile', 'Medium', 'Long'];
        return Array.from(hintTypes).sort((a, b) => {
            const indexA = hintOrder.indexOf(a);
            const indexB = hintOrder.indexOf(b);
            
            // If both hints are in the custom order, sort by that order
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // If only one is in the custom order, prioritize it
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            // If neither is in the custom order, sort alphabetically
            return a.localeCompare(b);
        });
    }, [allCards]);

    // Filter cards based on current filters
    const filteredCards = useMemo(() => {
        return allCards.filter(card => {
            // Card type filter
            if (cardTypeFilter !== "All" && card.card_type !== cardTypeFilter) {
                return false;
            }

            // Hint type filter - if any hint filters are selected, card must have at least one matching hint
            if (hintTypeFilters.size > 0) {
                const hasMatchingHint = card.hintTypes?.some(hint => hintTypeFilters.has(hint));
                if (!hasMatchingHint) {
                    return false;
                }
            }

            return true;
        });
    }, [allCards, cardTypeFilter, hintTypeFilters]);

    // Toggle hint type filter
    const toggleHintTypeFilter = (hintType: string) => {
        const newFilters = new Set(hintTypeFilters);
        if (newFilters.has(hintType)) {
            newFilters.delete(hintType);
        } else {
            newFilters.add(hintType);
        }
        setHintTypeFilters(newFilters);
    };

    // Clear all filters
    const clearAllFilters = () => {
        setCardTypeFilter("All");
        setHintTypeFilters(new Set());
    };

    // Get icon path for card type
    const getCardTypeIcon = (cardType: CardTypeFilter): string => {
        switch (cardType) {
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
            case "Support":
                return getAssetPath("images/icons/Support.png");
            default: // "All"
                return getAssetPath("images/icons/Support.png"); // Use a generic icon for "All"
        }
    };

    // Get fallback emoji for card type
    const getCardTypeFallback = (cardType: CardTypeFilter): string => {
        switch (cardType) {
            case "Speed":
                return "🏃";
            case "Stamina":
                return "💪";
            case "Power":
                return "⚡";
            case "Guts":
                return "💖";
            case "Wit":
                return "🧠";
            case "Support":
                return "🎴";
            default: // "All"
                return "📊";
        }
    };

    // Calculate score percentiles for dynamic tier assignment (use all cards, not filtered)
    const scores = allCards.map((card) => card.score).sort((a, b) => b - a);
    const getPercentileScore = (percentile: number) => {
        const index = Math.floor((percentile / 100) * scores.length);
        return scores[index] || 0;
    };

    // Dynamic tier assignment based on percentiles
    const dynamicTiers: TierDefinition[] = [
        {
            name: "S",
            color: "bg-red-500",
            textColor: "text-white",
            minScore: getPercentileScore(5),
            maxScore: Infinity,
        },
        {
            name: "A",
            color: "bg-orange-500",
            textColor: "text-white",
            minScore: getPercentileScore(15),
            maxScore: getPercentileScore(5),
        },
        {
            name: "B",
            color: "bg-yellow-500",
            textColor: "text-black",
            minScore: getPercentileScore(35),
            maxScore: getPercentileScore(15),
        },
        {
            name: "C",
            color: "bg-green-500",
            textColor: "text-white",
            minScore: getPercentileScore(55),
            maxScore: getPercentileScore(35),
        },
        {
            name: "D",
            color: "bg-blue-500",
            textColor: "text-white",
            minScore: getPercentileScore(75),
            maxScore: getPercentileScore(55),
        },
        {
            name: "E",
            color: "bg-purple-500",
            textColor: "text-white",
            minScore: getPercentileScore(90),
            maxScore: getPercentileScore(75),
        },
        {
            name: "F",
            color: "bg-pink-500",
            textColor: "text-white",
            minScore: getPercentileScore(98),
            maxScore: getPercentileScore(90) - 0.01,
        },
        {
            name: "G",
            color: "bg-gray-500",
            textColor: "text-white",
            minScore: -Infinity,
            maxScore: getPercentileScore(98) - 0.01,
        },
    ];

    const assignTier = (score: number): TierDefinition => {
        // Find the first tier where the score is >= minScore
        // Since tiers are ordered from high to low, this will give us the correct tier
        for (let i = 0; i < dynamicTiers.length; i++) {
            if (score >= dynamicTiers[i].minScore) {
                return dynamicTiers[i];
            }
        }
        // If no tier found, return the lowest tier (G)
        return dynamicTiers[dynamicTiers.length - 1];
    };

    // Group filtered cards by tier
    const cardsByTier = dynamicTiers.reduce(
        (acc, tier) => {
            acc[tier.name] = filteredCards
                .filter((card) => {
                    const cardTier = assignTier(card.score);
                    return cardTier.name === tier.name;
                })
                .sort((a, b) => b.score - a.score); // Sort by score descending within tier
            return acc;
        },
                {} as Record<string, TierlistEntry[]>,
    );



    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Tierlist Visualization
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredCards.length} of {allCards.length} cards
                </div>
            </div>

            {/* Scoring Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">i</span>
                        </div>
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">About Card Scoring</p>
                        <p>
                            Cards are ranked using the scoring system shown in the &ldquo;Deck Stats Preview&rdquo; section.
                            The score serves as an estimator for how much each card 
                            can improve your deck&apos;s overall performance. Higher-tier cards (S, A, B) typically provide 
                            the best stat gains. However, even lower-tier cards can be valuable for their unique 
                            skills and hints, so consider your deck&apos;s specific needs when choosing cards.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                {/* Card Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Card Type:
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(["All", "Speed", "Stamina", "Power", "Guts", "Wit", "Support"] as CardTypeFilter[]).map((type) => (
                            <label key={type} className="flex items-center">
                                <input
                                    type="radio"
                                    name="cardType"
                                    value={type}
                                    checked={cardTypeFilter === type}
                                    onChange={(e) => setCardTypeFilter(e.target.value as CardTypeFilter)}
                                    className="sr-only"
                                />
                                <div 
                                    className={`relative cursor-pointer transition-all duration-200 rounded-lg w-10 h-10 flex items-center justify-center ${
                                        cardTypeFilter === type
                                            ? type === "All"
                                                ? "bg-slate-600 text-white shadow-lg scale-110 border-2 border-slate-400"
                                                : "shadow-lg scale-110 border-2"
                                            : "bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 hover:scale-105 border-2 border-transparent"
                                    } ${
                                        cardTypeFilter === type && type !== "All"
                                            ? type === "Speed"
                                                ? "border-blue-300"
                                                : type === "Stamina"
                                                ? "border-red-300"
                                                : type === "Power"
                                                ? "border-orange-300"
                                                : type === "Guts"
                                                ? "border-pink-300"
                                                : type === "Wit"
                                                ? "border-green-300"
                                                : "border-purple-300" // Support
                                            : ""
                                    }`}
                                    style={type !== "All" ? {
                                        backgroundImage: `url(${getCardTypeIcon(type)})`,
                                        backgroundSize: '110%',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                    } : {}}
                                    title={type}
                                >
                                    {type === "All" && (
                                        <span className="text-2xl font-bold">∀</span>
                                    )}
                                    {/* Active indicator dot */}
                                    {cardTypeFilter === type && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border border-gray-300 shadow-sm"></div>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Hint Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hint Types (toggle multiple):
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {allHintTypes.map((hintType) => {
                            const isSelected = hintTypeFilters.has(hintType);
                            const getBadgeStyle = (type: string) => {
                                const baseClasses = "px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors";
                                if (isSelected) {
                                    switch (type) {
                                        case 'Front Runner':
                                            return `${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`;
                                        case 'Pace Chaser':
                                            return `${baseClasses} bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`;
                                        case 'Late Surger':
                                            return `${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`;
                                        case 'End Closer':
                                            return `${baseClasses} bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200`;
                                        case 'Sprint':
                                            return `${baseClasses} bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200`;
                                        case 'Mile':
                                            return `${baseClasses} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200`;
                                        case 'Medium':
                                            return `${baseClasses} bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200`;
                                        case 'Long':
                                            return `${baseClasses} bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200`;
                                        case 'General':
                                        default:
                                            return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`;
                                    }
                                } else {
                                    return `${baseClasses} bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500`;
                                }
                            };

                            return (
                                <button
                                    key={hintType}
                                    onClick={() => toggleHintTypeFilter(hintType)}
                                    className={getBadgeStyle(hintType)}
                                >
                                    {hintType}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Filter Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={clearAllFilters}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        Clear All Filters
                    </button>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Filters are visual only and don&apos;t affect scoring or tier placement
                    </div>
                </div>
            </div>

            {dynamicTiers.map((tier) => {
                const cardsInTier = cardsByTier[tier.name] || [];

                if (cardsInTier.length === 0) return null;

                return (
                    <div key={tier.name} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                        {/* Tier Label */}
                        <div
                            className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 ${tier.color} ${tier.textColor} rounded-lg flex items-center justify-center font-bold text-xl sm:text-2xl shadow-lg`}
                        >
                            {tier.name}
                        </div>

                        {/* Cards in this tier */}
                        <div className="flex-1 min-h-[4rem] bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border-2 border-gray-300 dark:border-gray-600">
                            <div className="flex flex-wrap gap-3">
                                {cardsInTier.map((card, index) => {
                                    const cardKey = `${card.id}-${card.limit_break}`;
                                    const disabledInfo = getCardDisabledInfo
                                        ? getCardDisabledInfo(
                                              card.id,
                                              card.limit_break,
                                          )
                                        : {
                                              disabled:
                                                  deckCardIds.has(cardKey),
                                          };
                                    const isDisabled = disabledInfo.disabled;
                                    return (
                                        <TierlistCard
                                            key={cardKey}
                                            id={card.id}
                                            cardName={card.card_name}
                                            cardRarity={card.card_rarity}
                                            limitBreak={card.limit_break}
                                            cardType={card.card_type}
                                            score={card.score}
                                            onClick={() => onCardClick?.(card)}
                                            isInDeck={isDisabled}
                                            disabledReason={disabledInfo.reason}
                                            deltaStats={card.stats_diff_only_added_to_deck}
                                            hints={card.hints}
                                            hintTypes={card.hintTypes}
                                        />
                                    );
                                })}
                            </div>

                            {/* Tier Info */}
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                {cardsInTier.length} card
                                {cardsInTier.length !== 1 ? "s" : ""}
                                {cardsInTier.length > 0 && (
                                    <span>
                                        {" "}
                                        • Score range:{" "}
                                        {Math.round(
                                            cardsInTier[cardsInTier.length - 1]
                                                .score,
                                        )}{" "}
                                        - {Math.round(cardsInTier[0].score)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
