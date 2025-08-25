from dataclasses import dataclass, field
from pathlib import Path
from typing import ClassVar
from cachetools import cached, TTLCache

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

# risk classes
variable_calc_risk = "ratio_w"


@cached(cache=TTLCache(maxsize=10, ttl=600))
def get_postcodes(country=Defaults.country.value):
    """Retrieve postcodes for the specified country and return a DataFrame."""
    return pd.read_pickle(
        f"./assets/postcodes_filtered/{country}.pkl.gz", compression="gzip"
    )


def process_postcodes(country=Defaults.country.value):
    """
    Process postcodes for the given country and save them as a pickle file.
    """
    df_pc = pd.read_csv(
        f"./assets/postcodes/{country}.txt", header=None, delimiter="\t"
    )
    df_pc.columns = [
        "country code",
        "postcode",
        "suburb",
        "state_full",
        "state",
        "admin name2",
        "admin code2",
        "admin name3",
        "admin code3",
        "lat",
        "lon",
        "accuracy",
    ]
    if df_pc["state"].isnull().sum() == df_pc["state"].shape[0]:
        # if all states are null, we pass the country code as state
        df_pc["state"] = country
    elif country == "AR":  # Argentina
        df_pc["postcode"] = df_pc["state"] + "-" + df_pc["postcode"].astype("str")
        df_pc["state"] = df_pc["state_full"]
        df_pc["suburb"] = df_pc["suburb"].str.capitalize()
    elif country == "ID":  # Indonesia
        df_pc["state"] = "ID"
    elif df_pc["state"].dtype.kind in ("i", "f"):
        # if state is an integer, we use the state_full column
        df_pc["state"] = df_pc["state_full"]

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
    df_pc["sub-state-post-country"] = df_pc["sub-state-post"] + ", " + country.upper()
    df_pc["sub-state-post-country-no-space"] = (
        df_pc["sub-state-post-country"].astype("str").replace(", ", "_", regex=True)
    )

    df_pc.to_pickle(f"./assets/postcodes/{country}.pkl.gz", compression="gzip")


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

data_dd_location = df_postcodes[
    ["sub-state-post-country", "sub-state-post-country-no-space"]
].rename(
    columns={
        "sub-state-post-country": "label",
        "sub-state-post-country-no-space": "value",
    }
)
data_dd_location = data_dd_location.to_dict("records")


@dataclass()
class Dropdowns:
    SPORT: ClassVar[DropDownInfo] = DropDownInfo(
        id=IDs.dropdown_sport,
        question="Sport:",
        options=data_dd_sport,
        multi=False,
        default=Defaults.sport.value,
    )

    LOCATION: ClassVar[DropDownInfo] = DropDownInfo(
        id=IDs.dropdown_location_value,
        question="Location:",
        options=data_dd_location,
        multi=False,
        default=PostcodesDefault.AU,
    )

    def __getitem__(self, key):
        return getattr(self, key)


def haversine_array(lat1, lon1, lat2, lon2):
    """Compute the great circle distance between two points on the earth (specified in decimal degrees)."""
    R = 6371.0  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c


def drop_close_postcodes(
    df: pd.DataFrame, min_distance_km: float = 2.0
) -> pd.DataFrame:
    """Drop postcodes that are closer than min_distance_km and have the same suburb.

    Args
    ----
    df : pd.DataFrame
        DataFrame with 'lat', 'lon', and 'suburb' columns.
    min_distance_km : float, optional
        Minimum allowed distance between postcodes (default is 2.0).

    Returns
    -------
    pd.DataFrame
        Filtered DataFrame with one postcode per cluster per suburb.

    Raises
    ------
    ValueError
        If 'lat' or 'lon' columns contain non-numeric values.

    Example
    -------
    >>> df_filtered = drop_close_postcodes(df_postcodes, min_distance_km=2.0)
    """
    # Ensure lat/lon are floats
    try:
        df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
        df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    except Exception as e:
        print(f"Error converting lat/lon to float: {e}")
        raise ValueError("lat/lon columns must be convertible to float.")

    # Drop rows with missing coordinates
    df = df.dropna(subset=["lat", "lon", "suburb"]).copy()

    result_frames = []
    kms_per_radian = 6371.0088
    epsilon = min_distance_km / kms_per_radian

    for suburb, group in df.groupby("suburb"):
        coords = group[["lat", "lon"]].to_numpy()
        if len(coords) == 0:
            continue
        clustering = DBSCAN(
            eps=epsilon, min_samples=1, algorithm="ball_tree", metric="haversine"
        )
        labels = clustering.fit_predict(np.radians(coords))
        group = group.copy()
        group["cluster"] = labels
        # Keep the first postcode in each cluster
        result_frames.append(group.groupby("cluster").first().reset_index(drop=True))

    return pd.concat(result_frames, ignore_index=True)


def filter_postcodes():
    """
    Convert all pickle files in the postcodes directory to Parquet format.
    """
    import os
    import pandas as pd

    input_dir = "assets/postcodes"
    output_dir = "assets/postcodes_filtered"
    os.makedirs(output_dir, exist_ok=True)

    for file in os.listdir(input_dir):
        if file.endswith(".pkl.gz"):
            # file = "AE.pkl.gz"
            df = pd.read_pickle(os.path.join(input_dir, file), compression="gzip")
            # if the state column is empty, fill it with the country code
            if df["state"].isnull().all():
                df["state"] = file.split(".")[0].upper()
            df_filtered = drop_close_postcodes(df=df, min_distance_km=4.0)
            df_filtered.to_pickle(os.path.join(output_dir, file), compression="gzip")


if __name__ == "__main___":
    import os
    import zipfile
    import requests
    from io import BytesIO

    # Specify the output folder (create it if needed)
    output_dir = "assets/postcodes"  # <-- Replace with your actual path
    os.makedirs(output_dir, exist_ok=True)

    # ISO 3166-1 alpha-2 country codes
    iso_codes_url = "https://download.geonames.org/export/dump/countryInfo.txt"
    response = requests.get(iso_codes_url)
    iso_codes = []

    for line in response.text.splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) > 0:
            iso_codes.append(parts[0])

    base_url = "https://download.geonames.org/export/zip"

    for code in iso_codes:
        if not Path(f"{output_dir}/{code}.pkl.gz").exists():
            print(f"Downloading {code}...")
            zip_url = f"{base_url}/{code}.zip"
            try:
                print(f"Downloading: {zip_url}")
                r = requests.get(zip_url, timeout=10)
                if r.status_code == 200:
                    with zipfile.ZipFile(BytesIO(r.content)) as z:
                        txt_filename = f"{code}.txt"
                        if txt_filename in z.namelist():
                            print(f"Extracting {txt_filename}")
                            z.extract(txt_filename, path=output_dir)
                        else:
                            print(f"{txt_filename} not found in archive.")
                else:
                    print(
                        f"Failed to download {zip_url} (status code: {r.status_code})"
                    )
            except Exception as e:
                print(f"Error processing {zip_url}: {e}")

    # process_postcodes(Defaults.country.value)
    for iso_code in iso_codes:
        if Path(f"{output_dir}/{iso_code}.txt").exists():
            print(f"Extracting {iso_code}...")
            process_postcodes(country=iso_code)

    # 1. Fetch country ISO codes, names and capitals
    url = "https://download.geonames.org/export/dump/countryInfo.txt"
    resp = requests.get(url)

    capitals = []
    for line in resp.text.splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        iso = parts[0]
        country = parts[4]
        capital = parts[5]
        capitals.append({"iso": iso, "country": country, "capital": capital})

    for iso_code in iso_codes:
        if Path(f"{output_dir}/{iso_code}.pkl.gz").exists():
            capital = [c["capital"] for c in capitals if c["iso"] == iso_code][
                0
            ].lower()
            df = get_postcodes(country=iso_code)

            try:
                print(
                    f"{iso_code}: str = '{df.loc[df['suburb'].str.lower() == capital, 'sub-state-post-country-no-space'][0]}'"
                )
            except KeyError:
                print(f"{iso_code}: str = ''")

    # process_postcodes(Defaults.country.value)
    for file in Path(output_dir).glob("*.pkl.gz"):
        iso_code = file.name.split(".")[0]
        df_pc = pd.read_pickle(file, compression="gzip")
        df_pc["sub-state-post-country"] = (
            df_pc["sub-state-post"] + ", " + iso_code.upper()
        )
        df_pc["sub-state-post-country-no-space"] = (
            df_pc["sub-state-post-country"].astype("str").replace(", ", "_", regex=True)
        )
        df_pc.to_pickle(file, compression="gzip")

    # Filter postcodes to remove close duplicates
    from sklearn.cluster import DBSCAN
    import numpy as np

    filter_postcodes()

    # #     remove all the parquet files in the postcodes directory
    # for file in Path("assets/postcodes").glob("*.parquet"):
    #     print(file)
    #     file.unlink()

    # for each country print a postcode in the postcode_filtered file
    for file in Path("assets/postcodes_filtered").glob("*.pkl.gz"):
        iso_code = file.name.split(".")[0]
        df_pc = pd.read_pickle(file, compression="gzip")
        try:
            print(
                f'{iso_code}: str = "{df_pc["sub-state-post-country-no-space"].iloc[0]}"'
            )
        except IndexError:
            print(f"{iso_code}: str = ''")

    # drop from the postcode files the columns that I am not using
    for file in Path("assets/postcodes_filtered").glob("*.pkl.gz"):
        # file = 'assets/postcodes_filtered/AE.pkl.gz'
        df_pc = pd.read_pickle(file, compression="gzip")
        df_pc = df_pc[
            [
                "lat",
                "lon",
                "sub-state-post-country-no-space",
                "sub-state-post-country",
            ]
        ]
        df_pc.dropna(inplace=True)
        df_pc.to_pickle(file, compression="gzip")
