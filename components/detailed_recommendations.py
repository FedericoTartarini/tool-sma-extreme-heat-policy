from io import StringIO

import dash_bootstrap_components as dbc
import pandas as pd
from dash import html, dcc, Output, Input, callback
from dash.exceptions import PreventUpdate

from config import (
    sma_risk_messages,
)
from my_app.utils import (
    session_storage_weather_name,
)


def component_detailed_recommendation():
    return html.Div(
        children=[
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
            )
        ]
    )


@callback(
    Output("value-risk-description", "children"),
    Output("value-risk-suggestions", "children"),
    Input(session_storage_weather_name, "data"),
)
def update_alert_hss_current(data):
    try:
        df = pd.read_json(StringIO(data), orient="split")
        risk_class = df["risk"].iloc[0]
        description = sma_risk_messages[risk_class].description.capitalize()
        suggestion = sma_risk_messages[risk_class].suggestion.capitalize()
        return description, suggestion
    except ValueError:
        raise PreventUpdate
