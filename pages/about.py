import dash
from dash import dcc
import dash_bootstrap_components as dbc

dash.register_page(__name__, title="About Page", name="About Page")

body_text = """
# Sports and Medicine Australia - Extreme Heat Policy

## Scope
This website in its current form provides recommendations only for the most popular sports played in Australia as defined in the 
[Extreme Heat Policy v1.0 2021](https://sma.org.au/wp-content/uploads/2021/02/SMA-Extreme-Heat-Policy-2021-Final.pdf), 
[issued by Sport Medicine Australia](https://sma.org.au/sma-unveils-new-extreme-heat-policy/). 

## Introduction

`The [2021 SMA Extreme Heat Policy](https://sma.org.au/wp-content/uploads/2021/02/SMA-Extreme-Heat-Policy-2021-Final.pdf) 
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

## TERMS AND CONDITIONS
 
This Sports and Medicine Australia (SMA) - Extreme Heat Policy website (https://sma-heat-policy.sydney.edu.au/) provides general information for informational and educational purposes only about heat stress risk for people engaged in various types of sports at a particular location.
The Heat and Health Research Incubator at the University of Sydney (“University”) created and provided this website. 
A specific heat stress risk scale is displayed using a physiological model that provides a risk calculation for heat stress, including providing evidence-based cooling strategies.
 
## MEDICAL DISCLAIMER
No medical advice is provided in the information accessed through this website. 
If you believe you or any other individual has a medical emergency or any other health problem, you should promptly call an emergency medical service provider or consult your physician or healthcare provider. 
You should seek immediate medical attention if you think you may be suffering from any medical condition.
 
## WARRANTY AND GENERAL DISCLAIMER
To the maximum extent permitted by law, including the Australian Consumer Law, we make no warranties or representations about this website or its content, including but not limited to warranties or representations that they will be complete, accurate or up-to-date, that access will be uninterrupted or error-free or free from viruses, or that this website will be secure.
We reserve the right to restrict, suspend or terminate without notice your access to this website, any content, or any feature of this website at any time without notice, and we will not be responsible for any loss, cost, damage or liability that may arise as a result.
 
## COPYRIGHT
Your use of this website and use of and access to any content does not grant or transfer any rights, title or interest to you in relation to this website or its content. 
However, we grant you a licence to access the website and view the content on these Terms and Conditions and, where applicable, as expressly authorised by us.
This website is for your personal, non-commercial use only. You may not modify, copy, distribute, transmit, display, perform, reproduce, publish, license, commercially exploit, create derivative works from, transfer, or sell any content, software, products or services contained within this website. 
You may not use this website or any of its content, to further any commercial purpose, including any advertising or advertising revenue generation activity on your own website.
The content of this website is protected under Australian and international copyright laws and conventions unless stated otherwise. 
Reproduction or use of any content of this website is prohibited other than for good faith personal and non-commercial purposes. 
No content reproduced may be altered or presented in a false or misleading manner, whether by incorporation with other information or alone. 
University’s limited permission to reproduce or use content does not extend to including any substantial portion of the content of this website in any work or publication, regardless of its form. 
Any reproduction or use of any content must always attribute copyright ownership to the University.
The University is committed to upholding the rights of copyright owners. 
If you believe that copyright material is available on this website in such a way that it constitutes a copyright infringement or a breach of a contract or licence, please notify the University.
 
## TRADE MARKS
The trade marks owned by the University are protected by Australian and international laws. 
You may not reproduce any of the trade marks of the University without written authorisation.
The Commonwealth, NSW Government and Resilience NSW logos are owned respectively by the Crown in the Right of the Commonwealth of Australia and the Crown in right of the State of New South Wales.
 
## PRIVACY
Any personal information given to the University will be dealt with in accordance with the University’s Privacy Policy. 
Any information provided may be accessed by any employee of the University in accordance with the requirements of the University’s Privacy Policy.
No personal information is collected by this website. 
The website stores the user indicated location and sport in local file storage. 
Some or all of the information provided by the user may be stored in a cloud database in the future. 
The University may use this information for research and non-commercial purpose only, such as to study the types of users and their usage of the website. 
The website uses Google Analytics to collect anonymous statistics on the number of visitors to the website, record user activity and approximate location of users based on the detected IP address. 
All this data is de-identified by Google.
 
## LINKING
Linking to this website is not permitted unless authorised in writing by the University. 
Please contact the University if you would like to link to any part of this website. 
The University reserves the right to refuse permission and to request removal of any link to its website.
 
## LIABILITY
The information on this website is not comprehensive and is intended to provide a summary of the subject matter covered. 
The University strives to keep the information displayed on this website up to date, but does not guarantee the information's accuracy, reliability or currency. 
Any errors in the information that are brought to the University’s attention will be corrected as soon as possible. 
The University reserves the right to change at any time without notice any information displayed on this website. 
The University accepts no liability for any loss or damage a person suffers because that person has directly or indirectly relied on any information displayed on this website. 
In no event will the University or its employees be liable to you or anyone else for any decision made or action taken in reliance on the information in this website or for any consequential, special or similar damages, even if advised of the possibility of such damages.
 
## UNACCEPTABLE ACTIVITY
You must not do any act that we would deem to be inappropriate, is unlawful or is prohibited by any laws applicable to our website, including but not limited to:
* any act that would constitute a breach of either the privacy (including uploading private or personal information without an individual's consent) or any other of the legal rights of individuals;
* using this website to defame or libel us, our employees or other individuals;
* uploading files that contain viruses that may cause damage to our property or the property of other individuals; OR
* posting or transmitting to this website any non-authorised material including, but not limited to, material that is, in our opinion, likely to cause annoyance, or which is defamatory, racist, obscene, threatening, pornographic or otherwise or which is detrimental to or in violation of our systems or a third party's systems or network security.
 
## GOVERNING LAW
Your use of the website and these Terms are governed by the laws of New South Wales and you submit to the non-exclusive jurisdiction of the courts exercising jurisdiction in New South Wales.
 
## Attributions
### Icons
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
