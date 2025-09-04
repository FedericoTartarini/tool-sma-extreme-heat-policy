import json
import os
import warnings

import dash_bootstrap_components as dbc
import firebase_admin

# Imports the Cloud Logging client library
from dash_extensions.enrich import (
    DashProxy,
    ServersideOutputTransform,
)
from firebase_admin import credentials
from flask_caching import Cache

from my_app.utils import (
    FirebaseFields,
)

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
    assets_ignore="tests/*.*",
)
cache = Cache(
    app.server, config={"CACHE_TYPE": "filesystem", "CACHE_DIR": "cache-directory"}
)
