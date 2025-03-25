import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
from dash import Input, Output, State, html, ctx
from dash import callback

from config import URLS


def my_navbar():
    return dbc.Navbar(
        dmc.Container(
            dmc.Grid(
                [
                    dmc.Col(
                        [
                            html.A(
                                # Use row and col to control vertical alignment of logo / brand
                                dbc.Row(
                                    [
                                        dbc.Col(
                                            dbc.NavbarBrand(
                                                "SMA Extreme Heat Policy",
                                                className="ms-2",
                                            ),
                                            width="auto",
                                        ),
                                    ],
                                    align="center",
                                    className="g-0",
                                ),
                                href=URLS.HOME.url,
                                style={"textDecoration": "none"},
                            ),
                        ],
                        span="content",
                        className="py-0",
                    ),
                    dmc.Col(
                        [
                            dbc.NavbarToggler(
                                dmc.Burger(
                                    id="burger-button", opened=False, color="white"
                                ),
                                id="navbar-toggler",
                                n_clicks=0,
                            )
                        ],
                        span="content",
                        className="py-0",
                    ),
                    dmc.Col(
                        [
                            dbc.Collapse(
                                dbc.Nav(
                                    children=[
                                        dbc.NavItem(
                                            dbc.NavLink(
                                                "Home",
                                                href=URLS.HOME.url,
                                                style={
                                                    "textAlign": "center",
                                                    "color": "white",
                                                },
                                                id="id-nav-home",
                                            ),
                                        ),
                                        # dbc.NavItem(dbc.NavLink("Documentation", href="documentation")),
                                        dbc.NavItem(
                                            dbc.NavLink(
                                                "About",
                                                href=URLS.ABOUT.url,
                                                style={
                                                    "textAlign": "center",
                                                    "color": "white",
                                                },
                                                id="id-nav-about",
                                            )
                                        ),
                                    ],
                                ),
                                id="navbar-collapse",
                                is_open=False,
                                navbar=True,
                            ),
                        ],
                        span=12,
                        md="content",
                        className="py-0",
                    ),
                ],
                justify="space-between",
                align="center",
            ),
            style={"flex": 1},
            className="p-2",
            size="xs",
        ),
        color="#dc0b00",
        dark=True,
    )


# add callback for toggling the collapse on small screens
@callback(
    Output("navbar-collapse", "is_open"),
    Output("burger-button", "opened"),
    [
        State("navbar-collapse", "is_open"),
        State("burger-button", "opened"),
    ],
    [
        Input("navbar-toggler", "n_clicks"),
        Input("id-nav-home", "n_clicks"),
        Input("id-nav-about", "n_clicks"),
    ],
    prevent_initial_call=True,
)
def toggle_navbar_collapse(is_open, burger_state, *args):
    trigger = ctx.triggered_id
    if trigger == "navbar-toggler":
        return not is_open, burger_state
    elif is_open:
        return False, not burger_state
    return is_open, burger_state
