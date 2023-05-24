import os
import seaborn as sns
from pythermalcomfort.models import two_nodes
from pythermalcomfort.psychrometrics import p_sat, t_mrt
from pythermalcomfort.utilities import (
    check_standard_compliance,
    body_surface_area,
)
import math
import numpy as np
from itertools import product
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
from utils import generate_regression_curves

###############################
# configuration
max_rectal_temperature = 41
max_sweat_losses = 600
position = "standing"
duration = 60
t_range = np.arange(16, 44, 3)
rh_range = np.arange(0, 105, 5)
mrt_t_delta = 0
wind_speed = 0.6
var_to_plot = {
    # "d_lim_t_re": {"max": duration * 0.5, "min": duration},
    # "water_loss_watt": {"max": 750, "min": 740},
    # "water_loss": {"max": 1900, "min": 1800},
    "t_cr": {"max": max_rectal_temperature, "min": 37},
    # "w": {"max": 1.25, "min": 0},
    # "w_req": {"max": 1.3, "min": 1},
}
cmap = plt.cm.get_cmap("magma", 4)

#  risk low from 750g/h per hour

people_profiles = {
    1: {"met": 3, "clo": 0.4, "v": wind_speed, "d_mrt": mrt_t_delta},
    2: {"met": 4.3, "clo": 0.576, "v": wind_speed, "d_mrt": mrt_t_delta},
    3: {"met": 8, "clo": 0.47, "v": wind_speed, "d_mrt": mrt_t_delta},
    4: {"met": 8.3, "clo": 0.576, "v": wind_speed, "d_mrt": mrt_t_delta},
    5: {"met": 8, "clo": 0.63, "v": wind_speed, "d_mrt": mrt_t_delta},
}

fig_directory = os.path.join(os.getcwd(), "tests", "figures")
###############################

t_mrt(42, 30, 1)


def generate_t_rh_combinations():
    all_combinations = list(product(t_range, rh_range))
    return pd.DataFrame(all_combinations, columns=["t", "rh"])


def plot_sma_lines(sport_cat, main_ax):
    sma_lines = generate_regression_curves(sport_cat)
    sma_ax = main_ax.twinx()
    sma_ax.plot(np.arange(len(t_range)) + 0.5, sma_lines[1](t_range))
    sma_ax.plot(np.arange(len(t_range)) + 0.5, sma_lines[2](t_range))
    sma_ax.plot(np.arange(len(t_range)) + 0.5, sma_lines[3](t_range))
    sma_ax.set(ylim=(0, 100))


def calculate_results(values, model):
    df = generate_t_rh_combinations()

    if model == "two_nodes":
        r = two_nodes(
            tdb=df["t"],
            tr=df["t"] + values["d_mrt"],
            rh=df["rh"],
            met=values["met"],
            clo=values["clo"],
            v=values["v"],
            round=False,
            w_max=1,
        )

        df_results = pd.DataFrame(r)
        df_results = df_results.rename(columns={"t_core": "t_cr"})
        df_results["t"] = df["t"]
        df_results["rh"] = df["rh"]

    elif model == "phs":
        results = []
        for ix, row in df.iterrows():
            r = phs(
                tdb=row.t,
                tr=row.t + mrt_t_delta,
                v=wind_speed,
                rh=row.rh,
                met=values["met"] * 58,
                clo=values["clo"],
                posture=position,
                duration=duration,
                round=False,
            )
            r["t"] = row.t
            r["rh"] = row.rh
            results.append(r)

        df_results = pd.DataFrame(results)

    return df_results


def check_model_output(model):
    for sport_cat, values in people_profiles.items():

        df_results = calculate_results(values, model)

        for var, limits in var_to_plot.items():
            f, ax = plt.subplots(figsize=(7, 6))
            pivot = df_results.pivot("rh", "t", var).sort_index(ascending=False)

            sns.heatmap(
                pivot,
                annot=True,
                fmt=".2f",
                vmin=limits["min"],
                vmax=limits["max"],
                mask=pivot < limits["min"],
                cmap=cmap,
            )

            plot_sma_lines(sport_cat, ax)

            plt.title(
                f"{var=}; {sport_cat=}; met={values['met']};"
                f" clo={values['clo']}; v={values['v']}; tr= tdb+{values['d_mrt']}"
            )
            plt.tight_layout()
            plt.savefig(
                os.path.join(fig_directory, f"phs_sport_cat_{sport_cat}_{var}.png")
            )


def phs_optimized(*args):
    (
        tdb,
        tr,
        v,
        p_a,
        met,
        clo,
        posture,
        wme,
        i_mst,
        a_p,
        drink,
        weight,
        height,
        walk_sp,
        theta,
        acclimatized,
        duration,
        f_r,
        t_sk,
        t_cr,
        t_re,
        t_cr_eq,
        t_sk_t_cr_wg,
    ) = args

    # DuBois body surface area [m2]
    a_dubois = 0.202 * (weight**0.425) * (height**0.725)
    sp_heat = 57.83 * weight / a_dubois  # specific heat of the body
    d_lim_t_re = 0  # maximum allowable exposure time for heat storage [min]
    # maximum allowable exposure time for water loss, mean subject [min]
    d_lim_loss_50 = 0
    # maximum allowable exposure time for water loss, 95 % of the working population [min]
    d_lim_loss_95 = 0
    # maximum water loss to protect a mean subject [g]
    d_max_50 = 0.075 * weight * 1000
    # maximum water loss to protect 95 % of the working population [g]
    d_max_95 = 0.05 * weight * 1000
    # exponential averaging constants
    const_t_eq = math.exp(-1 / 10)
    const_t_sk = math.exp(-1 / 3)
    const_sw = math.exp(-1 / 10)
    sweat_rate = 0
    sw_tot = 0

    def_dir = 0
    if theta != 0:
        # def_dir = 1 for unidirectional walking, def_dir = 0 for omni-directional walking
        def_dir = 1
    if walk_sp == 0:
        def_speed = 0
    else:
        def_speed = 1

    # radiating area dubois
    a_r_du = 0.7
    if posture == 2:
        a_r_du = 0.77
    if posture == 3:
        a_r_du = 0.67

    # evaluation of the max sweat rate as a function of the metabolic rate
    sw_max = (met - 32) * a_dubois
    if sw_max > max_sweat_losses:
        sw_max = max_sweat_losses
    if sw_max < 250:
        sw_max = 250
    if acclimatized >= 50:
        sw_max = sw_max * 1.25

    # max skin wettedness
    if acclimatized < 50:
        w_max = 0.85
    else:
        w_max = 1

    # static clothing insulation
    i_cl_st = clo * 0.155
    fcl = 1 + 0.3 * clo

    # Static boundary layer thermal insulation in quiet air
    i_a_st = 0.111

    # Total static insulation
    i_tot_st = i_cl_st + i_a_st / fcl
    if def_speed > 0:
        if def_dir == 1:  # Unidirectional walking
            v_r = abs(v - walk_sp * math.cos(3.14159 * theta / 180))
        else:  # Omni-directional walking IF
            if v < walk_sp:
                v_r = walk_sp
            else:
                v_r = v
    else:
        walk_sp = 0.0052 * (met - 58)
        if walk_sp > 0.7:
            walk_sp = 0.7
        v_r = v

    # Dynamic clothing insulation - correction for wind (Var) and walking speed
    v_ux = v_r
    if v_r > 3:
        v_ux = 3
    w_a_ux = walk_sp
    if walk_sp > 1.5:
        w_a_ux = 1.5
    # correction for the dynamic total dry thermal insulation at or above 0.6 clo
    corr_cl = 1.044 * math.exp(
        (0.066 * v_ux - 0.398) * v_ux + (0.094 * w_a_ux - 0.378) * w_a_ux
    )
    if corr_cl > 1:
        corr_cl = 1
    # correction for the dynamic total dry thermal insulation at 0 clo
    corr_ia = math.exp((0.047 * v_r - 0.472) * v_r + (0.117 * w_a_ux - 0.342) * w_a_ux)
    if corr_ia > 1:
        corr_ia = 1
    corr_tot = corr_cl
    if clo <= 0.6:
        corr_tot = ((0.6 - clo) * corr_ia + clo * corr_cl) / 0.6
    # total dynamic clothing insulation
    i_tot_dyn = i_tot_st * corr_tot
    # dynamic boundary layer thermal insulation
    i_a_dyn = corr_ia * i_a_st
    i_cl_dyn = i_tot_dyn - i_a_dyn / fcl
    # correction for the dynamic permeability index
    corr_e = (2.6 * corr_tot - 6.5) * corr_tot + 4.9
    im_dyn = i_mst * corr_e
    if im_dyn > 0.9:
        im_dyn = 0.9
    r_t_dyn = i_tot_dyn / im_dyn / 16.7
    t_exp = 28.56 + 0.115 * tdb + 0.641 * p_a  # expired air temperature
    # respiratory convective heat flow [W/m2]
    c_res = 0.001516 * met * (t_exp - tdb)
    # respiratory evaporative heat flow [W/m2]
    e_res = 0.00127 * met * (59.34 + 0.53 * tdb - 11.63 * p_a)
    z = 3.5 + 5.2 * v_r
    if v_r > 1:
        z = 8.7 * v_r**0.6

    # dynamic convective heat transfer coefficient
    hc_dyn = 2.38 * abs(t_sk - tdb) ** 0.25
    if z > hc_dyn:
        hc_dyn = z

    aux_r = 5.67e-08 * a_r_du
    f_cl_r = (1 - a_p) * 0.97 + a_p * f_r

    for time in range(1, duration + 1):
        t_sk0 = t_sk
        t_re0 = t_re
        t_cr0 = t_cr
        t_cr_eq0 = t_cr_eq
        t_sk_t_cr_wg0 = t_sk_t_cr_wg

        # equilibrium core temperature associated to the metabolic rate
        t_cr_eq_m = 0.0036 * met + 36.6
        # Core temperature at this minute, by exponential averaging
        t_cr_eq = t_cr_eq0 * const_t_eq + t_cr_eq_m * (1 - const_t_eq)
        # Heat storage associated with this core temperature increase during the last minute
        d_stored_eq = sp_heat * (t_cr_eq - t_cr_eq0) * (1 - t_sk_t_cr_wg0)
        # skin temperature prediction -- clothed model
        t_sk_eq_cl = 12.165 + 0.02017 * tdb + 0.04361 * tr + 0.19354 * p_a - 0.25315 * v
        t_sk_eq_cl = t_sk_eq_cl + 0.005346 * met + 0.51274 * t_re
        # nude model
        t_sk_eq_nu = 7.191 + 0.064 * tdb + 0.061 * tr + 0.198 * p_a - 0.348 * v
        t_sk_eq_nu = t_sk_eq_nu + 0.616 * t_re
        if clo >= 0.6:
            t_sk_eq = t_sk_eq_cl
        elif clo <= 0.2:
            t_sk_eq = t_sk_eq_nu
        else:
            t_sk_eq = t_sk_eq_nu + 2.5 * (t_sk_eq_cl - t_sk_eq_nu) * (clo - 0.2)

        # skin temperature [C]
        t_sk = t_sk0 * const_t_sk + t_sk_eq * (1 - const_t_sk)
        # Saturated water vapour pressure at the surface of the skin
        p_sk = 0.6105 * math.exp(17.27 * t_sk / (t_sk + 237.3))
        t_cl = tr + 0.1  # clothing surface temperature
        while True:
            # radiative heat transfer coefficient
            h_r = f_cl_r * aux_r * ((t_cl + 273) ** 4 - (tr + 273) ** 4) / (t_cl - tr)
            t_cl_new = (fcl * (hc_dyn * tdb + h_r * tr) + t_sk / i_cl_dyn) / (
                fcl * (hc_dyn + h_r) + 1 / i_cl_dyn
            )
            if abs(t_cl - t_cl_new) <= 0.001:
                break
            t_cl = (t_cl + t_cl_new) / 2

        convection = fcl * hc_dyn * (t_cl - tdb)
        radiation = fcl * h_r * (t_cl - tr)
        # maximum evaporative heat flow at the skin surface [W/m2]
        e_max = (p_sk - p_a) / r_t_dyn
        # required evaporative heat flow [W/m2]
        e_req = met - d_stored_eq - wme - c_res - e_res - convection - radiation
        # required skin wettedness
        w_req = e_req / e_max

        if e_req <= 0:
            e_req = 0
            sw_req = 0  # required sweat rate [W/m2]
        elif e_max <= 0:
            e_max = 0
            sw_req = sw_max
        elif w_req >= 1.7:
            sw_req = sw_max
        else:
            e_v_eff = 1 - w_req**2 / 2
            if w_req > 1:
                e_v_eff = (2 - w_req) ** 2 / 2
            sw_req = e_req / e_v_eff
            if sw_req > sw_max:
                sw_req = sw_max
        sweat_rate = sweat_rate * const_sw + sw_req * (1 - const_sw)

        if sweat_rate <= 0:
            e_p = 0  # predicted evaporative heat flow [W/m2]
            sweat_rate = 0
        else:
            k = e_max / sweat_rate
            wp = 1
            if k >= 0.5:
                wp = -k + math.sqrt(k * k + 2)
            if wp > w_max:
                wp = w_max
            e_p = wp * e_max

        # body heat storage rate [W/m2]
        d_storage = e_req - e_p + d_stored_eq
        t_cr_new = t_cr0
        while True:
            t_sk_t_cr_wg = 0.3 - 0.09 * (t_cr_new - 36.8)
            if t_sk_t_cr_wg > 0.3:
                t_sk_t_cr_wg = 0.3
            if t_sk_t_cr_wg < 0.1:
                t_sk_t_cr_wg = 0.1
            t_cr = (
                d_storage / sp_heat
                + t_sk0 * t_sk_t_cr_wg0 / 2
                - t_sk * t_sk_t_cr_wg / 2
            )
            t_cr = (t_cr + t_cr0 * (1 - t_sk_t_cr_wg0 / 2)) / (1 - t_sk_t_cr_wg / 2)
            if abs(t_cr - t_cr_new) <= 0.001:
                break
            t_cr_new = (t_cr_new + t_cr) / 2

        t_re = t_re0 + (2 * t_cr - 1.962 * t_re0 - 1.31) / 9
        if d_lim_t_re == 0 and t_re >= max_rectal_temperature:
            d_lim_t_re = time
        sw_tot = sw_tot + sweat_rate + e_res
        sw_tot_g = sw_tot * 2.67 * a_dubois / 1.8 / 60
        if d_lim_loss_50 == 0 and sw_tot_g >= d_max_50:
            d_lim_loss_50 = time
        if d_lim_loss_95 == 0 and sw_tot_g >= d_max_95:
            d_lim_loss_95 = time
        if drink == 0:
            d_lim_loss_95 = d_lim_loss_95 * 0.6
            d_lim_loss_50 = d_lim_loss_95
    if d_lim_loss_50 == 0:
        d_lim_loss_50 = duration
    if d_lim_loss_95 == 0:
        d_lim_loss_95 = duration
    if d_lim_t_re == 0:
        d_lim_t_re = duration

    if e_max <= 0:
        wp = 0
    else:
        wp = e_p / e_max

    return [
        t_re,
        t_sk,
        t_cr,
        t_cr_eq,
        t_sk_t_cr_wg,
        sweat_rate,
        sw_tot_g,
        # d_lim_loss_50,
        # d_lim_loss_95,
        d_lim_t_re,
        wp,
        w_req,
    ]


def phs(tdb, tr, v, rh, met, clo, posture, wme=0, **kwargs):
    """Calculates the Predicted Heat Strain (PHS) index based in compliace with
    the ISO 7933:2004 Standard [8]_. The ISO 7933 provides a method for the
    analytical evaluation and interpretation of the thermal stress experienced
    by a subject in a hot environment. It describes a method for predicting the
    sweat rate and the internal core temperature that the human body will
    develop in response to the working conditions.

    The PHS model can be used to predict the: heat by respiratory convection, heat flow
    by respiratory evaporation, steady state mean skin temperature, instantaneous value
    of skin temperature, heat accumulation associated with the metabolic rate, maximum
    evaporative heat flow at the skin surface, predicted sweat rate, predicted evaporative
    heat flow, and rectal temperature.

    Parameters
    ----------
    tdb : float
        dry bulb air temperature, default in [°C]
    tr : float
        mean radiant temperature, default in [°C]
    v : float
        air speed, default in [m/s]
    rh : float
        relative humidity, [%]
    met : float
        metabolic rate, [W/(m2)]
    clo : float
        clothing insulation, [clo]
    posture:
        a numeric value presenting posture of person [sitting=1, standing=2, crouching=3]
    wme : float
        external work, [W/(m2)] default 0

    Other Parameters
    ----------------
    i_mst : float, default 0.38
        static moisture permeability index, [dimensionless]
    a_p : float, default 0.54
        fraction of the body surface covered by the reflective clothing, [dimensionless]
    drink : float, default 1
        1 if workers can drink freely, 0 otherwise
    weight : float, default 75
        body weight, [kg]
    height : float, default 1.8
        height, [m]
    walk_sp : float, default 0
        walking speed, [m/s]
    theta : float, default 0
        angle between walking direction and wind direction [degrees]
    acclimatized : float, default 100
        100 if acclimatised subject, 0 otherwise
    duration : float, default 480
        duration of the work sequence, [minutes]
    f_r : float, default 0.97
        emissivity of the reflective clothing, [dimensionless]
        Some reference values :py:meth:`pythermalcomfort.utilities.f_r_garments`.
    t_sk : float, default 34.1
        mean skin temperature when worker starts working, [°C]
    t_cr : float, default 36.8
        mean core temperature when worker starts working, [°C]
    t_re : float, default False
        mean rectal temperature when worker starts working, [°C]
    t_cr_eq : float, default False
        mean core temperature as a funtion of met when worker starts working, [°C]
    sweat_rate : float, default 0

    Returns
    -------
    t_re : float
        rectal temperature, [°C]
    d_lim_loss_50 : float
        maximum allowable exposure time for water loss, mean subject, [minutes]
    d_lim_loss_95 : float
        maximum allowable exposure time for water loss, 95% of the working population,
        [minutes]
    d_lim_t_re : float
        maximum allowable exposure time for heat storage, [minutes]
    water_loss : float
        maximum water loss, [g]

    Examples
    --------
    .. code-block:: python

        >>> from pythermalcomfort.models import phs
        >>> results = phs(tdb=40, tr=40, rh=33.85, v=0.3, met=150, clo=0.5, posture=2)
        >>> print(results)
        {'t_re': 37.5, 'd_lim_loss_50': 440, 'd_lim_loss_95': 298, 'd_lim_t_re': 480,
        'water_loss': 6166.0}
    """
    default_kwargs = {
        "i_mst": 0.38,
        "a_p": 0.54,
        "drink": 1,
        "weight": 75,
        "height": 1.8,
        "walk_sp": 0,
        "theta": 0,
        "acclimatized": 100,
        "duration": 480,
        "f_r": 0.97,
        "t_sk": 34.1,
        "t_cr": 36.8,
        "t_re": False,
        "t_cr_eq": False,
        "t_sk_t_cr_wg": 0.3,
        "sweat_rate": 0,
        "round": True,
    }
    kwargs = {**default_kwargs, **kwargs}

    i_mst = kwargs["i_mst"]
    a_p = kwargs["a_p"]
    drink = kwargs["drink"]
    weight = kwargs["weight"]
    height = kwargs["height"]
    walk_sp = kwargs["walk_sp"]
    theta = kwargs["theta"]
    acclimatized = kwargs["acclimatized"]
    duration = kwargs["duration"]
    f_r = kwargs["f_r"]
    t_sk = kwargs["t_sk"]
    t_cr = kwargs["t_cr"]
    t_re = kwargs["t_re"]
    t_cr_eq = kwargs["t_cr_eq"]
    t_sk_t_cr_wg = kwargs["t_sk_t_cr_wg"]
    sweat_rate = kwargs["sweat_rate"]

    p_a = p_sat(tdb) / 1000 * rh / 100

    check_standard_compliance(
        standard="ISO7933",
        tdb=tdb,
        tr=tr,
        v=v,
        rh=rh,
        met=met * body_surface_area(kwargs["weight"], kwargs["height"]),
        clo=clo,
    )

    if not t_re:
        t_re = t_cr
    if not t_cr_eq:
        t_cr_eq = t_cr

    (
        t_re,
        t_sk,
        t_cr,
        t_cr_eq,
        t_sk_t_cr_wg,
        sweat_rate,
        sw_tot_g,
        # d_lim_loss_50,
        # d_lim_loss_95,
        d_lim_t_re,
        wp,
        w_req,
    ) = phs_optimized(
        tdb,
        tr,
        v,
        p_a,
        met,
        clo,
        posture,
        wme,
        i_mst,
        a_p,
        drink,
        weight,
        height,
        walk_sp,
        theta,
        acclimatized,
        duration,
        f_r,
        t_sk,
        t_cr,
        t_re,
        t_cr_eq,
        t_sk_t_cr_wg,
    )

    if kwargs["round"]:
        return {
            # "d_lim_loss_50": round(d_lim_loss_50, 1),
            # "d_lim_loss_95": round(d_lim_loss_95, 1),
            "d_lim_t_re": round(d_lim_t_re, 1),
            "water_loss": round(sw_tot_g, 1),
            "t_re": round(t_re, 1),
            "t_cr": round(t_cr, 1),
            "t_sk": round(t_sk, 1),
            "t_cr_eq": round(t_cr_eq, 1),
            "t_sk_t_cr_wg": round(t_sk_t_cr_wg, 2),
            "water_loss_watt": round(sweat_rate, 1),
            "w": round(wp, 2),
            "w_req": round(w_req, 2),
        }
    else:
        return {
            "t_re": t_re,
            "t_sk": t_sk,
            "t_cr": t_cr,
            "t_cr_eq": t_cr_eq,
            "t_sk_t_cr_wg": t_sk_t_cr_wg,
            # "d_lim_loss_50": d_lim_loss_50,
            # "d_lim_loss_95": d_lim_loss_95,
            "d_lim_t_re": d_lim_t_re,
            "water_loss_watt": sweat_rate,
            "water_loss": sw_tot_g,
            "w": wp,
            "w_req": w_req,
        }


if __name__ == "__main__":
    plt.close("all")

    # check_model_output("two_nodes")
    check_model_output("phs")

if __name__ == "__plot__":
    plt.close("all")
