import dash_mantine_components as dmc
from dash import callback, Input, Output

from my_app.my_classes import IDs, UserSettings
from my_app.utils import store_settings_dict

height_image = 127


def component_sport_image():
    return dmc.Card(
        children=[
            dmc.CardSection(
                dmc.Skeleton(height=height_image),
                id=IDs.sport_image,
            ),
        ],
        withBorder=True,
        shadow="sm",
        radius="md",
        className="mb-2",
    )


@callback(
    Output(IDs.sport_image, "children"),
    Input(store_settings_dict, "data"),
    prevent_initial_call=True,
)
def update_image_on_sport_selection(store_settings: dict | None) -> dmc.Image:
    """Updates the sport image when the sport is selected."""
    settings = UserSettings(**(store_settings or {}))
    return dmc.Image(
        src=f"./assets/images/{settings.sport}.webp",
        h=height_image,
        fallbackSrc="https://placehold.co/816x183?text=PlaceholderSportImage",
        alt=f"Sport image for {settings.sport}",
    )
