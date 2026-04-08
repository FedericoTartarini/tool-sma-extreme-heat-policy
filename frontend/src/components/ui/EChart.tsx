import { Box } from "@mantine/core";
import * as echarts from "echarts";
import type { EChartsOption, EChartsType } from "echarts";
import { useCallback, useEffect, useRef } from "react";

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
  const optionRef = useRef(option);
  const bindChartRef = useRef(bindChart);
  const bindCleanupRef = useRef<(() => void) | null>(null);

  const cleanupBinding = useCallback(() => {
    bindCleanupRef.current?.();
    bindCleanupRef.current = null;
  }, []);

  const applyOption = useCallback(
    (chart: EChartsType, nextOption: EChartsOption) => {
      chart.setOption(nextOption, {
        notMerge: false,
        lazyUpdate: true,
      });
    },
    [],
  );

  const syncBinding = useCallback(
    (chart: EChartsType, container: HTMLDivElement) => {
      cleanupBinding();

      const nextBindChart = bindChartRef.current;

      if (!nextBindChart) {
        return;
      }

      bindCleanupRef.current = nextBindChart(chart, container) ?? null;
    },
    [cleanupBinding],
  );

  const ensureChart = useCallback(() => {
    const container = containerRef.current;

    if (!container) {
      return null;
    }

    if (chartRef.current && !chartRef.current.isDisposed()) {
      return chartRef.current;
    }

    if (container.clientWidth <= 0 || container.clientHeight <= 0) {
      return null;
    }

    const chart = echarts.init(container);
    chartRef.current = chart;
    applyOption(chart, optionRef.current);
    syncBinding(chart, container);

    return chart;
  }, [applyOption, syncBinding]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let frameId = 0;
    const chart = ensureChart();

    if (chart && !chart.isDisposed()) {
      chart.resize();
    }

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (container.clientWidth <= 0 || container.clientHeight <= 0) {
          return;
        }

        const chart = ensureChart();

        if (!chart || chart.isDisposed()) {
          return;
        }

        chart.resize();
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      cleanupBinding();
      if (chartRef.current && !chartRef.current.isDisposed()) {
        chartRef.current.dispose();
      }
      chartRef.current = null;
    };
  }, [cleanupBinding, ensureChart]);

  useEffect(() => {
    optionRef.current = option;

    const chart = ensureChart();

    if (chart && !chart.isDisposed()) {
      applyOption(chart, option);
    }
  }, [applyOption, ensureChart, option]);

  useEffect(() => {
    bindChartRef.current = bindChart;

    const chart = chartRef.current;
    const container = containerRef.current;

    if (!chart || chart.isDisposed() || !container) {
      return;
    }

    syncBinding(chart, container);
  }, [bindChart, syncBinding]);

  return <Box ref={containerRef} h={height} />;
}
