from copy import deepcopy

from components.dropdown_sport import generate_dropdown_inline
from config import (
    Dropdowns,
    get_postcodes,
)
from my_app.my_classes import Defaults


def display_location_dropdown(
    location=Dropdowns.LOCATION.default, country=Defaults.country.value
):
    question = deepcopy(Dropdowns.LOCATION)
    question.default = location

    df_postcodes = get_postcodes(country)

    data_dd_location = df_postcodes[
        ["sub-state-post-country", "sub-state-post-country-no-space"]
    ].rename(
        columns={
            "sub-state-post-country": "label",
            "sub-state-post-country-no-space": "value",
        }
    )

    question.options = data_dd_location.astype(str).to_dict("records")
    return generate_dropdown_inline(question)
