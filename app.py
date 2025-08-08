import json
import logging
import os
import warnings

import dash_bootstrap_components as dbc
import firebase_admin

# Imports the Cloud Logging client library
import google.cloud.logging
from dash_extensions.enrich import (
    DashProxy,
    ServersideOutputTransform,
)
from firebase_admin import credentials
from flask_caching import Cache

from my_app.utils import (
    FirebaseFields,
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
    assets_ignore="tests/*.*",
)
cache = Cache(
    app.server, config={"CACHE_TYPE": "filesystem", "CACHE_DIR": "cache-directory"}
)
