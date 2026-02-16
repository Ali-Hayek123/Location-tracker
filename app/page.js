"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import the map to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("./components/Map"), {
  ssr: false,
  loading: () => (
    <div className="map-skeleton">
      <div className="map-skeleton-pulse" />
      <p>Loading map...</p>
    </div>
  ),
});

const COLORS = [
  "#00d4ff", "#ff6b6b", "#51cf66", "#ffd43b",
  "#cc5de8", "#ff922b", "#20c997", "#748ffc",
  "#f783ac", "#69db7c", "#9775fa", "#ffa94d",
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function generateUserId() {
  return "user_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <LocationTracker />;
}

function LocationTracker() {
  // Convex queries & mutations
  const allLocations = useQuery(api.queries.getLocations.getLocations);
  const activeLocations = useQuery(api.queries.getLocations.getActiveLocations);
  const updateLocation = useMutation(api.mutations.updateLocation.updateLocation);
  const setInactive = useMutation(api.mutations.updateLocation.setInactive);

  // State
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userColor, setUserColor] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle, requesting, active, error


  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize user on mount
  useEffect(() => {
    let storedId = localStorage.getItem("tracker_userId");
    let storedName = localStorage.getItem("tracker_userName");
    let storedColor = localStorage.getItem("tracker_userColor");

    if (!storedId) {
      storedId = generateUserId();
      localStorage.setItem("tracker_userId", storedId);
    }
    if (!storedColor) {
      storedColor = getRandomColor();
      localStorage.setItem("tracker_userColor", storedColor);
    }

    setUserId(storedId);
    setUserColor(storedColor);
    if (storedName) {
      setUserName(storedName);
      setIsSetup(true);
    }
  }, []);

  // Send location to Convex
  const sendLocation = useCallback(
    async (position) => {
      const locationData = {
        userId,
        userName,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        color: userColor,
      };

      setMyLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      try {
        await updateLocation(locationData);
        setGpsStatus("active");
      } catch (err) {
        console.error("Error sending location:", err);
      }
    },
    [userId, userName, userColor, updateLocation]
  );

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setGpsStatus("error");
      return;
    }

    setGpsStatus("requesting");
    setError(null);

    // Watch position for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position);
        setIsTracking(true);
      },
      (err) => {
        console.error("GPS Error:", err);
        setGpsStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please allow location access in your browser settings.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information unavailable. Please check your GPS.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out. Retrying...");
            break;
          default:
            setError("An unknown error occurred getting your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    // Also send periodic updates every 10 seconds
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => sendLocation(position),
        () => { },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }, 10000);
  }, [sendLocation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTracking(false);
    setGpsStatus("idle");

    if (userId) {
      setInactive({ userId });
    }
  }, [userId, setInactive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Setup screen
  if (!isSetup) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <div className="setup-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <h1 className="setup-title">Live Location Tracker</h1>
          <p className="setup-subtitle">
            Share your real-time location with anyone. Open this page on any device to see all locations on the map.
          </p>
          <div className="setup-form">
            <label className="setup-label">Your Display Name</label>
            <input
              id="name-input"
              className="setup-input"
              type="text"
              placeholder="Enter your name..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && userName.trim()) {
                  localStorage.setItem("tracker_userName", userName.trim());
                  setIsSetup(true);
                }
              }}
              autoFocus
            />
            <div className="color-picker-row">
              <span className="setup-label">Your Color</span>
              <div className="color-options">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`color-dot ${userColor === c ? "selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => {
                      setUserColor(c);
                      localStorage.setItem("tracker_userColor", c);
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
            <button
              id="start-btn"
              className="setup-btn"
              disabled={!userName.trim()}
              onClick={() => {
                localStorage.setItem("tracker_userName", userName.trim());
                setIsSetup(true);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Start Tracking
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayLocations = allLocations || [];

  return (
    <div className="tracker-app">
      {/* Header */}
      <header className="tracker-header">
        <div className="header-left">
          <div className="header-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <div>
            <h1 className="header-title">Live Tracker</h1>
            <p className="header-meta">
              {activeLocations?.length || 0} active · {displayLocations.length} total
            </p>
          </div>
        </div>

        <div className="header-right">
          <div className="gps-indicator" data-status={gpsStatus}>
            <span className="gps-dot" />
            <span className="gps-label">
              {gpsStatus === "active" && "GPS Active"}
              {gpsStatus === "requesting" && "Requesting..."}
              {gpsStatus === "error" && "GPS Error"}
              {gpsStatus === "idle" && "GPS Off"}
            </span>
          </div>
          <button
            id="sidebar-toggle"
            className="icon-btn"
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="tracker-content">
        {/* Map */}
        <div className="map-container">
          <MapView
            locations={displayLocations}
            myLocation={myLocation}
            myUserId={userId}
          />

          {/* Floating controls */}
          <div className="map-controls">
            {!isTracking ? (
              <button id="track-btn" className="control-btn start" onClick={startTracking}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
                Start Sharing Location
              </button>
            ) : (
              <button id="stop-btn" className="control-btn stop" onClick={stopTracking}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop Sharing
              </button>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="error-toast">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
              <button onClick={() => setError(null)} className="error-close">×</button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="sidebar">
            {/* My Info */}
            <div className="sidebar-section">
              <h3 className="sidebar-heading">My Info</h3>
              <div className="user-card my-card">
                <div className="user-avatar" style={{ background: userColor }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                  <span className="user-status" data-active={isTracking}>
                    {isTracking ? "Sharing location" : "Not sharing"}
                  </span>
                </div>
              </div>
              {myLocation && (
                <div className="coords-display">
                  <div className="coord-row">
                    <span className="coord-label">Lat</span>
                    <span className="coord-value">{myLocation.latitude.toFixed(6)}</span>
                  </div>
                  <div className="coord-row">
                    <span className="coord-label">Lng</span>
                    <span className="coord-value">{myLocation.longitude.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Online Users */}
            <div className="sidebar-section">
              <h3 className="sidebar-heading">
                People
                <span className="badge">{displayLocations.length}</span>
              </h3>
              <div className="user-list">
                {displayLocations.length === 0 && (
                  <p className="empty-text">No one is sharing their location yet. Be the first!</p>
                )}
                {displayLocations.map((loc) => {
                  const isMe = loc.userId === userId;
                  const timeDiff = Date.now() - loc.lastUpdated;
                  const minutesAgo = Math.floor(timeDiff / 60000);
                  const timeLabel =
                    minutesAgo > 0 ? `${minutesAgo}m ago` : "Just now";

                  return (
                    <div key={loc._id} className={`user-card ${isMe ? "is-me" : ""}`}>
                      <div className="user-avatar" style={{ background: loc.color }}>
                        {loc.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <span className="user-name">
                          {loc.userName} {isMe ? "(You)" : ""}
                        </span>
                        <span className="user-status" data-active={loc.isActive}>
                          {loc.isActive ? `Active · ${timeLabel}` : `Offline · ${timeLabel}`}
                        </span>
                      </div>
                      <div
                        className="status-dot"
                        style={{
                          background: loc.isActive ? "#00e676" : "#666",
                          boxShadow: loc.isActive ? "0 0 8px #00e67680" : "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Share Link */}
            <div className="sidebar-section">
              <h3 className="sidebar-heading">Share</h3>
              <p className="share-text">
                Open this page on any device to see all live locations on the map in real-time.
              </p>
              <button
                id="copy-link-btn"
                className="share-btn"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  const btn = document.getElementById("copy-link-btn");
                  btn.textContent = "✓ Copied!";
                  setTimeout(() => {
                    btn.textContent = "📋 Copy Link";
                  }, 2000);
                }}
              >
                📋 Copy Link
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
