import dash_mantine_components as dmc
from dash_extensions.enrich import (
    Output,
    Input,
    callback,
)

from my_app.utils import local_storage_settings_name


def component_sport_image():
    return dmc.Card(
        children=[
            dmc.CardSection(
                dmc.Image(
                    src="assets/images/Soccer.webp",
                    height=127,
                ),
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
    Input(local_storage_settings_name, "data"),
    prevent_initial_call=True,
)
def update_image_on_sport_selection(data):
    return dmc.Image(
        src=f"assets/images/{data['id-sport']}.webp",
        height=127,
    )
