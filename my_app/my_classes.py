from dataclasses import dataclass
from enum import Enum

from pydantic import BaseModel


@dataclass
class IDs:
    sport: str = "id_sport"
    postcode: str = "id_postcode"
    country: str = "id_country"
    button_country: str = "id-button-country"
    modal_country: str = "modal-select-country"
    modal_country_select: str = "modal-country-select-input"


class Defaults(Enum):
    sport = "soccer"
    location = "Sydney_NSW_2000"
    country = "AU"


@dataclass()
class PostcodesDefault:
    AU: str = Defaults.location.value
    US: str = "Berkeley_California_94701"

    def __getitem__(self, key):
        return getattr(self, key)


class DropDownInfo(BaseModel):
    id: str
    question: str
    options: list[dict]
    multi: bool
    default: str
