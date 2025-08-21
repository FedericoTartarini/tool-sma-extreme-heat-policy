from dash import html, dcc
import dash_mantine_components as dmc


def my_footer():
    return html.Footer(
        dmc.Container(
            dmc.Grid(
                [
                    dmc.GridCol(
                        dmc.Stack(
                            children=[
                                html.Img(
                                    src="../assets/icons/usyd-logo.png",
                                    width="125px",
                                    height="auto",
                                    alt="USYD logo icon",
                                ),
                                html.Img(
                                    src="../assets/icons/sma-black.png",
                                    width="125px",
                                    height="auto",
                                    alt="USYD logo icon",
                                ),
                            ],
                        ),
                        span="content",
                    ),
                    dmc.GridCol(
                        dcc.Markdown(
                            """
                            [Click here to provide your feedback](https://sydney.au1.qualtrics.com/jfe/form/SV_3jAqlzAnAoAOU8S)
                            
                            If you use this tool, please cite the following paper:
                            Tartarini, Federico, et al. "A modified Sports Medicine Australia extreme heat policy and web tool." Journal of Science and Medicine in Sport (2025).
                            
                            © 2025 - Heat and Health Research Centre, USYD
                            
                            This website was reviewed by the Sports Medicine Australia Scientific Advisory Committee in 2025
                            
                            Version: 1.1.0
                            
                            [Contact Us](mailto:federico.tartarini@sydney.edu.au)
                            """
                        ),
                        style={"color": "#111", "inherit": "none"},
                        span=8,
                        className="markdown-footer",
                    ),
                ],
                justify="space-between",
            ),
            style={"flex": 1, "marginBottom": 20},
            className="p-2",
            size="xs",
        ),
        style={"background": "#fcd200"},
        className="p-2",
    )
