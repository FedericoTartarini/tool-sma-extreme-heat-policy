import pandas as pd
from dash import html, dcc, Output, Input, State, callback
import dash_mantine_components as dmc
import dash_bootstrap_components as dbc
from dash.exceptions import PreventUpdate

from config import sma_risk_messages
from my_app.charts import indicator_chart
from my_app.utils import session_storage_weather_name, local_storage_settings_name


def component_current_risk():
    return html.Div(
        children=[
            html.H4(
                "Current estimated Heat Stress Risk is:",
            ),
            html.Div(id="fig-indicator", className="my-2"),
            dmc.Center(
                dbc.Alert(
                    [
                        html.H4(
                            id="value-hss-current",
                        ),
                    ],
                    style={
                        "text-align": "center",
                        "width": "30%",
                    },
                    id="id-alert-risk-current-value",
                    color="light",
                    className="p-1 m-0",
                ),
                style={
                    "margin-top": "-66px",
                },
            ),
        ]
    )


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
    Output("value-hss-current", "children"),
    Output("id-alert-risk-current-value", "color"),
    Input(session_storage_weather_name, "data"),
)
def update_alert_hss_current(data):
    try:
        df = pd.read_json(data, orient="table")
        color = sma_risk_messages[df["risk"][0]].color
        risk_class = df["risk"].iloc[0]
        return f"{risk_class}".capitalize(), color
    except ValueError:
        raise PreventUpdate
