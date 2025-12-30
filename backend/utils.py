import json

def save_json(data, filename):
    """Saves data to a JSON file."""
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)
    print(f"✅ Saved data to {filename}")

def load_json(filename):
    """Loads data from a JSON file."""
    try:
        with open(filename, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {filename} not found.")
        return None