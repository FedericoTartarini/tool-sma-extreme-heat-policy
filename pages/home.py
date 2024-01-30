import time
from copy import deepcopy
from datetime import datetime
from io import StringIO

import dash
import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
import pandas as pd
import pytz
from dash import html, dcc, Output, Input, State, callback
from firebase_admin import db

from components.current_risk import component_current_risk
from components.detailed_recommendations import component_detailed_recommendation
from components.dropdowns import component_location_sport_dropdowns
from components.forecasts import component_forecast
from components.main_recommendations import component_main_recommendation
from components.map import component_map
from components.sport_image import component_sport_image
from config import (
    default_settings,
    questions,
    time_zones,
    default_location,
    df_postcodes,
)
from my_app.utils import (
    legend_risk,
    FirebaseFields,
    local_storage_settings_name,
    session_storage_weather_name,
    session_storage_weather_forecast,
    storage_user_id,
    get_weather,
    calculate_comfort_indices_v1,
    sports_category,
    ColumnsDataframe,
)

ref = db.reference(FirebaseFields.database_name)


dash.register_page(
    __name__,
    path="/",
    title="SMA Extreme Heat Policy",
    name="Home Page",
    description="This is the home page of the SMA Extreme Policy Tool",
)


layout = dmc.LoadingOverlay(
    loaderProps={"variant": "dots", "color": "#555", "size": 100},
    exitTransitionDuration=500,
    children=[
        dcc.Store(
            id=local_storage_settings_name, storage_type="local", data=default_settings
        ),
        dcc.Store(id=session_storage_weather_name, storage_type="session"),
        dcc.Store(id=session_storage_weather_forecast, storage_type="session"),
        component_location_sport_dropdowns(),
        component_map(),
        html.Div(
            id="body-home",
        ),
    ],
)


@callback(
    Output("body-home", "children"),
    Input(local_storage_settings_name, "data"),
)
def body(data):
    sport_selected = data["id-sport"]
    if not sport_selected:
        return [
            dbc.Alert(
                "Please select a sport",
                id="sport-selection",
                color="danger",
                className="mt-2",
            ),
        ]
    else:
        return [
            component_sport_image(),
            component_current_risk(),
            legend_risk(),
            component_main_recommendation(),
            component_detailed_recommendation(),
            component_forecast(),
        ]


@callback(
    Output(local_storage_settings_name, "data"),
    State(local_storage_settings_name, "data"),
    State(storage_user_id, "data"),
    [Input(question["id"], "value") for question in questions],
    prevent_initial_call=True,
)
def save_settings_in_storage(data, user_id, *args):
    """Saves in local storage the settings selected by the participant."""
    data = data or {}
    for ix, question_id in enumerate([question["id"] for question in questions]):
        data[question_id] = args[ix]

    firebase_data = deepcopy(data)
    if any(data.values()):
        firebase_data[FirebaseFields.user_id] = user_id
        firebase_data[FirebaseFields.timestamp] = time.time()
        print(firebase_data)
        ref.push().set(firebase_data)

    return data


@callback(
    # todo implement server side output
    Output(session_storage_weather_name, "data"),
    Output(session_storage_weather_forecast, "data"),
    Input(local_storage_settings_name, "data"),
    State(session_storage_weather_forecast, "data"),
    prevent_initial_call=True,
)
def on_location_change(data_sport, df_for_store):
    try:
        information = df_postcodes[
            df_postcodes["sub-state-post"] == data_sport["id-postcode"]
        ].to_dict(orient="list")
        loc_selected = {
            "lat": information["latitude"][0],
            "lon": information["longitude"][0],
            "tz": time_zones[information["state"][0]],
        }
    except TypeError:
        loc_selected = default_location

    print(f"querying data {pd.Timestamp.now()}")

    query_yr = True
    if df_for_store:
        df_for = pd.read_json(StringIO(df_for_store), orient="split")
        lat = df_for[ColumnsDataframe.lat].unique()[0]
        lon = df_for[ColumnsDataframe.lon].unique()[0]
        tz = df_for[ColumnsDataframe.tz].unique()[0]
        df_for.index = pd.to_datetime(df_for.index).tz_convert(tz)
        last_query_time = df_for.index.min()
        delta = datetime.now(pytz.timezone(tz)) - last_query_time
        if (
            lat == loc_selected["lat"]
            and lon == loc_selected["lon"]
            and tz == loc_selected["tz"]
            and delta.seconds < 3600
        ):
            query_yr = False

    if query_yr:
        print(f"{datetime.now()} - querying weather data")
        df_for = get_weather(
            lat=loc_selected["lat"], lon=loc_selected["lon"], tz=loc_selected["tz"]
        )
    else:
        print(f"{datetime.now()} - using stored data")

    print(f"calculating comfort indices {pd.Timestamp.now()}")
    df = calculate_comfort_indices_v1(df_for, sports_category[data_sport["id-sport"]])
    print(f"finished {pd.Timestamp.now()}")

    return df.to_json(date_format="iso", orient="table"), df_for.to_json(
        date_format="iso", orient="split"
    )
