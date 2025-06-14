import json
import logging
import os
import uuid
import warnings

import dash_bootstrap_components as dbc
import dash_mantine_components as dmc
import firebase_admin

# Imports the Cloud Logging client library
import google.cloud.logging
from dash import page_container
from dash_extensions.enrich import (
    DashProxy,
    html,
    dcc,
    ServersideOutputTransform,
)
from firebase_admin import credentials

from config import Dropdowns
from my_app.footer import my_footer
from my_app.my_classes import IDs, Defaults
from my_app.navbar import my_navbar
from my_app.utils import (
    FirebaseFields,
    storage_user_id,
    store_settings_dict,
    store_weather_risk_df,
    store_country,
)

# Instantiates a client
client = google.cloud.logging.Client()

# Retrieves a Cloud Logging handler based on the environment
# you're running in and integrates the handler with the
# Python logging module. By default this captures all logs
# at INFO level and higher
client.setup_logging(log_level=logging.INFO)

logger = logging.getLogger()

if os.getenv("DEBUG_DASH", True):
    logger.addHandler(logging.StreamHandler())

warnings.filterwarnings("ignore", category=DeprecationWarning)

try:
    cred = credentials.Certificate("secret.json")
except FileNotFoundError:
    cred = credentials.Certificate(json.loads(os.environ.get("firebase_secret")))

firebase_admin.initialize_app(
    cred,
    {"databaseURL": FirebaseFields.database_url},
)


app = DashProxy(
    transforms=[
        ServersideOutputTransform(),
    ],
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
        <script type="module">
      // Import the functions you need from the SDKs you need
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
      import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-analytics.js";
      // TODO: Add SDKs for Firebase products that you want to use
      // https://firebase.google.com/docs/web/setup#available-libraries
    
      // Your web app's Firebase configuration
      // For Firebase JS SDK v7.20.0 and later, measurementId is optional
      const firebaseConfig = {
        apiKey: "AIzaSyDsXeZN8hWdUCpCpZjQ6NycgnPwsU3s6XM",
        authDomain: "sma-extreme-heat-policy.firebaseapp.com",
        databaseURL: "https://sma-extreme-heat-policy-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "sma-extreme-heat-policy",
        storageBucket: "sma-extreme-heat-policy.appspot.com",
        messagingSenderId: "987661761927",
        appId: "1:987661761927:web:7c8a14b6f22c7ec135a722",
        measurementId: "G-1VXSMPNK1F"
      };
    
      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const analytics = getAnalytics(app);
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
    [
        my_navbar(),
        dmc.LoadingOverlay(
            loaderProps={"variant": "dots", "color": "#555", "size": 100},
            exitTransitionDuration=500,
            children=[
                html.Div(id="id-google-analytics-event"),
                dcc.Store(
                    id=store_settings_dict,
                    storage_type="local",
                    data={
                        IDs.country: Defaults.country.value,
                        IDs.sport: Dropdowns.SPORT.default,
                        IDs.postcode: Dropdowns.LOCATION.default,
                    },
                ),
                dcc.Store(id=store_weather_risk_df),
                dcc.Store(
                    id=store_country, storage_type="local", data=Defaults.country.value
                ),
                dcc.Store(
                    id=storage_user_id, storage_type="local", data=str(uuid.uuid1())
                ),
                dmc.Container(
                    html.Div(page_container, style={"flex": 1}),
                    style={"flex": 1, "marginBottom": 20, "minHeight": "100vh"},
                    className="p-2",
                    size="xs",
                ),
            ],
        ),
        my_footer(),
    ]
)

if __name__ == "__main__":
    app.run_server(
        debug=os.environ.get("DEBUG_DASH", True),
        host="0.0.0.0",
        port=8080,
        processes=1,
        threaded=True,
    )
