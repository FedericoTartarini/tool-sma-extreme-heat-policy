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
        ["sub-state-post", "sub-state-post-no-space"]
    ].rename(columns={"sub-state-post": "label", "sub-state-post-no-space": "value"})
    data_dd_location = data_dd_location.to_dict("records")

    question.options = data_dd_location
    return generate_dropdown_inline(question)
