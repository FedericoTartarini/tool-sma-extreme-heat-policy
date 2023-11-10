import plotly.express as px
import numpy as np
from my_app.utils import calculate_comfort_indices_v1, get_yr_weather
from config import sma_risk_messages
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


def line_chart(df, variable="tdb"):
    fig = go.Figure()

    for risk, value in sma_risk_messages.items():
        if risk == "low":
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=np.ones(df.shape[0]),
                    fill="tozeroy",
                    fillcolor=sma_risk_messages["low"].color,
                    mode="none",
                )
            )
        else:
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=np.ones(df.shape[0]) * value.risk_value + 1,
                    fill="tonexty",
                    fillcolor=value.color,
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

    fig = standard_layout(fig)

    fig.update_yaxes(showticklabels=True, title="Risk")

    fig.update_xaxes(range=[df.index.min(), df.index.max()])

    fig.update_xaxes(
        tickfont_size=14,
        title="Time",
        tickformat="%-I %p",
        dtick=86400000.0 / 24,
        tickangle=-90,
    )

    fig.update_layout(
        yaxis=dict(
            tickmode="array",
            tickvals=[0.5, 1.5, 2.5, 3.5],
            ticktext=[
                "Low",
                "Moderate",
                "High",
                "Extreme",
            ],
            tickangle=-90,
        ),
    )

    return fig


def heatmap_chart_tmp(df):
    fig = px.imshow(
        [list(df["hss"].values)],
        color_continuous_scale=[value.color for i, value in sma_risk_messages.items()],
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
        color_continuous_scale=[value.color for i, value in sma_risk_messages.items()],
        range_color=[0, 5],
    )
    fig.update(layout_coloraxis_showscale=False)
    fig.update_yaxes(title_text="")

    return standard_layout(fig)


def indicator_chart(df):
    data = df.iloc[0]
    steps = [
        {"range": [v.risk_value, v.risk_value + 1], "color": v.color}
        for i, v in sma_risk_messages.items()
    ]

    fig = go.Figure(
        go.Indicator(
            mode="gauge",
            value=data["risk_value_interpolated"],
            domain={"x": [0, 1], "y": [0, 1]},
            gauge={
                "shape": "bullet",
                "axis": {"range": [0, 4]},
                "steps": steps,
                "borderwidth": 0,
                "bar": {
                    "color": "lightgray",
                    "thickness": 0.3,
                    "line": {"color": "black", "width": 1},
                },
            },
        )
    )
    fig.add_annotation(
        x=data["risk_value_interpolated"] / 4,
        y=1,
        text="Now",
        showarrow=False,
        font=dict(color="#fff"),
    )
    fig = standard_layout(fig)
    fig.update_layout(height=60)
    return fig


if __name__ == "__main__":
    df_w = get_yr_weather(lat=-17.91, lon=122.25)
    df_for = calculate_comfort_indices_v1(df_w, 3)

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

    f = line_chart(df_for, "risk_value_interpolated")
    f.show()
