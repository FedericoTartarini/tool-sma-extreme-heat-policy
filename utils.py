import warnings
import dash_bootstrap_components as dbc
from dash import html

import numpy as np

warnings.simplefilter(action="ignore", category=FutureWarning)

import pandas as pd
import requests
import pytz
from config import sma_risk_messages


def get_yr_weather(lat=-33.8862, lon=151.1791, tz="Australia/Sydney"):
    """Get weather forecast from YR website."""

    weather = requests.get(
        f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}",
        headers={
            "User-Agent": "https://federicotartarini.github.io/air-quality-weather-sg"
        },
    )

    df_weather = pd.json_normalize(
        weather.json()["properties"]["timeseries"],
    )
    df_weather = df_weather[df_weather.columns[:7]]
    df_weather.columns = ["time", "pressure", "tdb", "cloud", "rh", "w-dir", "wind"]
    df_weather.set_index(pd.to_datetime(df_weather["time"]), inplace=True)
    df_weather.drop(columns=["time"], inplace=True)
    df_weather.index = df_weather.index.tz_convert(pytz.timezone(tz))
    df_weather = df_weather.dropna(subset=["tdb"])

    return df_weather


def calculate_comfort_indices(data_for, sport_class):
    lines = generate_regression_curves(sport_class)
    data_for["moderate"] = lines[1](data_for["tdb"])
    data_for["high"] = lines[2](data_for["tdb"])
    data_for["extreme"] = lines[3](data_for["tdb"])

    risk_value_interpolated = []
    for ix, row in data_for.iterrows():
        top = 100
        if row["extreme"] > top:
            top = row["extreme"] + 10
        x = [0, row["moderate"], row["high"], row["extreme"], top]
        y = np.arange(0, 5, 1)

        risk_value_interpolated.append(np.around(np.interp(row["rh"], x, y), 1))

    data_for["risk_value_interpolated"] = risk_value_interpolated

    data_for["risk"] = "low"
    for risk in ["moderate", "high", "extreme"]:
        data_for.loc[data_for[risk] < 0, risk] = 0
        data_for.loc[data_for[risk] > 100, risk] = 100
        data_for.loc[data_for["rh"] > data_for[risk], "risk"] = risk

    risk_value = {"low": 0, "moderate": 1, "high": 2, "extreme": 3}
    data_for["risk_value"] = data_for["risk"].map(risk_value)

    return data_for


def generate_regression_curves(sport_class):
    df_points = pd.read_csv("./assets/points_curves.csv")
    df_class = df_points[df_points["class"] == sport_class]
    regressions_lines = {}
    for line in df_class["line"].unique():
        df_line = df_class[df_class["line"] == line]
        z = np.polyfit(df_line.x, df_line.y, 2)
        regressions_lines[line] = np.poly1d(z)
    return regressions_lines


def legend_risk():
    legend_items = []
    for key, value in sma_risk_messages.items():
        legend_items.append(
            dbc.Col(
                dbc.Row(
                    [
                        dbc.Col(
                            html.Div(
                                style={
                                    "height": "1em",
                                    "width": "1em",
                                    "background-color": value.color,
                                    "border-radius": "50%",
                                }
                            ),
                        ),
                        dbc.Col(key, className="p-0"),
                    ],
                    align="center",
                ),
                width="auto",
            ),
        )

    return dbc.Row(
        legend_items,
        justify="around",
        className="my-2",
    )


def get_data_specific_day(df, date_offset=0):
    date_keep = df.index.min() + pd.tseries.offsets.DateOffset(n=date_offset)
    date_keep = date_keep.date()
    return df.loc[df.index.date == date_keep]


if __name__ == "__main__":
    df = get_yr_weather(lat=-33.889, lon=151.184, tz="Australia/Sydney")
    df = get_yr_weather(lat=-31.92, lon=115.91, tz="Australia/Perth")
    df_results = calculate_comfort_indices(df, sport_class=2)

    # sma-hss
    values = []
    for t in np.arange(10, 50):
        for rh in np.arange(0, 100, 1):
            values.append([t, rh])
    df = pd.DataFrame(values, columns=["tdb", "rh"])
    df_results = calculate_comfort_indices(data_for=df, sport_class=2)
    df_plot = df_results.pivot("rh", "tdb", "risk").sort_index(ascending=False)
