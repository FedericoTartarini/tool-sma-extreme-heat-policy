import os

from dash import html, dcc, Output, Input, State, callback
import dash_bootstrap_components as dbc
import dash_leaflet as dl
from dash.exceptions import PreventUpdate
from my_app.charts import hss_palette, indicator_chart, line_chart
import dash
from copy import deepcopy
import pandas as pd
from my_app.utils import (
    sma_risk_messages,
    sports_category,
    legend_risk,
    get_yr_weather,
    calculate_comfort_indices,
    time_zones,
    default_location,
    default_settings,
    get_data_specific_day,
)
import dash_mantine_components as dmc


dash.register_page(
    __name__,
    path="/",
    title="SMA Extreme Heat Policy",
    name="Home Page",
    description="This is the home page of the SMA Extreme Policy Tool",
)

df_postcodes = pd.read_csv("./assets/postcodes.csv")
df_postcodes["sub-state-post"] = (
    df_postcodes["suburb"]
    + ", "
    + df_postcodes["state"]
    + ", "
    + df_postcodes["postcode"].astype("str")
)

questions = [
    {
        "id": "id-class",
        "question": "Sport:",
        "options": list(sports_category.keys()),
        "multi": False,
        "default": "Soccer",
    },
    {
        "id": "id-postcode",
        "question": "Location:",
        "options": list(df_postcodes["sub-state-post"].unique()),
        "multi": False,
        "default": default_settings["id-postcode"],
    },
]


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


layout = dbc.Container(
    children=[
        html.Div(
            generate_dropdown(questions),
            id="settings-dropdowns",
        ),
        html.Div(
            html.Div(style={"height": "25vh"}),
            id="map-component",
        ),
        html.Div(html.Div(style={"height": "75vh"}), id="body-home"),
    ],
    className="p-2",
)


@callback(
    Output("body-home", "children"),
    Input("local-storage-settings", "data"),
)
def body(data):
    sport_selected = data["id-class"]
    if not sport_selected:
        return [
            dbc.Alert(
                "Please select a sport",
                id="sport-selection",
                color="danger",
                className="mt-2",
            ),
        ]
    else:
        return [
            dbc.Row(
                html.Div(
                    id="id-icon-sport",
                    className="p-2",
                ),
                justify="center",
            ),
            dbc.Alert(
                [
                    html.Div(
                        id="id-icon-sport",
                        className="p-2",
                    ),
                    html.Hr(),
                    html.H6(
                        "Current estimated Heat Stress Risk is:",
                    ),
                    html.H1(
                        className="alert-heading",
                        id="value-hss-current",
                    ),
                ],
                style={"text-align": "center"},
                id="id-alert-risk-current-value",
                color="light",
            ),
            html.H3(
                "Heat Stress Scale:",
            ),
            html.Div(id="fig-indicator"),
            legend_risk(),
            dbc.Alert(
                [
                    html.H3(
                        "Key recommendations:",
                    ),
                    html.Hr(),
                    html.Div(id="div-icons-suggestions"),
                ],
                className="mt-1",
                color="secondary",
                id="id-alert-risk-current-recommendations",
            ),
            dbc.Accordion(
                dbc.AccordionItem(
                    [
                        html.P(
                            id="value-risk-description",
                        ),
                        html.P(
                            "You should:",
                        ),
                        dcc.Markdown(
                            id="value-risk-suggestions",
                            className="mb-0",
                        ),
                    ],
                    title="Detailed suggestions: ",
                ),
                start_collapsed=True,
                className="my-2",
                id="id-accordion-risk-current",
            ),
            html.H2("Forecasted risk for today"),
            legend_risk(),
            html.Div(id="fig-forecast_line"),
            html.Div(id="fig-forecast-next-days"),
        ]


def icon_component(src, message, size="50px"):
    return dbc.Row(
        [
            dbc.Col(
                html.Img(
                    src=src,
                    width=size,
                    style={"filter": "drop-shadow(2px 5px 2px rgb(0 0 0 / 0.4))"},
                ),
                style={"text-align": "right"},
                width="auto",
            ),
            dbc.Col(
                html.H3(message),
                width="auto",
                style={"text-align": "left"},
            ),
        ],
        align="center",
        justify="center",
        className="my-1",
    )


@callback(
    Output("id-icon-sport", "children"),
    Input("local-storage-settings", "data"),
)
def update_location_and_forecast(data_sport):
    try:
        file_name = f"{data_sport['id-class']}.png"
    except KeyError:
        raise PreventUpdate
    path = os.path.join(os.getcwd(), "assets", "icons", file_name)
    message = f"Activity: {data_sport['id-class']}"
    # source https://www.theolympicdesign.com/olympic-design/pictograms/tokyo-2020/
    if os.path.isfile(path):
        return icon_component(f"../assets/icons/{data_sport['id-class']}.png", message)
    else:
        return icon_component("../assets/icons/sports.png", message)


@callback(
    Output("fig-indicator", "children"),
    Input("session-storage-weather", "data"),
    State("local-storage-settings", "data"),
)
def update_fig_hss_trend(data, data_sport):
    try:
        df = pd.read_json(data, orient="table")
        return dcc.Graph(
            figure=indicator_chart(df),
            config={"staticPlot": True},
        )
    except ValueError:
        raise PreventUpdate


@callback(
    Output("fig-forecast_line", "children"),
    Input("session-storage-weather", "data"),
)
def update_fig_hss_trend(data):
    try:
        df = pd.read_json(data, orient="table")
        df = get_data_specific_day(df, date_offset=0)
        return dcc.Graph(
            figure=line_chart(df, "risk_value_interpolated"),
            config={"staticPlot": True},
        )
    except ValueError:
        raise PreventUpdate


@callback(
    Output("fig-forecast-next-days", "children"),
    Input("session-storage-weather", "data"),
)
def update_fig_hss_trend(data):
    try:
        df = pd.read_json(data, orient="table")
        accordions = []
        for day in [1, 2, 3]:
            df_day = get_data_specific_day(df, date_offset=day)
            day_name = df_day.index.day_name().unique()[0]
            color = hss_palette[df_day["risk_value"].max()]
            risk_value = df_day.loc[
                df_day.risk_value == df_day.risk_value.max(), "risk"
            ].unique()[0]

            accordions.append(
                dmc.AccordionItem(
                    children=[
                        dmc.AccordionControl(
                            dbc.Row(
                                [
                                    dbc.Col(
                                        html.H4(day_name, className="p-0 m-0"),
                                        align="center",
                                    ),
                                    dbc.Col(
                                        html.P("Max risk:", className="p-0 m-0"),
                                        width="auto",
                                    ),
                                    dbc.Col(
                                        dbc.Badge(
                                            risk_value,
                                            className="ms-1 p-1 m-0",
                                            color=color,
                                        ),
                                        width="auto",
                                    ),
                                ],
                                align="center",
                            )
                        ),
                        dmc.AccordionPanel(
                            dcc.Graph(
                                figure=line_chart(df_day, "risk_value_interpolated"),
                                config={"staticPlot": True},
                            ),
                        ),
                    ],
                    value=day_name,
                )
            ),
        return dmc.Accordion(accordions)
    except ValueError:
        raise PreventUpdate


def test():
    return html.H1(["Example heading", dbc.Badge("New", className="ms-1")])


@callback(
    Output("value-hss-current", "children"),
    Output("id-alert-risk-current-value", "color"),
    Output("value-risk-description", "children"),
    Output("value-risk-suggestions", "children"),
    Output("div-icons-suggestions", "children"),
    Input("session-storage-weather", "data"),
)
def update_alert_hss_current(data):
    try:
        df = pd.read_json(data, orient="table")
        color = hss_palette[df["risk_value"][0]]
        risk_class = df["risk"].iloc[0]
        description = sma_risk_messages[risk_class]["description"].capitalize()
        suggestion = sma_risk_messages[risk_class]["suggestions"].capitalize()
        icons = [
            icon_component("../assets/icons/water-bottle.png", "Stay hydrated"),
            icon_component("../assets/icons/tshirt.png", "Wear light clothing"),
        ]
        if risk_class == "moderate":
            icons.append(
                icon_component("../assets/icons/pause.png", "Rest Breaks"),
            )
        if risk_class == "high":
            icons.append(
                icon_component("../assets/icons/pause.png", "Rest Breaks"),
            )
            icons.append(
                icon_component("../assets/icons/slush-drink.png", "Active Cooling"),
            )
        if risk_class == "extreme":
            icons = [
                icon_component(
                    "../assets/icons/stop.png", "Consider Suspending Play", size="100px"
                ),
            ]
        return f"{risk_class}".capitalize(), color, description, suggestion, icons
    except ValueError:
        raise PreventUpdate


@callback(
    Output("session-storage-weather", "data"),
    Output("map-component", "children"),
    Input("local-storage-settings", "data"),
)
def on_location_change(data_sport):
    try:
        information = df_postcodes[
            df_postcodes["sub-state-post"] == data_sport["id-postcode"]
        ].to_dict(orient="list")
        loc_selected = {
            "lat": information["latitude"][0],
            "lon": information["longitude"][0],
            "tz": time_zones[information["state"][0]],
        }
    except:
        loc_selected = default_location

    try:

        print(f"querying data {pd.Timestamp.now()}")

        df = get_yr_weather(
            lat=loc_selected["lat"], lon=loc_selected["lon"], tz=loc_selected["tz"]
        )
        df = calculate_comfort_indices(df, sports_category[data_sport["id-class"]])

        return df.to_json(date_format="iso", orient="table"), dl.Map(
            [
                dl.TileLayer(maxZoom=13, minZoom=9),
                dl.Marker(position=[loc_selected["lat"], loc_selected["lon"]]),
                dl.GestureHandling(),
            ],
            id="map",
            style={
                "width": "100%",
                "height": "25vh",
                "margin": "auto",
                "display": "block",
                # "-webkit-filter": "grayscale(100%)",
                # "filter": "grayscale(100%)",
            },
            center=(loc_selected["lat"], loc_selected["lon"]),
            zoom=11,
        )
    except:
        raise PreventUpdate


@callback(
    Output("settings-dropdowns", "children"),
    Input("url", "pathname"),
    State("local-storage-settings", "data"),
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


@callback(
    Output("local-storage-settings", "data"),
    State("local-storage-settings", "data"),
    [Input(question["id"], "value") for question in questions],
)
def save_settings_in_storage(data, *args):
    """Saves in local storage the settings selected by the participant."""
    data = data or {}
    for ix, question_id in enumerate([question["id"] for question in questions]):
        data[question_id] = args[ix]

    return data
