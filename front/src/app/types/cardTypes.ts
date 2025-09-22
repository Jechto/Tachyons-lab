// Type definitions for the card system
export interface CardEffect {
  "0lb": number;
  "1lb": number;
  "2lb": number;
  "3lb": number;
  "mlb": number;
  type: number;
  type_name: string;
}

export interface UniqueEffect {
  level_unlocked: number;
  effects: Array<{
    type_name: string;
    value: number;
  }>;
}

export interface EventChoice {
  rewards: Array<{
    type: string;
    value: string;
  }>;
}

export interface EventData {
  choices: EventChoice[];
}

export interface AllEvents {
  chain_events: EventData[];
  dates: EventData[];
}

export interface HintData {
  skill_id: number;
  skill_data: {
    skill_name: string;
    skill_desc: string;
    condition_1?: string;
  };
}

export interface CardData {
  id: number;
  chara_id_card: number;
  rarity: number;
  card_chara_name: string;
  prefered_type_id: number;
  prefered_type: string;
  effects: CardEffect[];
  unique_effects?: UniqueEffect[];
  all_events?: AllEvents;
  hints_table?: HintData[];
}

export interface CardBonus {
  "Friendship Bonus": number;
  "Mood Effect": number;
  "Speed Bonus": number;
  "Stamina Bonus": number;
  "Power Bonus": number;
  "Guts Bonus": number;
  "Wit Bonus": number;
  "Training Effectiveness": number;
  "Initial Speed": number;
  "Initial Stamina": number;
  "Initial Power": number;
  "Initial Guts": number;
  "Initial Wit": number;
  "Initial Friendship Gauge": number;
  "Race Bonus": number;
  "Fan Bonus": number;
  "Hint Levels": number;
  "Hint Frequency": number;
  "Specialty Priority": number;
  "Max Speed": number;
  "Max Stamina": number;
  "Max Power": number;
  "Max Guts": number;
  "Max Wit": number;
  "Event Recovery": number;
  "Event Effectiveness": number;
  "Failure Protection": number;
  "Energy Cost Reduction": number;
  "Minigame Effectiveness": number;
  "Skill Point Bonus": number;
  "Wit Friendship Recovery": number;
}

export interface StatsDict {
  Speed: number;
  Stamina: number;
  Power: number;
  Guts: number;
  Intelligence?: number;
  Wit?: number;
  Energy?: number;
  Potential?: number;
  Bond?: number;
  "Skill Hint"?: number;
  "Skill Points"?: number;
}

export interface HintEvaluation {
  id: number;
  name: string;
  desc: string;
  running_style_trigger: number;
  distance_type_trigger: number;
}

export interface HintResult {
  hint_frequency: number;
  hints_from_events: number;
  useful_hints_rate: number;
  "hints from training": number;
  total_hints: number;
}

export interface RaceTypes {
  Sprint: boolean;
  Mile: boolean;
  Medium: boolean;
  Long: boolean;
}

export interface RunningTypes {
  "Front Runner": boolean;
  "Pace Chaser": boolean;
  "Late Surger": boolean;
  "End Closer": boolean;
}