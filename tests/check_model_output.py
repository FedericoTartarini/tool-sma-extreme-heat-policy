import math
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
from numba import jit
from pythermalcomfort.models import phs
from pythermalcomfort.psychrometrics import p_sat, p_sat_torr, t_mrt
from pythermalcomfort.utilities import v_relative

from my_app.utils import generate_regression_curves, calculate_comfort_indices_v1

psyc.SetUnitSystem(psyc.SI)

# configuration
max_rectal_temperature = 40
max_sweat_losses = 400
position = "standing"
min_threshold_temperature = 26
t_range = np.arange(
    min_threshold_temperature,
    step=(interval := 0.5),
    stop=43 + interval,
)
rh_range = np.arange(
    start=0,
    step=(interval := 0.5),
    stop=100 + interval,
)
globe_temperature = 0
globe_temperature_night = 3
wind_speed = 0.5
var_to_plot = {
    "t_cr",
}

# cat 1 = walking, cat 2 = brisk walking, cat 3 = cycling, cat 4 = rugby union, cat 5 = field hockey

# todo fixed globe of 10 for daytime and 3 for night
# todo fixed wind speed

# paper methods
# - how we selected the sports
# - how we estimated met and clo. Multiply met from table to get down to 7.5
# - how we defined wind speed and globe temperature (day night) and duration
# - how we used the PHS model
# - how we created the risk classifications based t_core a also sweating
# - a few words about the online tool

# results
# - cat walking, soccer, and cricket plot.
# - climate analysis all 7 capitals (left column scatter plot with risk, right monthly cum hours and number of days interrupted)

# paper discussion
# - how we used current evidence based to develop heat stress


cmaplist = ["#00AD7C", "#FFD039", "#E45A01", "#CB3327"]

# todo sydney, perth, and darwin
# todo assume full sun - instead take account cloud coverage to account for moderate and high cloud coverage
# todo for Sydney show the difference for fixing the air speed at 1m/s or using the wind speed from the TMY

# todo contact SMA we will need to create a version 2 of the policy (James and Ollie) we will need to show a screenshot of the application
# todo first publication in JSM
# todo create a working version of the application with the new code

people_profiles = {
    # 1: {
    #     "met": 4.7,
    #     "clo": 0.55,
    #     "v": wind_speed,
    #     "tg": globe_temperature,
    #     "duration": 180,
    #     "t_cr": [36.8, 37.2, 38.4, 39.5, 50],
    #     "water_loss": [825 / 45 * 180, 4000, 4100, 4200, 4300],
    # },
    # 2: {
    #     "met": 6.4,
    #     "clo": 0.5,
    #     "v": wind_speed,
    #     "tg": globe_temperature,
    #     "duration": 60,
    #     "t_cr": [36.8, 38, 39.5, 40, 50],
    #     "water_loss": [850 / 45 * 60, 2900, 3000, 3100, 3200],
    # },
    3: {
        "met": 7.2,
        "clo": 0.5,
        "v": wind_speed,
        "tg": globe_temperature,
        "duration": 45,
        "t_cr": [36.8, 38, 39.5, 40, 50],
        "water_loss": [850, 2900, 3000, 3100, 3200],
    },
    # 4: {
    #     "met": 7.3,
    #     "clo": 0.5,
    #     "v": wind_speed,
    #     "tg": globe_temperature,
    #     "duration": 45,
    #     "t_cr": [36.8, 38, 39.5, 40, 50],
    #     "water_loss": [850, 2900, 3000, 3100, 3200],
    # },
    # 5: {
    #     "met": 7.5,
    #     "clo": 0.5,
    #     "v": wind_speed,
    #     "tg": globe_temperature,
    #     "duration": 45,
    #     "t_cr": [36.8, 38, 39.5, 40, 50],
    #     "water_loss": [850, 2900, 3000, 3100, 3200],
    # },
}

fig_directory = os.path.join(os.getcwd(), "tests", "figures")
###############################


def plot_rh_lines(ax, rh_val=1, t_array=np.arange(0, 40, 0.5)):
    hr_array = []
    for t, rh in zip(t_array, np.ones(len(t_array)) * rh_val):
        hr_array.append(psyc.GetHumRatioFromRelHum(t, rh, 101325) * 1000)
    ax.plot(t_array, hr_array, c="k", lw=0.2)
    ax.text(
        20,
        psyc.GetHumRatioFromRelHum(20, rh_val, 101325) * 1000,
        f"{rh_val * 100}%",
        va="center",
        ha="center",
        rotation=20,
        fontsize=6,
    )


@jit(nopython=True)
def two_nodes_optimized(
    tdb,
    tr,
    v,
    met,
    clo,
    vapor_pressure,
    wme,
    body_surface_area,
    p_atmospheric,
    body_position,
    calculate_ce=False,
    max_skin_blood_flow=90,
    max_sweating=500,
    w_max=False,
):
    # Initial variables as defined in the ASHRAE 55-2020
    air_speed = max(v, 0.1)
    k_clo = 0.25
    body_weight = 70  # body weight in kg
    met_factor = 58.2  # met conversion factor
    sbc = 0.000000056697  # Stefan-Boltzmann constant (W/m2K4)
    c_sw = 170  # driving coefficient for regulatory sweating
    c_dil = 200  # driving coefficient for vasodilation ashrae says 50 see page 9.19
    c_str = 0.5  # driving coefficient for vasoconstriction

    temp_skin_neutral = 33.7
    temp_core_neutral = 36.8
    alfa = 0.1
    temp_body_neutral = alfa * temp_skin_neutral + (1 - alfa) * temp_core_neutral
    skin_blood_flow_neutral = 6.3

    t_skin = temp_skin_neutral
    t_core = temp_core_neutral
    m_bl = skin_blood_flow_neutral

    # initialize some variables
    e_skin = 0.1 * met  # total evaporative heat loss, W
    q_sensible = 0  # total sensible heat loss, W
    w = 0  # skin wettedness
    _set = 0  # standard effective temperature
    e_rsw = 0  # heat lost by vaporization sweat
    e_diff = 0  # vapor diffusion through skin
    e_max = 0  # maximum evaporative capacity
    m_rsw = 0  # regulatory sweating
    q_res = 0  # heat loss due to respiration
    et = 0  # effective temperature
    e_req = 0  # evaporative heat loss required for tmp regulation
    r_ea = 0
    r_ecl = 0
    c_res = 0  # convective heat loss respiration

    pressure_in_atmospheres = p_atmospheric / 101325
    length_time_simulation = 60  # length time simulation
    n_simulation = 0

    r_clo = 0.155 * clo  # thermal resistance of clothing, C M^2 /W
    f_a_cl = 1.0 + 0.15 * clo  # increase in body surface area due to clothing
    lr = 2.2 / pressure_in_atmospheres  # Lewis ratio
    rm = (met - wme) * met_factor  # metabolic rate
    m = met * met_factor  # metabolic rate

    e_comfort = 0.42 * (rm - met_factor)  # evaporative heat loss during comfort
    if e_comfort < 0:
        e_comfort = 0

    i_cl = 1.0  # permeation efficiency of water vapour naked skin
    if clo > 0:
        i_cl = 0.45  # permeation efficiency of water vapour through the clothing layer

    if not w_max:  # if the user did not pass a value of w_max
        w_max = 0.38 * pow(air_speed, -0.29)  # critical skin wettedness naked
        if clo > 0:
            w_max = 0.59 * pow(air_speed, -0.08)  # critical skin wettedness clothed

    # h_cc corrected convective heat transfer coefficient
    h_cc = 3.0 * pow(pressure_in_atmospheres, 0.53)
    # h_fc forced convective heat transfer coefficient, W/(m2 °C)
    h_fc = 8.600001 * pow((air_speed * pressure_in_atmospheres), 0.53)
    h_cc = max(h_cc, h_fc)
    if not calculate_ce and met > 0.85:
        h_c_met = 5.66 * (met - 0.85) ** 0.39
        h_cc = max(h_cc, h_c_met)

    h_r = 4.7  # linearized radiative heat transfer coefficient
    h_t = h_r + h_cc  # sum of convective and radiant heat transfer coefficient W/(m2*K)
    r_a = 1.0 / (f_a_cl * h_t)  # resistance of air layer to dry heat
    t_op = (h_r * tr + h_cc * tdb) / h_t  # operative temperature

    t_body = alfa * t_skin + (1 - alfa) * t_core  # mean body temperature, °C

    # respiration
    q_res = 0.0023 * m * (44.0 - vapor_pressure)  # latent heat loss due to respiration
    c_res = 0.0014 * m * (34.0 - tdb)  # sensible convective heat loss respiration

    while n_simulation < length_time_simulation:

        n_simulation += 1

        iteration_limit = 150  # for following while loop
        # t_cl temperature of the outer surface of clothing
        t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo)  # initial guess
        n_iterations = 0
        tc_converged = False

        while not tc_converged:

            # 0.95 is the clothing emissivity from ASHRAE fundamentals Ch. 9.7 Eq. 35
            if body_position == "sitting":
                # 0.7 ratio between radiation area of the body and the body area
                h_r = 4.0 * 0.95 * sbc * ((t_cl + tr) / 2.0 + 273.15) ** 3.0 * 0.7
            else:  # if standing
                # 0.73 ratio between radiation area of the body and the body area
                h_r = 4.0 * 0.95 * sbc * ((t_cl + tr) / 2.0 + 273.15) ** 3.0 * 0.73
            h_t = h_r + h_cc
            r_a = 1.0 / (f_a_cl * h_t)
            t_op = (h_r * tr + h_cc * tdb) / h_t
            t_cl_new = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo)
            if abs(t_cl_new - t_cl) <= 0.01:
                tc_converged = True
            t_cl = t_cl_new
            n_iterations += 1

            if n_iterations > iteration_limit:
                raise StopIteration("Max iterations exceeded")

        q_sensible = (t_skin - t_op) / (r_a + r_clo)  # total sensible heat loss, W
        # hf_cs rate of energy transport between core and skin, W
        # 5.28 is the average body tissue conductance in W/(m2 C)
        # 1.163 is the thermal capacity of blood in Wh/(L C)
        hf_cs = (t_core - t_skin) * (5.28 + 1.163 * m_bl)
        s_core = m - hf_cs - q_res - c_res - wme  # rate of energy storage in the core
        s_skin = hf_cs - q_sensible - e_skin  # rate of energy storage in the skin
        tc_sk = 0.97 * alfa * body_weight  # thermal capacity skin
        tc_cr = 0.97 * (1 - alfa) * body_weight  # thermal capacity core
        d_t_sk = (s_skin * body_surface_area) / (
            tc_sk * 60.0
        )  # rate of change skin temperature °C per minute
        d_t_cr = (
            s_core * body_surface_area / (tc_cr * 60.0)
        )  # rate of change core temperature °C per minute
        t_skin = t_skin + d_t_sk
        t_core = t_core + d_t_cr
        t_body = alfa * t_skin + (1 - alfa) * t_core
        # sk_sig thermoregulatory control signal from the skin
        sk_sig = t_skin - temp_skin_neutral
        warm_sk = (sk_sig > 0) * sk_sig  # vasodilation signal
        colds = ((-1.0 * sk_sig) > 0) * (-1.0 * sk_sig)  # vasoconstriction signal
        # c_reg_sig thermoregulatory control signal from the skin, °C
        c_reg_sig = t_core - temp_core_neutral
        # c_warm vasodilation signal
        c_warm = (c_reg_sig > 0) * c_reg_sig
        # c_cold vasoconstriction signal
        c_cold = ((-1.0 * c_reg_sig) > 0) * (-1.0 * c_reg_sig)
        # bd_sig thermoregulatory control signal from the body
        bd_sig = t_body - temp_body_neutral
        warm_b = (bd_sig > 0) * bd_sig
        m_bl = (skin_blood_flow_neutral + c_dil * c_warm) / (1 + c_str * colds)
        if m_bl > max_skin_blood_flow:
            m_bl = max_skin_blood_flow
        if m_bl < 0.5:
            m_bl = 0.5
        m_rsw = c_sw * warm_b * math.exp(warm_sk / 10.7)  # regulatory sweating
        if m_rsw > max_sweating:
            m_rsw = max_sweating
        e_rsw = 0.68 * m_rsw  # heat lost by vaporization sweat
        r_ea = 1.0 / (lr * f_a_cl * h_cc)  # evaporative resistance air layer
        r_ecl = r_clo / (lr * i_cl)
        e_req = (
            rm - q_res - c_res - q_sensible
        )  # evaporative heat loss required for tmp regulation
        e_max = (math.exp(18.6686 - 4030.183 / (t_skin + 235.0)) - vapor_pressure) / (
            r_ea + r_ecl
        )
        p_rsw = e_rsw / e_max  # ratio heat loss sweating to max heat loss sweating
        w = 0.06 + 0.94 * p_rsw  # skin wetness
        e_diff = w * e_max - e_rsw  # vapor diffusion through skin
        if w > w_max:
            w = w_max
            p_rsw = w_max / 0.94
            e_rsw = p_rsw * e_max
            e_diff = 0.06 * (1.0 - p_rsw) * e_max
        if e_max < 0:
            e_diff = 0
            e_rsw = 0
            w = w_max
        e_skin = (
            e_rsw + e_diff
        )  # total evaporative heat loss sweating and vapor diffusion
        m_rsw = (
            e_rsw / 0.68
        )  # back calculating the mass of regulatory sweating as a function of e_rsw
        met_shivering = 19.4 * colds * c_cold  # met shivering W/m2
        m = rm + met_shivering
        alfa = 0.0417737 + 0.7451833 / (m_bl + 0.585417)

    q_skin = q_sensible + e_skin  # total heat loss from skin, W
    # p_s_sk saturation vapour pressure of water of the skin
    p_s_sk = math.exp(18.6686 - 4030.183 / (t_skin + 235.0))

    # standard environment - where _s at end of the variable names stands for standard
    h_r_s = h_r  # standard environment radiative heat transfer coefficient

    h_c_s = 3.0 * pow(pressure_in_atmospheres, 0.53)
    if not calculate_ce and met > 0.85:
        h_c_met = 5.66 * (met - 0.85) ** 0.39
        h_c_s = max(h_c_s, h_c_met)
    if h_c_s < 3.0:
        h_c_s = 3.0

    h_t_s = (
        h_c_s + h_r_s
    )  # sum of convective and radiant heat transfer coefficient W/(m2*K)
    r_clo_s = (
        1.52 / ((met - wme / met_factor) + 0.6944) - 0.1835
    )  # thermal resistance of clothing, °C M^2 /W
    r_cl_s = 0.155 * r_clo_s  # thermal insulation of the clothing in M2K/W
    f_a_cl_s = 1.0 + k_clo * r_clo_s  # increase in body surface area due to clothing
    f_cl_s = 1.0 / (
        1.0 + 0.155 * f_a_cl_s * h_t_s * r_clo_s
    )  # ratio of surface clothed body over nude body
    i_m_s = 0.45  # permeation efficiency of water vapour through the clothing layer
    i_cl_s = (
        i_m_s * h_c_s / h_t_s * (1 - f_cl_s) / (h_c_s / h_t_s - f_cl_s * i_m_s)
    )  # clothing vapor permeation efficiency
    r_a_s = 1.0 / (f_a_cl_s * h_t_s)  # resistance of air layer to dry heat
    r_ea_s = 1.0 / (lr * f_a_cl_s * h_c_s)
    r_ecl_s = r_cl_s / (lr * i_cl_s)
    h_d_s = 1.0 / (r_a_s + r_cl_s)
    h_e_s = 1.0 / (r_ea_s + r_ecl_s)

    # calculate Standard Effective Temperature (SET)
    delta = 0.0001
    dx = 100.0
    set_old = round(t_skin - q_skin / h_d_s, 2)
    while abs(dx) > 0.01:
        err_1 = (
            q_skin
            - h_d_s * (t_skin - set_old)
            - w
            * h_e_s
            * (p_s_sk - 0.5 * (math.exp(18.6686 - 4030.183 / (set_old + 235.0))))
        )
        err_2 = (
            q_skin
            - h_d_s * (t_skin - (set_old + delta))
            - w
            * h_e_s
            * (
                p_s_sk
                - 0.5 * (math.exp(18.6686 - 4030.183 / (set_old + delta + 235.0)))
            )
        )
        _set = set_old - delta * err_1 / (err_2 - err_1)
        dx = _set - set_old
        set_old = _set

    # calculate Effective Temperature (ET)
    h_d = 1 / (r_a + r_clo)
    h_e = 1 / (r_ea + r_ecl)
    et_old = t_skin - q_skin / h_d
    delta = 0.0001
    dx = 100.0
    while abs(dx) > 0.01:
        err_1 = (
            q_skin
            - h_d * (t_skin - et_old)
            - w
            * h_e
            * (p_s_sk - 0.5 * (math.exp(18.6686 - 4030.183 / (et_old + 235.0))))
        )
        err_2 = (
            q_skin
            - h_d * (t_skin - (et_old + delta))
            - w
            * h_e
            * (p_s_sk - 0.5 * (math.exp(18.6686 - 4030.183 / (et_old + delta + 235.0))))
        )
        et = et_old - delta * err_1 / (err_2 - err_1)
        dx = et - et_old
        et_old = et

    tbm_l = (0.194 / 58.15) * rm + 36.301  # lower limit for evaporative regulation
    tbm_h = (0.347 / 58.15) * rm + 36.669  # upper limit for evaporative regulation

    t_sens = 0.4685 * (t_body - tbm_l)  # predicted thermal sensation
    if (t_body >= tbm_l) & (t_body < tbm_h):
        t_sens = w_max * 4.7 * (t_body - tbm_l) / (tbm_h - tbm_l)
    elif t_body >= tbm_h:
        t_sens = w_max * 4.7 + 0.4685 * (t_body - tbm_h)

    disc = (
        4.7 * (e_rsw - e_comfort) / (e_max * w_max - e_comfort - e_diff)
    )  # predicted thermal discomfort
    if disc <= 0:
        disc = t_sens

    # PMV Gagge
    pmv_gagge = (0.303 * math.exp(-0.036 * m) + 0.028) * (e_req - e_comfort - e_diff)

    # PMV SET
    dry_set = h_d_s * (t_skin - _set)
    e_req_set = rm - c_res - q_res - dry_set
    pmv_set = (0.303 * math.exp(-0.036 * m) + 0.028) * (e_req_set - e_comfort - e_diff)

    # Predicted  Percent  Satisfied  With  the  Level  of  Air  Movement
    ps = 100 * (1.13 * (t_op**0.5) - 0.24 * t_op + 2.7 * (v**0.5) - 0.99 * v)

    return (
        _set,
        e_skin,
        e_rsw,
        e_max,
        q_sensible,
        q_skin,
        q_res,
        t_core,
        t_skin,
        m_bl,
        m_rsw,
        w,
        w_max,
        et,
        pmv_gagge,
        pmv_set,
        disc,
        t_sens,
    )


def two_nodes(
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme=0,
    body_surface_area=1.8258,
    p_atmospheric=101325,
    body_position="standing",
    max_skin_blood_flow=90,
    **kwargs,
):
    """Two-node model of human temperature regulation Gagge et al. (1986).

    [10]_ This model it can be used to calculate a variety of indices,
    including:

    * Gagge's version of Fanger's Predicted Mean Vote (PMV). This function uses the Fanger's PMV equations but it replaces the heat loss and gain terms with those calculated by the two node model developed by Gagge et al. (1986) [10]_.

    * PMV SET and the predicted thermal sensation based on SET [10]_. This function is similar in all aspects to the :py:meth:`pythermalcomfort.models.pmv_gagge` however, it uses the :py:meth:`pythermalcomfort.models.set` equation to calculate the dry heat loss by convection.

    * Thermal discomfort (DISC) as the relative thermoregulatory strain necessary to restore a state of comfort and thermal equilibrium by sweating [10]_. DISC is described numerically as: comfortable and pleasant (0), slightly uncomfortable but acceptable (1), uncomfortable and unpleasant (2), very uncomfortable (3), limited tolerance (4), and intolerable (S). The range of each category is ± 0.5 numerically. In the cold, the classical negative category descriptions used for Fanger's PMV apply [10]_.

    * Heat gains and losses via convection, radiation and conduction.

    * The Standard Effective Temperature (SET)

    * The New Effective Temperature (ET)

    * The Predicted  Thermal  Sensation  (TSENS)

    * The Predicted  Percent  Dissatisfied  Due  to  Draft  (PD)

    * Predicted  Percent  Satisfied  With  the  Level  of  Air  Movement"   (PS)

    Parameters
    ----------
    tdb : float or array-like
        dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
    tr : float or array-like
        mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
    v : float or array-like
        air speed, default in [m/s] in [fps] if `units` = 'IP'
    rh : float or array-like
        relative humidity, [%]
    met : float or array-like
        metabolic rate, [met]
    clo : float or array-like
        clothing insulation, [clo]
    wme : float or array-like
        external work, [met] default 0
    body_surface_area : float
        body surface area, default value 1.8258 [m2] in [ft2] if `units` = 'IP'

        The body surface area can be calculated using the function
        :py:meth:`pythermalcomfort.utilities.body_surface_area`.
    p_atmospheric : float
        atmospheric pressure, default value 101325 [Pa] in [atm] if `units` = 'IP'
    body_position: str default="standing" or array-like
        select either "sitting" or "standing"
    max_skin_blood_flow : float
        maximum blood flow from the core to the skin, [kg/h/m2] default 80

    Other Parameters
    ----------------
    round: boolean, default True
        if True rounds output values, if False it does not round them

    Returns
    -------
    e_skin : float or array-like
        Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
    e_rsw : float or array-like
        Rate of evaporative heat loss from sweat evaporation, [W/m2]
    e_diff : float or array-like
        Rate of evaporative heat loss from moisture diffused through the skin, [W/m2]
    e_max : float or array-like
        Maximum rate of evaporative heat loss from skin, [W/m2]
    q_sensible : float or array-like
        Sensible heat loss from skin, [W/m2]
    q_skin : float or array-like
        Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
    q_res : float or array-like
        Total rate of heat loss through respiration, [W/m2]
    t_core : float or array-like
        Core temperature, [°C]
    t_skin : float or array-like
        Skin temperature, [°C]
    m_bl : float or array-like
        Skin blood flow, [kg/h/m2]
    m_rsw : float or array-like
        Rate at which regulatory sweat is generated, [kg/h/m2]
    w : float or array-like
        Skin wettedness, adimensional. Ranges from 0 and 1.
    w_max : float or array-like
        Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
    set : float or array-like
        Standard Effective Temperature (SET)
    et : float or array-like
        New Effective Temperature (ET)
    pmv_gagge : float or array-like
        PMV Gagge
    pmv_set : float or array-like
        PMV SET
    pd : float or array-like
        Predicted  Percent  Dissatisfied  Due  to  Draft"
    ps : float or array-like
        Predicted  Percent  Satisfied  With  the  Level  of  Air  Movement
    disc : float or array-like
        Thermal discomfort
    t_sens : float or array-like
        Predicted  Thermal  Sensation

    Examples
    --------
    .. code-block:: python

        >>> from pythermalcomfort.models import two_nodes
        >>> print(two_nodes(tdb=25, tr=25, v=0.3, rh=50, met=1.2, clo=0.5))
        {'e_skin': 15.8, 'e_rsw': 6.5, 'e_diff': 9.3, ... }
        >>> print(two_nodes(tdb=[25, 25], tr=25, v=0.3, rh=50, met=1.2, clo=0.5))
        {'e_skin': array([15.8, 15.8]), 'e_rsw': array([6.5, 6.5]), ... }
    """
    default_kwargs = {
        "round": True,
        "calculate_ce": False,
        "max_sweating": 500,
        "w_max": False,
    }
    kwargs = {**default_kwargs, **kwargs}

    tdb = np.array(tdb)
    tr = np.array(tr)
    v = np.array(v)
    rh = np.array(rh)
    met = np.array(met)
    clo = np.array(clo)
    wme = np.array(wme)
    body_position = np.array(body_position)

    vapor_pressure = rh * p_sat_torr(tdb) / 100

    (
        _set,
        e_skin,
        e_rsw,
        e_max,
        q_sensible,
        q_skin,
        q_res,
        t_core,
        t_skin,
        m_bl,
        m_rsw,
        w,
        w_max,
        et,
        pmv_gagge,
        pmv_set,
        disc,
        t_sens,
    ) = np.vectorize(two_nodes_optimized, cache=True)(
        tdb=tdb,
        tr=tr,
        v=v,
        met=met,
        clo=clo,
        vapor_pressure=vapor_pressure,
        wme=wme,
        body_surface_area=body_surface_area,
        p_atmospheric=p_atmospheric,
        body_position=body_position,
        calculate_ce=kwargs["calculate_ce"],
        max_skin_blood_flow=max_skin_blood_flow,
        max_sweating=kwargs["max_sweating"],
        w_max=kwargs["w_max"],
    )

    output = {
        "e_skin": e_skin,
        "e_rsw": e_rsw,
        "e_max": e_max,
        "q_sensible": q_sensible,
        "q_skin": q_skin,
        "q_res": q_res,
        "t_core": t_core,
        "t_skin": t_skin,
        "m_bl": m_bl,
        "m_rsw": m_rsw,
        "w": w,
        "w_max": w_max,
        "_set": _set,
        "et": et,
        "pmv_gagge": pmv_gagge,
        "pmv_set": pmv_set,
        "disc": disc,
        "t_sens": t_sens,
    }

    for key in output.keys():
        # round the results if needed
        if kwargs["round"]:
            output[key] = np.around(output[key], 1)

    return output


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


# t_mrt(42, 30, 1)
# print(
#     phs(
#         tdb=34,
#         tr=34,
#         v=0.6,
#         rh=50,
#         met=8.3 * 58.15,
#         clo=0.576,
#         posture=position,
#         duration=duration,
#         round=False,
#     )["t_cr"]
# )
# print(
#     two_nodes(
#         tdb=34,
#         tr=34,
#         v=0.6,
#         rh=50,
#         met=8.3,
#         clo=0.576,
#         posture=position,
#         round=False,
#         w_max=1,
#     )["t_core"]
# )


def generate_t_rh_combinations():
    all_combinations = list(product(t_range, rh_range))
    return pd.DataFrame(all_combinations, columns=["t", "rh"])


def plot_sma_lines(sport_cat, main_ax, colors, reset_coordinates=True):
    sma_lines = generate_regression_curves(sport_cat)
    sma_ax = main_ax.twinx()
    if reset_coordinates:
        x = np.arange(len(t_range)) + 0.5
    else:
        x = t_range
    sma_ax.plot(
        x,
        sma_lines[1](t_range),
        c=colors[1],
        lw=2,
        path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
    )
    sma_ax.plot(
        x,
        sma_lines[2](t_range),
        c=colors[2],
        lw=2,
        path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
    )
    sma_ax.plot(
        x,
        sma_lines[3](t_range),
        c=colors[3],
        lw=2,
        path_effects=[pe.Stroke(linewidth=5, foreground="k"), pe.Normal()],
    )
    sma_ax.set(ylim=(0, 100))


def calculate_results(
    values,
    model,
    data=pd.DataFrame(),
    const_t_globe=True,
    constant_wind=True,
    sport_cat=3,
    night_day=False,
):
    if data.shape == (0, 0):
        data = generate_t_rh_combinations()

    if constant_wind:
        data["v"] = values["v"]
    else:
        data["v"] = data["v"] * 0.67 * (1.1 / 10) ** 0.25
        data["v"] = v_relative(data["v"], values["met"])

    if const_t_globe:
        data["mrt"] = t_mrt(
            values["tg"] + data["t"], data["t"], data["v"], standard="iso"
        )

    if night_day:
        data.loc["elevation" < 0, "mrt"] = t_mrt(
            values["tg"] + data["t"], data["t"], data["v"], standard="iso"
        )

    results_globe_temperature = []
    for ix, row in data.iterrows():

        def calculate_globe_temperature(x):
            return t_mrt(x + row["t"], row["t"], row["v"], standard="iso") - row["mrt"]

        results_globe_temperature.append(
            scipy.optimize.brentq(calculate_globe_temperature, 0.0, 200)
        )
    print(
        pd.DataFrame(results_globe_temperature, columns=["tg"]).describe(
            percentiles=[0.75, 0.85, 0.95, 0.99]
        )
    )
    data["tg"] = results_globe_temperature

    # print(data["mrt"].describe())

    if model == "two_node":
        r = two_nodes(
            tdb=data["t"],
            tr=data["mrt"],
            rh=data["rh"],
            met=values["met"],
            clo=values["clo"],
            v=data["v"],
            round=False,
            w_max=1,
        )

        df_results = pd.DataFrame(r)
        df_results = df_results.rename(columns={"t_core": "t_cr"})
        df_results["t"] = data["t"]
        df_results["rh"] = data["rh"]
        df_results["tg"] = data["tg"]

    elif model == "phs":
        results = []
        for ix, row in data.iterrows():
            r = phs(
                tdb=row.t,
                tr=row.mrt,
                v=row.v,
                rh=row.rh,
                met=values["met"] * 58.15,
                clo=values["clo"],
                posture=position,
                duration=values["duration"],
                round=False,
                acclimatized=100,
                i_mst=0.4,
            )
            r["t"] = row.t
            r["rh"] = row.rh
            r["mrt"] = row.mrt
            r["v"] = row.v
            r["tg"] = row.tg
            results.append(r)

        df_results = pd.DataFrame(results)

        var = "t_cr"
        df_results["risk_class"] = pd.cut(
            df_results[var],
            values[var],
            labels=False,
            # right=False,
        )
        df_results.loc[
            df_results["water_loss"] < min(values["water_loss"]), "risk_class"
        ] = 0
        df_results["risk_class_label"] = df_results["risk_class"].map(
            {
                0: "low",
                1: "moderate",
                2: "high",
                3: "extreme",
            }
        )

    elif model == "sma":
        df_results = calculate_comfort_indices_v1(
            data.rename(columns={"t": "tdb"}), sport_cat
        )
        df_results = df_results.rename(
            columns={"tdb": "t", "risk_value": "risk_class", "risk": "risk_class_label"}
        )

    return df_results


def check_model_output(model):
    for sport_cat, values in people_profiles.items():

        df_results = calculate_results(values, model)

        for var in var_to_plot:
            plot_heatmap(df_results, sport_cat, var)

            plt.title(
                f"{model};{values['duration']=};{var=};{sport_cat=};"
                f" met={values['met']};"
                f" clo={values['clo']};v={values['v']};tg={values['tg']}"
            )
            plt.tight_layout()
            plt.savefig(
                os.path.join(
                    fig_directory,
                    f"{model}_sport_cat_{sport_cat}_{var}_{globe_temperature}_{wind_speed}.png",
                )
            )


def plot_heatmap(df_results, sport_cat, var):
    f, ax = plt.subplots(figsize=(9, 7))
    pivot = df_results.pivot("rh", "t", var).sort_index(ascending=False)
    pivot_water_loss = df_results.pivot("rh", "t", "water_loss").sort_index(
        ascending=False
    )
    cmap = plt.cm.magma  # define the colormap
    cmap = mpl.colors.LinearSegmentedColormap.from_list("Custom cmap", cmaplist, cmap.N)
    limits = people_profiles[sport_cat]["water_loss"]
    norm = mpl.colors.BoundaryNorm(limits, cmap.N)
    hm = sns.heatmap(
        pivot_water_loss,
        cmap=cmap,
        norm=norm,
        cbar=False,
        mask=pivot > 40,
    )
    # define the bins and normalize
    limits = people_profiles[sport_cat][var]
    norm = mpl.colors.BoundaryNorm(limits, cmap.N)
    hm = sns.heatmap(
        pivot,
        # annot=True,
        # fmt=".1f",
        vmin=min(limits),
        vmax=max(limits),
        mask=pivot_water_loss < min(people_profiles[sport_cat]["water_loss"]),
        cmap=cmap,
        norm=norm,
    )
    plot_sma_lines(sport_cat, ax, cmaplist)

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
        data=df_epw,
        constant_wind=const_wind,
        const_t_globe=const_tg,
        sport_cat=sport_cat,
    )

    f, axs = plt.subplots(4, 1, constrained_layout=True, figsize=(7, 9))
    plt.suptitle(f"{epw_file_name} - {model} - {const_wind=} - {const_tg=}")

    print(df_results[df_results.t > min_threshold_temperature]["tg"].describe())

    # cumulative number of hours in each risk category
    ax = axs[0]
    df_results["month"] = df_epw["month"].values
    df_results["day"] = df_epw["day"].values
    df_extreme_days = (
        df_results[df_results.t > min_threshold_temperature]
        .groupby(["month", "day"])["risk_class"]
        .max()
    )
    df_extreme_days = df_extreme_days[df_extreme_days == 3].reset_index()
    df_extreme_days = df_extreme_days.groupby("month")["day"].count()
    df_plot = (
        df_results[df_results.t > min_threshold_temperature]
        .groupby(["month", "risk_class"])["risk_class"]
        .count()
        .unstack("risk_class")
    )
    for risk in range(4):
        if risk not in df_plot.columns:
            df_plot[risk] = 0
    df_plot = df_plot[np.arange(1, 4, 1)]
    df_plot.plot(kind="bar", stacked=True, color=cmaplist[1:], ax=ax, legend=False)
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
        df_results[df_results.t > min_threshold_temperature]
        .groupby(["hour", "risk_class"])["risk_class"]
        .count()
        .unstack("risk_class")
    )
    for risk in range(4):
        if risk not in df_plot.columns:
            df_plot[risk] = 0
    df_plot = df_plot[np.arange(1, 4, 1)]
    df_plot.plot(kind="bar", stacked=True, color=cmaplist[1:], ax=ax, legend=False)
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
        x=df_results[df_results.t > min_threshold_temperature]["risk_class_label"],
        ax=ax,
        palette=cmaplist,
        order=["low", "moderate", "high", "extreme"],
    )
    df_text = (
        df_results[df_results.t > min_threshold_temperature]
        .groupby("risk_class")["risk_class"]
        .count()
    )
    for ix, val in enumerate(df_text):
        ax.text(df_text.index[ix], 100, ha="center", va="bottom", s=val)
    ax.set(
        ylabel="hours",
        xlabel="risk class",
        title=f"only for t>{min_threshold_temperature}",
    )
    ax = axs[3]
    if df_extreme_days.shape[0] > 0:
        sns.barplot(
            data=df_extreme_days.reset_index(),
            x="month",
            y="day",
            ax=ax,
            color=cmaplist[-1],
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
            fig_directory,
            f"climate_analysis_tg_const_{const_tg}_v_const_{const_wind}_{epw_file_name.split('/')[-1].replace('.pkl.gz', '')}_{model}.png",
        ),
        dpi=300,
    )


if __name__ == "__main__":
    plt.close("all")

    # check_model_output("two_node")
    check_model_output("phs")

if __name__ == "__plot__":

    pathlist = Path("tests/weather").glob("**/*.pkl.gz")

    for path in pathlist:
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
        values = people_profiles[sport_cat]
        limits = people_profiles[sport_cat][var]

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
        df_epw = df_epw[df_epw.t > min_threshold_temperature]

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
                    fig_directory,
                    f"climate_data_on_risk_{epw_file_name.split('/')[-1].replace('.pkl.gz', '')}_{model}.png",
                )
            )
