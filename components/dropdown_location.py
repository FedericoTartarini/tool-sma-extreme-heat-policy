from copy import deepcopy

from components.dropdown_sport import generate_dropdown_inline
from config import (
    Dropdowns,
)


def display_location_dropdown(location=Dropdowns.LOCATION.default):
    question = deepcopy(Dropdowns.LOCATION)
    question.default = location
    return generate_dropdown_inline(question)
