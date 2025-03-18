from copy import deepcopy

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
import dash_bootstrap_components as dbc


def generate_dropdown_inline(content, text="Select a sport:"):
    return [
        dbc.Row(
            [
                dbc.Col(
                    html.Label(
                        text,
                        className="py-2",
                    ),
                    width="auto",
                ),
                dbc.Col(
                    dcc.Dropdown(
                        content["options"],
                        content["default"],
                        multi=content["multi"],
                        id=content["id"],
                        clearable=False,
                        className="pb-2",
                    )
                ),
            ],
            className="pb-2",
        )
    ]


def component_sport_dropdowns():
    return html.Div(
        generate_dropdown_inline(questions[0], text="Select a sport:"),
        id="sport_dropdown",
    )


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
        return generate_dropdown_inline(__questions[0], text="Select a sport:")
    else:
        raise PreventUpdate
