import { Box } from "@mantine/core";
import * as echarts from "echarts";
import type { EChartsOption, EChartsType } from "echarts";
import { useEffect, useRef } from "react";

interface EChartProps {
  option: EChartsOption;
  height: number;
  bindChart?:
    | ((chart: EChartsType, container: HTMLDivElement) => void | (() => void))
    | undefined;
}

/**
 * Hosts and resizes an ECharts instance for the provided option payload.
 */
export function EChart({ option, height, bindChart }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    chartRef.current = echarts.init(containerRef.current);

    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, {
      notMerge: false,
      lazyUpdate: true,
    });
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    const container = containerRef.current;

    if (!chart || !container || !bindChart) {
      return;
    }

    return bindChart(chart, container);
  }, [bindChart]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.resize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return <Box ref={containerRef} h={height} />;
}
