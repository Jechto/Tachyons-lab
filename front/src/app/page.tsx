"use client";

import Image from "next/image";
import { useState, useEffect, startTransition, useCallback, useRef } from "react";
import { Tierlist, LimitBreakFilter, TierlistResponse, TierlistEntry, TierlistError } from "./classes/Tierlist";
import { DeckEvaluator } from "./classes/DeckEvaluator";
import { SupportCard } from "./classes/SupportCard";
import allDataRaw from "./data/data.json";
import { CardData } from "./types/cardTypes";
import TierlistDisplay from "./components/TierlistDisplay";
import TierlistCard from "./components/TierlistCard";
import StatPreviewer from "./components/StatPreviewer";
import { getAssetPath } from "./utils/paths";
import TrainingDistributionSelector from "./components/TrainingDistributionSelector";
import CardCollectionManager from "./components/CardCollectionManager";

// Types for our form state
type RaceType = "Sprint" | "Mile" | "Medium" | "Long";
type RunningStyle =
    | "Front Runner"
    | "Pace Chaser"
    | "Late Surger"
    | "End Closer";

interface DeckCard {
    id: number;
    charaId: number;
    limitBreak: number;
    cardName: string;
    cardRarity: string;
    cardType: string;
}

export default function Home() {
    // Form state
    const [selectedRaces, setSelectedRaces] = useState<RaceType[]>(["Medium"]);
    const [selectedStyles, setSelectedStyles] = useState<RunningStyle[]>([
        "Pace Chaser",
    ]);
    const [tierlistResult, setTierlistResult] = useState<TierlistResponse | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Deck management functions
    const [currentDeck, setCurrentDeck] = useState<DeckCard[]>([]);
    const [deckCardIds, setDeckCardIds] = useState<Set<string>>(new Set());

    // Training Distribution State
    const [isManualDistribution, setIsManualDistribution] = useState(false);
    const [manualDistribution, setManualDistribution] = useState<number[] | null>(null);
    const [calculatedDistribution, setCalculatedDistribution] = useState<number[]>([0.2, 0.2, 0.2, 0.2, 0.2]);
    const [selectedScenario, setSelectedScenario] = useState<string>("Unity");
    const [optionalRaces, setOptionalRaces] = useState<number>(0);

    // Debounce timer ref for auto-regeneration
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Update calculated distribution when deck changes
    useEffect(() => {
        const deckEvaluator = new DeckEvaluator();
        
        // Reconstruct deck in evaluator
        currentDeck.forEach(deckCard => {
            const cardData = allDataRaw.find(c => c.id === deckCard.id);
            if (cardData) {
                try {
                    const card = new SupportCard(deckCard.id, deckCard.limitBreak, allDataRaw as unknown as CardData[]);
                    deckEvaluator.addCard(card);
                } catch (e) {
                    console.error("Failed to add card to evaluator for distribution calc", e);
                }
            }
        });

        setCalculatedDistribution(deckEvaluator.getTrainingDistribution());
    }, [currentDeck]);

    // Race types and running styles
    const raceTypes: { value: RaceType; label: string }[] = [
        { value: "Sprint", label: "Sprint" },
        { value: "Mile", label: "Mile" },
        { value: "Medium", label: "Medium" },
        { value: "Long", label: "Long" },
    ];

    const runningStyles: { value: RunningStyle; label: string }[] = [
        { value: "Front Runner", label: "Front Runner" },
        { value: "Pace Chaser", label: "Pace Chaser" },
        { value: "Late Surger", label: "Late Surger" },
        { value: "End Closer", label: "End Closer" },
    ];

    // Deck management functions
    const handleCardClick = useCallback((card: TierlistEntry) => {
        // Use startTransition for non-urgent state updates
        startTransition(() => {
            const cardKey = `${card.id}-${card.limit_break}`;
            const cardId = card.id;
            const newLimitBreak = card.limit_break;
            const charaId = card.chara_id;

            // Check if this exact card is already in deck
            if (deckCardIds.has(cardKey)) {
                return;
            }

            // Check if any version of this card is already in deck
            const existingCardInDeck = currentDeck.find(
                (deckCard) => deckCard.id === cardId,
            );
            if (existingCardInDeck) {
                // If trying to add a lower or equal limit break version, prevent it
                if (newLimitBreak <= existingCardInDeck.limitBreak) {
                    return;
                }
                // If trying to add a higher limit break version, remove the lower one first
                const existingCardKey = `${existingCardInDeck.id}-${existingCardInDeck.limitBreak}`;
                setCurrentDeck((prev) =>
                    prev.filter(
                        (c) => `${c.id}-${c.limitBreak}` !== existingCardKey,
                    ),
                );
                setDeckCardIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(existingCardKey);
                    return newSet;
                });
            } else {
                // Check for same character ID
                const sameCharaCard = currentDeck.find(
                    (deckCard) => deckCard.charaId === charaId
                );
                if (sameCharaCard) {
                    return;
                }
            }

            // Add to deck (max 6 cards)
            if (currentDeck.length < 6 || existingCardInDeck) {
                const deckCard: DeckCard = {
                    id: card.id,
                    charaId: card.chara_id,
                    limitBreak: card.limit_break,
                    cardName: card.card_name,
                    cardRarity: card.card_rarity,
                    cardType: card.card_type,
                };
                setCurrentDeck((prev) => [...prev, deckCard]);
                setDeckCardIds((prev) => new Set([...prev, cardKey]));
                // useEffect will handle automatic regeneration
            }
        });
    }, [currentDeck, deckCardIds]);

    const clearDeck = () => {
        setCurrentDeck([]);
        setDeckCardIds(new Set());
        // useEffect will handle automatic regeneration
    };

    // Helper function to check if a card should be disabled/grayed out
    const getCardDisabledInfo = (
        cardId: number,
        limitBreak: number,
        charaId?: number,
    ): { disabled: boolean; reason?: string } => {
        const cardKey = `${cardId}-${limitBreak}`;

        // If this exact card is in deck, it's disabled
        if (deckCardIds.has(cardKey)) {
            return { disabled: true, reason: "IN DECK" };
        }

        // If any higher limit break version of this card is in deck, this card is disabled
        const existingCardInDeck = currentDeck.find(
            (deckCard) => deckCard.id === cardId,
        );
        if (existingCardInDeck && existingCardInDeck.limitBreak > limitBreak) {
            const existingLbText =
                existingCardInDeck.limitBreak === 4
                    ? "MLB"
                    : `${existingCardInDeck.limitBreak}LB`;
            return { disabled: true, reason: `${existingLbText} IN DECK` };
        }

        // Check for same character ID (if provided)
        if (charaId !== undefined) {
            const sameCharaCard = currentDeck.find(
                (deckCard) => deckCard.charaId === charaId && deckCard.id !== cardId
            );
            if (sameCharaCard) {
                return { disabled: true, reason: "SAME CHARACTER" };
            }
        }

        return { disabled: false };
    };

    // Backward compatibility function
    const isCardDisabled = (cardId: number, limitBreak: number): boolean => {
        return getCardDisabledInfo(cardId, limitBreak).disabled;
    };
    const handleRaceChange = (race: RaceType, checked: boolean) => {
        if (checked) {
            setSelectedRaces((prev) => [...prev, race]);
        } else {
            setSelectedRaces((prev) => prev.filter((r) => r !== race));
        }
    };

    const handleStyleChange = (style: RunningStyle, checked: boolean) => {
        if (checked) {
            setSelectedStyles((prev) => [...prev, style]);
        } else {
            setSelectedStyles((prev) => prev.filter((s) => s !== style));
        }
    };

    // Helper function to check if we can auto-regenerate tierlist
    const canAutoRegenerate = (): boolean => {
        return (
            selectedRaces.length > 0 &&
            selectedStyles.length > 0 &&
            !isGenerating
        );
    };

    // Generate tierlist
    const generateTierlist = async () => {
        if (selectedRaces.length === 0 || selectedStyles.length === 0) {
            alert("Please select at least one race type and one running style");
            return;
        }

        setIsGenerating(true);
        
        // Use startTransition to defer heavy computation and improve INP
        startTransition(() => {
        try {
            // Create deck evaluator with current deck
            const deckEvaluator = new DeckEvaluator();
            if (isManualDistribution && manualDistribution) {
                deckEvaluator.setManualDistribution(manualDistribution);
            }
            const allData = allDataRaw as CardData[];

            // Add cards to deck
            for (const deckCard of currentDeck) {
                try {
                    const supportCard = new SupportCard(
                        deckCard.id,
                        deckCard.limitBreak,
                        allData,
                    );
                    deckEvaluator.addCard(supportCard);
                } catch (error) {
                    console.warn(
                        `Failed to add card ${deckCard.id} to deck:`,
                        error,
                    );
                }
            }

            const tierlist = new Tierlist();

            // Convert our form state to the format expected by the Tierlist class
            const raceTypes = {
                Sprint: selectedRaces.includes("Sprint"),
                Mile: selectedRaces.includes("Mile"),
                Medium: selectedRaces.includes("Medium"),
                Long: selectedRaces.includes("Long"),
            };

            const runningTypes = {
                "Front Runner": selectedStyles.includes("Front Runner"),
                "Pace Chaser": selectedStyles.includes("Pace Chaser"),
                "Late Surger": selectedStyles.includes("Late Surger"),
                "End Closer": selectedStyles.includes("End Closer"),
            };

            // Create a filter that includes everything for visual filtering later
            const fullLimitBreakFilter: LimitBreakFilter = {
                R: [0, 1, 2, 3, 4],
                SR: [0, 1, 2, 3, 4],
                SSR: [0, 1, 2, 3, 4],
            };

            // Generate tierlist with current deck
            const result = tierlist.bestCardForDeck(
                deckEvaluator,
                raceTypes,
                runningTypes,
                allData,
                fullLimitBreakFilter,
                selectedScenario,
                optionalRaces,
            );
            setTierlistResult(result);
        } catch (error) {
            setTierlistResult({ success: false, error: error?.toString() } as TierlistError);
        } finally {
            setIsGenerating(false);
        }
        });
    };

    // Auto-regenerate tierlist when deck changes (with debounce)
    useEffect(() => {
        // Clear any pending timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set a new timer to regenerate after 300ms of inactivity
        debounceTimerRef.current = setTimeout(() => {
            if (canAutoRegenerate()) {
                generateTierlist();
            }
        }, 300);

        // Cleanup on unmount
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDeck]); // Only depend on currentDeck changes

    return (
        <>
            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@graph": [
                            {
                                "@type": "WebSite",
                                "name": "Tachyons Uma Lab",
                                "url": "https://jechto.github.io/Tachyons-lab/",
                                "potentialAction": {
                                    "@type": "SearchAction",
                                    "target": "https://jechto.github.io/Tachyons-lab/?q={search_term_string}",
                                    "query-input": "required name=search_term_string"
                                }
                            },
                            {
                                "@type": "WebApplication",
                                "name": "Uma Musume Deckbuilder and Tierlist Generator",
                                "description": "Free Global Uma Musume support card optimization tool with tierlist generation and deckbuilding capabilities",
                                "applicationCategory": "GameApplication",
                                "operatingSystem": "Web Browser",
                                "offers": {
                                    "@type": "Offer",
                                    "price": "0",
                                    "priceCurrency": "USD"
                                },
                                "author": {
                                    "@type": "Organization",
                                    "name": "Tachyons Uma Lab"
                                },
                                "about": {
                                    "@type": "VideoGame",
                                    "name": "Uma Musume Pretty Derby",
                                    "publisher": "Cygames"
                                }
                            }
                        ]
                    })
                }}
            />
            
            <div className="flex min-h-screen flex-col items-center justify-center p-1 md:p-12 lg:p-24 max-w-7xl mx-auto">
            <header className="text-center mb-8 relative">
                {/* Logo Background - positioned with reserved space to prevent CLS */}
                <div className="absolute -top-16 md:-top-20 left-1/2 transform -translate-x-1/2 pointer-events-none w-[160px] h-[160px] md:w-[200px] md:h-[200px]">
                    <div className="relative w-full h-full">
                        {/* Medium-sized logo for desktop */}
                        <Image
                            src={getAssetPath("/images/logo/logo512.png")}
                            alt="Tachyons Lab Logo"
                            width={200}
                            height={200}
                            className="opacity-40 dark:opacity-30 hidden md:block"
                            priority
                            unoptimized
                            loading="eager"
                        />
                        {/* Smaller logo for mobile */}
                        <Image
                            src={getAssetPath("/images/logo/logo128.png")}
                            alt="Tachyons Lab Logo"
                            width={160}
                            height={160}
                            className="opacity-40 dark:opacity-30 md:hidden"
                            priority
                            unoptimized
                            loading="eager"
                        />
                    </div>
                </div>
                
                {/* Text Content - moved up significantly for better positioning */}
                <div className="relative z-10 pt-8 md:pt-12">
                    <h1 className="text-6xl font-bold mb-4">
                        Tachyon&apos;s Uma Lab
                    </h1>
                    <h2 className="text-2xl mb-4 text-gray-600 dark:text-gray-400">
                        Uma Musume Tierlist and Deckbuilder
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                        Generate optimized support card tierlists and build perfect decks for your Uma Musume races. 
                        Analyze card synergies, stat distributions, and hint effectiveness for any racing strategy.
                    </p>
                </div>
            </header>

            {/* Tierlist Configuration Form */}
            <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600 mb-8">
                <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                    Generate Tierlist
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Configure the race distance and running strategy for your deck. These settings directly affect the grading and ranking of each support card.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    {/* Race Types */}
                    <div>
                        <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            Race Types
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {raceTypes.map((race) => {
                                const isSelected = selectedRaces.includes(race.value);
                                return (
                                    <label
                                        key={race.value}
                                        className={`cursor-pointer p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                                            isSelected
                                                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                                : "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) =>
                                                handleRaceChange(
                                                    race.value,
                                                    e.target.checked,
                                                )
                                            }
                                            className="sr-only"
                                        />
                                        {race.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Running Styles */}
                    <div>
                        <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            Running Styles
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {runningStyles.map((style) => {
                                const isSelected = selectedStyles.includes(style.value);
                                return (
                                    <label
                                        key={style.value}
                                        className={`cursor-pointer p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                                            isSelected
                                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                                : "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) =>
                                                handleStyleChange(
                                                    style.value,
                                                    e.target.checked,
                                                )
                                            }
                                            className="sr-only"
                                        />
                                        {style.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Current Deck Display */}
                {currentDeck.length > 0 ? (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700 min-h-[180px]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                                Current Deck ({currentDeck.length}/6)
                            </h4>
                            <button
                                onClick={clearDeck}
                                className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded transition-colors"
                            >
                                Clear Deck
                            </button>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            💡 Click on cards to remove them from your deck
                            {canAutoRegenerate() && (
                                <span className="block mt-1">
                                    🔄 Tierlist will automatically update when
                                    you modify your deck
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3 min-h-[120px]">{currentDeck.map((card) => {
                                const cardKey = `${card.id}-${card.limitBreak}`;
                                
                                // Find the corresponding tierlist entry for tooltip data
                                const findTierlistEntry = () => {
                                    if (!tierlistResult || !('tierlist' in tierlistResult)) return null;
                                    
                                    const successResult = tierlistResult;
                                    // Search through all tiers for the matching card
                                    for (const tier of Object.values(successResult.tierlist)) {
                                        if (Array.isArray(tier)) {
                                            const entry = tier.find(entry => 
                                                entry.id === card.id && 
                                                entry.limit_break === card.limitBreak
                                            );
                                            if (entry) return entry;
                                        }
                                    }
                                    return null;
                                };
                                
                                const tierlistEntry = findTierlistEntry();
                                
                                return (
                                    <div
                                        key={cardKey}
                                        className="relative group"
                                    >
                                        <TierlistCard
                                            id={card.id}
                                            cardName={card.cardName}
                                            cardRarity={card.cardRarity}
                                            limitBreak={card.limitBreak}
                                            cardType={card.cardType}
                                            score={0} // No score in deck view
                                            deltaStats={tierlistEntry?.stats}
                                            hints={tierlistEntry?.hints}
                                            hintTypes={tierlistEntry?.hintTypes}
                                            onClick={() => {
                                                // Remove from deck when clicked
                                                setCurrentDeck((prev) =>
                                                    prev.filter(
                                                        (c) =>
                                                            `${c.id}-${c.limitBreak}` !==
                                                            cardKey,
                                                    ),
                                                );
                                                setDeckCardIds((prev) => {
                                                    const newSet = new Set(
                                                        prev,
                                                    );
                                                    newSet.delete(cardKey);
                                                    return newSet;
                                                });

                                                // useEffect will handle automatic regeneration
                                            }}
                                            isInDeck={true}
                                            inDeckView={true}
                                            className="hover:scale-110 transition-transform"
                                        />
                                        {/* Remove indicator on hover */}
                                        <div className="absolute inset-0 bg-red-500 bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                                            <span className="text-white font-bold text-lg drop-shadow-lg">
                                                ✖
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Gametora Links */}
                        {currentDeck.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-600">
                                <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                                    View Cards on Gametora:
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {currentDeck.map((card) => {
                                        const cardKey = `${card.id}-${card.limitBreak}`;
                                        const cleanedName = card.cardName
                                            .toLowerCase()
                                            .replace(/[^a-z0-9\s]/g, '')
                                            .replace(/\s+/g, '-')
                                            .replace(/-+/g, '-')
                                            .replace(/^-|-$/g, '');
                                        const gametorUrl = `https://gametora.com/umamusume/supports/${card.id}-${cleanedName}`;
                                        
                                        return (
                                            <a
                                                key={cardKey}
                                                href={gametorUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs rounded-md hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                {card.cardName}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[180px] flex items-center justify-center">
                        <div className="text-center text-gray-600 dark:text-gray-400">
                            <div className="text-4xl mb-2">🃏</div>
                            <h4 className="text-lg font-semibold mb-2">
                                No cards in deck
                            </h4>
                            <p className="text-sm">
                                Generate a tierlist and click on cards to add
                                them to your deck (max 6 cards)
                            </p>
                            {canAutoRegenerate() && (
                                <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                                    Tierlist will auto-update as you build
                                    your deck
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Training Distribution Selector */}
                <div className="mt-6">
                    <TrainingDistributionSelector
                        calculatedDistribution={calculatedDistribution}
                        manualDistribution={manualDistribution}
                        isManual={isManualDistribution}
                        onToggleManual={(val) => {
                            setIsManualDistribution(val);
                            if (val && !manualDistribution) {
                                setManualDistribution(calculatedDistribution);
                            }
                        }}
                        onManualDistributionChange={setManualDistribution}
                    />
                </div>

                {/* Scenario Selection and Generate Button */}
                <div className="mt-8 flex flex-col md:flex-row justify-center items-center gap-4 border-t border-gray-200 dark:border-gray-700 pt-6 min-h-[80px]">
                    <div className="flex items-center gap-2">
                        <label htmlFor="scenario-select" className="font-medium text-gray-700 dark:text-gray-300">
                            Scenario:
                        </label>
                        <select
                            id="scenario-select"
                            value={selectedScenario}
                            onChange={(e) => setSelectedScenario(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        >
                            <option value="URA">URA Finals</option>
                            <option value="Unity">Unity</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label htmlFor="optional-races" className="font-medium text-gray-700 dark:text-gray-300">
                            Optional Races:
                        </label>
                        <input
                            type="number"
                            id="optional-races"
                            min="0"
                            max="40"
                            value={optionalRaces}
                            onChange={(e) => setOptionalRaces(Math.min(40, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-20"
                        />
                    </div>

                    <button
                        onClick={generateTierlist}
                        disabled={
                            isGenerating ||
                            selectedRaces.length === 0 ||
                            selectedStyles.length === 0
                        }
                        className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
                    >
                        {isGenerating ? "Generating..." : "Get Tierlist"}
                    </button>
                </div>
            </div>

            {/* Stat Previewer */}
            <div className="w-full max-w-6xl mb-8 min-h-[200px]">
                <StatPreviewer
                    currentDeck={currentDeck}
                    allData={allDataRaw as CardData[]}
                    deckStats={tierlistResult && 'deck' in tierlistResult ? tierlistResult.deck.stats : undefined}
                    scoreBreakdown={tierlistResult && 'deck' in tierlistResult ? tierlistResult.deck.scoreBreakdown : undefined}
                    scenarioName={selectedScenario}
                    manualDistribution={isManualDistribution ? manualDistribution : null}
                    optionalRaces={optionalRaces}
                />
            </div>

            {/* Card Collection Manager */}
            <CardCollectionManager />

            {/* Tierlist Results */}
            {tierlistResult && (
                <div className="w-full max-w-6xl space-y-6 mb-8 min-h-[400px]" style={{contentVisibility: 'auto'}}>
                    {/* Visual Tierlist */}
                    {'tierlist' in tierlistResult && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600">
                            <TierlistDisplay
                                tierlistData={'tierlist' in tierlistResult ? tierlistResult.tierlist : {}}
                                onCardClick={handleCardClick}
                                deckCardIds={deckCardIds}
                                isCardDisabled={isCardDisabled}
                                getCardDisabledInfo={getCardDisabledInfo}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg font-medium mb-4">Uma Musume support card optimization tools</p>
                
                {/* Technical Credits */}
                <p className="text-sm mb-4">
                    Built with Next.js, TypeScript, and Tailwind CSS
                </p>
                
                {/* Data Sources & Inspiration */}
                <div className="text-sm mb-4 space-y-1">
                    <p>Images and event data courtesy of <a 
                        href="https://gametora.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >GameTora</a></p>
                    <p>Inspired by <a 
                        href="https://euophrys.github.io/uma-tiers/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >uma-tiers</a></p>
                </div>
                
                {/* Legal Disclaimer */}
                <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4 max-w-2xl mx-auto">
                    <p className="mb-2">
                        This tool is not affiliated with the developers of Uma Musume. 
                        All materials from the Uma Musume game are copyrights of Cygames, Inc.
                    </p>
                    <p className="text-center mt-4" suppressHydrationWarning>
                        Last updated: {process.env.NEXT_PUBLIC_BUILD_TIME 
                            ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : "Unknown"}
                    </p>
                </div>
            </div>
        </div>
        </>
    );
}
