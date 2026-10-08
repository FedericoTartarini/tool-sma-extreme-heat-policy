import { Box } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import { RISK_DISPLAY_OFFSET, RISK_RAW_SCALE_MAX } from "@/domain/riskRegistry";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import {
  formatRiskGaugeValue,
  getRiskGaugeActiveLevel,
  getRiskGaugeGeometry,
  getRiskGaugeRenderModel,
  RISK_GAUGE_MAX_WIDTH,
  RISK_GAUGE_MIN_WIDTH,
} from "@/lib/riskGauge";
import { EChart } from "@/components/ui/EChart";

interface RiskGaugeProps {
  score: number;
}

function useMeasuredWidth() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let frameId = 0;

    const syncWidth = () => {
      const nextWidth = Math.round(container.getBoundingClientRect().width);

      if (nextWidth <= 0) {
        return;
      }

      setWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    syncWidth();

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(syncWidth);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  return {
    containerRef,
    hasMeasuredWidth: width !== null,
    width,
  };
}

/**
 * Renders the current-risk gauge using ECharts, tuned to resemble the legacy half-circle design.
 *
 * The score is painted onto a canvas and its on-screen copy is aria-hidden, so
 * the label built here is the only route to that reading. It names the range as
 * well as the score, because the dial starts at the bottom of Low rather than
 * at zero.
 */
export function RiskGauge({ score }: RiskGaugeProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const { containerRef, hasMeasuredWidth, width } = useMeasuredWidth();
  const riskLevelLabels = createRiskLevelLabels((key) => t(key), "long");
  const unavailableLabel = t("charts.gauge.riskUnavailable");
  const fallbackGeometry = getRiskGaugeGeometry(isMobile);
  const renderModel = hasMeasuredWidth
    ? getRiskGaugeRenderModel(
        score,
        riskLevelLabels,
        unavailableLabel,
        isMobile,
        width ?? undefined,
      )
    : null;
  const gaugeGeometry = renderModel?.geometry ?? fallbackGeometry;
  const activeLevel = getRiskGaugeActiveLevel(score);
  const ariaLabel =
    activeLevel === null
      ? t("charts.gauge.a11y.labelUnavailable", {
          title: t("charts.gauge.seriesName"),
        })
      : t("charts.gauge.a11y.label", {
          title: t("charts.gauge.seriesName"),
          // The same formatter the dial prints in its centre, so the spoken
          // reading cannot drift from the drawn one.
          value: formatRiskGaugeValue(score, unavailableLabel),
          min: RISK_DISPLAY_OFFSET,
          max: RISK_RAW_SCALE_MAX,
          level: riskLevelLabels[activeLevel],
        });

  return (
    <Box
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      style={{
        position: "relative",
        width: "100%",
        minWidth: RISK_GAUGE_MIN_WIDTH,
        maxWidth: RISK_GAUGE_MAX_WIDTH,
        minHeight: gaugeGeometry.height,
        marginInline: "auto",
      }}
    >
      {renderModel ? (
        <>
          <EChart option={renderModel.option} height={gaugeGeometry.height} />
          <Box
            aria-hidden={true}
            style={{
              position: "absolute",
              left: "50%",
              bottom: renderModel.valueLayout.bottomOffset,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              color: "#172033",
              fontFamily: "var(--mantine-font-family)",
              fontSize: renderModel.valueLayout.fontSize,
              fontWeight: renderModel.valueLayout.fontWeight,
              lineHeight: renderModel.valueLayout.lineHeight,
              letterSpacing: "-0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {renderModel.displayValue}
          </Box>
        </>
      ) : null}
    </Box>
  );
}
