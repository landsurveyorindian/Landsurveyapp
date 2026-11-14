import React, { useState, useEffect } from 'react';
import {
  calculateFourSidedPlot,
  calculateHeronTriangle,
} from '../../utils/triangulation';
import {
  calculateFourSidedNoDiagonal,
} from '../../utils/fourSidedNoDiag';
import {
  convertArea,
  convertFromUnitToSqm,
  getLinearUnitMultiplier,
  SQM_PER_UNIT,
  STATE_CONFIGS,
  DimensionUnit,
  LinkType,
} from '../../utils/units';
import {
  getStateUnitConfig,
  convertSqmToStateUnits,
  getAllIndianStates,
  convertStateUnitToSqm,
  IndianStateInfo,
} from '../../utils/indianStateUnits';
import {
  computeClosedTraverse,
  TraverseStation,
} from '../../utils/traverse';
import { PlotSvgDiagram } from './PlotSvgDiagram';
import { saveProject, SurveyProject } from '../../services/projectsService';
import { FourSidedDimensions } from '../../utils/gis';
import { useAuth } from '../../firebase/AuthContext';
import {
  Maximize2,
  Share2,
  Table,
  Sparkles,
  BookmarkCheck,
  Plus,
  Trash2,
  RefreshCw,
  Info,
  ArrowRightLeft,
  CheckCircle2,
  Scale,
  FileText,
  Triangle,
  ShieldCheck,
} from 'lucide-react';
import { LandDocumentScannerModal, ExtractedCadastralData } from '../ai/LandDocumentScannerModal';
import { PlotAdvisorDrawer } from '../ai/PlotAdvisorDrawer';
import { SurveyQualityReportModal, SurveyQualityAssessment } from '../survey/SurveyQualityReportModal';
import { MeasurementComparisonModal, ComparisonDataset } from '../survey/MeasurementComparisonModal';
import { useUserPermissions } from '../../context/PermissionsContext';
import { FeatureAccessDeniedView } from '../common/FeatureAccessDeniedView';

export type CalculatorSubTab = 'area' | '4sided' | '4sided_nodiag' | 'triangle' | 'fraction' | 'traverse' | 'converter';

interface CalculatorTabProps {
  selectedState: string;
  initialSubTab?: CalculatorSubTab;
  initialDimensions?: FourSidedDimensions | null;
  onProjectSaved?: (project: SurveyProject) => void;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  selectedState,
  initialSubTab = '4sided',
  initialDimensions,
  onProjectSaved,
}) => {
  const { user } = useAuth();
  const { hasPermission } = useUserPermissions();
  const [subTab, setSubTab] = useState<CalculatorSubTab>(
    initialSubTab === '4sided_nodiag'
      ? '4sided_nodiag'
      : initialSubTab === 'triangle'
      ? 'triangle'
      : initialSubTab === 'fraction'
      ? 'fraction'
      : initialSubTab === 'traverse'
      ? 'traverse'
      : initialSubTab === 'converter'
      ? 'converter'
      : '4sided'
  );
  const [areaMethod, setAreaMethod] = useState<'diag' | 'cyclic'>(
    initialSubTab === '4sided_nodiag' ? 'cyclic' : 'diag'
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isQualityReportOpen, setIsQualityReportOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [lastScannedDoc, setLastScannedDoc] = useState<ExtractedCadastralData | null>(null);

  const handleApplyExtractedData = (data: ExtractedCadastralData) => {
    setLastScannedDoc(data);
    if (data.extentAcres && data.extentAcres > 0) {
      setTotalLandValue(data.extentAcres);
      setTotalLandUnit('acre');
      setConvValue(data.extentAcres);
      setConvFromUnit('acre');
    } else if (data.extentCents && data.extentCents > 0) {
      setTotalLandValue(data.extentCents);
      setTotalLandUnit('cent');
      setConvValue(data.extentCents);
      setConvFromUnit('cent');
    } else if (data.extentGuntas && data.extentGuntas > 0) {
      setTotalLandValue(data.extentGuntas);
      setTotalLandUnit('gunta');
      setConvValue(data.extentGuntas);
      setConvFromUnit('gunta');
    }
    const extentStr = data.extentAcres ? `${data.extentAcres} Ac` : data.extentCents ? `${data.extentCents} Cents` : data.extentGuntas ? `${data.extentGuntas} Gts` : '';
    setSaveSuccessMsg(`AI Extracted Doc: Survey No. ${data.surveyNumber || 'N/A'}${extentStr ? ` (${extentStr})` : ''} - applied to calculators!`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Sync with initialSubTab prop if changed from external navigation
  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === '4sided_nodiag') {
        setSubTab('area');
        setAreaMethod('cyclic');
      } else if (initialSubTab === '4sided' || initialSubTab === 'area') {
        setSubTab('area');
        setAreaMethod('diag');
      } else {
        setSubTab(initialSubTab);
      }
    }
  }, [initialSubTab]);

  // Unit of dimension inputs (Meters vs Feet vs Links vs Chains)
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('m');
  const [linkType, setLinkType] = useState<LinkType>('gunter');

  // 4-Sided inputs (With Diagonal)
  const [sideA, setSideA] = useState<number>(30);
  const [sideB, setSideB] = useState<number>(40);
  const [sideC, setSideC] = useState<number>(35);
  const [sideD, setSideD] = useState<number>(42);
  const [diagonal, setDiagonal] = useState<number>(50);

  // 4-Sided inputs (WITHOUT Diagonal - Cyclic Quadrilateral Brahmagupta Method)
  const [ndSideA, setNdSideA] = useState<number>(30); // Top / North
  const [ndSideB, setNdSideB] = useState<number>(40); // Right / East
  const [ndSideC, setNdSideC] = useState<number>(35); // Bottom / South
  const [ndSideD, setNdSideD] = useState<number>(42); // Left / West

  // Triangle inputs (3-Sided Heron Triangulation)
  const [triSideA, setTriSideA] = useState<number>(30);
  const [triSideB, setTriSideB] = useState<number>(40);
  const [triSideC, setTriSideC] = useState<number>(50);

  // Automatically populate inputs when sent from CAD / GIS viewer
  useEffect(() => {
    if (initialDimensions) {
      setSideA(initialDimensions.sideA);
      setSideB(initialDimensions.sideB);
      setSideC(initialDimensions.sideC);
      setSideD(initialDimensions.sideD);
      setDiagonal(initialDimensions.diagonal);

      setNdSideA(initialDimensions.sideA);
      setNdSideB(initialDimensions.sideB);
      setNdSideC(initialDimensions.sideC);
      setNdSideD(initialDimensions.sideD);

      setTriSideA(initialDimensions.sideA);
      setTriSideB(initialDimensions.sideB);
      setTriSideC(initialDimensions.diagonal || initialDimensions.sideC);

      setDimensionUnit('m');
    }
  }, [initialDimensions]);

  // Fractional Share inputs
  const [totalLandValue, setTotalLandValue] = useState<number>(2.5);
  const [totalLandUnit, setTotalLandUnit] = useState<keyof typeof SQM_PER_UNIT>('acre');
  const [fractionNum, setFractionNum] = useState<number>(1);
  const [fractionDen, setFractionDen] = useState<number>(3);

  // Quick Converter inputs
  const [convValue, setConvValue] = useState<number>(1);
  const [convFromUnit, setConvFromUnit] = useState<string>('acre');
  const [converterState, setConverterState] = useState<string>(selectedState);

  // Sync converterState if parent selectedState changes
  useEffect(() => {
    setConverterState(selectedState);
  }, [selectedState]);

  // Closed Traverse Station inputs
  const [traverseStations, setTraverseStations] = useState<TraverseStation[]>([
    { id: '1', lineId: 'A - B', bearingDeg: 45, distanceMeters: 65.4 },
    { id: '2', lineId: 'B - C', bearingDeg: 135, distanceMeters: 80.2 },
    { id: '3', lineId: 'C - D', bearingDeg: 220, distanceMeters: 70.1 },
    { id: '4', lineId: 'D - A', bearingDeg: 320, distanceMeters: 75.8 },
  ]);

  // Linear to SQM conversion factor based on selected unit and link standard
  const linearSqmFactor = getLinearUnitMultiplier(dimensionUnit, linkType);
  const displayUnitLabel = dimensionUnit === 'links' 
    ? (linkType === 'metric' ? 'm.lk' : 'g.lk') 
    : dimensionUnit === 'chains'
    ? (linkType === 'metric' ? 'm.ch' : 'g.ch')
    : dimensionUnit;

  // Compute 4-Sided (With Diagonal)
  const fourSidedResult = calculateFourSidedPlot(sideA, sideB, sideC, sideD, diagonal);
  const fourSidedAreaSqm = fourSidedResult.totalArea * linearSqmFactor;
  const fourSidedBreakdown = convertArea(fourSidedAreaSqm);

  // Compute 4-Sided (WITHOUT Diagonal - Cyclic Brahmagupta Method)
  const fourSidedNoDiagResult = calculateFourSidedNoDiagonal(ndSideA, ndSideB, ndSideC, ndSideD);
  const fourSidedNoDiagAreaSqm = fourSidedNoDiagResult.cyclicArea * linearSqmFactor;
  const fourSidedNoDiagBreakdown = convertArea(fourSidedNoDiagAreaSqm);

  const brahmaguptaAreaSqm = fourSidedNoDiagResult.maxArea * linearSqmFactor;
  const brahmaguptaBreakdown = convertArea(brahmaguptaAreaSqm);

  // Compute Fractional Share
  const totalAreaInSqm = convertFromUnitToSqm(totalLandValue, totalLandUnit);
  const shareRatio = fractionDen > 0 ? fractionNum / fractionDen : 0;
  const shareAreaSqm = totalAreaInSqm * shareRatio;
  const shareBreakdown = convertArea(shareAreaSqm);
  const totalBreakdown = convertArea(totalAreaInSqm);

  // Compute Quick Converter
  const convAreaSqm = (convFromUnit in SQM_PER_UNIT)
    ? convertFromUnitToSqm(convValue, convFromUnit as keyof typeof SQM_PER_UNIT)
    : convertStateUnitToSqm(convValue, convFromUnit, converterState);
  const convBreakdown = convertArea(convAreaSqm);
  const convStateUnits = convertSqmToStateUnits(convAreaSqm, converterState);
  const converterStateDetails = getStateUnitConfig(converterState);

  // Compute Triangle (3-Sided Heron Triangulation)
  const triangleResult = calculateHeronTriangle(triSideA, triSideB, triSideC);
  const triangleAreaSqm = triangleResult.area * linearSqmFactor;
  const triangleBreakdown = convertArea(triangleAreaSqm);

  // Active state cadastral unit breakdowns for calculated plots
  const fourSidedStateUnits = convertSqmToStateUnits(fourSidedAreaSqm, selectedState);
  const fourSidedNoDiagStateUnits = convertSqmToStateUnits(fourSidedNoDiagAreaSqm, selectedState);
  const triangleStateUnits = convertSqmToStateUnits(triangleAreaSqm, selectedState);
  const selectedStateDetails = getStateUnitConfig(selectedState);

  const getTrianglePoints = () => {
    if (!triangleResult.isValid) return [];
    const a = triSideA;
    const b = triSideB;
    const c = triSideC;
    const denom = 2 * a * c;
    const cosTheta = denom > 0 ? Math.max(-1, Math.min(1, (a * a + c * c - b * b) / denom)) : 0;
    const theta = Math.acos(cosTheta);
    return [
      { x: 0, y: 0, label: 'A' },
      { x: a, y: 0, label: 'B' },
      { x: c * Math.cos(theta), y: Math.max(0.1, c * Math.sin(theta)), label: 'C' },
    ];
  };

  // Compute Traverse
  const traverseSummary = computeClosedTraverse(traverseStations, 1000, 1000);

  // Save Current Project Handler
  const handleSaveCalculation = async (type: 'triangulation' | 'traverse', name: string) => {
    const isTri = subTab === 'triangle';
    const newProject: SurveyProject = {
      id: `proj-${Date.now()}`,
      userId: user?.uid || 'guest',
      name,
      state: selectedState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      notes: `Calculated in Sthal Measure (${selectedState} unit standards)`,
      calculations: type === 'triangulation' ? {
        mode: isTri
          ? 'Triangle Survey (Heron Triangulation)'
          : (areaMethod === 'diag' || subTab === '4sided')
          ? 'Area Calculator (With Diagonal)'
          : 'Area Calculator (Cyclic)',
        dimensionUnit: dimensionUnit === 'links' ? `links (${linkType})` : dimensionUnit,
        inputs: isTri
          ? { sideA: triSideA, sideB: triSideB, sideC: triSideC }
          : (areaMethod === 'diag' || subTab === '4sided')
          ? { sideA, sideB, sideC, sideD, diagonal }
          : { ndSideA, ndSideB, ndSideC, ndSideD },
        breakdown: isTri
          ? triangleBreakdown
          : (areaMethod === 'diag' || subTab === '4sided')
          ? fourSidedBreakdown
          : fourSidedNoDiagBreakdown,
      } : undefined,
      traverse: type === 'traverse' ? traverseSummary : undefined,
    };

    try {
      await saveProject(newProject);
      if (onProjectSaved) onProjectSaved(newProject);
      setSaveSuccessMsg(`Project "${name}" saved successfully to your surveys!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Save failed:', err);
    }
  };

  // Geomatics & Quality Assessment helpers
  const activeSideA = subTab === 'triangle' ? triSideA : (areaMethod === 'diag' || subTab === '4sided') ? sideA : ndSideA;
  const activeSideB = subTab === 'triangle' ? triSideB : (areaMethod === 'diag' || subTab === '4sided') ? sideB : ndSideB;
  const activeSideC = subTab === 'triangle' ? triSideC : (areaMethod === 'diag' || subTab === '4sided') ? sideC : ndSideC;
  const activeSideD = (areaMethod === 'diag' || subTab === '4sided') ? sideD : ndSideD;
  const linearMultiplier = Math.sqrt(linearSqmFactor);

  const getActiveAssessment = (): SurveyQualityAssessment => {
    if (subTab === 'traverse') {
      return {
        projectName: `Traverse Survey (${traverseStations.length} Stations)`,
        surveyMethod: 'traverse',
        vertexCount: traverseStations.length,
        totalPerimeterMeters: traverseSummary.totalPerimeter,
        areaSqm: traverseSummary.areaSqm,
        areaCents: traverseSummary.areaBreakdown.cents,
        areaAcres: traverseSummary.areaBreakdown.acres,
        linearClosingError: traverseSummary.linearClosingError,
        relativePrecision: traverseSummary.relativePrecision,
        state: selectedState,
      };
    }

    if (subTab === 'triangle') {
      const currentPerim = (triSideA + triSideB + triSideC) * linearMultiplier;
      return {
        projectName: `Triangle Survey (${triSideA}×${triSideB}×${triSideC})`,
        surveyMethod: 'triangulation',
        vertexCount: 3,
        totalPerimeterMeters: currentPerim,
        areaSqm: triangleAreaSqm,
        areaCents: triangleBreakdown.cents,
        areaAcres: triangleBreakdown.acres,
        hasDiagonalsMeasured: true,
        state: selectedState,
      };
    }

    const currentAreaSqm = (areaMethod === 'diag' || subTab === '4sided') ? fourSidedAreaSqm : fourSidedNoDiagAreaSqm;
    const currentBreakdown = (areaMethod === 'diag' || subTab === '4sided') ? fourSidedBreakdown : fourSidedNoDiagBreakdown;
    const currentPerimeter =
      (activeSideA + activeSideB + activeSideC + activeSideD) * linearMultiplier;

    return {
      projectName:
        (areaMethod === 'diag' || subTab === '4sided')
          ? `4-Sided Survey (${sideA}×${sideB})`
          : `Cyclic Survey (${ndSideA}×${ndSideB})`,
      surveyMethod: 'triangulation',
      vertexCount: 4,
      totalPerimeterMeters: currentPerimeter,
      areaSqm: currentAreaSqm,
      areaCents: currentBreakdown.cents,
      areaAcres: currentBreakdown.acres,
      hasDiagonalsMeasured: (areaMethod === 'diag' || subTab === '4sided') && diagonal > 0,
      state: selectedState,
    };
  };

  const comparisonData: ComparisonDataset = {
    sideA: activeSideA,
    sideB: activeSideB,
    sideC: activeSideC,
    sideD: activeSideD,
    diagonal: (areaMethod === 'diag' || subTab === '4sided') && diagonal > 0 ? diagonal : undefined,
    unit: displayUnitLabel,
    diagonalAreaSqMeters: (areaMethod === 'diag' || subTab === '4sided') && fourSidedResult.isValid && diagonal > 0 ? fourSidedAreaSqm : 0,
    cyclicAreaSqMeters: fourSidedNoDiagAreaSqm,
    patwariAreaSqMeters: fourSidedNoDiagResult.patwariArea * linearSqmFactor,
  };

  const stateInfo = STATE_CONFIGS[selectedState] || STATE_CONFIGS['All-India'];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Banner / State Standards */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {selectedState} Cadastral Standards
          </span>
          <span className="text-[10px] bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 px-2 py-0.5 rounded-full font-mono">
            {selectedStateDetails.region} Region
          </span>
          {selectedStateDetails.code && (
            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
              {selectedStateDetails.code}
            </span>
          )}
        </div>
        <p className="text-[11px] text-emerald-900 dark:text-emerald-200 font-mono">
          {stateInfo.notes}
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-400 text-emerald-800 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 mb-4 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Cadastral AI & Quality Audit Quick Toolbar */}
      {/* Cadastral AI & Quality Audit Quick Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 mb-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Cadastral Intelligence &amp; Audit Tools</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Gemini &amp; Geomatics Engine</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!hasPermission('doc_scanner_ocr')) {
                alert('Document Scanner & OCR is restricted for your account by the administrator.');
                return;
              }
              setIsScannerOpen(true);
            }}
            className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-slate-800/80 hover:bg-emerald-100/70 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700 transition text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Scan Doc</span>
                <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-1 py-0.2 rounded">AI</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Extract Survey #</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!hasPermission('ai_plot_advisor')) {
                alert('AI Plot Geometry Advisor is restricted for your account by the administrator.');
                return;
              }
              setIsAdvisorOpen(true);
            }}
            className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/70 dark:bg-slate-800/80 hover:bg-indigo-100/70 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 transition text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Plot Advisor</span>
                <span className="text-[9px] font-extrabold bg-indigo-600 text-white px-1 py-0.2 rounded">Gemini</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Ask Geometry AI</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsQualityReportOpen(true)}
            className="flex items-center gap-2 p-2 rounded-xl bg-teal-50/70 dark:bg-slate-800/80 hover:bg-teal-100/70 dark:hover:bg-slate-700 border border-teal-200 dark:border-slate-700 transition text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Quality Score</span>
                <span className="text-[9px] font-extrabold bg-teal-700 text-white px-1 py-0.2 rounded">Audit</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Confidence Check</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsComparisonOpen(true)}
            className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 hover:bg-amber-100/70 dark:hover:bg-slate-700 border border-amber-200 dark:border-slate-700 transition text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Compare Rules</span>
                <span className="text-[9px] font-extrabold bg-amber-600 text-white px-1 py-0.2 rounded">3 Laws</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Heron vs Patwari</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto mb-4 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSubTab('4sided');
            setAreaMethod('diag');
          }}
          title="4-Sided with Diagonal — exact area using corner diagonal dividing plot into 2 triangles"
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            (subTab === '4sided' || subTab === 'area') && areaMethod === 'diag'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>4-Sided (Diagonal)</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">Exact</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('4sided_nodiag');
            setAreaMethod('cyclic');
          }}
          title="Cyclic Quadrilateral (Brahmagupta) — estimate area from 4 sides when you don’t know the diagonal"
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === '4sided_nodiag' || (subTab === 'area' && areaMethod === 'cyclic')
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>4-Sided (No Diag)</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-mono">Cyclic/Patwari</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('triangle')}
          title="Heron Triangulation — measure 3 sides of a triangle-shaped plot"
          className={`flex-1 min-w-[125px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'triangle'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Triangle className="w-3.5 h-3.5" />
          <span>Triangle (Heron)</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono">3-Sided</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('fraction')}
          title="Hissa Partition — calculate inheritance and legal co-owner land shares"
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'fraction'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Partition (Hissa)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('traverse')}
          title="Closed Traverse / Bowditch — for multi-sided plots measured with bearing and distance"
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'traverse'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Traverse (Bowditch)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('converter')}
          title="Local Unit Standards & Area Converter"
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'converter'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Converter</span>
        </button>
      </div>

      {/* ----------------- SUBTAB: COMBINED AREA CALCULATOR ----------------- */}
      {(subTab === 'area' || subTab === '4sided' || subTab === '4sided_nodiag') && (
        !hasPermission('four_sided_plot') ? (
          <FeatureAccessDeniedView featureKey="four_sided_plot" />
        ) : (
        <div className="space-y-4">
          {/* Method Switcher Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                <Maximize2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                  Area Calculator (4-Sided Plots)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {areaMethod === 'diag'
                    ? '4-Sided with Diagonal — exact area using corner diagonal dividing plot into 2 triangles'
                    : 'Cyclic Quadrilateral (Brahmagupta) — estimate area from 4 sides when you don’t know the diagonal'}
                </p>
              </div>
            </div>

            {/* Toggle Mode */}
            <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setAreaMethod('diag');
                  setSubTab('4sided');
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  areaMethod === 'diag'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>With Diagonal</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-700/50 text-emerald-100 font-mono font-normal">Exact</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAreaMethod('cyclic');
                  setSubTab('4sided_nodiag');
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  areaMethod === 'cyclic'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Without Diagonal</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-700/50 text-amber-100 font-mono font-normal">Cyclic</span>
              </button>
            </div>
          </div>

          {areaMethod === 'diag' ? (
            <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <span>Boundary Measurements</span>
                </h3>

                {/* Dimension Unit toggle & Cadastral Links Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('m')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        dimensionUnit === 'm' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Meters
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('ft')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        dimensionUnit === 'ft' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Feet
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('links')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        dimensionUnit === 'links' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>Links</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-black/15 uppercase font-mono font-bold">Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('chains')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        dimensionUnit === 'chains' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>Chains</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-black/15 uppercase font-mono font-bold">Chain</span>
                    </button>
                  </div>

                  {/* Dropdown to select Gunter or Metric Standard */}
                  {(dimensionUnit === 'links' || dimensionUnit === 'chains') && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2 py-0.5 shadow-2xs">
                      <label htmlFor="diag-link-select" className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 shrink-0">
                        {dimensionUnit === 'chains' ? 'Chain Standard:' : 'Link Standard:'}
                      </label>
                      <select
                        id="diag-link-select"
                        value={linkType}
                        onChange={(e) => setLinkType(e.target.value as LinkType)}
                        className="bg-transparent text-emerald-950 dark:text-emerald-100 font-bold text-xs py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="gunter" className="text-slate-900">Gunter&apos;s Cadastral (66 ft / 100 Links - Revenue / FMB)</option>
                        <option value="metric" className="text-slate-900">Metric Standard (20 m / 100 Links - IS 1492)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Precision Banner when Links or Chains is selected */}
              {dimensionUnit === 'links' && (
                <div className="mb-3 p-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <span className="font-bold">
                      {linkType === 'metric' ? 'Metric Link Standard (IS 1492):' : "Gunter's Cadastral Links (FMB / Tippon):"}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {linkType === 'metric' ? '1 Link = 0.20 m (20 cm)' : '1 Link = 0.66 ft = 7.92 in = 0.201168 m'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 self-start sm:self-auto">
                    {linkType === 'metric' ? '1 sq link = 0.04 m² | 2,500 = 1 Are | 10k = 1 Ch' : '1,000 sq links = 1 Cent | 100k = 1 Acre | 10k = 1 Ch'}
                  </span>
                </div>
              )}

              {dimensionUnit === 'chains' && (
                <div className="mb-3 p-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <span className="font-bold">
                      {linkType === 'metric' ? 'Metric Chain Standard (IS 1492):' : "Gunter's Cadastral Chain (Revenue / FMB):"}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {linkType === 'metric' ? '1 Chain = 20 m = 100 Links' : '1 Chain = 66 ft = 100 Links = 20.1168 m'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 self-start sm:self-auto">
                    {linkType === 'metric' ? '1 sq chain = 400 m² = 4 Ares | 25 sq ch = 1 Ha' : '1 sq chain = 10 Cents = 0.1 Acre | 10 sq ch = 1 Acre'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Side A (North / Top)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sideA || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setSideA(v);
                      setNdSideA(v);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Side B (East / Right)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sideB || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setSideB(v);
                      setNdSideB(v);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Side C (South / Bottom)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sideC || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setSideC(v);
                      setNdSideC(v);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 35"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Side D (West / Left)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sideD || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setSideD(v);
                      setNdSideD(v);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 42"
                  />
                </div>
              </div>

              {/* Diagonal 1-3 */}
              <div className="bg-cyan-50/80 border border-cyan-200 rounded-xl p-3 mb-4">
                <label className="block text-xs font-bold text-cyan-900 mb-1 flex items-center justify-between">
                  <span>Diagonal (A to C Corner)</span>
                  <span className="text-[10px] text-cyan-700 font-medium">Mandatory for Triangulation</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={diagonal || ''}
                  onChange={(e) => setDiagonal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-cyan-300 rounded-lg px-3 py-2 text-sm text-cyan-950 font-mono focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. 50"
                />
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-[10px] text-slate-500 font-medium mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSideA(100);
                    setSideB(150);
                    setSideC(110);
                    setSideD(145);
                    setDiagonal(180);
                    setDimensionUnit('ft');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition"
                >
                  150×100 ft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSideA(25);
                    setSideB(35);
                    setSideC(28);
                    setSideD(32);
                    setDiagonal(42);
                    setDimensionUnit('m');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition"
                >
                  1-Gunta (Meters)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSideA(100);
                    setSideB(100);
                    setSideC(100);
                    setSideD(100);
                    setDiagonal(141.4214);
                    setDimensionUnit('links');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold px-2 py-1 rounded-lg transition"
                >
                  100×100 Gunter Links (10 Cts)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSideA(1);
                    setSideB(1);
                    setSideC(1);
                    setSideD(1);
                    setDiagonal(1.4142);
                    setDimensionUnit('chains');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 text-emerald-900 font-bold px-2 py-1 rounded-lg transition"
                >
                  1×1 Gunter Chain (10 Cts)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSideA(10);
                    setSideB(1);
                    setSideC(10);
                    setSideD(1);
                    setDiagonal(10.0499);
                    setDimensionUnit('chains');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 text-emerald-900 font-bold px-2 py-1 rounded-lg transition"
                >
                  10×1 Gunter Chains (1 Acre)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSideA(100);
                    setSideB(100);
                    setSideC(100);
                    setSideD(100);
                    setDiagonal(141.4214);
                    setDimensionUnit('links');
                    setLinkType('metric');
                  }}
                  className="text-[11px] bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 font-semibold px-2 py-1 rounded-lg transition"
                >
                  100×100 Metric Links (4 Are)
                </button>
              </div>

              {/* Save Project Button */}
              <button
                type="button"
                disabled={!fourSidedResult.isValid}
                onClick={() => handleSaveCalculation('triangulation', `4-Sided Survey (${sideA}×${sideB})`)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save 4-Sided Survey to Projects</span>
              </button>
            </div>

            {/* Proportional SVG Diagram */}
            <div>
              <PlotSvgDiagram
                points={fourSidedResult.points}
                sideLabels={[`A: ${sideA}`, `B: ${sideB}`, `C: ${sideC}`, `D: ${sideD}`]}
                diagonalLabels={[{ fromIndex: 0, toIndex: 2, label: `Diag: ${diagonal}` }]}
                title="4-Sided Survey Triangulation"
                unit={displayUnitLabel}
              />

              {!fourSidedResult.isValid && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{fourSidedResult.errorMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Area Breakdown Cards */}
          {fourSidedResult.isValid && (
            <div className="bg-white border border-emerald-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
                    Exact Triangulated Area
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                    {fourSidedBreakdown.formattedAcreString}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-mono">Heron Area</span>
                  <p className="text-sm font-bold text-emerald-700 font-mono">
                    {fourSidedResult.totalArea.toFixed(2)} sq {
                      dimensionUnit === 'links'
                        ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                        : dimensionUnit === 'chains'
                        ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                        : dimensionUnit
                    }
                  </p>
                </div>
              </div>

              {/* Grid of Indian & Cadastral Units */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Cents</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.cents}</p>
                  <span className="text-[9px] text-slate-400">100 C = 1 Ac</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Guntas</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.guntas}</p>
                  <span className="text-[9px] text-slate-400">40 G = 1 Ac</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Yards</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.sqyd.toLocaleString()}</p>
                  <span className="text-[9px] text-slate-400">4840 SqYd</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Feet</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.sqft.toLocaleString()}</p>
                  <span className="text-[9px] text-slate-400">43560 SqFt</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Meters</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.sqm.toLocaleString()}</p>
                  <span className="text-[9px] text-slate-400">Metric SI</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'links' && linkType === 'gunter' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-emerald-800 uppercase font-bold">Gunter Links</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.gunterLinks.toLocaleString()}</p>
                  <span className="text-[9px] text-emerald-600">66ft Ch (1k=1C)</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'chains' && linkType === 'gunter' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-emerald-800 uppercase font-bold">Gunter Chains</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.gunterChains.toLocaleString()}</p>
                  <span className="text-[9px] text-emerald-600">1 Ch = 10 Cts</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'links' && linkType === 'metric' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Links</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{fourSidedBreakdown.metricLinks.toLocaleString()}</p>
                  <span className="text-[9px] text-teal-600">0.20m Link (IS 1492)</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'chains' && linkType === 'metric' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Chains</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{fourSidedBreakdown.metricChains.toLocaleString()}</p>
                  <span className="text-[9px] text-teal-600">20m Ch (1=4 Ares)</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Ankanams</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">{fourSidedBreakdown.ankanams}</p>
                  <span className="text-[9px] text-slate-400">72 Sq. Ft</span>
                </div>
              </div>

              {/* State Cadastral Unit Breakdown for This Plot */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-black tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{selectedState} Cadastral Standards Breakdown</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {selectedStateDetails.region} Region • {selectedStateDetails.code || ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {fourSidedStateUnits.map((item) => (
                    <div
                      key={item.unit.key}
                      className="bg-emerald-50/70 dark:bg-slate-800/80 p-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 text-center shadow-xs"
                    >
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase block truncate" title={item.unit.name}>
                        {item.unit.name}
                      </span>
                      <p className="text-base font-black text-emerald-800 dark:text-emerald-300 font-mono">{item.formatted}</p>
                      {item.unit.localName && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block truncate">
                          {item.unit.localName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
            </div>
          ) : (
            <div className="space-y-4">
          {/* Cyclic Geometry Methodology Banner */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 text-sm">
                  Simple 4-Sided Cyclic Calculation (Brahmagupta Formula)
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Considering the 4 boundaries as a cyclical quadrilateral, the area is calculated directly from the four sides without requiring any diagonals or angle measurements.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-mono font-bold bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg shadow-xs">
              Area = √((s-a)(s-b)(s-c)(s-d))
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>4 Boundary Sides</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      Cyclic (No Angles)
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Enter boundary sides A, B, C, D in order</span>
                </div>
                {/* Unit Switcher & Cadastral Links / Chains Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('m')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        dimensionUnit === 'm' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Meters
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('ft')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        dimensionUnit === 'ft' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Feet
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('links')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        dimensionUnit === 'links' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>Links</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-black/15 uppercase font-mono font-bold">Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('chains')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        dimensionUnit === 'chains' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>Chains</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-black/15 uppercase font-mono font-bold">Chain</span>
                    </button>
                  </div>

                  {/* Dropdown to select Gunter or Metric Standard */}
                  {(dimensionUnit === 'links' || dimensionUnit === 'chains') && (
                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-0.5 shadow-2xs">
                      <label htmlFor="cyclic-link-select" className="text-[11px] font-bold text-amber-900 dark:text-amber-300 shrink-0">
                        {dimensionUnit === 'chains' ? 'Chain Standard:' : 'Link Standard:'}
                      </label>
                      <select
                        id="cyclic-link-select"
                        value={linkType}
                        onChange={(e) => setLinkType(e.target.value as LinkType)}
                        className="bg-transparent text-amber-950 dark:text-amber-100 font-bold text-xs py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="gunter" className="text-slate-900">Gunter&apos;s Cadastral (66 ft / 100 Links - Revenue / FMB)</option>
                        <option value="metric" className="text-slate-900">Metric Standard (20 m / 100 Links - IS 1492)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Precision Banner when Links or Chains is selected */}
              {dimensionUnit === 'links' && (
                <div className="p-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                    <span className="font-bold">
                      {linkType === 'metric' ? 'Metric Link Standard (IS 1492):' : "Gunter's Cadastral Links (FMB / Patta):"}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {linkType === 'metric' ? '1 Link = 0.20 m (20 cm)' : '1 Link = 0.66 ft = 7.92 in = 0.201168 m'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-900 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700 self-start sm:self-auto">
                    {linkType === 'metric' ? '1 sq link = 0.04 m² | 2,500 = 1 Are | 10k = 1 Ch' : '1,000 sq links = 1 Cent | 100k = 1 Acre | 10k = 1 Ch'}
                  </span>
                </div>
              )}

              {dimensionUnit === 'chains' && (
                <div className="p-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                    <span className="font-bold">
                      {linkType === 'metric' ? 'Metric Chain Standard (IS 1492):' : "Gunter's Cadastral Chain (Revenue / FMB):"}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {linkType === 'metric' ? '1 Chain = 20 m = 100 Links' : '1 Chain = 66 ft = 100 Links = 20.1168 m'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-900 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700 self-start sm:self-auto">
                    {linkType === 'metric' ? '1 sq chain = 400 m² = 4 Ares | 25 sq ch = 1 Ha' : '1 sq chain = 10 Cents = 0.1 Acre | 10 sq ch = 1 Acre'}
                  </span>
                </div>
              )}

              {/* 4 Sides Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-amber-800">Side A (North / AB)</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={ndSideA || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setNdSideA(v);
                      setSideA(v);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-teal-800">Side B (East / BC)</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={ndSideB || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setNdSideB(v);
                      setSideB(v);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-amber-800">Side C (South / CD)</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={ndSideC || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setNdSideC(v);
                      setSideC(v);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-teal-800">Side D (West / DA)</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={ndSideD || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setNdSideD(v);
                      setSideD(v);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 w-full font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setNdSideA(60);
                    setNdSideB(80);
                    setNdSideC(65);
                    setNdSideD(75);
                    setDimensionUnit('m');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition"
                >
                  Agri (60×80×65×75 m)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNdSideA(40);
                    setNdSideB(60);
                    setNdSideC(42);
                    setNdSideD(58);
                    setDimensionUnit('ft');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition"
                >
                  Suburban (40×60 ft)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNdSideA(100);
                    setNdSideB(100);
                    setNdSideC(100);
                    setNdSideD(100);
                    setDimensionUnit('links');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-semibold px-2 py-1 rounded-lg transition"
                >
                  100×100 Gunter Links (10 Cts)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNdSideA(1);
                    setNdSideB(1);
                    setNdSideC(1);
                    setNdSideD(1);
                    setDimensionUnit('chains');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-amber-100 hover:bg-amber-200 border border-amber-400 text-amber-950 font-bold px-2 py-1 rounded-lg transition"
                >
                  1×1 Gunter Chain (10 Cts)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNdSideA(10);
                    setNdSideB(1);
                    setNdSideC(10);
                    setNdSideD(1);
                    setDimensionUnit('chains');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-amber-100 hover:bg-amber-200 border border-amber-400 text-amber-950 font-bold px-2 py-1 rounded-lg transition"
                >
                  10×1 Gunter Chains (1 Acre)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNdSideA(100);
                    setNdSideB(100);
                    setNdSideC(100);
                    setNdSideD(100);
                    setDimensionUnit('links');
                    setLinkType('metric');
                  }}
                  className="text-[11px] bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 font-semibold px-2 py-1 rounded-lg transition"
                >
                  100×100 Metric Links (4 Are)
                </button>
              </div>

              {/* Save Project Button */}
              <button
                type="button"
                disabled={!fourSidedNoDiagResult.isValid}
                onClick={() =>
                  handleSaveCalculation(
                    'triangulation',
                    `Cyclic 4-Sided Survey (${ndSideA}×${ndSideB}×${ndSideC}×${ndSideD})`
                  )
                }
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save Cyclic 4-Sided Survey to Projects</span>
              </button>
            </div>

            {/* SVG Diagram and Calculations breakdown */}
            <div className="space-y-3">
              <PlotSvgDiagram
                points={fourSidedNoDiagResult.points}
                sideLabels={[`A: ${ndSideA}`, `B: ${ndSideB}`, `C: ${ndSideC}`, `D: ${ndSideD}`]}
                diagonalLabels={[
                  { fromIndex: 0, toIndex: 2, label: `AC: ${fourSidedNoDiagResult.diagonalAC}` },
                  { fromIndex: 1, toIndex: 3, label: `BD: ${fourSidedNoDiagResult.diagonalBD}` },
                ]}
                title="Cyclic Quadrilateral Plot Geometry"
                unit={displayUnitLabel}
              />

              {!fourSidedNoDiagResult.isValid && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{fourSidedNoDiagResult.errorMessage}</span>
                </div>
              )}

              {/* Formula Step-by-Step Card */}
              {fourSidedNoDiagResult.isValid && (
                <div className="bg-slate-50 border border-amber-300 rounded-xl p-3 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-amber-900 font-bold border-b border-slate-200 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-amber-700" />
                      Simple Cyclic Calculation Steps
                    </span>
                    <span className="font-mono text-slate-600">{displayUnitLabel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">1. Semiperimeter (s)</span>
                      <span className="text-slate-900 font-bold">
                        ({ndSideA}+{ndSideB}+{ndSideC}+{ndSideD})/2 = {fourSidedNoDiagResult.semiPerimeter} {displayUnitLabel}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">2. Cyclic Area (Brahmagupta)</span>
                      <span className="text-amber-700 font-bold">
                        {fourSidedNoDiagResult.cyclicArea.toLocaleString()} sq {
                          dimensionUnit === 'links'
                            ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                            : dimensionUnit === 'chains'
                            ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                            : dimensionUnit
                        }
                      </span>
                    </div>
                  </div>

                  {/* Comparison with Patwari Sarasari Reference */}
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cyclic Area (Exact):</span>
                      <span className="text-amber-700 font-mono font-bold">
                        {fourSidedNoDiagResult.cyclicArea.toLocaleString()} sq {
                          dimensionUnit === 'links'
                            ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                            : dimensionUnit === 'chains'
                            ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                            : dimensionUnit
                        }
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Patwari Average Reference:</span>
                      <span className="text-slate-600 font-mono">
                        {fourSidedNoDiagResult.patwariArea.toLocaleString()} sq {
                          dimensionUnit === 'links'
                            ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                            : dimensionUnit === 'chains'
                            ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                            : dimensionUnit
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Area Breakdown Cards */}
          {fourSidedNoDiagResult.isValid && (
            <div className="bg-white border border-amber-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-700">
                    Calculated Cyclic Plot Area (Brahmagupta Standard)
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                    {fourSidedNoDiagBreakdown.formattedAcreString}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-mono">Cyclic Area</span>
                  <p className="text-sm font-bold text-amber-700 font-mono">
                    {fourSidedNoDiagResult.cyclicArea.toFixed(2)} sq {
                      dimensionUnit === 'links'
                        ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                        : dimensionUnit === 'chains'
                        ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                        : dimensionUnit
                    }
                  </p>
                </div>
              </div>

              {/* Grid of Indian & Cadastral Units */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Cents</span>
                  <p className="text-base font-bold text-amber-700 font-mono">{fourSidedNoDiagBreakdown.cents}</p>
                  <span className="text-[9px] text-slate-400">100 C = 1 Ac</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Guntas</span>
                  <p className="text-base font-bold text-amber-700 font-mono">{fourSidedNoDiagBreakdown.guntas}</p>
                  <span className="text-[9px] text-slate-400">40 G = 1 Ac</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Yards</span>
                  <p className="text-base font-bold text-amber-700 font-mono">
                    {fourSidedNoDiagBreakdown.sqyd.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">4840 SqYd</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Feet</span>
                  <p className="text-base font-bold text-amber-700 font-mono">
                    {fourSidedNoDiagBreakdown.sqft.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">43560 SqFt</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Meters</span>
                  <p className="text-base font-bold text-amber-700 font-mono">
                    {fourSidedNoDiagBreakdown.sqm.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">Metric SI</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'links' && linkType === 'gunter' ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-amber-900 uppercase font-bold">Gunter Links</span>
                  <p className="text-base font-bold text-amber-700 font-mono">{fourSidedNoDiagBreakdown.gunterLinks.toLocaleString()}</p>
                  <span className="text-[9px] text-amber-700">66ft Ch (1k=1C)</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'chains' && linkType === 'gunter' ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-amber-900 uppercase font-bold">Gunter Chains</span>
                  <p className="text-base font-bold text-amber-700 font-mono">{fourSidedNoDiagBreakdown.gunterChains.toLocaleString()}</p>
                  <span className="text-[9px] text-amber-700">1 Ch = 10 Cts</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'links' && linkType === 'metric' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Links</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{fourSidedNoDiagBreakdown.metricLinks.toLocaleString()}</p>
                  <span className="text-[9px] text-teal-600">0.20m Link (IS 1492)</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'chains' && linkType === 'metric' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Chains</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{fourSidedNoDiagBreakdown.metricChains.toLocaleString()}</p>
                  <span className="text-[9px] text-teal-600">20m Ch (1=4 Ares)</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Ankanams</span>
                  <p className="text-base font-bold text-amber-700 font-mono">{fourSidedNoDiagBreakdown.ankanams}</p>
                  <span className="text-[9px] text-slate-400">72 Sq. Ft</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      ))}

      {/* ----------------- SUBTAB: TRIANGLE CALCULATOR (HERON) ----------------- */}
      {subTab === 'triangle' && (
        !hasPermission('triangulation') ? (
          <FeatureAccessDeniedView featureKey="triangulation" />
        ) : (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
                <Triangle className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                  Triangle Land Area Calculator (Heron Triangulation)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Heron Triangulation — measure 3 sides of a triangle-shaped plot
                </p>
              </div>
            </div>

            <span className="shrink-0 text-[11px] font-mono font-bold bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-lg shadow-2xs">
              Area = √(s(s-a)(s-b)(s-c))
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <span>3 Boundary Sides</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Enter outer boundaries A, B, C</span>
                </div>

                {/* Dimension Unit toggle & Cadastral Links/Chains Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('m')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        dimensionUnit === 'm' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Meters
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('ft')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        dimensionUnit === 'ft' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Feet
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('links')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        dimensionUnit === 'links' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <span>Links</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 uppercase font-mono">Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionUnit('chains')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        dimensionUnit === 'chains' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <span>Chains</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 uppercase font-mono">Chain</span>
                    </button>
                  </div>

                  {(dimensionUnit === 'links' || dimensionUnit === 'chains') && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 rounded-lg px-2 py-0.5 shadow-2xs">
                      <label htmlFor="tri-link-select" className="text-[11px] font-bold text-blue-900 shrink-0">
                        {dimensionUnit === 'chains' ? 'Chain Standard:' : 'Link Standard:'}
                      </label>
                      <select
                        id="tri-link-select"
                        value={linkType}
                        onChange={(e) => setLinkType(e.target.value as LinkType)}
                        className="bg-transparent text-blue-950 font-bold text-xs py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="gunter">Gunter (66ft / 7.92in - FMB/Patta)</option>
                        <option value="metric">Metric (20m / 20cm - IS 1492)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Precision Banner when Links or Chains is selected */}
              {dimensionUnit === 'links' && (
                <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    <span className="font-bold">
                      {linkType === 'metric' ? 'Metric Link Standard (IS 1492):' : "Gunter's Cadastral Chain (FMB / Patta):"}
                    </span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {linkType === 'metric' ? '1 Link = 0.20 m (20 cm)' : '1 Link = 0.66 ft = 0.201168 m'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 self-start sm:self-auto">
                    {linkType === 'metric' ? '1 sq link = 0.04 m²' : '1,000 sq links = 1 Cent'}
                  </span>
                </div>
              )}

              {dimensionUnit === 'chains' && (
                <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    <span className="font-bold">
                      {linkType === 'metric' ? 'Metric Chain Standard (IS 1492):' : "Gunter's Cadastral Chain Standard:"}
                    </span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {linkType === 'metric' ? '1 Chain = 100 links = 20 m' : '1 Chain = 100 links = 66 ft = 20.1168 m'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 self-start sm:self-auto">
                    {linkType === 'metric' ? '1 sq chain = 400 m² = 4 Ares' : '1 sq chain = 10,000 sq links = 10 Cents'}
                  </span>
                </div>
              )}

              {/* 3 Sides Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800">Side A</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={triSideA || ''}
                    onChange={(e) => setTriSideA(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. 30"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800">Side B</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={triSideB || ''}
                    onChange={(e) => setTriSideB(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. 40"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800">Side C</label>
                    <span className="text-[10px] text-slate-500 font-mono">{dimensionUnit}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={triSideC || ''}
                    onChange={(e) => setTriSideC(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 w-full font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTriSideA(30);
                    setTriSideB(40);
                    setTriSideC(50);
                    setDimensionUnit('m');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition"
                >
                  30×40×50 m (600 m²)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTriSideA(100);
                    setTriSideB(100);
                    setTriSideC(141.42);
                    setDimensionUnit('ft');
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition"
                >
                  100×100×141.4 ft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTriSideA(100);
                    setTriSideB(100);
                    setTriSideC(141.42);
                    setDimensionUnit('links');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 font-semibold px-2 py-1 rounded-lg transition"
                >
                  100×100×141.42 Gunter Links (5 Cts)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTriSideA(1);
                    setTriSideB(1);
                    setTriSideC(1.4142);
                    setDimensionUnit('chains');
                    setLinkType('gunter');
                  }}
                  className="text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 font-semibold px-2 py-1 rounded-lg transition"
                >
                  1×1×1.414 Gunter Chains (5 Cts)
                </button>
              </div>

              {/* Save Project Button */}
              <button
                type="button"
                disabled={!triangleResult.isValid}
                onClick={() =>
                  handleSaveCalculation(
                    'triangulation',
                    `Triangle Survey (${triSideA}×${triSideB}×${triSideC})`
                  )
                }
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save Triangle Survey to Projects</span>
              </button>
            </div>

            {/* SVG Diagram & Step-by-Step */}
            <div className="space-y-3">
              <PlotSvgDiagram
                points={getTrianglePoints()}
                sideLabels={[`A: ${triSideA}`, `B: ${triSideB}`, `C: ${triSideC}`]}
                title="Triangle Plot Triangulation"
                unit={displayUnitLabel}
              />

              {!triangleResult.isValid && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{triangleResult.errorMessage}</span>
                </div>
              )}

              {triangleResult.isValid && (
                <div className="bg-slate-50 border border-blue-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-blue-900 font-bold border-b border-slate-200 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-blue-700" />
                      Heron Formula Calculation Steps
                    </span>
                    <span className="font-mono text-slate-600">{displayUnitLabel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">1. Semiperimeter (s)</span>
                      <span className="text-slate-900 font-bold">
                        ({triSideA}+{triSideB}+{triSideC})/2 = {triangleResult.s.toFixed(2)} {displayUnitLabel}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">2. Heron Area</span>
                      <span className="text-blue-700 font-bold">
                        {triangleResult.area.toFixed(2)} sq {
                          dimensionUnit === 'links'
                            ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                            : dimensionUnit === 'chains'
                            ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                            : dimensionUnit
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Area Breakdown Cards */}
          {triangleResult.isValid && (
            <div className="bg-white border border-blue-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-blue-700">
                    Exact Triangulated Triangle Area
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                    {triangleBreakdown.formattedAcreString}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-mono">Heron Area</span>
                  <p className="text-sm font-bold text-blue-700 font-mono">
                    {triangleResult.area.toFixed(2)} sq {
                      dimensionUnit === 'links'
                        ? (linkType === 'metric' ? 'Metric Links' : "Gunter's Links")
                        : dimensionUnit === 'chains'
                        ? (linkType === 'metric' ? 'Metric Chains' : "Gunter's Chains")
                        : dimensionUnit
                    }
                  </p>
                </div>
              </div>

              {/* Grid of Indian & Cadastral Units */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Cents</span>
                  <p className="text-base font-bold text-blue-700 font-mono">{triangleBreakdown.cents}</p>
                  <span className="text-[9px] text-slate-400">100 C = 1 Ac</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Guntas</span>
                  <p className="text-base font-bold text-blue-700 font-mono">{triangleBreakdown.guntas}</p>
                  <span className="text-[9px] text-slate-400">40 G = 1 Ac</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Yards</span>
                  <p className="text-base font-bold text-blue-700 font-mono">
                    {triangleBreakdown.sqyd.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">4840 SqYd</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Feet</span>
                  <p className="text-base font-bold text-blue-700 font-mono">
                    {triangleBreakdown.sqft.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">43560 SqFt</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Meters</span>
                  <p className="text-base font-bold text-blue-700 font-mono">
                    {triangleBreakdown.sqm.toLocaleString()}
                  </p>
                  <span className="text-[9px] text-slate-400">Metric SI</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'links' && linkType === 'gunter' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-blue-900 uppercase font-bold">Gunter Links</span>
                  <p className="text-base font-bold text-blue-700 font-mono">{triangleBreakdown.gunterLinks.toLocaleString()}</p>
                  <span className="text-[9px] text-blue-700">66ft Ch (1k=1C)</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'chains' && linkType === 'gunter' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-blue-900 uppercase font-bold">Gunter Chains</span>
                  <p className="text-base font-bold text-blue-700 font-mono">{triangleBreakdown.gunterChains.toLocaleString()}</p>
                  <span className="text-[9px] text-blue-700">1 Ch = 10 Cts</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'links' && linkType === 'metric' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Links</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{triangleBreakdown.metricLinks.toLocaleString()}</p>
                  <span className="text-[9px] text-teal-600">0.20m Link (IS 1492)</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dimensionUnit === 'chains' && linkType === 'metric' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Chains</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{triangleBreakdown.metricChains.toLocaleString()}</p>
                  <span className="text-[9px] text-teal-600">20m Ch (1=4 Ares)</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Ankanams</span>
                  <p className="text-base font-bold text-blue-700 font-mono">{triangleBreakdown.ankanams}</p>
                  <span className="text-[9px] text-slate-400">72 Sq. Ft</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ----------------- SUBTAB 3: FRACTIONAL SHARE ----------------- */}
      {subTab === 'fraction' && (
        !hasPermission('hissa_partition') ? (
          <FeatureAccessDeniedView featureKey="hissa_partition" />
        ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-600" />
              <span>Land Ownership &amp; Inheritance Share Partition (Hissa)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Partition (Hissa) — calculate inheritance and legal co-owner land shares across all local units.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Total Land Extent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={totalLandValue || ''}
                  onChange={(e) => setTotalLandValue(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. 2.5"
                />
                <select
                  value={totalLandUnit}
                  onChange={(e) => setTotalLandUnit(e.target.value as keyof typeof SQM_PER_UNIT)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-800 focus:outline-none cursor-pointer"
                >
                  <option value="acre">Acres</option>
                  <option value="cent">Cents</option>
                  <option value="gunta">Guntas</option>
                  <option value="sqyd">Sq. Yards</option>
                  <option value="sqft">Sq. Feet</option>
                  <option value="hectare">Hectares</option>
                  <option value="ankanam">Ankanams</option>
                  <option value="sq_metric_link">Sq. Metric Links (20cm)</option>
                  <option value="sq_gunter_link">Sq. Gunter Links (FMB)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ownership Fraction (Share)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={fractionNum}
                  onChange={(e) => setFractionNum(parseInt(e.target.value) || 1)}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono text-center focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xl font-bold text-slate-400">/</span>
                <input
                  type="number"
                  min="1"
                  value={fractionDen}
                  onChange={(e) => setFractionDen(parseInt(e.target.value) || 1)}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono text-center focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs font-mono text-emerald-700 ml-2 font-bold">
                  = {((shareRatio) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500 font-semibold">Common splits:</span>
            {[
              { label: '1/2 (Half)', n: 1, d: 2 },
              { label: '1/3 (Three Shares)', n: 1, d: 3 },
              { label: '1/4 (Quarter)', n: 1, d: 4 },
              { label: '2/5', n: 2, d: 5 },
              { label: '3/8', n: 3, d: 8 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setFractionNum(preset.n);
                  setFractionDen(preset.d);
                }}
                className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Share Breakdown Result */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-200 pb-2">
              <div>
                <span className="text-xs font-extrabold uppercase text-emerald-800">
                  Resulting Share Extent ({fractionNum}/{fractionDen})
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {shareBreakdown.formattedAcreString}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 font-mono">Total Parent Extent</span>
                <p className="text-sm font-semibold text-slate-700 font-mono">
                  {totalBreakdown.formattedAcreString}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Cents</span>
                <p className="text-lg font-bold text-emerald-700 font-mono">{shareBreakdown.cents}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Guntas</span>
                <p className="text-lg font-bold text-emerald-700 font-mono">{shareBreakdown.guntas}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Yards</span>
                <p className="text-lg font-bold text-emerald-700 font-mono">{shareBreakdown.sqyd.toLocaleString()}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Feet</span>
                <p className="text-lg font-bold text-emerald-700 font-mono">{shareBreakdown.sqft.toLocaleString()}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200 shadow-xs text-center">
                <span className="text-[10px] text-teal-800 uppercase font-bold">Metric Links</span>
                <p className="text-lg font-bold text-teal-700 font-mono">{shareBreakdown.metricLinks.toLocaleString()}</p>
                <span className="text-[9px] text-teal-600 block">IS 1492</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-xs text-center">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">Gunter Links</span>
                <p className="text-lg font-bold text-emerald-700 font-mono">{shareBreakdown.gunterLinks.toLocaleString()}</p>
                <span className="text-[9px] text-emerald-600 block">FMB Patta</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ----------------- SUBTAB 4: TRAVERSE SHEET ----------------- */}
      {subTab === 'traverse' && (
        !hasPermission('traverse_survey') ? (
          <FeatureAccessDeniedView featureKey="traverse_survey" />
        ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Table className="w-5 h-5 text-emerald-600" />
                <span>Closed Traverse / Bowditch Compass Adjustment</span>
              </h3>
              <p className="text-xs text-slate-500">
                Closed Traverse / Bowditch — for multi-sided plots measured with bearing and distance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextId = String(traverseStations.length + 1);
                  setTraverseStations([
                    ...traverseStations,
                    { id: nextId, lineId: `Stn ${nextId}`, bearingDeg: 0, distanceMeters: 50 },
                  ]);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Station</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveCalculation('traverse', `Closed Traverse (${traverseStations.length} Stations)`)}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Save Traverse</span>
              </button>
            </div>
          </div>

          {/* Station Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Line ID</th>
                  <th className="px-3 py-2.5">WCB Bearing (°)</th>
                  <th className="px-3 py-2.5">Dist (m)</th>
                  <th className="px-3 py-2.5">Latitude (N/S)</th>
                  <th className="px-3 py-2.5">Departure (E/W)</th>
                  <th className="px-3 py-2.5">Bowditch Adj Northing</th>
                  <th className="px-3 py-2.5">Bowditch Adj Easting</th>
                  <th className="px-2 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {traverseSummary.lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2 font-sans font-semibold">
                      <input
                        type="text"
                        value={traverseStations[idx]?.lineId || ''}
                        onChange={(e) => {
                          const updated = [...traverseStations];
                          updated[idx].lineId = e.target.value;
                          setTraverseStations(updated);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-emerald-700 font-bold w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="360"
                        step="any"
                        value={traverseStations[idx]?.bearingDeg ?? 0}
                        onChange={(e) => {
                          const updated = [...traverseStations];
                          updated[idx].bearingDeg = parseFloat(e.target.value) || 0;
                          setTraverseStations(updated);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 w-20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={traverseStations[idx]?.distanceMeters ?? 0}
                        onChange={(e) => {
                          const updated = [...traverseStations];
                          updated[idx].distanceMeters = parseFloat(e.target.value) || 0;
                          setTraverseStations(updated);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 w-20"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {line.latitude >= 0 ? `+${line.latitude}` : line.latitude}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {line.departure >= 0 ? `+${line.departure}` : line.departure}
                    </td>
                    <td className="px-3 py-2 text-emerald-700 font-bold">
                      {line.northing.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-cyan-700 font-bold">
                      {line.easting.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        disabled={traverseStations.length <= 3}
                        onClick={() => {
                          setTraverseStations(traverseStations.filter((_, i) => i !== idx));
                        }}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                        title="Delete Station"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Traverse Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Perimeter</span>
              <p className="text-base font-bold text-slate-900 font-mono">{traverseSummary.totalPerimeter} m</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Closing Error (E)</span>
              <p className="text-base font-bold text-amber-700 font-mono">
                {traverseSummary.linearClosingError} m
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Relative Precision</span>
              <p className="text-base font-bold text-emerald-700 font-mono">
                {traverseSummary.relativePrecision}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Closure Status</span>
              <p className={`text-base font-bold ${traverseSummary.isClosedGood ? 'text-emerald-700' : 'text-amber-700'}`}>
                {traverseSummary.isClosedGood ? 'Survey Compliant' : 'High Error (>1:1000)'}
              </p>
            </div>
          </div>

          {/* Enclosed Traverse Area Breakdown Cards (Shoelace Formula on Bowditch Coordinates) */}
          <div className="bg-white border border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Enclosed Polygon Area (Bowditch Shoelace Coordinate Method)
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                  {traverseSummary.areaBreakdown.formattedAcreString}
                </h4>
              </div>
              <div className="text-left sm:text-right font-mono text-xs text-slate-700">
                <span className="text-slate-500 block text-[10px]">Total Closed Extent</span>
                <span className="text-emerald-700 font-bold">{traverseSummary.areaSqm.toLocaleString()} m²</span>
                <span className="text-slate-500 block text-[10px]">({(traverseSummary.areaSqm * 10.7639).toFixed(0)} sq ft)</span>
              </div>
            </div>

            {/* Regional Conversion Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Acres</span>
                <p className="text-lg font-bold text-slate-900 font-mono">{traverseSummary.areaBreakdown.acres}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Cents</span>
                <p className="text-lg font-bold text-emerald-700 font-mono">{traverseSummary.areaBreakdown.cents}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Guntas</span>
                <p className="text-lg font-bold text-amber-700 font-mono">{traverseSummary.areaBreakdown.guntas}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Sq. Yards (Gajalu)</span>
                <p className="text-lg font-bold text-cyan-700 font-mono">{traverseSummary.areaBreakdown.sqyd.toLocaleString()}</p>
              </div>
            </div>

            {/* SVG Plot Diagram of Bowditch Polygon */}
            {traverseSummary.points.length >= 3 && (
              <div className="pt-2">
                <PlotSvgDiagram
                  points={traverseSummary.points}
                  sideLabels={traverseSummary.lines.map((l) => `${l.distanceMeters}`)}
                  title="Bowditch Balanced Traverse Boundary Plot"
                  unit="m"
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ----------------- SUBTAB 5: STATE CADASTRA & LAND AREA CONVERTER ----------------- */}
      {subTab === 'converter' && (
        !hasPermission('land_unit_conversion') ? (
          <FeatureAccessDeniedView featureKey="land_unit_conversion" />
        ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>All-India State Cadastral &amp; Land Unit Standards</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Convert accurately across all 28 Indian States &amp; 8 Union Territories with official revenue standards.
              </p>
            </div>

            {/* Target State Selector in Converter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">State Standard:</span>
              <select
                aria-label="Select Target Indian State Standard"
                value={converterState}
                onChange={(e) => setConverterState(e.target.value)}
                className="bg-emerald-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-300 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer shadow-xs"
              >
                {getAllIndianStates().map((st) => (
                  <option key={st.state} value={st.state} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {st.state} ({st.region})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Enter Area Value</label>
              <input
                type="number"
                step="any"
                value={convValue || ''}
                onChange={(e) => setConvValue(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Select Input Unit</label>
              <select
                value={convFromUnit}
                onChange={(e) => setConvFromUnit(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300 font-bold focus:outline-none cursor-pointer"
              >
                <optgroup label="Standard &amp; Common Units">
                  <option value="acre">Acre (4840 Sq. Yds / 43560 Sq. Ft)</option>
                  <option value="cent">Cent (1/100 Acre / 435.6 Sq. Ft)</option>
                  <option value="gunta">Gunta (1/40 Acre / 1089 Sq. Ft)</option>
                  <option value="hectare">Hectare (10,000 m² / 2.471 Acres)</option>
                  <option value="are">Are (100 m² / 2.471 Cents)</option>
                  <option value="sqyd">Square Yard / Gaj (9 Sq. Ft)</option>
                  <option value="sqft">Square Feet</option>
                  <option value="sqm">Square Meter (SI)</option>
                  <option value="bigha">Standard Pucca Bigha (27,225 Sq. Ft)</option>
                  <option value="sq_metric_link">Square Metric Links (0.04 m² / 20cm link)</option>
                  <option value="sq_gunter_link">Square Gunter&apos;s Links (0.040469 m² / 100k = 1 Ac)</option>
                  <option value="sq_metric_chain">Square Metric Chains (400 m² / 4 Ares / 20m chain)</option>
                  <option value="sq_gunter_chain">Square Gunter&apos;s Chains (404.686 m² / 10 Cents / 66ft chain)</option>
                </optgroup>
                {converterStateDetails.units.length > 0 && (
                  <optgroup label={`${converterState} Official Units`}>
                    {converterStateDetails.units.map((u) => (
                      <option key={u.key} value={u.key}>
                        {u.name} {u.localName ? `(${u.localName})` : ''} - {u.sqft} sq ft
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Primary Result: Target State Cadastral Standards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{converterState} Official Cadastral Breakdown</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {converterStateDetails.region} Region Standard
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {convStateUnits.map((item) => (
                <div
                  key={item.unit.key}
                  className="bg-gradient-to-b from-white to-emerald-50/40 dark:from-slate-800 dark:to-slate-800/80 p-3 rounded-xl border border-emerald-200 dark:border-slate-700 text-center shadow-xs"
                >
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-300 font-bold uppercase block truncate" title={item.unit.name}>
                    {item.unit.name}
                  </span>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                    {item.formatted}
                  </p>
                  {item.unit.localName && (
                    <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 block truncate">
                      {item.unit.localName}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate mt-0.5" title={item.unit.description}>
                    {item.unit.sqft.toLocaleString()} sq ft
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Result: Universal Indian Cadastral Standards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300">
                National &amp; Universal Standards
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">DILRMP / Survey of India</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Acres</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{convBreakdown.acres}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">4840 Sq. Yds</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Cents</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">{convBreakdown.cents}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">435.6 Sq. Ft</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Guntas</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">{convBreakdown.guntas}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">1089 Sq. Ft</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Hectares</span>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-400 font-mono">{convBreakdown.hectares}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">10,000 m²</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Square Yards (Gaj)</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{convBreakdown.sqyd.toLocaleString()}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">9 Sq. Ft</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Square Feet</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{convBreakdown.sqft.toLocaleString()}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">0.0929 m²</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Square Meters</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{convBreakdown.sqm.toLocaleString()}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">SI Standard</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Ankanams</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">{convBreakdown.ankanams}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">72 Sq. Ft (AP)</span>
              </div>
              <div className="bg-teal-50 dark:bg-slate-800 p-2.5 rounded-xl border border-teal-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-teal-800 dark:text-teal-300 uppercase font-bold">Sq. Metric Links</span>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-400 font-mono">{convBreakdown.metricLinks.toLocaleString()}</p>
                <span className="text-[9px] text-teal-600 dark:text-teal-400 block">20cm Link (IS 1492)</span>
              </div>
              <div className="bg-emerald-50 dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Sq. Gunter Links</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">{convBreakdown.gunterLinks.toLocaleString()}</p>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block">66ft Chain (1k=1C)</span>
              </div>
              <div className="bg-teal-50 dark:bg-slate-800 p-2.5 rounded-xl border border-teal-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-teal-800 dark:text-teal-300 uppercase font-bold">Sq. Metric Chains</span>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-400 font-mono">{convBreakdown.metricChains.toLocaleString()}</p>
                <span className="text-[9px] text-teal-600 dark:text-teal-400 block">20m Chain (1=4 Ares)</span>
              </div>
              <div className="bg-emerald-50 dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Sq. Gunter Chains</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">{convBreakdown.gunterChains.toLocaleString()}</p>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block">1 Ch = 10 Cents</span>
              </div>
            </div>
          </div>

          {/* State Cadastral Guidelines & Portal Info */}
          <div className="rounded-xl p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-emerald-50 dark:from-emerald-950/40 dark:via-slate-800/60 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-emerald-950 dark:text-emerald-200">
                Official Revenue &amp; Land Record Conventions ({converterState})
              </span>
              {converterStateDetails.revenuePortal && (
                <span className="text-[10px] bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-mono">
                  {converterStateDetails.revenuePortal}
                </span>
              )}
            </div>
            <p className="text-emerald-900 dark:text-emerald-300/90 leading-relaxed font-sans">
              {converterStateDetails.notes}
            </p>
          </div>
        </div>
      ))}

      {/* Gemini AI Land Document Scanner Modal */}
      <LandDocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedState={selectedState}
        onApplyExtractedData={handleApplyExtractedData}
      />

      {/* Gemini AI Plot Advisor Drawer */}
      <PlotAdvisorDrawer
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        plotData={
          subTab === 'traverse'
            ? traverseSummary
            : subTab === 'triangle'
            ? triangleBreakdown
            : (areaMethod === 'diag' || subTab === '4sided')
            ? fourSidedBreakdown
            : fourSidedNoDiagBreakdown
        }
        contextType={subTab === 'traverse' ? 'closed_traverse' : 'calculator_quadrilateral'}
        title={
          subTab === 'traverse'
            ? 'Bowditch Traverse Geomatics Advisor'
            : subTab === 'triangle'
            ? 'Triangle Geometry & Heron Advisor'
            : 'Plot Geometry & Cadastral Advisor'
        }
      />

      {/* Survey Quality & Confidence Report Modal */}
      <SurveyQualityReportModal
        isOpen={isQualityReportOpen}
        onClose={() => setIsQualityReportOpen(false)}
        assessment={getActiveAssessment()}
      />

      {/* Cadastral Measurement Comparison Modal */}
      <MeasurementComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        data={comparisonData}
      />
    </div>
  );
};

export default CalculatorTab;
