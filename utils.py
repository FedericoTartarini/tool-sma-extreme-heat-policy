import warnings
import dash_bootstrap_components as dbc
from dash import html

import numpy as np

warnings.simplefilter(action="ignore", category=FutureWarning)

import pandas as pd
import requests
import pytz

hss_palette = {
    0: "#00AD7C",
    1: "#FFD039",
    2: "#E45A01",
    3: "#CB3327",
}

sports_category = dict(
    sorted(
        {
            "Walking": 1,
            "Archery": 2,
            "Bowls": 2,
            "Field Athletics": 2,
            "Fishing": 2,
            "Golf": 2,
            "Lifesaving Surf": 2,
            "Sailing": 2,
            "Shooting": 2,
            "Walking (brisk)": 2,
            "Abseiling": 3,
            "Australian Football": 3,
            "Basketball": 3,
            "Cycling": 3,
            "Canoeing": 3,
            "Caving": 3,
            "Kayaking": 3,
            "Netball": 3,
            "Oztag": 3,
            "Rock Climbing": 3,
            "Rowing": 3,
            "Soccer": 3,
            "Tennis": 3,
            "Touch Football": 3,
            "Long Distance Running": 3,
            "Triathlon": 3,
            "Volleyball": 3,
            "Baseball": 4,
            "Bush-walking": 4,
            "Cricket": 4,
            "Equestrian": 4,
            "Horseback Riding": 4,
            "Motor Cycling": 4,
            "Rugby Union": 4,
            "Rugby League": 4,
            "Softball": 4,
            "Field Hockey": 5,
            "Mountain Biking": 5,
        }.items()
    )
)

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36"
    )
}

sma_risk_messages = {
    "low": {
        "description": (
            "maintaining hydration through regular fluid consumption and modifying"
            " clothing is still a simple, yet effective, way of keeping cool and"
            " preserving health and performance during the summer months."
        ),
        "suggestions": """
        * Ensure pre-exercise hydration by consuming 6 ml of water per kilogram of body weight
        every 2-3 hours before exercise. For a 70kg individual, this equates to 420ml of fluid
        every 2-3 hours (a standard sports drink bottle contains 500ml).
        * Drink regularly throughout exercise. You should aim to drink enough to offset sweat
        losses, but it is important to avoid over-drinking because this can also have negative
        health effects. To familiarise yourself with how much you typically sweat, become
        accustomed to weighing yourself before and after practice or competition.
        * Where possible, select light-weight and breathable clothing with extra ventilation.
        * Remove unnecessary clothing/equipment and/or excess clothing layers.
        * Reduce the amount of skin that is covered by clothing – this will help increase your
        sweat evaporation, which will help you dissipate heat.
            """,
    },
    "moderate": {
        "description": (
            "increasing the frequency and/or duration of your rest breaks during"
            " exercise or sporting activities is an effective way of reducing your risk"
            " for heat illness even if minimal resources are available."
        ),
        "suggestions": """
        * During training sessions, provide a minimum of 15 minutes of rest for every 45 minutes
        of practice.
        * Extend scheduled rest breaks that naturally occur during match-play of a particular
        sport (e.g. half-time) by ~10 minutes. This is effective for sports such as soccer/football and
        rugby and can be implemented across other sports such as field hockey.
        * Implement additional rest breaks that are not normally scheduled to occur. For example,
        3 to 5-min “quarter-time” breaks can be introduced mid-way through each half of a
        football or rugby match, or an extended 10-min drinks break can be introduced every
        hour of a cricket match or after the second set of a tennis match.
        * For sports with continuous play without any scheduled breaks, courses or play duration
        can be shortened
        * During all breaks in play or practice, everyone should seek shade – if natural shade is not
        available, portable sun shelters should be provided, and water freely available
            """,
    },
    "high": {
        "description": (
            "active cooling strategies should be applied during scheduled and"
            " additional rest breaks, or before and during activity if play is"
            " continuous. Below are strategies that have been shown to effectively"
            " reduce body temperature. The suitability and feasibility of each strategy"
            " will depend on the type of sport or exercise you are performing. "
        ),
        "suggestions": """
        * Drinking cold fluids and/or ice slushies before exercise commences. Note that cold water
        and ice slushy ingestion during exercise is less effective for cooling.
        * Submerging your arms/feet in cold water.
        * Water dousing – wetting your skin with cool water using a sponge or a spray bottle helps
        increase evaporation, which is the most effective cooling mechanism in the heat.
        * Ice packs/towels – placing an ice pack or damp towel filled with crushed ice around your
        neck.
        * Electric (misting) fans – outdoor fans can help keep your body cool, especially when
        combined with a water misting system.
            """,
    },
    "extreme": {
        "description": (
            "exercise/play should be suspended. If play has commenced, then all"
            " activities should be stopped as soon as possible."
        ),
        "suggestions": """
        * All players should seek shade or cool refuge in an air-conditioned space if available
        * Active cooling strategies should be applied.
            """,
    },
}

default_location = {"lat": -33.89, "lon": 151.18, "tz": "Australia/Sydney"}

default_settings = {"id-class": "Soccer", "id-postcode": "Camperdown, NSW, 2050"}

time_zones = {
    "NSW": "Australia/Sydney",
    "WA": "Australia/Perth",
    "ACT": "Australia/Canberra",
    "NT": "Australia/Darwin",
    "SA": "Australia/Adelaide",
    "QLD": "Australia/Brisbane",
    "VIC": "Australia/Melbourne",
    "TAS": "Australia/Hobart",
}


def get_yr_weather(lat=-33.8862, lon=151.1791, tz="Australia/Sydney"):
    """get weather forecast from YR website"""

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
    for ix, item in enumerate(["low", "moderate", "high", "extreme"]):
        legend_items.append(
            dbc.Col(
                dbc.Row(
                    [
                        dbc.Col(
                            html.Div(
                                style={
                                    "height": "1em",
                                    "width": "1em",
                                    "background-color": hss_palette[ix],
                                    "border-radius": "50%",
                                }
                            ),
                        ),
                        dbc.Col(item, className="p-0"),
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
