import dash
import dash_mantine_components as dmc
from dash import callback, Input, Output, State
from icecream import ic
import pandas as pd
from typing import Any

from my_app.utils import (
    store_settings_dict,
    get_weather_and_calculate_risk,
    Cols,
)
from my_app.my_classes import UserSettings

dash.register_page(__name__, path="/raw_data")


def create_table(df: pd.DataFrame) -> dmc.Table:
    columns, values = df.columns, df.values
    header = dmc.TableThead(dmc.TableTr([dmc.TableTh(col[:10]) for col in columns]))
    rows = dmc.TableTbody(
        [dmc.TableTr([dmc.TableTd(cell) for cell in row]) for row in values]
    )
    table = dmc.Table(
        [header, rows],
        striped=True,
        highlightOnHover=True,
        # withColumnBorders=True,
    )
    return table


layout = dmc.Stack(
    [
        dmc.Text(
            "This page shows the raw data used to calculate the risk value. "
            "It is not meant for end users, but for developers and data scientists.",
            size="sm",
            style={"margin-bottom": "1em"},
        ),
        dmc.Button(
            "Show Raw Data",
            id="id-show-raw-data",
            variant="outline",
            color="dark",
            size="md",
            style={"margin-bottom": "1em"},
        ),
        dmc.Center(id="id-raw-data-table"),
    ]
)


@callback(
    Output("id-raw-data-table", "children"),
    Input("id-show-raw-data", "n_clicks"),
    State(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def update_alert_hss_current(button: int, settings: dict[str, Any]) -> dmc.Table:
    """Updates the raw data table when the button is clicked.

    Args:
        button: Number of button clicks.
        settings: Dictionary of user settings.

    Returns:
        A Dash Mantine Table component with the raw data.
    """
    if button is None:
        ic("Button not clicked yet, preventing update")
        raise dash.exceptions.PreventUpdate

    # Convert settings dict to UserSettings instance
    user_settings = UserSettings(**settings)

    df = get_weather_and_calculate_risk(
        location=user_settings.location, sport=user_settings.sport
    )

    df["risk_value_interpolated"] += 1

    # Select columns with float data type
    float_columns = [
        Cols.tdb,
        Cols.rh,
        Cols.tg,
        Cols.wind,
        Cols.cloud,
        "risk_value_interpolated",
    ]

    df = df[float_columns]

    df = df.resample("2H").mean()

    df[Cols.tg] = df[Cols.tg] + df[Cols.tdb]

    df[float_columns] = df[float_columns].astype(float).round(2)

    df["time"] = df.index.strftime("%D %H:%M")
    df = df[["time"] + float_columns]

    return create_table(df)
