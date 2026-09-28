"use client";
import { useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface LocationPickerProps {
  onSelect?: (location: { city: string; area?: string; latitude?: number; longitude?: number }) => void;
  value?: string;
}

export default function LocationPicker({ onSelect, value }: LocationPickerProps) {
  const [mode, setMode] = useState<"idle" | "manual" | "gps">("idle");
  const [manual, setManual] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const useCurrentLocation = () => {
    setLoading(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        setMode("gps");
        onSelect?.({
          city: "Current location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        setLoading(false);
        setError("Location access isn't available. You can search by city or enter your location manually.");
        setMode("manual");
      }
    );
  };

  return (
    <div className="space-y-3">
      {mode === "idle" && (
        <div className="bg-surface-muted rounded-2xl p-5 border border-border">
          <h4 className="font-semibold text-ink mb-1">Find workers near you</h4>
          <p className="text-sm text-ink-secondary mb-4">
            Allow location access to find skilled workers around your area.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={useCurrentLocation} loading={loading} className="flex-1">
              <Navigation size={16} /> Use My Location
            </Button>
            <Button variant="outline" onClick={() => setMode("manual")} className="flex-1">
              <Search size={16} /> Enter Location Manually
            </Button>
          </div>
        </div>
      )}

      {(mode === "manual" || mode === "gps") && (
        <div className="space-y-2">
          <Input
            label="Location"
            icon={<MapPin size={16} />}
            placeholder="City, area, or address"
            value={mode === "gps" ? "📍 Current location" : manual}
            onChange={(e) => {
              setManual(e.target.value);
              setMode("manual");
              onSelect?.({ city: e.target.value });
            }}
          />
          {mode === "gps" && (
            <button onClick={() => setMode("manual")} className="text-xs text-ink-secondary hover:text-ink underline">
              Enter manually instead
            </button>
          )}
          {mode === "manual" && (
            <button onClick={useCurrentLocation} className="text-xs text-ink-secondary hover:text-ink underline flex items-center gap-1">
              <Navigation size={12} /> Use my current location
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
