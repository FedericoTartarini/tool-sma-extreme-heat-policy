import os
import time

from dash import html, dcc, Output, Input, State, callback
import dash_bootstrap_components as dbc
import dash_leaflet as dl
from dash.exceptions import PreventUpdate
from my_app.charts import indicator_chart, line_chart
import dash
from copy import deepcopy
import pandas as pd
from my_app.utils import (
    sports_category,
    legend_risk,
    get_yr_weather,
    calculate_comfort_indices_v1,
    get_data_specific_day,
    FirebaseFields,
    local_storage_settings_name,
    session_storage_weather_name,
    storage_user_id,
)
from config import (
    sma_risk_messages,
    sports_info,
    time_zones,
    default_location,
    default_settings,
)
import dash_mantine_components as dmc
from firebase_admin import db
from urllib.parse import parse_qs, urlencode

ref = db.reference(FirebaseFields.database_name)


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
        "id": "id-sport",
        "question": "Sport:",
        "options": sports_info.sport.unique(),
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


def generate_dropdown(questions_to_display, values=None):
    #add the "values" as parameter to the function, to allow the dropdowns to be pre-filled by the url
    values = values or {}
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
                        value=values.get(item['id'], item["default"]),
                        multi=item["multi"],
                        id={'type': 'dropdown', 'index': item['id']},
                    ),
                ),
            ],
            className="pb-2",
        )
        for item in questions_to_display
    ]



layout = dmc.LoadingOverlay(
    loaderProps={"variant": "dots", "color": "#555", "size": 100},
    exitTransitionDuration=500,
    children=[
        dcc.Location(id='url', refresh=False),
        dcc.Store(id=local_storage_settings_name, storage_type="local", data=default_settings),
        dcc.Store(id=session_storage_weather_name, storage_type="session"),
        html.Div(
            generate_dropdown(questions),
            id="settings-dropdowns",
        ),
        html.Div(
            dbc.Alert("", color="dark", style={"height": "10em"}),
            id="map-component",
        ),
        html.Div(
            [
                dbc.Alert("", color="dark", style={"height": "11em"}),
                dbc.Alert("", color="dark", style={"height": "2em"}),
                dbc.Alert("", color="dark", style={"height": "11em"}),
            ],
            id="body-home",
        ),
    ],
)

@callback(
    Output("body-home", "children"),
    Input(local_storage_settings_name, "data"),
)
def body(data):
    sport_selected = data["id-sport"]
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
    Input(local_storage_settings_name, "data"),
)
def update_location_and_forecast(data_sport):
    try:
        file_name = f"{data_sport['id-sport']}.png"
    except KeyError:
        raise PreventUpdate
    path = os.path.join(os.getcwd(), "assets", "icons", file_name)
    message = f"Activity: {data_sport['id-sport']}"
    if os.path.isfile(path):
        return icon_component(f"../assets/icons/{data_sport['id-sport']}.png", message)
    else:
        return icon_component("../assets/icons/sports.png", message)

@callback(
    Output("fig-indicator", "children"),
    Input(session_storage_weather_name, "data"),
    State(local_storage_settings_name, "data"),
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
    Input(session_storage_weather_name, "data"),
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
    Input(session_storage_weather_name, "data"),
)
def update_fig_hss_trend(data):
    try:
        df = pd.read_json(data, orient="table")
        accordions = []
        for day in [1, 2, 3]:
            df_day = get_data_specific_day(df, date_offset=day)
            day_name = df_day.index.day_name().unique()[0]
            color = sma_risk_messages[df_day["risk"].max()].color
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
            )
        return dmc.Accordion(accordions)
    except ValueError:
        raise PreventUpdate

@callback(
    Output("value-hss-current", "children"),
    Output("id-alert-risk-current-value", "color"),
    Output("value-risk-description", "children"),
    Output("value-risk-suggestions", "children"),
    Output("div-icons-suggestions", "children"),
    Input(session_storage_weather_name, "data"),
)
def update_alert_hss_current(data):
    try:
        df = pd.read_json(data, orient="table")
        color = sma_risk_messages[df["risk"][0]].color
        risk_class = df["risk"].iloc[0]
        description = sma_risk_messages[risk_class].description.capitalize()
        suggestion = sma_risk_messages[risk_class].suggestion.capitalize()
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
    Output(session_storage_weather_name, "data"),
    Output("map-component", "children"),
    Input(local_storage_settings_name, "data"),
    prevent_initial_call=True,
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
    except TypeError:
        loc_selected = default_location

    try:
        print(f"querying data {pd.Timestamp.now()}")

        df = get_yr_weather(
            lat=loc_selected["lat"], lon=loc_selected["lon"], tz=loc_selected["tz"]
        )
        df = calculate_comfort_indices_v1(df, sports_category[data_sport["id-sport"]])

        return df.to_json(date_format="iso", orient="table"), dl.Map(
            [
                dl.TileLayer(maxZoom=13, minZoom=7),
                dl.Marker(position=[loc_selected["lat"], loc_selected["lon"]]),
                dl.GestureHandling(),
            ],
            id="map",
            style={
                "width": "100%",
                "height": "13vh",
                "margin": "auto",
                "display": "block",
            },
            center=(loc_selected["lat"], loc_selected["lon"]),
            zoom=11,
        )
    except TypeError:
        raise PreventUpdate


@callback(
    Output("settings-dropdowns", "children"),
    #add the "search" parameter as an input, make the callback trigger when the page is loaded with  url have the "search" parameter
    Input("url", "pathname"),
    Input("url", "search"),
    State(local_storage_settings_name, "data"),
)
#add the "data" parameter as a state, to allow the dropdowns to be pre-filled by the url with the "search" parameter
def display_the_dropdown_after_page_change(pathname, search, data):
    if pathname == "/":
        if search:
            url_data = parse_qs(search.lstrip('?'))
            for key, value in url_data.items():
                if key in data:
                    data[key] = value[0]
        return generate_dropdown(questions, data)
    else:
        raise PreventUpdate


#update local storage and the url
@callback(
    #allow the multiple dropdowns to be updated
    Output(local_storage_settings_name, "data", allow_duplicate=True),
    #update the url with the "search" parameter
    Output('url', 'search'),
    #use the new values and the ids of the dropdowns to update the local storage,
    Input({'type': 'dropdown', 'index': dash.ALL}, 'value'),
    State({'type': 'dropdown', 'index': dash.ALL}, 'id'),
    State(local_storage_settings_name, "data"),
    State(storage_user_id, "data"),
    prevent_initial_call=True,
)
def save_settings_and_update_url(dropdown_new_values, dropdown_ids, data, user_id):
    #use the context to get the id of the dropdown that was triggered
    ctx = dash.callback_context
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
    #if the triggered dropdown is not the url, update the local storage and the url
    if triggered_id != 'url':
        for value, id_dict in zip(dropdown_new_values, dropdown_ids):
            if value is not None:
                key = id_dict['index']
                data[key] = value

        firebase_data = data.copy()
        firebase_data[FirebaseFields.user_id] = user_id
        firebase_data[FirebaseFields.timestamp] = time.time()
        print(firebase_data)
        ref.push().set(firebase_data)

        #update the url with the new values
        url_data = {k: v for k, v in data.items() if k in ['id-sport', 'id-postcode'] and v is not None}
        #return the new values and the url
        url_search = f"?{urlencode(url_data)}"


        return data, url_search

    return dash.no_update, dash.no_update

