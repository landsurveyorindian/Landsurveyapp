import React, { useState, useEffect } from 'react';
import {
  fetchUserProjects,
  saveProject,
  removeProject,
  SurveyProject,
} from '../../services/projectsService';
import { LandDocumentScannerModal, ExtractedCadastralData } from '../ai/LandDocumentScannerModal';
import { useAuth } from '../../firebase/AuthContext';
import {
  FolderKanban,
  Search,
  Printer,
  ShoppingBag,
  Trash2,
  FileCheck2,
  Layers,
  Table,
  Maximize2,
  Clock,
  Compass,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Download,
  FileText,
  Sparkles,
} from 'lucide-react';
import { getUtmZoneForLngLat, projectWgs84ToUtm, exportPolygonToGeoJson } from '../../utils/gis';
import { generateSurveyReportPdf } from '../../utils/pdfExport';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Toast } from '../common/Toast';

interface ProjectsTabProps {
  selectedState: string;
  onPublishToMarket?: (project: SurveyProject) => void;
  onLoadIntoMap?: (project: SurveyProject) => void;
  onProjectsCountChange?: (count: number) => void;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  selectedState,
  onPublishToMarket,
  onLoadIntoMap,
  onProjectsCountChange,
}) => {
  const { user, openSignInModal } = useAuth();
  const [projects, setProjects] = useState<SurveyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReportProject, setActiveReportProject] = useState<SurveyProject | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const handleApplyExtractedData = async (data: ExtractedCadastralData) => {
    const surveyNo = data.surveyNumber || 'Unspecified';
    const place = data.village || data.district || selectedState;
    const newProject: SurveyProject = {
      id: `proj-doc-${Date.now()}`,
      userId: user?.uid || 'guest',
      name: `Survey No. ${surveyNo} (${place})`,
      state: data.state || selectedState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'map_polygon',
      notes: `Extracted via Gemini Vision. Document: ${data.landClassification || 'Cadastral Document'}. Owner: ${data.ownerName || 'Self-reported'}. Extent: ${data.extentAcres ? `${data.extentAcres} Ac` : data.extentCents ? `${data.extentCents} Cts` : 'Recorded'}. Summary: ${data.summary || 'N/A'}.`,
      polygon: (data.extentAcres || data.extentCents) ? {
        coordinates: [],
        areaSqm: (data.extentAcres || 0) * 4046.86 + ((data.extentCents || 0) * 40.4686),
        areaAcres: data.extentAcres || (data.extentCents ? data.extentCents / 100 : 0),
        areaCents: data.extentCents || (data.extentAcres ? data.extentAcres * 100 : 0),
      } : undefined,
    };
    await saveProject(newProject);
    setProjects((prev) => {
      const updated = [newProject, ...prev];
      onProjectsCountChange?.(updated.length);
      return updated;
    });
    setToastMessage(`Document imported: Survey No. ${surveyNo}`);
    setToastType('success');
  };

  const loadProjects = async () => {
    setLoading(true);
    const list = await fetchUserProjects(user?.uid);
    setProjects(list);
    setLoading(false);
    onProjectsCountChange?.(list.length);
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    await removeProject(id, user?.uid);
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      onProjectsCountChange?.(updated.length);
      return updated;
    });
    setToastMessage('Survey project deleted successfully.');
    setToastType('info');
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  });

  const printReport = () => {
    window.print();
  };

  const handleDownloadPdf = (project: SurveyProject) => {
    generateSurveyReportPdf(project);
  };

  const handleDownloadGeoJson = (project: SurveyProject) => {
    if (!project.polygon) return;
    const geojson = exportPolygonToGeoJson(project.polygon.coordinates, {
      name: project.name,
      state: project.state,
      areaCents: project.polygon.areaCents,
      areaAcres: project.polygon.areaAcres,
      areaSqm: project.polygon.areaSqm,
    });
    const blob = new Blob([geojson], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sthal_project_${project.id}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-emerald-600" />
            <span>Survey Projects & Verification Reports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized with Cloud Firestore (or local device when offline).
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan Land Document (AI)</span>
          </button>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Guest Cloud Sync Prompt Banner */}
      {!user && (
        <div className="mb-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Currently saving to device cache. Sign in to sync your surveys with Cloud Firestore.</span>
          </div>
          <button
            type="button"
            onClick={openSignInModal}
            className="self-start sm:self-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">
          Loading survey archives...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
          <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Survey Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Use the Smart Calculator, Bhuvan Map, or CAD Plotter to measure parcels and save them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredProjects.map((proj) => {
            const hasPolygon = proj.polygon && proj.polygon.coordinates.length >= 3;
            const hasTraverse = proj.traverse && proj.traverse.lines?.length > 0;
            const hasTriangulation = proj.calculations;

            return (
              <div
                key={proj.id}
                onClick={() => setActiveReportProject(proj)}
                className="bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-emerald-500 rounded-2xl p-4 cursor-pointer transition shadow-xs hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-emerald-700 flex items-center gap-1 font-mono">
                        {proj.type === 'map_polygon' && <Compass className="w-3 h-3" />}
                        {proj.type === 'traverse' && <Table className="w-3 h-3" />}
                        {proj.type === 'triangulation' && <Maximize2 className="w-3 h-3" />}
                        {proj.type === 'cad_import' && <Layers className="w-3 h-3" />}
                        <span>{proj.type.replace('_', ' ')}</span>
                      </span>

                      {/* Sync State Badge */}
                      <span
                        className={`text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          proj.syncStatus === 'SYNCED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : proj.syncStatus === 'PENDING_SYNC'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : proj.syncStatus === 'SYNCING'
                            ? 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse'
                            : proj.syncStatus === 'CONFLICT'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : proj.syncStatus === 'SYNC_FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            proj.syncStatus === 'SYNCED'
                              ? 'bg-emerald-500'
                              : proj.syncStatus === 'PENDING_SYNC'
                              ? 'bg-amber-500'
                              : proj.syncStatus === 'SYNCING'
                              ? 'bg-sky-500'
                              : proj.syncStatus === 'CONFLICT'
                              ? 'bg-purple-500'
                              : proj.syncStatus === 'SYNC_FAILED'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span>
                          {proj.syncStatus === 'SYNCED'
                            ? 'Cloud Synced'
                            : proj.syncStatus === 'PENDING_SYNC'
                            ? 'Pending Sync'
                            : proj.syncStatus === 'SYNCING'
                            ? 'Syncing'
                            : proj.syncStatus === 'CONFLICT'
                            ? 'Conflict'
                            : proj.syncStatus === 'SYNC_FAILED'
                            ? 'Sync Failed'
                            : 'Local Only'}
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => requestDelete(proj.id, e)}
                      title="Delete Project"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition opacity-70 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition mb-1">
                    {proj.name}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span>{proj.state}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Highlights / Area Badge */}
                  {hasPolygon && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 font-sans">Extent:</span>
                      <span className="text-emerald-700 font-bold">
                        {proj.polygon?.areaCents} Cents ({proj.polygon?.areaAcres} Ac)
                      </span>
                    </div>
                  )}

                  {hasTraverse && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 font-sans">Traverse Closure:</span>
                      <span className="text-emerald-700 font-bold">
                        {proj.traverse?.relativePrecision}
                      </span>
                    </div>
                  )}

                  {hasTriangulation && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 font-sans">Calculated:</span>
                      <span className="text-emerald-700 font-bold">
                        {proj.calculations?.breakdown?.formattedAcreString || `${proj.calculations?.breakdown?.cents} Cents`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions bottom */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Survey Report</span>
                  </span>

                  {hasPolygon && onPublishToMarket && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublishToMarket(proj);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Survey Verification Report Modal */}
      {activeReportProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto print:bg-white print:text-black print:max-h-none print:shadow-none print:border-none">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">
                  Survey Measurement Summary
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                  Self-Measured
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activeReportProject)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-bold shadow-xs"
                  title="Download formatted PDF report"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                {activeReportProject.polygon && (
                  <button
                    type="button"
                    onClick={() => handleDownloadGeoJson(activeReportProject)}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold"
                    title="Download GeoJSON vector boundary"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>GeoJSON</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={printReport}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportProject(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Measurement Summary Container */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 print:border-black print:bg-white space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 print:text-black tracking-tight">
                    Survey Measurement Summary
                  </h1>
                  <p className="text-xs text-slate-500 print:text-gray-700">
                    Jurisdiction: State of {activeReportProject.state} • Self-measured calculation reference
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-500 print:text-gray-600">
                  <div>Ref: {activeReportProject.id}</div>
                  <div>Date: {new Date(activeReportProject.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Prominent Legal Disclaimer Banner (Required by Part 1, Item 2) */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>DISCLAIMER: NOT AN OFFICIAL GOVERNMENT SURVEY RECORD</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  This summary is generated from self-reported device GNSS coordinates and manual vertex inputs for calculation and planning reference only. It does <strong>NOT</strong> constitute an official government survey record, cadastral title deed, revenue sub-division endorsement, or certified boundary map. For legal transactions and registration, obtain certified records from the relevant state revenue department (Meebhoomi, Dharani, Bhoomi, Patta Chitta, MahaBhulekh).
                </p>
              </div>

              {/* Title / Remarks */}
              <div className="bg-white print:bg-gray-100 p-3 rounded-lg border border-slate-200 print:border-gray-300 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 print:text-gray-700 block">
                  Project Parcel Title
                </span>
                <p className="text-sm font-bold text-slate-900 print:text-black">
                  {activeReportProject.name}
                </p>
                {activeReportProject.notes && (
                  <p className="text-xs text-slate-600 print:text-gray-600 mt-1">
                    {activeReportProject.notes}
                  </p>
                )}
              </div>

              {/* Extent Summary */}
              {activeReportProject.polygon && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                  <div className="bg-white print:bg-gray-50 p-2 rounded border border-slate-200 print:border-gray-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Acres</span>
                    <span className="font-bold text-slate-900 print:text-black text-sm">
                      {activeReportProject.polygon.areaAcres}
                    </span>
                  </div>
                  <div className="bg-white print:bg-gray-50 p-2 rounded border border-slate-200 print:border-gray-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Cents</span>
                    <span className="font-bold text-emerald-700 print:text-black text-sm">
                      {activeReportProject.polygon.areaCents}
                    </span>
                  </div>
                  <div className="bg-white print:bg-gray-50 p-2 rounded border border-slate-200 print:border-gray-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Sq. Meters</span>
                    <span className="font-bold text-slate-900 print:text-black text-sm">
                      {activeReportProject.polygon.areaSqm?.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white print:bg-gray-50 p-2 rounded border border-slate-200 print:border-gray-200 shadow-xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Boundary Vertices</span>
                    <span className="font-bold text-cyan-700 print:text-black text-sm">
                      {activeReportProject.polygon.coordinates.length} Corners
                    </span>
                  </div>
                </div>
              )}

              {/* Coordinate Table (Auto-detecting UTM Zone!) */}
              {activeReportProject.polygon && activeReportProject.polygon.coordinates.length > 0 && (() => {
                const firstCoord = activeReportProject.polygon.coordinates[0];
                const autoZone = getUtmZoneForLngLat(firstCoord[0], firstCoord[1]);
                return (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-700 print:text-black mb-1.5">
                      Boundary Corner Coordinates (WGS84 &amp; {autoZone.name})
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 print:border-gray-300 text-xs font-mono bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 print:bg-gray-200 text-slate-600 print:text-black text-[10px] uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-2.5 py-1.5">Station</th>
                            <th className="px-2.5 py-1.5">Latitude (°N)</th>
                            <th className="px-2.5 py-1.5">Longitude (°E)</th>
                            <th className="px-2.5 py-1.5">{autoZone.name} Easting (m)</th>
                            <th className="px-2.5 py-1.5">{autoZone.name} Northing (m)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-gray-200 text-[11px]">
                          {activeReportProject.polygon.coordinates.map((coord, idx) => {
                            const utm = projectWgs84ToUtm(coord[0], coord[1], autoZone.epsgCode);
                            return (
                              <tr key={idx}>
                                <td className="px-2.5 py-1 font-bold text-emerald-700 print:text-black">
                                  Stn {idx + 1}
                                </td>
                                <td className="px-2.5 py-1">{coord[1].toFixed(6)}</td>
                                <td className="px-2.5 py-1">{coord[0].toFixed(6)}</td>
                                <td className="px-2.5 py-1">{utm.easting.toLocaleString()}</td>
                                <td className="px-2.5 py-1">{utm.northing.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Boundary Side Lengths */}
              {activeReportProject.polygon?.edgeLengths && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 print:text-black mb-1.5">
                    Boundary Side Lengths
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {activeReportProject.polygon.edgeLengths.map((e) => (
                      <div key={e.index} className="bg-white print:bg-gray-50 p-2 rounded border border-slate-200 print:border-gray-300 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-sans block">Side {e.index}</span>
                        <span className="font-bold text-slate-800 print:text-black">
                          {e.lengthMeters} m ({e.lengthFeet} ft)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informational Footer Note (Replacing fake signature blocks) */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10.5px] text-slate-500">
                <p className="font-semibold text-slate-700">Self-Measured Survey Summary for Area Calculation &amp; Planning</p>
                <p className="text-slate-400 mt-0.5">Calculated using WGS84 geodesic algorithms and standard projected UTM coordinate systems.</p>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setActiveReportProject(null)}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>

              {activeReportProject.polygon && onPublishToMarket && (
                <button
                  type="button"
                  onClick={() => {
                    const p = activeReportProject;
                    setActiveReportProject(null);
                    onPublishToMarket(p);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                  <span>Publish to Sthal Market</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete survey project?"
        message="Are you sure you want to remove this saved survey project? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Global In-App Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />

      {/* Gemini AI Land Document Scanner Modal */}
      <LandDocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedState={selectedState}
        onApplyExtractedData={handleApplyExtractedData}
      />
    </div>
  );
};
