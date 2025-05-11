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

// Fix for marker icon issues in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const ClickMarker = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const MapBackground = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [clickMarker, setClickMarker] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => {
          console.warn("Error getting location:", err);
        }
      );
    }
  }, []);

  // Moved above JSX to fix the error
  const handleMapClick = (latlng) => {
    setClickMarker([latlng.lat, latlng.lng]);
  };

  if (!hasMounted) return null;

  return (
    <div
      style={{
        marginTop: "64px", // Adjust according to your navbar height
        height: "calc(100vh - 64px)", // Make room for navbar
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}
    >
      <MapContainer
        center={userLocation || [20.5937, 78.9629]}
        zoom={userLocation ? 13 : 5}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {clickMarker && (
          <Marker position={clickMarker}>
            <Popup>
              Dropped pin: {clickMarker[0].toFixed(4)}, {clickMarker[1].toFixed(4)}
            </Popup>
          </Marker>
        )}

        <ClickMarker onMapClick={handleMapClick} />
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
};

export default MapBackground;
