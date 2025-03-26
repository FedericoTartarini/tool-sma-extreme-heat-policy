import dash
import dash_mantine_components as dmc

from components.install_button import component_button_install
from config import URLS

dash.register_page(
    __name__,
    path=URLS.ABOUT.url,
    title=URLS.ABOUT.page_title,
    name=URLS.ABOUT.name,
    description=URLS.ABOUT.description,
)

layout = dmc.Stack(
    [
        dmc.Paper(
            [
                dmc.Title("Sports Medicine Australia - Extreme Heat Policy Web Tool"),
                dmc.Text(
                    "This website provides a convenient and freely accessible tool for assessing heat stress risk "
                    "during sport and physical activity in Australia. It is based on the updated Sports Medicine "
                    "Australia (SMA) ",
                    span=True,
                ),
                dmc.Anchor(
                    "Extreme Heat Policy v2 (2024). ",
                    href="https://www.sciencedirect.com/science/article/pii/S1440244025000696",
                    inline=True,
                ),
                dmc.Text("This new policy builds upon the ", span=True),
                dmc.Anchor(
                    "SMA EHP v1 (2021) ",
                    href="https://www.sciencedirect.com/science/article/pii/S1440244025000696",
                    inline=True,
                    span=True,
                ),
                dmc.Text(
                    "by incorporating significant improvements to the underlying thermophysiological model to provide more "
                    "accurate heat stress risk classifications and tailored mitigation strategies. The SMA EHP v2 (2024) aims "
                    "to better protect healthy adults participating in recreational and community sports from heat-related "
                    "illness.",
                    span=True,
                ),
                component_button_install(),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Functionalities", order=2),
                dmc.Text(
                    "This website currently provides recommendations the most popular sports played in Australia. These "
                    "sports have been characterised based on their typical clothing insulation, metabolic rate, and expected "
                    "activity duration. The web tool allows users to assess heat stress risk based on location-specific, "
                    "hour-by-hour environmental data automatically extracted from the nearest weather station. It also offers "
                    "hierarchical recommendations for risk reduction strategies and a 7-day risk forecasting feature."
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Key Improvements of SMA EHP v2 (2024)", order=2),
                dmc.Text(
                    "The updated policy addresses several limitations of the previous version (SMA EHP v1 2021):"
                ),
                dmc.Text(
                    "- Improved accuracy in very hot and dry conditions: SMA EHP v2 (2024) now provides greater protection in very hot and dry extremes by better accounting for high required sweat rates and additional cardiovascular strain. The previous policy underestimated risk in these conditions."
                ),
                dmc.Text(
                    "- More appropriate recommendations in warm and humid conditions: The new policy reduces previously high rates of disruption to play in humid extremes by preferentially recommending active cooling and rest breaks."
                ),
                dmc.Text(
                    "- Sport-specific considerations: SMA EHP v2 (2024) incorporates sport-specific metabolic rates, clothing, and self-generated wind speeds to provide more precise estimations of heat stress risk, unlike the previous policy which broadly classified sports."
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Aim", order=2),
                dmc.Text(
                    "The aim of this policy is to provide evidence-based guidance for protecting the health of those participating in sport and physical activity from the potentially ill effects of extreme heat in hot weather, while aiming to minimise unnecessary interruptions to activity."
                ),
                dmc.Text(
                    " As new research findings emerge, the policy and this web tool will be updated accordingly. Intended users are sporting administrators, coaches, and sport medical teams responsible for the safety and well-being of healthy adults engaging in recreational and community sports in hot weather, as well as individuals wishing to manage heat stress risk during planned training activities. The policy is designed to protect generally fit and healthy adults aged 18 to <60 years without chronic disease."
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Terms and conditions", order=2),
                dmc.Text(
                    """This Sports and Medicine Australia (SMA) - Extreme Heat Policy website (
                    https://sma-heat-policy.sydney.edu.au/) provides general information for informational and 
                    educational purposes only about heat stress risk for people engaged in various types of sports at 
                    a particular location. The Heat and Health Research Incubator at the University of Sydney (
                    “University”) created and provided this website. A specific heat stress risk scale is displayed 
                    using a physiological model that provides a risk calculation for heat stress, including providing 
                    evidence-based cooling strategies."""
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Medical disclaimer", order=2),
                dmc.Text(
                    """No medical advice is provided in the information accessed through this website. If you 
                believe you or any other individual has a medical emergency or any other health problem, you should 
                promptly call an emergency medical service provider or consult your physician or healthcare provider. 
                You should seek immediate medical attention if you think you may be suffering from any medical 
                condition."""
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Warranty and general disclaimer", order=2),
                dmc.Text(
                    """To the maximum extent permitted by law, including the Australian Consumer Law, we make no 
                    warranties or representations about this website or its content, including but not limited to 
                    warranties or representations that they will be complete, accurate or up-to-date, that access 
                    will be uninterrupted or error-free or free from viruses, or that this website will be secure. We 
                    reserve the right to restrict, suspend or terminate without notice your access to this website, 
                    any content, or any feature of this website at any time without notice, and we will not be 
                    responsible for any loss, cost, damage or liability that may arise as a result."""
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Privacy", order=2),
                dmc.Text(
                    """Any personal information given to the University will be dealt with in accordance with the 
                    University’s Privacy Policy. Any information provided may be accessed by any employee of the 
                    University in accordance with the requirements of the University’s Privacy Policy. No personal 
                    information is collected by this website. The website stores the user indicated location and 
                    sport in local file storage. Some or all of the information provided by the user may be stored in 
                    a cloud database in the future. The University may use this information for research and 
                    non-commercial purpose only, such as to study the types of users and their usage of the website. 
                    The website uses Google Analytics to collect anonymous statistics on the number of visitors to 
                    the website, record user activity and approximate location of users based on the detected IP 
                    address. All this data is de-identified by Google."""
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title("Unacceptable Activity", order=2),
                dmc.Text(
                    """You must not do any act that we would deem to be inappropriate, is unlawful or is prohibited by any laws applicable to our website, including but not limited to:"""
                ),
                dmc.Text(
                    """- any act that would constitute a breach of either the privacy (including uploading private or personal information without an individual's consent) or any other of the legal rights of individuals;"""
                ),
                dmc.Text(
                    """- using this website to defame or libel us, our employees or other individuals;"""
                ),
                dmc.Text(
                    """- uploading files that contain viruses that may cause damage to our property or the property of other individuals; OR"""
                ),
                dmc.Text(
                    """- posting or transmitting to this website any non-authorised material including, but not limited to, material that is, in our opinion, likely to cause annoyance, or which is defamatory, racist, obscene, threatening, pornographic or otherwise or which is detrimental to or in violation of our systems or a third party's systems or network security."""
                ),
            ],
            shadow="xs",
            p="xs",
        ),
    ],
    className="p-2",
)
