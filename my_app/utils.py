import warnings
import dash_bootstrap_components as dbc
from dash import html

import numpy as np
from dataclasses import dataclass

warnings.simplefilter(action="ignore", category=FutureWarning)

import pandas as pd
import requests
import pytz
from config import sma_risk_messages, mrt_calculation, variable_calc_risk
from pvlib import location
from pythermalcomfort.models import utci, solar_gain, two_nodes

app_version = "0.0.4"
app_version = app_version.replace(".", "")
local_storage_settings_name = f"local-storage-settings-{app_version}"
session_storage_weather_name = f"session-storage-weather-{app_version}"
storage_user_id = "user-id"

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
            "Football (Soccer)": 3,
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


def get_yr_weather(lat=-33.8862, lon=151.1791, tz="Australia/Sydney"):
    """Get weather forecast from YR website."""

    weather = requests.get(
        f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}",
        headers={
            "User-Agent": (
                "http://sma-heat-policy.sydney.edu.au/ federico.tartarini@sydney.edu.au"
            ),
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


def calculate_comfort_indices_v1(data_for, sport_class):
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


def calculate_mean_radiant_tmp(df_for):
    site_location = location.Location(
        df_for.lat, df_for.lon, tz=df_for.tz, name=df_for.tz
    )
    solar_position = site_location.get_solarposition(df_for.index)
    cs = site_location.get_clearsky(df_for.index)

    # correct solar radiation by cloud cover
    solar_position.loc[solar_position["elevation"] < 0, "elevation"] = 0

    df_for = pd.concat([df_for, solar_position], axis=1)
    df_for = pd.concat([df_for, cs], axis=1)

    df_for["cloud"] /= 10
    df_for["dni"] *= (
        -0.00375838 * df_for["cloud"] ** 2 + -0.06230424 * df_for["cloud"] + 1.02290071
    )

    results = []
    for ix, row in df_for.iterrows():
        erf_mrt = solar_gain(
            row["elevation"],
            mrt_calculation["sharp"],
            row["dni"],
            mrt_calculation["sol_transmittance"],
            mrt_calculation["f_svv"],
            mrt_calculation["f_bes"],
            mrt_calculation["asw"],
            mrt_calculation["posture"],
            mrt_calculation["floor_reflectance"],
        )
        if erf_mrt["delta_mrt"] < 0:
            print(row)
        results.append(erf_mrt)
    df_mrt = pd.DataFrame.from_dict(results)
    df_mrt.set_index(df_for.index, inplace=True)
    df_for = pd.concat([df_for, df_mrt], axis=1)

    df_for["wind"] *= mrt_calculation["wind_coefficient"]
    df_for["tr"] = df_for["tdb"] + df_for["delta_mrt"]

    return df_for


def calculate_comfort_indices_v2(df_for, sport="Abseiling", calc_tr=True, met_corr=1):
    df_sport = pd.read_csv("assets/sports.csv")[["sport", "clo", "met"]]
    sport, clo, met = df_sport[df_sport.sport == sport].values[0]

    if calc_tr:
        df_for = calculate_mean_radiant_tmp(df_for)

    df_for["clo"] = clo
    df_for["met"] = met * met_corr

    df_for["utci"] = utci(
        tdb=df_for["tdb"], tr=df_for["tr"], v=df_for["wind"], rh=df_for["rh"]
    )
    results_two_nodes = two_nodes(
        tdb=df_for["tdb"],
        tr=df_for["tr"],
        v=df_for["wind"],
        rh=df_for["rh"],
        met=df_for["met"],
        clo=df_for["clo"],
        limit_inputs=False,
        round=False,
        w_max=1,
    )
    df_for["set"] = results_two_nodes["_set"]
    df_for["w"] = results_two_nodes["w"]
    df_for["w_max"] = results_two_nodes["w_max"]
    df_for["m_bl"] = results_two_nodes["m_bl"]
    df_for["m_rsw"] = results_two_nodes["m_rsw"]
    df_for["ratio_m_bl"] = (df_for["m_bl"] - 1.2) / (df_for["m_bl"] * 0 + 90 - 1.2)
    df_for["ratio_w"] = (df_for["w"] - 0.06) / (df_for["w_max"] - 0.06)

    bins = [
        i / (len(sma_risk_messages) - 1) for i in range(len(sma_risk_messages) - 1)
    ] + [0.95, 1.1]
    for index in [variable_calc_risk]:
        df_for[f"risk"] = pd.cut(
            df_for[index], bins=bins, labels=sma_risk_messages.keys(), right=False
        )

    # interpolation
    x = bins
    y = np.arange(0, len(sma_risk_messages) + 1, 1)

    df_for["risk_value"] = np.around(np.interp(df_for[variable_calc_risk], x, y), 0)
    df_for["risk_value_interpolated"] = np.around(
        np.interp(df_for[variable_calc_risk], x, y), 1
    )

    df_for.index = df_for.index.tz_localize(None)

    return df_for


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


@dataclass()
class FirebaseFields:
    database_name: str = "/Users/Test"
    database_url: str = "https://sma-extreme-heat-policy-default-rtdb.asia-southeast1.firebasedatabase.app"
    risk_profile: str = "risk-profile"
    user_id: str = "user-id"
    timestamp: str = "timestamp"
    location: str = "location"


if __name__ == "__main__":
    df = get_yr_weather(lat=-33.889, lon=151.184, tz="Australia/Sydney")
    df = get_yr_weather(lat=-31.92, lon=115.91, tz="Australia/Perth")
    df_results = calculate_comfort_indices_v1(df, sport_class=2)

    values = []
    for t in np.arange(10, 50):
        for rh in np.arange(0, 100, 1):
            values.append([t, rh])
    df = pd.DataFrame(values, columns=["tdb", "rh"])
    df_results = calculate_comfort_indices_v1(data_for=df, sport_class=2)
    df_plot = df_results.pivot("rh", "tdb", "risk").sort_index(ascending=False)
