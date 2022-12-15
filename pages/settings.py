import dash_mantine_components as dmc
import pandas as pd
from dash import html, dcc, Input, Output, callback, State, ctx
import dash
import dash_bootstrap_components as dbc
from dash.exceptions import PreventUpdate
from copy import deepcopy
from utils import sports_category

dash.register_page(
    __name__,
    title="Settings Page",
    name="Settings Page",
    description="This is the settings page of the SMA Extreme Policy Tool",
)

df_postcodes = pd.read_csv("./assets/postcodes.csv")
df_postcodes["sub-state-post"] = (
    df_postcodes["suburb"]
    + ", "
    + df_postcodes["state"]
    + ", "
    + df_postcodes["postcode"].astype("str")
)


# from https://www.health.vic.gov.au/environmental-health/extreme-heat-information-for-clinicians
questions = [
    {
        "id": "id-class",
        "question": "Please select a sport:",
        "options": list(sports_category.keys()),
        "multi": False,
        "default": [],
    },
    {
        "id": "id-postcode",
        "question": "Select current suburb (optional):",
        "options": list(df_postcodes["sub-state-post"].unique()),
        "multi": False,
        "default": [],
    },
]


def generate_dropdown(questions_to_display):
    return [
        dbc.Row(
            [
                html.Label(
                    item["question"],
                    className="py-2",
                ),
                dcc.Dropdown(
                    item["options"], item["default"], multi=item["multi"], id=item["id"]
                ),
            ],
            className="pb-2",
        )
        for item in questions_to_display
    ]


def layout():
    return dbc.Container(
        [
            dmc.LoadingOverlay(
                [
                    html.Div(
                        generate_dropdown(questions),
                        id="settings-dropdowns",
                    ),
                    html.Div(id="postcode-info"),
                ],
                loaderProps={"variant": "dots", "color": "orange", "size": "xl"},
            ),
            html.Div(
                [
                    dbc.Button("Calculate Heat Stress Risk", color="primary", href="/"),
                ],
                className="d-grid gap-2 col-12 col-md-4 mx-auto my-2",
            ),
        ],
        className="p-2",
        style={"min-height": "80vh"},
    )


@callback(
    Output("local-storage-settings", "data"),
    State("local-storage-settings", "data"),
    [Input(question["id"], "value") for question in questions],
)
def update_settings_storage_based_dropdown(data, *args):
    """Saves in local storage the settings selected by the participant"""
    data = data or {}
    for ix, question_id in enumerate([question["id"] for question in questions]):
        data[question_id] = args[ix]

    return data


@callback(
    Output("settings-dropdowns", "children"),
    Input("url", "pathname"),
    State("local-storage-settings", "data"),
)
def display_page(pathname, data):
    if data and pathname == "/settings":
        __questions = deepcopy(questions)
        for ix, q in enumerate(__questions):
            __questions[ix]["default"] = data[q["id"]]
        return generate_dropdown(__questions)
    else:
        raise PreventUpdate


@callback(
    Output("postcode-info", "children"),
    Output("local-storage-location-selected", "data"),
    Input("id-postcode", "value"),
)
def display_page(value):
    if value:
        information = df_postcodes[df_postcodes["sub-state-post"] == value].to_dict(
            orient="list"
        )
        print(information)
        return html.Div(
            f"Postcode: {information['postcode'][0]}; Suburb:"
            f" {information['suburb'][0]}; State:"
            f" {information['state'][0]}"
        ), {"lat": information["latitude"][0], "lon": information["longitude"][0]}
    else:
        raise PreventUpdate
