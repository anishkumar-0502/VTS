import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const VectorMaps: React.FC = () => {
  const mapRefs = {
    basic: useRef<HTMLDivElement>(null),
    marker: useRef<HTMLDivElement>(null),
    cluster: useRef<HTMLDivElement>(null),
    heat: useRef<HTMLDivElement>(null),
    data: useRef<HTMLDivElement>(null),
    control: useRef<HTMLDivElement>(null),
    route: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const maps: Record<string, L.Map> = {};
    const markers: L.Marker[] = [];

    const mapStyles: Record<string, string> = {
      streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      satellite:
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    };

    /** ---------- MAP INITIALIZERS ---------- **/

    const initBasicMap = () => {
      const map = L.map(mapRefs.basic.current!).setView([40.7128, -74.006], 13);
      L.tileLayer(mapStyles.streets).addTo(map);
      maps.basic = map;
    };

    const initMarkerMap = () => {
      const map = L.map(mapRefs.marker.current!).setView([51.505, -0.09], 13);
      L.tileLayer(mapStyles.streets).addTo(map);

      const locations = [
        { lat: 51.5, lng: -0.09, name: "Location 1", info: "Central London" },
        { lat: 51.51, lng: -0.1, name: "Location 2", info: "North London" },
        { lat: 51.49, lng: -0.08, name: "Location 3", info: "South London" },
      ];

      locations.forEach((loc) => {
        const marker = L.marker([loc.lat, loc.lng]).addTo(map);
        marker.bindPopup(
          `<strong>${loc.name}</strong><br/>${loc.info}`
        );
      });

      maps.marker = map;
    };

    const initHeatMap = () => {
      const map = L.map(mapRefs.heat.current!).setView([40.7128, -74.006], 12);
      L.tileLayer(mapStyles.streets).addTo(map);

      for (let i = 0; i < 20; i++) {
        const lat = 40.65 + Math.random() * 0.15;
        const lng = -74.1 + Math.random() * 0.2;
        L.circle([lat, lng], {
          color: "red",
          fillColor: "#f03",
          fillOpacity: 0.3,
          radius: 800,
        }).addTo(map);
      }

      maps.heat = map;
    };

    const initControlMap = () => {
      const map = L.map(mapRefs.control.current!).setView(
        [40.7128, -74.006],
        12
      );
      L.tileLayer(mapStyles.streets).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        const marker = L.marker(e.latlng).addTo(map);
        markers.push(marker);
        marker.bindPopup(
          `<b>Marker</b><br/>Lat: ${e.latlng.lat.toFixed(
            4
          )}<br/>Lng: ${e.latlng.lng.toFixed(4)}`
        ).openPopup();
      });

      maps.control = map;
    };

    const initRouteMap = () => {
      const map = L.map(mapRefs.route.current!).setView(
        [40.7128, -74.006],
        4
      );
      L.tileLayer(mapStyles.streets).addTo(map);
      maps.route = map;
    };

    /** ---------- INITIALIZE ALL ---------- **/
    setTimeout(() => {
      initBasicMap();
      initMarkerMap();
      initHeatMap();
      initControlMap();
      initRouteMap();
    }, 300);

    /** ---------- CLEANUP ---------- **/
    return () => {
      Object.values(maps).forEach((map) => map.remove());
    };
  }, []);

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4 fw-bold">Interactive Vector Maps (React + Leaflet)</h2>

      {/* Basic Map */}
      <section className="mb-4">
        <h5>Basic Map</h5>
        <div ref={mapRefs.basic} className="map-container"></div>
      </section>

      {/* Marker Map */}
      <section className="mb-4">
        <h5>Marker Map</h5>
        <div ref={mapRefs.marker} className="map-container"></div>
      </section>

      {/* Heat Map */}
      <section className="mb-4">
        <h5>Heat Map Simulation</h5>
        <div ref={mapRefs.heat} className="map-container"></div>
      </section>

      {/* Control Map */}
      <section className="mb-4">
        <h5>Interactive Control Map (Click to add marker)</h5>
        <div ref={mapRefs.control} className="map-container map-container-tall"></div>
      </section>

      {/* Route Map */}
      <section>
        <h5>Route Planning Map</h5>
        <div ref={mapRefs.route} className="map-container map-container-tall"></div>
      </section>
    </div>
  );
};

export default VectorMaps;
