
import argparse

from data_collecter import DataCollector


def main() -> None:
    parser = argparse.ArgumentParser(description='Extract and process data from master.mdb')
    parser.add_argument('--db', default='./db/master.mdb', help='Path to the Access database file')
    parser.add_argument('--output_data', default='../front/src/app/data/data.json', help='Path to output JSON file')
    parser.add_argument('--output_images', default='../front/public/images/cards/', help='Path to output images directory')
    parser.add_argument('--del', action='store_true', default=False, help='Skip loading existing data.json and start fresh')
    args = parser.parse_args()

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
    
    print("All tasks completed successfully.")

if __name__ == '__main__':
    main()
