from dash import html
import dash
import dash_bootstrap_components as dbc

dash.register_page(__name__)

layout = dbc.Container(
    [
        html.H1("This page does not exists."),
        html.P("You can navigate back to the home page by clicking the button below"),
        html.Div(
            [
                dbc.Button("Home Page", color="primary", href="/"),
            ],
            className="d-grid gap-2 col-4 mx-auto",
        ),
    ]
)
