import os

from dash import html, dcc, Output, Input, State, callback, ctx
import dash_bootstrap_components as dbc
import dash_leaflet as dl
from dash.exceptions import PreventUpdate
from my_app.charts import hss_palette, risk_map, indicator_chart
import dash
import pandas as pd
from utils import (
    sma_risk_messages,
    sports_category,
    legend_risk,
    get_yr_weather,
    calculate_comfort_indices,
)

dash.register_page(
    __name__,
    path="/",
    title="Home Page",
    name="Home Page",
    description="This is the home page of the SMA Extreme Policy Tool",
)


def layout():
    return dbc.Container(
        children=[
            html.Div(id="map-component"),
            html.Div(id="body-home"),
        ],
        className="p-2",
    )


@callback(
    Output("body-home", "children"),
    Input("local-storage-settings", "data"),
)
def body(data):
    try:
        sport_selected = data["id-class"]
        if not sport_selected:
            return [
                dbc.Alert(
                    "Please return to the Settings Page and select a sport",
                    id="sport-selection",
                    color="danger",
                    className="mt-2",
                ),
                html.Div(
                    [
                        dbc.Button("Settings Page", color="primary", href="/settings"),
                    ],
                    className="d-grid gap-2 col-4 mx-auto",
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
                            "Current Heat Stress Risk is:",
                        ),
                        dcc.Loading(
                            html.H1(
                                className="alert-heading",
                                id="value-hss-current",
                            ),
                        ),
                    ],
                    style={"text-align": "center"},
                    id="id-alert-risk-current-value",
                ),
                html.H3(
                    "Heat Stress Scale:",
                ),
                html.Div(id="fig-indicator"),
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
                html.H2("Forecasted risk value"),
                html.Div(id="fig-hss-trend"),
                legend_risk(),
                html.P(
                    "Each dot in the chart above represents the forecasted conditions"
                    " in the next X hours. Where X is the number displayed over"
                    " the dot",
                    className="my-2",
                ),
            ]
    except:
        return [
            dbc.Alert(
                "Please select a sport in the Settings Page",
                id="sport-selection",
                color="danger",
                className="mt-2",
            ),
            html.Div(
                [
                    dbc.Button(
                        "Go to the Settings Page", color="primary", href="/settings"
                    ),
                ],
                className="d-grid gap-2 col-12 col-md-4 mx-auto",
            ),
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
    Output("local-storage-location-gps", "data"),
    Input("map", "location_lat_lon_acc"),
    State("local-storage-location-gps", "data"),
)
def update_location_and_forecast(location, data):
    data = data or {"lat": -33.888, "lon": 151.185}

    if location:
        data["lat"] = round(location[0], 3)
        data["lon"] = round(location[1], 3)

    return data


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
    Output("fig-hss-trend", "children"),
    Input("session-storage-weather", "modified_timestamp"),
    State("session-storage-weather", "data"),
    State("local-storage-settings", "data"),
)
def update_fig_hss_forecast(ts, data, data_sport):
    try:
        df = pd.read_json(data, orient="table")
        return dcc.Graph(
            figure=risk_map(df, sports_category[data_sport["id-class"]]),
            config={"staticPlot": True},
        )
    except ValueError:
        raise PreventUpdate


@callback(
    Output("fig-indicator", "children"),
    Input("session-storage-weather", "modified_timestamp"),
    State("session-storage-weather", "data"),
    State("local-storage-settings", "data"),
)
def update_fig_hss_trend(ts, data, data_sport):
    try:
        df = pd.read_json(data, orient="table")
        return dcc.Graph(
            figure=indicator_chart(df, sports_category[data_sport["id-class"]]),
            config={"staticPlot": True},
        )
    except ValueError:
        raise PreventUpdate


@callback(
    Output("value-hss-current", "children"),
    Output("id-alert-risk-current-value", "color"),
    Output("value-risk-description", "children"),
    Output("value-risk-suggestions", "children"),
    Output("div-icons-suggestions", "children"),
    Input("session-storage-weather", "modified_timestamp"),
    State("session-storage-weather", "data"),
)
def update_alert_hss_current(ts, data):
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
                    "../assets/icons/stop.png", "Stop Activity", size="100px"
                ),
            ]
        return f"{risk_class}".capitalize(), color, description, suggestion, icons
    except ValueError:
        raise PreventUpdate


@callback(
    [Output("session-storage-weather", "data"), Output("map-component", "children")],
    [
        Input("url", "pathname"),
        Input("local-storage-location-gps", "data"),
        Input("local-storage-location-selected", "data"),
    ],
    [State("local-storage-settings", "data")],
)
def on_location_change(url, loc_gps, loc_selected, data_sport):

    if url != "/":
        raise PreventUpdate

    start_location_control = True
    if loc_gps or loc_selected:
        start_location_control = False

    loc_gps = loc_gps or {"lat": -0, "lon": 0}

    if loc_selected and ctx.triggered_id != "local-storage-location-gps":
        loc_gps = loc_selected

    try:
        if loc_selected and ctx.triggered_id != "local-storage-location-gps":
            loc_gps = loc_selected
        df = get_yr_weather(lat=loc_gps["lat"], lon=loc_gps["lon"])
        df = calculate_comfort_indices(df, sports_category[data_sport["id-class"]])

        return df.to_json(date_format="iso", orient="table"), dl.Map(
            [
                dl.TileLayer(maxZoom=13, minZoom=9),
                dl.LocateControl(
                    startDirectly=start_location_control,
                    options={"locateOptions": {"enableHighAccuracy": True}},
                ),
                dl.Marker(position=[loc_gps["lat"], loc_gps["lon"]]),
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
            center=(loc_gps["lat"], loc_gps["lon"]),
            zoom=11,
        )
    except:
        raise PreventUpdate
