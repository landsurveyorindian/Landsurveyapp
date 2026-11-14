import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  HelpCircle,
  Compass,
  Scale,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookOpen,
  ShieldAlert,
  ClipboardCheck,
  Search,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { secureApiFetch } from '../../utils/authFetch';

interface PlotAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plotData?: any;
  contextType?: 'calculator_quadrilateral' | 'closed_traverse' | 'general_survey';
  title?: string;
}

type AdvisorToolTab = 'qa' | 'dispute' | 'terms' | 'traverse';

export const PlotAdvisorDrawer: React.FC<PlotAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  plotData,
  contextType = 'general_survey',
  title = 'Plot Geometry & Cadastral Advisor',
}) => {
  const [activeTab, setActiveTab] = useState<AdvisorToolTab>('qa');

  // --- Q&A State ---
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Hello! I am your Cadastral Geomatics & Survey Advisor powered by Gemini AI. I can explain the mathematical differences between **Cyclic (Brahmagupta)**, **Patwari Average**, and **Diagonal Triangulation**, or guide you through state-specific survey processes (Gujarat DILR, AP/Telangana Dharani, Karnataka Bhoomi, Tamil Nadu TamilNilam, Maharashtra MahaBhulekh). How can I assist you today?`,
    },
  ]);

  // --- Dispute Assessor State ---
  const [disputeState, setDisputeState] = useState('Gujarat');
  const [disputeSurveyNo, setDisputeSurveyNo] = useState('');
  const [disputePattaArea, setDisputePattaArea] = useState('');
  const [disputeMeasuredArea, setDisputeMeasuredArea] = useState('');
  const [disputeUnit, setDisputeUnit] = useState('Acres');
  const [disputeType, setDisputeType] = useState('Ground Extent Less than Passbook / Patta');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [isAnalyzingDispute, setIsAnalyzingDispute] = useState(false);
  const [disputeResult, setDisputeResult] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // --- Terminology Decoder State ---
  const [termQuery, setTermQuery] = useState('');
  const [termState, setTermState] = useState('All India');
  const [isDecodingTerm, setIsDecodingTerm] = useState(false);
  const [termResult, setTermResult] = useState<string | null>(null);
  const [termError, setTermError] = useState<string | null>(null);

  // --- Traverse Audit State ---
  const [isAuditingTraverse, setIsAuditingTraverse] = useState(false);
  const [traverseAuditResult, setTraverseAuditResult] = useState<string | null>(null);
  const [traverseAuditError, setTraverseAuditError] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickQuestions = [
    'Explain about Gujarat land survey process',
    'Why do Cyclic, Patwari, and Diagonal areas differ for this plot?',
    'How to resolve AP / Telangana F-Line boundary disputes?',
    'Is my Bowditch closing ratio acceptable for cadastral records?',
    'How does Karnataka Bhoomi RTC & Mojini 11E sketch work?',
    'Explain Tamil Nadu Patta / Chitta & FMB sub-division',
  ];

  const popularTerms = [
    '7/12 Utara',
    'AnyROR',
    '1-B Adangal',
    'Pahani',
    'Poramboke',
    'Grama Natham',
    'Tippan',
    'FMB Sketch',
    'Ferfar (Mutation)',
    'Khatedar',
    'Gunakar',
  ];

  // --- Q&A Handler ---
  const handleSend = async (questionText?: string) => {
    const q = (questionText || query).trim();
    if (!q || isLoading) return;

    const newMsgs = [...messages, { role: 'user' as const, text: q }];
    setMessages(newMsgs);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await secureApiFetch('/api/gemini/explain-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          plotData: plotData || {},
          contextType,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer || 'No response generated.' },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Could not reach Gemini advisor: ${err?.message || 'Network error'}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Dispute Handler ---
  const handleAnalyzeDispute = async () => {
    setIsAnalyzingDispute(true);
    setDisputeResult(null);
    setDisputeError(null);

    try {
      const res = await secureApiFetch('/api/gemini/dispute-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: disputeState,
          surveyNumber: disputeSurveyNo,
          pattaArea: disputePattaArea,
          measuredArea: disputeMeasuredArea,
          unit: disputeUnit,
          disputeType,
          description: disputeNotes,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setDisputeResult(data.analysis || 'Analysis complete.');
    } catch (err: any) {
      setDisputeError(err?.message || 'Could not analyze dispute. Please try again.');
    } finally {
      setIsAnalyzingDispute(false);
    }
  };

  // --- Terminology Handler ---
  const handleDecodeTerm = async (termToDecode?: string) => {
    const t = (termToDecode || termQuery).trim();
    if (!t) return;

    setTermQuery(t);
    setIsDecodingTerm(true);
    setTermResult(null);
    setTermError(null);

    try {
      const res = await secureApiFetch('/api/gemini/terminology-decoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: t,
          state: termState,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setTermResult(data.explanation || 'Decode complete.');
    } catch (err: any) {
      setTermError(err?.message || 'Could not decode term. Please try again.');
    } finally {
      setIsDecodingTerm(false);
    }
  };

  // --- Traverse Audit Handler ---
  const handleRunTraverseAudit = async () => {
    setIsAuditingTraverse(true);
    setTraverseAuditResult(null);
    setTraverseAuditError(null);

    const auditPayload = plotData || {
      perimeter: 400,
      linearClosingError: 0.25,
      stationsCount: 4,
      relativePrecision: '1:1600',
      notes: 'Field traverse over irregular boundary',
    };

    try {
      const res = await secureApiFetch('/api/gemini/traverse-auditor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traverseData: auditPayload }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setTraverseAuditResult(data.auditReport || 'Traverse audit complete.');
    } catch (err: any) {
      setTraverseAuditError(err?.message || 'Could not audit traverse. Please try again.');
    } finally {
      setIsAuditingTraverse(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="bg-white border-l border-slate-200 w-full max-w-lg h-full flex flex-col shadow-2xl text-slate-900 animate-slide-left">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">Gemini 3.8 Cadastral Geomatics Advisor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Tool Selector Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'qa'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Survey Q&amp;A</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dispute')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'dispute'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dispute Assessor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'terms'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Terms Glossary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('traverse')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'traverse'
                ? 'bg-white text-cyan-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Traverse Audit</span>
          </button>
        </div>

        {/* TAB 1: General & Survey Q&A */}
        {activeTab === 'qa' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Suggested Questions */}
            <div className="p-3 bg-emerald-50/50 border-b border-slate-200 overflow-x-auto space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                Suggested Surveyor Questions
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-left text-[11px] bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 p-2 rounded-xl transition shadow-2xs font-medium"
                  >
                    💡 {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-line prose-xs">{m.text}</div>
                  </div>
                  <span className="text-[9.5px] text-slate-400 mt-1 px-1">
                    {m.role === 'user' ? 'You' : 'Gemini 3.8 Surveyor'}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-w-[80%]">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing geometric formulas &amp; survey rules...</span>
                </div>
              )}
            </div>

            {/* Query Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about Gujarat/AP survey, formulas, closing error..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition disabled:opacity-40"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Boundary Dispute & Encroachment Assessor */}
        {activeTab === 'dispute' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Cadastral Boundary Dispute &amp; Encroachment Advisor</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Statutory legal remedies under State Survey &amp; Boundaries Acts for area variations, missing boundary stones, and encroached margins.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State / Jurisdiction</label>
                  <select
                    value={disputeState}
                    onChange={(e) => setDisputeState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-medium"
                  >
                    <option value="Gujarat">Gujarat (GLRC &amp; AnyROR)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (YSR Bhu Hakku / F-Line)</option>
                    <option value="Telangana">Telangana (Dharani &amp; FMB)</option>
                    <option value="Tamil Nadu">Tamil Nadu (TamilNilam &amp; Patta)</option>
                    <option value="Karnataka">Karnataka (Bhoomi &amp; Mojini)</option>
                    <option value="Maharashtra">Maharashtra (MahaBhulekh 7/12)</option>
                    <option value="General India">Other Indian State</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Survey / Block No.</label>
                  <input
                    type="text"
                    value={disputeSurveyNo}
                    onChange={(e) => setDisputeSurveyNo(e.target.value)}
                    placeholder="e.g. 142/2 or Block 56"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patta / Passbook Area</label>
                  <input
                    type="text"
                    value={disputePattaArea}
                    onChange={(e) => setDisputePattaArea(e.target.value)}
                    placeholder="e.g. 2.50"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Field Measured Area</label>
                  <input
                    type="text"
                    value={disputeMeasuredArea}
                    onChange={(e) => setDisputeMeasuredArea(e.target.value)}
                    placeholder="e.g. 2.28"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={disputeUnit}
                    onChange={(e) => setDisputeUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                  >
                    <option value="Acres">Acres</option>
                    <option value="Cents">Cents</option>
                    <option value="Guntas">Guntas</option>
                    <option value="Bigha">Bigha</option>
                    <option value="Sq. Yards">Sq. Yards</option>
                    <option value="Sq. Meters">Sq. Meters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispute Category</label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                >
                  <option value="Ground Extent Less than Passbook / Patta">Ground Extent Less than Passbook / Patta</option>
                  <option value="Boundary Stones / Ghats Destroyed or Missing">Boundary Stones / Ghats Destroyed or Missing</option>
                  <option value="Adjoining Neighbor Encroached across Bund">Adjoining Neighbor Encroached across Bund</option>
                  <option value="Road Widening / Government Channel Buffer Conflict">Road Widening / Channel Buffer Conflict</option>
                  <option value="Sub-division / Hissa Variation from Parent Survey No.">Sub-division / Hissa Variation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Surveyor / Landowner Field Notes</label>
                <textarea
                  rows={2}
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  placeholder="Detail observations e.g. neighbor erected fence 4 meters inside FMB boundary..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzeDispute}
                disabled={isAnalyzingDispute}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzingDispute ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Legal Provisions with Gemini...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Get Statutory Remedies &amp; Roadmap</span>
                  </>
                )}
              </button>

              {disputeError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs">
                  {disputeError}
                </div>
              )}

              {disputeResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Statutory Dispute Assessment
                    </span>
                    <span className="text-[10px] text-slate-500">State: {disputeState}</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans pt-1">
                    {disputeResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Land Revenue Terms Glossary */}
        {activeTab === 'terms' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Indian Land Revenue &amp; Cadastral Terms Glossary</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Instant translation and legal significance of Persian, Urdu, and regional revenue terms across all 28 states.
              </p>
            </div>

            {/* Quick Chip Term Buttons */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                Popular Revenue Terms
              </span>
              <div className="flex flex-wrap gap-1.5">
                {popularTerms.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDecodeTerm(t)}
                    className="bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition shadow-2xs"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Search Form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={termQuery}
                onChange={(e) => setTermQuery(e.target.value)}
                placeholder="Enter any term e.g. Patta, Poramboke, 7/12..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => handleDecodeTerm()}
                disabled={isDecodingTerm || !termQuery.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDecodingTerm ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Decode</span>
              </button>
            </div>

            {termError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs">
                {termError}
              </div>
            )}

            {termResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    Revenue Record Definition: "{termQuery}"
                  </span>
                </div>
                <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans pt-1">
                  {termResult}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Traverse & GPS Quality Auditor */}
        {activeTab === 'traverse' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-xs text-cyan-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ClipboardCheck className="w-4 h-4 text-cyan-700" />
                <span>Traverse Closing Error &amp; Precision Auditor</span>
              </div>
              <p className="text-[11px] text-cyan-700">
                Audits closed traverse calculations, Bowditch compass rule corrections, and GPS precision ratios against Indian cadastral standards.
              </p>
            </div>

            {plotData && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Active Plot / Traverse Context Loaded
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    Perimeter / Sides: <strong className="text-slate-900">{plotData.totalPerimeter ? `${plotData.totalPerimeter} m` : 'Calculated'}</strong>
                  </div>
                  <div>
                    Error: <strong className="text-slate-900">{plotData.linearClosingError !== undefined ? `${plotData.linearClosingError} m` : 'Compliant'}</strong>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunTraverseAudit}
              disabled={isAuditingTraverse}
              className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
            >
              {isAuditingTraverse ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Auditing Traverse with Gemini Geomatics AI...</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Run Field Traverse Quality Audit</span>
                </>
              )}
            </button>

            {traverseAuditError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs">
                {traverseAuditError}
              </div>
            )}

            {traverseAuditResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                    Cadastral Audit Report
                  </span>
                </div>
                <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans pt-1">
                  {traverseAuditResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
