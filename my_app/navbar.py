import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
from dash import Input, Output, State, html, ctx
from dash import callback

from components.modal_country_select import modal_country_select
from config import URLS


def my_navbar():
    return dbc.Navbar(
        dmc.Container(
            dmc.Grid(
                [
                    dmc.GridCol(
                        [
                            html.A(
                                # Use row and col to control vertical alignment of logo / brand
                                dbc.NavbarBrand(
                                    "USYD Sports Heat Tool",
                                ),
                                href=URLS.HOME.url,
                                style={"textDecoration": "none"},
                            ),
                        ],
                        span="content",
                        className="py-0",
                    ),
                    dmc.GridCol(
                        span="content",
                        className="p-0",
                        children=modal_country_select(),
                    ),
                    dmc.GridCol(
                        [
                            dbc.NavbarToggler(
                                dmc.Burger(
                                    id="burger-button", opened=False, color="white"
                                ),
                                id="navbar-toggler",
                                n_clicks=0,
                            )
                        ],
                        span={"base": "content", "xs": 0},
                        className="py-0",
                    ),
                    dmc.GridCol(
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
                        span={"base": 12, "sm": 3},
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
