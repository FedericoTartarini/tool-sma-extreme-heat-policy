import dash_mantine_components as dmc
from dash import html, Output, Input, State, callback
from dash_iconify import DashIconify

from my_app.my_classes import IDs, Defaults
from my_app.utils import store_country
import pycountry

from pathlib import Path

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


def component_country_flag(country):
    return DashIconify(
        icon=icons[country],
        width=25,
    )


def modal_country_select(country=Defaults.country.value):
    return html.Div(
        [
            dmc.Center(
                id="country-button-center",
            ),
            dmc.Modal(
                title="Select a country",
                id=IDs.modal_country,
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
def modal_toggle_open_close(_, opened):
    return not opened


@callback(
    Output(store_country, "data"),
    Output(IDs.button_country, "children"),
    Output(IDs.modal_country, "opened"),
    Input(IDs.modal_country_select, "value"),
    prevent_initial_call=True,
)
def store_country_update_flag(country):
    """Updates the country in local storage, changes the flag, and closes the modal."""
    return country, component_country_flag(country), False


@callback(
    Output("country-button-center", "children"),
    Input("url", "pathname"),
    State(store_country, "data"),
)
def create_country_button(_, country):
    """Creates the country button with the flag icon."""
    print("the code is", country)
    return dmc.Button(
        component_country_flag(country),
        id=IDs.button_country,
        variant="subtle",
        px="xs",
    )
