import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { DeckEvaluator } from "../classes/DeckEvaluator";
import { SupportCard } from "../classes/SupportCard";
import { CardData } from "../types/cardTypes";
import { getAssetPath } from "../utils/paths";
import { TrainingData, SparkSlot } from "../config/trainingData";
import { VARIANCE_MULTIPLIER } from "../config/varianceConfig";

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
    // Career per-stat variance (combinatorial training spread) from
    // DeckEvaluator. Same shape as `deckStats` but describing the spread of
    // the displayed TOTAL stats (mean = base + delta). Missing on decks
    // computed before the variance estimator existed.
    deckStatsVariance?: {
        Speed?: number;
        Stamina?: number;
        Power?: number;
        Guts?: number;
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
        raceBonusPenalty: number;
        raceBonusPenaltyReason: string;
        usefulHintsPenalty: number;
        usefulHintsPenaltyReason: string;
        statOverbuiltPenalty: number;
        statOverbuiltPenaltyReason: string;
        statContributions: Array<{
            stat: string;
            value: number;
            weight: number;
            contribution: number;
            icon_id?: number;
        }>;
        activeRaceTypes: string[];
        staminaThreshold: number;
        speedThreshold: number;
    };
    scenarioName?: string;
    manualDistribution?: number[] | null;
    optionalRaces?: {G1: number, G2or3: number, PreOPorOP: number};
    averageMood?: number;
    sparks?: SparkSlot[];
    statsVersion?: number;
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

// Per-stat run-outcome distribution band (option "A": inline bullet strip).
//
// The career stat total is modelled as a per-stat sum of independent per-turn
// training PMFs. With ~60 turns the CLT justifies a symmetric normal
// approximation; percentiles are derived from mean ± z·sigma where
//   z(99%) = 2.326, z(90%) = 1.282.
//
// Spread shown is the COMBINATORIAL training spread only (cards
// appearing/not-appearing on a given turn). Flat-averaged sources
// (scenarioBonusStats, race rewards, megaphone, spirit bursts, concert
// cardBuffs) contribute zero variance in the current model, so the band is a
// LOWER bound on the true tail width — see DeckEvaluator.evaluateStats for the
// variance accumulator that feeds this component.
function StatDistributionBand({
    statName,
    median,
    variance,
}: {
    statName: string;
    median: number;
    variance?: number;
}) {
    // No variance supplied at all (e.g. deckStatsVariance prop missing) →
    // skip entirely. CARDS driving a combinatorial PMF always yield variance ≥ 1
    // for the stats they touch, so variance === 0 means the stat is
    // deterministic in this deck (no cards of its type AND no off-stat bonus
    // from any card). That case is rendered as a compact "no spread" stub
    // below instead of hiding the row — it correlates with negative deltas
    // (training redirected away from this stat), which is exactly when the
    // user expects to still see the row.
    if (variance === undefined) return null;

    // Inflate variance to compensate for untracked sources of run-to-run
    // variation (energy events, race RNG, mood drift, hint RNG, ...). The raw
    // band is a LOWER bound on true tail width; VARIANCE_MULTIPLIER widens it.
    const scaledVariance = variance > 0 ? variance * VARIANCE_MULTIPLIER : 0;
    const sigma = scaledVariance > 0 ? Math.sqrt(scaledVariance) : 0;
    // Symmetric (CLT) percentile approximation. Asymmetry from back-loading
    // (e.g. Grand Concert's cardBuffs) is NOT captured yet — tails will be
    // equidistant from the median, which the user accepted as the MVP behaviour.
    const p1 = median - 2.326 * sigma;
    const p10 = median - 1.282 * sigma;
    const p50 = median;
    const p90 = median + 1.282 * sigma;
    const p99 = median + 2.326 * sigma;
    const span = p99 - p1;
    const hasSpread = span >= 1;

    if (!hasSpread) {
        // Deterministic stat: no combinatorial variance. Show the median as a
        // single tick with a "no spread" caption so the row stays visible and
        // consistent with the other stats.
        const stubTitle = `${statName}: ${Math.round(median)} (no run-to-run spread)`;
        return (
            <div className="mt-2" title={stubTitle}>
                <svg
                    viewBox="0 0 100 14"
                    preserveAspectRatio="none"
                    className="w-full h-3.5"
                    role="img"
                    aria-label={stubTitle}
                >
                    <line
                        x1="0"
                        y1="7"
                        x2="100"
                        y2="7"
                        className="stroke-gray-300 dark:stroke-gray-600"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />
                    <line
                        x1="50"
                        y1="0.5"
                        x2="50"
                        y2="13.5"
                        className="stroke-gray-800 dark:stroke-gray-100"
                        strokeWidth="1.8"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                <div className="relative mt-0.5 h-3.5 text-[9px] leading-none text-gray-600 dark:text-gray-400 tabular-nums">
                    <span
                        className="absolute -translate-x-1/2 font-semibold text-gray-800 dark:text-gray-200"
                        style={{ left: "50%" }}
                    >
                        {Math.round(median)}
                    </span>
                </div>
            </div>
        );
    }

    // SVG viewBox is 0..100 wide, 14 tall; `preserveAspectRatio="none"` lets
    // it scale horizontally to the card width. `vector-effect` keeps strokes
    // 1px regardless of horizontal stretching. `overflow: visible` on the svg
    // prevents the P1/P99 edge ticks from being clipped at the viewBox border.
    const titleText =
        `Worst 1%: ${Math.round(p1)} · ` +
        `Bottom 10%: ${Math.round(p10)} · ` +
        `Typical: ${Math.round(p50)} · ` +
        `Top 10%: ${Math.round(p90)} · ` +
        `Best 1%: ${Math.round(p99)}`;
    // Label positions as % of the full band width (p1 → 0%, p99 → 100%).
    // Used for the SVG tail/band connector ticks and the text labels below.
    const r = (n: number) => Math.round(n).toString();
    const lp1 = 0;
    const lp10 = ((p10 - p1) / span) * 100;
    const lp50 = 50;
    const lp90 = ((p90 - p1) / span) * 100;
    const lp99 = 100;

    return (
        <div
            className="mt-2 px-px"
            title={titleText}
            aria-label={`${statName} run distribution. ${titleText}`}
        >
            <svg
                viewBox="0 0 100 16"
                preserveAspectRatio="none"
                className="w-full h-4"
                style={{ overflow: "visible" }}
                role="img"
            >
                {/* Outer axis: full P1 → P99 range */}
                <line
                    x1="0"
                    y1="7"
                    x2="100"
                    y2="7"
                    className="stroke-gray-300 dark:stroke-gray-600"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                />
                {/* Typical band: P10 → P90 (middle 80% of runs) */}
                <rect
                    x={lp10}
                    y="3"
                    width={Math.max(0, lp90 - lp10)}
                    height="8"
                    rx="1.5"
                    className="fill-indigo-300 dark:fill-indigo-700/70"
                />
                {/* Median (typical run) tick — bold, full height */}
                <line
                    x1={lp50}
                    y1="0.5"
                    x2={lp50}
                    y2="13.5"
                    className="stroke-gray-800 dark:stroke-gray-100"
                    strokeWidth="1.8"
                    vectorEffect="non-scaling-stroke"
                />
                {/* Outer tail ticks: P1 and P99 — tall + amber so they read as
                    "tail" markers, not background fuzz. */}
                <line
                    x1={lp1}
                    y1="1"
                    x2={lp1}
                    y2="13"
                    className="stroke-amber-500 dark:stroke-amber-400"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1={lp99}
                    y1="1"
                    x2={lp99}
                    y2="13"
                    className="stroke-amber-500 dark:stroke-amber-400"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                />
                {/* P10 / P90 connector ticks — drop below the bar to mark the
                    band edges. Short, indigo to match the band. */}
                <line
                    x1={lp10}
                    y1="11"
                    x2={lp10}
                    y2="14"
                    className="stroke-indigo-400 dark:stroke-indigo-500"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1={lp90}
                    y1="11"
                    x2={lp90}
                    y2="14"
                    className="stroke-indigo-400 dark:stroke-indigo-500"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            {/* Percentile numbers below the bar, color-matched to the legend:
                amber = 1% tails, indigo = 10% cutoffs, white = median.
                Edge values (P1/P99) get a small outward nudge so 3–4 digit
                tail labels don't collide with the P10/P90 cutoff labels on
                narrow bars. `overflow: visible` lets the nudge render past
                the row box; inner values center on their tick. */}
            <div className="relative mt-0.5 h-3.5 text-[9px] leading-none tabular-nums" style={{ overflow: "visible" }}>
                <span
                    className="absolute text-amber-500 dark:text-amber-400"
                    style={{ left: `${lp1}%`, transform: "translateX(-4px)" }}
                >
                    {r(p1)}
                </span>
                <span
                    className="absolute -translate-x-1/2 text-indigo-500 dark:text-indigo-300"
                    style={{ left: `${lp10}%` }}
                >
                    {r(p10)}
                </span>
                <span
                    className="absolute -translate-x-1/2 font-semibold text-gray-800 dark:text-white"
                    style={{ left: `${lp50}%` }}
                >
                    {r(p50)}
                </span>
                <span
                    className="absolute -translate-x-1/2 text-indigo-500 dark:text-indigo-300"
                    style={{ left: `${lp90}%` }}
                >
                    {r(p90)}
                </span>
                <span
                    className="absolute text-amber-500 dark:text-amber-400"
                    style={{ left: `${lp99}%`, transform: "translateX(calc(-100% + 4px))" }}
                >
                    {r(p99)}
                </span>
            </div>
        </div>
    );
}

// One-off legend shared above the stat grid, explaining the bullet strip's
// visual encoding so any reader can decode the bands without tooltips.
function DistributionLegend() {
    return (
        <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
                Run-outcome range:
            </span>
            {/* Mini bullet identical in encoding to StatDistributionBand */}
            <svg
                viewBox="0 0 60 10"
                preserveAspectRatio="none"
                className="h-3 w-16 inline-block align-middle"
                style={{ overflow: "visible" }}
                aria-hidden="true"
            >
                <line
                    x1="0"
                    y1="5"
                    x2="60"
                    y2="5"
                    className="stroke-gray-300 dark:stroke-gray-600"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                />
                <rect
                    x="10"
                    y="2.5"
                    width="40"
                    height="5"
                    rx="1"
                    className="fill-indigo-300 dark:fill-indigo-700/70"
                />
                <line
                    x1="30"
                    y1="0"
                    x2="30"
                    y2="10"
                    className="stroke-gray-800 dark:stroke-gray-100"
                    strokeWidth="1.8"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="9"
                    className="stroke-amber-500 dark:stroke-amber-400"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1="60"
                    y1="1"
                    x2="60"
                    y2="9"
                    className="stroke-amber-500 dark:stroke-amber-400"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                />
                {/* P10 / P90 cutoff ticks — indigo, match the "10%" text */}
                <line
                    x1="10"
                    y1="6"
                    x2="10"
                    y2="9"
                    className="stroke-indigo-400 dark:stroke-indigo-500"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1="50"
                    y1="6"
                    x2="50"
                    y2="9"
                    className="stroke-indigo-400 dark:stroke-indigo-500"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <span>
                <span className="font-semibold text-amber-500 dark:text-amber-400">1%</span> = worst/best tail runs &middot;{" "}
                <span className="font-semibold text-indigo-400 dark:text-indigo-500">10%</span> = bottom/top cutoffs (middle 80% band) &middot;{" "}
                <span className="font-semibold text-gray-800 dark:text-white">median</span> = typical run.
            </span>
            <span className="w-full text-red-600 dark:text-red-400 font-medium">
                This range assumes the training distribution above is roughly followed. Estimates training spread only.
            </span>
        </div>
    );
}

export default function StatPreviewer({
    currentDeck,
    allData,
    deckStats,
    deckStatsVariance,
    scoreBreakdown,
    scenarioName = "MANT",
    manualDistribution = null,
    optionalRaces = {G1: 0, G2or3: 0, PreOPorOP: 0},
    averageMood = 0,
    sparks = [],
    statsVersion = 0,
}: StatPreviewerProps) {
    // Spark bonuses: cap raise per stat (affects colour thresholds) and flat starting
    // stats (added on top of the displayed totals, never halved). Keys use "Intelligence" for Wit.
    const { capBonus: sparkCapBonus, flatStats: sparkFlatStats } = TrainingData.getSparkBonuses(sparks);
    const [isExpanded, setIsExpanded] = useState(false);
    const [cachedStats, setCachedStats] = useState<{ currentStats: StatData; statDifference: StatDifference } | null>(null);
    const [rowTooltip, setRowTooltip] = useState<{ units: string; weight: string; x: number; y: number } | null>(null);

    // Use refs to store latest values for the effect to access
    const currentDeckRef = useRef(currentDeck);
    const deckStatsRef = useRef(deckStats);
    const scenarioNameRef = useRef(scenarioName);
    const manualDistributionRef = useRef(manualDistribution);
    const averageMoodRef = useRef(averageMood);

    // Keep refs updated
    currentDeckRef.current = currentDeck;
    deckStatsRef.current = deckStats;
    scenarioNameRef.current = scenarioName;
    manualDistributionRef.current = manualDistribution;
    averageMoodRef.current = averageMood;

    // Update cached stats only when statsVersion changes
    useEffect(() => {
        const newStats = calculateStatDifference(
            currentDeckRef.current,
            deckStatsRef.current,
            scenarioNameRef.current,
            manualDistributionRef.current,
            averageMoodRef.current
        );
        setCachedStats(newStats);
    }, [statsVersion]);

    // Load expansion state
    useEffect(() => {
        const saved = localStorage.getItem("tachyons_stat_preview_expanded");
        if (saved !== null) {
            setIsExpanded(saved === "true");
        }
    }, []);

    // Save expansion state
    useEffect(() => {
        localStorage.setItem("tachyons_stat_preview_expanded", String(isExpanded));
    }, [isExpanded]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const calculateStatDifference = (
        currentDeck: DeckCard[],
        deckStats?: {
            Speed: number;
            Stamina: number;
            Power: number;
            Guts: number;
            Wit?: number;
            "Skill Points"?: number;
        },
        scenarioNameProp?: string,
        manualDistributionProp?: number[] | null,
        averageMoodProp?: number,
    ): { currentStats: StatData; statDifference: StatDifference } => {
        // Use passed props or fall back to component props
        const scenario = scenarioNameProp ?? scenarioName;
        const mood = averageMoodProp ?? averageMood;
        const manualDist = manualDistributionProp ?? manualDistribution;
        
        // If we have deckStats from the API, use those for the delta stats
        if (deckStats) {
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
                if (manualDist) {
                    emptyDeckEvaluator.setManualDistribution(manualDist);
                }
                // Base stats should be calculated with 0 optional races to correctly show the delta
                const baseStats = emptyDeckEvaluator.evaluateStats(scenario, mood, {G1: 0, G2or3: 0, PreOPorOP: 0});

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

        // Fallback: If no API stats provided, return zeros to ensure UI only updates on generation
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
    };

    const { currentStats, statDifference } = cachedStats || {
        currentStats: { Speed: 0, Stamina: 0, Power: 0, Guts: 0, Wit: 0, "Skill Points": 0 },
        statDifference: { Speed: 0, Stamina: 0, Power: 0, Guts: 0, Wit: 0, "Skill Points": 0 }
    };

    const getStatColor = (value: number): string => {
        if (value > 0) return "text-green-600 dark:text-green-400";
        if (value < 0) return "text-red-600 dark:text-red-400";
        return "text-gray-600 dark:text-gray-400";
    };

    const getStatIcon = (statName: string, iconId?: number): string => {
        // If icon_id is provided, use the specific skill icon
        if (iconId !== undefined) {
            return getAssetPath(`images/skills/${iconId}.png`);
        }
        
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
            case "Useful Hints":
                return getAssetPath("images/icons/Hint.png");
            case "Gold Skills":
                return getAssetPath("images/icons/SkillPoint.png");
            default:
                // For individual skill names, use SkillPoint icon as fallback
                return getAssetPath("images/icons/SkillPoint.png");
        }
    };

    const formatStatValue = (value: number): string => {
        if (value > 0) return `+${value}`;
        return value.toString();
    };

    const getRowTooltip = (statName: string, isGoldSkill: boolean): { units: string; weight: string } | null => {
        if (isGoldSkill) {
            return {
                units: "Estimated value of this skill's effect converted to equivalent raw stats.",
                weight: "Estimated proc chance during a race based on your selected distance and running style.",
            };
        }
        switch (statName) {
            case "Speed":
                return { units: "Speed points contributed by your support cards.", weight: "How heavily Speed is valued for your selected race type." };
            case "Stamina":
                return { units: "Stamina points contributed by your support cards.", weight: "How heavily Stamina is valued for your selected race type." };
            case "Power":
                return { units: "Power points contributed by your support cards.", weight: "How heavily Power is valued for your selected race type." };
            case "Guts":
                return { units: "Guts points contributed by your support cards.", weight: "How heavily Guts is valued for your selected race type." };
            case "Wit":
                return { units: "Wit points contributed by your support cards.", weight: "How heavily Wit is valued for your selected race type." };
            case "Skill Points":
                return { units: "Skill points contributed by your support cards.", weight: "Score value per skill point." };
            case "Useful Hints":
                return { units: "Estimated useful hints per run (total hints × useful hint rate).", weight: "Score value per useful hint." };
            default:
                return null;
        }
    };

    const formatAbsoluteValue = (value: number): string => {
        return value.toString();
    };

    // Always show component, but content is collapsible
    const hasContent = currentDeck.length > 0;

    return (
        <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    Deck Stat Preview
                </h4>
                <div className="flex items-center gap-3">
                    {hasContent && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            NOTE: Total stats exclude events from Main story and
                            Inspiration.
                        </div>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
                    {deckStatsVariance && <DistributionLegend />}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(currentStats).map(
                            ([statName, currentValue]) => {
                                const deltaValue =
                                    statDifference[
                                        statName as keyof StatDifference
                                    ];
                                
                                // Check for soft-capped (halved gains) and overbuilt (over scenario max) stats.
                                // Spark cap bonuses raise the max; spark flat stats sit on top (never halved).
                                const maxStats = TrainingData.getMaxStats(scenarioName);
                                const statKey = statName === "Wit" ? "Intelligence" : statName;
                                const flat = sparkFlatStats[statKey] || 0;
                                const effMax = maxStats[statKey] !== undefined ? maxStats[statKey] + (sparkCapBonus[statKey] || 0) : undefined;
                                // Colour is judged on the RAW trainable portion (excludes flat spark
                                // stats). The displayed value below is the EFFECTIVE total after the
                                // in-game soft-cap (gains above 1200 halved, clamped at the scenario
                                // max) so players see the same number the game reports at end-of-run.
                                const trainable = currentValue;
                                const isOverbuilt = effMax !== undefined && trainable > effMax;
                                const isSoftCapped = effMax !== undefined && !isOverbuilt && trainable > TrainingData.SOFT_STAT_CAP;
                                const effectiveTrainable = (effMax !== undefined && trainable > TrainingData.SOFT_STAT_CAP)
                                    ? Math.round(TrainingData.getEffectiveStat(trainable, effMax))
                                    : trainable;
                                const displayValue = effectiveTrainable + flat;
                                const displayMax = effMax !== undefined ? effMax + flat : undefined;

                                return (
                                    <div
                                        key={statName}
                                        className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center"
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
                                        <div className={`text-lg font-bold mb-1 ${isOverbuilt ? "text-red-600 dark:text-red-400" : isSoftCapped ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"}`}>
                                            {formatAbsoluteValue(displayValue)}
                                            {displayMax !== undefined && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/{displayMax}</span>}
                                        </div>
                                        <div
                                            className={`text-sm font-medium ${getStatColor(deltaValue)}`}
                                        >
                                            ({formatStatValue(deltaValue)})
                                        </div>
                                        {deckStatsVariance && (
                                            <StatDistributionBand
                                                statName={statName}
                                                /* Spread applies to the
                                                   displayed total (trainable +
                                                   flat sparks, since flat
                                                   sparks carry zero variance). */
                                                median={displayValue}
                                                variance={
                                                    deckStatsVariance[
                                                        statName as keyof typeof deckStatsVariance
                                                    ] ?? 0
                                                }
                                            />
                                        )}
                                    </div>
                                );
                            },
                        )}
                    </div>

                    <div className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
                        💡 Shows total stats acquired from training and running with your deck.
                        Numbers in brackets show the delta compared to an empty deck
                    </div>

                    {/* Score Breakdown Section - Always show when expanded */}
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Deck Score Breakdown
                        </h5>

                        {scoreBreakdown ? (
                            /* Score Calculation Receipt with real data */
                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Score Calculation Receipt
                                </div>

                                {/* Receipt Table */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {/* Table Header */}
                                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
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
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {scoreBreakdown.statContributions.map(
                                            (stat, index) => {
                                                // Check if this stat was capped
                                                const maxStats = TrainingData.getMaxStats(scenarioName);
                                                const statKey = stat.stat === "Wit" ? "Intelligence" : stat.stat;
                                                const maxVal = maxStats[statKey];
                                                
                                                // We need to check the raw stat value to see if it was capped
                                                // But here we only have the contribution (delta)
                                                // Let's look up the current stat value from currentStats
                                                const currentStatValue = currentStats[stat.stat as keyof StatData];
                                                // Spark cap bonuses raise the max used for thresholds
                                                const effMax = maxVal !== undefined ? maxVal + (sparkCapBonus[statKey] || 0) : undefined;
                                                // Over the scenario max -> hard capped (red); between 1200 and max -> halved gains (blue)
                                                const isOvercapped = effMax !== undefined && currentStatValue > effMax;
                                                const isSoftCapped = effMax !== undefined && !isOvercapped && currentStatValue > TrainingData.SOFT_STAT_CAP;
                                                const isCapped = isOvercapped || isSoftCapped;
                                                const capBg = isOvercapped ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20";
                                                const capNameText = isOvercapped ? "text-red-700 dark:text-red-300 font-medium" : "text-blue-700 dark:text-blue-300 font-medium";
                                                const capValueText = isOvercapped ? "text-red-700 dark:text-red-300 font-bold" : "text-blue-700 dark:text-blue-300 font-bold";
                                                const capWeightText = isOvercapped ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400";
                                                const capContribText = isOvercapped ? "text-red-700 dark:text-red-300" : "text-blue-700 dark:text-blue-300";
                                                const capLabel = isOvercapped ? "(Capped)" : "(above 1200 halved)";

                                                // Check if this is a gold skill (not a standard stat)
                                                const standardStats = ["Speed", "Stamina", "Power", "Guts", "Wit", "Skill Points", "Hints", "Useful Hints", "Gold Skills"];
                                                const isGoldSkill = !standardStats.includes(stat.stat);

                                                const tooltip = getRowTooltip(stat.stat, isGoldSkill);
                                                return (
                                                <div
                                                    key={stat.stat}
                                                    className={`px-3 py-1 grid grid-cols-4 gap-3 items-center cursor-default ${
                                                        isGoldSkill
                                                            ? "bg-yellow-50 dark:bg-yellow-900/30"
                                                            : isCapped
                                                                ? capBg
                                                                : index % 2 === 0
                                                                    ? "bg-white dark:bg-gray-800"
                                                                    : "bg-gray-50 dark:bg-gray-700/20"
                                                    }`}
                                                    onMouseEnter={tooltip ? (e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setRowTooltip({ ...tooltip, x: rect.left + rect.width / 2, y: rect.top });
                                                    } : undefined}
                                                    onMouseLeave={tooltip ? () => setRowTooltip(null) : undefined}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Image
                                                            src={getStatIcon(
                                                                stat.stat,
                                                                stat.icon_id,
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
                                                        <span className={`text-sm ${
                                                            isGoldSkill 
                                                                ? "text-yellow-700 dark:text-yellow-300 font-normal"
                                                                : isCapped
                                                                    ? capNameText
                                                                    : "text-gray-700 dark:text-gray-300 font-medium"
                                                        }`}>
                                                            {stat.stat}
                                                            {isCapped && <span className="ml-1 text-xs font-normal opacity-75">{capLabel}</span>}
                                                        </span>
                                                    </div>
                                                    <div className={`text-right text-sm font-mono ${
                                                        isGoldSkill
                                                            ? "text-yellow-700 dark:text-yellow-300 font-semibold"
                                                            : isCapped
                                                                ? capValueText
                                                                : "text-gray-800 dark:text-gray-200"
                                                    }`}>
                                                        {Math.round(stat.value)}
                                                    </div>
                                                    <div className={`text-right text-sm font-mono ${
                                                        isGoldSkill
                                                            ? "text-yellow-600 dark:text-yellow-400"
                                                            : isCapped
                                                                ? capWeightText
                                                                : "text-gray-600 dark:text-gray-400"
                                                    }`}>
                                                        ×
                                                        {stat.weight.toFixed(2)}
                                                    </div>
                                                    <div className={`text-right text-sm font-semibold font-mono ${
                                                        isGoldSkill
                                                            ? "text-yellow-700 dark:text-yellow-300"
                                                            : isCapped
                                                                ? capContribText
                                                                : "text-gray-800 dark:text-gray-200"
                                                    }`}>
                                                        {stat.contribution > 0
                                                            ? "+"
                                                            : ""}
                                                        {stat.contribution.toFixed(
                                                            0,
                                                        )}
                                                    </div>
                                                </div>
                                            )},
                                        )}

                                        {/* Subtotal */}
                                        <div className="px-3 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-t-2 border-indigo-300 dark:border-indigo-600">
                                            <div className="grid grid-cols-4 gap-4 items-center">
                                                <div className="col-span-3 text-right text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                                    Subtotal:
                                                </div>
                                                <div className="text-right text-base font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                                                    {scoreBreakdown.baseScore.toFixed(
                                                        0,
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Penalties */}
                                        {scoreBreakdown.staminaPenalty < 1 && (
                                            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20">
                                                <div className="grid grid-cols-4 gap-3 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-red-600 dark:text-red-400">
                                                            Stamina Penalty
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
                                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20">
                                                <div className="grid grid-cols-4 gap-3 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-blue-600 dark:text-blue-400">
                                                            Speed Penalty
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

                                        {/* Race Bonus Penalty (Trackblazers only) */}
                                        {scoreBreakdown.raceBonusPenalty < 1 && (
                                            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20">
                                                <div className="grid grid-cols-4 gap-3 items-center">
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <span className="text-sm text-purple-600 dark:text-purple-400">
                                                            Race Bonus Penalty
                                                        </span>
                                                        <div className="text-xs text-purple-500 dark:text-purple-400">
                                                            (
                                                            {(
                                                                100 -
                                                                scoreBreakdown.raceBonusPenalty * 100
                                                            ).toFixed(0)}
                                                            % reduction)
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
                                                        -
                                                        {(
                                                            scoreBreakdown.baseScore *
                                                            (1 - scoreBreakdown.raceBonusPenalty)
                                                        ).toFixed(0)}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 col-span-4">
                                                    {scoreBreakdown.raceBonusPenaltyReason}
                                                </div>
                                            </div>
                                        )}

                                        {/* Final Total */}
                                        <div className="px-3 py-4 bg-green-50 dark:bg-green-900/20 border-t-2 border-green-300 dark:border-green-600">
                                            <div className="grid grid-cols-4 gap-3 items-center">
                                                <div className="col-span-3 text-right text-base font-bold text-green-700 dark:text-green-300">
                                                    Final Score:
                                                </div>
                                                <div className="text-right text-lg font-bold text-green-600 dark:text-green-400 font-mono">
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
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {/* Table Header */}
                                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
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
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {[
                                            "Speed",
                                            "Stamina",
                                            "Power",
                                            "Guts",
                                            "Wit",
                                            "Skill Points",
                                            "Usefull Hints",
                                            "Gold Skills",
                                        ].map((statName, index) => (
                                            <div
                                                key={statName}
                                                className={`px-4 py-3 grid grid-cols-4 gap-4 items-center ${
                                                    index % 2 === 0
                                                        ? "bg-white dark:bg-gray-800"
                                                        : "bg-gray-50 dark:bg-gray-700/20"
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
                                        <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-t-2 border-indigo-300 dark:border-indigo-600">
                                            <div className="grid grid-cols-4 gap-4 items-center">
                                                <div className="col-span-3 text-right text-sm font-semibold text-indigo-700 dark:text-indigo-300">
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
            {rowTooltip && typeof window !== "undefined" && createPortal(
                <div
                    className="fixed pointer-events-none"
                    style={{ left: `${rowTooltip.x}px`, top: `${rowTooltip.y}px`, transform: "translateX(-50%) translateY(calc(-100% - 10px))", zIndex: 9999 }}
                >
                    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-3 w-72">
                        <div className="mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Units</span>
                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{rowTooltip.units}</p>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Weight</span>
                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{rowTooltip.weight}</p>
                        </div>
                    </div>
                    <div className="w-3 h-3 bg-white dark:bg-gray-800 border-r-2 border-b-2 border-gray-300 dark:border-gray-600 rotate-45 mx-auto -mt-1.5" />
                </div>,
                document.body
            )}
        </div>
    );
}
