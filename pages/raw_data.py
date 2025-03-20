import dash
import dash_mantine_components as dmc
from dash import html, callback, Input, Output

from my_app.utils import (
    local_storage_settings_name,
    get_weather_and_calculate_risk,
    Cols,
)

dash.register_page(__name__, path=f"/raw_data")


def create_table(df):
    columns, values = df.columns, df.values
    header = [html.Tr([html.Th(col[:6]) for col in columns])]
    rows = [html.Tr([html.Td(cell) for cell in row]) for row in values]
    table = dmc.Table(
        [html.Thead(header), html.Tbody(rows)],
        striped=True,
        highlightOnHover=True,
        withBorder=True,
        # withColumnBorders=True,
    )
    return table


layout = dmc.Stack([dmc.Center(id="id-raw-data-table")])


@callback(
    Output("id-raw-data-table", "children"),
    Input(local_storage_settings_name, "data"),
)
def update_alert_hss_current(settings):

    df = get_weather_and_calculate_risk(settings)

    # Select columns with float data type
    float_columns = [
        Cols.tdb,
        Cols.rh,
        Cols.tg,
        Cols.wind,
        Cols.cloud,
        "elevation",
    ]
    df[float_columns] = df[float_columns].astype(float).round(2)

    df["time"] = df.index.strftime("%D %H:%M")

    df = df[
        [
            "time",
            Cols.tdb,
            Cols.rh,
            Cols.tg,
            Cols.wind,
            Cols.cloud,
            "elevation",
            "risk",
            "risk_value_interpolated",
            "risk_value",
        ]
    ]

    return create_table(df)
