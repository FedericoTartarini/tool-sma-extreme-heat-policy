import dash
import dash_mantine_components as dmc
from dash import html

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
                dmc.Title("USYD Sports Heat Tool"),
                dmc.Text(
                    "This website provides a convenient and freely accessible tool for assessing heat stress risk "
                    "during sport and physical activity in Australia. ",
                    span=True,
                ),
                dmc.Anchor(
                    "It is based on the SMA Extreme Heat Risk and Response Guidelines. ",
                    href="https://sma.org.au/resources/policies-and-guidelines/hot-weather/",
                    inline=True,
                ),
                dmc.Text(
                    "",
                    pb="xs",
                ),
                dmc.Text(
                    "The guidelines are developed by the Heat and Health Research Centre at "
                    "the University of Sydney and the methodology is described in ",
                    span=True,
                ),
                dmc.Anchor(
                    "this publication.",
                    href="https://www.jsams.org/article/S1440-2440(25)00069-6/fulltext",
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
                    "activity duration. ",
                    pb="xs",
                ),
                dmc.Text(
                    "The web tool allows users to assess heat stress risk based on location-specific, "
                    "hour-by-hour environmental data automatically extracted from the nearest weather station. It also offers "
                    "hierarchical recommendations for risk reduction strategies and a 7-day risk forecasting feature."
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title(
                    "Vigorous exercise places some people at risk of heat illness, especially in hot weather.",
                    order=2,
                ),
                dmc.Text(
                    "If untreated, heat illness can lead to the more serious and potentially life-threatening condition "
                    "of heat stroke. By understanding the causes of heat illness health professionals, coaches, players "
                    "and anyone involved in sport or physical activity can help prevent heat illness by using the advice "
                    "provided in the Guidelines to minimise the risks. ",
                    pb="xs",
                ),
                dmc.Text(
                    "Most of the advice involves simple rules of common "
                    "sense. Listen to your body and stop or slow down if you feel unwell. This is particularly important "
                    "for children. Make sure that you have access to cool drinking water, wear a good hat and take "
                    "particular care in the hottest parts of the day or year.",
                    pb="xs",
                ),
                dmc.Text(
                    "The target audience for the Guidelines are "
                    "all Australians who undertake sport and physical activity, but they will be particularly useful to "
                    "health professionals involved in the promotion of physical activity, coaches, fitness leaders and "
                    "sports administrators.",
                    pb="xs",
                ),
                html.Div(
                    dmc.Anchor(
                        "Beat the Heat fact sheet",
                        href="https://sma.org.au/wp-content/uploads/2023/03/beat-the-heat-2011.pdf",
                    ),
                ),
            ],
            shadow="xs",
            p="xs",
        ),
        dmc.Paper(
            [
                dmc.Title(
                    "UV Exposure & Heat Illness Guide",
                    order=2,
                ),
                dmc.Text(
                    "A joint venture between Sports Medicine Australia’s Smartplay and the Cancer Council’s "
                    "Sunsmart has produced a UV Exposure and Heat Illness Guide.  The guide provides up to date "
                    "information on UV exposure and heat illness, tips for creating, reviewing and implementing "
                    "local guidelines, a modifiable UV exposure and heat illness checklist and real-life examples.",
                    pb="xs",
                ),
                html.Div(
                    dmc.Anchor(
                        "Guidelines download",
                        href="https://sma.org.au/wp-content/uploads/2023/03/UV-Exposure-and-Heat-Illness-Guide.pdf",
                    ),
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
                    a particular location.""",
                    pb="xs",
                ),
                dmc.Text(
                    """The Heat and Health Research Centre at the University of Sydney (
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
