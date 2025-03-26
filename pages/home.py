import time
from copy import deepcopy
from urllib.parse import urlencode

import dash
import dash_mantine_components as dmc
from dash import dcc
from dash.exceptions import PreventUpdate
from dash_extensions.enrich import Output, Input, State, Serverside, callback
from firebase_admin import db

from components.current_risk import component_current_risk
from components.detailed_recommendations import component_detailed_recommendation
from components.dropdown_location import display_location_dropdown
from components.dropdown_sport import display_sport_dropdown
from components.forecasts import component_forecast
from components.main_recommendations import component_main_recommendation
from components.map import component_map
from components.sport_image import (
    component_sport_image,
)
from config import URLS, Dropdowns
from my_app.my_classes import IDs
from my_app.utils import (
    FirebaseFields,
    store_settings_dict,
    store_weather_risk_df,
    storage_user_id,
    get_weather_and_calculate_risk,
)

ref = db.reference(FirebaseFields.database_name)


dash.register_page(
    __name__,
    path=URLS.HOME.url,
    title=URLS.HOME.page_title,
    name=URLS.HOME.name,
    description=URLS.HOME.description,
)


def layout(id_sport=Dropdowns.SPORT.default, id_postcode=Dropdowns.LOCATION.default):
    return dmc.Stack(
        children=[
            dcc.Location(id="url", refresh=False),
            display_sport_dropdown(sport=id_sport),
            component_sport_image(),
            display_location_dropdown(location=id_postcode),
            component_map(),
            component_current_risk(),
            component_main_recommendation(),
            component_detailed_recommendation(),
            component_forecast(),
        ],
        spacing="xs",
    )


@callback(
    Output(store_settings_dict, "data"),
    Output("url", "search"),
    State(store_settings_dict, "data"),
    State(storage_user_id, "data"),
    Input(IDs.postcode, "value"),
    Input(IDs.sport, "value"),
    prevent_initial_call=True,
)
def save_settings_in_storage(data, user_id, location, sport):
    """Saves in local storage the settings selected by the participant."""
    data = data or {}
    data[IDs.postcode] = location
    data[IDs.sport] = sport

    firebase_data = deepcopy(data)
    if any(data.values()):
        firebase_data[FirebaseFields.user_id] = user_id
        firebase_data[FirebaseFields.timestamp] = time.time()
        ref.push().set(firebase_data)

    url_data = {k: v for k, v in data.items()}
    # return the new values and the url
    url_search = f"?{urlencode(url_data)}"
    return data, url_search


@callback(
    Output(store_weather_risk_df, "data"),
    Input(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def on_settings_change(settings):
    if not settings:
        raise PreventUpdate
    df = get_weather_and_calculate_risk(settings)
    return Serverside(df)
