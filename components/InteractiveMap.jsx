// autosatai-frontend/components/InteractiveMap.jsx
"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Helper component to drop pins on click
const ClickMarker = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

export default function InteractiveMap({ lat, lon }) {
  const [userLocation, setUserLocation] = useState(null);
  const [clickMarker, setClickMarker] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Try to get browser geolocation as a secondary marker
  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([
            pos.coords.latitude,
            pos.coords.longitude,
          ]);
        },
        (err) => {
          console.warn("Geolocation error:", err);
        }
      );
    }
  }, []);

  const handleMapClick = ({ lat, lng }) => {
    setClickMarker([lat, lng]);
  };

  // Avoid trying to render on the server
  if (!hasMounted) return null;

  // Primary analysis location
  const analysisPos = [lat, lon];

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}
    >
      <MapContainer
        center={analysisPos}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Marker at the analysis location */}
        <Marker position={analysisPos}>
          <Popup>
            Analysis Point: {lat.toFixed(4)}, {lon.toFixed(4)}
          </Popup>
        </Marker>

        {/* Optional: your current geolocation */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              Your Location: {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
            </Popup>
          </Marker>
        )}

        {/* Pin you drop by clicking */}
        {clickMarker && (
          <Marker position={clickMarker}>
            <Popup>
              Dropped Pin: {clickMarker[0].toFixed(4)}, {clickMarker[1].toFixed(4)}
            </Popup>
          </Marker>
        )}

        <ClickMarker onMapClick={handleMapClick} />
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}
