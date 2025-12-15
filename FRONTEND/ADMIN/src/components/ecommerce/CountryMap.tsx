// react plugin for creating vector maps
import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";

interface CountryMapMarker {
  lat: number;
  lng: number;
  name: string;
}

interface CountryMapProps {
  mapColor?: string;
  markers?: CountryMapMarker[];
}

const defaultMarkers: CountryMapMarker[] = [
  { lat: 37.2580397, lng: -104.657039, name: "United States" },
  { lat: 20.7504374, lng: 73.7276105, name: "India" },
  { lat: 53.613, lng: -11.6368, name: "United Kingdom" },
  { lat: -25.0304388, lng: 115.2092761, name: "Sweden" },
];

const CountryMap: React.FC<CountryMapProps> = ({ mapColor, markers }) => {
  const markerStyle: Record<string, string | number> = {
    fill: "#465FFF",
    borderWidth: 1,
    borderColor: "white",
    stroke: "#383f47",
  };

  const initialMarkerStyle: Record<string, string | number> = {
    fill: "#465FFF",
    r: 4,
  };

  const displayMarkers = (markers?.length ? markers : defaultMarkers).map((marker) => ({
    latLng: [marker.lat, marker.lng] as [number, number],
    name: marker.name,
    style: markerStyle,
  }));

  return (
    <VectorMap
      map={worldMill}
      backgroundColor="transparent"
      markerStyle={{
        initial: initialMarkerStyle,
      }}
      markersSelectable={true}
      regionsSelectable={true}
      regionsSelectableOne={true}
      markers={displayMarkers}
      zoomOnScroll={false}
      zoomMax={12}
      zoomMin={1}
      zoomAnimate={true}
      zoomStep={1.5}
      className="w-full h-full"
      focusOn={{ x: 0.78, y: 0.62, scale: 1.8 }}
      selectedRegions={["IN"]}
      style={{ width: "100%", height: "100%" }}
      regionStyle={{
        initial: {
          fill: mapColor || "#D0D5DD",
          fillOpacity: 1,
          fontFamily: "Outfit",
          stroke: "none",
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.7,
          cursor: "pointer",
          fill: "#465fff",
          stroke: "none",
        },
        selected: {
          fill: "#465FFF",
        },
        selectedHover: {
          fill: "#465FFF",
        },
      }}
      series={{
        regions: [
          {
            values: { IN: 1 },
            attribute: "fill",
          },
        ],
      }}
      regionLabelStyle={{
        initial: {
          fill: "#35373e",
          fontWeight: 500,
          fontSize: "13px",
          stroke: "none",
        },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
};

export default CountryMap;
