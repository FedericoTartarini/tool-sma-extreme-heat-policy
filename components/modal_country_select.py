import dash_mantine_components as dmc
from dash import html, Output, Input, State, callback
from dash_iconify import DashIconify

from my_app.my_classes import IDs
from my_app.utils import store_country


icons = {
    "AU": "emojione:flag-for-australia",
    "US": "emojione:flag-for-united-states",
    "CA": "emojione:flag-for-canada",
    "GB": "emojione:flag-for-united-kingdom",
    "FR": "emojione:flag-for-france",
    "DE": "emojione:flag-for-germany",
    "IT": "emojione:flag-for-italy",
    "ES": "emojione:flag-for-spain",
    "JP": "emojione:flag-for-japan",
    "NZ": "emojione:flag-for-new-zealand",
    "BR": "emojione:flag-for-brazil",
    "IN": "emojione:flag-for-india",
    "CN": "emojione:flag-for-china",
    "RU": "emojione:flag-for-russia",
}


def component_country_flag(country):
    return DashIconify(
        icon=icons[country],
        width=25,
    )


def modal_country_select():
    return html.Div(
        [
            dmc.Center(
                dmc.Button(
                    component_country_flag("AU"),
                    id=IDs.button_country,
                    variant="subtle",
                    px="xs",
                ),
            ),
            dmc.Modal(
                title="Select a country",
                id=IDs.modal_country,
                children=[
                    dmc.Select(
                        id=IDs.modal_country_select,
                        data=[
                            {"value": "AU", "label": "Australia"},
                            {"value": "US", "label": "United States"},
                            # {"value": "CA", "label": "Canada"},
                            # {"value": "GB", "label": "United Kingdom"},
                            # {"value": "FR", "label": "France"},
                            # {"value": "DE", "label": "Germany"},
                            # {"value": "IT", "label": "Italy"},
                            # {"value": "ES", "label": "Spain"},
                            # {"value": "JP", "label": "Japan"},
                        ],
                        placeholder="Select a country",
                        mb=10,
                    ),
                    dmc.Button("Submit", id=IDs.modal_country_button_submit),
                ],
            ),
        ]
    )


@callback(
    Output(IDs.modal_country, "opened"),
    Input(IDs.button_country, "n_clicks"),
    Input(IDs.modal_country_button_submit, "n_clicks"),
    State(IDs.modal_country, "opened"),
    prevent_initial_call=True,
)
def modal_toggle_open_close(_, __, opened):
    # todo clear the "id_postcode" value from the store after the modal is closed
    return not opened


@callback(
    Output(store_country, "data"),
    Output(IDs.button_country, "children"),
    Input(IDs.modal_country_select, "value"),
    prevent_initial_call=True,
)
def store_country_update_flag(country):
    return country, component_country_flag(country)
