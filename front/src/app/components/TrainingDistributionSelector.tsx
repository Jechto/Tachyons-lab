import React, { useEffect, useState } from "react";

interface TrainingDistributionSelectorProps {
    calculatedDistribution: number[];
    manualDistribution: number[] | null;
    isManual: boolean;
    onToggleManual: (isManual: boolean) => void;
    onManualDistributionChange: (distribution: number[]) => void;
}

const STAT_LABELS = ["Speed", "Stamina", "Power", "Guts", "Wit"];
const STAT_COLORS = [
    "bg-blue-500",   // Speed
    "bg-red-500",    // Stamina
    "bg-yellow-500", // Power
    "bg-pink-500",   // Guts
    "bg-green-500",  // Wit
];

export default function TrainingDistributionSelector({
    calculatedDistribution,
    manualDistribution,
    isManual,
    onToggleManual,
    onManualDistributionChange,
}: TrainingDistributionSelectorProps) {
    // Local state for manual inputs (0-100)
    const [inputs, setInputs] = useState<number[]>([20, 20, 20, 20, 20]);

    // Initialize inputs from manualDistribution or calculatedDistribution when switching
    useEffect(() => {
        if (isManual && manualDistribution) {
            setInputs(manualDistribution.map(v => Math.round(v * 100)));
        } else if (!isManual) {
            // When not manual, we don't necessarily need to update inputs, 
            // but it might be nice to reset them to calculated values if we switch to manual
            setInputs(calculatedDistribution.map(v => Math.round(v * 100)));
        }
    }, [isManual, manualDistribution, calculatedDistribution]);

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputs];
        const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
        newInputs[index] = numValue;
        setInputs(newInputs);

        // Normalize and notify parent
        const sum = newInputs.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            const normalized = newInputs.map(v => v / sum);
            onManualDistributionChange(normalized);
        }
    };

    const currentDistribution = isManual && manualDistribution ? manualDistribution : calculatedDistribution;

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Training Distribution</h3>
                <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isManual}
                            onChange={(e) => onToggleManual(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-300">Manual Override</span>
                    </label>
                </div>
            </div>

            <div className="space-y-3">
                {STAT_LABELS.map((label, index) => {
                    const percentage = currentDistribution[index] * 100;
                    
                    return (
                        <div key={label} className="flex items-center space-x-3">
                            <div className="w-16 text-sm font-medium text-gray-300">{label}</div>
                            <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${STAT_COLORS[index]} transition-all duration-300`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                            <div className="w-16 text-right">
                                {isManual ? (
                                    <input
                                        type="number"
                                        value={inputs[index]}
                                        onChange={(e) => handleInputChange(index, e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-1 py-0.5 text-right focus:outline-none focus:border-blue-500"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-300">{percentage.toFixed(1)}%</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {isManual && (
                <div className="mt-2 text-xs text-gray-400 text-right">
                    Total: {inputs.reduce((a, b) => a + b, 0)} (Normalized automatically)
                </div>
            )}
        </div>
    );
}
