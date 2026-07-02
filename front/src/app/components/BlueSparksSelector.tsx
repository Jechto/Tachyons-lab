import React, { useEffect, useState } from "react";
import { SparkSlot, SparkStar, SPARK_BONUSES, MAX_SPARKS, TrainingData } from "../config/trainingData";

interface BlueSparksSelectorProps {
    sparks: SparkSlot[];
    onChange: (sparks: SparkSlot[]) => void;
}

const STAT_OPTIONS = ["Speed", "Stamina", "Power", "Guts", "Wit"];
const STAR_OPTIONS: SparkStar[] = [1, 2, 3];
const STAR_LABELS: Record<SparkStar, string> = { 1: "★", 2: "★★", 3: "★★★" };

export default function BlueSparksSelector({ sparks, onChange }: BlueSparksSelectorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Load expansion state
    useEffect(() => {
        const saved = localStorage.getItem("tachyons_blue_sparks_expanded");
        if (saved !== null) {
            setIsExpanded(saved === "true");
        }
    }, []);

    // Save expansion state
    useEffect(() => {
        localStorage.setItem("tachyons_blue_sparks_expanded", String(isExpanded));
    }, [isExpanded]);

    const updateSlot = (index: number, patch: Partial<SparkSlot>) => {
        const next = sparks.map((s, i) => (i === index ? { ...s, ...patch } : s));
        onChange(next);
    };

    const { capBonus, flatStats } = TrainingData.getSparkBonuses(sparks);
    const activeCount = sparks.filter((s) => s.stat && s.star).length;

    // Summary rows for stats that have any bonus (statKey uses "Intelligence" for Wit)
    const summaryStats = STAT_OPTIONS.filter((stat) => {
        const key = stat === "Wit" ? "Intelligence" : stat;
        return (capBonus[key] || 0) > 0 || (flatStats[key] || 0) > 0;
    });

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">
                    Blue Sparks{" "}
                    <span className="text-sm font-normal text-gray-400">
                        ({activeCount}/{MAX_SPARKS})
                    </span>
                </h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    {isExpanded ? "▼" : "▶"} {isExpanded ? "Collapse" : "Expand"}
                </button>
            </div>

            {isExpanded && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sparks.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="w-4 text-xs text-gray-500">{index + 1}</span>
                                <select
                                    value={slot.stat ?? ""}
                                    onChange={(e) =>
                                        updateSlot(index, {
                                            stat: e.target.value || null,
                                        })
                                    }
                                    className="w-28 shrink-0 bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">—</option>
                                    {STAT_OPTIONS.map((stat) => (
                                        <option key={stat} value={stat}>
                                            {stat}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={slot.star ?? ""}
                                    onChange={(e) =>
                                        updateSlot(index, {
                                            star: e.target.value
                                                ? (parseInt(e.target.value) as SparkStar)
                                                : null,
                                        })
                                    }
                                    className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">—</option>
                                    {STAR_OPTIONS.map((star) => (
                                        <option key={star} value={star}>
                                            {STAR_LABELS[star]} (+{SPARK_BONUSES[star].cap} cap / +
                                            {SPARK_BONUSES[star].stats} stats)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {summaryStats.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-300">
                            <div className="font-medium text-gray-400 mb-1">Totals</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {summaryStats.map((stat) => {
                                    const key = stat === "Wit" ? "Intelligence" : stat;
                                    return (
                                        <span key={stat}>
                                            {stat}:{" "}
                                            <span className="text-blue-400">
                                                +{capBonus[key] || 0} cap
                                            </span>
                                            ,{" "}
                                            <span className="text-green-400">
                                                +{flatStats[key] || 0} stats
                                            </span>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                        Cap raises let more training clear the 1200 halving band; flat stats are added on top and are never halved.
                    </div>
                </>
            )}
        </div>
    );
}
