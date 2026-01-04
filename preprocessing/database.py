import sqlite3
from typing import List, Dict, Optional
from tqdm import tqdm

from helper import lerp_levels

class Database:

    _instance = None
    _db_path: Optional[str] = None
    
    # Define which effect types use multiplicative stacking for unique effects
    # Effect type ID -> bool (True = multiplicative, False = additive)
    _multiplicative_unique_effects = {
        1: True,   # Friendship Bonus
        8: True,   # Training Effectiveness
        18: True,  # Hint Frequency
        27: True,  # Failure Protection
        28: True,  # Energy Cost Reduction
        # All stat bonuses (Speed, Stamina, Power, Guts, Wit) are additive
        # Initial stats are additive
        # Race Bonus is additive
        # Specialty Priority is additive (default)
        # Skill Point Bonus is additive (default)
        # Mood Effect is additive (default)
    }
    
    _types = {
        0: (6,"Support"),
        101: (0,"Speed"),
        102: (2,"Power"),
        103: (3,"Guts"),
        105: (1,"Stamina"),
        106: (4,"Intelligence")
    }
    _types_alt = {
        6: "Support",
        0: "Speed",
        2: "Power",
        3: "Guts",
        1: "Stamina",
        4: "Intelligence"
    }

    def __new__(cls, db_path: Optional[str] = None) -> 'Database':
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            if db_path is not None:
                cls._db_path = db_path
        return cls._instance

    @classmethod
    def configure(cls, db_path: str) -> None:
        cls._db_path = db_path

    # STUFF RELATED TO SUPPORT CARDS
    # TODO: get chain events & random events

    def get_all_support_cards(self, existing_support_cards: Optional[List[Dict]] = []) -> List[Dict]:
        """
        Retrieve all support cards from the database, skipping any whose 'id' is present in the supplied existing_support_cards list.
        Args:
            existing_support_cards (Optional[List[Dict]]): List of support card dicts to skip (by 'id').
        Returns:
            List[Dict]: List of new support card dicts not in existing_support_cards.
        """
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT id, chara_id AS chara_id_card, rarity, effect_table_id, unique_effect_id, command_id, skill_set_id FROM support_card_data')
        result = cursor.fetchall()
        conn.close()
        
        # Initialize support_cards as empty list if existing_support_cards is None
        support_cards = existing_support_cards if existing_support_cards is not None else []

        # Build a set of existing IDs for fast lookup
        existing_ids = set()
        if existing_support_cards is not None:
            for card in existing_support_cards:
                if isinstance(card, dict) and 'id' in card:
                    existing_ids.add(card['id'])
                elif isinstance(card, int):
                    existing_ids.add(card)

        for row in tqdm(result):
            keys = ['id', 'chara_id_card', 'rarity', 'effect_table_id', 'unique_effect_id', 'command_id', 'skill_set_id']
            row_dict = dict(zip(keys, row))
            id_ = row_dict['id']
            if id_ in existing_ids:
                continue  # Skip if already present
            chara_id_card = row_dict['chara_id_card']
            rarity = row_dict['rarity']
            effect_table_id = row_dict['effect_table_id']
            unique_effect_id = row_dict['unique_effect_id']
            command_id = row_dict['command_id']

            effects = self.get_support_card_effects(card_id=effect_table_id, rarity=rarity)
            unique_effects_raw = []
            if unique_effect_id != 0:
                unique_effects_raw = self.get_support_card_unique_effects(card_id=unique_effect_id, rarity=rarity)
            
            # Apply unique effects to base effects (multiplicative stacking)
            effects = self._apply_unique_effects_to_base(effects, unique_effects_raw, rarity)
            
            row_dict["id"] = id_
            row_dict["card_chara_name"] = self.get_uma_name(chara_id_card)
            prefered_type = self._types.get(command_id, (None, None))
            row_dict["prefered_type_id"] = prefered_type[0]
            row_dict["prefered_type"] = prefered_type[1]
            row_dict["effects"] = effects
            row_dict["hints_table"] = self.get_support_card_hints(card_id=id_)
            row_dict["hints_event_table"] = []  # Will be populated from events

            if unique_effect_id == 0:
                row_dict["unique_effect_id"] = None
            else:
                row_dict["unique_effects"] = unique_effects_raw

            support_cards.append(row_dict)
        return support_cards

    def _apply_unique_effects_to_base(self, base_effects: List[Dict], unique_effects: List[Dict], rarity: int) -> List[Dict]:
        """Apply unique effects to base effects with multiplicative stacking."""
        if not unique_effects:
            return base_effects
        
        # Map limit break levels for this rarity
        lb_keys = ["0lb", "1lb", "2lb", "3lb", "mlb"]
        
        for unique_entry in unique_effects:
            level_unlocked = unique_entry.get("level_unlocked")
            if level_unlocked == -1:
                continue
                
            # Determine which LB levels get the unique effect
            unlock_index = lb_keys.index(level_unlocked) if level_unlocked in lb_keys else -1
            if unlock_index == -1:
                continue
            
            # Apply unique effects to matching base effects
            for unique_effect in unique_entry.get("effects", []):
                effect_type = unique_effect.get("type")
                effect_value = unique_effect.get("value", 0)
                
                # Determine if this effect type uses multiplicative or additive stacking
                is_multiplicative = self._multiplicative_unique_effects.get(effect_type, False)
                
                # Find matching base effect by type
                for base_effect in base_effects:
                    if base_effect.get("type") == effect_type:
                        # Apply stacking to all LB levels >= unlock_index
                        for i, lb_key in enumerate(lb_keys):
                            if i >= unlock_index:
                                base_value = base_effect.get(lb_key, -1)
                                if base_value != -1:
                                    if is_multiplicative:
                                        # Multiplicative: (1 + base/100) * (1 + unique/100) - 1) * 100
                                        current_mult = 1 + base_value / 100
                                        new_mult = 1 + effect_value / 100
                                        base_effect[lb_key] = round((current_mult * new_mult - 1) * 100, 2)
                                    else:
                                        # Additive: base + unique
                                        base_effect[lb_key] = base_value + effect_value
                        break
        
        return base_effects

    def get_type_name(self, type_id: int) -> Optional[str]:
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT text FROM text_data WHERE category=151 AND "index"=?', (type_id,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None
    
    def get_uma_name(self, uma_id: int) -> Optional[str]:
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT text FROM text_data WHERE category=182 AND "index"=?', (uma_id,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None

    def get_skill_text(self, skill_id: int, text_type: str) -> Optional[str]:
        if not self._db_path:
            raise ValueError("Database path not configured.")

        category = 48 if text_type == "description" else 47

        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT text FROM text_data WHERE category=? AND "index"=?', (category, skill_id))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None

    def get_support_card_effects(self, card_id: int, rarity: int) -> List[Dict]:
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
       
        cursor.execute('''
            SELECT 
                id, type, init, limit_lv5, limit_lv10, limit_lv15, limit_lv20, 
                limit_lv25, limit_lv30, limit_lv35, limit_lv40, limit_lv45, limit_lv50
            FROM support_card_effect_table
            WHERE id=?
        ''', (card_id,))
        rows = cursor.fetchall()
        conn.close()
        entries = []
        columns = [desc[0] for desc in cursor.description]
        for row in rows:
            row_dict = dict(zip(columns, row))
            values_for_levels = lerp_levels([row_dict['init'], row_dict['limit_lv5'], row_dict['limit_lv10'], row_dict['limit_lv15'], row_dict['limit_lv20'], row_dict['limit_lv25'], row_dict['limit_lv30'], row_dict['limit_lv35'], row_dict['limit_lv40'], row_dict['limit_lv45'], row_dict['limit_lv50']])
            entry = {}
            if rarity == 1:
                entry['0lb'] = values_for_levels[4]
                entry['1lb'] = values_for_levels[5]
                entry['2lb'] = values_for_levels[6]
                entry['3lb'] = values_for_levels[7]
                entry['mlb'] = values_for_levels[8]
            elif rarity == 2:
                entry['0lb'] = values_for_levels[5]
                entry['1lb'] = values_for_levels[6]
                entry['2lb'] = values_for_levels[7]
                entry['3lb'] = values_for_levels[8]
                entry['mlb'] = values_for_levels[9]
            elif rarity == 3:
                entry['0lb'] = values_for_levels[6]
                entry['1lb'] = values_for_levels[7]
                entry['2lb'] = values_for_levels[8]
                entry['3lb'] = values_for_levels[9]
                entry['mlb'] = values_for_levels[10]

            entry['type'] = row_dict['type']
            entry['type_name'] = self.get_type_name(row_dict['type'])
            entries.append(entry)
        return entries

    def get_support_card_unique_effects(self, card_id: int, rarity: int) -> List[Dict]:
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
       
        cursor.execute('''
            SELECT 
                id, lv, type_0, value_0, type_1, value_1
            FROM support_card_unique_effect
            WHERE id=?
        ''', (card_id,))
        row = cursor.fetchone()
        conn.close()
        columns = [desc[0] for desc in cursor.description]
        if row:
            row_dict = dict(zip(columns, row))
            effects = []
            if row_dict['type_0'] != 0:
                effects.append({
                    "type": row_dict['type_0'],
                    "type_name": self.get_type_name(row_dict['type_0']),
                    "value": row_dict['value_0']
                })
            if row_dict['type_1'] != 0:
                effects.append({
                    "type": row_dict['type_1'],
                    "type_name": self.get_type_name(row_dict['type_1']),
                    "value": row_dict['value_1']
                })

            lb_unlocked = row_dict['lv']
            if rarity == 1:
                level_unlocked = {20: "0lb", 25: "1lb", 30: "2lb", 35: "3lb", 40: "mlb"}.get(lb_unlocked, -1)
            if rarity == 2:
                level_unlocked = {25: "0lb", 30: "1lb", 35: "2lb", 40: "3lb", 45: "mlb"}.get(lb_unlocked, -1)
            if rarity == 3:
                level_unlocked = {30: "0lb", 35: "1lb", 40: "2lb", 45: "3lb", 50: "mlb"}.get(lb_unlocked, -1)

            return [{
                "level_unlocked": level_unlocked,
                "effects": effects
            }]
        return []

    def get_support_card_hints(self, card_id: int) -> List[Dict]:
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
       
        cursor.execute('''
            SELECT 
                hint_group, hint_gain_type, hint_value_1, hint_value_2
            FROM single_mode_hint_gain
            WHERE support_card_id=?
        ''', (card_id,))
        rows = cursor.fetchall()
        conn.close()

        columns = [desc[0] for desc in cursor.description]
        all_hints = {}
        for row in rows:
            row_dict = dict(zip(columns, row))
            index = row_dict['hint_group']
            if row_dict['hint_gain_type'] == 0:
                all_hints[index] = {
                    "type": "skill_hint",
                    "skill_id": row_dict['hint_value_1'],
                    "skill_data": self.get_skill_by_id(row_dict['hint_value_1']),
                    "hint_level": row_dict['hint_value_2']
                }
            else:
                if index not in all_hints or all_hints[index] is None:
                    all_hints[index] = {
                        "type": "stat_hint",
                        "stats": []
                    }
                all_hints[index]["stats"].append({
                    "stat_id": self._types_alt.get(row_dict['hint_value_1'], "Unknown"),
                    "value": row_dict['hint_value_2']
                })
        return list(all_hints.values())

    def get_skill_by_id(self, skill_id: int) -> Optional[Dict]:
        if not self._db_path:
            raise ValueError("Database path not configured.")
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
        cursor.execute('''SELECT 
                       id, 
                       rarity, 
                       group_id,
                       icon_id, 
                       grade_value, 
                       condition_1, 
                       float_ability_time_1 AS skill_time_active, 
                       float_cooldown_time_1 AS skill_cooldown_time, 
                       ability_type_1_1 AS ability_type, 
                       float_ability_value_1_1 AS ability_value
                       FROM skill_data WHERE id=?''', (skill_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            columns = [desc[0] for desc in cursor.description]
            skill_name = self.get_skill_text(skill_id, "name")
            skill_desc = self.get_skill_text(skill_id, "description")
            result = dict(zip(columns, row))
            result['skill_name'] = skill_name
            result['skill_desc'] = skill_desc
            return result
        return None

# Convenience function for external use
def get_support_cards() -> List[Dict]:
    return Database().get_support_cards()
