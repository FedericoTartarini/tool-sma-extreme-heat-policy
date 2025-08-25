from dash import html, dcc
import dash_mantine_components as dmc
from dash import get_asset_url


def my_footer():
    return html.Footer(
        dmc.Container(
            dmc.Grid(
                [
                    dmc.GridCol(
                        dmc.Stack(
                            children=[
                                html.Img(
                                    src=get_asset_url("icons/usyd-logo.png"),
                                    width="125px",
                                    height="auto",
                                    alt="USYD logo icon",
                                ),
                                html.Img(
                                    src=get_asset_url("icons/sma-black.png"),
                                    width="125px",
                                    height="auto",
                                    alt="Sports Medicine Australia logo",
                                ),
                            ],
                        ),
                        span="content",
                    ),
                    dmc.GridCol(
                        dcc.Markdown(
                            """
                            [Provide your feedback](https://sydney.au1.qualtrics.com/jfe/form/SV_3jAqlzAnAoAOU8S)
                            
                            If you use this tool, please cite the following paper:
                            [The Sports Medicine Australia extreme heat risk and response guidelines and web tool.](https://doi.org/10.1016/j.jsams.2025.03.006)
                            Tartarini F, Smallcombe JW, Lynch GP, Cross TJ, Broderick C, Jay O.
                            *J Sci Med Sport. 2025 Sep;28(9):690-699*.
                            
                            © 2025 - Heat and Health Research Centre, USYD
                            
                            This website was reviewed by the Sports Medicine Australia Scientific Advisory Committee in 2025
                            
                            Version: 1.1.2
                            
                            [Contact Us](mailto:federico.tartarini@sydney.edu.au)
                            """
                        ),
                        style={"color": "#111", "inherit": "none"},
                        span={"base": 12, "xs": 8},
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
