import dash
from dash import dcc
import dash_bootstrap_components as dbc

dash.register_page(__name__, title="About Page", name="About Page")

body_text = """
# Sports and Medicine Australia - Extreme Heat Policy

## Scope
This website in its current form provides recommendations for the most popular sports played in 
Australia as defined in the [Extreme Heat Policy v1.0 2021](https://www.baseballnsw.com.au/wp-content/uploads/2022/06/sma-extreme-heat-policy-2021-final.pdf), 
[issued by Sport Medicine Australia](https://sma.org.au/sma-unveils-new-extreme-heat-policy/). 

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

## Disclaimer and User Agreement
This application is intended for informational and educational purposes only. 
It visualizes and calculates heat stress risk for people playing sports based on meteorological data from [Norwegian Meteorological Institute](https://www.met.no/) 
and information provided in the [Extreme Heat Policy v1.0 2021](https://www.baseballnsw.com.au/wp-content/uploads/2022/06/sma-extreme-heat-policy-2021-final.pdf), 
[issued by Sport Medicine Australia](https://sma.org.au/sma-unveils-new-extreme-heat-policy/). 
It is not intended to provide medical advice or replace professional medical judgment, diagnosis, or treatment. 
The authors of this application do not take any responsibility for the accuracy, completeness, or reliability 
of the information presented. Users should always consult with a qualified healthcare professional for any 
questions regarding their health or medical conditions. By using this application, users acknowledge and 
agree that they assume full responsibility for their use of the information provided and that the authors 
of this application are not liable for any damages arising from the use or misuse of this application.

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
