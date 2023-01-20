from pythermalcomfort import two_nodes
import seaborn as sns
from config import sma_risk_messages, variable_calc_risk
import matplotlib.pyplot as plt

# compare epw data with pvlib estimation
import numpy as np
import pandas as pd
import pytz

df = pd.read_csv("tests/epw_sydney.csv")
df = pd.read_csv("tests/df_Fitzroy.csv")
df["year"] = 2020
df.index = pd.to_datetime(df[["year", "month", "day", "hour"]])
tz = pytz.timezone("Australia/Brisbane")
df.index = df.index.tz_localize(tz, ambiguous="NaT", nonexistent="NaT")

map_col_names = {
    "tot_sky_cover": "cloud",
    "wind_speed": "wind",
    "DBT": "tdb",
    "RH": "rh",
    "MRT": "tr",
}

df = df.rename(columns=map_col_names)
df.lat = -33.865143
df.lon = 151.209900
df.tz = pytz.timezone("Australia/Brisbane")


def calculate_comfort_indices(df_for):

    df_for["clo"] = 0.6  # fixme get clo from .csv

    results_two_nodes = two_nodes(
        tdb=df_for["tdb"],
        tr=df_for["tr"],
        v=df_for["wind"],
        rh=df_for["rh"],
        met=6,  # fixme get met from .csv
        clo=df_for["clo"],
        limit_inputs=False,
        round=False,
    )
    df_for["set"] = results_two_nodes["_set"]
    df_for["w"] = results_two_nodes["w"]
    df_for["w_max"] = results_two_nodes["w_max"]
    df_for["m_bl"] = results_two_nodes["m_bl"]
    df_for["m_rsw"] = results_two_nodes["m_rsw"]
    df_for["ratio_m_bl"] = (df_for["m_bl"] - 1.2) / (df_for["m_bl"] * 0 + 90)
    df_for["ratio_w"] = (df_for["w"] - 0.06) / df_for["w_max"]

    bins = [i / len(sma_risk_messages) for i in range(len(sma_risk_messages))] + [1.1]
    for index in [variable_calc_risk]:
        df_for[f"risk"] = pd.cut(
            df_for[index], bins=bins, labels=sma_risk_messages.keys(), right=False
        )

    # interpolation
    x = bins
    y = np.arange(0, len(sma_risk_messages) + 1, 1)

    df_for["risk_value"] = np.around(np.interp(df_for[variable_calc_risk], x, y), 0)
    df_for["risk_value_interpolated"] = np.around(
        np.interp(df_for[variable_calc_risk], x, y), 1
    )

    df_for.index = df_for.index.tz_localize(None)

    return df_for


df_results = calculate_comfort_indices(df)

# df_plot = df_results.copy()
# df_plot.tdb = pd.cut(df_plot.tdb, np.arange(10, 40, 1))
# df_plot["tdb"] = df_plot["tdb"].apply(lambda x: x.mid)
# df_plot["rh"] = pd.cut(df_plot["rh"], np.arange(00, 100, 5))
# df_plot["rh"] = df_plot["rh"].apply(lambda x: x.mid)
# df_plot = df_plot.groupby(["tdb", "rh"])["risk_value_interpolated"].mean().reset_index()
# sns.heatmap(
#     df_plot.pivot("rh", "tdb", "risk_value_interpolated").sort_index(ascending=False)
# )
# plt.show()

df["wind"] = 0.1
df["tr"] = df["tdb"]
df_results = calculate_comfort_indices(df)
df_plot = df_results.copy()
df_plot.tdb = pd.cut(df_plot.tdb, np.arange(10, 40, 0.5))
df_plot["tdb"] = df_plot["tdb"].apply(lambda x: x.mid)
df_plot["hr"] = pd.cut(df_plot["hr"], np.arange(0, 0.02, 0.001))
df_plot["hr"] = df_plot["hr"].apply(lambda x: x.mid)
df_plot = df_plot.groupby(["tdb", "hr"])["risk_value_interpolated"].mean().reset_index()
sns.heatmap(
    df_plot.pivot("hr", "tdb", "risk_value_interpolated").sort_index(ascending=False),
    vmin=1,
)
plt.show()
