import Image from "next/image";
import CardTooltip from "./CardTooltip";
import { StatsDict, HintResult } from "../types/cardTypes";
import { getAssetPath } from "../utils/paths";

interface TierlistCardProps {
    id: number;
    cardName: string;
    cardRarity: string;
    limitBreak: number;
    cardType: string;
    score: number;
    className?: string;
    onClick?: () => void;
    isInDeck?: boolean;
    inDeckView?: boolean; // New prop to distinguish deck view from tierlist view
    disabledReason?: string; // Optional reason for why the card is disabled
    // New props for tooltip
    deltaStats?: StatsDict;
    hints?: HintResult; // Contains useful_hints_rate and other hint data
    hintTypes?: string[]; // Types of hints this card produces
}

export default function TierlistCard({
    id,
    cardName,
    cardRarity,
    limitBreak,
    cardType,
    score,
    className = "",
    onClick,
    isInDeck = false,
    inDeckView = false,
    disabledReason,
    deltaStats,
    hints,
    hintTypes = [],
}: TierlistCardProps) {
    const getLimitBreakText = (lb: number): string => {
        switch (lb) {
            case 0:
                return "0LB";
            case 1:
                return "1LB";
            case 2:
                return "2LB";
            case 3:
                return "3LB";
            case 4:
                return "MLB";
            default:
                return `${lb}LB`;
        }
    };

    const getRarityColor = (rarity: string): string => {
        switch (rarity) {
            case "SSR":
                return "bg-yellow-500 text-yellow-900";
            case "SR":
                return "bg-purple-500 text-white";
            case "R":
                return "bg-blue-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case "Speed":
                return "bg-red-500";
            case "Stamina":
                return "bg-green-500";
            case "Power":
                return "bg-orange-500";
            case "Guts":
                return "bg-pink-500";
            case "Wit":
                return "bg-blue-500";
            default:
                return "bg-gray-500";
        }
    };

    const getTypeIcon = (type: string): string => {
        switch (type) {
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
            default:
                return getAssetPath("images/icons/Support.png");
        }
    };

    const getRarityGlow = (rarity: string): string => {
        switch (rarity) {
            case "SSR":
                return "shadow-md hover:shadow-[0_0_12px_rgba(255,0,255,0.7),0_0_20px_rgba(0,255,255,0.5),0_0_28px_rgba(255,255,0,0.3)]";
            case "SR":
                return "shadow-md hover:shadow-[0_0_8px_rgba(255,215,0,0.8),0_0_16px_rgba(255,215,0,0.6)]";
            case "R":
                return "shadow-md hover:shadow-[0_0_6px_rgba(156,163,175,0.6),0_0_10px_rgba(156,163,175,0.4)]";
            default:
                return "shadow-md hover:shadow-lg";
        }
    };

    const hintsMatchPercentage = hints?.useful_hints_rate ? (hints.useful_hints_rate as number) * 100 : 0;

    const cardContent = (
        <div
            className={`relative group transition-all duration-300 ${
                isInDeck && !inDeckView
                    ? "cursor-not-allowed"
                    : "cursor-pointer hover:scale-105"
            } ${className}`}
            onClick={isInDeck && !inDeckView ? undefined : onClick}
        >
            {/* Card Image */}
            <div
                className={`relative w-16 h-20 sm:w-24 sm:h-28 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    isInDeck && !inDeckView
                        ? "border-gray-400 bg-gray-100 dark:bg-gray-800 opacity-50 grayscale"
                        : isInDeck
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                          : "border-gray-300 dark:border-gray-600"
                } ${!isInDeck || inDeckView ? getRarityGlow(cardRarity) : ""}`}
            >
                <Image
                    src={getAssetPath(`images/cards/${id}.png`)}
                    alt={cardName}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 64px, 96px"
                    onError={(e) => {
                        // Fallback to a placeholder if image doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgOTYgMTEyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiA0MEg2NFY0NEgzMlY0MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+eCBkPSJNMzIgNDhINjRWNTJIMzJWNDhaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zMiA1Nkg2NFY2MEgzMlY1NloiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+eCBkPSJNMzIgNjRINjRWNjhIMzJWNjRaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=";
                    }}
                />

                {/* Score Overlay - show for both positive and negative scores */}
                {score !== 0 && (
                    <div className={`absolute top-0.5 right-0.5 text-white text-sm px-1.5 py-0.5 rounded z-1 font-bold leading-none ${
                        score > 0 
                            ? "bg-black bg-opacity-80" 
                            : "bg-red-600 bg-opacity-90"
                    }`}>
                        {score > 0 ? Math.round(score) : Math.round(score)}
                    </div>
                )}

                {/* Limit Break Badge */}
                <div
                    className={`absolute bottom-0.5 right-0.5 text-sm px-1.5 py-0.5 rounded z-1 font-bold leading-none ${getRarityColor(cardRarity)}`}
                >
                    {getLimitBreakText(limitBreak)}
                </div>

                {/* Card Type Indicator */}
                <div className="absolute bottom-0.5 left-0.5 w-5 h-5 sm:w-6 sm:h-6 z-10">
                    <Image
                        src={getTypeIcon(cardType)}
                        alt={`${cardType} type`}
                        width={24}
                        height={24}
                        className="object-contain drop-shadow-sm w-full h-full"
                        onError={(e) => {
                            // Fallback to colored dot if icon fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                                parent.innerHTML = `<div class="w-3 h-3 rounded-full ${getTypeColor(cardType)} border border-white"></div>`;
                            }
                        }}
                    />
                </div>

                {/* In Deck Indicator */}
                {isInDeck && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded z-10 font-bold leading-none">
                        ✓
                    </div>
                )}

                {/* Already in Deck Overlay - only show in tierlist view */}
                {isInDeck && !inDeckView && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                        <div className="bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded font-bold text-center">
                            {disabledReason || "IN DECK"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // If we have deltaStats, wrap with tooltip, otherwise render plain card
    if (deltaStats && Object.keys(deltaStats).length > 0) {
        return (
            <CardTooltip
                cardId={id}
                cardName={cardName}
                cardRarity={cardRarity}
                limitBreak={limitBreak}
                cardType={cardType}
                deltaStats={deltaStats}
                hintsMatchPercentage={hintsMatchPercentage}
                hintTypes={hintTypes}
                isInDeck={isInDeck}
            >
                {cardContent}
            </CardTooltip>
        );
    }

    return cardContent;
}
