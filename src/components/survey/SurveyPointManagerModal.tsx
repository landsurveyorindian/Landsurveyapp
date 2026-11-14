import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Download,
  X,
  FileSpreadsheet,
  Layers,
  Crosshair,
  Check,
  Compass,
} from 'lucide-react';
import { toDms } from '../../utils/geoUtils';
import { projectWgs84ToUtm } from '../../utils/geometryValidation';

export interface SurveyPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  type: 'stone' | 'benchmark' | 'corner' | 'traverse_station' | 'temporary';
  description?: string;
  recordedAt: string;
}

interface SurveyPointManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGpsLat?: number;
  currentGpsLng?: number;
  currentGpsAccuracy?: number;
  initialPoints?: SurveyPoint[];
  onPointsUpdated?: (points: SurveyPoint[]) => void;
}

export const SurveyPointManagerModal: React.FC<SurveyPointManagerModalProps> = ({
  isOpen,
  onClose,
  currentGpsLat,
  currentGpsLng,
  currentGpsAccuracy = 2.5,
  initialPoints = [],
  onPointsUpdated,
}) => {
  const [points, setPoints] = useState<SurveyPoint[]>(initialPoints);

  const [newPointName, setNewPointName] = useState('');
  const [newPointType, setNewPointType] = useState<SurveyPoint['type']>('stone');
  const [newPointDesc, setNewPointDesc] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCaptureCurrentPoint = () => {
    if (currentGpsLat === undefined || currentGpsLng === undefined) {
      setErrorNotice('No active GPS fix available to capture. Please enable GPS.');
      setTimeout(() => setErrorNotice(null), 4000);
      return;
    }

    const newPt: SurveyPoint = {
      id: `pt-${Date.now()}`,
      name: newPointName.trim() || `Station ${points.length + 1}`,
      lat: Number(currentGpsLat.toFixed(7)),
      lng: Number(currentGpsLng.toFixed(7)),
      accuracy: Number(currentGpsAccuracy.toFixed(2)),
      type: newPointType,
      description: newPointDesc.trim() || 'Recorded via Field GPS Walk Mode',
      recordedAt: new Date().toISOString(),
    };

    const updated = [...points, newPt];
    setPoints(updated);
    if (onPointsUpdated) onPointsUpdated(updated);

    setNewPointName('');
    setNewPointDesc('');
  };

  const handleDeletePoint = (id: string) => {
    const updated = points.filter((p) => p.id !== id);
    setPoints(updated);
    if (onPointsUpdated) onPointsUpdated(updated);
  };

  const handleExportCsv = () => {
    const headers = ['Station Name', 'Type', 'Latitude', 'Longitude', 'Lat DMS', 'Lng DMS', 'UTM Easting', 'UTM Northing', 'UTM Zone', 'Accuracy (m)', 'Description', 'Recorded At'];
    const rows = points.map((p) => {
      const utm = projectWgs84ToUtm(p.lng, p.lat);
      return [
        `"${p.name}"`,
        p.type,
        p.lat.toFixed(7),
        p.lng.toFixed(7),
        `"${toDms(p.lat, true)}"`,
        `"${toDms(p.lng, false)}"`,
        utm.easting.toFixed(2),
        utm.northing.toFixed(2),
        utm.zoneName,
        p.accuracy.toFixed(2),
        `"${p.description || ''}"`,
        p.recordedAt,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Survey_Stations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGeoJson = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: points.map((p) => {
        const utm = projectWgs84ToUtm(p.lng, p.lat);
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.lng, p.lat],
          },
          properties: {
            id: p.id,
            name: p.name,
            type: p.type,
            accuracyMeters: p.accuracy,
            utmEasting: utm.easting,
            utmNorthing: utm.northing,
            utmEpsg: utm.epsg,
            description: p.description,
            recordedAt: p.recordedAt,
          },
        };
      }),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(featureCollection, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Survey_Points_${Date.now()}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101B2D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#101B2D] text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5 text-[#22B8CF]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#101B2D]">Survey Point &amp; Station Manager</h3>
              <p className="text-[11px] text-[#64748B]">
                {points.length} Stations Recorded • Live WGS84 &amp; UTM Coordinates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capture New Station Form */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#101B2D] flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-[#0F9F79]" />
              <span>Capture Active GPS Point</span>
            </span>
            {currentGpsLat !== undefined && (
              <span className="text-[11px] font-semibold text-[#0F9F79] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                GPS: {currentGpsLat.toFixed(5)}°, {currentGpsLng?.toFixed(5)}° (±{currentGpsAccuracy.toFixed(1)}m)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
              placeholder="Station Name (e.g. Pillar 1)"
              className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0F9F79]"
            />
            <select
              value={newPointType}
              onChange={(e) => setNewPointType(e.target.value as any)}
              className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0F9F79]"
            >
              <option value="stone">Boundary Stone / Ghat</option>
              <option value="benchmark">GTS Benchmark</option>
              <option value="corner">Plot Corner Turning Point</option>
              <option value="traverse_station">Traverse Instrument Station</option>
              <option value="temporary">Temporary Peg</option>
            </select>
            <input
              type="text"
              value={newPointDesc}
              onChange={(e) => setNewPointDesc(e.target.value)}
              placeholder="Notes / physical markings"
              className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0F9F79]"
            />
          </div>

          {errorNotice && (
            <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
              {errorNotice}
            </div>
          )}

          <button
            type="button"
            onClick={handleCaptureCurrentPoint}
            className="w-full min-h-[44px] bg-[#0F9F79] hover:bg-[#0c8263] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Record Station at Current GPS Location</span>
          </button>
        </div>

        {/* Stations Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#101B2D]">Recorded Survey Stations ({points.length})</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={points.length === 0}
                className="text-[11px] font-bold text-[#101B2D] hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none border border-[#E2E8F0] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0F9F79]" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportGeoJson}
                disabled={points.length === 0}
                className="text-[11px] font-bold text-[#101B2D] hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none border border-[#E2E8F0] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Layers className="w-3.5 h-3.5 text-[#22B8CF]" />
                <span>GeoJSON</span>
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
            {points.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No stations recorded yet — capture your first point above</p>
                <p className="text-[11px] text-slate-400 mt-1">Walk to a boundary stone or corner station and tap record</p>
              </div>
            ) : (
              points.map((pt, idx) => {
              const utm = projectWgs84ToUtm(pt.lng, pt.lat);
              return (
                <div key={pt.id} className="p-3 bg-white hover:bg-slate-50/80 transition flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#101B2D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <strong className="text-slate-900 font-bold truncate">{pt.name}</strong>
                      <span className="text-[10px] uppercase font-semibold text-[#64748B] bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {pt.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-[11px] text-[#64748B] pl-7">
                      <div>
                        WGS84: <span className="font-mono text-slate-800">{pt.lat.toFixed(6)}°, {pt.lng.toFixed(6)}°</span>
                      </div>
                      <div>
                        UTM: <span className="font-mono text-slate-800">E:{utm.easting.toFixed(1)} N:{utm.northing.toFixed(1)}</span>
                      </div>
                    </div>

                    {pt.description && (
                      <p className="text-[11px] text-slate-600 pl-7 italic">"{pt.description}"</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePoint(pt.id)}
                    className="text-slate-400 hover:text-[#DC2626] p-1.5 rounded-lg transition"
                    title="Delete Station"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#101B2D] text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
