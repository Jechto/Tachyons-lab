
import requests
from bs4 import BeautifulSoup
import json

class EventScraper:
    from typing import List, Dict, Any
    def get_events_for_support_cards(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        events = []
        for card in data:
            card_url_postfix = f"{card['id']} {card['card_chara_name']}".lower().replace('.', '').replace(' ', '-')
            full_url = f"https://gametora.com/umamusume/supports/{card_url_postfix}"
            print(f"Fetching: {full_url}")
            if 'all_events' in card:
                print(f"  Skipping {card['card_chara_name']} ({card['id']}) - already has events")
                events.append(card)
                continue
            try:
                response = requests.get(full_url, timeout=10)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                script_tag = soup.find('script', id='__NEXT_DATA__', type='application/json')
                if script_tag:
                    json_data = json.loads(script_tag.string)
                    trimmed_data = json.loads(json_data["props"]["pageProps"]["eventData"]["en"])

                    random_events = trimmed_data.get("random", [])
                    chain_events = trimmed_data.get("arrows", [])
                    special_events = trimmed_data.get("special", [])
                    date_events = trimmed_data.get("dates", [])

                    card['all_events'] = {}
                    card['all_events']['dates'] = self.parse_event_data(date_events)
                    card['all_events']['chain_events'] = self.parse_event_data(chain_events)
                    card['all_events']['random_events'] = self.parse_event_data(random_events)
                    card['all_events']['special_events'] = self.parse_event_data(special_events)
                    
                    # Extract event hints and populate hints_event_table
                    card['hints_event_table'] = self.extract_event_hints(card['all_events'])
                    
                    events.append(card)
            except Exception as e:
                print(e)
        return events

    def parse_event_data(self, event_entries: list) -> list:
        key_skill_map = {
            "sp": "Speed",
            "st": "Stamina",
            "po": "Power",
            "gu": "Guts",
            "in": "Intelligence",
            "en": "Energy",
            "sk": "Skill Hint",
            "sr": "Skill Choice",  # Support card skill choices - different structure
            "bo": "Bond",
            "pt": "Potential",
            "mo": "Mood",
        }

        parsed_events = []
        for entry in event_entries:
            event_obj = {
                "name": entry.get("n"),
                "choices": []
            }
            for option in entry.get("c", []):
                option_obj = {"option": option.get("o"), "rewards": []}
                for reward in option.get("r", []):
                    reward_type = key_skill_map.get(reward.get("t"), reward.get("t"))
                    
                    # Special handling for "sr" (Skill Choice) type
                    if reward.get("t") == "sr" and "d" in reward and isinstance(reward["d"], list):
                        # Process each skill choice in the detail array
                        for skill_choice in reward["d"]:
                            skill_entry = {
                                "type": "Skill Choice",
                                "value": skill_choice.get("v"),
                                "detail": skill_choice.get("d")
                            }
                            option_obj["rewards"].append(skill_entry)
                    else:
                        # Regular reward processing
                        reward_entry = {"type": reward_type, "value": reward.get("v")}
                        if "d" in reward:
                            reward_entry["detail"] = reward["d"]
                        option_obj["rewards"].append(reward_entry)
                event_obj["choices"].append(option_obj)
            # Optionally handle history if present
            if "history" in entry:
                event_obj["history"] = []
                for hist in entry["history"]:
                    hist_data = hist.get("data", {})
                    hist_event = {
                        "period": hist.get("period"),
                        "name": hist_data.get("n"),
                        "choices": []
                    }
                    for option in hist_data.get("c", []):
                        option_obj = {"option": option.get("o"), "rewards": []}
                        for reward in option.get("r", []):
                            reward_type = key_skill_map.get(reward.get("t"), reward.get("t"))
                            
                            # Special handling for "sr" (Skill Choice) type
                            if reward.get("t") == "sr" and "d" in reward and isinstance(reward["d"], list):
                                # Process each skill choice in the detail array
                                for skill_choice in reward["d"]:
                                    skill_entry = {
                                        "type": "Skill Choice",
                                        "value": skill_choice.get("v"),
                                        "detail": skill_choice.get("d")
                                    }
                                    option_obj["rewards"].append(skill_entry)
                            else:
                                # Regular reward processing
                                reward_entry = {"type": reward_type, "value": reward.get("v")}
                                if "d" in reward:
                                    reward_entry["detail"] = reward["d"]
                                option_obj["rewards"].append(reward_entry)
                        hist_event["choices"].append(option_obj)
                    event_obj["history"].append(hist_event)
            parsed_events.append(event_obj)
        return parsed_events
    
    def extract_event_hints(self, all_events: dict) -> list:
        """
        Extract Skill Choice rewards from events and format them like hints_table entries
        """
        from database import Database  # Import here to avoid circular imports
        
        event_hints = []
        
        # Process all event types
        for event_type in ['dates', 'chain_events', 'random_events', 'special_events']:
            events = all_events.get(event_type, [])
            
            for event in events:
                # Process regular choices
                for choice in event.get('choices', []):
                    for reward in choice.get('rewards', []):
                        if reward.get('type') == 'Skill Hint' and 'detail' in reward:
                            skill_id = reward['detail']
                            skill_data = Database().get_skill_by_id(skill_id)
                            
                            if skill_data:
                                hint_entry = {
                                    "type": "skill_hint",
                                    "skill_id": skill_id,
                                    "skill_data": skill_data,
                                    "hint_level": 1  # Event hints are typically level 1
                                }
                                # Avoid duplicates
                                if not any(h.get('skill_id') == skill_id for h in event_hints):
                                    event_hints.append(hint_entry)
                
                # Process history if present
                for hist_event in event.get('history', []):
                    for choice in hist_event.get('choices', []):
                        for reward in choice.get('rewards', []):
                            if reward.get('type') == 'Skill Hint' and 'detail' in reward:
                                skill_id = reward['detail']
                                skill_data = Database().get_skill_by_id(skill_id)
                                
                                if skill_data:
                                    hint_entry = {
                                        "type": "skill_hint",
                                        "skill_id": skill_id,
                                        "skill_data": skill_data,
                                        "hint_level": 1
                                    }
                                    # Avoid duplicates
                                    if not any(h.get('skill_id') == skill_id for h in event_hints):
                                        event_hints.append(hint_entry)
        
        return event_hints