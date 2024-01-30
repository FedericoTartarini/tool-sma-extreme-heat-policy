from io import StringIO

import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
import pandas as pd
from dash import html, dcc, Output, Input, callback
from dash.exceptions import PreventUpdate

from config import (
    sma_risk_messages,
)
from my_app.charts import line_chart
from my_app.utils import (
    get_data_specific_day,
    session_storage_weather_name,
)


def component_forecast():
    return html.Div(
        children=[
            html.H2("Forecasted risk for today"),
            html.Div(id="fig-forecast_line"),
            html.Div(id="fig-forecast-next-days"),
        ]
    )


@callback(
    Output("fig-forecast_line", "children"),
    Input(session_storage_weather_name, "data"),
)
def update_fig_hss_trend(data):
    try:
        df = pd.read_json(StringIO(data), orient="split")
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
        df = pd.read_json(StringIO(data), orient="split")
        accordions = []
        for day in [1, 2, 3, 4, 5, 6]:
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
            ),
        return dmc.Accordion(accordions)
    except ValueError:
        raise PreventUpdate
