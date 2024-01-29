from dash import html
import dash_mantine_components as dmc


def component_main_recommendation():
    return html.Div(
        children=[
            html.H3(
                "Key recommendations:",
            ),
            html.Div(
                children=dmc.BackgroundImage(
                    src="assets/images/low.jpg",
                    style={"height": "300px", "position": "relative"},
                    radius=20,
                    children=html.Div(
                        style={"bottom": "0", "left": "1rem", "position": "absolute"},
                        children=[
                            dmc.Text(
                                "Wear light clothing",
                                weight=700,
                                size=50,
                                style={"font-family": "Bebas Neue"},
                            ),
                            dmc.Text(
                                "Stay hydrated",
                                weight=700,
                                size=50,
                                style={"font-family": "Bebas Neue"},
                            ),
                        ],
                    ),
                ),
            ),
        ]
    )
