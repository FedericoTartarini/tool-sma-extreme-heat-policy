from dash import html, dcc
import dash_bootstrap_components as dbc


def my_footer():
    return html.Footer(
        dbc.Container(
            children=[
                dbc.Row(
                    [
                        dbc.Col(
                            dcc.Markdown(
                                """
                            [Click here to provide your feedback](https://sydney.au1.qualtrics.com/jfe/form/SV_3jAqlzAnAoAOU8S)
                            
                            Website authors: [Federico Tartarini](https://www.linkedin.com/in/federico-tartarini/), [Ollie Jay](https://au.linkedin.com/in/ollie-jay-793a1b11), and [James Smallcombe](https://twitter.com/smallcombe2?lang=en)
                            
                            © 2023 - Heat and Health Research Incubator, USyd
                            
                            Version: 0.0.3
                            
                            [Contact Us](mailto:federico.tartarini@sydney.edu.au)
                            
                            """
                            ),
                            width=True,
                        ),
                        dbc.Col(
                            html.Img(
                                src="../assets/icons/usyd-logo.png", width="125px"
                            ),
                            width="auto",
                        ),
                    ]
                )
            ],
            className="p-2 my-2",
        ),
        style={"background": "#E64626"},
    )
