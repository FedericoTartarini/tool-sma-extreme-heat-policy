import dash_bootstrap_components as dbc
from dash import html


def my_navbar():
    return dbc.Navbar(
        dbc.Container(
            [
                html.A(
                    # Use row and col to control vertical alignment of logo / brand
                    dbc.Row(
                        [
                            dbc.Col(
                                html.Img(
                                    src="../assets/icons/HHRI logo.png", width="75px"
                                )
                            ),
                            dbc.Col(
                                dbc.NavbarBrand(
                                    "SMA Heat Stress Policy", className="ms-2"
                                )
                            ),
                        ],
                        align="center",
                        className="g-0",
                    ),
                    href="/",
                    style={"textDecoration": "none"},
                ),
                dbc.NavbarToggler(id="navbar-toggle", n_clicks=0),
                dbc.Collapse(
                    dbc.Nav(
                        [
                            dbc.NavItem(dbc.NavLink("Home", href="/")),
                            dbc.NavItem(dbc.NavLink("About", href="/about")),
                            dbc.NavItem(dbc.NavLink("Settings", href="/settings")),
                        ],
                        className="ms-auto",
                        navbar=True,
                    ),
                    id="navbar-collapse",
                    navbar=True,
                ),
            ],
        ),
        color="#E64626",
        dark=True,
        className="mb-1",
    )
