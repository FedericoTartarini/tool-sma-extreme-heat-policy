import time
from copy import deepcopy
from urllib.parse import urlencode

import dash
import dash_mantine_components as dmc
from dash import dcc, html
from dash.exceptions import PreventUpdate

# from dash.exceptions import PreventUpdate
from dash import Output, Input, State, callback
from firebase_admin import db
from icecream import ic

from components.current_risk import component_current_risk
from components.detailed_recommendations import component_detailed_recommendation
from components.dropdown_location import display_location_dropdown
from components.dropdown_sport import display_sport_dropdown
from components.forecasts import component_forecast
from components.install_button import component_button_install
from components.main_recommendations import component_main_recommendation
from components.map import component_map
from components.sport_image import (
    component_sport_image,
)
from config import URLS, PostcodesDefault
from my_app.my_classes import IDs, UserSettings, Defaults
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


def layout(
    sport=Defaults.sport,
    location=Defaults.location,
):
    return dmc.Stack(
        children=[
            dcc.Location(id="url", refresh=False),
            display_sport_dropdown(sport=sport),
            component_sport_image(),
            html.Div(
                display_location_dropdown(location=location),
                id=IDs.dropdown_location,
            ),
            component_map(),
            component_current_risk(),
            component_main_recommendation(),
            component_detailed_recommendation(),
            component_forecast(),
            component_button_install(),
        ],
        gap="xs",
    )


@callback(
    Output(store_settings_dict, "data"),
    Output("url", "search"),
    Output(IDs.dropdown_location, "children"),
    State(store_settings_dict, "data"),
    State(storage_user_id, "data"),
    Input(IDs.dropdown_location_value, "value"),
    Input(IDs.dropdown_sport, "value"),
    Input(IDs.modal_country_select, "value"),
    prevent_initial_call=True,
)
def save_settings_in_storage_and_update_url(
    store_settings: dict, user_id: str, location: str, sport: str, modal_country: str
) -> tuple[dict, str, any]:
    # ic(store_settings, location, sport)
    """Saves settings using a Pydantic model and updates the URL."""
    ic(dash.ctx.triggered_id)
    settings = UserSettings(**store_settings)
    settings.location = location
    settings.sport = sport

    if dash.ctx.triggered_id == IDs.modal_country_select:
        print("Country changed to:", modal_country)
        # if the country is changed, we need to reset the location to the default for that country
        postcodes_default = PostcodesDefault()
        settings.location = postcodes_default[modal_country]

    firebase_data = deepcopy(store_settings)
    if any(store_settings.values()):
        firebase_data[FirebaseFields.user_id] = user_id
        firebase_data[FirebaseFields.timestamp] = time.time()
        ref.push().set(firebase_data)

    url_data = settings.dict()
    # return the new values and the url
    url_search = f"?{urlencode(url_data)}"
    # ic(settings)
    # ic(url_search)
    if dash.ctx.triggered_id == IDs.modal_country_select:
        # if the country is changed, we need to update the location dropdown
        print("updating location dropdown due to country change")
        return (
            settings.__dict__,
            url_search,
            display_location_dropdown(location=settings.location),
        )
    # if the country is not changed, we just return the settings and the url
    return settings.__dict__, url_search, dash.no_update


@callback(
    Output(store_weather_risk_df, "data"),
    Input(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def on_settings_change(store_settings: dict | None):
    settings = UserSettings(**store_settings)
    if not settings:
        raise PreventUpdate
    df = get_weather_and_calculate_risk(settings)
    df.index = df.index.tz_localize(None)
    df = df[["tdb", "rh", "risk_value", "risk_value_interpolated", "risk"]]
    return df.to_json(date_format="iso", orient="split")
