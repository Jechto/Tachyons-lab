import { SupportCard } from '../classes/SupportCard';
import { DeckEvaluator } from '../classes/DeckEvaluator';
import { Tierlist } from '../classes/Tierlist';
import { CardData } from '../types/cardTypes';
import cardData from '../data/data.json';

export function testClasses() {
  console.log('Testing converted classes...');
  
  try {
    // Cast the imported data to the correct type
    const allData = cardData as CardData[];
    console.log(`Loaded ${allData.length} cards from data.json`);

    // Test SupportCard creation
    console.log('\n=== Testing SupportCard ===');
    const firstCard = allData[0];
    if (firstCard) {
      console.log(`Testing card: ${firstCard.card_chara_name} (ID: ${firstCard.id})`);
      
      const supportCard = new SupportCard(firstCard.id, 0, allData);
      console.log('✓ SupportCard created successfully');
      console.log('Card info:', {
        name: supportCard.cardUma.name,
        type: supportCard.cardType.type,
        rarity: supportCard.rarity,
        limitBreak: supportCard.limitBreak
      });

      // Test hint evaluation
      const hints = supportCard.evaluateCardHints([false, false, true, false], [false, true, false, false]);
      console.log('✓ Hint evaluation successful:', hints);
    }

    // Test DeckEvaluator
    console.log('\n=== Testing DeckEvaluator ===');
    const deck = new DeckEvaluator();
    console.log('✓ Empty deck created');

    // Add a few cards to the deck
    for (let i = 0; i < Math.min(3, allData.length); i++) {
      const card = new SupportCard(allData[i].id, 0, allData);
      deck.addCard(card);
    }
    console.log(`✓ Added ${deck.deck.length} cards to deck`);

    // Test deck evaluation
    const stats = deck.evaluateStats();
    console.log('✓ Deck stats evaluation successful:', stats);

    const hints = deck.evaluateHints();
    console.log('✓ Deck hints evaluation successful:', hints);

    // Test Tierlist
    console.log('\n=== Testing Tierlist ===');
    const tierlist = new Tierlist();
    
    const testData = allData
    console.log(`Testing tierlist with ${testData.length} cards...`);

    let deck_to_test = new DeckEvaluator();
    deck_to_test.addCard(new SupportCard(30028, 0, allData));

    const result = tierlist.bestCardForDeck(
      deck_to_test,
      undefined, // Use default race types (Medium = true)
      undefined, // Use default running types (Pace Chaser = true)
      testData
    );
    
    console.log('✓ Tierlist generation successful');
    console.log('Deck score:', result.deck.score);
    console.log('Tierlist categories:', Object.keys(result.tierlist));
    
    for (const [category, cards] of Object.entries(result.tierlist)) {
      console.log(`${category}: ${cards.length} cards, top score: ${cards[0]?.score || 'N/A'}`);
    }

    console.log('\n🎉 All tests passed successfully!');
    return {
      success: true,
      message: 'All classes working correctly',
      sampleResult: result
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error}`,
      error
    };
  }
}

// Helper function to get a sample of best cards for a given deck
export function getBestCardsForDeck(
  currentDeck?: SupportCard[],
  raceType: 'Sprint' | 'Mile' | 'Medium' | 'Long' = 'Medium',
  runningStyle: 'Front Runner' | 'Pace Chaser' | 'Late Surger' | 'End Closer' = 'Pace Chaser',
  maxResults: number = 50
) {
  try {
    const allData = cardData as CardData[];
    const deck = new DeckEvaluator();
    
    // Add current deck cards if provided
    if (currentDeck) {
      currentDeck.forEach(card => deck.addCard(card));
    }

    const raceTypes = {
      Sprint: raceType === 'Sprint',
      Mile: raceType === 'Mile', 
      Medium: raceType === 'Medium',
      Long: raceType === 'Long'
    };

    const runningTypes = {
      "Front Runner": runningStyle === 'Front Runner',
      "Pace Chaser": runningStyle === 'Pace Chaser',
      "Late Surger": runningStyle === 'Late Surger',
      "End Closer": runningStyle === 'End Closer'
    };

    const tierlist = new Tierlist();
    const result = tierlist.bestCardForDeck(
      deck,
      raceTypes,
      runningTypes,
      allData.slice(0, maxResults) // Limit for performance
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error
    };
  }
}

// Debug function to test just Kitasan Black at MLB 0
export function debugKitasanBlack() {
  console.log('=== Debugging Kitasan Black (ID: 30028) at MLB 0 ===');
  
  try {
    const allData = cardData as CardData[];
    console.log(`Loaded ${allData.length} cards from data.json`);

    // Find Kitasan Black card data
    const kitasanData = allData.find(card => card.id === 30028);
    if (!kitasanData) {
      throw new Error('Kitasan Black (ID: 30028) not found in data');
    }

    console.log('Found Kitasan Black:', {
      id: kitasanData.id,
      name: kitasanData.card_chara_name,
      preferredType: kitasanData.prefered_type,
      effects: kitasanData.effects,
      uniqueEffects: kitasanData.unique_effects
    });

    // Create SupportCard
    const kitasanCard = new SupportCard(30028, 0, allData);
    console.log('✓ Kitasan Black card created at MLB 0');
    console.log('Card details:', {
      name: kitasanCard.cardUma.name,
      type: kitasanCard.cardType.type,
      rarity: kitasanCard.rarity,
      limitBreak: kitasanCard.limitBreak,
      cardBonus: kitasanCard.cardBonus
    });

    // Create deck with just Kitasan Black
    const deck = new DeckEvaluator();
    deck.addCard(kitasanCard);
    console.log('✓ Deck created with Kitasan Black');

    // Evaluate training distribution
    const trainingDist = deck.getTrainingDistribution();
    console.log('Training distribution:', trainingDist);

    // Evaluate deck stats
    const stats = deck.evaluateStats();
    console.log('✓ Deck stats evaluation completed');
    console.log('Stats result:', stats);

    // Evaluate hints
    const hints = deck.evaluateHints();
    console.log('✓ Hints evaluation completed');
    console.log('Hints result:', hints);

    return {
      success: true,
      message: 'Kitasan Black debug completed successfully',
      cardDetails: {
        name: kitasanCard.cardUma.name,
        type: kitasanCard.cardType.type,
        rarity: kitasanCard.rarity,
        limitBreak: kitasanCard.limitBreak,
        cardBonus: kitasanCard.cardBonus
      },
      trainingDistribution: trainingDist,
      stats: stats,
      hints: hints
    };

  } catch (error) {
    console.error('❌ Kitasan Black debug failed:', error);
    return {
      success: false,
      message: `Debug failed: ${error}`,
      error
    };
  }
}