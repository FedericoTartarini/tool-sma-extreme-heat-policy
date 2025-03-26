import logging
import time
import warnings
from dataclasses import dataclass
from enum import Enum

import dash_bootstrap_components as dbc
import numpy as np
import scipy
from dash import html
from matplotlib import pyplot as plt
from pythermalcomfort.utilities import mean_radiant_tmp

from my_app.my_classes import IDs

logger = logging.getLogger(__name__)

warnings.simplefilter(action="ignore", category=FutureWarning)

import pandas as pd
import requests
import pytz
from config import (
    sma_risk_messages,
    mrt_calculation,
    sports_info,
    df_postcodes,
    time_zones,
    default_location,
)
from pvlib import location
from pythermalcomfort.models import solar_gain, phs
import openmeteo_requests
import requests_cache
from retry_requests import retry

app_version = "1.0.0"
app_version = app_version.replace(".", "")
store_settings_dict = f"local-storage-settings-{app_version}"
store_weather_risk_df = f"session-storage-weather-{app_version}"
storage_user_id = "user-id"


@dataclass()
class Cols:
    pressure: str = "pressure"
    time: str = "time"
    tdb: str = "tdb"
    tr: str = "tr"
    tg: str = "tg"
    tdb_indoors: str = "tdb_indoors"
    hr_indoors: str = "hr_indoors"
    rh_indoors: str = "rh_indoors"
    cloud: str = "cloud"
    rh: str = "rh"
    hr: str = "humidity_ratio"
    wind_dir: str = "w-dir"
    radiation: str = "radiation"
    wind: str = "wind"
    location: str = "indoor_outdoors"
    clo: str = "clo"
    met: str = "met"
    set: str = "set"
    w: str = "w"
    w_max: str = "w_max"
    m_bl: str = "m_bl"
    m_rsw: str = "m_rsw"
    ratio_m_bl: str = "ratio_m_bl"
    ratio_w: str = "ratio_w"
    ratio_disc: str = "ratio_disc"
    disc_m_bl: str = "disc_m_bl"
    coefficient_disc_m_bl: str = "coefficient_disc_m_bl"
    hss_word: str = "hss_word"
    hss: str = "hss"
    disc: str = "disc"
    lat: str = "lat"
    lon: str = "lon"
    tz: str = "tz"
    sub_state_post: str = "sub-state-post"
    postcode: str = "postcode"
    state: str = "state"
    suburb: str = "suburb"


sports_category = sports_info[["sport", "sport_cat"]].copy().set_index("sport")
sports_category = sports_category.sort_index().to_dict()["sport_cat"]

# this file is generated running the functino generate_reference_table_risk()
df_risk_parquet = pd.read_parquet("assets/risk_reference_table.parquet")

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36"
    )
}


def yr_weather(lat=-33.8862, lon=151.1791, tz="Australia/Sydney"):
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

    return df_weather


def open_weather(lat, lon):
    cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
    openmeteo = openmeteo_requests.Client(session=retry_session)

    # Make sure all required weather variables are listed here
    # The order of variables in hourly or daily is important to assign them correctly below
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "cloud_cover",
            "wind_speed_10m",
            "direct_radiation",
        ],
        "timezone": "GMT",
        "wind_speed_unit": "ms",
    }
    responses = openmeteo.weather_api(url, params=params)

    # Process first location. Add a for-loop for multiple locations or weather models
    response = responses[0]

    # Process hourly data. The order of variables needs to be the same as requested.
    hourly = response.Hourly()
    hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
    hourly_relative_humidity_2m = hourly.Variables(1).ValuesAsNumpy()
    hourly_cloud_cover = hourly.Variables(2).ValuesAsNumpy()
    hourly_wind_speed_10m = hourly.Variables(3).ValuesAsNumpy()
    hourly_direct_radiation = hourly.Variables(4).ValuesAsNumpy()

    hourly_data = {
        Cols.time: pd.date_range(
            start=pd.to_datetime(hourly.Time(), unit="s"),
            end=pd.to_datetime(hourly.TimeEnd(), unit="s"),
            freq=pd.Timedelta(seconds=hourly.Interval()),
            inclusive="left",
        ).tz_localize("GMT"),
        Cols.tdb: hourly_temperature_2m,
        Cols.rh: hourly_relative_humidity_2m,
        Cols.cloud: hourly_cloud_cover,
        Cols.wind: hourly_wind_speed_10m,
        Cols.radiation: hourly_direct_radiation,
    }

    df_for = pd.DataFrame(data=hourly_data)
    # df_for[Cols.tdb] += 6
    return df_for


def get_weather(
    lat: float = -33.8862,
    lon: float = 151.1791,
    tz: str = "Australia/Sydney",
    provider: str = "open-meteo",
):
    """Get weather forecast from YR website.

    provider: str
        open-meteo or yr
    """

    try:
        if provider == "open-meteo":
            df_weather = open_weather(lat, lon)
        else:
            df_weather = yr_weather(lat, lon)
    except:
        if provider == "open-meteo":
            df_weather = yr_weather(lat, lon)
        else:
            df_weather = open_weather(lat, lon)

    df_weather.set_index(pd.to_datetime(df_weather[Cols.time]), inplace=True)
    df_weather.drop(columns=[Cols.time], inplace=True)
    df_weather.index = df_weather.index.tz_convert(pytz.timezone(tz))

    now = pd.Timestamp.now(pytz.timezone(tz)) - pd.Timedelta(hours=1)
    df_weather = df_weather[df_weather.index >= now]
    df_weather = df_weather.dropna(subset=[Cols.tdb])
    # df_weather = df_weather.resample("30min").interpolate()
    df_weather[Cols.lat] = lat
    df_weather[Cols.lon] = lon
    df_weather[Cols.tz] = tz

    return calculate_mean_radiant_tmp(df_weather)


def calculate_comfort_indices_v2(data_for, sport_id):

    array_risk_results = []

    sport_dict = sports_info.loc[sports_info["sport_id"] == sport_id].to_dict(
        orient="records"
    )
    sport = Sport(**sport_dict[0])

    # data_for = data_for.resample("60min").interpolate()
    for ix, row in data_for.iterrows():
        tdb = row[Cols.tdb]
        tg = row[Cols.tg]
        rh = row[Cols.rh]
        wind_speed = row[Cols.wind]

        if tg < GlobeTemperatures.low.value:
            tg = GlobeTemperatures.low.value
        elif tg > GlobeTemperatures.high.value:
            tg = GlobeTemperatures.high.value
        tg = round(tg)

        if wind_speed < sport.wind_low:
            wind_speed = sport.wind_low
        elif wind_speed > sport.wind_high - 0.5:
            wind_speed = sport.wind_high - 0.5
        wind_speed = round(round(wind_speed / 0.5) * 0.5, 2)

        if tdb < 24:
            tdb = 24
        elif tdb > 43.5:
            tdb = 43.5
        tdb = round(tdb * 2) / 2

        if rh < 0:
            rh = 0
        elif rh > 99:
            rh = 99
        rh = round(rh)

        try:
            risk_value = df_risk_parquet.loc[(tdb, rh, tg, wind_speed, sport_id)]
            risk_value = risk_value.to_dict()
        except:
            logger.error(
                f"Parquet file - Risk value not found for {tdb=}, {rh=}, {tg=}, {wind_speed=}, {sport_id=}"
            )
            # df_risk_parquet.loc[(25, 74, 4, 1.5, "astralian_football")]

        top = 100
        if risk_value["rh_threshold_extreme"] > top:
            top = risk_value["rh_threshold_extreme"] + 10

        x = [
            0,
            risk_value["rh_threshold_moderate"],
            risk_value["rh_threshold_high"],
            risk_value["rh_threshold_extreme"],
            top,
        ]
        y = np.arange(0, 5, 1)

        risk_value_interp = np.around(np.interp(row["rh"], x, y), 1)

        if row[Cols.tdb] < 20:
            risk_value_interp *= 0
        elif row[Cols.tdb] < 21:
            risk_value_interp *= 0.2
        elif row[Cols.tdb] < 22:
            risk_value_interp *= 0.4
        elif row[Cols.tdb] < 23:
            risk_value_interp *= 0.6
        elif row[Cols.tdb] < 24:
            risk_value_interp *= 0.8
        risk_value_interp = round(risk_value_interp, 2)

        array_risk_results.append([risk_value["risk"], risk_value_interp])

    data_for[["risk_value", "risk_value_interpolated"]] = array_risk_results

    risk_value = {0: "low", 1: "moderate", 2: "high", 3: "extreme"}
    data_for["risk"] = data_for["risk_value"].map(risk_value)

    return data_for


def calculate_mean_radiant_tmp(df_for):
    lat = df_for[Cols.lat].unique()[0]
    lon = df_for[Cols.lon].unique()[0]
    tz = df_for[Cols.tz].unique()[0]
    site_location = location.Location(lat, lon, tz=tz, name=tz)
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

        def calculate_globe_temperature(x):
            return mean_radiant_tmp(
                tg=x + row[Cols.tdb],
                tdb=row[Cols.tdb],
                v=row[Cols.wind],
                standard="iso",
            ) - (row[Cols.tdb] + erf_mrt.delta_mrt)

        erf_mrt_dict = erf_mrt.__dict__

        try:
            tg = scipy.optimize.brentq(calculate_globe_temperature, 0, 200)
        except ValueError:
            tg = 0
        erf_mrt_dict[Cols.tg] = tg
        # print(erf_mrt_dict, row[Cols.tdb], row[Cols.wind])

        results.append(erf_mrt_dict)

    df_mrt = pd.DataFrame.from_dict(results)
    df_mrt.set_index(df_for.index, inplace=True)
    df_for = pd.concat([df_for, df_mrt], axis=1)

    df_for[Cols.wind] *= mrt_calculation["wind_coefficient"]
    df_for[Cols.tr] = df_for[Cols.tdb] + df_for["delta_mrt"]

    return df_for


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
    database_url: str = (
        "https://sma-extreme-heat-policy-default-rtdb.asia-southeast1.firebasedatabase.app"
    )
    risk_profile: str = "risk-profile"
    user_id: str = "user-id"
    timestamp: str = "timestamp"
    location: str = "location"


def icon_component(src, message, size="50px"):
    return dbc.Row(
        [
            dbc.Col(
                html.Img(
                    src=src,
                    width=size,
                    # style={"filter": "drop-shadow(2px 5px 2px rgb(0 0 0 / 0.4))"},
                ),
                style={"text-align": "right"},
                width="auto",
            ),
            dbc.Col(
                html.H3(message),
                width="auto",
                style={"text-align": "left"},
            ),
        ],
        align="center",
        justify="center",
        className="my-1",
    )


class GlobeTemperatures(Enum):
    low: str = 4
    med: str = 8
    high: str = 12


def get_weather_and_calculate_risk(settings):
    loc_selected = get_info_location_selected(settings)

    df_for = get_weather(
        lat=loc_selected[Cols.lat], lon=loc_selected[Cols.lon], tz=loc_selected[Cols.tz]
    )

    df = calculate_comfort_indices_v2(df_for, settings[IDs.sport])

    return df


def get_info_location_selected(data):
    try:
        information = df_postcodes[
            df_postcodes["sub-state-post-no-space"] == data[IDs.postcode]
        ].to_dict(orient="list")
        loc_selected = {
            "lat": information["latitude"][0],
            "lon": information["longitude"][0],
            "tz": time_zones[information["state"][0]],
        }
    except TypeError:
        loc_selected = default_location
    return loc_selected


@dataclass
class Sport:
    sport_id: str
    clo: float
    met: float
    sport_cat: int
    wind_low: float
    wind_med: float
    wind_high: float
    duration: int
    sport: str


@dataclass
class VarCalcRisk:
    position = "standing"
    t_threshold_risk_moderate = 34
    max_threshold_t = 44
    min_t_calculations = 21
    min_threshold_t_moderate = 23
    min_threshold_t_high = 25
    min_threshold_t_extreme = 27
    t_range = np.arange(
        min_t_calculations,
        step=(interval := 0.25),
        stop=max_threshold_t + interval,
    )
    rh_range = np.arange(
        start=0,
        step=(interval := 0.5),
        stop=100 + interval,
    )
    wind_speed = 0.5
    var_threshold = "t_cr"
    cmap_list = ["#fcd200", "#fd7f00", "#dc0b00", "#9c001d"]
    risks_lines = ["moderate", "high", "extreme"]
    risks = ["low", "moderate", "high", "extreme"]

    duration = 45
    duration_walking = 200

    sports_profiles = {
        1: {  # include older adults
            "met": 4.7,
            "clo": 0.4,
            "v": wind_speed,
            "duration": duration_walking,
            "t_cr": 40,
            "water_loss": 825 / duration * duration_walking,
        },
        2: {
            "met": 6.4,
            "clo": 0.4,
            "v": wind_speed,
            "duration": duration,
            "t_cr": 40,
            "water_loss": 850,
        },
        3: {
            "met": 7.2,
            "clo": 0.5,
            "v": wind_speed,
            "duration": duration,
            "t_cr": 40,
            "water_loss": 850,
        },
        4: {  # higher water loss limit
            "met": 7.3,
            "clo": 0.5,
            "v": wind_speed,
            "duration": duration,
            "t_cr": 40,
            "water_loss": 850,
        },
        5: {  # higher water loss limit
            "met": 7.5,
            "clo": 0.5,
            "v": wind_speed,
            "duration": duration,
            "t_cr": 40,
            "water_loss": 950,
        },
    }


def get_regression_curves_v2(tg=3, wind_speed=0.8, sport_id="soccer"):
    sport_dict = sports_info.loc[sports_info["sport_id"] == sport_id].to_dict(
        orient="records"
    )
    sport = Sport(**sport_dict[0])

    if wind_speed < sport.wind_low:
        wind_speed = sport.wind_low
    elif wind_speed > sport.wind_high:
        wind_speed = sport.wind_high

    if tg < GlobeTemperatures.low.value:
        tg = GlobeTemperatures.low.value
    elif tg > GlobeTemperatures.high.value:
        tg = GlobeTemperatures.high.value

    inputs_model = {
        "met": sport.met,
        "clo": sport.clo,
        "v": wind_speed,
        "duration": sport.duration,
        "t_cr": VarCalcRisk.sports_profiles[sport.sport_cat]["t_cr"],
        "water_loss": VarCalcRisk.sports_profiles[sport.sport_cat]["water_loss"]
        / VarCalcRisk.sports_profiles[sport.sport_cat]["duration"]
        * sport.duration,
    }

    thresholds = []

    for t in VarCalcRisk.t_range:
        results = []

        tr = mean_radiant_tmp(
            tg=tg + t,
            tdb=t,
            v=inputs_model["v"],
            standard="iso",
        )

        def calculate_threshold_water_loss(x):
            return (
                phs(
                    tdb=t,
                    tr=tr,
                    v=inputs_model["v"],
                    rh=x,
                    met=inputs_model["met"],
                    clo=inputs_model["clo"],
                    posture=VarCalcRisk.position,
                    duration=inputs_model["duration"],
                    round=False,
                    limit_inputs=False,
                    acclimatized=100,
                    i_mst=0.4,
                )["water_loss"]
                - inputs_model["water_loss"]
            )

        try:
            results.append(
                scipy.optimize.brentq(calculate_threshold_water_loss, 0, 100)
            )
        except:
            results.append(np.nan)

        def calculate_threshold_core(x):
            return (
                phs(
                    tdb=t,
                    tr=tr,
                    v=inputs_model["v"],
                    rh=x,
                    met=inputs_model["met"],
                    clo=inputs_model["clo"],
                    posture=VarCalcRisk.position,
                    duration=inputs_model["duration"],
                    limit_inputs=False,
                    round=False,
                    acclimatized=100,
                    i_mst=0.4,
                )[VarCalcRisk.var_threshold]
                - inputs_model["t_cr"]
            )

        try:
            results.append(scipy.optimize.brentq(calculate_threshold_core, 0, 100))
        except:
            results.append(np.nan)

        results.append(t)
        thresholds.append(results)

    df_ = pd.DataFrame(
        thresholds,
        columns=["moderate", "extreme"]
        + [
            "t",
        ],
    )

    regression_curves_v2 = {}
    # create polynomial regression
    for ix, risk in enumerate(["moderate", "extreme"]):
        regression_curves_v2[risk] = {}
        if risk == "moderate":
            # df_.loc[~(df_[risk] < df_[VarCalcRisk.risks_lines[ix + 1]]), risk] = np.nan
            df_.loc[df_.index > df_[df_[risk] < 30].index.max(), risk] = np.nan

        df_int = df_[[risk, "t"]].dropna()
        spl = np.polyfit(df_int["t"], df_int[risk], 3)
        p = np.poly1d(spl)
        regression_curves_v2[risk]["poly"] = p

    # calculate high risk as the middle point between moderate and extreme
    t_rh_extreme = []
    t_rh_moderate = []
    for t in VarCalcRisk.t_range:
        pol_extreme = regression_curves_v2["extreme"]["poly"]
        rh_extreme = pol_extreme(t)
        if 0 <= rh_extreme <= 100:
            t_rh_extreme.append([t, rh_extreme])
        pol_moderate = regression_curves_v2["moderate"]["poly"]
        rh_moderate = pol_moderate(t)
        if 0 <= rh_moderate <= 100:
            t_rh_moderate.append([t, rh_moderate])

    # get the min temperature value in t_rh_moderate
    min_t_rh_moderate = min(t_rh_moderate, key=lambda x: x[0])
    # get the max rh value in t_rh_extreme
    max_t_rh_moderate = max(t_rh_extreme, key=lambda x: x[1])
    threshold_tmp = max(min_t_rh_moderate[0], max_t_rh_moderate[0])
    # exclude all values in min_t_rh_extreme that have a lower temperature than min_t_rh_moderate
    t_rh_extreme = [x for x in t_rh_extreme if x[0] > threshold_tmp]
    min_t_rh_extreme = min(t_rh_extreme, key=lambda x: x[0])
    regression_curves_v2["extreme"]["t_min"] = min_t_rh_extreme[0]
    regression_curves_v2["moderate"]["t_min"] = min_t_rh_moderate[0]

    # get the max temperature in t_rh_extreme
    max_t_rh_extreme = max(t_rh_extreme, key=lambda x: x[0])
    # exclude all values in t_rh_moderate that have a higher temperature than max_t_rh_extreme
    t_rh_moderate = [x for x in t_rh_moderate if x[0] < max_t_rh_extreme[0]]
    max_t_rh_moderate = max(t_rh_moderate, key=lambda x: x[0])
    regression_curves_v2["extreme"]["t_max"] = max_t_rh_extreme[0]
    regression_curves_v2["moderate"]["t_max"] = max_t_rh_moderate[0]

    rh_high_array = [(x[0][1] + x[1][1]) / 2 for x in zip(t_rh_moderate, t_rh_extreme)]
    t_high_array = [(x[0][0] + x[1][0]) / 2 for x in zip(t_rh_moderate, t_rh_extreme)]

    spl = np.polyfit(t_high_array, rh_high_array, 3)
    regression_curves_v2["high"] = {}
    regression_curves_v2["high"]["t_max"] = max_t_rh_extreme[0]
    regression_curves_v2["high"]["t_min"] = min_t_rh_moderate[0]
    regression_curves_v2["high"]["poly"] = np.poly1d(spl)

    return regression_curves_v2


def generate_reference_table_risk():
    # todo change this from a static value to a value from a class
    tdb_array = [round(x * 2) / 2 for x in np.arange(24, 44, 0.5)]
    rh_array = np.arange(0, 101, 1)
    tg_array = range(4, 13, 1)
    sports_array = sports_info.sport_id.unique()

    results = []
    for sport in sports_array:
        sport_dict = sports_info.loc[sports_info["sport_id"] == sport].to_dict(
            orient="records"
        )
        sport = Sport(**sport_dict[0])
        v_array = np.arange(max(sport.wind_low - 0.5, 0), sport.wind_high + 0.5, 0.1)
        v_array = set([round(round(x / 0.5) * 0.5, 2) for x in v_array])
        print(sport.sport_id, sport.wind_low, sport.wind_high, v_array)
        start_time = time.time()
        for v in v_array:
            for tg in tg_array:
                v2_lines = get_regression_curves_v2(
                    tg=tg, wind_speed=v, sport_id=sport.sport_id
                )
                for tdb in tdb_array:
                    for rh in rh_array:

                        rh_threshold_moderate = v2_lines["moderate"]["poly"](tdb)
                        if tdb > VarCalcRisk.t_threshold_risk_moderate:
                            rh_threshold_moderate = 0
                        rh_threshold_high = v2_lines["high"]["poly"](tdb)
                        rh_threshold_extreme = v2_lines["extreme"]["poly"](tdb)
                        if rh < rh_threshold_moderate:
                            risk = 0
                        elif rh < rh_threshold_high:
                            risk = 1
                        elif rh < rh_threshold_extreme:
                            risk = 2
                        elif rh > rh_threshold_extreme:
                            risk = 3

                        results.append(
                            {
                                "sport": sport.sport_id,
                                "tdb": tdb,
                                "rh": rh,
                                "risk": risk,
                                "rh_threshold_moderate": min(
                                    100, rh_threshold_moderate
                                ),
                                "rh_threshold_high": rh_threshold_high,
                                "rh_threshold_extreme": max(0, rh_threshold_extreme),
                                "tg": tg,
                                "wind_speed": v,
                            }
                        )

        duration_iteration = round(time.time() - start_time, 2)
        if duration_iteration < 1:
            print("ERROR: Duration iteration is less than 1 second")
        print(
            "Completed one iteration for sport:",
            sport.sport_id,
            "in",
            duration_iteration,
        )

    df = pd.DataFrame(results)

    df.set_index(["tdb", "rh", "tg", "wind_speed", "sport"], inplace=True)
    df.to_parquet("assets/risk_reference_table.parquet")

    return df


if __name__ == "__main__":

    generate_reference_table_risk()

    # plot lines for different sports
    tg_array = range(4, 13, 1)
    v_array = np.arange(0.1, 5, 1)
    # v_array = [0.1]
    # sports_array = ["cricket", "cycling", "running", "tennis"]
    # sports_array = sports_info.sport_id.unique()
    # sports_array = ["walking", "fishing", "archery"]
    sports_array = ["abseiling"]

    for sport in sports_array:
        for v in v_array:
            f, axs = plt.subplots(3, 3, constrained_layout=True)
            axs = axs.flatten()
            for ix, tg in enumerate(tg_array):
                v2_lines = get_regression_curves_v2(tg=tg, wind_speed=v, sport_id=sport)
                for risk in v2_lines:
                    array_t = np.arange(
                        v2_lines[risk]["t_min"], v2_lines[risk]["t_max"], 0.1
                    )
                    axs[ix].plot(array_t, v2_lines[risk]["poly"](array_t), label=risk)
                axs[ix].set(ylim=(0, 100), title=f"tg: {tg}", xlim=(26, 44))
            plt.legend()
            plt.suptitle(f"Sport: {sport}, Wind speed: {v}")
            plt.show()
