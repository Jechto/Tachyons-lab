"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getAssetPath } from "../utils/paths";
import allDataRaw from "../data/data.json";
import { CardData } from "../types/cardTypes";
import CardTypeSelector, { CardTypeFilter } from "./CardTypeSelector";

// Define ownership levels
type OwnershipLevel = -1 | 0 | 1 | 2 | 3 | 4;

const OWNERSHIP_LABELS: Record<OwnershipLevel, string> = {
    [-1]: "Not Owned",
    [0]: "0LB",
    [1]: "1LB",
    [2]: "2LB",
    [3]: "3LB",
    [4]: "MLB",
};

const RARITY_MAP: Record<number, string> = {
    1: "R",
    2: "SR",
    3: "SSR",
};

const TYPE_COLORS: Record<string, string> = {
    "Speed": "bg-blue-500",
    "Stamina": "bg-red-500",
    "Power": "bg-yellow-500",
    "Guts": "bg-pink-500",
    "Wit": "bg-green-500", // Intelligence/Wit usually green or blue depending on game version, matching TierlistCard
    "Support": "bg-purple-500",
};

// Helper to get icon path (matching TierlistCard)
const getTypeIcon = (type: string): string => {
    switch (type) {
        case "Speed": return getAssetPath("images/icons/Speed.png");
        case "Stamina": return getAssetPath("images/icons/Stamina.png");
        case "Power": return getAssetPath("images/icons/Power.png");
        case "Guts": return getAssetPath("images/icons/Guts.png");
        case "Wit": 
        case "Intelligence": return getAssetPath("images/icons/Intelligence.png");
        case "Support": return getAssetPath("images/icons/Support.png"); // Friend/Group
        default: return getAssetPath("images/icons/Support.png");
    }
};

const getRarityColor = (rarity: string): string => {
    switch (rarity) {
        case "SSR": return "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-white border-yellow-400";
        case "SR": return "bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-500 text-white border-yellow-300"; // Goldish for SR
        case "R": return "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white border-gray-300"; // Silver for R
        default: return "bg-gray-500 text-white";
    }
};

// TierlistCard uses specific colors, let's try to match them closer if possible, or use the ones defined there.
// TierlistCard: SSR=yellow-500, SR=purple-500, R=blue-500.
// Let's stick to TierlistCard colors for consistency.
const getRarityStyle = (rarity: string) => {
    switch (rarity) {
        case "SSR": return { bg: "bg-yellow-500", text: "text-yellow-900", border: "border-yellow-500" };
        case "SR": return { bg: "bg-purple-500", text: "text-white", border: "border-purple-500" };
        case "R": return { bg: "bg-blue-500", text: "text-white", border: "border-blue-500" };
        default: return { bg: "bg-gray-500", text: "text-white", border: "border-gray-500" };
    }
};

interface CollectionCardProps {
    card: CardData;
    ownership: OwnershipLevel;
    onOwnershipChange: (cardId: number, level: OwnershipLevel) => void;
}

const CollectionCard = ({ card, ownership, onOwnershipChange }: CollectionCardProps) => {
    const isOwned = ownership !== -1;
    const rarityStr = RARITY_MAP[card.rarity] || "R";
    const rarityStyle = getRarityStyle(rarityStr);
    
    return (
        <div 
            className={`relative flex flex-col rounded-lg overflow-hidden transition-all duration-200 ${
                isOwned 
                    ? "bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transform hover:-translate-y-1" 
                    : "bg-gray-100 dark:bg-gray-900 opacity-90"
            }`}
        >
            {/* Card Header / Image Container */}
            <div className={`relative aspect-[3/4] w-full overflow-hidden ${!isOwned ? 'brightness-50 contrast-125' : ''}`}>
                {/* Rarity Badge */}
                <div className={`absolute bottom-0.5 left-0.5 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm ${rarityStyle.bg} ${rarityStyle.text}`}>
                    {rarityStr}
                </div>
                
                {/* Type Icon */}
                <div className="absolute top-0.5 right-0.5 z-10 w-6 h-6 bg-white/90 rounded-full p-0.5 shadow-sm">
                    <Image 
                        src={getTypeIcon(card.prefered_type)} 
                        alt={card.prefered_type}
                        width={24}
                        height={24}
                    />
                </div>

                <Image
                    src={getAssetPath(`images/cards/${card.id}.png`)}
                    alt={card.card_chara_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80px, 120px"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgOTYgMTEyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+PC9zdmc+";
                    }}
                />
            </div>

            {/* Controls */}
            <div className="p-1 border-t border-gray-100 dark:border-gray-700">
                <div className="text-[9px] font-medium truncate mb-1 text-gray-700 dark:text-gray-300" title={card.card_chara_name}>
                    {card.card_chara_name}
                </div>
                <select
                    value={ownership}
                    onChange={(e) => onOwnershipChange(card.id, Number(e.target.value) as OwnershipLevel)}
                    className={`w-full text-[9px] p-0.5 rounded border outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                        isOwned
                            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 font-semibold"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                    }`}
                >
                    {Object.entries(OWNERSHIP_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default function CardCollectionManager() {
    const [ownedCards, setOwnedCards] = useState<Record<number, OwnershipLevel>>({});
    const [cardTypeFilter, setCardTypeFilter] = useState<CardTypeFilter>("All");
    const [rarityFilter, setRarityFilter] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("tachyons_owned_cards");
            if (saved) {
                try {
                    setOwnedCards(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse owned cards", e);
                }
            }
            setIsLoaded(true);
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (isLoaded && typeof window !== "undefined") {
            localStorage.setItem("tachyons_owned_cards", JSON.stringify(ownedCards));
            // Dispatch custom event for same-page updates
            window.dispatchEvent(new Event("tachyons_collection_updated"));
        }
    }, [ownedCards, isLoaded]);

    const handleOwnershipChange = (cardId: number, level: OwnershipLevel) => {
        setOwnedCards(prev => {
            const newState = { ...prev };
            if (level === -1) {
                delete newState[cardId];
            } else {
                newState[cardId] = level;
            }
            return newState;
        });
    };

    // Get unique cards
    const uniqueCards = useMemo(() => {
        const map = new Map<number, CardData>();
        (allDataRaw as unknown as CardData[]).forEach(card => {
            if (!map.has(card.id)) {
                map.set(card.id, card);
            }
        });
        return Array.from(map.values());
    }, []);

    // Filter and Sort
    const filteredAndSortedCards = useMemo(() => {
        let result = uniqueCards;

        // Filter by Type
        if (cardTypeFilter !== "All") {
            const typeToMatch = cardTypeFilter === "Wit" ? "Intelligence" : cardTypeFilter;
            result = result.filter(c => c.prefered_type === typeToMatch);
        }

        // Filter by Rarity
        if (rarityFilter !== "All") {
            result = result.filter(c => RARITY_MAP[c.rarity] === rarityFilter);
        }

        // Filter by Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => c.card_chara_name.toLowerCase().includes(query));
        }

        // Sort: SSR > SR > R, then ID
        return result.sort((a, b) => {
            if (a.rarity !== b.rarity) {
                return b.rarity - a.rarity; // Descending rarity (3 > 2 > 1)
            }
            return a.id - b.id;
        });
    }, [uniqueCards, cardTypeFilter, rarityFilter, searchQuery]);

    const rarities = ["All", "SSR", "SR", "R"];

    return (
        <div className="w-full max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg my-8 border border-gray-200 dark:border-gray-700">
            <div 
                className="flex justify-between items-center mb-6 cursor-pointer select-none" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Card Collection Manager</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                        {Object.values(ownedCards).filter(l => l !== -1).length} Owned
                    </span>
                </div>
                <span className="text-gray-500 text-xl">{isExpanded ? "▼" : "▲"}</span>
            </div>
            
            {isExpanded && (
                <>
                    <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            {/* Type Filters */}
                            <CardTypeSelector 
                                selectedType={cardTypeFilter} 
                                onSelect={setCardTypeFilter} 
                            />
                            
                            {/* Rarity Filters */}
                            <div className="flex flex-wrap gap-2">
                                {rarities.map(rarity => (
                                    <button
                                        key={rarity}
                                        onClick={() => setRarityFilter(rarity)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            rarityFilter === rarity
                                                ? "bg-purple-600 text-white shadow-md"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }`}
                                    >
                                        {rarity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div className="w-full md:w-64 relative">
                            <input
                                type="text"
                                placeholder="Search cards..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                        {filteredAndSortedCards.map(card => {
                            const ownership = ownedCards[card.id] ?? -1;
                            
                            return (
                                <CollectionCard 
                                    key={card.id} 
                                    card={card} 
                                    ownership={ownership} 
                                    onOwnershipChange={handleOwnershipChange} 
                                />
                            );
                        })}
                    </div>
                    
                    {filteredAndSortedCards.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No cards found matching your filters.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

