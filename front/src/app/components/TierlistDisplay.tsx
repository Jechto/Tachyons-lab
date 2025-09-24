import { StatsDict } from "../types/cardTypes";
import TierlistCard from "./TierlistCard";
import { TierlistEntry } from "../classes/Tierlist";

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
    // Get all cards from all types and flatten them
    const allCards = Object.values(tierlistData).flat();

    // Calculate score percentiles for dynamic tier assignment
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
            maxScore: getPercentileScore(5) - 0.01,
        },
        {
            name: "B",
            color: "bg-yellow-500",
            textColor: "text-black",
            minScore: getPercentileScore(35),
            maxScore: getPercentileScore(15) - 0.01,
        },
        {
            name: "C",
            color: "bg-green-500",
            textColor: "text-white",
            minScore: getPercentileScore(55),
            maxScore: getPercentileScore(35) - 0.01,
        },
        {
            name: "D",
            color: "bg-blue-500",
            textColor: "text-white",
            minScore: getPercentileScore(75),
            maxScore: getPercentileScore(55) - 0.01,
        },
        {
            name: "E",
            color: "bg-purple-500",
            textColor: "text-white",
            minScore: getPercentileScore(90),
            maxScore: getPercentileScore(75) - 0.01,
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
        return (
            dynamicTiers.find(
                (tier) => score >= tier.minScore && score <= tier.maxScore,
            ) || dynamicTiers[dynamicTiers.length - 1]
        );
    };

    // Group cards by tier
    const cardsByTier = dynamicTiers.reduce(
        (acc, tier) => {
            acc[tier.name] = allCards
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                📊 Tierlist Visualization
            </h3>

            {dynamicTiers.map((tier) => {
                const cardsInTier = cardsByTier[tier.name] || [];

                if (cardsInTier.length === 0) return null;

                return (
                    <div key={tier.name} className="flex items-start gap-4">
                        {/* Tier Label */}
                        <div
                            className={`flex-shrink-0 w-16 h-16 ${tier.color} ${tier.textColor} rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg`}
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
