"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";

interface UbicacionValue {
  lat: number;
  lng: number;
  address: string;
}

interface UbicacionDisplayProps {
  value: UbicacionValue;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Reuse the same global loader from UbicacionInput
let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded && window.google?.maps) {
      resolve();
      return;
    }
    loadCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export default function UbicacionDisplay({ value }: UbicacionDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    loadGoogleMapsScript().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: value.lat, lng: value.lng },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    new google.maps.Marker({
      position: { lat: value.lat, lng: value.lng },
      map,
    });
  }, [ready, value.lat, value.lng]);

  if (!API_KEY) {
    return (
      <div className="text-sm text-red-500 italic">
        Google Maps API Key no configurada
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`;

  return (
    <div className="space-y-2 mt-1">
      <div
        ref={mapRef}
        className="w-full h-48 rounded-lg border border-gray-200 bg-gray-100"
        style={{ minHeight: "192px" }}
      />
      <div className="flex items-start gap-2">
        <MapPinIcon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-words"
          >
            {value.address}
          </a>
          <p className="text-xs text-gray-400 mt-0.5">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </p>
        </div>
      </div>
    </div>
  );
}
