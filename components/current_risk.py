import dash_mantine_components as dmc
import pandas as pd
from dash_extensions.enrich import (
    Output,
    Input,
    html,
    callback,
)

from components.gauge import gauge_chart
from config import sma_risk_messages
from my_app.utils import store_weather_risk_df
import dash_bootstrap_components as dbc


def component_current_risk():
    return dmc.Paper(
        children=[
            dmc.Center(
                html.H4("Current Sport Heat Score"),
            ),
            html.Div(dmc.Skeleton(height=250), id="fig-indicator"),
            dmc.Center(
                dbc.Alert(
                    [
                        dmc.Title(id="value-hss-current", order=3),
                    ],
                    style={
                        "text-align": "center",
                        "width": "35%",
                    },
                    id="id-alert-risk-current-value",
                    color="light",
                    className="p-1 m-0",
                ),
                style={
                    "margin-top": "-66px",
                },
            ),
        ],
        shadow="md",
        p="md",
    )


@callback(
    Output("fig-indicator", "children"),
    Input(store_weather_risk_df, "data"),
    prevent_initial_call=True,
)
def update_fig_hss_trend(df):
    """Update the heat stress chart based on the current risk value."""
    df = pd.read_json(df, orient="split")
    colors = [x.color for x in sma_risk_messages.values()]
    thresholds = [x.risk_value for x in sma_risk_messages.values()] + [4.0]
    text = [x.capitalize() for x in sma_risk_messages.keys()]
    # I am adding one so the risk starts at 1
    risk_value = df.iloc[0]["risk_value_interpolated"] + 1
    thresholds = [x + 1 for x in thresholds]
    return dmc.Image(
        src=gauge_chart(
            risk_value=round(risk_value, 1),
            colors=colors,
            thresholds=thresholds,
            text=text,
            show_value=True,
            text_rotated=True,
        ),
        alt="Heat stress chart",
        py=0,
        my={"base": "-4rem", "xs": "-6rem"},
    )


@callback(
    Output("value-hss-current", "children"),
    Output("id-alert-risk-current-value", "color"),
    Input(store_weather_risk_df, "data"),
    prevent_initial_call=True,
)
def update_alert_hss_current(df):
    df = pd.read_json(df, orient="split")
    color = sma_risk_messages[df["risk"].iloc[0]].color
    risk_class = df["risk"].iloc[0]
    return f"{risk_class}".capitalize(), color
