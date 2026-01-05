import os
import json

from tqdm import tqdm
from database import Database
from event_scraper import EventScraper
from helper import read_json_file

from typing import Optional, Any

class DataCollector:
    _instance: Optional['DataCollector'] = None
    _data: Optional[Any] = None

    def __new__(cls) -> 'DataCollector':
        if cls._instance is None:
            cls._instance = super(DataCollector, cls).__new__(cls)
        return cls._instance

    def get_data(self, db_path: str = None, output_path: str = None, skip_existing: bool = False) -> Optional[Any]:
        skip_dl = False
        if db_path is None or output_path is None:
            skip_dl = True

        current_data = None
        if output_path is not None and not skip_existing:
            current_data = read_json_file(output_path)
        elif skip_existing:
            print("Skipping existing data.json - starting fresh as requested")

        if skip_dl and current_data:
            print(f"Using existing data from {output_path}")
            self._data = current_data
            return current_data

        if skip_dl:
            print("Skipping data loading and extraction due to missing db_path or output_path.")
            return None

        if not os.path.exists(db_path):
            print(f"Database file not found: {db_path}")
            return None

        Database.configure(db_path)

        print(f"Extracting support cards from {db_path}...")
        data = Database().get_all_support_cards(current_data)

        print(f"Gathering Events  for Support Cards...")
        data = EventScraper().get_events_for_support_cards(data)

        print(f"Writing output to {output_path}...")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Done.")
        self._data = data
        return data

    def download_images(self, data, output_dir: str) -> bool:
        import requests
        import time
        
        os.makedirs(output_dir, exist_ok=True)
        
        for card in tqdm(data):
            card_id = card.get('id')
            image_url = f"https://gametora.com/images/umamusume/supports/support_card_s_{card_id}.png"
            
            image_path = os.path.join(output_dir, f"{card_id}.png")
            
            if os.path.exists(image_path):
                continue
                
            try:
                print(f"Downloading {image_url}")
                response = requests.get(image_url, timeout=10)
                response.raise_for_status()
                
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                    
                
            except Exception as e:
                print(f"Failed to download image for card {card_id}: {e}")
                continue

        return True

    def download_skill_images(self, data, output_dir: str) -> bool:
        import requests
        import time
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Collect all unique icon IDs from all cards
        icon_ids = set()
        for card in data:
            # Check hints_table
            hints_table = card.get('hints_table', [])
            for hint in hints_table:
                if hint.get('type') == 'skill_hint':
                    skill_data = hint.get('skill_data', {})
                    icon_id = skill_data.get('icon_id')
                    if icon_id:
                        icon_ids.add(icon_id)
            
            # Also check hints_event_table
            hints_event_table = card.get('hints_event_table', [])
            for hint in hints_event_table:
                if hint.get('type') == 'skill_hint':
                    skill_data = hint.get('skill_data', {})
                    icon_id = skill_data.get('icon_id')
                    if icon_id:
                        icon_ids.add(icon_id)
        
        print(f"Found {len(icon_ids)} unique skill icons to download")
        
        # Download each skill icon
        for icon_id in tqdm(icon_ids):
            image_url = f"https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_{icon_id}.png"
            image_path = os.path.join(output_dir, f"{icon_id}.png")
            
            # Skip if already exists
            if os.path.exists(image_path):
                continue
            
            try:
                print(f"Downloading skill icon {icon_id} from {image_url}")
                response = requests.get(image_url, timeout=10)
                response.raise_for_status()
                
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                
                # Small delay to avoid overwhelming the server
                time.sleep(0.1)
                    
            except Exception as e:
                print(f"Failed to download skill icon {icon_id}: {e}")
                continue
        
        return True

    @property
    def data(self) -> Optional[Any]:
        return self._data
