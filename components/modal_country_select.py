from pathlib import Path

import dash_mantine_components as dmc
import dash_bootstrap_components as dbc
import pycountry
from dash import html, Output, Input, State, callback
from dash.exceptions import PreventUpdate
from dash_iconify import DashIconify

from my_app.my_classes import IDs, Defaults, UserSettings
from my_app.utils import store_settings_dict

# only keep codes with an existing pickle
iso_codes = [
    country.alpha_2 for country in pycountry.countries if hasattr(country, "alpha_2")
]
available_iso_codes = [
    code for code in iso_codes if Path(f"assets/postcodes/{code}.pkl.gz").exists()
]

icons = {
    country.alpha_2: f"emojione:flag-for-{country.name.lower().replace(' ', '-').replace('\'', '')}"
    for country in pycountry.countries
}


def component_country_flag(country: str) -> DashIconify:
    return DashIconify(
        icon=icons[country],
        width=25,
    )


def modal_country_select(country=Defaults.country.value):
    return dbc.NavItem(
        [
            dmc.Center(
                html.Div(id=IDs.button_country),
                id="country-button-center",
            ),
            dmc.Modal(
                title="Select a country",
                id=IDs.modal_country,
                opened=False,
                children=[
                    dmc.Select(
                        id=IDs.modal_country_select,
                        data=[
                            {"value": country.alpha_2, "label": country.name}
                            for country in sorted(
                                pycountry.countries, key=lambda c: c.name
                            )
                            if country.alpha_2 in available_iso_codes
                        ],
                        placeholder="Select a country",
                        value=country,
                        searchable=True,
                        mb=10,
                    ),
                ],
            ),
        ]
    )


@callback(
    Output(IDs.modal_country, "opened", allow_duplicate=True),
    Input(IDs.button_country, "n_clicks"),
    State(IDs.modal_country, "opened"),
    prevent_initial_call=True,
)
def modal_toggle_open_close(n_clicks: int | None, opened: bool) -> bool:
    """Toggles the modal open/close state when the button is clicked."""
    if n_clicks is None:
        raise PreventUpdate
    return not opened


@callback(
    Output(IDs.button_country, "children"),
    Output(IDs.modal_country, "opened"),
    Input(IDs.modal_country_select, "value"),
    prevent_initial_call=True,
)
def store_country_update_flag(country: str) -> tuple[DashIconify, bool]:
    """Updates the country in local storage, changes the flag, and closes the modal."""
    return component_country_flag(country), False


@callback(
    Output("country-button-center", "children"),
    Input(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def create_country_button(store_settings: dict) -> dmc.Button:
    """Creates the country button with the flag icon."""
    settings = UserSettings(**store_settings)
    country = settings.location.split("_")[-1]
    return country_button_modal(country)


def country_button_modal(country=Defaults.country.value):
    """Returns the button that opens the modal to select a country."""
    return dmc.Button(
        component_country_flag(country),
        id=IDs.button_country,
        variant="subtle",
        px="0",
        style={"marginLeft": "auto"},
    )
