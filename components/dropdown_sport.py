from copy import deepcopy

import dash_bootstrap_components as dbc
from dash.exceptions import PreventUpdate
from dash_extensions.enrich import (
    Output,
    Input,
    State,
    html,
    callback,
    dcc,
)

from config import (
    default_settings,
    questions,
)
from my_app.utils import (
    local_storage_settings_name,
)


def sport_dropdown(questions_to_display):
    return [
        dcc.Dropdown(
            questions_to_display["options"],
            questions_to_display["default"],
            multi=questions_to_display["multi"],
            id=questions_to_display["id"],
            clearable=False,
            className="pb-2",
        )
    ]


def component_sport_dropdowns():
    return html.Div(sport_dropdown(questions[0]), id="sport_dropdown")


@callback(
    Output("sport_dropdown", "children"),
    Input("url", "pathname"),
    State(local_storage_settings_name, "data"),
    prevent_initial_call=True,
)
def display_the_dropdown_after_page_change(pathname, data):
    data = data or default_settings
    if pathname == "/":
        __questions = deepcopy(questions)
        for ix, q in enumerate(__questions):
            __questions[ix]["default"] = data[q["id"]]
        return sport_dropdown(__questions[0])
    else:
        raise PreventUpdate
