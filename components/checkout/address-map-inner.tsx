"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { env } from "@/lib/env";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;transform:translate(-50%,-100%);position:relative"><svg viewBox="0 0 24 24" width="36" height="36"><path fill="#6F4E37" stroke="#fff" stroke-width="1.5" d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.8" fill="#F5E6CA"/></svg></div>`,
  iconSize: [0, 0],
});
const store = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-50%);width:30px;height:30px;border-radius:999px;background:#3E2723;color:#F5E6CA;display:grid;place-items:center;font:600 14px sans-serif;border:2px solid #fff">☕</div>`,
  iconSize: [0, 0],
});

function ClickToMove({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  }, [lat, lng, map]);
  return null;
}

export default function AddressMapInner({
  value,
  onChange,
  outlet,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  outlet?: { lat: number; lng: number; radiusKm: number; name: string } | null;
}) {
  const center = useMemo(() => value ?? (outlet ? { lat: outlet.lat, lng: outlet.lng } : { lat: -6.1783, lng: 106.6319 }), [value, outlet]);
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom={false} className="size-full" attributionControl>
      <TileLayer url={env.mapTileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {outlet && (
        <>
          <Circle center={[outlet.lat, outlet.lng]} radius={outlet.radiusKm * 1000} pathOptions={{ color: "#6F4E37", weight: 1, fillOpacity: 0.06 }} />
          <Marker position={[outlet.lat, outlet.lng]} icon={store} title={outlet.name} keyboard={false} />
        </>
      )}
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pin}
          draggable
          title="Lokasi pengantaran (geser untuk memindahkan)"
          eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onChange(p.lat, p.lng); } }}
        />
      )}
      {value && <Recenter lat={value.lat} lng={value.lng} />}
      <ClickToMove onChange={onChange} />
    </MapContainer>
  );
}
