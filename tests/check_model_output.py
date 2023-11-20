import os
from itertools import product
from pathlib import Path

import matplotlib as mpl
import matplotlib.patheffects as pe
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psychrolib as psyc
import scipy
import seaborn as sns
from pythermalcomfort import phs
from pythermalcomfort.psychrometrics import t_mrt
from pythermalcomfort.utilities import v_relative

from my_app.utils import generate_regression_curves, calculate_comfort_indices_v1

psyc.SetUnitSystem(psyc.SI)


class Var:
    position = "standing"
    min_threshold_temperature = 26
    t_range = np.arange(
        min_threshold_temperature,
        step=(interval := 0.5),
        stop=41 + interval,
    )
    rh_range = np.arange(
        start=0,
        step=(interval := 0.5),
        stop=100 + interval,
    )
    globe_temperature_day = 10
    globe_temperature_night = 3
    wind_speed = 0.5
    var_threshold = "t_cr"
    cmap_list = ["#00AD7C", "#FFD039", "#E45A01", "#CB3327"]

    sports_profiles = {
        1: {
            "met": 4.7,
            "clo": 0.55,
            "v": wind_speed,
            "tg": globe_temperature_day,
            "duration": 180,
            "t_cr": [36.8, 37.2, 38.4, 39.5, 50],
            "water_loss": [825 / 45 * 180, 4000, 4100, 4200, 4300],
        },
        2: {
            "met": 6.4,
            "clo": 0.5,
            "v": wind_speed,
            "tg": globe_temperature_day,
            "duration": 60,
            "t_cr": [36.8, 38, 39.5, 40, 50],
            "water_loss": [850 / 45 * 60, 2900, 3000, 3100, 3200],
        },
        3: {
            "met": 7.2,
            "clo": 0.5,
            "v": wind_speed,
            "tg": globe_temperature_day,
            "duration": 45,
            "t_cr": [36.8, 38, 39.5, 40, 50],
            "water_loss": [850, 2900, 3000, 3100, 3200],
        },
        4: {
            "met": 7.3,
            "clo": 0.5,
            "v": wind_speed,
            "tg": globe_temperature_day,
            "duration": 45,
            "t_cr": [36.8, 38, 39.5, 40, 50],
            "water_loss": [850, 2900, 3000, 3100, 3200],
        },
        5: {
            "met": 7.5,
            "clo": 0.5,
            "v": wind_speed,
            "tg": globe_temperature_day,
            "duration": 45,
            "t_cr": [36.8, 38, 39.5, 40, 50],
            "water_loss": [850, 2900, 3000, 3100, 3200],
        },
    }

    fig_directory = os.path.join(os.getcwd(), "tests", "figures")


def plot_rh_lines(axis, rh_val=1, t_array=np.arange(0, 40, 0.5)):
    hr_array = []
    for t, rh in zip(t_array, np.ones(len(t_array)) * rh_val):
        hr_array.append(psyc.GetHumRatioFromRelHum(t, rh, 101325) * 1000)
    axis.plot(t_array, hr_array, c="k", lw=0.2)
    axis.text(
        20,
        psyc.GetHumRatioFromRelHum(20, rh_val, 101325) * 1000,
        f"{rh_val * 100}%",
        va="center",
        ha="center",
        rotation=20,
        fontsize=6,
    )


def generate_t_rh_combinations():
    all_combinations = list(product(Var.t_range, Var.rh_range))
    return pd.DataFrame(all_combinations, columns=["t", "rh"])


def plot_sma_lines(sport_category, main_ax, colors, reset_coordinates=True):
    sma_lines = generate_regression_curves(sport_category)
    sma_ax = main_ax.twinx()
    if reset_coordinates:
        x = np.arange(len(Var.t_range)) + 0.5
    else:
        x = Var.t_range
    sma_ax.plot(
        x,
        sma_lines[1](Var.t_range),
        c=colors[1],
        lw=2,
        path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
    )
    sma_ax.plot(
        x,
        sma_lines[2](Var.t_range),
        c=colors[2],
        lw=2,
        path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
    )
    sma_ax.plot(
        x,
        sma_lines[3](Var.t_range),
        c=colors[3],
        lw=2,
        path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
    )
    sma_ax.set(ylim=(0, 100))


def calculate_results(
    val,
    thermo_model,
    df_=pd.DataFrame(),
    const_t_globe=True,
    constant_wind=True,
    sport_category=3,
    night_day=False,
):
    if df_.shape == (0, 0):
        df_ = generate_t_rh_combinations()

    if constant_wind:
        df_["v"] = val["v"]
    else:
        df_["v"] = df_["v"] * 0.67 * (1.1 / 10) ** 0.25
        df_["v"] = v_relative(df_["v"], val["met"])

    if const_t_globe:
        df_["mrt"] = t_mrt(val["tg"] + df_["t"], df_["t"], df_["v"], standard="iso")

    if night_day:
        # todo check this code
        df_.loc[df_["elevation"] > 0, "mrt"] = t_mrt(
            val["tg"] + df_["t"], df_["t"], df_["v"], standard="iso"
        )

    # results_globe_temperature = []
    # for ix, row in df_.iterrows():
    #
    #     def calculate_globe_temperature(x):
    #         return t_mrt(x + row["t"], row["t"], row["v"], standard="iso") - row["mrt"]
    #
    #     results_globe_temperature.append(
    #         scipy.optimize.brentq(calculate_globe_temperature, 0.0, 200)
    #     )
    # print(
    #     pd.DataFrame(results_globe_temperature, columns=["tg"]).describe(
    #         percentiles=[0.75, 0.85, 0.95, 0.99]
    #     )
    # )
    # df_["tg"] = results_globe_temperature

    if thermo_model == "phs":
        results = []
        for ix, row in df_.iterrows():
            r = phs(
                tdb=row.t,
                tr=row.mrt,
                v=row.v,
                rh=row.rh,
                met=val["met"] * 58.15,
                clo=val["clo"],
                posture=Var.position,
                duration=val["duration"],
                round=False,
                acclimatized=100,
                i_mst=0.4,
            )
            r["t"] = row.t
            r["rh"] = row.rh
            r["mrt"] = row.mrt
            r["v"] = row.v
            # r["tg"] = row.tg
            results.append(r)

        df_r = pd.DataFrame(results)

        df_r["risk_class"] = pd.cut(
            df_r[Var.var_threshold],
            val[Var.var_threshold],
            labels=False,
            # right=False,
        )
        df_r.loc[df_r["water_loss"] < min(val["water_loss"]), "risk_class"] = 0
        df_r["risk_class_label"] = df_r["risk_class"].map(
            {
                0: "low",
                1: "moderate",
                2: "high",
                3: "extreme",
            }
        )

    elif thermo_model == "sma":
        df_r = calculate_comfort_indices_v1(
            df_.rename(columns={"t": "tdb"}), sport_category
        )
        df_r = df_r.rename(
            columns={"tdb": "t", "risk_value": "risk_class", "risk": "risk_class_label"}
        )

    return df_r


def check_model_output(thermo_model="phs"):
    for sport_category, v in Var.sports_profiles.items():

        df_ = calculate_results(
            val=v, thermo_model=thermo_model, constant_wind=True, const_t_globe=True
        )

        plot_heatmap(df_, sport_category, Var.var_threshold)

        plt.title(
            f"{thermo_model};{v['duration']=};{Var.var_threshold=};{sport_category=};"
            f" met={v['met']};"
            f" clo={v['clo']};v={v['v']};tg={v['tg']}"
        )
        plt.tight_layout()
        plt.savefig(
            os.path.join(
                Var.fig_directory,
                f"{thermo_model}_sport_cat_{sport_category}_{Var.var_threshold}_{Var.globe_temperature_day}_{Var.wind_speed}.png",
            )
        )


def plot_heatmap(df_, sport_category, variable):
    f, ax = plt.subplots(figsize=(9, 7))
    pivot = df_.pivot("rh", "t", variable).sort_index(ascending=False)
    pivot_water_loss = df_.pivot("rh", "t", "water_loss").sort_index(ascending=False)
    cmap = plt.cm.magma  # define the colormap
    cmap = mpl.colors.LinearSegmentedColormap.from_list(
        "Custom cmap", Var.cmap_list, cmap.N
    )
    boundary_limits = Var.sports_profiles[sport_category]["water_loss"]
    norm = mpl.colors.BoundaryNorm(boundary_limits, cmap.N)
    hm = sns.heatmap(
        pivot_water_loss,
        cmap=cmap,
        norm=norm,
        cbar=False,
        mask=pivot > 40,
    )
    # define the bins and normalize
    boundary_limits = Var.sports_profiles[sport_category][variable]
    norm = mpl.colors.BoundaryNorm(boundary_limits, cmap.N)
    hm = sns.heatmap(
        pivot,
        # annot=True,
        # fmt=".1f",
        vmin=min(boundary_limits),
        vmax=max(boundary_limits),
        mask=pivot_water_loss < min(Var.sports_profiles[sport_category]["water_loss"]),
        cmap=cmap,
        norm=norm,
    )
    plot_sma_lines(sport_category, ax, Var.cmap_list)

    return ax


def calculate_heat_stress_location(
    epw_file_name, model, sport_cat, values, const_wind=False, const_tg=False
):
    df_epw = pd.read_pickle(epw_file_name, compression="gzip")
    df_epw["hr"] *= 1000
    map_col_names = {
        "tot_sky_cover": "cloud",
        "wind_speed": "v",
        "DBT": "t",
        "RH": "rh",
        "MRT": "mrt",
    }
    df_epw = df_epw.rename(columns=map_col_names)
    # for sport_cat, values in people_profiles.items():
    df_results = calculate_results(
        values,
        model,
        df_=df_epw,
        constant_wind=const_wind,
        const_t_globe=const_tg,
        sport_category=sport_cat,
    )

    f, axs = plt.subplots(4, 1, constrained_layout=True, figsize=(7, 9))
    plt.suptitle(f"{epw_file_name} - {model} - {const_wind=} - {const_tg=}")

    print(df_results[df_results.t > Var.min_threshold_temperature]["tg"].describe())

    # cumulative number of hours in each risk category
    ax = axs[0]
    df_results["month"] = df_epw["month"].values
    df_results["day"] = df_epw["day"].values
    df_extreme_days = (
        df_results[df_results.t > Var.min_threshold_temperature]
        .groupby(["month", "day"])["risk_class"]
        .max()
    )
    df_extreme_days = df_extreme_days[df_extreme_days == 3].reset_index()
    df_extreme_days = df_extreme_days.groupby("month")["day"].count()
    df_plot = (
        df_results[df_results.t > Var.min_threshold_temperature]
        .groupby(["month", "risk_class"])["risk_class"]
        .count()
        .unstack("risk_class")
    )
    for risk in range(4):
        if risk not in df_plot.columns:
            df_plot[risk] = 0
    df_plot = df_plot[np.arange(1, 4, 1)]
    df_plot.plot(kind="bar", stacked=True, color=Var.cmap_list[1:], ax=ax, legend=False)
    ax.set(title="cumulative number of hours in each risk category")
    index = 0
    for ix, rows in df_plot[[3]].fillna(0).iterrows():
        height = 0
        for row in rows:
            height += row
            if row > 0:
                ax.text(index, 10, ha="center", va="center", s=int(row))
        index += 1
    # cumulative number of hours in each risk category
    ax = axs[1]
    df_results["hour"] = df_epw["hour"].values
    df_plot = (
        df_results[df_results.t > Var.min_threshold_temperature]
        .groupby(["hour", "risk_class"])["risk_class"]
        .count()
        .unstack("risk_class")
    )
    for risk in range(4):
        if risk not in df_plot.columns:
            df_plot[risk] = 0
    df_plot = df_plot[np.arange(1, 4, 1)]
    df_plot.plot(kind="bar", stacked=True, color=Var.cmap_list[1:], ax=ax, legend=False)
    ax.set(title="cumulative number of hours in each risk category")
    index = 0
    for ix, rows in df_plot[[3]].fillna(0).iterrows():
        height = 0
        for row in rows:
            height += row
            if row > 0:
                ax.text(index, 10, ha="center", va="center", s=int(row))
        index += 1
    # # number of hours in each risk category, data not filtered
    # sns.countplot(
    #     x=df_results["risk_class"],
    #     ax=axs[2],
    # )
    # for ix, val in enumerate(df_results.groupby("risk_class")["risk_class"].count()):
    #     axs[2].text(ix, 100, ha="center", va="bottom", s=val)
    # axs[2].set(ylabel="hours", xlabel="risk class")
    # number of hours in each risk category, data filtered by min threshold temperature
    ax = axs[2]
    sns.countplot(
        x=df_results[df_results.t > Var.min_threshold_temperature]["risk_class_label"],
        ax=ax,
        palette=Var.cmap_list,
        order=["low", "moderate", "high", "extreme"],
    )
    df_text = (
        df_results[df_results.t > Var.min_threshold_temperature]
        .groupby("risk_class")["risk_class"]
        .count()
    )
    for ix, val in enumerate(df_text):
        ax.text(df_text.index[ix], 100, ha="center", va="bottom", s=val)
    ax.set(
        ylabel="hours",
        xlabel="risk class",
        title=f"only for t>{Var.min_threshold_temperature}",
    )
    ax = axs[3]
    if df_extreme_days.shape[0] > 0:
        sns.barplot(
            data=df_extreme_days.reset_index(),
            x="month",
            y="day",
            ax=ax,
            color=Var.cmap_list[-1],
        )
        for ix, val in enumerate(df_extreme_days):
            ax.text(ix, df_extreme_days.max() / 2, ha="center", va="bottom", s=val)
        ax.set(
            ylabel="count",
            xlabel="month",
            title=f"number of days per months when we stop play for at least one hour",
        )
    # # plot distribution of the temperature data
    # sns.histplot(df_results, x="t", ax=axs[1])
    # axs[1].axvline(min_threshold_temperature, c="k")
    # count_points = df_results[df_results.t > min_threshold_temperature].shape[0]
    # axs[1].text(
    #     x=min_threshold_temperature + 2,
    #     y=200,
    #     s=f"{count_points/df_results.shape[0]*100:.1f}% points above",
    # )
    # psychrometric plot
    # ax = axs[0]
    # sns.histplot(
    #     df_results,
    #     x="t",
    #     y=df_epw["hr"].values,
    #     ax=ax,
    #     cbar=True,
    #     cbar_kws={"label": "Hours", "shrink": 0.75},
    #     binrange=((0, 40), (0, 20)),
    #     binwidth=(1, 2.5),
    #     stat="count",
    #     # vmax=120,
    #     cmap="viridis_r",
    # )
    # ax.set(
    #     ylim=(0, 25),
    #     xlim=(0, 42),
    #     ylabel=r"HR $g_{H20}/kg_{dry air}$",
    #     xlabel=r"$t_{db}$",
    # )
    # ax.axvline(min_threshold_temperature, c="k")
    # ax.grid(color="lightgray", ls="--", lw=0.5)
    # count_points = df_results[df_results.t > min_threshold_temperature].shape[0]
    # ax.text(
    #     x=min_threshold_temperature + 2,
    #     y=10,
    #     s=f"{count_points / df_results.shape[0] * 100:.1f}% points above",
    # )
    # plot_rh_lines(ax, rh_val=1)
    # plot_rh_lines(ax, rh_val=0.75)
    # plot_rh_lines(ax, rh_val=0.5)
    # plot_rh_lines(ax, rh_val=0.25)
    for ax in axs:
        sns.despine(ax=ax, bottom=True, left=True)
    plt.savefig(
        os.path.join(
            Var.fig_directory,
            f"climate_analysis_tg_const_{const_tg}_v_const_{const_wind}_{epw_file_name.split('/')[-1].replace('.pkl.gz', '')}_{model}.png",
        ),
        dpi=300,
    )


def compare_phs_sma():
    f, axs = plt.subplots(1, 3, constrained_layout=True, figsize=(7, 4), sharey=True)
    for col, sport_category in enumerate([1, 3, 5]):
        thresholds = []
        for t in Var.t_range:
            results = []
            for t_core_max in Var.sports_profiles[sport_category][Var.var_threshold][
                -3:-1
            ]:

                def calculate_threshold_core(x):
                    return (
                        phs(
                            tdb=t,
                            tr=t_mrt(
                                Var.sports_profiles[sport_category]["tg"] + t,
                                t,
                                Var.sports_profiles[sport_category]["v"],
                                standard="iso",
                            ),
                            v=Var.sports_profiles[sport_category]["v"],
                            rh=x,
                            met=Var.sports_profiles[sport_category]["met"] * 58.15,
                            clo=Var.sports_profiles[sport_category]["clo"],
                            posture=Var.position,
                            duration=Var.sports_profiles[sport_category]["duration"],
                            round=False,
                            acclimatized=100,
                            i_mst=0.4,
                        )[Var.var_threshold]
                        - t_core_max
                    )

                try:
                    results.append(
                        scipy.optimize.brentq(calculate_threshold_core, 0, 100)
                    )
                except:
                    results.append(np.nan)

            def calculate_threshold_water_loss(x):
                return (
                    phs(
                        tdb=t,
                        tr=t_mrt(
                            Var.sports_profiles[sport_category]["tg"] + t,
                            t,
                            Var.sports_profiles[sport_category]["v"],
                            standard="iso",
                        ),
                        v=Var.sports_profiles[sport_category]["v"],
                        rh=x,
                        met=Var.sports_profiles[sport_category]["met"] * 58.15,
                        clo=Var.sports_profiles[sport_category]["clo"],
                        posture=Var.position,
                        duration=Var.sports_profiles[sport_category]["duration"],
                        round=False,
                        acclimatized=100,
                        i_mst=0.4,
                    )["water_loss"]
                    - Var.sports_profiles[sport_category]["water_loss"][0]
                )

            try:
                results.append(
                    scipy.optimize.brentq(calculate_threshold_water_loss, 0, 100)
                )
            except:
                results.append(np.nan)

            results.append(t)
            thresholds.append(results)
        df_ = pd.DataFrame(
            thresholds,
            columns=[
                "high",
                "extreme",
                "moderate",
                "t",
            ],
        )

        # fill values to plot
        df_.loc[df_.t > 30, ["high", "extreme"]] = df_.loc[
            df_.t > 30, ["high", "extreme"]
        ].fillna(0)
        df_.loc[df_.t < 30, ["high", "extreme"]] = df_.loc[
            df_.t < 30, ["high", "extreme"]
        ].fillna(100)
        t_min = df_.loc[df_["moderate"].isna(), "t"].min()
        df_.loc[df_["t"] >= t_min, "moderate"] = 0
        x = Var.t_range
        colors = Var.cmap_list

        # for ix, risk in enumerate(["high", "extreme"]):
        #     df_risk = df_[[risk, 't']].dropna()
        #     z = np.polyfit(df_risk.t, df_risk[risk], 2)
        #
        #     plt.plot(
        #         x,
        #         np.poly1d(z)(x),
        #         label=risk,
        #         c=colors[ix+2],
        #         lw=2,
        #         path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
        #     )

        axs[col].fill_between(
            df_.t,
            df_.t * 0,
            df_.moderate,
            color=colors[0],
        )
        axs[col].fill_between(
            df_.t,
            df_.moderate,
            df_.high,
            color=colors[1],
        )
        axs[col].fill_between(
            df_.t,
            df_.extreme,
            df_.high,
            color=colors[2],
        )
        axs[col].fill_between(
            df_.t,
            df_.extreme,
            df_.t * 100,
            color=colors[3],
        )

        sma_lines = generate_regression_curves(sport_category)
        axs[col].plot(
            x,
            sma_lines[1](Var.t_range),
            c=colors[1],
            lw=1,
            path_effects=[pe.Stroke(linewidth=3, foreground="k"), pe.Normal()],
        )
        axs[col].plot(
            x,
            sma_lines[2](Var.t_range),
            c=colors[2],
            lw=1,
            path_effects=[pe.Stroke(linewidth=3, foreground="k"), pe.Normal()],
        )
        axs[col].plot(
            x,
            sma_lines[3](Var.t_range),
            c=colors[3],
            lw=1,
            path_effects=[pe.Stroke(linewidth=3, foreground="k"), pe.Normal()],
        )
        axs[col].set(
            ylim=(0, 100),
            xlim=(26, 41),
            title=f"{sport_category=}",
            xlabel="Air Temperature (°C)",
        )
    axs[0].set(ylabel="Relative Humidity (%)")
    plt.savefig("tests/figures/comparison_sports_risk.png", dpi=300)


if __name__ == "__main__":
    plt.close("all")

    # check_model_output("two_node")
    # check_model_output("phs")

    compare_phs_sma()

if __name__ == "__plot__":

    path_list = Path("tests/weather").glob("**/*.pkl.gz")

    for path in path_list:
        # because path is object not string
        path_in_str = str(path)

        if path_in_str not in [
            "tests/weather/Darwin.Intl.AP.pkl.gz",
            "tests/weather/Sydney.Intl.AP.pkl.gz",
            "tests/weather/Perth Intl AP.pkl.gz",
        ]:
            continue

        print(path_in_str)

        epw_file_name = path_in_str
        sport_cat = 3
        model = "phs"
        var = "t_cr"
        const_wind = True
        const_tg = True
        values = Var.sports_profiles[sport_cat]
        limits = Var.sports_profiles[sport_cat][var]

        df_epw = pd.read_pickle(epw_file_name, compression="gzip")
        map_col_names = {
            "tot_sky_cover": "cloud",
            "wind_speed": "v",
            "DBT": "t",
            "RH": "rh",
            "MRT": "mrt",
        }
        df_epw["const"] = 1
        df_epw = df_epw.rename(columns=map_col_names)
        df_epw = df_epw[df_epw.t > Var.min_threshold_temperature]

        calculate_heat_stress_location(
            epw_file_name,
            model,
            sport_cat,
            values,
            const_wind=const_wind,
            const_tg=const_tg,
        )

        # plt.close("all")

        if model == "phs":

            df_results = calculate_results(values, model)
            ax = plot_heatmap(df_results, sport_cat, var)

            df_plot = df_epw.copy()
            ymin, ymax = ax.get_ylim()
            xmin, xmax = ax.get_xlim()

            # Driver Code
            def interpolation(d, x):
                return d[0][1] + (x - d[0][0]) * (
                    (d[1][1] - d[0][1]) / (d[1][0] - d[0][0])
                )

            data = [[0, ymin], [100, ymax]]
            df_plot["rh"] = [interpolation(data, x) for x in df_plot["rh"]]
            data = [[26, xmin], [43, xmax]]
            df_plot["t"] = [interpolation(data, x) for x in df_plot["t"]]
            sns.scatterplot(df_plot[["t", "rh"]], x="t", y="rh", ax=ax, c="k")
            plt.title(path_in_str)

            plt.savefig(
                os.path.join(
                    Var.fig_directory,
                    f"climate_data_on_risk_{epw_file_name.split('/')[-1].replace('.pkl.gz', '')}_{model}.png",
                )
            )
