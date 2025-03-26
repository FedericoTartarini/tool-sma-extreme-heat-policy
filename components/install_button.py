import dash_mantine_components as dmc
from dash_iconify import DashIconify

from config import URLS


def component_button_install():
    return dmc.Center(
        dmc.Anchor(
            dmc.Button(
                "Install this web application on your phone",
                leftIcon=DashIconify(
                    icon="material-symbols-light:install-mobile-rounded"
                ),
                mt="xs",
                color="black",
            ),
            href=URLS.INSTALL.url,
        ),
    )
