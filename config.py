from dataclasses import dataclass, field
from pathlib import Path
from typing import ClassVar

import pandas as pd
from pydantic import BaseModel
from timezonefinder import TimezoneFinder

from my_app.my_classes import IDs, Defaults, DropDownInfo, PostcodesDefault

# sports
sports_info = pd.read_csv("assets/sports.csv")

tf = TimezoneFinder()  # reuse

default_location = {
    "lat": -33.89,
    "lon": 151.18,
    "tz": tf.timezone_at(lat=-33.89, lng=151.18),
}

default_location = {"lat": -33.89, "lon": 151.18, "tz": time_zones["NSW"]}

# risk classes
variable_calc_risk = "ratio_w"


def get_postcodes(country=Defaults.country.value):
    df_pc = pd.read_csv(
        f"./assets/postcodes/{country}.txt", header=None, delimiter="\t"
    )
    df_pc.columns = [
        "country code",
        "postcode",
        "suburb",
        "state",
        "abbreviation",
        "admin name2",
        "admin code2",
        "admin name3",
        "admin code3",
        "lat",
        "lon",
        "accuracy",
    ]
    df_pc.replace("New South Wales", "NSW", inplace=True)
    df_pc.replace("Western Australia", "WA", inplace=True)
    df_pc.replace("Australian Capital Territory", "ACT", inplace=True)
    df_pc.replace("Northern Territory", "NT", inplace=True)
    df_pc.replace("South Australia", "SA", inplace=True)
    df_pc.replace("Queensland", "QLD", inplace=True)
    df_pc.replace("Victoria", "VIC", inplace=True)
    df_pc.replace("Tasmania", "TAS", inplace=True)
    df_pc = df_pc[
        [
            "postcode",
            "suburb",
            "state",
            "lat",
            "lon",
        ]
    ]
    df_pc["sub-state-post"] = (
        df_pc["suburb"] + ", " + df_pc["state"] + ", " + df_pc["postcode"].astype("str")
    )
    df_pc["sub-state-post-no-space"] = (
        df_pc["sub-state-post"].astype("str").replace(", ", "_", regex=True)
    )
    return df_pc


@dataclass(order=True)
class RiskInfo:
    sort_index: int = field(init=False)
    description: str
    suggestion: str
    color: str
    risk_value: int

    def __post_init__(self):
        self.sort_index = self.risk_value


sma_risk_messages = {
    "low": RiskInfo(
        description=(
            "maintaining hydration through regular fluid consumption and modifying"
            " clothing is still a simple, yet effective, way of keeping cool and"
            " preserving health and performance during the summer months."
        ),
        suggestion="""
    * Ensure pre-exercise hydration by consuming 6 ml of water per kilogram of body weight
    every 2-3 hours before exercise. For a 70kg individual, this equates to 420ml of fluid
    every 2-3 hours (a standard sports drink bottle contains 500ml).
    * Drink regularly throughout exercise. You should aim to drink enough to offset sweat
    losses, but it is important to avoid over-drinking because this can also have negative
    health effects. To familiarise yourself with how much you typically sweat, become
    accustomed to weighing yourself before and after practice or competition.
    * Where possible, select light-weight and breathable clothing with extra ventilation.
    * Remove unnecessary clothing/equipment and/or excess clothing layers.
    * Reduce the amount of skin that is covered by clothing – this will help increase your
    sweat evaporation, which will help you dissipate heat.
        """,
        color="#fcd200",
        risk_value=0,
    ),
    "moderate": RiskInfo(
        description=(
            "increasing the frequency and/or duration of your rest breaks exercise or"
            " sporting activities is an effective way of reducing your risk for heat"
            " illness even if minimal resources are available."
        ),
        suggestion="""
    * During training sessions, provide a minimum of 15 minutes of rest for every 45 minutes
    of practice.
    * Extend scheduled rest breaks that naturally occur during match-play of a particular
    sport (e.g. half-time) by ~10 minutes. This is effective for sports such as soccer/football and
    rugby and can be implemented across other sports such as field hockey.
    * Implement additional rest breaks that are not normally scheduled to occur. For example,
    3 to 5-min “quarter-time” breaks can be introduced mid-way through each half of a
    football or rugby match, or an extended 10-min drinks break can be introduced every
    hour of a cricket match or after the second set of a tennis match.
    * For sports with continuous play without any scheduled breaks, courses or play duration
    can be shortened
    * During all breaks in play or practice, everyone should seek shade – if natural shade is not
    available, portable sun shelters should be provided, and water freely available
        """,
        color="#fd7f00",
        risk_value=1,
    ),
    "high": RiskInfo(
        description=(
            "active cooling strategies should be applied during scheduled and"
            " additional rest breaks, or before and during activity if play is"
            " continuous. Below are strategies that have been shown to effectively"
            " reduce body temperature. The suitability and feasibility of each strategy"
            " will depend on the type of sport or exercise you are performing. "
        ),
        suggestion="""
        * Drinking cold fluids and/or ice slushies before exercise commences. Note that cold water
        and ice slushy ingestion during exercise is less effective for cooling.
        * Submerging your arms/feet in cold water.
        * Water dousing – wetting your skin with cool water using a sponge or a spray bottle helps
        increase evaporation, which is the most effective cooling mechanism in the heat.
        * Ice packs/towels – placing an ice pack or damp towel filled with crushed ice around your
        neck.
        * Electric (misting) fans – outdoor fans can help keep your body cool, especially when
        combined with a water misting system.
            """,
        color="#dc0b00",
        risk_value=2,
    ),
    "extreme": RiskInfo(
        description=(
            "exercise/play should be suspended. If play has commenced, then all"
            " activities should be stopped as soon as possible."
        ),
        suggestion="""
        * All players should seek shade or cool refuge in an air-conditioned space if available
        * Active cooling strategies should be applied.
            """,
        color="#9c001d",
        risk_value=3,
    ),
}

# # command to sort them if ever needed
# sorted([item for key, item in sma_risk_messages.items()])

# mean radiant temperature calculation
mrt_calculation = {
    "wind_coefficient": 0.3,
    "sharp": 0,
    "sol_transmittance": 1,
    "f_svv": 1,
    "f_bes": 1,
    "asw": 0.7,
    "posture": "standing",
    "floor_reflectance": 0.1,
}

# request
headers = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36"
    )
}


class UrlInfo(BaseModel):
    url: str
    url_id: str
    page_title: str
    name: str
    description: str


@dataclass()
class URLS:
    HOME: ClassVar[UrlInfo] = UrlInfo(
        url="/",
        url_id="id-url-home",
        page_title="Sport Medicine Australia Extreme Heat Policy",
        name="Home Page",
        description="This is the home page of the SMA Extreme Policy Tool, which allows you to calculate the sport "
        "heat score",
    )
    ABOUT: ClassVar[UrlInfo] = UrlInfo(
        url="/about",
        url_id="id-url-about",
        page_title="About Page",
        name="About",
        description="This page provides information about the SMA Extreme Heat Policy tool",
    )
    INSTALL: ClassVar[UrlInfo] = UrlInfo(
        url="/install",
        url_id="id-url-install",
        page_title="Installation Page",
        name="Install",
        description="This page provides information on how to install the SMA Extreme Heat Policy tool on your phone",
    )


data_dd_sport = sports_info[["sport", "sport_id"]].rename(
    columns={"sport": "label", "sport_id": "value"}
)
data_dd_sport = data_dd_sport.to_dict("records")

df_postcodes = get_postcodes(Defaults.country.value)

data_dd_location = df_postcodes[["sub-state-post", "sub-state-post-no-space"]].rename(
    columns={"sub-state-post": "label", "sub-state-post-no-space": "value"}
)
data_dd_location = data_dd_location.to_dict("records")


@dataclass()
class Dropdowns:
    SPORT: ClassVar[DropDownInfo] = DropDownInfo(
        id=IDs.sport,
        question="Sport:",
        options=data_dd_sport,
        multi=False,
        default=Defaults.sport.value,
    )

    LOCATION: ClassVar[DropDownInfo] = DropDownInfo(
        id=IDs.postcode,
        question="Location:",
        options=data_dd_location,
        multi=False,
        default=PostcodesDefault.AU,
    )

    def __getitem__(self, key):
        return getattr(self, key)
