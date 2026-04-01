"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface UbicacionValue {
  lat: number;
  lng: number;
  address: string;
}

interface UbicacionInputProps {
  value: UbicacionValue | null;
  onChange: (val: UbicacionValue | null) => void;
  placeholder?: string;
  required?: boolean;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Global script loader to avoid duplicates
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

export default function UbicacionInput({
  value,
  onChange,
  placeholder = "Buscar dirección...",
  required = false,
}: UbicacionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);
  const [inputText, setInputText] = useState(value?.address ?? "");

  // Load Google Maps script
  useEffect(() => {
    if (!API_KEY) return;
    loadGoogleMapsScript().then(() => setReady(true));
  }, []);

  // Init map + autocomplete when ready
  useEffect(() => {
    if (!ready || !mapRef.current || !inputRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const defaultCenter = value
      ? { lat: value.lat, lng: value.lng }
      : { lat: 19.4326, lng: -99.1332 }; // CDMX default

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: value ? 15 : 5,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    // Place marker if value exists
    if (value) {
      markerRef.current = new google.maps.Marker({
        position: { lat: value.lat, lng: value.lng },
        map,
        draggable: true,
      });
      markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          reverseGeocode(pos.lat(), pos.lng());
        }
      });
    }

    // Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "name"],
    });
    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || place.name || "";

      map.setCenter({ lat, lng });
      map.setZoom(15);

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      } else {
        markerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
        });
        markerRef.current.addListener("dragend", () => {
          const pos = markerRef.current?.getPosition();
          if (pos) {
            reverseGeocode(pos.lat(), pos.lng());
          }
        });
      }

      setInputText(address);
      onChange({ lat, lng, address });
    });

    // Click on map to place/move marker
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      } else {
        markerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
        });
        markerRef.current.addListener("dragend", () => {
          const pos = markerRef.current?.getPosition();
          if (pos) {
            reverseGeocode(pos.lat(), pos.lng());
          }
        });
      }

      reverseGeocode(lat, lng);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const address =
          status === "OK" && results?.[0]
            ? results[0].formatted_address
            : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setInputText(address);
        onChange({ lat, lng, address });
      });
    },
    [onChange],
  );

  const handleClear = () => {
    setInputText("");
    onChange(null);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: 19.4326, lng: -99.1332 });
      mapInstanceRef.current.setZoom(5);
    }
  };

  if (!API_KEY) {
    return (
      <div className="text-sm text-red-500 italic">
        Google Maps API Key no configurada
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={placeholder}
          required={required && !value}
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-48 rounded-lg border border-gray-200 bg-gray-100"
        style={{ minHeight: "192px" }}
      />

      {value && (
        <p className="text-xs text-gray-500">
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

export type { UbicacionValue };
