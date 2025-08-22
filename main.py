import os
import uuid

import dash_mantine_components as dmc

# Imports the Cloud Logging client library
from dash import (
    page_container,
    html,
    dcc,
)

from app import app
from my_app.footer import my_footer
from my_app.my_classes import UserSettings
from my_app.navbar import my_navbar
from my_app.utils import (
    storage_user_id,
    store_settings_dict,
    store_weather_risk_df,
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
    <link rel="apple-touch-icon" href="/assets/ios/512.png"/>
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/ios/180.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/ios/32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/ios/16.png">
    <link rel="manifest" href="./assets/manifest.json">
    <script>
      if (typeof navigator.serviceWorker !== 'undefined') {
        navigator.serviceWorker.register('sw.js')
      }
    </script>
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

default_settings = UserSettings()

app.layout = dmc.MantineProvider(
    children=[
        my_navbar(),
        dcc.Loading(
            children=[
                html.Div(id="id-google-analytics-event"),
                dcc.Store(
                    id=store_settings_dict,
                    storage_type="local",
                    data=default_settings.dict(),
                ),
                dcc.Store(id=store_weather_risk_df),
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
            overlay_style={"visibility": "visible", "filter": "blur(2px)"},
            color="gray",
            type="circle",
        ),
        my_footer(),
    ]
)


if __name__ == "__main__":
    app.run(
        debug=os.environ.get("DEBUG_DASH", True),
        host="0.0.0.0",
        port=8080,
        processes=1,
        threaded=True,
    )
