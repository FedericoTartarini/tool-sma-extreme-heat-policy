import dash
from dash import dcc
import dash_bootstrap_components as dbc

dash.register_page(__name__, title="About Page", name="About Page")

body_text = """
# Extreme Heat Policy

## Scope
This website in its current form provides recommendations only for the most popular sports played in Australia as defined in the 
Extreme Heat Policy v1.0 2021, issued by Sport Medicine Australia.

## Introduction

The [2021 SMA Extreme Heat Policy](https://sma.org.au/sma-site-content/uploads/2021/02/SMA-Extreme-Heat-Policy-2021-Final.pdf) 
utilises the latest published research evidence to inform:
 * a biophysical model for predicting heat stress risk; 
 * recommended cooling strategies that can be used to optimally mitigate heat stress risk. 
 
The new policy also adopts a continuous
approach to defining heat stress risk thresholds in place of stepwise categories and covers gaps
in the previous policy for conditions that often occur in many states and territories that are very
hot (35-40˚C) but dry (Relative humidity lower than 10%), which yield relatively low dew point temperatures yet induce
high levels of sweating and physiological strain, particularly during exercise. A broad
differentiation between the thermal effects of activity levels and clothing/equipment worn
across a range of popular sports in Australia is also provided.

## Aim
The aim of this policy is to provide evidence-based guidance for protecting the health of those
participating in sport and physical activity from the potentially ill effects of extreme heat in the
summer, while ensuring that play is not unnecessarily interrupted. As new research findings
emerge, the policy will be updated accordingly. Intended users are sporting administrators,
coaches and sports medical teams responsible for the safety and wellbeing of people engaging
in sport and physical activity in hot weather, as well as individuals wishing to manage heat
stress risk during planned training activities.

## Disclaimer
The information in this policy is general. Reading or using this policy is not the same as
getting medical advice from your doctor or health professional. All reasonable attempts have
been made to ensure the information is accurate. However, SMA is not responsible for any
loss, injury, claim or damage that may result from using or applying the information in this
policy. The information in this policy should be considered and interpreted in the context of
other risk management, insurance, governance and compliance frameworks and obligations
relevant to sporting organisations. Familiarity with relevant International Sports Federation
(ISF), National Sporting Organisation (NSO) and State Sporting Organisation (SSO) policies
and requirements is essential to enable appropriate interpretation and application of the
information in this policy.

### Attributions
#### Icons
Icons created by:
* [Pixel perfect - Flaticon](https://www.flaticon.com/free-icons/tshirt), 
* [Freepik - Flaticon](https://www.flaticon.com/free-icons/water)
* [Icongeek26 - Flaticon](https://www.flaticon.com/free-icons/tshirt)
* [Flat Icons Design - Flaticon](https://www.flaticon.com/free-icons/music-and-multimedi)
* [Flat Icons Design - Flaticon](https://www.flaticon.com/free-icons/music-and-multimedi)
"""

layout = dbc.Container(
    dcc.Markdown(body_text),
    className="p-2",
)
