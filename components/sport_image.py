# python
from __future__ import annotations

from pathlib import Path

import dash_mantine_components as dmc
from dash import Input, Output, callback, get_asset_url

from my_app.my_classes import IDs, UserSettings
from my_app.utils import store_settings_dict

HEIGHT_IMAGE = 127
ASSETS_DIR = Path("assets")
IMAGES_SUBDIR = "images"


def component_sport_image() -> dmc.Card:
    """Card wrapper with a skeleton placeholder for the sport image."""
    return dmc.Card(
        children=[
            dmc.CardSection(
                dmc.Skeleton(height=HEIGHT_IMAGE),
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
def update_image_on_sport_selection(
    store_settings: dict | None,
) -> dmc.Image:
    """Update the sport image when the sport is selected.

    Uses Dash's asset resolver and falls back if the file is missing.
    """
    settings = UserSettings(**(store_settings or {}))

    filename = settings.sport
    rel_path = f"{IMAGES_SUBDIR}/{filename}.webp"
    img_src = get_asset_url(rel_path)  # resolves to /assets/images/...

    return dmc.Image(
        src=img_src,
        h=HEIGHT_IMAGE,
        fallbackSrc="https://placehold.co/816x183?text=PlaceholderSportImage",
        alt=f"Sport image for {(settings.sport or '').lower()}",
    )
