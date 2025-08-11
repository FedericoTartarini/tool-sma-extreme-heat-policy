import dash_bootstrap_components as dbc
import pandas as pd
from dash_extensions.enrich import (
    Output,
    Input,
    html,
    callback,
)

from my_app.utils import (
    store_weather_risk_df,
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
    Input(store_weather_risk_df, "data"),
    prevent_initial_call=True,
)
def update_alert_hss_current(df):
    df = pd.read_json(df, orient="split")
    risk_class = df["risk"].iloc[0]
    icons = [
        icon_component("../assets/icons/actions/hydration.png", "Stay hydrated"),
        icon_component("../assets/icons/actions/clothing.png", "Wear light clothing"),
    ]
    if risk_class == "moderate":
        icons.append(
            icon_component("../assets/icons/actions/pause.png", "Rest Breaks"),
        )
    if risk_class == "high":
        icons.append(
            icon_component("../assets/icons/actions/pause.png", "Rest Breaks"),
        )
        icons.append(
            icon_component("../assets/icons/actions/cooling.png", "Active Cooling"),
        )
    if risk_class == "extreme":
        icons = [
            icon_component(
                "../assets/icons/actions/stop.png",
                "Consider Suspending Play",
                size="100px",
            ),
        ]
    return icons
