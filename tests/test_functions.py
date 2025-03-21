import numpy as np
import pandas as pd

from my_app.utils import calculate_comfort_indices_v1

values = []
for t in np.arange(20, 50, 2):
    for rh in np.arange(0, 100, 5):
        values.append([t, rh])
df = pd.DataFrame(values, columns=["tdb", "rh"])

data = [
    {"tdb": 28, "rh": 30, "class": 1, "risk": "low"},
    {"tdb": 32, "rh": 40, "class": 1, "risk": "moderate"},
    {"tdb": 31, "rh": 60, "class": 1, "risk": "high"},
    {"tdb": 31, "rh": 90, "class": 1, "risk": "extreme"},
    {"tdb": 28, "rh": 30, "class": 2, "risk": "low"},
    {"tdb": 32, "rh": 40, "class": 2, "risk": "moderate"},
    {"tdb": 31, "rh": 60, "class": 2, "risk": "high"},
    {"tdb": 31, "rh": 90, "class": 2, "risk": "extreme"},
    {"tdb": 28, "rh": 30, "class": 3, "risk": "low"},
    {"tdb": 32, "rh": 40, "class": 3, "risk": "moderate"},
    {"tdb": 31, "rh": 60, "class": 3, "risk": "high"},
    {"tdb": 31, "rh": 90, "class": 3, "risk": "extreme"},
    {"tdb": 28, "rh": 30, "class": 4, "risk": "low"},
    {"tdb": 32, "rh": 40, "class": 4, "risk": "moderate"},
    {"tdb": 31, "rh": 60, "class": 4, "risk": "high"},
    {"tdb": 31, "rh": 90, "class": 4, "risk": "extreme"},
    {"tdb": 28, "rh": 30, "class": 5, "risk": "low"},
    {"tdb": 32, "rh": 40, "class": 5, "risk": "high"},
    {"tdb": 31, "rh": 60, "class": 5, "risk": "extreme"},
    {"tdb": 31, "rh": 90, "class": 5, "risk": "extreme"},
    {"tdb": 36, "rh": 10, "class": 1, "risk": "low"},
    {"tdb": 36, "rh": 10, "class": 2, "risk": "low"},
    {"tdb": 36, "rh": 10, "class": 3, "risk": "low"},
    {"tdb": 36, "rh": 10, "class": 4, "risk": "moderate"},
    {"tdb": 36, "rh": 10, "class": 5, "risk": "moderate"},
    {"tdb": 34, "rh": 35, "class": 1, "risk": "moderate"},
    {"tdb": 34, "rh": 35, "class": 2, "risk": "moderate"},
    {"tdb": 34, "rh": 35, "class": 3, "risk": "high"},
    {"tdb": 34, "rh": 35, "class": 4, "risk": "high"},
    {"tdb": 34, "rh": 35, "class": 5, "risk": "high"},
]


def test_calculate_comfort_indices():
    for row in data:
        df = pd.DataFrame.from_dict([row])
        df_results = calculate_comfort_indices_v1(data_for=df, sport_class=row["class"])
        assert row["risk"] == df_results["risk"].values[0]
