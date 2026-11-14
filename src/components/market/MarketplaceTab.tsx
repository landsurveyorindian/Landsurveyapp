import React, { useState, useEffect } from 'react';
import {
  fetchMarketListings,
  fetchPrivateSellerData,
  createMarketListing,
  deleteMarketListing,
  updateMarketListingVerification,
  uploadPlotPhoto,
  uploadPlotDocument,
  MarketListing,
  VerificationStatus,
} from '../../services/marketService';
import { SurveyProject } from '../../services/projectsService';
import { useAuth } from '../../firebase/AuthContext';
import {
  ShoppingBag,
  ShieldCheck,
  Phone,
  MessageCircle,
  MapPin,
  Search,
  Filter,
  Plus,
  Compass,
  CheckCircle2,
  Maximize2,
  Trash2,
  X,
  Share2,
  Camera,
  Clock,
  AlertCircle,
  FileCheck,
  Eye,
  Loader2,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Toast } from '../common/Toast';

interface MarketplaceTabProps {
  selectedState: string;
  prefillProject?: SurveyProject | null;
  onClearPrefill?: () => void;
}

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({
  selectedState,
  prefillProject,
  onClearPrefill,
}) => {
  const { user, role, openSignInModal } = useAuth();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('All');

  // Post Listing Modal
  const [postModalOpen, setPostModalOpen] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [state, setState] = useState(selectedState);
  const [district, setDistrict] = useState('');
  const [surveyNo, setSurveyNo] = useState('');
  const [areaCents, setAreaCents] = useState<number>(30);
  const [priceInr, setPriceInr] = useState<number>(4500000);
  const [sellerName, setSellerName] = useState(user?.displayName || 'Registered Surveyor');
  const [sellerContact, setSellerContact] = useState('+91 ');
  const [zoning, setZoning] = useState('Residential / Layout Approved');
  const [roadWidthFt, setRoadWidthFt] = useState(40);
  const [lat, setLat] = useState<number>(16.5168);
  const [lng, setLng] = useState<number>(80.5284);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<string>('');

  // Photos & Verification Documents (Task 3: Firebase Storage uploads)
  interface UploadItem {
    id: string;
    name: string;
    status: 'uploading' | 'done' | 'error';
    url?: string;
    error?: string;
  }

  const [photoUploads, setPhotoUploads] = useState<UploadItem[]>([]);
  const [docUploads, setDocUploads] = useState<UploadItem[]>([]);
  const [draftListingId, setDraftListingId] = useState<string>(() => `plot-${Date.now()}`);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [requestVerification, setRequestVerification] = useState<boolean>(false);
  const [activeReviewPlot, setActiveReviewPlot] = useState<MarketListing | null>(null);

  // Role-based authorization matching firestore.rules (strictly Owner)
  const isAdmin = role === 'owner';

  const handleUpdateVerification = async (newStatus: 'verified' | 'unverified') => {
    if (!activeReviewPlot || !isAdmin || !user) return;
    const verified = newStatus === 'verified';
    try {
      await updateMarketListingVerification(
        activeReviewPlot.id,
        newStatus,
        `Title documents reviewed and marked ${newStatus} by Owner Administrator`,
        activeReviewPlot.userId,
        { uid: user.uid, email: user.email || '' }
      );
      setListings((prev) =>
        prev.map((l) =>
          l.id === activeReviewPlot.id
            ? { ...l, verificationStatus: newStatus, verified, verifiedByUid: user.uid, verifiedBy: user.email || '' }
            : l
        )
      );
      setToastMessage(`Listing "${activeReviewPlot.title}" marked as ${newStatus}!`);
      setToastType('success');
    } catch (err: any) {
      console.error('Failed to update verification:', err);
      setToastMessage('Could not update verification status in Firestore (access denied).');
      setToastType('error');
    } finally {
      setActiveReviewPlot(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const availableSlots = 3 - photoUploads.length;
    if (availableSlots <= 0) return;
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    e.target.value = '';

    for (const file of selectedFiles) {
      const hex = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('')
        : `${Date.now()}`;
      const uploadId = `${Date.now()}-${hex}`;
      const newUpload: UploadItem = { id: uploadId, name: file.name, status: 'uploading' };
      setPhotoUploads((prev) => [...prev, newUpload]);

      try {
        const downloadUrl = await uploadPlotPhoto(file, draftListingId);
        setPhotoUploads((prev) =>
          prev.map((it) => (it.id === uploadId ? { ...it, status: 'done', url: downloadUrl } : it))
        );
      } catch (err: any) {
        setPhotoUploads((prev) =>
          prev.map((it) =>
            it.id === uploadId ? { ...it, status: 'error', error: err?.message || 'Upload failed' } : it
          )
        );
      }
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const availableSlots = 2 - docUploads.length;
    if (availableSlots <= 0) return;
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    e.target.value = '';

    for (const file of selectedFiles) {
      const hex = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('')
        : `${Date.now()}`;
      const uploadId = `${Date.now()}-${hex}`;
      const newUpload: UploadItem = { id: uploadId, name: file.name, status: 'uploading' };
      setDocUploads((prev) => [...prev, newUpload]);
      setRequestVerification(true);

      try {
        const downloadUrl = await uploadPlotDocument(file, draftListingId);
        setDocUploads((prev) =>
          prev.map((it) => (it.id === uploadId ? { ...it, status: 'done', url: downloadUrl } : it))
        );
      } catch (err: any) {
        setDocUploads((prev) =>
          prev.map((it) =>
            it.id === uploadId ? { ...it, status: 'error', error: err?.message || 'Upload failed' } : it
          )
        );
      }
    }
  };

  const loadListings = async () => {
    setLoading(true);
    const list = await fetchMarketListings();
    setListings(list);
    setLoading(false);
  };

  useEffect(() => {
    loadListings();
  }, []);

  // When a survey project is sent for publishing
  useEffect(() => {
    if (prefillProject) {
      setTitle(`Plot - ${prefillProject.name}`);
      setState(prefillProject.state);
      if (prefillProject.polygon) {
        setAreaCents(prefillProject.polygon.areaCents || 25);
        if (prefillProject.polygon.coordinates.length > 0) {
          const first = prefillProject.polygon.coordinates[0];
          setLng(first[0]);
          setLat(first[1]);
          setBoundaryGeoJson(
            JSON.stringify({
              type: 'Polygon',
              coordinates: [[...prefillProject.polygon.coordinates, prefillProject.polygon.coordinates[0]]],
            })
          );
        }
      }
      setDraftListingId(`plot-${Date.now()}`);
      setPhotoUploads([]);
      setDocUploads([]);
      setPostModalOpen(true);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillProject, onClearPrefill]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !sellerContact.trim() || areaCents <= 0) {
      setFormError('Please fill all required fields (Title, Extent in Cents, and Contact).');
      return;
    }

    const isUploading =
      photoUploads.some((p) => p.status === 'uploading') ||
      docUploads.some((d) => d.status === 'uploading');
    if (isUploading) {
      setFormError('Files are still uploading to cloud storage. Please wait for them to finish.');
      return;
    }

    const completedPhotos = photoUploads
      .filter((p) => p.status === 'done' && p.url)
      .map((p) => p.url as string);
    const completedDocs = docUploads
      .filter((d) => d.status === 'done' && d.url)
      .map((d) => d.url as string);

    const areaAcres = Number((areaCents / 100).toFixed(4));
    const areaSqYards = Number((areaCents * 48.4).toFixed(2));

    const newListing: MarketListing = {
      id: draftListingId,
      userId: user?.uid || 'guest',
      userEmail: user?.email || 'surveyor@sthalmeasure.in',
      title,
      state,
      district: district || 'Andhra Pradesh Zone',
      surveyNo: surveyNo || 'Sy No. Self-Reported',
      areaCents: Number(areaCents),
      areaSqYards,
      areaAcres,
      priceInr: Number(priceInr),
      sellerName,
      sellerContact,
      lat,
      lng,
      boundaryGeoJson,
      verified: false,
      verificationStatus: requestVerification && completedDocs.length > 0 ? 'pending' : 'unverified',
      isDemo: false,
      photos: completedPhotos.length > 0 ? completedPhotos : undefined,
      verificationDocuments: completedDocs.length > 0 ? completedDocs : undefined,
      zoning,
      roadWidthFt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createMarketListing(newListing, {
      sellerName,
      sellerEmail: user?.email || '',
      sellerContact,
      verificationDocuments: completedDocs,
    });
    setListings((prev) => [newListing, ...prev]);
    setPostModalOpen(false);
    setToastMessage('Plot listing published to Sthal Marketplace!');
    setToastType('success');
    // Reset form
    setTitle('');
    setPhotoUploads([]);
    setDocUploads([]);
    setRequestVerification(false);
    setDraftListingId(`plot-${Date.now()}`);
  };

  const requestDeleteListing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDeleteListing = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    await deleteMarketListing(id, user?.uid);
    setListings((prev) => prev.filter((l) => l.id !== id));
    setToastMessage('Plot listing deleted.');
    setToastType('info');
  };

  const formatPrice = (p: number) => {
    if (p >= 10000000) {
      return `₹ ${(p / 10000000).toFixed(2)} Cr`;
    }
    if (p >= 100000) {
      return `₹ ${(p / 100000).toFixed(1)} Lakhs`;
    }
    return `₹ ${p.toLocaleString('en-IN')}`;
  };

  const filteredListings = listings.filter((item) => {
    const matchQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.surveyNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchState = filterState === 'All' || item.state === filterState;
    return matchQuery && matchState;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-24 text-slate-900">
      {/* Header & Post CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sthal Market <span className="text-emerald-700">• Community Land Listings</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse and publish land plots with boundary coordinates, seller contacts, and cadastral references.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              openSignInModal();
            } else {
              setPostModalOpen(true);
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Post Land Listing</span>
        </button>
      </div>

      {/* Mandatory Title Verification Disclaimer Banner */}
      <div className="mb-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 flex items-start gap-3 text-slate-800">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-amber-950">
            Important Notice on Land Verification & Legal Title
          </p>
          <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs">
            AI document scanning, optical coordinate extraction, and community listings are analytical tools only. They do not constitute formal legal title verification or official proof of ownership. Buyers and surveyors must independently verify Encumbrance Certificates (EC), Pattadar Passbooks, and boundary records at the jurisdictional Sub-Registrar / Tahsildar office.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-5 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by survey no, mandal, district, or highway..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {['All', 'Andhra Pradesh', 'Telangana', 'Karnataka'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterState(st)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                filterState === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">
          Loading land listings...
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 space-y-2">
          <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No plots match your criteria</h3>
          <p className="text-xs text-slate-500">
            Try adjusting your search terms or publish a new survey parcel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((plot) => (
            <div
              key={plot.id}
              className="bg-white hover:bg-slate-50/40 border border-slate-200 hover:border-emerald-500/60 rounded-2xl p-4 shadow-xs hover:shadow-md flex flex-col justify-between transition group relative"
            >
              <div>
                {/* Status Badges & Delete Button */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  {plot.isDemo ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Sample Listing (Demo)</span>
                    </span>
                  ) : plot.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold uppercase tracking-wide">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Verified Title</span>
                    </span>
                  ) : plot.verificationStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-extrabold uppercase tracking-wide">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Verification Pending</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-extrabold uppercase tracking-wide">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unverified — Self-Reported</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {isAdmin && plot.verificationDocuments && plot.verificationDocuments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveReviewPlot(plot)}
                        title="Administrator: Review verification documents"
                        className="text-[10px] text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded-lg border border-blue-300 bg-blue-50 font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>Docs</span>
                      </button>
                    )}

                    {user?.uid === plot.userId && (
                      <button
                        type="button"
                        onClick={(e) => requestDeleteListing(plot.id, e)}
                        title="Delete your listing"
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 mb-1.5">
                  {plot.title}
                </h3>

                {/* Location & Survey No */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{plot.district}, {plot.state}</span>
                </div>

                {/* Price and Area Highlight */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                      {formatPrice(plot.priceInr)}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      {plot.areaCents} Cents ({plot.areaAcres} Ac)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono border-t border-slate-200 pt-2">
                    <div>
                      <span className="text-slate-500 block font-sans text-[10px]">Sq. Yards:</span>
                      <span className="text-slate-800 font-bold">{plot.areaSqYards.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans text-[10px]">Survey No:</span>
                      <span className="text-cyan-800 font-semibold">{plot.surveyNo}</span>
                    </div>
                  </div>

                  {plot.roadWidthFt && (
                    <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/80 pt-1.5">
                      <span>Facing Road: {plot.roadWidthFt} ft wide</span>
                      <span className="text-emerald-700 font-medium">{plot.zoning}</span>
                    </div>
                  )}
                </div>

                {/* Coordinates pin */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-3">
                  <span>GPS: {plot.lat.toFixed(4)}°N, {plot.lng.toFixed(4)}°E</span>
                  <span className="text-[10px] text-slate-500 font-sans">Self-reported coordinates</span>
                </div>
              </div>

              {/* Contact Seller CTA */}
              {plot.sellerContact ? (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`tel:${plot.sellerContact.replace(/\s+/g, '')}`}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call Seller</span>
                  </a>

                  <a
                    href={`https://wa.me/${plot.sellerContact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hi, I saw your plot listing "${plot.title}" (${plot.areaCents} Cents, Sy No: ${plot.surveyNo}) on Sthal Measure. Is it still available?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Direct Owner Title</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) {
                        openSignInModal();
                        return;
                      }
                      const privateData = await fetchPrivateSellerData(plot.id);
                      if (privateData?.sellerContact) {
                        setListings((prev) =>
                          prev.map((l) => (l.id === plot.id ? { ...l, sellerContact: privateData.sellerContact } : l))
                        );
                      } else {
                        setToastMessage('Seller phone & documents are restricted to listing owner or verified administrators.');
                        setToastType('info');
                      }
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-lg transition"
                  >
                    View Contact
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Land Listing Modal */}
      {postModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Post Land Listing</h3>
              </div>
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 50 Cents Highway Plot near Vijayawada"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State Jurisdiction *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-emerald-800 font-bold focus:outline-none"
                  >
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Maharashtra">Maharashtra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    District / Mandal *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Amaravati / Guntur"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Revenue Survey No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={surveyNo}
                    onChange={(e) => setSurveyNo(e.target.value)}
                    placeholder="e.g. Sy No. 142/2B"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Extent in Cents *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={areaCents || ''}
                    onChange={(e) => setAreaCents(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-emerald-800 font-bold font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceInr || ''}
                    onChange={(e) => setPriceInr(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 7500000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatPrice(priceInr)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seller / Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellerContact}
                    onChange={(e) => setSellerContact(e.target.value)}
                    placeholder="+91 98480..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zoning / Approvals
                  </label>
                  <input
                    type="text"
                    value={zoning}
                    onChange={(e) => setZoning(e.target.value)}
                    placeholder="e.g. CRDA Approved / Agriculture"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Road Width (Feet)
                  </label>
                  <input
                    type="number"
                    value={roadWidthFt || ''}
                    onChange={(e) => setRoadWidthFt(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 40"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Attachments with Storage Uploads and Progress State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plot Photos (Up to 3 Photos)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-center gap-1.5 transition">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={photoUploads.length >= 3}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {photoUploads.filter((p) => p.status === 'done').length} / 3 uploaded
                  </span>
                </div>

                {photoUploads.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {photoUploads.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 h-20 flex flex-col items-center justify-center text-center p-1"
                      >
                        {item.status === 'uploading' && (
                          <div className="flex flex-col items-center gap-1">
                            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                            <span className="text-[10px] text-slate-600 font-medium truncate max-w-[80px]">
                              Uploading...
                            </span>
                          </div>
                        )}
                        {item.status === 'done' && item.url && (
                          <>
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-cover rounded"
                            />
                            <div className="absolute top-1 left-1 bg-emerald-600/90 text-white rounded-full p-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPhotoUploads((prev) => prev.filter((p) => p.id !== item.id))}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {item.status === 'error' && (
                          <div className="p-1 text-center">
                            <AlertCircle className="w-4 h-4 text-rose-500 mx-auto mb-0.5" />
                            <span className="text-[9px] text-rose-700 leading-tight block line-clamp-1">
                              {item.error || 'Failed'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPhotoUploads((prev) => prev.filter((p) => p.id !== item.id))}
                              className="mt-1 text-[10px] text-slate-500 hover:text-slate-800 underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification Documents Upload with Storage Uploads and Progress State */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verification Documents (Optional)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">1-B Adangal, Patta, or FMB</span>
                </div>
                <label className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 inline-flex items-center gap-1.5 transition">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attach Document</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={docUploads.length >= 2}
                    onChange={handleDocUpload}
                    className="hidden"
                  />
                </label>

                {docUploads.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {docUploads.map((docItem) => (
                      <div
                        key={docItem.id}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {docItem.status === 'uploading' && (
                            <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                          )}
                          {docItem.status === 'done' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          {docItem.status === 'error' && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <span className="truncate text-slate-800 text-[11px] font-mono">
                            {docItem.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {docItem.status === 'uploading' && (
                            <span className="text-[10px] text-slate-500">Uploading...</span>
                          )}
                          {docItem.status === 'error' && (
                            <span className="text-[10px] text-rose-600">Failed</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setDocUploads((prev) => prev.filter((d) => d.id !== docItem.id))}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {docUploads.some((d) => d.status === 'done') && (
                      <p className="text-[11px] text-emerald-700 font-bold">
                        ✓ Listing will be submitted with "Verification Pending" status.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Form Validation Error Banner */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Disclaimer Notice */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900">
                <span>All listings are self-reported by sellers and marked Unverified until title documents are validated.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setPostModalOpen(false);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={photoUploads.some((p) => p.status === 'uploading') || docUploads.some((d) => d.status === 'uploading')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {(photoUploads.some((p) => p.status === 'uploading') || docUploads.some((d) => d.status === 'uploading')) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Publish Listing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Review Modal (Part 3, Item 11) */}
      {activeReviewPlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Verification Review</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewPlot(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">{activeReviewPlot.title}</p>
              <p className="text-[11px] text-slate-500">Survey No: {activeReviewPlot.surveyNo} • {activeReviewPlot.district}</p>
              <p className="text-[11px] text-slate-500">Current Status: <span className="font-bold capitalize">{activeReviewPlot.verificationStatus}</span></p>
            </div>

            {activeReviewPlot.verificationDocuments && activeReviewPlot.verificationDocuments.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Uploaded Supporting Document:</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 bg-slate-100 flex items-center justify-center">
                  <img
                    src={activeReviewPlot.verificationDocuments[0]}
                    alt="Verification Document"
                    className="max-h-56 object-contain"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No documents uploaded for this listing.</p>
            )}

            {/* Admin Verification Action Buttons */}
            {isAdmin ? (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleUpdateVerification('verified')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Approve Verification</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateVerification('unverified')}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl transition border border-slate-200 flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mark Unverified</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500">Only authorized administrators can verify title documents.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consolidated Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete plot listing?"
        message="Are you sure you want to remove this plot listing? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteListing}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Global In-App Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
