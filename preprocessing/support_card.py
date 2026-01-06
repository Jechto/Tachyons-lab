from data_collecter import DataCollector
from typing import List
import re

from helper import parse_signed_int

class SupportCard:

    _name_to_lmb = {
        0: "0lb",
        1: "1lb",
        2: "2lb",
        3: "3lb",
        4: "mlb"
    }
    _lmb_to_name = {v: k for k, v in _name_to_lmb.items()}

    def __init__(self, id: int, limit_break: int) -> None:
        self.id = id
        self.limit_break = limit_break

        _data_singleton = DataCollector()
        _data = _data_singleton.data
        _card_data = next((entry for entry in _data if entry.get("id") == self.id), None)

        if _card_data is None:
            raise ValueError(f"SupportCard with id {id} not found in data.")

        _effects = _card_data.get("effects", [])
        _unique_effects = _card_data.get("unique_effects", [])

        self.card_uma = {
            "name": _card_data.get("card_chara_name", "Unknown"),
            "id": _card_data.get("chara_id_card", -1)
        }
        self.card_type = {
            "type": _card_data.get("prefered_type", "Unknown"),
            "id": _card_data.get("prefered_type_id", -1)
        }

        self.rarity = _card_data.get("rarity", -1)

        self.hints = _card_data.get("hints_table", [])

        self.events_stat_reward = self.findBestEventChoice(_card_data.get("all_events", {}))

        # List all possible effect names you care about
        effect_names = [
            "Friendship Bonus",
            "Mood Effect",
            "Speed Bonus",
            "Stamina Bonus",
            "Power Bonus",
            "Guts Bonus",
            "Wit Bonus",
            "Training Effectiveness",
            "Initial Speed",
            "Initial Stamina",
            "Initial Power",
            "Initial Guts",
            "Initial Wit",
            "Initial Friendship Gauge",
            "Race Bonus",
            "Fan Bonus",
            "Hint Levels",
            "Hint Frequency",
            "Specialty Priority",
            "Max Speed",
            "Max Stamina",
            "Max Power",
            "Max Guts",
            "Max Wit",
            "Event Recovery",
            "Event Effectiveness",
            "Failure Protection",
            "Energy Cost Reduction",
            "Minigame Effectiveness",
            "Skill Point Bonus",
            "Wit Friendship Recovery"
        ]

        # Initialize all to -1
        _card_bonus = {name: -1 for name in effect_names}

        # Use _name_to_lmb to convert limit_break to the string key for effect lookup
        lb_key = self._name_to_lmb.get(self.limit_break, "mlb")
        for effect in _effects:
            type_name = effect.get("type_name")
            if type_name in _card_bonus:
                _card_bonus[type_name] = effect.get(lb_key, -1)

        for unique_effect in _unique_effects:
            _lb_unlock_key = self._name_to_lmb.get(unique_effect["level_unlocked"], 0)
            if limit_break >= _lb_unlock_key:
                for effect in unique_effect.get("effects", []):
                    type_name = effect.get("type_name")
                    type_value = effect.get("value", -1)
                    if _card_bonus[type_name] == -1:
                        _card_bonus[type_name] = type_value
                    else:
                        # Multiplicative stacking for percentage-based bonuses
                        # Formula: (1 + A/100) * (1 + B/100) = 1 + Total/100
                        # Total = ((1 + A/100) * (1 + B/100) - 1) * 100
                        current_mult = 1 + _card_bonus[type_name] / 100
                        new_mult = 1 + type_value / 100
                        _card_bonus[type_name] = (current_mult * new_mult - 1) * 100

        self.card_bonus = _card_bonus

    def eval_stat_array(self, stat_dict: dict) -> int:
        weights = {
            "Speed": 1,
            "Stamina": 1,
            "Power": 1,
            "Guts": 1,
            "Intelligence": 1,
            "Energy": 2,
            "Potential": 0.2, # Skill points
            "Bond": 0
        } ## NOTE: This should probably be moved to config or be adjustable
        return sum(stat_dict.get(k, 0) * w for k, w in weights.items())

    def findBestEventChoice(self, all_events: dict) -> dict:
        stat_keys = [
            "Speed", "Stamina", "Power", "Guts", "Intelligence",
            "Energy", "Potential", "Bond", "Skill Hint"
        ]
        total_best_stats = {k: 0 for k in stat_keys}

        for arrow_event in all_events.get("chain_events", []) + all_events.get("dates", []):
            best_eval = 0
            best_stats = {k: 0 for k in stat_keys}
            for choice in arrow_event.get("choices", []):
                # Split rewards by "di" separator - each section is a mutually exclusive outcome
                reward_groups = []
                current_group = []
                
                for reward in choice.get("rewards", []):
                    if reward["type"] == "di":
                        if current_group:
                            reward_groups.append(current_group)
                            current_group = []
                    else:
                        current_group.append(reward)
                
                # Add the last group if it exists
                if current_group:
                    reward_groups.append(current_group)
                
                # If no groups (no rewards or all were "di"), skip this choice
                if not reward_groups:
                    continue
                
                # Check if this choice has "ee" (event chain ended) - apply large penalty
                has_ee = any(reward["type"] == "ee" for reward in choice.get("rewards", []))
                
                # Calculate expected value across all reward groups
                current_stats_for_choice = {k: 0 for k in stat_keys}
                probability_per_group = 1.0 / len(reward_groups)
                
                for group in reward_groups:
                    group_stats = {k: 0 for k in stat_keys}
                    for reward in group:
                        rtype = reward["type"]
                        if rtype in group_stats:
                            group_stats[rtype] += parse_signed_int(reward["value"])
                    
                    # Add this group's contribution weighted by probability
                    for k in stat_keys:
                        current_stats_for_choice[k] += group_stats[k] * probability_per_group

                _eval = self.eval_stat_array(current_stats_for_choice)
                
                # Apply large penalty if event chain ends
                if has_ee:
                    _eval -= 1000
                
                if _eval > best_eval:
                    best_eval = _eval
                    best_stats = current_stats_for_choice

            # add best_stats for that event unto total best stats for that event chain
            for k in stat_keys:
                total_best_stats[k] += best_stats[k]

        return total_best_stats
    
    def parse_condition(self, condition_str: str):

        if condition_str == None or condition_str.strip() == "":
            return {}
        # Supported operators, longest first for correct matching
        operators = ["==", "!=", ">=", "<=", ">", "<"]
        op_pattern = re.compile(r"(==|!=|>=|<=|>|<)")

        def parse_atom(atom):
            match = op_pattern.search(atom)
            if not match:
                raise ValueError(f"Invalid condition: {atom}, full string: {condition_str}")
            op = match.group(1)
            key, value = atom.split(op, 1)
            return {key.strip(): {"op": op, "value": value.strip()}}

        or_parts = condition_str.split('@')
        or_list = []
        for or_part in or_parts:
            and_parts = or_part.split('&')
            and_list = []
            for and_part in and_parts:
                and_list.append(parse_atom(and_part))
            if len(and_list) == 1:
                or_list.append(and_list[0])
            else:
                or_list.append({"and": and_list})
        if len(or_list) == 1:
            return or_list[0]
        else:
            return {"or": or_list}

    def parse_trigger(self, condition: dict, trigger_type: str) -> int:
        if not condition:
            return 0

        # If this is an OR node
        if "or" in condition:
            for sub in condition["or"]:
                result = self.parse_trigger(sub, trigger_type)
                if result != 0:
                    return result
            return 0

        # If this is an AND node
        if "and" in condition:
            for sub in condition["and"]:
                result = self.parse_trigger(sub, trigger_type)
                if result != 0:
                    return result
            return 0

        # Otherwise, check if this node is the trigger_type
        if trigger_type in condition:
            val = condition[trigger_type]
            # val can be a dict like {"op": "==", "value": "1"}
            if isinstance(val, dict) and val.get("op") == "==":
                try:
                    return int(val.get("value", 0))
                except (ValueError, TypeError):
                    return 0
        return 0

    def extract_skill_hints(self) -> List[int]:
        
        all_hints = []

        for card_hint in self.hints:
            skill_data = card_hint.get("skill_data", {})
            condition = self.parse_condition(skill_data.get("condition_1", ""))

            all_hints.append({
                "id": card_hint.get("skill_id", 0),
                "name": skill_data.get("skill_name", "Unknown"),
                "desc": skill_data.get("skill_desc", "No description available."),
                "running_style_trigger": self.parse_trigger(condition, "running_style"),
                "distance_type_trigger": self.parse_trigger(condition, "distance_type"),
            })
        
        return all_hints

    def evaluate_card_hints(self, race_types=[False,False,False,False], running_types=[False,False,False,False], optional_races=0) -> List[dict]:

        max_training_turns = 72 + 6 - 11 - optional_races
        hint_freq = 0.075 * (self.card_bonus.get("Hint Frequency", 0) + 100) / 100

        hint_from_events = self.events_stat_reward.get("Skill Hint", 0)

        hint_levels = self.card_bonus.get("Hint Levels",0)
        if hint_levels <= 0:
            hint_levels = 1

        card_hints = self.extract_skill_hints()
        useful_hint_count = 0
        for hint in card_hints:
            distance_type_trigger = hint.get("distance_type_trigger", 0)
            if distance_type_trigger != 0:
                if race_types[distance_type_trigger - 1] == False:
                    # skill doesn't match running style
                    continue

            running_style_trigger = hint.get("running_style_trigger", 0)
            if running_style_trigger != 0:
                if running_types[running_style_trigger - 1] == False:
                    # skill doesn't match running style
                    continue

            useful_hint_count += 1
    

        return {
            "hint_frequency": hint_freq,
            "hints_from_events": hint_from_events,
            "useful_hints_rate": useful_hint_count / len(card_hints) if card_hints else 0,
            "hints from training": max_training_turns * hint_freq * hint_levels * (useful_hint_count / len(card_hints) if card_hints else 0),
            "total_hints": hint_from_events + max_training_turns * hint_freq * hint_levels * (useful_hint_count / len(card_hints) if card_hints else 0)
        }
