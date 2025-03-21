from copy import deepcopy

import dash_bootstrap_components as dbc
from dash_extensions.enrich import (
    html,
    dcc,
)
from icecream import ic

from config import Dropdowns


def generate_dropdown_inline(content):
    return dbc.Row(
        [
            dbc.Col(
                html.Label(
                    content.question,
                    className="py-2",
                ),
                width="auto",
            ),
            dbc.Col(
                dcc.Dropdown(
                    options=content.options,
                    value=content.default,
                    multi=content.multi,
                    id=content.id,
                    clearable=False,
                )
            ),
        ],
    )


def display_sport_dropdown(sport):
    question = deepcopy(Dropdowns.SPORT)
    question.default = sport
    ic(sport, question.default)
    return generate_dropdown_inline(question)
