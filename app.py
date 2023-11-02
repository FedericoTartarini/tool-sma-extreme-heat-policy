from dash import Dash, Input, Output, State, page_container
import dash_bootstrap_components as dbc
from dash import html, dcc
from my_app.navbar import my_navbar
from my_app.footer import my_footer
import os
import dash_mantine_components as dmc

app = Dash(
    __name__,
    external_stylesheets=[
        dbc.themes.BOOTSTRAP,
        "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css",
    ],
    prevent_initial_callbacks=True,
    suppress_callback_exceptions=True,
    use_pages=True,
)

app.index_string = """<!DOCTYPE html>
<html lang="en-US">
<head>
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-B66DGF5EH0"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-B66DGF5EH0');
    </script>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="Federico Tartarini, Ollie Jay">
    <meta name="keywords" content="Heat Stress Risk sport, SMA Extreme Heat Policy, Sport Medicine Australia">
    <meta name="description" content="The SMA Extreme Heat Policy tool allows you to quickly determine the risk of heath illness based on the type of sport you are playing anf the weather conditions">
    <title>SMA Extreme Heat Policy Tool</title>
    <meta property="og:image" content="https://github.com/FedericoTartarini/tool-risk-scale-football-nsw/blob/master/assets/icons/HHRI%20logo.png">
    <meta property="og:description" content="The SMA Extreme Heat Policy tool allows you to quickly determine the risk of heath illness based on the type of sport you are playing">
    <meta property="og:title" content="SMA Extreme Heat Policy Tool">
    {%favicon%}
    {%css%}
</head>
<body>
{%app_entry%}
<footer>
{%config%}
{%scripts%}
{%renderer%}
</footer>
</body>
</html>
"""


app.layout = html.Div(
    children=[
        dcc.Location(id="url"),
        html.Div(id="id-google-analytics-event"),
        my_navbar(),
        dmc.Container(
            html.Div(page_container, style={"flex": 1}),
            style={"flex": 1, "marginBottom": 20, "minHeight": "100vh"},
            className="p-2",
            size="xs",
        ),
        my_footer(),
    ],
)


if __name__ == "__main__":
    app.run_server(
        debug=os.environ.get("DEBUG_DASH", True),
        host="0.0.0.0",
        port=8080,
        processes=1,
        threaded=True,
    )
