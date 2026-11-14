import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Camera,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building,
  MapPin,
  User,
  Scale,
} from 'lucide-react';
import { SurveyProject } from '../../services/projectsService';
import { secureApiFetch } from '../../utils/authFetch';

export interface ExtractedCadastralData {
  surveyNumber?: string;
  village?: string;
  mandalOrTaluk?: string;
  district?: string;
  state?: string;
  ownerName?: string;
  extentAcres?: number | null;
  extentCents?: number | null;
  extentGuntas?: number | null;
  landClassification?: string;
  summary?: string;
}

interface LandDocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedState: string;
  onApplyExtractedData: (data: ExtractedCadastralData) => void;
}

export const LandDocumentScannerModal: React.FC<LandDocumentScannerModalProps> = ({
  isOpen,
  onClose,
  selectedState,
  onApplyExtractedData,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [docTypeHint, setDocTypeHint] = useState<string>('1-B Adangal / Patta Chitta');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCadastralData | null>(null);

  // Helper to downscale and compress images client-side before sending to serverless endpoint
  const compressImage = (file: File, maxEdge = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxEdge || height > maxEdge) {
            if (width > height) {
              height = Math.round((height * maxEdge) / width);
              width = maxEdge;
            } else {
              width = Math.round((width * maxEdge) / height);
              height = maxEdge;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image for downscaling'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError(null);
    setExtractedData(null);

    const isFilePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setIsPdf(isFilePdf);
    setFileName(file.name);

    const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB limit for serverless payloads

    if (isFilePdf) {
      if (file.size > MAX_PDF_BYTES) {
        setAnalysisError(
          `PDF file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 8 MB limit. Please compress your PDF or upload a scanned page image.`
        );
        setImagePreview(null);
        return;
      }
      setFileMimeType('application/pdf');
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setFileSize(`${sizeMb} MB`);

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImagePreview(reader.result);
        }
      };
      reader.onerror = () => {
        setAnalysisError('Could not read PDF file. Please try again.');
      };
      reader.readAsDataURL(file);
    } else {
      // Client-side downscale image to max 1600px longest edge, 0.8 JPEG quality
      try {
        setFileMimeType('image/jpeg');
        const compressedBase64 = await compressImage(file, 1600, 0.8);
        const approxBytes = Math.round(compressedBase64.length * 0.75);
        const displayKb = (approxBytes / 1024).toFixed(0);
        setFileSize(`${displayKb} KB (optimized)`);
        setImagePreview(compressedBase64);
      } catch (err: any) {
        console.error('Image compression failed:', err);
        setAnalysisError('Failed to process image file. Please choose another image.');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await secureApiFetch('/api/gemini/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: fileMimeType,
          docHint: `${docTypeHint} (State: ${selectedState})`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.error && !data.surveyNumber) {
        throw new Error(data.error);
      }
      setExtractedData(data);
    } catch (err: any) {
      console.error('Scan error:', err);
      setAnalysisError(err?.message || 'Could not parse document. Please ensure the document is clear and readable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApplyExtractedData(extractedData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Scan Land Document</h3>
              <p className="text-[11px] text-slate-500">AI extraction for PDF &amp; Photos: 1-B Adangal, Patta/Chitta, 7/12, or FMB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Document Type / Format
          </label>
          <select
            value={docTypeHint}
            onChange={(e) => setDocTypeHint(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="1-B Adangal / ROR (Andhra Pradesh / Telangana)">1-B Adangal / ROR (AP &amp; Telangana)</option>
            <option value="Patta / Chitta (Tamil Nadu)">Patta / Chitta (Tamil Nadu)</option>
            <option value="Bhoomi RTC (Karnataka)">Bhoomi RTC (Karnataka)</option>
            <option value="7/12 Utara / MahaBhulekh (Maharashtra)">7/12 Utara / MahaBhulekh (Maharashtra)</option>
            <option value="AnyROR 7/12 &amp; 8A / Pramanpatra (Gujarat)">AnyROR 7/12 &amp; 8A (Gujarat)</option>
            <option value="FMB / Village Cadastral Sketch">FMB / Village Cadastral Sketch</option>
            <option value="Sale Deed / Registered Conveyance">Sale Deed / Registered Conveyance</option>
          </select>
        </div>

        {/* Upload Area: Supports PDF and Images */}
        {!imagePreview ? (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Upload PDF or Photograph Land Record</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports PDF documents, JPG, PNG &amp; camera scans</p>
            </div>
            <label className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-xs transition active:scale-95">
              <Upload className="w-4 h-4" />
              <span>Select PDF or Photo Document</span>
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            {isPdf ? (
              <div className="relative rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4 flex items-center gap-3.5 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex flex-col items-center justify-center shadow-xs shrink-0">
                  <FileText className="w-6 h-6" />
                  <span className="text-[8px] font-black tracking-widest uppercase">PDF</span>
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold mb-1">
                    Official PDF Land Record
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate" title={fileName}>
                    {fileName || 'Land_Record.pdf'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{fileSize} • Ready for AI extraction</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setIsPdf(false);
                    setFileName('');
                    setExtractedData(null);
                  }}
                  className="absolute top-2.5 right-2.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 p-1.5 rounded-full transition text-xs"
                  title="Remove document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-56 bg-slate-900 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Document preview"
                  className="max-h-56 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setIsPdf(false);
                    setFileName('');
                    setExtractedData(null);
                  }}
                  className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded-full text-xs"
                  title="Change image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!extractedData && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing {isPdf ? 'PDF Land Document' : 'Cadastral Image'} with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Survey &amp; Extent Details</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Error Notice */}
        {analysisError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Extracted Structured Data Display */}
        {extractedData && (
          <div className="space-y-3 animate-fade-in border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Extracted Cadastral Parameters (Editable)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Gemini Vision</span>
            </div>

            {/* Mandatory Disclaimer */}
            <div className="bg-amber-50/90 border border-amber-300 text-amber-900 rounded-xl p-2.5 text-xs flex items-start gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">
                AI-extracted from your document — please check these values against the original before relying on them.
              </span>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Survey No. *
                </label>
                <input
                  type="text"
                  value={extractedData.surveyNumber || ''}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      surveyNumber: e.target.value,
                    })
                  }
                  placeholder="e.g. 142/2B"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Extent in Cents
                </label>
                <input
                  type="number"
                  step="any"
                  value={extractedData.extentCents ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setExtractedData({
                      ...extractedData,
                      extentCents: val,
                      extentAcres: val ? Number((val / 100).toFixed(4)) : extractedData.extentAcres,
                    });
                  }}
                  placeholder="e.g. 45.5"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-800 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Extent in Acres
                </label>
                <input
                  type="number"
                  step="any"
                  value={extractedData.extentAcres ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setExtractedData({
                      ...extractedData,
                      extentAcres: val,
                      extentCents: val ? Number((val * 100).toFixed(2)) : extractedData.extentCents,
                    });
                  }}
                  placeholder="e.g. 1.25"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-800 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pattadar / Owner Name
                </label>
                <input
                  type="text"
                  value={extractedData.ownerName || ''}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      ownerName: e.target.value,
                    })
                  }
                  placeholder="Owner / Landowner Name"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Village
                </label>
                <input
                  type="text"
                  value={extractedData.village || ''}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      village: e.target.value,
                    })
                  }
                  placeholder="Village Name"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Mandal / Taluk &amp; District
                </label>
                <input
                  type="text"
                  value={
                    extractedData.mandalOrTaluk || extractedData.district
                      ? `${extractedData.mandalOrTaluk || ''}${extractedData.mandalOrTaluk && extractedData.district ? ', ' : ''}${extractedData.district || ''}`
                      : ''
                  }
                  onChange={(e) => {
                    const parts = e.target.value.split(',');
                    setExtractedData({
                      ...extractedData,
                      mandalOrTaluk: parts[0]?.trim() || '',
                      district: parts[1]?.trim() || extractedData.district,
                    });
                  }}
                  placeholder="e.g. Mangalagiri, Guntur"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Land classification */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Land Classification
              </label>
              <input
                type="text"
                value={extractedData.landClassification || ''}
                onChange={(e) =>
                  setExtractedData({
                    ...extractedData,
                    landClassification: e.target.value,
                  })
                }
                placeholder="e.g. Ryotwari Patta / Dry / Wet (Khushki)"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {extractedData.summary && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 rounded-lg p-2 border border-slate-200">
                "{extractedData.summary}"
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleApply}
                disabled={!extractedData.surveyNumber && !extractedData.extentCents && !extractedData.extentAcres}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <span>Apply to New Project &amp; Form</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
