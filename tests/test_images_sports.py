from pathlib import Path

import pandas as pd


def test_images_exist():
    df_sports = pd.read_csv("assets/sports.csv")
    for sport in df_sports["sport_id"]:
        assert Path(f"assets/images/{sport}.webp").exists()
