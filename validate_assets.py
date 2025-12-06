import json
import os
import sys

def validate_assets():
    config_path = 'public/assets/spritesheet_config.json'
    assets_dir = 'public/assets/'

    if not os.path.exists(config_path):
        print(f"Error: {config_path} not found.")
        return

    with open(config_path, 'r') as f:
        config = json.load(f)

    sheets = config.get('sheets', {})
    missing_files = []

    for relative_path in sheets.keys():
        full_path = os.path.join(assets_dir, relative_path)
        if not os.path.exists(full_path):
            missing_files.append(relative_path)
            print(f"Missing: {relative_path}")
        else:
            # Optional: Check image dimensions if needed, but existence is the main thing for 404s
            pass

    print(f"\nTotal missing files: {len(missing_files)}")

    # Also verify FarmerCyan specifically
    farmer_cyan = 'Characters/Workers/CyanWorker/FarmerCyan.png'
    if farmer_cyan in sheets:
        print(f"\nConfiguration for {farmer_cyan}:")
        print(json.dumps(sheets[farmer_cyan], indent=2))
    else:
        print(f"\n{farmer_cyan} not in config!")

if __name__ == "__main__":
    validate_assets()
