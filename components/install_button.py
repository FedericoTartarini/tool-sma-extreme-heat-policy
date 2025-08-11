import dash_mantine_components as dmc
from dash_iconify import DashIconify

from config import URLS
from my_app.my_classes import IDs


def component_button_install():
    return dmc.Center(
        dmc.Anchor(
            dmc.Button(
                "Install this web application on your phone",
                leftSection=DashIconify(
                    icon="material-symbols-light:install-mobile-rounded"
                ),
                mt="xs",
                color="black",
                id=IDs.btn_install,
            ),
            href=URLS.INSTALL.url,
        ),
    )
