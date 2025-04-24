from dataclasses import dataclass


@dataclass
class IDs:
    sport: str = "id_sport"
    postcode: str = "id_postcode"
    country: str = "id_country"
    button_country: str = "id-button-country"
    modal_country: str = "modal-select-country"
    modal_country_select: str = "modal-country-select-input"
    modal_country_button_submit: str = "modal-country-submit-button"
