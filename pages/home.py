import time
from copy import deepcopy

import dash
import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
import pandas as pd
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
    storage_user_id,
    get_yr_weather,
    calculate_comfort_indices_v1,
    sports_category,
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
    Input(local_storage_settings_name, "data"),
    prevent_initial_call=True,
)
def on_location_change(data_sport):
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
    df = get_yr_weather(
        lat=loc_selected["lat"], lon=loc_selected["lon"], tz=loc_selected["tz"]
    )
    print(f"calculating comfort indices {pd.Timestamp.now()}")
    df = calculate_comfort_indices_v1(df, sports_category[data_sport["id-sport"]])
    print(f"finished {pd.Timestamp.now()}")

    return df.to_json(date_format="iso", orient="table")
