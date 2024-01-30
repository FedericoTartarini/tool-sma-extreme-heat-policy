import dash_bootstrap_components as dbc
from dash_extensions.enrich import (
    Output,
    Input,
    html,
    callback,
)

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
    prevent_initial_call=True,
)
def update_alert_hss_current(df):
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
