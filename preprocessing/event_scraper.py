
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
                            reward_entry = {"type": reward_type, "value": reward.get("v")}
                            if "d" in reward:
                                reward_entry["detail"] = reward["d"]
                            option_obj["rewards"].append(reward_entry)
                        hist_event["choices"].append(option_obj)
                    event_obj["history"].append(hist_event)
            parsed_events.append(event_obj)
        return parsed_events