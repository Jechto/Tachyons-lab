
import argparse
import shutil
import os
from pathlib import Path

from data_collecter import DataCollector


def copy_db_from_steam() -> bool:
    """Copy master.mdb from Steam installation to preprocessing/db/"""
    try:
        # Source path in Steam installation
        source_path = Path.home() / "AppData/LocalLow/Cygames/Umamusume/master/master.mdb"
        
        # Destination path relative to project root
        # Get the script's directory and go up one level to project root
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        dest_path = project_root / "preprocessing" / "db" / "master.mdb"
        
        # Check if source exists
        if not source_path.exists():
            print(f"Error: Source database not found at {source_path}")
            return False
        
        # Create destination directory if it doesn't exist
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy the file
        print(f"Copying database from {source_path} to {dest_path}...")
        shutil.copy2(source_path, dest_path)
        print("Database copied successfully!")
        return True
        
    except Exception as e:
        print(f"Error copying database: {e}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description='Extract and process data from master.mdb')
    parser.add_argument('--db', default='./db/master.mdb', help='Path to the Access database file')
    parser.add_argument('--output_data', default='../front/src/app/data/data.json', help='Path to output JSON file')
    parser.add_argument('--output_images', default='../front/public/images/cards/', help='Path to output images directory')
    parser.add_argument('--output_skill_icons', default='../front/public/images/skills/', help='Path to output skill icons directory')
    parser.add_argument('--del', action='store_true', default=False, help='Skip loading existing data.json and start fresh')
    parser.add_argument('--copy-db', action='store_true', default=False, help='Copy master.mdb from Steam installation to preprocessing/db/')
    args = parser.parse_args()

    # Handle database copy if requested
    if args.copy_db:
        if not copy_db_from_steam():
            print("Database copy failed. Exiting.")
            raise SystemExit(1)
        # If only copying DB, exit after successful copy
        if len([arg for arg in vars(args).values() if arg is True]) == 1:
            print("Database copy completed")

    data_collector = DataCollector()
    data = data_collector.get_data(db_path=args.db, output_path=args.output_data, skip_existing=getattr(args, 'del'))

    if data is None:
        print("No data available. Exiting.")
        raise SystemExit(1)
    print(f"Data contains {len(data)} support cards.")

    image_success = data_collector.download_images(data=data, output_dir=args.output_images)

    if not image_success:
        print("Image download failed. Exiting.")
        raise SystemExit(1)
    
    print("Downloading skill icons...")
    skill_icon_success = data_collector.download_skill_images(data=data, output_dir=args.output_skill_icons)
    
    if not skill_icon_success:
        print("Skill icon download failed. Exiting.")
        raise SystemExit(1)
    
    print("All tasks completed successfully.")

if __name__ == '__main__':
    main()
