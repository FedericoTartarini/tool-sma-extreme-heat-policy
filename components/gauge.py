import matplotlib

matplotlib.use("Agg")
import math
import io
import base64

import matplotlib.pyplot as plt
import numpy as np
from scipy.interpolate import interp1d


def gauge_chart(
    risk_value: float,
    colors: list,
    thresholds: list,
    # show_image: list,
    text: list = None,
    font_colors: list = None,
    debugging: bool = False,
    show_value: bool = True,
    text_rotated: bool = True,
    font_size: int = 12,
    bottom: int = 1,
    height: int = 2,
):

    m = interp1d([min(thresholds), max(thresholds)], [0.0, np.pi])
    x_axis_vals = [m(x) for x in thresholds]
    width = [x - x_axis_vals[i - 1] for i, x in enumerate(x_axis_vals)][1:]

    fig = plt.figure(figsize=(7, 4))

    ax = fig.add_subplot(projection="polar")

    ax.set_thetamin(0)
    ax.set_thetamax(180)

    ax.bar(
        x=x_axis_vals[:-1],
        width=width,
        height=height,
        bottom=bottom,
        linewidth=2,
        edgecolor="white",
        color=colors,
        align="edge",
    )

    ax.set_axis_off()
    ax.set_theta_zero_location("W")  # theta=0 at the top
    ax.set_theta_direction(-1)  # theta increasing clockwise

    color_annotation = "black"
    for col, tre in zip(colors, thresholds):
        if risk_value >= tre:
            color_annotation = col

    if show_value:
        plt.annotate(
            str(risk_value),
            xytext=(0, 0),
            xy=(m(risk_value), 1.5),
            arrowprops=dict(
                arrowstyle="wedge, tail_width=0.25",
                # arrowstyle="-|>",
                # arrowstyle="fancy",
                color=color_annotation,
                # shrinkA=0,
                # linewidth=0.8,
                ec="black",
            ),
            bbox=dict(
                boxstyle="circle",
                pad=0.25,
                # facecolor=color_annotation,
                facecolor="none",
                linewidth=0.8,
                # ec="black",
                ec="none",
            ),
            fontsize=30,
            color="black",
            ha="center",
        )
    plt.tight_layout(h_pad=0)
    plt.subplots_adjust(top=1.3, bottom=-0.2, right=1, left=0, hspace=0, wspace=0)

    if text:
        for i, txt in enumerate(text):

            text_angle = 0
            if text_rotated:
                text_angle = 180 - math.degrees(x_axis_vals[i] + width[i] / 2)
                if text_angle > 90:
                    text_angle -= 180

            # Get background color for this segment
            bg_color = colors[i]

            def hex_to_rgb(hex_color):
                hex_color = hex_color.lstrip("#")
                return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

            rgb = hex_to_rgb(bg_color)
            brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
            font_color = "#D3D3D3" if brightness < 64 else "black"

            txt = ax.text(
                x_axis_vals[i] + width[i] / 2,
                height,
                txt,
                fontsize=font_size,
                color=font_color,
                ha="center",
                va="center",
                fontweight="bold",
                rotation=text_angle,
            )

    if debugging:
        plt.savefig("temp_files/gauge.png")
        plt.show()
        return None

    my_stringIObytes = io.BytesIO()
    plt.savefig(
        my_stringIObytes,
        format="png",
        transparent=True,
        dpi=300,
        bbox_inches="tight",
        pad_inches=0,
    )
    my_stringIObytes.seek(0)
    my_base64_jpgData = base64.b64encode(my_stringIObytes.read()).decode()
    plt.close()
    return f"data:image/png;base64, {my_base64_jpgData}"


if __name__ == "__main__":

    colors = ["#0096FF", "#72c66e", "#f6ee54", "#fabd57", "#ee4d55"]
    thresholds = [0.0, 100.0, 150.0, 200.0, 250.0, 300.0]
    text = ["Low", "Moderate", "High", "Very High", "Extreme"]
    risk_value = 1

    gauge_chart(
        risk_value=risk_value,
        colors=colors,
        thresholds=thresholds,
        text=text,
        show_value=True,
        text_rotated=True,
        debugging=True,
    )
