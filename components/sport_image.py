import dash_mantine_components as dmc
from dash_extensions.enrich import (
    Output,
    Input,
    callback,
)

from my_app.my_classes import IDs
from my_app.utils import store_settings_dict

height_image = 127


def component_sport_image():
    return dmc.Card(
        children=[
            dmc.CardSection(
                dmc.Skeleton(height=height_image),
                id="sport-image",
            ),
        ],
        withBorder=True,
        shadow="sm",
        radius="md",
        className="mb-2",
    )


@callback(
    Output("sport-image", "children"),
    Input(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def update_image_on_sport_selection(data):
    return dmc.Image(
        src=f"assets/images/{data[IDs.sport]}.webp",
        height=height_image,
    )
