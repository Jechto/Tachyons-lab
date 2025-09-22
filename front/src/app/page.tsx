'use client';

import Image from "next/image";
import { useState } from "react";
import { Tierlist, LimitBreakFilter } from "./classes/Tierlist";
import allDataRaw from "./data/data.json";
import { CardData } from "./types/cardTypes";
import TierlistDisplay from "./components/TierlistDisplay";

// Types for our form state
type RaceType = 'Sprint' | 'Mile' | 'Medium' | 'Long';
type RunningStyle = 'Front Runner' | 'Pace Chaser' | 'Late Surger' | 'End Closer';

export default function Home() {
  // Form state
  const [selectedRaces, setSelectedRaces] = useState<RaceType[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<RunningStyle[]>([]);
  const [tierlistResult, setTierlistResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filter state
  const [limitBreakFilter, setLimitBreakFilter] = useState<LimitBreakFilter>({
    R: [4], // Default to only max limit break for R cards
    SR: [4], // Default to only max limit break for SR cards  
    SSR: [0, 1, 2, 3, 4] // Include all limit breaks for SSR cards
  });

  // Race types and running styles
  const raceTypes: { value: RaceType; label: string }[] = [
    { value: 'Sprint', label: 'Sprint' },
    { value: 'Mile', label: 'Mile' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Long', label: 'Long' }
  ];

  const runningStyles: { value: RunningStyle; label: string }[] = [
    { value: 'Front Runner', label: 'Front Runner' },
    { value: 'Pace Chaser', label: 'Pace Chaser' },
    { value: 'Late Surger', label: 'Late Surger' },
    { value: 'End Closer', label: 'End Closer' }
  ];

  // Handle filter changes
  const handleFilterChange = (rarity: 'R' | 'SR' | 'SSR', limitBreak: number, checked: boolean) => {
    setLimitBreakFilter(prev => {
      const updated = { ...prev };
      if (checked) {
        if (!updated[rarity].includes(limitBreak)) {
          updated[rarity] = [...updated[rarity], limitBreak].sort();
        }
      } else {
        updated[rarity] = updated[rarity].filter(lb => lb !== limitBreak);
      }
      return updated;
    });
  };

  // Helper to toggle all limit breaks for a rarity
  const toggleAllForRarity = (rarity: 'R' | 'SR' | 'SSR') => {
    const allSelected = limitBreakFilter[rarity].length === 5;
    setLimitBreakFilter(prev => ({
      ...prev,
      [rarity]: allSelected ? [] : [0, 1, 2, 3, 4]
    }));
  };
  const handleRaceChange = (race: RaceType, checked: boolean) => {
    if (checked) {
      setSelectedRaces(prev => [...prev, race]);
    } else {
      setSelectedRaces(prev => prev.filter(r => r !== race));
    }
  };

  const handleStyleChange = (style: RunningStyle, checked: boolean) => {
    if (checked) {
      setSelectedStyles(prev => [...prev, style]);
    } else {
      setSelectedStyles(prev => prev.filter(s => s !== style));
    }
  };

  // Generate tierlist
  const generateTierlist = async () => {
    if (selectedRaces.length === 0 || selectedStyles.length === 0) {
      alert('Please select at least one race type and one running style');
      return;
    }

    setIsGenerating(true);
    try {
      const tierlist = new Tierlist();
      
      // Convert our form state to the format expected by the Tierlist class
      const raceTypes = {
        Sprint: selectedRaces.includes('Sprint'),
        Mile: selectedRaces.includes('Mile'), 
        Medium: selectedRaces.includes('Medium'),
        Long: selectedRaces.includes('Long')
      };

      const runningTypes = {
        "Front Runner": selectedStyles.includes('Front Runner'),
        "Pace Chaser": selectedStyles.includes('Pace Chaser'),
        "Late Surger": selectedStyles.includes('Late Surger'),
        "End Closer": selectedStyles.includes('End Closer')
      };

      // Load data and generate tierlist
      const allData = allDataRaw as CardData[];
      const result = tierlist.bestCardForDeck(undefined, raceTypes, runningTypes, allData, limitBreakFilter);
      setTierlistResult(result);
    } catch (error) {
      setTierlistResult({ success: false, error: error?.toString() });
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-6xl font-bold mb-8 text-center">Tachyons Lab</h1>
      <h2 className="text-2xl mb-12 text-center text-gray-600 dark:text-gray-400">
        A Tierlist and Deckbuilder combined
      </h2>
      
      {/* Tierlist Configuration Form */}
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600 mb-8">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          🏆 Generate Tierlist
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Race Types */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Race Types
            </h4>
            <div className="space-y-3">
              {raceTypes.map((race) => (
                <label key={race.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRaces.includes(race.value)}
                    onChange={(e) => handleRaceChange(race.value, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-gray-900 dark:text-gray-100">{race.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Running Styles */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Running Styles
            </h4>
            <div className="space-y-3">
              {runningStyles.map((style) => (
                <label key={style.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStyles.includes(style.value)}
                    onChange={(e) => handleStyleChange(style.value, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-gray-900 dark:text-gray-100">{style.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Limit Break Filter */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Limit Break Filter (Reduces processing time)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['R', 'SR', 'SSR'] as const).map((rarity) => (
              <div key={rarity} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-800 dark:text-gray-200">{rarity} Cards</h5>
                  <button
                    type="button"
                    onClick={() => toggleAllForRarity(rarity)}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                  >
                    {limitBreakFilter[rarity].length === 5 ? 'None' : 'All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4].map((lb) => (
                    <label key={lb} className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={limitBreakFilter[rarity].includes(lb)}
                        onChange={(e) => handleFilterChange(rarity, lb, e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-1 dark:bg-gray-600 dark:border-gray-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {lb === 4 ? 'MLB' : `${lb}LB`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={generateTierlist}
            disabled={isGenerating || selectedRaces.length === 0 || selectedStyles.length === 0}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            {isGenerating ? '🔄 Generating...' : '🏆 Get Tierlist'}
          </button>
        </div>
      </div>

      {/* Tierlist Results */}
      {tierlistResult && (
        <div className="w-full max-w-6xl space-y-6 mb-8">
          {/* Visual Tierlist */}
          {tierlistResult.success !== false && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600">
              <TierlistDisplay tierlistData={tierlistResult.tierlist} />
            </div>
          )}
          
          {/* JSON Results (Collapsible) */}
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600">
            <details className="w-full">
              <summary className="cursor-pointer text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
                📊 Raw JSON Results: {tierlistResult.success === false ? '❌ Failed' : '✅ Success'} (Click to expand)
              </summary>
              <div className="max-h-96 overflow-auto bg-white dark:bg-gray-900 p-4 rounded border mt-4">
                <pre className="text-sm text-gray-800 dark:text-gray-200">
                  {JSON.stringify(tierlistResult, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}
      
      <div className="flex gap-6 mb-12">
        <a 
          href="/test"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          🧪 Testing & Debug
        </a>
        
        <button 
          disabled
          className="bg-gray-400 text-white font-bold py-3 px-6 rounded-lg cursor-not-allowed"
        >
          🃏 Deckbuilder (Coming Soon)
        </button>
      </div>

      <div className="w-full max-w-6xl bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-600">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          🚀 Project Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <span className="text-gray-800 dark:text-gray-200">Python to TypeScript conversion completed</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <span className="text-gray-800 dark:text-gray-200">Deck evaluation calculations working</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <span className="text-gray-800 dark:text-gray-200">Data preprocessing system created</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500 text-xl">✅</span>
            <span className="text-gray-800 dark:text-gray-200">Tierlist generation functional</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-yellow-500 text-xl">🔄</span>
            <span className="text-gray-800 dark:text-gray-200">Deckbuilder UI in development</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
        <p>Uma Musume support card optimization tools</p>
        <p className="text-sm mt-2">Built with Next.js, TypeScript, and Tailwind CSS</p>
      </div>
    </div>
  );
}
