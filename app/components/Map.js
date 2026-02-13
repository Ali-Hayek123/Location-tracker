"use client";

import { useEffect, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    Circle,
} from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create a custom colored marker icon
function createMarkerIcon(color) {
    return L.divIcon({
        className: "custom-marker",
        html: `
      <div style="
        width: 32px;
        height: 32px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 20px;
          height: 20px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1);
        "></div>
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.2;
          animation: pulse-ring 2s ease-out infinite;
        "></div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
}

// Component to recenter map
function RecenterMap({ lat, lng, shouldCenter }) {
    const map = useMap();
    const hasCentered = useRef(false);

    useEffect(() => {
        if (shouldCenter && lat && lng && !hasCentered.current) {
            map.setView([lat, lng], 16, { animate: true });
            hasCentered.current = true;
        }
    }, [lat, lng, shouldCenter, map]);

    return null;
}

export default function MapView({ locations, myLocation, myUserId }) {
    const defaultCenter = [31.9, 35.2]; // Default center (Amman, Jordan)
    const center = myLocation
        ? [myLocation.latitude, myLocation.longitude]
        : defaultCenter;

    return (
        <MapContainer
            center={center}
            zoom={14}
            style={{ height: "100%", width: "100%", borderRadius: "16px" }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <RecenterMap
                lat={center[0]}
                lng={center[1]}
                shouldCenter={!!myLocation}
            />

            {locations?.map((loc) => {
                const isMe = loc.userId === myUserId;
                const timeDiff = Date.now() - loc.lastUpdated;
                const minutesAgo = Math.floor(timeDiff / 60000);
                const secondsAgo = Math.floor(timeDiff / 1000);
                const timeLabel =
                    minutesAgo > 0
                        ? `${minutesAgo}m ago`
                        : `${secondsAgo}s ago`;

                return (
                    <div key={loc._id}>
                        <Marker
                            position={[loc.latitude, loc.longitude]}
                            icon={createMarkerIcon(loc.color)}
                        >
                            <Popup>
                                <div style={{
                                    fontFamily: "'Inter', sans-serif",
                                    padding: "4px",
                                    minWidth: "180px",
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "8px",
                                    }}>
                                        <div style={{
                                            width: "12px",
                                            height: "12px",
                                            borderRadius: "50%",
                                            background: loc.color,
                                            border: "2px solid white",
                                            boxShadow: `0 0 6px ${loc.color}`,
                                        }} />
                                        <strong style={{ fontSize: "14px", color: "#1a1a2e" }}>
                                            {loc.userName} {isMe ? "(You)" : ""}
                                        </strong>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.6" }}>
                                        <div>📍 {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</div>
                                        {loc.accuracy && (
                                            <div>🎯 Accuracy: ±{loc.accuracy.toFixed(0)}m</div>
                                        )}
                                        {loc.speed != null && loc.speed > 0 && (
                                            <div>🚀 Speed: {(loc.speed * 3.6).toFixed(1)} km/h</div>
                                        )}
                                        <div>🕐 Updated: {timeLabel}</div>
                                        <div style={{
                                            marginTop: "4px",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            display: "inline-block",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            background: loc.isActive ? "#00e67620" : "#ff444420",
                                            color: loc.isActive ? "#00c853" : "#ff4444",
                                        }}>
                                            {loc.isActive ? "● Online" : "● Offline"}
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Accuracy circle */}
                        {loc.accuracy && loc.accuracy > 0 && (
                            <Circle
                                center={[loc.latitude, loc.longitude]}
                                radius={loc.accuracy}
                                pathOptions={{
                                    color: loc.color,
                                    fillColor: loc.color,
                                    fillOpacity: 0.08,
                                    weight: 1,
                                    opacity: 0.3,
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </MapContainer>
    );
}
