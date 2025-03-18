import dash_mantine_components as dmc
from dash_extensions.enrich import (
    Output,
    Input,
    html,
    callback,
)

from components.gauge import gauge_chart
from config import sma_risk_messages
from my_app.utils import session_storage_weather_name


def component_current_risk():
    return dmc.Paper(
        children=[
            dmc.Center(
                html.H4("Sport Heat Score Now is:"),
            ),
            html.Div(id="fig-indicator"),
        ],
        shadow="md",
        p="md",
    )


@callback(
    Output("fig-indicator", "children"),
    Input(session_storage_weather_name, "data"),
)
def update_fig_hss_trend(df):
    colors = [x.color for x in sma_risk_messages.values()]
    thresholds = [x.risk_value for x in sma_risk_messages.values()] + [4.0]
    text = [x.capitalize() for x in sma_risk_messages.keys()]
    # I am adding one so the risk starts at 1
    risk_value = df.iloc[0]["risk_value_interpolated"] + 1
    thresholds = [x + 1 for x in thresholds]
    return (
        dmc.Image(
            gauge_chart(
                risk_value=risk_value,
                colors=colors,
                thresholds=thresholds,
                text=text,
                show_value=True,
                text_rotated=True,
            ),
            alt="Heat stress chart",
            py=0,
            my={"base": "-4rem", "xs": "-6rem"},
        ),
    )


@callback(
    Output("value-hss-current", "children"),
    Output("id-alert-risk-current-value", "color"),
    Input(session_storage_weather_name, "data"),
    prevent_initial_call=True,
)
def update_alert_hss_current(df):
    color = sma_risk_messages[df["risk"].iloc[0]].color
    risk_class = df["risk"].iloc[0]
    return f"{risk_class}".capitalize(), color
