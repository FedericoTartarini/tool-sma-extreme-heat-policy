from dataclasses import dataclass, field

sports_category = dict(
    sorted(
        {
            "Walking": 1,
            "Archery": 2,
            "Bowls": 2,
            "Field Athletics": 2,
            "Fishing": 2,
            "Golf": 2,
            "Lifesaving Surf": 2,
            "Sailing": 2,
            "Shooting": 2,
            "Walking (brisk)": 2,
            "Abseiling": 3,
            "Australian Football": 3,
            "Basketball": 3,
            "Cycling": 3,
            "Canoeing": 3,
            "Caving": 3,
            "Kayaking": 3,
            "Netball": 3,
            "Oztag": 3,
            "Rock Climbing": 3,
            "Rowing": 3,
            "Soccer": 3,
            "Tennis": 3,
            "Touch Football": 3,
            "Long Distance Running": 3,
            "Triathlon": 3,
            "Volleyball": 3,
            "Baseball": 4,
            "Bush-walking": 4,
            "Cricket": 4,
            "Equestrian": 4,
            "Horseback Riding": 4,
            "Motor Cycling": 4,
            "Rugby Union": 4,
            "Rugby League": 4,
            "Softball": 4,
            "Field Hockey": 5,
            "Mountain Biking": 5,
        }.items()
    )
)

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36"
    )
}


@dataclass(order=True)
class RiskInfo:
    sort_index: int = field(init=False)
    description: str
    suggestion: str
    color: str
    value: int

    def __post_init__(self):
        self.sort_index = self.value


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
        color="#00AD7C",
        value=0,
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
        color="#FFD039",
        value=1,
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
        color="#E45A01",
        value=2,
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
        color="#CB3327",
        value=3,
    ),
}

# # command to sort them if ever needed
# sorted([item for key, item in sma_risk_messages.items()])

default_settings = {"id-class": "Soccer", "id-postcode": "Camperdown, NSW, 2050"}

time_zones = {
    "NSW": "Australia/Sydney",
    "WA": "Australia/Perth",
    "ACT": "Australia/Canberra",
    "NT": "Australia/Darwin",
    "SA": "Australia/Adelaide",
    "QLD": "Australia/Brisbane",
    "VIC": "Australia/Melbourne",
    "TAS": "Australia/Hobart",
}

default_location = {"lat": -33.89, "lon": 151.18, "tz": time_zones["NSW"]}