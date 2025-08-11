import dash
import dash_mantine_components as dmc

from config import URLS

dash.register_page(
    __name__,
    path=URLS.INSTALL.url,
    title=URLS.INSTALL.page_title,
    name=URLS.INSTALL.name,
    description=URLS.INSTALL.description,
)

layout = dmc.Stack(
    [
        dmc.Text(
            "To install the app on your phone, "
            "please follow the instructions below for Android and iOS devices.",
        ),
        dmc.Paper(
            dmc.Stack(
                [
                    dmc.Title("Android", order=2),
                    dmc.Text(
                        "1. Open the website in Chrome",
                    ),
                    dmc.Text(
                        "2. Tap the menu button (3 dots) in the top right corner",
                    ),
                    dmc.Image(
                        radius="md",
                        src="assets/img_installation/1000012525.jpg",
                    ),
                    dmc.Text(
                        "3. Tap 'Add to Home screen'",
                    ),
                    dmc.Image(
                        radius="md",
                        src="assets/img_installation/1000012527.jpg",
                    ),
                    dmc.Text(
                        "4. Tap 'Install'",
                    ),
                    dmc.Image(
                        radius="md",
                        src="assets/img_installation/1000012526.jpg",
                    ),
                ]
            ),
            shadow="sm",
            p="xs",
        ),
        dmc.Paper(
            dmc.Stack(
                [
                    dmc.Title("iOS", order=2),
                    dmc.Text(
                        "1. Open the website in Safari",
                        span=True,
                    ),
                    dmc.Text(
                        "2. Tap the share button at the bottom of the screen",
                        span=True,
                    ),
                    dmc.Image(
                        radius="md",
                        src="assets/img_installation/IMG_0212.jpg",
                    ),
                    dmc.Text(
                        "3. Tap 'Add to Home Screen'",
                    ),
                    dmc.Image(
                        radius="md",
                        src="assets/img_installation/IMG_0213.jpg",
                    ),
                    dmc.Text(
                        "4. Tap 'Add'",
                    ),
                    dmc.Image(
                        radius="md",
                        src="assets/img_installation/IMG_0214.jpg",
                    ),
                ],
                gap="xs",
            ),
            shadow="sm",
            p="xs",
        ),
    ],
    className="p-2",
)
