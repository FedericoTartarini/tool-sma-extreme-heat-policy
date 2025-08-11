import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
import pandas as pd
from dash import (
    Output,
    Input,
    html,
    callback,
    dcc,
)

from config import (
    sma_risk_messages,
)
from my_app.charts import line_chart
from my_app.utils import (
    get_data_specific_day,
    store_weather_risk_df,
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
    Input(store_weather_risk_df, "data"),
    prevent_initial_call=True,
)
def update_figure_today(df):
    df = pd.read_json(df, orient="split")
    df = get_data_specific_day(df, date_offset=0)
    return dcc.Graph(
        figure=line_chart(df, "risk_value_interpolated"),
        config={"staticPlot": True},
    )


@callback(
    Output("fig-forecast-next-days", "children"),
    Input(store_weather_risk_df, "data"),
    prevent_initial_call=True,
)
def update_figures_forecast(df):
    df = pd.read_json(df, orient="split")
    # ic("Forecasting for next days")
    accordions = []
    for day in [1, 2, 3, 4, 5, 6]:
        df_day = get_data_specific_day(df, date_offset=day)
        day_name = df_day.index.day_name().unique()[0]
        risk_value = df_day.loc[
            df_day.risk_value == df_day.risk_value.max(), "risk"
        ].unique()[0]
        color = sma_risk_messages[risk_value].color

        (
            accordions.append(
                dmc.AccordionItem(
                    children=[
                        dmc.AccordionControl(
                            dbc.Row(
                                [
                                    dbc.Col(
                                        dmc.Stack(
                                            [
                                                html.H4(day_name, className="p-0 m-0"),
                                                dmc.Text(
                                                    df_day.index.date[0].strftime(
                                                        "%d-%m-%Y"
                                                    ),
                                                    className="p-0 m-0",
                                                    size="xs",
                                                ),
                                            ],
                                            gap=0,
                                        ),
                                        align="center",
                                    ),
                                    dbc.Col(
                                        html.P(
                                            "Max risk:",
                                            className="p-0 m-0",
                                        ),
                                        width="auto",
                                        className="p-0 m-0",
                                    ),
                                    dbc.Col(
                                        dbc.Badge(
                                            risk_value,
                                            className="ms-1 p-1 m-0",
                                            color=color,
                                        ),
                                        width="auto",
                                    ),
                                ]
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
        )
    return dmc.Accordion(accordions)
