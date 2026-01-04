import React, { useState } from 'react';
import { StatsDict } from '../types/cardTypes';

interface CardTooltipProps {
    children: React.ReactNode;
    cardId: number;
    cardName: string;
    cardRarity: string;
    limitBreak: number;
    cardType: string;
    deltaStats: StatsDict;
    hintsMatchPercentage: number;
    hintTypes?: string[];
    className?: string;
    isInDeck?: boolean;
}

function formatStatChange(value: number, statName: string): string {
    if (value === 0) return '';
    const sign = value > 0 ? '+' : '';
    return `${sign}${Math.round(value)} ${statName}`;
}

export default function CardTooltip({
    children,
    cardId,
    cardName,
    cardRarity,
    limitBreak,
    cardType,
    deltaStats,
    hintsMatchPercentage,
    hintTypes = [],
    className = "",
    isInDeck = false
}: CardTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    const handleMouseEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.right + 10;
        const y = rect.top;
        
        setPosition({ x, y });
        setIsVisible(true);
    };
    
    const handleMouseLeave = () => {
        setIsVisible(false);
    };
    
    // Create delta stats display
    const deltaStatsDisplay = [];
    for (const [statName, value] of Object.entries(deltaStats)) {
        const formatted = formatStatChange(value, statName === "Skill Points" ? "SP" : statName.substring(0, 3).toUpperCase());
        if (formatted) {
            deltaStatsDisplay.push(formatted);
        }
    }
    
    return (
        <>
            <div
                className={className}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>
            
            {isVisible && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{ left: position.x, top: position.y }}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-72 max-w-80"
                    >
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                    {cardName}
                                </h3>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`px-2 py-1 rounded font-bold ${
                                        cardRarity === 'SSR' ? 'bg-yellow-500 text-yellow-900' :
                                        cardRarity === 'SR' ? 'bg-purple-500 text-white' :
                                        cardRarity === 'R' ? 'bg-blue-500 text-white' :
                                        'bg-gray-500 text-white'
                                    }`}>
                                        {cardRarity}
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {limitBreak === 4 ? 'MLB' : `${limitBreak}LB`}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-white font-bold ${
                                        cardType === 'Speed' ? 'bg-blue-500' :
                                        cardType === 'Stamina' ? 'bg-red-500' :
                                        cardType === 'Power' ? 'bg-yellow-500' :
                                        cardType === 'Guts' ? 'bg-pink-500' :
                                        cardType === 'Wit' ? 'bg-green-500' :
                                        'bg-gray-500'
                                    }`}>
                                        {cardType}
                                    </span>
                                </div>
                            </div>
                        </div>
                    
                        {/* Hints Match Percentage */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Hints Match Running Style:
                                </span>
                                <span className={`font-bold ${
                                    hintsMatchPercentage >= 75 ? 'text-green-600 dark:text-green-400' :
                                    hintsMatchPercentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    hintsMatchPercentage >= 25 ? 'text-orange-600 dark:text-orange-400' :
                                    'text-red-600 dark:text-red-400'
                                }`}>
                                    {Math.round(hintsMatchPercentage)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        hintsMatchPercentage >= 75 ? 'bg-green-500' :
                                        hintsMatchPercentage >= 50 ? 'bg-yellow-500' :
                                        hintsMatchPercentage >= 25 ? 'bg-orange-500' :
                                        'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, hintsMatchPercentage))}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        {/* Hint Types */}
                        {hintTypes.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Hint Types:
                                </h4>
                                <div className="flex flex-wrap gap-1">
                                    {hintTypes.map((hintType, index) => {
                                        const getBadgeStyle = (type: string) => {
                                            switch (type) {
                                                case 'Front Runner':
                                                    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
                                                case 'Pace Chaser':
                                                    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
                                                case 'Late Surger':
                                                    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
                                                case 'End Closer':
                                                    return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
                                                case 'Sprint':
                                                    return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
                                                case 'Mile':
                                                    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
                                                case 'Medium':
                                                    return 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
                                                case 'Long':
                                                    return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
                                                case 'General':
                                                default:
                                                    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                                            }
                                        };
                                        
                                        return (
                                            <span 
                                                key={index}
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeStyle(hintType)}`}
                                            >
                                                {hintType}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Delta Stats - only show if card is not in deck */}
                        {!isInDeck && deltaStatsDisplay.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Stat Changes:
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {deltaStatsDisplay.map((statChange, index) => {
                                        const isPositive = statChange.startsWith('+');
                                        return (
                                            <span 
                                                key={index}
                                                className={`px-2 py-1 rounded text-sm font-bold ${
                                                    isPositive 
                                                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                                }`}
                                            >
                                                {statChange}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}