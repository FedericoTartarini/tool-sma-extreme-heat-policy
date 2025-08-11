import dash_bootstrap_components as dbc
import pandas as pd
from dash import Output, Input, html, callback, dcc

from config import (
    sma_risk_messages,
)
from my_app.utils import (
    store_weather_risk_df,
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
    Input(store_weather_risk_df, "data"),
    prevent_initial_call=True,
)
def update_alert_hss_current(df):
    df = pd.read_json(df, orient="split")
    risk_class = df["risk"].iloc[0]
    description = sma_risk_messages[risk_class].description.capitalize()
    suggestion = sma_risk_messages[risk_class].suggestion.capitalize()
    return description, suggestion
