import time
from copy import deepcopy

import dash
import dash_mantine_components as dmc
from dash_extensions.enrich import (
    Output,
    Input,
    State,
    Serverside,
    callback,
)
from firebase_admin import db

from components.current_risk import component_current_risk
from components.detailed_recommendations import component_detailed_recommendation
from components.dropdown_location import component_location_dropdowns
from components.dropdown_sport import component_sport_dropdowns
from components.forecasts import component_forecast
from components.main_recommendations import component_main_recommendation
from components.map import component_map
from components.sport_image import component_sport_image
from my_app.utils import (
    FirebaseFields,
    local_storage_settings_name,
    session_storage_weather_name,
    storage_user_id,
    get_weather_and_calculate_risk,
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
        component_sport_dropdowns(),
        component_sport_image(),
        component_location_dropdowns(),
        component_map(),
        component_current_risk(),
        component_main_recommendation(),
        component_detailed_recommendation(),
        component_forecast(),
    ],
)


@callback(
    Output(local_storage_settings_name, "data"),
    State(local_storage_settings_name, "data"),
    State(storage_user_id, "data"),
    Input("id-postcode", "value"),
    Input("id-sport", "value"),
    prevent_initial_call=True,
)
def save_settings_in_storage(data, user_id, location, sport):
    """Saves in local storage the settings selected by the participant."""
    data = data or {}
    data["id-postcode"] = location
    data["id-sport"] = sport

    firebase_data = deepcopy(data)
    if any(data.values()):
        firebase_data[FirebaseFields.user_id] = user_id
        firebase_data[FirebaseFields.timestamp] = time.time()
        print(firebase_data)
        ref.push().set(firebase_data)

    return data


@callback(
    Output(session_storage_weather_name, "data"),
    Input(local_storage_settings_name, "data"),
    prevent_initial_call=True,
)
def on_settings_change(settings):
    print(f"{settings}")
    df = get_weather_and_calculate_risk(settings)
    return Serverside(df)
