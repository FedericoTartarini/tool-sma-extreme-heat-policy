import { Box } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";
import type { RiskLevel } from "@/domain/risk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import {
  getRiskGaugeGeometry,
  getRiskGaugeRenderModel,
  RISK_GAUGE_MAX_WIDTH,
  RISK_GAUGE_MIN_WIDTH,
} from "@/lib/riskGauge";
import { EChart } from "@/components/ui/EChart";

interface RiskGaugeProps {
  score: number;
  title: string;
  unavailableLabel: string;
  riskLevelLabels: Record<RiskLevel, string>;
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
 */
export function RiskGauge({
  score,
  title,
  unavailableLabel,
  riskLevelLabels,
}: RiskGaugeProps) {
  const isMobile = useIsMobileViewport();
  const { containerRef, hasMeasuredWidth, width } = useMeasuredWidth();
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

  return (
    <Box
      ref={containerRef}
      role="img"
      aria-label={title}
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
