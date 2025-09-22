import { SupportCard } from './SupportCard';
import { DeckEvaluator } from './DeckEvaluator';
import { CardData, RaceTypes, RunningTypes, StatsDict } from '../types/cardTypes';

interface TierlistCard {
  id: number;
  card_name: string;
  card_rarity: string;
  limit_break: number;
  card_type: string;
  hints: any;
}

interface TierlistDeck {
  cards: TierlistCard[];
  score: number;
  stats: StatsDict;
  hints?: Record<string, number>;
}

interface TierlistEntry {
  id: number;
  card_name: string;
  card_rarity: string;
  limit_break: number;
  card_type: string;
  hints: any;
  stats: StatsDict;
  score: number;
}

interface TierlistResponse {
  tierlist: Record<string, TierlistEntry[]>;
  deck: TierlistDeck;
  inputDeck: {
    cardCount: number;
    raceTypes: RaceTypes;
    runningTypes: RunningTypes;
  };
}

export interface LimitBreakFilter {
  R: number[];  // Which limit breaks to include for R cards (0-4)
  SR: number[]; // Which limit breaks to include for SR cards (0-4)
  SSR: number[]; // Which limit breaks to include for SSR cards (0-4)
}

export class Tierlist {
  private static readonly rarityToSymbol: Record<number, string> = {
    1: "R",
    2: "SR", 
    3: "SSR"
  };

  public bestCardForDeck(
    deckObject: DeckEvaluator = new DeckEvaluator(),
    raceTypes?: RaceTypes,
    runningTypes?: RunningTypes,
    allData: CardData[] = [],
    filter?: LimitBreakFilter
  ): TierlistResponse {
    // Default race types
    if (!raceTypes) {
      raceTypes = {
        Sprint: false,
        Mile: false,
        Medium: true,
        Long: false
      };
    }

    // Default running types
    if (!runningTypes) {
      runningTypes = {
        "Front Runner": false,
        "Pace Chaser": true,
        "Late Surger": false,
        "End Closer": false
      };
    }

    // Default filter - include all limit breaks for all rarities
    if (!filter) {
      filter = {
        R: [0, 1, 2, 3, 4],
        SR: [0, 1, 2, 3, 4], 
        SSR: [0, 1, 2, 3, 4]
      };
    }

    console.log(raceTypes);

    let weights: Record<string, number> = {};
    const allWeights = {
      Sprint: {
        Speed: 2,
        Stamina: 0.5,
        Power: 1,
        Guts: 0.5,
        Wit: 1.0,
        "Skill Points": 0.2
      },
      Mile: {
        Speed: 1.5,
        Stamina: 0.75,
        Power: 1.0,
        Guts: 0.75,
        Wit: 1.0,
        "Skill Points": 0.2
      },
      Medium: {
        Speed: 1,
        Stamina: 1.0,
        Power: 1.0,
        Guts: 1.0,
        Wit: 1.0,
        "Skill Points": 0.2
      },
      Long: {
        Speed: 0.75,
        Stamina: 1.5,
        Power: 0.75,
        Guts: 1.0,
        Wit: 1.0,
        "Skill Points": 0.2
      }
    };

    for (const key of ["Long", "Medium", "Mile", "Sprint"]) {
      if ((raceTypes as any)[key]) {
        weights = (allWeights as any)[key];
        console.log("Using weights for", key);
        break;
      }
    }

    // Create a deep copy of the deck
    const originalDeck = this.deepCopyDeck(deckObject);
    const baseResultForDeck = deckObject.evaluateStats();
    const baseResultEmptyDeck = new DeckEvaluator().evaluateStats();

    const raceTypesArray = [
      raceTypes.Sprint,
      raceTypes.Mile,
      raceTypes.Medium,
      raceTypes.Long
    ];

    const runningTypesArray = [
      runningTypes["Front Runner"],
      runningTypes["Pace Chaser"],
      runningTypes["Late Surger"],
      runningTypes["End Closer"]
    ];

    const deck: TierlistDeck = {
      cards: [],
      score: 0,
      stats: {
        Speed: 0,
        Stamina: 0, 
        Power: 0,
        Guts: 0
      }
    };

    let hintsForDeck: Record<string, number> = {};
    
    for (const card of originalDeck.deck) {
      if (card) {
        const hintForCard = card.evaluateCardHints(raceTypesArray, runningTypesArray);
        deck.cards.push({
          id: card.id,
          card_name: card.cardUma.name,
          card_rarity: Tierlist.rarityToSymbol[card.rarity] || "Unknown",
          limit_break: card.limitBreak,
          card_type: card.cardType.type,
          hints: hintForCard
        });
      }

      // This matches the Python bug where these lines are inside the loop
      hintsForDeck = deckObject.evaluateHints();
      deck.score = this.resultsToScore(baseResultForDeck, hintsForDeck, weights);
    }

    // Calculate deck stats delta
    deck.stats = {
      Speed: 0,
      Stamina: 0,
      Power: 0,
      Guts: 0
    };
    for (const k of Object.keys(baseResultForDeck)) {
      (deck.stats as any)[k] = (baseResultForDeck as any)[k] - (baseResultEmptyDeck as any)[k];
    }
    deck.hints = hintsForDeck;

    const results: TierlistEntry[] = [];

    // Iterate through all cards in data
    for (const cardEntry of allData) {
      const cardId = cardEntry.id;
      if (!cardId) continue;

      const cardName = cardEntry.card_chara_name || "Unknown";
      const cardRarity = Tierlist.rarityToSymbol[cardEntry.rarity || -1] || "Unknown";
      let cardType = cardEntry.prefered_type || "Unknown";
      cardType = cardType === "Intelligence" ? "Wit" : cardType;

      // Get the allowed limit breaks for this rarity
      const allowedLimitBreaks = filter[cardRarity as keyof LimitBreakFilter] || [];

      for (let limitBreak = 0; limitBreak < 5; limitBreak++) {
        // Skip this limit break if it's not in the filter
        if (!allowedLimitBreaks.includes(limitBreak)) {
          continue;
        }
        try {
          const card = new SupportCard(cardId, limitBreak, allData);
          const tempDeck = deckObject ? this.deepCopyDeck(deckObject) : new DeckEvaluator();
          tempDeck.addCard(card);

          const result = tempDeck.evaluateStats();
          const cardHints = card.evaluateCardHints(raceTypesArray, runningTypesArray);
          const deckHints = tempDeck.evaluateHints();

          const score = this.resultsToScore(result, deckHints, weights);

          const deltaStat: any = {};
          for (const k of Object.keys(result)) {
            deltaStat[k] = (result as any)[k] - (baseResultEmptyDeck as any)[k];
          }

          results.push({
            id: cardId,
            card_name: cardName,
            card_rarity: cardRarity,
            limit_break: limitBreak,
            card_type: cardType,
            hints: cardHints,
            stats: deltaStat,
            score: score
          });
        } catch (error) {
          // Skip cards that can't be instantiated
          console.warn(`Failed to create card ${cardId} at ${limitBreak}lb:`, error);
          continue;
        }
      }
    }

    // Group and sort results by card_type
    const grouped: Record<string, TierlistEntry[]> = {};
    for (const entry of results) {
      if (!grouped[entry.card_type]) {
        grouped[entry.card_type] = [];
      }
      grouped[entry.card_type].push(entry);
    }

    const response: Record<string, TierlistEntry[]> = {};
    for (const [cardType, entries] of Object.entries(grouped)) {
      response[cardType] = entries.sort((a, b) => b.score - a.score);
    }

    return {
      tierlist: response,
      deck: deck,
      inputDeck: {
        cardCount: originalDeck.deck.length,
        raceTypes: raceTypes,
        runningTypes: runningTypes
      }
    };
  }

  private resultsToScore(
    resultDict: StatsDict,
    hintDict: Record<string, number>,
    weights: Record<string, number>
  ): number {
    // TODO: Add more sophisticated scoring // use hint_dict
    if (!weights || Object.keys(weights).length === 0) {
      weights = {
        Speed: 1.0,
        Stamina: 1.0,
        Power: 1.0,
        Guts: 1.0,
        Wit: 1.0,
        "Skill Points": 0.2
      };
    }

    const weightsCopy = { ...weights };

    let score = 0;
    for (const [k, v] of Object.entries(resultDict)) {
      const weight = weightsCopy[k] || 0;
      score += v * weight;
    }

    return score;
  }

  private deepCopyDeck(deck: DeckEvaluator): DeckEvaluator {
    const newDeck = new DeckEvaluator();
    // Note: This is a shallow copy of cards. For a true deep copy,
    // you might need to recreate the SupportCard objects as well.
    newDeck.deck = [...deck.deck];
    return newDeck;
  }
}