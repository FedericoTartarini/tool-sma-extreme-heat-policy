from pythermalcomfort import two_nodes
import seaborn as sns
from config import sma_risk_messages, variable_calc_risk
import matplotlib.pyplot as plt
from itertools import product
from my_app.utils import calculate_comfort_indices_v2, generate_regression_curves

# compare epw data with pvlib estimation
import numpy as np
import pandas as pd
import pytz


df = pd.read_csv("tests/epw_sydney.csv")
df = pd.read_csv("tests/df_Fitzroy.csv")
time_zone = "Australia/Perth"
tz = pytz.timezone(time_zone)
df["year"] = 2020
df.index = pd.to_datetime(df[["year", "month", "day", "hour"]])
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
df.tz = pytz.timezone(time_zone)

# no wind no sun, T vs RH
cmap = sns.color_palette(
    [
        "#06A6EE",
        "#31CAA8",
        "#F5BB3C",
        "#FF412C",
    ],
    4,
)
plt.close("all")
sports = pd.read_csv("assets/sports.csv")
for ix, row in sports.iterrows():
    sport = row["sport"]
    sport_cat = row["sport_cat"]
    f, ax = plt.subplots(1, 1, constrained_layout=True)
    df_test = df.copy()
    t_range = np.arange(10, 45, 0.5)
    rh_range = np.arange(0, 102, 2)
    combinations = list(product(t_range, rh_range))
    df_test = df_test.head(len(combinations))
    df_test.tdb = [x[0] for x in combinations]
    df_test.rh = [x[1] for x in combinations]
    df_test["wind"] = 0.1
    df_test["tr"] = df_test["tdb"] + 40
    df_test.lat = -33.865143
    df_test.lon = 151.209900
    df_test.tz = pytz.timezone("Australia/Brisbane")
    df_results = calculate_comfort_indices_v2(
        df_test, sport=sport, calc_tr=False, met_corr=0.4
    )
    df_plot = df_results.copy()
    var_plot = "w"
    df_plot = df_plot.groupby(["tdb", "rh"])[var_plot].mean().reset_index()
    extent = np.min(t_range), np.max(t_range), np.min(rh_range), np.max(rh_range)
    pos = ax.imshow(
        df_plot.pivot("rh", "tdb", var_plot).sort_index(ascending=False).values,
        extent=extent,
        aspect=0.25,
        vmin=0.6,
        vmax=1,
    )
    # ax.set(xlim=(10, 39), ylim=(0, 98))
    lines = generate_regression_curves(sport_cat)
    ax.plot(t_range, lines[1](t_range))
    ax.plot(t_range, lines[2](t_range))
    ax.plot(t_range, lines[3](t_range))
    ax.set(xlim=(np.min(t_range), np.max(t_range)), ylim=(0, 98), title=sport)
    f.colorbar(pos, ax=ax)
    plt.show()

# # wind=1 and tr = tdb + 15
# df_test = df.copy()
# combinations = list(product(np.arange(10, 40, 0.5), np.arange(0, 100, 1)))
# df_test = df_test.head(len(combinations))
# df_test.tdb = [x[0] for x in combinations]
# df_test.rh = [x[1] for x in combinations]
# df_test["wind"] = 0.1
# df_test["tr"] = df_test["tdb"] + 15
# df_results = calculate_comfort_indices(df_test, sport="Soccer")
# df_plot = df_results.copy()
# df_plot = df_plot.groupby(["tdb", "rh"])[var_plot].mean().reset_index()
# sns.heatmap(
#     df_plot.pivot("rh", "tdb", var_plot).sort_index(ascending=False), vmin=0
# )
# plt.show()

# df_test = df.copy()
# combinations = list(product(np.arange(10, 40, 1), np.arange(0, 100, 1)))
# df_test = df_test.head(len(combinations))
# df_test.tdb = [x[0] for x in combinations]
# df_test.rh = [x[1] for x in combinations]
# df_test["wind"] = 0.1
# df_test["tr"] = df_test["tdb"]
# df_results = calculate_comfort_indices(df_test)
# df_plot = df_results.copy()
# df_plot = df_plot.groupby(["tdb", "rh"])["ratio_w"].mean().reset_index()
# sns.heatmap(df_plot.pivot("rh", "tdb", "ratio_w").sort_index(ascending=False))
# plt.show()
#
# df_results[(df_results.tdb > 34) & (df_results.rh > 50)][
#     ["rh", "tdb", "ratio_w", "w", "w_max"]
# ]
#
# # no wind no sun, T vs RH for one location
# df_test = df.copy()
# df_test["wind"] = 0.1
# df_test["tr"] = df_test["tdb"]
# df_results = calculate_comfort_indices(df_test)
#
# df_plot = df_results.copy()
# df_plot.tdb = pd.cut(df_plot.tdb, np.arange(10, 40, 1))
# df_plot["tdb"] = df_plot["tdb"].apply(lambda x: x.mid)
# df_plot["rh"] = pd.cut(df_plot["rh"], np.arange(00, 100, 1))
# df_plot["rh"] = df_plot["rh"].apply(lambda x: x.mid)
# df_plot = df_plot.groupby(["tdb", "rh"])[var_plot].mean().reset_index()
# sns.heatmap(df_plot.pivot("rh", "tdb", var_plot).sort_index(ascending=False))
# plt.show()
#
# # # no wind no sun, psychrometric
# # df_plot = df_results.copy()
# # df_plot.tdb = pd.cut(df_plot.tdb, np.arange(10, 40, 0.5))
# # df_plot["tdb"] = df_plot["tdb"].apply(lambda x: x.mid)
# # df_plot["hr"] = pd.cut(df_plot["hr"], np.arange(0, 0.02, 0.001))
# # df_plot["hr"] = df_plot["hr"].apply(lambda x: x.mid)
# # df_plot = df_plot.groupby(["tdb", "hr"])["risk_value_interpolated"].mean().reset_index()
# # sns.heatmap(
# #     df_plot.pivot("hr", "tdb", "risk_value_interpolated").sort_index(ascending=False),
# #     vmin=1,
# # )
# # plt.show()
