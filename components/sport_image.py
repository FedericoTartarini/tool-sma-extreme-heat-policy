import dash_mantine_components as dmc


def component_sport_image():
    return dmc.Card(
        children=[
            dmc.CardSection(
                dmc.Image(
                    # todo this should change based on the sport
                    src="assets/images/Soccer.webp",
                )
            ),
        ],
        withBorder=True,
        shadow="sm",
        radius="md",
        className="my-2",
    )
