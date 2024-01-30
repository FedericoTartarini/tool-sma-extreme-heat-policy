from io import StringIO

import dash_bootstrap_components as dbc
import pandas as pd
from dash import html, Output, Input, callback
from dash.exceptions import PreventUpdate

from my_app.utils import (
    session_storage_weather_name,
    icon_component,
)


def component_main_recommendation():
    return html.Div(
        children=[
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
            )
        ]
    )


@callback(
    Output("div-icons-suggestions", "children"),
    Input(session_storage_weather_name, "data"),
)
def update_alert_hss_current(data):
    try:
        df = pd.read_json(StringIO(data), orient="split")
        risk_class = df["risk"].iloc[0]
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
        return icons
    except ValueError:
        raise PreventUpdate
