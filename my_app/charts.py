import plotly.express as px
import numpy as np
import pandas as pd
from utils import calculate_comfort_indices, hss_palette, get_yr_weather
import plotly.graph_objects as go


def standard_layout(fig):

    fig.update_layout(
        xaxis=dict(
            showline=True,
            showgrid=False,
            showticklabels=True,
            linecolor="rgb(204, 204, 204)",
            linewidth=2,
            ticks="outside",
            tickfont=dict(
                family="Arial",
                size=12,
                color="rgb(82, 82, 82)",
            ),
            title_text="",
        ),
        yaxis=dict(
            showgrid=True,
            zeroline=False,
            showline=False,
            showticklabels=True,
        ),
        autosize=True,
        margin=dict(autoexpand=True, l=0, r=0, t=0, b=0),
        showlegend=False,
        plot_bgcolor="white",
    )

    return fig


def line_chart_tmp(df, variable="tdb"):
    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=np.ones(df.shape[0]),
            fill="tozeroy",
            fillcolor=hss_palette[0],
            mode="none",
        )
    )
    for ix, risk in enumerate([2, 3, 4]):
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=np.ones(df.shape[0]) * risk,
                fill="tonexty",
                fillcolor=hss_palette[ix + 1],
                mode="none",
            )
        )

    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df[variable],
            mode="lines+markers",
            line_color="black",
            line={"shape": "spline", "smoothing": 1.3},
        )
    )

    return standard_layout(fig)


def heatmap_chart_tmp(df):
    fig = px.imshow(
        [list(df["hss"].values)],
        color_continuous_scale=list(hss_palette.values()),
        height=200,
        aspect="auto",
        range_color=[0, 5],
    )
    fig = standard_layout(fig)
    fig.update_layout(coloraxis_showscale=False)
    # fig.update_xaxes(
    #     tickslabels=[f"{x[0]}-{x[1]}" for x in zip(df.index.day, df.index.hour)]
    # )
    fig.update_yaxes(showticklabels=False, tickvals=[""])

    return standard_layout(fig)


def hss_trend(df):
    fig = px.bar(
        df,
        x=df.index,
        y="hss",
        color=list(df["hss"]),
        height=200,
        color_continuous_scale=list(hss_palette.values()),
        range_color=[0, 5],
    )
    fig.update(layout_coloraxis_showscale=False)
    fig.update_yaxes(title_text="")

    return standard_layout(fig)


def indicator_chart(df_for, sport_class):

    df = calculate_comfort_indices(data_for=df_for, sport_class=sport_class)
    data = df.iloc[0]
    steps = [
        {"range": [0, 25], "color": hss_palette[0]},
        {"range": [25, 50], "color": hss_palette[1]},
        {"range": [50, 75], "color": hss_palette[2]},
        {"range": [75, 100], "color": hss_palette[3]},
    ]

    x = [0, data["moderate"], data["high"], data["extreme"], 100]
    y = np.arange(0, 125, 25)

    current_risk = np.around(np.interp(data["rh"], x, y), 1)

    fig = go.Figure(
        go.Indicator(
            mode="gauge",
            value=current_risk,
            domain={"x": [0, 1], "y": [0, 1]},
            gauge={
                "shape": "bullet",
                "axis": {"range": [0, 100]},
                "steps": steps,
                "bar": {"color": "black"},
            },
        )
    )
    fig.add_annotation(
        x=current_risk / 100, y=1, text="Now", showarrow=False, font=dict(color="#000")
    )
    fig = standard_layout(fig)
    fig.update_layout(height=60)
    return fig


def risk_map(df_for, sport_class):

    values = []

    df_for = df_for.iloc[1:].head(5)

    t_min, t_max = df_for.tdb.min().round() - 3, df_for.tdb.max().round() + 3
    rh_min, rh_max = df_for.rh.min().round() - 5, df_for.rh.max().round() + 5
    for t in np.arange(t_min, t_max + 1):
        for rh in np.arange(rh_min, rh_max):
            values.append([t, rh])
    df = pd.DataFrame(values, columns=["tdb", "rh"])
    df = calculate_comfort_indices(data_for=df, sport_class=sport_class)
    df["top"] = 100

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=df["tdb"],
            y=df["moderate"],
            fill="tozeroy",
            fillcolor=hss_palette[0],
            mode="none",
        )
    )
    for ix, risk in enumerate(["high", "extreme", "top"]):
        fig.add_trace(
            go.Scatter(
                x=df["tdb"],
                y=df[risk],
                fill="tonexty",
                fillcolor=hss_palette[ix + 1],
                mode="none",
            )
        )
    fig.add_trace(
        go.Scatter(
            x=df_for["tdb"],
            y=df_for["rh"],
            mode="lines+markers+text",
            line_color="black",
            text=np.round(
                (df_for.index - pd.Timestamp.now(tz="Australia/Sydney")).seconds / 3600,
                0,
            ),
            textposition="top right",
            line={"shape": "spline", "smoothing": 1.3},
        )
    )
    fig.update_traces(textfont_size=13, textfont_color="white")

    fig = standard_layout(fig)
    fig.update_layout(
        xaxis=dict(title_text="Temperature [°C]", range=[t_min, t_max], dtick=2),
        yaxis=dict(title_text="Relative Humidity [%]", range=[rh_min, rh_max]),
    )
    return fig


if __name__ == "__main__":
    df_w = get_yr_weather(lat=-17.91, lon=122.25)
    df_for = calculate_comfort_indices(df_w, 3)
    f = risk_map(df_for, 3)
    f.show()

    fig = px.line(
        df_for,
        x=df_for.index,
        y=df_for.risk_value,
        height=200,
    )
    fig.add_trace(
        go.Scatter(
            x=df_for.index,
            y=df_for.risk_value_interpolated,
        )
    )
    fig.show()

    f = line_chart_tmp(df_for, "risk_value_interpolated")
    f.show()
