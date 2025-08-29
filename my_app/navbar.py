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
                        dmc.Image(
                            src="../assets/icons/logo-usyd-black.png",
                            h=35,
                            flex=0,
                            fit="contain",
                        ),
                        span={"base": 4, "xs": 3},
                        style={"textAlign": "left"},
                    ),
                    dmc.GridCol(
                        dmc.Text(
                            "Sports Heat Tool",
                            fw=700,
                        ),
                        span={"base": 5, "xs": 3},
                        px=0,
                        style={"textAlign": "center"},
                    ),
                    dmc.GridCol(
                        span={"base": 1, "xs": 1},
                        className="p-0",
                        children=modal_country_select(),
                    ),
                    dmc.GridCol(
                        [
                            dbc.NavbarToggler(
                                dmc.Burger(id="burger-button", opened=False),
                                id="navbar-toggler",
                                n_clicks=0,
                            )
                        ],
                        span={"base": 2, "xs": 0},
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
                                                    "color": "black",
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
                                                    "color": "black",
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
        color="#F1F1F1",
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
