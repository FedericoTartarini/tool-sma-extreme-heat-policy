import { Box } from "@mantine/core";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import { USYD_ORANGE_HEX } from "@/config/uiColors";

const MAP_HEIGHT = 160;
const DEFAULT_MAP_ZOOM = 11;
const OPEN_FREE_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const ATTRIBUTION_SELECTOR = ".maplibregl-ctrl-attrib";
const ATTRIBUTION_INNER_SELECTOR = ".maplibregl-ctrl-attrib-inner";
const SHORT_ATTRIBUTION_HTML =
  '<a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>';

function applyCollapsedShortAttribution(container: HTMLDivElement) {
  const attributionControl = container.querySelector(ATTRIBUTION_SELECTOR);
  if (!(attributionControl instanceof HTMLElement)) {
    return;
  }

  const attributionInner = attributionControl.querySelector(
    ATTRIBUTION_INNER_SELECTOR,
  );
  if (attributionInner instanceof HTMLElement) {
    attributionInner.innerHTML = SHORT_ATTRIBUTION_HTML;
  }

  attributionControl.classList.remove("maplibregl-compact-show");
  attributionControl.removeAttribute("open");
}

export interface LocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Renders a read-only OpenFreeMap centered on the provided coordinates.
 */
export function LocationMap({ latitude, longitude, label }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: OPEN_FREE_MAP_STYLE_URL,
      center: [longitude, latitude],
      zoom: DEFAULT_MAP_ZOOM,
      interactive: false,
      attributionControl: {
        compact: true,
        customAttribution: "",
      },
    });

    const marker = new maplibregl.Marker({ color: USYD_ORANGE_HEX })
      .setLngLat([longitude, latitude])
      .addTo(map);

    marker.getElement().setAttribute("aria-label", label);
    marker.getElement().setAttribute("title", label);

    map.once("load", () => {
      applyCollapsedShortAttribution(container);
    });
    map.on("styledata", () => {
      applyCollapsedShortAttribution(container);
    });

    return () => {
      map.remove();
    };
  }, [label, latitude, longitude]);

  return (
    <Box
      ref={containerRef}
      aria-label={label}
      h={MAP_HEIGHT}
      w="100%"
      style={{
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
      }}
    />
  );
}
