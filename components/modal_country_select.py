import dash_mantine_components as dmc
from dash import html, Output, Input, State, callback
from dash_iconify import DashIconify

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
                    id="modal-demo-button",
                    variant="subtle",
                    px="xs",
                ),
            ),
            dmc.Modal(
                title="Select a country",
                id="modal-select-country",
                children=[
                    dmc.Select(
                        id="modal-select-country-input",
                        data=[
                            {"value": "AU", "label": "Australia"},
                            {"value": "US", "label": "United States"},
                            {"value": "CA", "label": "Canada"},
                            {"value": "GB", "label": "United Kingdom"},
                            {"value": "FR", "label": "France"},
                            {"value": "DE", "label": "Germany"},
                            {"value": "IT", "label": "Italy"},
                            {"value": "ES", "label": "Spain"},
                            {"value": "JP", "label": "Japan"},
                        ],
                        placeholder="Select a country",
                        mb=10,
                    ),
                    dmc.Button("Submit", id="modal-submit-button"),
                ],
            ),
        ]
    )


@callback(
    Output("modal-select-country", "opened"),
    Input("modal-demo-button", "n_clicks"),
    Input("modal-submit-button", "n_clicks"),
    State("modal-select-country", "opened"),
    prevent_initial_call=True,
)
def modal_demo(_, __, opened):
    print("opened", opened)
    # todo clear the "id_postcode" value from the store after the modal is closed
    return not opened


@callback(
    Output(store_country, "data"),
    Output("modal-demo-button", "children"),
    Input("modal-select-country-input", "value"),
    prevent_initial_call=True,
)
def modal_demo(country):
    print("country", country)
    return country, component_country_flag(country)
