from copy import deepcopy

import dash_bootstrap_components as dbc
from dash import html, dcc, Output, Input, State, callback
from dash.exceptions import PreventUpdate

from config import (
    default_settings,
    questions,
)
from my_app.utils import (
    local_storage_settings_name,
)


def generate_dropdown(questions_to_display):
    return [
        dbc.Row(
            [
                dbc.Col(
                    html.Label(
                        item["question"],
                        className="py-2",
                    ),
                    width="auto",
                ),
                dbc.Col(
                    dcc.Dropdown(
                        item["options"],
                        item["default"],
                        multi=item["multi"],
                        id=item["id"],
                    ),
                ),
            ],
            className="pb-2",
        )
        for item in questions_to_display
    ]


def component_location_sport_dropdowns():
    return html.Div(generate_dropdown(questions), id="settings-dropdowns")


@callback(
    Output("settings-dropdowns", "children"),
    Input("url", "pathname"),
    State(local_storage_settings_name, "data"),
)
def display_the_dropdown_after_page_change(pathname, data):
    data = data or default_settings
    if pathname == "/":
        __questions = deepcopy(questions)
        for ix, q in enumerate(__questions):
            __questions[ix]["default"] = data[q["id"]]
        return generate_dropdown(__questions)
    else:
        raise PreventUpdate
