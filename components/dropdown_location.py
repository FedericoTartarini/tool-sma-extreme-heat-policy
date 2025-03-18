from copy import deepcopy

from dash.exceptions import PreventUpdate
from dash_extensions.enrich import (
    Output,
    Input,
    State,
    html,
    callback,
)

from components.dropdown_sport import generate_dropdown_inline
from config import (
    default_settings,
    questions,
)
from my_app.utils import (
    local_storage_settings_name,
)


def component_location_dropdowns():
    return html.Div(
        generate_dropdown_inline(questions[1], text="Select a location:"),
        id="location_dropdown",
    )


@callback(
    Output("location_dropdown", "children"),
    Input("url", "pathname"),
    State(local_storage_settings_name, "data"),
    prevent_initial_call=True,
)
# todo improve the code, poorly written and duplicated in dropdown_sport.py
def display_the_dropdown_after_page_change(pathname, data):
    data = data or default_settings
    if pathname == "/":
        __questions = deepcopy(questions)
        for ix, q in enumerate(__questions):
            __questions[ix]["default"] = data[q["id"]]
        return generate_dropdown_inline(__questions[1], text="Select a location:")
    else:
        raise PreventUpdate
