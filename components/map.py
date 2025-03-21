import dash_bootstrap_components as dbc
import dash_leaflet as dl
import dash_mantine_components as dmc
from dash.exceptions import PreventUpdate
from dash_extensions.enrich import (
    Output,
    Input,
    callback,
)

from my_app.utils import (
    store_settings_dict,
    get_info_location_selected,
)


def component_map():
    return dmc.Card(
        children=[
            dbc.Alert("", color="dark", style={"height": "10em"}),
        ],
        id="map-component",
        withBorder=True,
        shadow="sm",
        radius="md",
        className="p-0 mb-2",
    )


@callback(
    Output("map-component", "children"),
    Input(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def on_location_change(settings):
    loc_selected = get_info_location_selected(settings)

    try:
        return dl.Map(
            [
                dl.TileLayer(maxZoom=13, minZoom=7),
                dl.Marker(position=[loc_selected["lat"], loc_selected["lon"]]),
                dl.GestureHandling(),
            ],
            id="map",
            style={
                "width": "100%",
                "height": "13vh",
                "margin": "auto",
                "display": "block",
                # "-webkit-filter": "grayscale(100%)",
                # "filter": "grayscal`e(100%)",
            },
            center=(loc_selected["lat"], loc_selected["lon"]),
            zoom=11,
        )
    except TypeError:
        raise PreventUpdate
