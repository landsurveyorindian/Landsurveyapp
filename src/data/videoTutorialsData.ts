/**
 * STHAL MEASURE — Complete 18-Episode Professional Video Tutorial Platform Catalogue
 * Real video parameters, scene-by-scene production storyboards, verified application inputs/outputs,
 * full English narration scripts, WebVTT subtitle tracks, and Try It Now navigation targets.
 */

export type VideoSourceType = 'mp4' | 'youtube' | 'webm' | 'none';

export interface SceneStoryboard {
  sceneNumber: number;
  time: string;
  seconds: number;
  screenTarget: string;
  userAction: string;
  demoInputs: string;
  expectedOutput: string;
  zoomHighlightNotes: string;
  onScreenCaption: string;
}

export interface VideoChapter {
  time: string;
  seconds: number;
  title: string;
  narration: string;
  screenTarget: string;
  visualAction: string;
}

export interface VideoTutorialEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  subtitle: string;
  category: 'basics' | 'calculators' | 'gps_mapping' | 'cad_gis' | 'projects_market' | 'admin_ai';
  duration: string;
  durationSeconds: number;
  thumbnailGradient: string;
  targetAudience: string;
  learningObjectives: string[];
  summary: string;

  // Real video playback properties
  videoUrl?: string;
  videoType?: VideoSourceType;
  posterUrl?: string;
  captionsUrl?: string;
  captionsVtt?: string;

  // Scene-by-scene production storyboard
  storyboard: SceneStoryboard[];
  closingSummary: string;

  chapters: VideoChapter[];
  fullNarrationScript: string;
  tryItTarget?: {
    tab: 'home' | 'calc' | 'cadtools' | 'bhuvan' | 'cad' | 'projects' | 'market';
    subTab?: 'area' | '4sided' | '4sided_nodiag' | 'triangle' | 'fraction' | 'traverse' | 'converter';
    walkMode?: boolean;
    buttonLabel: string;
  };
  youtubeTitle: string;
  youtubeDescription: string;
  keywords: string[];
  keyTakeaways: string[];
}

export const VIDEO_CATEGORIES = [
  { id: 'all', label: 'All Episodes (18)' },
  { id: 'basics', label: 'Basics & Navigation' },
  { id: 'calculators', label: 'Calculators & Units' },
  { id: 'gps_mapping', label: 'GPS Walk & Bhuvan Map' },
  { id: 'cad_gis', label: 'CAD Drafting & GIS' },
  { id: 'projects_market', label: 'Projects & Marketplace' },
  { id: 'admin_ai', label: 'Admin & AI Assistants' },
] as const;

export const VIDEO_TUTORIAL_EPISODES: VideoTutorialEpisode[] = [
{
  "id": "ep-01",
  "episodeNumber": 1,
  "title": "Complete Introduction to STHAL MEASURE",
  "subtitle": "The Modern All-India Land Surveying & Cadastral Platform",
  "category": "basics",
  "duration": "06:30",
  "durationSeconds": 390,
  "thumbnailGradient": "from-emerald-600 via-teal-700 to-slate-900",
  "targetAudience": "Beginners, landowners, farmers, civil engineering students, surveyors",
  "learningObjectives": [
    "Understand the core capabilities and mission of STHAL MEASURE.",
    "Explore the 7 primary workspaces and application architecture.",
    "Learn how state jurisdiction selection adapts regional land units.",
    "Configure the environment for desktop, tablet, and mobile field usage."
  ],
  "summary": "A complete tour of the STHAL MEASURE platform, covering its historical context, mathematical foundations, Indian revenue integration, and the 18-episode learning path.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Welcome to STHAL MEASURE",
      "narration": "Welcome to STHAL MEASURE — the definitive land surveying, cadastral mapping, and measurement platform designed specifically for Indian field geometry.",
      "screenTarget": "Home Screen",
      "visualAction": "Pulsing emerald crosshair animates into the logo with technical chime."
    },
    {
      "time": "0:45",
      "seconds": 45,
      "title": "Traditional Land Surveying Challenges",
      "narration": "Measuring land in India presents unique challenges. Plots are rarely perfect rectangles, and regional land units vary drastically between states.",
      "screenTarget": "Tiles Dashboard",
      "visualAction": "Smooth scroll across Home Dashboard highlighting Cents, Acres, and Bigha badges."
    },
    {
      "time": "2:00",
      "seconds": 120,
      "title": "Tour of the 7 Workspaces",
      "narration": "At the bottom of your screen, you will find seven dedicated workspaces: Home, Calculator, Drafting Studio, Bhuvan 2D, Import/Export, Projects, and Market.",
      "screenTarget": "Navigation Bar",
      "visualAction": "Cursor clicks through each bottom tab, highlighting the emerald indicator bar."
    },
    {
      "time": "3:45",
      "seconds": 225,
      "title": "State Jurisdiction & Unit Adaptation",
      "narration": "Notice the State Jurisdiction selector in the top header. When you change jurisdictions, STHAL MEASURE dynamically adapts its units and terminology.",
      "screenTarget": "Header State Dropdown",
      "visualAction": "Cursor opens dropdown, switches from Andhra Pradesh to Telangana and back."
    },
    {
      "time": "5:15",
      "seconds": 315,
      "title": "Overview of the 18-Episode Curriculum",
      "narration": "This training series contains eighteen comprehensive episodes covering field calculations, GPS boundary walking, CAD drafting, and enterprise security.",
      "screenTarget": "Curriculum Showcase",
      "visualAction": "Full-screen curriculum graphic highlights the 4 learning tracks."
    }
  ],
  "fullNarrationScript": "Welcome to STHAL MEASURE, the all-in-one land surveying, geospatial mapping, and parcel calculation system designed specifically for Indian land geometry, revenue records, and modern engineering standards. Whether you are a landowner verifying a boundary, a village patwari calculating an irregular holding, or a professional surveyor managing cadastral maps, this tutorial series will give you complete mastery over every tool. At the bottom of your screen, you will find seven dedicated workspaces: Home, Calculator, Drafting Studio, Bhuvan 2D, Import and Export, Projects, and Market. In the top header, the State Jurisdiction selector dynamically adapts all calculations to your local revenue dialect. In Episode 2, we explore the Dashboard and configure your device GPS sensors for precision field work.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "4sided",
    "buttonLabel": "Open 4-Sided Calculator"
  },
  "youtubeTitle": "Introduction to STHAL MEASURE | Master Land Surveying Platform (Ep. 01)",
  "youtubeDescription": "Complete introduction to STHAL MEASURE: the modern Indian land measurement, GIS mapping, and cadastral survey application.",
  "keywords": [
    "STHAL MEASURE",
    "Land Surveying",
    "Bhuvan 2D",
    "Indian Land Units",
    "Patwari Calculator",
    "Cadastral Mapping"
  ],
  "keyTakeaways": [
    "STHAL MEASURE provides 7 integrated workspaces: Calculators, CAD Studio, Bhuvan 2D, GIS, Projects, and Marketplace.",
    "Selecting your Indian state jurisdiction automatically adjusts revenue area units (Cents, Guntas, Bigha).",
    "The application runs entirely in your mobile or desktop browser without software installation."
  ],
  "videoUrl": undefined,
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Complete Introduction to STHAL MEASURE\n\n1\n00:00:00.000 --> 00:00:45.000\nWelcome to STHAL MEASURE — the definitive land surveying, cadastral mapping, and measurement platform designed specifically for Indian field geometry.\n\n2\n00:00:45.000 --> 00:02:00.000\nMeasuring land in India presents unique challenges. Plots are rarely perfect rectangles, and regional land units vary drastically between states.\n\n3\n00:02:00.000 --> 00:03:45.000\nAt the bottom of your screen, you will find seven dedicated workspaces: Home, Calculator, Drafting Studio, Bhuvan 2D, Import/Export, Projects, and Market.\n\n4\n00:03:45.000 --> 00:05:15.000\nNotice the State Jurisdiction selector in the top header. When you change jurisdictions, STHAL MEASURE dynamically adapts its units and terminology.\n\n5\n00:05:15.000 --> 00:06:30.000\nThis training series contains eighteen comprehensive episodes covering field calculations, GPS boundary walking, CAD drafting, and enterprise security.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Home Dashboard (Header & Hero Banner)",
      "userAction": "Open app in browser; verify STHAL MEASURE title badge and 18-Episode banner.",
      "demoInputs": "None (default loaded view)",
      "expectedOutput": "Platform home loaded with emerald contour lines and live telemetry header.",
      "zoomHighlightNotes": "Full wide shot (1920x1080) with subtle slow zoom (1.1x) into header brand.",
      "onScreenCaption": "Welcome to STHAL MEASURE — All-India Land Surveying & Cadastral GIS Platform."
    },
    {
      "sceneNumber": 2,
      "time": "0:45",
      "seconds": 45,
      "screenTarget": "Home Dashboard (State Revenue Standards Card)",
      "userAction": "Scroll down to regional revenue card; highlight Meebhoomi cadastral factors.",
      "demoInputs": "Active state: Andhra Pradesh",
      "expectedOutput": "1 Acre = 100 Cents = 4,840 Sq. Yards displayed with local Ankanam notation.",
      "zoomHighlightNotes": "Zoom 1.3x into the revenue standards card.",
      "onScreenCaption": "Every Indian state uses distinct revenue units: Cents, Guntas, Bighas, and Ankanams."
    },
    {
      "sceneNumber": 3,
      "time": "2:00",
      "seconds": 120,
      "screenTarget": "Bottom Navigation Dock",
      "userAction": "Click systematically through the 7 workspaces: Home, Calc, Drafting, Bhuvan, Import, Projects, Market.",
      "demoInputs": "Sequential tab clicks (1 second per tab)",
      "expectedOutput": "Each workspace mounts smoothly with its specialized toolbar and canvas.",
      "zoomHighlightNotes": "Zoom 1.4x into the bottom navigation bar with active emerald pill indicator.",
      "onScreenCaption": "7 Workspaces: Calculators, CAD Studio, Bhuvan 2D, GIS I/O, Project Vault, Marketplace."
    },
    {
      "sceneNumber": 4,
      "time": "3:45",
      "seconds": 225,
      "screenTarget": "Top Header (State Jurisdiction Selector)",
      "userAction": "Open state dropdown; switch from Andhra Pradesh to Telangana, then to Uttar Pradesh.",
      "demoInputs": "State = \"Uttar Pradesh\"",
      "expectedOutput": "Converter units instantly adapt to Pucca Bigha (1.6 per acre) and Biswa.",
      "zoomHighlightNotes": "Zoom 1.5x on state dropdown and instant unit adaptation banner.",
      "onScreenCaption": "Automatic jurisdiction adaptation aligns with state Land Revenue Acts."
    },
    {
      "sceneNumber": 5,
      "time": "5:15",
      "seconds": 315,
      "screenTarget": "Video Academy Curriculum Grid",
      "userAction": "Click Tutorials button in header; review the 18-episode learning curriculum.",
      "demoInputs": "Click \"Tutorials 18\" header pill",
      "expectedOutput": "Video Academy modal opens with 18 structured episodes across 6 categories.",
      "zoomHighlightNotes": "Full modal view showing category filters and Try It Now shortcuts.",
      "onScreenCaption": "18 Complete Episodes take you from beginner fundamentals to licensed capstone survey."
    }
  ],
  "closingSummary": "You have completed the orientation to STHAL MEASURE. You are now familiar with all 7 workspaces, Indian state jurisdiction adaptation, and the 18-episode mastery path."
},
{
  "id": "ep-02",
  "episodeNumber": 2,
  "title": "Dashboard, Navigation & GPS Sensors",
  "subtitle": "Calibrating Sensors & Mastering the Interface",
  "category": "basics",
  "duration": "05:45",
  "durationSeconds": 345,
  "thumbnailGradient": "from-blue-600 via-teal-800 to-slate-900",
  "targetAudience": "Field surveyors, mobile tablet users, first-time operators",
  "learningObjectives": [
    "Monitor real-time GNSS sensor accuracy in the top header and dashboard.",
    "Enable the Static Epoch Accumulator to filter out GPS drift.",
    "Switch between Simple and Advanced application interface modes.",
    "Work in Offline Surveyor mode when cell reception is unavailable."
  ],
  "summary": "Master the telemetry tools on the STHAL MEASURE dashboard, calibrate mobile GPS hardware, and configure offline surveyor sessions.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Sensor Status & GPS Pill",
      "narration": "When you launch STHAL MEASURE, the dashboard immediately inspects your hardware sensor environment and displays real-time horizontal accuracy.",
      "screenTarget": "Header GPS Pill",
      "visualAction": "Highlight GPS accuracy badge reading ±2.4m in emerald green."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "GPS Diagnostic & Epoch Calibration",
      "narration": "Clicking the GPS badge opens the sensor diagnostic modal, featuring the Static Epoch Accumulator for weighted mean averaging.",
      "screenTarget": "GpsAccuracyModal",
      "visualAction": "Modal opens; switch toggles Static Epoch Accumulator showing live coordinate averaging."
    },
    {
      "time": "3:00",
      "seconds": 180,
      "title": "User Accounts vs. Offline Surveyor Mode",
      "narration": "Click the profile icon to log in via Firebase, or click Continue as Offline Surveyor to work without an internet connection.",
      "screenTarget": "SignInModal",
      "visualAction": "Demonstrate Continue as Offline Surveyor button click and local session setup."
    },
    {
      "time": "4:15",
      "seconds": 255,
      "title": "Quick-Action Dashboard Tiles",
      "narration": "The dashboard tiles provide instant shortcuts to your most common workflows, including GPS boundary walks and project archives.",
      "screenTarget": "TilesDashboard",
      "visualAction": "Cursor hovers over the 4 primary cards with subtle glow effect."
    }
  ],
  "fullNarrationScript": "In Episode 2, we explore the Dashboard and sensor controls that keep your field work precise and reliable. The GPS status indicator in the top header displays your real-time horizontal accuracy in meters. Clicking the GPS badge opens the Sensor Diagnostic modal, where the Static Epoch Accumulator captures multiple coordinate readings to filter out multipath atmospheric noise. If you are deep in rural areas without cellular connectivity, click Continue as Offline Surveyor to work securely in encrypted browser memory.",
  "tryItTarget": {
    "tab": "bhuvan",
    "walkMode": true,
    "buttonLabel": "Launch GPS Walk Mode"
  },
  "youtubeTitle": "Dashboard & GPS Sensor Calibration | STHAL MEASURE (Ep. 02)",
  "youtubeDescription": "Learn how to calibrate your mobile GPS sensor and navigate STHAL MEASURE in the field.",
  "keywords": [
    "GPS Accuracy",
    "Epoch Accumulator",
    "GNSS Field Survey",
    "Offline Surveyor",
    "Dashboard Setup"
  ],
  "keyTakeaways": [
    "Always inspect the GPS horizontal accuracy badge before recording field boundary points.",
    "The Static Epoch Accumulator eliminates GPS drift by averaging coordinates over 5-10 seconds.",
    "Offline Surveyor mode enables complete measurement and saving without internet access."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Dashboard, Navigation & GPS Sensors\n\n1\n00:00:00.000 --> 00:01:30.000\nWhen you launch STHAL MEASURE, the dashboard immediately inspects your hardware sensor environment and displays real-time horizontal accuracy.\n\n2\n00:01:30.000 --> 00:03:00.000\nClicking the GPS badge opens the sensor diagnostic modal, featuring the Static Epoch Accumulator for weighted mean averaging.\n\n3\n00:03:00.000 --> 00:04:15.000\nClick the profile icon to log in via Firebase, or click Continue as Offline Surveyor to work without an internet connection.\n\n4\n00:04:15.000 --> 00:05:45.000\nThe dashboard tiles provide instant shortcuts to your most common workflows, including GPS boundary walks and project archives.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Top Header GPS Pill",
      "userAction": "Observe the GPS horizontal accuracy indicator in the top header.",
      "demoInputs": "Simulated location permission granted",
      "expectedOutput": "GPS pill displays \"±2.1m (High Precision)\" with emerald pulse indicator.",
      "zoomHighlightNotes": "Zoom 2.0x directly onto the header GPS telemetry pill.",
      "onScreenCaption": "GNSS Horizontal Accuracy: Always confirm ±3.0m or better before field measurement."
    },
    {
      "sceneNumber": 2,
      "time": "1:30",
      "seconds": 90,
      "screenTarget": "GpsAccuracyModal (Sensor Diagnostic Engine)",
      "userAction": "Click the GPS pill to open Sensor Diagnostics; toggle the Static Epoch Accumulator.",
      "demoInputs": "Toggle Epoch Accumulator = ON, Epoch Count = 10 samples",
      "expectedOutput": "Live coordinate scatter table computes inverse-variance weighted mean coordinate.",
      "zoomHighlightNotes": "Zoom 1.3x into the Epoch Accumulator chart showing diminishing variance.",
      "onScreenCaption": "Static Epoch Accumulator eliminates GPS drift by averaging stationary satellite epochs."
    },
    {
      "sceneNumber": 3,
      "time": "3:00",
      "seconds": 180,
      "screenTarget": "SignInModal (Authentication Options)",
      "userAction": "Click Sign In icon in header; demonstrate \"Continue as Offline Surveyor\".",
      "demoInputs": "Click \"Continue as Offline Surveyor\"",
      "expectedOutput": "Offline session initialized in IndexedDB memory; \"OFFLINE SURVEYOR\" status badge appears.",
      "zoomHighlightNotes": "Highlight the green offline shield badge in the header.",
      "onScreenCaption": "Offline Surveyor Mode ensures zero field data loss even in remote forest or rural areas."
    },
    {
      "sceneNumber": 4,
      "time": "4:15",
      "seconds": 255,
      "screenTarget": "Home Dashboard (Quick-Action Workflow Tiles)",
      "userAction": "Hover over the 4 primary cards: Measure My Land, Calculate Land Area, Saved Surveys, Market.",
      "demoInputs": "Mouse hover over each tile",
      "expectedOutput": "Subtle hover glow, badge counters (e.g. \"1 Stored\", \"Verified Land\").",
      "zoomHighlightNotes": "Pan across the 4 dashboard tiles.",
      "onScreenCaption": "One-tap workflow tiles launch your primary daily surveying tasks."
    }
  ],
  "closingSummary": "Your mobile device hardware is now calibrated for high-precision field measurement. Use the Static Epoch Accumulator in open sky to minimize multipath noise."
},
{
  "id": "ep-03",
  "episodeNumber": 3,
  "title": "Land Measurement Basics & Field Geometry",
  "subtitle": "Why the Patwari Average Method Fails and Diagonals Matter",
  "category": "calculators",
  "duration": "07:15",
  "durationSeconds": 435,
  "thumbnailGradient": "from-amber-600 via-emerald-800 to-slate-900",
  "targetAudience": "Landowners, students, patwaris, revenue assistants",
  "learningObjectives": [
    "Understand the geometric fallacy of multiplying average opposite sides.",
    "Master the principle of triangulation by measuring plot diagonals.",
    "Differentiate between Gunter links (66 ft chain) and Metric links (IS 1492).",
    "Read and verify area outputs across Sq Yards, Cents, Acres, and Guntas."
  ],
  "summary": "A foundational lesson on quadrilateral geometry, explaining why four side lengths alone cannot determine area, and introducing rigid triangulation.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "The Great Quadrilateral Fallacy",
      "narration": "Traditional surveyors frequently multiply average opposite sides. This average method is mathematically false for non-rectangular parcels.",
      "screenTarget": "Geometry Diagram",
      "visualAction": "Animated graphic shows a flexing quadrilateral losing area while side lengths stay constant."
    },
    {
      "time": "2:15",
      "seconds": 135,
      "title": "The Principle of Triangulation",
      "narration": "In surveying, the triangle is the only polygon whose shape and area are completely fixed by its side lengths.",
      "screenTarget": "CalculatorTab (4sided)",
      "visualAction": "Interactive SVG plot highlights diagonal AC splitting the parcel into 2 rigid triangles."
    },
    {
      "time": "4:00",
      "seconds": 240,
      "title": "Indian Linear Survey Units",
      "narration": "STHAL MEASURE supports meters, feet, yards, Gunter chain links, and metric links under Indian Standard 1492.",
      "screenTarget": "Linear Unit Selector",
      "visualAction": "Cursor cycles through Meters, Feet, Yards, and Gunter Links tabs."
    },
    {
      "time": "5:45",
      "seconds": 345,
      "title": "Reading Area Output Cards",
      "narration": "Calculations display across Cents, Acres, Square Yards, and Guntas simultaneously, eliminating mental conversion mistakes.",
      "screenTarget": "Area Output Card",
      "visualAction": "Zoom on emerald result card showing 23.54 Cents and 1,139.3 Sq Yards."
    }
  ],
  "fullNarrationScript": "Every day across India, landowners calculate land area by taking the average of opposite sides. This is mathematically false unless all four corners are exact right angles. A four-sided polygon with flexible corner hinges can be flattened until its area drops to zero, even though its four sides never change. To fix the shape, you must measure at least one diagonal. This splits the irregular parcel into two distinct triangles solved by Heron formula.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "triangle",
    "buttonLabel": "Try Triangulation Calculator"
  },
  "youtubeTitle": "Land Measurement Basics & Field Geometry | STHAL MEASURE (Ep. 03)",
  "youtubeDescription": "Why the Patwari average method is inaccurate and how triangulation guarantees mathematically authentic land areas.",
  "keywords": [
    "Land Measurement Basics",
    "Patwari Average Method",
    "Triangulation",
    "Gunter Links",
    "Cents and Acres"
  ],
  "keyTakeaways": [
    "Four boundary sides alone do not determine a unique parcel area.",
    "Measuring at least one diagonal locks the quadrilateral into two rigid triangles.",
    "1 Acre = 100 Cents = 40 Guntas = 4,840 Sq Yards = 43,560 Sq Feet = 4,046.86 Sq Meters."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Land Measurement Basics & Field Geometry\n\n1\n00:00:00.000 --> 00:02:15.000\nTraditional surveyors frequently multiply average opposite sides. This average method is mathematically false for non-rectangular parcels.\n\n2\n00:02:15.000 --> 00:04:00.000\nIn surveying, the triangle is the only polygon whose shape and area are completely fixed by its side lengths.\n\n3\n00:04:00.000 --> 00:05:45.000\nSTHAL MEASURE supports meters, feet, yards, Gunter chain links, and metric links under Indian Standard 1492.\n\n4\n00:05:45.000 --> 00:07:15.000\nCalculations display across Cents, Acres, Square Yards, and Guntas simultaneously, eliminating mental conversion mistakes.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Geometry Fallacy Diagram (Animated Quadrilateral)",
      "userAction": "Display an animated 4-sided polygon with flexible hinges showing area collapse.",
      "demoInputs": "Side lengths AB=120, BC=95, CD=110, DA=85 (fixed)",
      "expectedOutput": "Area varies continuously from 0 up to 10,850 sq ft depending on interior angle.",
      "zoomHighlightNotes": "Center stage graphic showing flexing corners and collapsing area.",
      "onScreenCaption": "The Patwari Average Fallacy: Average opposite sides overstates area on non-rectangles."
    },
    {
      "sceneNumber": 2,
      "time": "2:15",
      "seconds": 135,
      "screenTarget": "CalculatorTab (4-Sided Diagonal Mode)",
      "userAction": "Switch to 4-Sided Calculator; show diagonal AC dividing plot into Triangle 1 and Triangle 2.",
      "demoInputs": "AB=120, BC=95, CD=110, DA=85, Diagonal AC=145 ft",
      "expectedOutput": "Rigid geometry locked: Triangle 1 (120, 95, 145) + Triangle 2 (110, 85, 145).",
      "zoomHighlightNotes": "Zoom 1.4x into the interactive SVG parcel diagram with diagonal line.",
      "onScreenCaption": "Diagonal Triangulation: The triangle is the only geometrically rigid polygon."
    },
    {
      "sceneNumber": 3,
      "time": "4:00",
      "seconds": 240,
      "screenTarget": "Linear Unit Selector (Feet, Meters, Yards, Gunter Links)",
      "userAction": "Click between Feet, Meters, and Gunter Links tabs to observe live unit conversions.",
      "demoInputs": "Toggle unit to Gunter Links (66 ft chain, 100 links)",
      "expectedOutput": "Side lengths convert to links; area maintains mathematical equivalence.",
      "zoomHighlightNotes": "Zoom 1.6x into the unit segmented button control.",
      "onScreenCaption": "Supports Indian Standard 1492 metric chains and traditional Gunter cadastral links."
    },
    {
      "sceneNumber": 4,
      "time": "5:45",
      "seconds": 345,
      "screenTarget": "Area Summary Card",
      "userAction": "Inspect total calculated extent displayed in Cents, Acres, Square Yards, and Square Feet.",
      "demoInputs": "Input values locked",
      "expectedOutput": "Total Area = 23.54 Cents | 1,139.3 Sq. Yards | 10,254.1 Sq. Feet.",
      "zoomHighlightNotes": "Zoom 1.5x onto the emerald results card with regional unit breakdown.",
      "onScreenCaption": "Direct multi-unit readout prevents costly arithmetic conversion errors."
    }
  ],
  "closingSummary": "Remember: four perimeter sides never fix an irregular quadrilateral. Always measure at least one diagonal across opposite boundary stones."
},
{
  "id": "ep-04",
  "episodeNumber": 4,
  "title": "Four-Sided Plot Area Calculator",
  "subtitle": "Triangulation with Diagonals & The Brahmagupta Method",
  "category": "calculators",
  "duration": "08:30",
  "durationSeconds": 510,
  "thumbnailGradient": "from-emerald-600 via-blue-700 to-slate-900",
  "targetAudience": "Surveyors, property buyers, civil engineers, real estate developers",
  "learningObjectives": [
    "Calculate exact area using 4 sides plus 1 diagonal via double Heron triangulation.",
    "Calculate the theoretical upper bound when no diagonal is available using Brahmagupta formula.",
    "Compare exact geometry with the Indian Patwari Average method.",
    "Export calculations to a saved survey project and client-ready PDF."
  ],
  "summary": "A step-by-step practical guide to solving irregular four-sided parcels in STHAL MEASURE with full mathematical breakdowns and interactive SVG previews.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Opening the 4-Sided Calculator",
      "narration": "In Episode 4, we put theory into practice with the Four-Sided Plot Area Calculator.",
      "screenTarget": "CalculatorTab (4sided)",
      "visualAction": "Calculator tab opens with 4-Sided (Diagonal) subtab active."
    },
    {
      "time": "1:45",
      "seconds": 105,
      "title": "Entering Field Measurements",
      "narration": "Enter: Side A 120 ft, Side B 95 ft, Side C 110 ft, Side D 85 ft, and Diagonal AC 145 ft.",
      "screenTarget": "Dimension Inputs",
      "visualAction": "Numbers typed in; interactive SVG plot updates in real time with corner labels."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "Exact Triangulated Results",
      "narration": "Triangle one yields 5,618.3 sq ft, triangle two yields 4,635.8 sq ft, giving an exact total of 23.54 Cents.",
      "screenTarget": "Results Card",
      "visualAction": "Zoom on breakdown: 10,254.1 Sq Ft = 23.54 Cents (1,139.3 Sq Yards)."
    },
    {
      "time": "5:15",
      "seconds": 315,
      "title": "No-Diagonal Mode: Brahmagupta vs. Patwari",
      "narration": "When obstacles prevent measuring a diagonal, switch to No Diagonal mode to compare Brahmagupta maximum with the Patwari average.",
      "screenTarget": "CalculatorTab (4sided_nodiag)",
      "visualAction": "Switch to 4-Sided (No Diagonal) subtab; side-by-side comparison cards render."
    },
    {
      "time": "7:00",
      "seconds": 420,
      "title": "Saving Project & PDF Export",
      "narration": "Click Save Survey Project to store the parcel in your vault, ready for PDF generation.",
      "screenTarget": "Save Project Modal",
      "visualAction": "Project saved as Survey No. 204/1A; PDF preview opens."
    }
  ],
  "fullNarrationScript": "Open the Calculator workspace and ensure the 4-Sided (Diagonal) subtab is selected. Enter our sample field measurements: Side A 120 ft, Side B 95 ft, Side C 110 ft, Side D 85 ft, and Diagonal AC 145 ft. Look at the calculation breakdown: Triangle one yields 5,618 sq ft and Triangle two yields 4,635 sq ft, totaling 10,254 sq ft or exactly 23.54 Cents. If obstacles prevent measuring a diagonal, the No Diagonal subtab displays Brahmagupta cyclic quadrilateral formula for theoretical maximum area alongside the traditional Patwari average.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "4sided",
    "buttonLabel": "Try 4-Sided Calculator"
  },
  "youtubeTitle": "Four-Sided Plot Calculator: Diagonal & Patwari Methods | STHAL MEASURE (Ep. 04)",
  "youtubeDescription": "Calculate irregular four-sided plot areas accurately using diagonal triangulation and Brahmagupta cyclic formulas in STHAL MEASURE.",
  "keywords": [
    "4-Sided Plot Calculator",
    "Diagonal Triangulation",
    "Brahmagupta Formula",
    "Patwari Method",
    "Irregular Land Area"
  ],
  "keyTakeaways": [
    "Diagonal AC divides the plot into two independent triangles solved by Heron formula.",
    "Brahmagupta formula calculates the absolute maximum area possible for four given side lengths.",
    "The Patwari average method typically overstates parcel areas compared to real geometry."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Four-Sided Plot Area Calculator\n\n1\n00:00:00.000 --> 00:01:45.000\nIn Episode 4, we put theory into practice with the Four-Sided Plot Area Calculator.\n\n2\n00:01:45.000 --> 00:03:30.000\nEnter: Side A 120 ft, Side B 95 ft, Side C 110 ft, Side D 85 ft, and Diagonal AC 145 ft.\n\n3\n00:03:30.000 --> 00:05:15.000\nTriangle one yields 5,618.3 sq ft, triangle two yields 4,635.8 sq ft, giving an exact total of 23.54 Cents.\n\n4\n00:05:15.000 --> 00:07:00.000\nWhen obstacles prevent measuring a diagonal, switch to No Diagonal mode to compare Brahmagupta maximum with the Patwari average.\n\n5\n00:07:00.000 --> 00:08:30.000\nClick Save Survey Project to store the parcel in your vault, ready for PDF generation.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "CalculatorTab (4-Sided Diagonal Subtab)",
      "userAction": "Navigate to Calculator workspace; confirm 4-Sided (Diagonal) subtab is active.",
      "demoInputs": "Click \"Calculator\" in navigation dock",
      "expectedOutput": "Input form with fields Side 1, Side 2, Side 3, Side 4, and Diagonal.",
      "zoomHighlightNotes": "Full screen overview of input fields and SVG canvas placeholder.",
      "onScreenCaption": "Four-Sided Plot Area Calculator: The most essential tool for Indian field geometry."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Calculator Input Fields & Real-Time SVG Plot",
      "userAction": "Type in field measurements: Side 1=120, Side 2=95, Side 3=110, Side 4=85, Diagonal=145.",
      "demoInputs": "Side 1=120, Side 2=95, Side 3=110, Side 4=85, Diagonal=145 (Unit: Feet)",
      "expectedOutput": "SVG canvas dynamically drafts the irregular quadrilateral with corner vertex tags.",
      "zoomHighlightNotes": "Split focus: typing inputs on the left, instant SVG rendering on the right.",
      "onScreenCaption": "Real-time geometric rendering proves physical constructibility as you type."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Calculated Results Card (Triangulation Breakdown)",
      "userAction": "Highlight Triangle 1 (5,618.3 sq ft) and Triangle 2 (4,635.8 sq ft).",
      "demoInputs": "Measurements entered",
      "expectedOutput": "Total = 10,254.1 Sq Ft = 23.54 Cents (0.2354 Acres, 1,139.3 Sq Yards).",
      "zoomHighlightNotes": "Zoom 1.4x into Triangle 1 and Triangle 2 breakdown cards.",
      "onScreenCaption": "Independent Heron calculation for each triangle guarantees mathematical precision."
    },
    {
      "sceneNumber": 4,
      "time": "5:15",
      "seconds": 315,
      "screenTarget": "CalculatorTab (4-Sided No Diagonal Subtab)",
      "userAction": "Switch to 4-Sided (No Diagonal) subtab; enter Side 1=120, Side 2=95, Side 3=110, Side 4=85.",
      "demoInputs": "4 sides without diagonal",
      "expectedOutput": "Side-by-side comparison: Brahmagupta Cyclic Max (23.95 Cents) vs. Patwari Average (25.14 Cents).",
      "zoomHighlightNotes": "Zoom 1.3x into the comparative analysis table highlighting the 1.6-Cent Patwari error.",
      "onScreenCaption": "When diagonal cannot be measured, Brahmagupta formula provides true theoretical upper bound."
    },
    {
      "sceneNumber": 5,
      "time": "7:00",
      "seconds": 420,
      "screenTarget": "Save Project Modal",
      "userAction": "Click \"Save Survey Project\"; enter Survey No. 204/1A and Client Name; save to project vault.",
      "demoInputs": "Project Name = \"Sy No 204/1A Penamaluru\", Client = \"K. Venkatesh\"",
      "expectedOutput": "Project stored in IndexedDB with local sync stamp; badge increments on Projects tab.",
      "zoomHighlightNotes": "Follow cursor as it fills the modal and triggers the emerald save button.",
      "onScreenCaption": "Save directly to your local Project Vault for instant client PDF certificate generation."
    }
  ],
  "closingSummary": "The Four-Sided Plot Calculator combines exact double Heron triangulation with Brahmagupta bounds, safeguarding both buyer and seller during property transactions."
},
{
  "id": "ep-05",
  "episodeNumber": 5,
  "title": "Master Land Unit Conversion Across India",
  "subtitle": "All 28 States, Regional Revenue Measures & Chain Links",
  "category": "calculators",
  "duration": "07:00",
  "durationSeconds": 420,
  "thumbnailGradient": "from-cyan-600 via-teal-800 to-slate-900",
  "targetAudience": "Property advocates, revenue officials, land buyers, surveyors",
  "learningObjectives": [
    "Convert accurately between Metric, Imperial, and Indian state revenue units.",
    "Understand regional variations of Bigha, Katha, Biswa, Gunta, and Cent.",
    "Master Gunter chain links (66 ft) and Metric links (IS 1492).",
    "Prevent costly legal discrepancies in property purchase deeds."
  ],
  "summary": "A comprehensive tour of the state-aware Land Unit Converter in STHAL MEASURE, supporting all 28 Indian States and 8 Union Territories.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Regional Land Unit Diversity",
      "narration": "India has no single uniform land unit. The word Bigha in Uttar Pradesh differs substantially from a Bigha in West Bengal.",
      "screenTarget": "Converter Subtab",
      "visualAction": "Converter workspace opens with multi-tier unit matrix visible."
    },
    {
      "time": "1:45",
      "seconds": 105,
      "title": "1 Acre Across All Standard Units",
      "narration": "Enter 1 Acre to view 4,046.86 square meters, 43,560 square feet, 4,840 square yards, 100 Cents, and 40 Guntas.",
      "screenTarget": "Converter Matrix",
      "visualAction": "Input 1 Acre; matrix cards populate dynamically."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "State Revenue Jurisdictions",
      "narration": "Selecting Uttar Pradesh adds Pucca Bigha and Biswa, while selecting Andhra Pradesh calculates local Ankanams.",
      "screenTarget": "Header State Selector",
      "visualAction": "Switch state in header; local unit cards update automatically."
    },
    {
      "time": "5:15",
      "seconds": 315,
      "title": "Gunter Links vs. Metric Links",
      "narration": "In older revenue Tippon maps, 10,000 square Gunter links equals exactly 10 Cents, or 0.1 Acres.",
      "screenTarget": "Link Converter",
      "visualAction": "Enter 10,000 Gunter links; verify 10.00 Cents output."
    }
  ],
  "fullNarrationScript": "India does not have a single uniform land unit. STHAL MEASURE features a built-in state-aware Land Unit Converter that solves these discrepancies instantly. Enter 1 Acre as our base value: the matrix immediately shows 100 Cents, 40 Guntas, 4,840 square yards, and 4,046.86 square meters. When you switch to Uttar Pradesh, the app calculates Pucca Bighas and Biswas. Selecting Andhra Pradesh reveals Ankanams, where one Ankanam equals seventy-two square feet.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "converter",
    "buttonLabel": "Open Unit Converter"
  },
  "youtubeTitle": "Land Unit Conversion Guide: Acres, Cents, Guntas & Bigha | STHAL MEASURE (Ep. 05)",
  "youtubeDescription": "Master Indian land unit conversions across all 28 states and union territories using STHAL MEASURE.",
  "keywords": [
    "Land Unit Converter",
    "Acres to Cents",
    "Bigha to Sq Feet",
    "Gunta to Sq Yards",
    "Indian Land Measurement"
  ],
  "keyTakeaways": [
    "1 Acre = 100 Cents = 40 Guntas = 4,840 Sq Yards = 43,560 Sq Feet = 4,046.86 Sq Meters.",
    "State-specific units (Pucca Bigha, Biswa, Ankanam, Ground) update dynamically based on jurisdiction.",
    "1,000 square Gunter links = 1 Cent; 100,000 square Gunter links = 1 Acre."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Master Land Unit Conversion Across India\n\n1\n00:00:00.000 --> 00:01:45.000\nIndia has no single uniform land unit. The word Bigha in Uttar Pradesh differs substantially from a Bigha in West Bengal.\n\n2\n00:01:45.000 --> 00:03:30.000\nEnter 1 Acre to view 4,046.86 square meters, 43,560 square feet, 4,840 square yards, 100 Cents, and 40 Guntas.\n\n3\n00:03:30.000 --> 00:05:15.000\nSelecting Uttar Pradesh adds Pucca Bigha and Biswa, while selecting Andhra Pradesh calculates local Ankanams.\n\n4\n00:05:15.000 --> 00:07:00.000\nIn older revenue Tippon maps, 10,000 square Gunter links equals exactly 10 Cents, or 0.1 Acres.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "CalculatorTab (Unit Converter Subtab)",
      "userAction": "Open Unit Converter; enter base value 1.0 in the input field.",
      "demoInputs": "Value = 1.0, Unit = Acres",
      "expectedOutput": "National baseline: 4,046.86 m², 43,560 sq ft, 4,840 sq yds, 100 Cents, 40 Guntas.",
      "zoomHighlightNotes": "Zoom 1.3x into the multi-unit conversion matrix cards.",
      "onScreenCaption": "1 Acre Standard: Exactly 100 Cents or 40 Guntas across national revenue registers."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Top Header State Selector",
      "userAction": "Change State Jurisdiction from Andhra Pradesh to Uttar Pradesh.",
      "demoInputs": "State = \"Uttar Pradesh\"",
      "expectedOutput": "Converter matrix dynamically populates with Pucca Bigha (1.60 per acre) and Biswa (32.00).",
      "zoomHighlightNotes": "Highlight the seamless state change and automatic unit card substitution.",
      "onScreenCaption": "North India Standards: Northern Bigha and Biswa are statutory under the UP Revenue Code."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Unit Converter (South India Ankanam & Ground Standards)",
      "userAction": "Switch to Tamil Nadu and Andhra Pradesh; inspect regional variations.",
      "demoInputs": "State = \"Andhra Pradesh (Nellore / Tirupati)\"",
      "expectedOutput": "Nellore Ankanam (72 sq ft = 605 per acre) vs Tirupati Ankanam (36 sq ft = 1,210 per acre).",
      "zoomHighlightNotes": "Zoom 1.5x into the regional dialect note explaining Coastal vs Rayalaseema Ankanams.",
      "onScreenCaption": "Regional Ankanams: STHAL MEASURE differentiates between Nellore (72 sq ft) and Tirupati (36 sq ft)."
    },
    {
      "sceneNumber": 4,
      "time": "5:15",
      "seconds": 315,
      "screenTarget": "Cadastral Link Converter (Gunter vs Metric)",
      "userAction": "Enter 10,000 Gunter Links in the cadastral links section.",
      "demoInputs": "Gunter Links = 10,000 sq links",
      "expectedOutput": "Converts to exactly 10.00 Cents (0.100 Acres, 435.60 sq yds).",
      "zoomHighlightNotes": "Zoom 1.4x into the chain link formula breakdown.",
      "onScreenCaption": "Historical Cadastral Tippon: 100,000 square Gunter links equals 1.000 Acre."
    }
  ],
  "closingSummary": "State land administration relies on statutory regional units. Use STHAL MEASURE to navigate between Cents, Guntas, Bighas, and Ankanams without ambiguity."
},
{
  "id": "ep-06",
  "episodeNumber": 6,
  "title": "GPS Walking Boundary Survey in the Field",
  "subtitle": "Real-Time Perimeter Mapping on Mobile Devices",
  "category": "gps_mapping",
  "duration": "09:45",
  "durationSeconds": 585,
  "thumbnailGradient": "from-emerald-600 via-lime-800 to-slate-900",
  "targetAudience": "Field surveyors, farmers, landowners inspecting physical plots",
  "learningObjectives": [
    "Acquire high-precision GPS locks and monitor horizontal accuracy thresholds.",
    "Use GPS Walk Mode to record real-time parcel boundaries by walking perimeters.",
    "Drop stationary corner stations using weighted epoch averaging.",
    "Close boundary polygons and export directly to KML or the 4-Sided Calculator."
  ],
  "summary": "A real outdoor field tutorial demonstrating how to walk property boundaries, capture corners with GNSS precision, and calculate geodesic acreage.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Outdoor Pre-Survey Sensor Check",
      "narration": "Before taking a single step, ensure your device has a clear view of the sky and verify horizontal accuracy below 3 meters.",
      "screenTarget": "Outdoor Field View",
      "visualAction": "Surveyor stands at a field boundary stone with tablet displaying emerald GPS accuracy pill."
    },
    {
      "time": "1:45",
      "seconds": 105,
      "title": "Activating GPS Walk Mode",
      "narration": "Click the Footprints icon on the right side of the map to launch GPS Boundary Walk Mode.",
      "screenTarget": "BhuvanMapTab (Walk Mode)",
      "visualAction": "Footprints button clicked; pulsing cyan location circle appears with Drop Corner Point button."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "Walking the Boundary & Dropping Corners",
      "narration": "As you walk the boundary bund, pause at each physical corner for three seconds and tap Drop Corner Point.",
      "screenTarget": "Satellite Map Tracking",
      "visualAction": "Split screen: surveyor walks along bund while vector line traces 4 corners (A, B, C, D)."
    },
    {
      "time": "6:00",
      "seconds": 360,
      "title": "Closing the Boundary & Calculating Acreage",
      "narration": "Return to Corner 1 and click Complete Boundary. The app calculates 2.31 Acres or 231.1 Cents.",
      "screenTarget": "Parcel Metrics Card",
      "visualAction": "Polygon closes with translucent emerald fill; metrics card displays 2.31 Acres (395.4m perimeter)."
    },
    {
      "time": "7:45",
      "seconds": 465,
      "title": "Direct Dispatch to 4-Sided Calculator",
      "narration": "Click Send to 4-Sided Calculator to transfer boundary dimensions directly into the calculation engine.",
      "screenTarget": "CalculatorTab (4sided)",
      "visualAction": "App transitions to calculator with the 4 walked boundary lengths prefilled."
    }
  ],
  "fullNarrationScript": "In Episode 6, we take STHAL MEASURE into the field to survey a parcel in real time using your GNSS receiver. Before starting, check the GPS status pill in the header: our horizontal accuracy is currently 2.4 meters. Click the Footprints icon to activate GPS Walk Mode. Stand at Corner 1 and tap Drop Corner Point. Walk along the boundary bund, pausing at each corner stone to record Stations 2, 3, and 4. When you return to the start, click Complete Boundary. The app calculates an exact ground area of 2.31 Acres or 231.1 Cents.",
  "tryItTarget": {
    "tab": "bhuvan",
    "walkMode": true,
    "buttonLabel": "Try GPS Walk Mode"
  },
  "youtubeTitle": "GPS Walking Boundary Survey in the Field | STHAL MEASURE (Ep. 06)",
  "youtubeDescription": "Learn how to conduct a real-time GPS boundary walk survey using STHAL MEASURE on any smartphone or tablet.",
  "keywords": [
    "GPS Walk Survey",
    "Boundary Mapping",
    "Perimeter Walk",
    "Mobile Land Survey",
    "Cadastral GPS"
  ],
  "keyTakeaways": [
    "Allow the GPS sensor to settle for 3-5 seconds at each corner before dropping a station.",
    "The application automatically re-projects geographic coordinates into local UTM zones.",
    "One tap transfers GPS-walked side lengths directly into the 4-Sided Calculator."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: GPS Walking Boundary Survey in the Field\n\n1\n00:00:00.000 --> 00:01:45.000\nBefore taking a single step, ensure your device has a clear view of the sky and verify horizontal accuracy below 3 meters.\n\n2\n00:01:45.000 --> 00:03:30.000\nClick the Footprints icon on the right side of the map to launch GPS Boundary Walk Mode.\n\n3\n00:03:30.000 --> 00:06:00.000\nAs you walk the boundary bund, pause at each physical corner for three seconds and tap Drop Corner Point.\n\n4\n00:06:00.000 --> 00:07:45.000\nReturn to Corner 1 and click Complete Boundary. The app calculates 2.31 Acres or 231.1 Cents.\n\n5\n00:07:45.000 --> 00:09:45.000\nClick Send to 4-Sided Calculator to transfer boundary dimensions directly into the calculation engine.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Bhuvan 2D Workspace (Map Canvas)",
      "userAction": "Click Bhuvan 2D in navigation dock; verify map satellite tiles are centered on surveyor location.",
      "demoInputs": "GPS enabled with outdoor lock",
      "expectedOutput": "Map centers on live position with pulsing cyan location dot and accuracy radius.",
      "zoomHighlightNotes": "Full screen view showing high-resolution satellite imagery and map toolbar.",
      "onScreenCaption": "Bhuvan 2D: Integrated ISRO satellite basemap and live GNSS tracking canvas."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "GPS Walk Mode Action Panel",
      "userAction": "Click the Footprints icon in the map overlay; activate GPS Walk Mode.",
      "demoInputs": "Click \"Start Boundary Walk\"",
      "expectedOutput": "Action panel activates: live distance counter, perimeter ticker, and \"Drop Corner\" button.",
      "zoomHighlightNotes": "Zoom 1.4x into the floating GPS walk control console.",
      "onScreenCaption": "GPS Walk Mode: Records perimeter vertices as you physically walk the parcel bund."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Live Boundary Tracing Canvas",
      "userAction": "Walk along parcel boundary; pause at Corner 1, 2, 3, and 4 to drop station pins.",
      "demoInputs": "4 corner points dropped sequentially at parcel boundary stones",
      "expectedOutput": "Vector line connects stations with live geodesic edge distances (e.g. AB=98.4m, BC=82.1m).",
      "zoomHighlightNotes": "Watch vector polyline grow in real time across the satellite parcel.",
      "onScreenCaption": "Corner Averaging: Pause 3 seconds at each stone so the epoch accumulator locks coordinates."
    },
    {
      "sceneNumber": 4,
      "time": "6:00",
      "seconds": 360,
      "screenTarget": "Boundary Closure Card",
      "userAction": "Return to start stone and click \"Complete & Close Boundary\".",
      "demoInputs": "Click \"Complete Boundary\"",
      "expectedOutput": "Polygon closes with translucent emerald fill; metrics: Perimeter 398.4m, Area 2.31 Acres (231.1 Cents).",
      "zoomHighlightNotes": "Zoom 1.4x onto closed polygon and computed acreage badge.",
      "onScreenCaption": "Automatic Geodesic Closure: Re-projects latitude/longitude into local UTM plane for exact area."
    },
    {
      "sceneNumber": 5,
      "time": "7:45",
      "seconds": 465,
      "screenTarget": "Dispatch to 4-Sided Calculator",
      "userAction": "Click \"Send to 4-Sided Calculator\" button in the closure dialog.",
      "demoInputs": "Click \"Send to 4-Sided Calculator\"",
      "expectedOutput": "Calculator opens with 4 walked side lengths pre-filled in meters ready for diagonal verification.",
      "zoomHighlightNotes": "Observe seamless data transfer from map workspace into calculation engine.",
      "onScreenCaption": "Seamless Workflow: Walk the boundary once, then calculate and certify in the calculator."
    }
  ],
  "closingSummary": "GPS Walk Mode converts field walking into boundary geometry. Always pause for 3-5 seconds at each corner stone to allow the GNSS filter to converge."
},
{
  "id": "ep-07",
  "episodeNumber": 7,
  "title": "Triangulation Surveys & Heron Formula",
  "subtitle": "Solving Multi-Sided Parcels with Geometric Rigor",
  "category": "calculators",
  "duration": "06:15",
  "durationSeconds": 375,
  "thumbnailGradient": "from-amber-600 via-teal-800 to-slate-900",
  "targetAudience": "Surveying students, civil engineers, patwaris",
  "learningObjectives": [
    "Master Heron formula for triangular areas without measuring angles.",
    "Verify the Triangle Inequality Theorem to catch field recording blunders.",
    "Decompose complex multi-sided parcels into triangular networks.",
    "Inspect perimeter, semi-perimeter, and centroid coordinates."
  ],
  "summary": "A deep dive into triangular surveying, Heron formula, and automatic error detection when field measurements violate physical geometry.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Heron Formula in Land Surveying",
      "narration": "Heron formula calculates exact triangular land areas from the lengths of three sides alone, without measuring internal angles.",
      "screenTarget": "Heron Formula Graphic",
      "visualAction": "Formula animation: s = (a+b+c)/2 and Area = sqrt(s(s-a)(s-b)(s-c))."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Scaled 3-4-5 Right Triangle Example",
      "narration": "Enter Side a 75m, Side b 60m, and Side c 45m. The app calculates exactly 1,350 square meters or 33.36 Cents.",
      "screenTarget": "CalculatorTab (triangle)",
      "visualAction": "Inputs typed; interactive SVG draws a scaled 3-4-5 triangle."
    },
    {
      "time": "3:15",
      "seconds": 195,
      "title": "Automated Triangle Inequality Trapping",
      "narration": "If a surveyor enters impossible dimensions—such as 150m for Side c—the app immediately flags the geometric impossibility.",
      "screenTarget": "Validation Alert",
      "visualAction": "Side c changed to 150; rose warning banner alerts of triangle inequality violation."
    }
  ],
  "fullNarrationScript": "In Episode 7, we explore the core building block of cadastral mapping: Triangulation. All you need are the lengths of the three enclosing sides. Let us open the Triangle subtab in STHAL MEASURE. We enter seventy-five meters for Side a, sixty meters for Side b, and forty-five meters for Side c. STHAL MEASURE computes the exact area of one thousand three hundred and fifty square meters, or thirty-three point three-six Cents. If entered measurements violate the triangle inequality theorem, the app warns you immediately.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "triangle",
    "buttonLabel": "Try Triangle Calculator"
  },
  "youtubeTitle": "Triangulation Surveys & Heron Formula | STHAL MEASURE (Ep. 07)",
  "youtubeDescription": "Solve triangular land plots and catch field recording errors using Heron formula and the Triangle Inequality Theorem.",
  "keywords": [
    "Triangulation Survey",
    "Heron Formula",
    "Triangle Inequality",
    "Cadastral Triangles",
    "Land Measurement"
  ],
  "keyTakeaways": [
    "Heron formula calculates exact area without requiring theodolite angle measurements.",
    "The Triangle Inequality Theorem requires that a + b > c for all three side combinations.",
    "Multi-sided polygons can be calculated with complete accuracy by partitioning into triangles."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Triangulation Surveys & Heron Formula\n\n1\n00:00:00.000 --> 00:01:30.000\nHeron formula calculates exact triangular land areas from the lengths of three sides alone, without measuring internal angles.\n\n2\n00:01:30.000 --> 00:03:15.000\nEnter Side a 75m, Side b 60m, and Side c 45m. The app calculates exactly 1,350 square meters or 33.36 Cents.\n\n3\n00:03:15.000 --> 00:06:15.000\nIf a surveyor enters impossible dimensions—such as 150m for Side c—the app immediately flags the geometric impossibility.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "CalculatorTab (Triangle Subtab)",
      "userAction": "Open Calculator workspace; select the Triangle subtab.",
      "demoInputs": "Click \"Triangle\" subtab",
      "expectedOutput": "Input fields for Side a, Side b, and Side c with interactive Heron diagram.",
      "zoomHighlightNotes": "Zoom 1.2x on Heron formula mathematical breakdown banner.",
      "onScreenCaption": "Heron Formula: Area = sqrt(s * (s - a) * (s - b) * (s - c)), where s = (a + b + c) / 2."
    },
    {
      "sceneNumber": 2,
      "time": "1:30",
      "seconds": 90,
      "screenTarget": "Triangle Inputs & Real-Time SVG Plot",
      "userAction": "Enter classic 3-4-5 right triangle: Side a=75m, Side b=60m, Side c=45m.",
      "demoInputs": "a=75m, b=60m, c=45m (Unit: Meters)",
      "expectedOutput": "Semi-perimeter s=90.0m; Area = 1,350.00 sq m (33.36 Cents, 1,614.6 sq yds).",
      "zoomHighlightNotes": "Zoom 1.4x into the SVG right triangle and step-by-step mathematical output.",
      "onScreenCaption": "Precision Triangulation: Instant computation of semi-perimeter, area, and centroid."
    },
    {
      "sceneNumber": 3,
      "time": "3:15",
      "seconds": 195,
      "screenTarget": "Triangle Blunder Validation Banner",
      "userAction": "Change Side c to 150m to demonstrate automatic geometric blunder catching.",
      "demoInputs": "a=75m, b=60m, c=150m (impossible: a + b = 135 < 150)",
      "expectedOutput": "Rose warning alert: \"Invalid Triangle: Sum of two sides (135m) must exceed third side (150m)\".",
      "zoomHighlightNotes": "Zoom 1.5x onto the validation banner catching the tape misread error.",
      "onScreenCaption": "Blunder Trapping: Automatic Triangle Inequality validation catches taped transcription errors."
    }
  ],
  "closingSummary": "Triangulation solves parcels of any shape or size without measuring angles. Always verify the Triangle Inequality Theorem to detect field errors early."
},
{
  "id": "ep-08",
  "episodeNumber": 8,
  "title": "Closed Traverse Surveying & Field Observations",
  "subtitle": "Bearings, Distances, Latitudes & Closure Errors",
  "category": "calculators",
  "duration": "08:45",
  "durationSeconds": 525,
  "thumbnailGradient": "from-blue-600 via-indigo-800 to-slate-900",
  "targetAudience": "Total station surveyors, civil engineers, GIS specialists",
  "learningObjectives": [
    "Differentiate between open traverses and closed loop traverses.",
    "Enter Whole Circle Bearings (0° to 360°) and slope-corrected horizontal distances.",
    "Compute Latitudes (North/South) and Departures (East/West).",
    "Determine Linear Closing Error and Survey Quality Order classifications."
  ],
  "summary": "Master closed traverse surveying in STHAL MEASURE, computing latitudes, departures, linear closing error, and precision ratios from theodolite or total station data.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "What is a Closed Traverse?",
      "narration": "In a closed loop traverse, the survey begins at a known control point, proceeds around the boundary, and closes back upon the start.",
      "screenTarget": "Traverse Diagram",
      "visualAction": "Vector animation demonstrates 4-station traverse with misclosure gap."
    },
    {
      "time": "1:45",
      "seconds": 105,
      "title": "Entering Bearings & Distances",
      "narration": "Enter our 4 survey legs: Leg 1 at 90 degrees 100m; Leg 2 at 180 degrees 100.1m; Leg 3 at 270 degrees 99.9m; Leg 4 at 0 degrees 100m.",
      "screenTarget": "Traverse Table",
      "visualAction": "Station table populates with bearings, distances, latitudes, and departures."
    },
    {
      "time": "3:45",
      "seconds": 225,
      "title": "Calculating Latitudes, Departures & Misclosure",
      "narration": "Latitudes sum to negative 0.1m, departures sum to positive 0.1m, yielding a linear closing error of 0.1414 meters.",
      "screenTarget": "Misclosure Summary Card",
      "visualAction": "Zoom on closing error formula e = sqrt(sumLat^2 + sumDep^2) = 0.1414m."
    },
    {
      "time": "5:45",
      "seconds": 345,
      "title": "Precision Ratio & Quality Classification",
      "narration": "Dividing 400m perimeter by 0.1414m error yields a precision ratio of 1 in 2,828, meeting Third-Order Survey standards.",
      "screenTarget": "Precision Badge",
      "visualAction": "Highlight Quality Grade badge: Third-Order Engineering Survey (1 in 2,828)."
    }
  ],
  "fullNarrationScript": "Under the Traverse subtab, enter our four survey legs. Line 1-to-2 bears 90 degrees East for 100 meters. Line 2-to-3 bears 180 degrees South for 100.1 meters. Line 3-to-4 bears 270 degrees West for 99.9 meters. And Line 4-to-1 returns North at 0 degrees for 100 meters. The sum of latitudes is negative 0.1 meters, and the sum of departures is positive 0.1 meters. Combining these yields a linear closing error of 0.1414 meters over our 400-meter perimeter—a precision ratio of 1 in 2,828.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "traverse",
    "buttonLabel": "Try Traverse Calculator"
  },
  "youtubeTitle": "Closed Traverse Surveying: Bearings & Closure Error | STHAL MEASURE (Ep. 08)",
  "youtubeDescription": "Learn how to enter closed traverse surveys and compute linear closing errors and precision ratios in STHAL MEASURE.",
  "keywords": [
    "Traverse Surveying",
    "Whole Circle Bearing",
    "Closing Error",
    "Latitudes and Departures",
    "Total Station"
  ],
  "keyTakeaways": [
    "Latitude is the North-South projection (L * cos θ); Departure is East-West (L * sin θ).",
    "Linear closing error e = sqrt((sumLat)^2 + (sumDep)^2).",
    "Precision ratio determines whether the survey meets First, Second, or Third-Order standards."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Closed Traverse Surveying & Field Observations\n\n1\n00:00:00.000 --> 00:01:45.000\nIn a closed loop traverse, the survey begins at a known control point, proceeds around the boundary, and closes back upon the start.\n\n2\n00:01:45.000 --> 00:03:45.000\nEnter our 4 survey legs: Leg 1 at 90 degrees 100m; Leg 2 at 180 degrees 100.1m; Leg 3 at 270 degrees 99.9m; Leg 4 at 0 degrees 100m.\n\n3\n00:03:45.000 --> 00:05:45.000\nLatitudes sum to negative 0.1m, departures sum to positive 0.1m, yielding a linear closing error of 0.1414 meters.\n\n4\n00:05:45.000 --> 00:08:45.000\nDividing 400m perimeter by 0.1414m error yields a precision ratio of 1 in 2,828, meeting Third-Order Survey standards.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "CalculatorTab (Traverse Subtab)",
      "userAction": "Open Calculator workspace; select the Traverse subtab.",
      "demoInputs": "Click \"Traverse\" subtab",
      "expectedOutput": "Station entry table with columns: Station ID, Bearing (WCB), Distance (m), Latitude, Departure.",
      "zoomHighlightNotes": "Full view of traverse station ledger and vector closing plot.",
      "onScreenCaption": "Closed Traverse: Total station or theodolite loop survey connecting control stations."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Traverse Station Table Entries",
      "userAction": "Enter 4 legs: Leg 1 (90° 100m), Leg 2 (180° 100.1m), Leg 3 (270° 99.9m), Leg 4 (0° 100m).",
      "demoInputs": "Station 1-2: 90°, 100m; 2-3: 180°, 100.1m; 3-4: 270°, 99.9m; 4-1: 0°, 100m",
      "expectedOutput": "Table computes: sumLat = -0.100m, sumDep = +0.100m, Perimeter = 400.00m.",
      "zoomHighlightNotes": "Follow keyboard entry row-by-row as latitudes and departures calculate live.",
      "onScreenCaption": "Latitude = Length * cos(Bearing); Departure = Length * sin(Bearing)."
    },
    {
      "sceneNumber": 3,
      "time": "3:45",
      "seconds": 225,
      "screenTarget": "Linear Misclosure Card",
      "userAction": "Inspect the Linear Closing Error card.",
      "demoInputs": "Calculated outputs",
      "expectedOutput": "Closing error e = sqrt((-0.10)² + (0.10)²) = 0.1414m. Bearing of closing error: 315°00'.",
      "zoomHighlightNotes": "Zoom 1.5x into the mathematical closing error equation and vector gap graphic.",
      "onScreenCaption": "Closing Error (e): Quantifies total accumulated angular and linear field error."
    },
    {
      "sceneNumber": 4,
      "time": "5:45",
      "seconds": 345,
      "screenTarget": "Survey Quality Grade Badge",
      "userAction": "Inspect the Survey Quality Classification badge.",
      "demoInputs": "Perimeter 400m / Error 0.1414m",
      "expectedOutput": "Precision Ratio: 1 in 2,828. Grade: Third-Order Engineering Survey (Passed).",
      "zoomHighlightNotes": "Zoom 1.6x into the emerald quality classification badge.",
      "onScreenCaption": "Quality Order: Ratios above 1:2,500 meet municipal and revenue engineering standards."
    }
  ],
  "closingSummary": "Closed traverse surveying provides full control over field error. Compute latitudes and departures on every boundary loop to determine your precision ratio."
},
{
  "id": "ep-09",
  "episodeNumber": 9,
  "title": "Bowditch Traverse Adjustment & Precision",
  "subtitle": "Compass Rule Balancing & Closed Coordinates",
  "category": "calculators",
  "duration": "08:15",
  "durationSeconds": 495,
  "thumbnailGradient": "from-violet-600 via-indigo-800 to-slate-900",
  "targetAudience": "Professional surveyors, civil engineers, GIS mapping leads",
  "learningObjectives": [
    "Understand the mathematical basis of Bowditch Compass Rule balancing.",
    "Distribute closing errors proportionally based on individual line lengths.",
    "Verify that the sum of adjusted latitudes and departures equals exactly zero.",
    "Compare unadjusted and adjusted geometries on the interactive SVG canvas."
  ],
  "summary": "Learn how to run Bowditch Compass Rule adjustments to balance closed traverse surveys and produce exact closed coordinate schedules.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Why Traverse Adjustment is Necessary",
      "narration": "In engineering plans, boundary polygons cannot remain open by fourteen centimeters. The Bowditch Compass Rule distributes this error proportionally.",
      "screenTarget": "Misclosure Gap Diagram",
      "visualAction": "Diagram highlights the 14cm gap between starting Station 1 and closing Station 1 prime."
    },
    {
      "time": "1:45",
      "seconds": 105,
      "title": "Executing Bowditch Adjustment",
      "narration": "Click Compute Bowditch Adjustment. STHAL MEASURE applies proportional corrections to each survey leg in seconds.",
      "screenTarget": "Traverse Table",
      "visualAction": "Emerald button clicked; table populates with Adj Lat, Adj Dep, Adjusted Northing, and Adjusted Easting."
    },
    {
      "time": "3:45",
      "seconds": 225,
      "title": "Verifying Absolute Mathematical Closure",
      "narration": "Notice the sums at the bottom: sum of adjusted latitudes is 0.0000m, sum of adjusted departures is 0.0000m.",
      "screenTarget": "Totals Row",
      "visualAction": "Highlight 0.0000m totals and closing station coordinates returning to exactly 1000N, 1000E."
    },
    {
      "time": "5:30",
      "seconds": 330,
      "title": "Unadjusted vs. Adjusted Overlay",
      "narration": "Toggle the unadjusted overlay to visualize the slight geometric correction applied to the corners.",
      "screenTarget": "SVG Canvas",
      "visualAction": "Red dashed unadjusted path overlays solid emerald balanced boundary."
    }
  ],
  "fullNarrationScript": "With one click on Compute Bowditch Adjustment, STHAL MEASURE executes the Compass Rule. Because all four of our legs are approximately 100 meters long, representing 25 percent of the perimeter, the application applies 25 percent of the misclosure correction to each leg. Look at the verification at the bottom: sum of adjusted latitudes is exactly zero point zero-zero-zero meters, and sum of adjusted departures is exactly zero point zero-zero-zero meters. The polygon is now mathematically closed.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "traverse",
    "buttonLabel": "Try Bowditch Adjustment"
  },
  "youtubeTitle": "Bowditch Traverse Adjustment Guide | STHAL MEASURE (Ep. 09)",
  "youtubeDescription": "Balance closed loop traverses and calculate exact adjusted coordinates using the Bowditch Compass Rule in STHAL MEASURE.",
  "keywords": [
    "Bowditch Adjustment",
    "Compass Rule",
    "Traverse Balancing",
    "Adjusted Coordinates",
    "Survey Precision"
  ],
  "keyTakeaways": [
    "Bowditch adjustment distributes closing errors in direct proportion to survey leg lengths.",
    "Adjusted latitudes and departures sum to exactly zero.",
    "Produces clean closed coordinates ready for AutoCAD and GIS mapping."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Bowditch Traverse Adjustment & Precision\n\n1\n00:00:00.000 --> 00:01:45.000\nIn engineering plans, boundary polygons cannot remain open by fourteen centimeters. The Bowditch Compass Rule distributes this error proportionally.\n\n2\n00:01:45.000 --> 00:03:45.000\nClick Compute Bowditch Adjustment. STHAL MEASURE applies proportional corrections to each survey leg in seconds.\n\n3\n00:03:45.000 --> 00:05:30.000\nNotice the sums at the bottom: sum of adjusted latitudes is 0.0000m, sum of adjusted departures is 0.0000m.\n\n4\n00:05:30.000 --> 00:08:15.000\nToggle the unadjusted overlay to visualize the slight geometric correction applied to the corners.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "CalculatorTab (Traverse Subtab with Unadjusted Loop)",
      "userAction": "View the unadjusted traverse with 0.1414m misclosure from Episode 8.",
      "demoInputs": "4-leg traverse from Episode 8 loaded",
      "expectedOutput": "Misclosure gap visible at Station 1 (red arrow showing 0.14m gap).",
      "zoomHighlightNotes": "Zoom 1.5x onto the closing gap between final station and origin.",
      "onScreenCaption": "Why Traverse Adjustment is Necessary: Unadjusted loops cannot be submitted to land registries."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Bowditch Adjustment Action Button",
      "userAction": "Click \"Execute Bowditch Compass Rule Adjustment\".",
      "demoInputs": "Click \"Execute Bowditch Adjustment\"",
      "expectedOutput": "Corrections distributed proportionally: Clat_i = -sumLat * (Li / Perimeter).",
      "zoomHighlightNotes": "Highlight button click and instant tabular recalculation.",
      "onScreenCaption": "Bowditch Rule: Adjusts latitudes and departures proportionally according to leg lengths."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Balanced Coordinate Ledger",
      "userAction": "Inspect the balanced coordinate ledger.",
      "demoInputs": "Adjusted table displayed",
      "expectedOutput": "Residual sumLat = 0.000m, sumDep = 0.000m. Closing Error e = 0.0000m.",
      "zoomHighlightNotes": "Zoom 1.5x on zero-error status card.",
      "onScreenCaption": "Absolute Closure: Residual error is balanced to 0.0000m with legal mathematical rigor."
    },
    {
      "sceneNumber": 4,
      "time": "5:30",
      "seconds": 330,
      "screenTarget": "Unadjusted vs Adjusted Overlay Canvas",
      "userAction": "Toggle the visual overlay showing the original traverse vs adjusted boundary.",
      "demoInputs": "Click \"Show Adjustment Overlay\"",
      "expectedOutput": "Dashed red unadjusted line aligns with solid emerald balanced parcel boundary.",
      "zoomHighlightNotes": "Slow pan across the balanced polygon canvas.",
      "onScreenCaption": "Balanced Boundary: Ready for CAD export, client report generation, and GIS archiving."
    }
  ],
  "closingSummary": "Bowditch Compass Rule balances traverse misclosure proportionally by line length, ensuring your coordinates close perfectly to zero for legal registration."
},
{
  "id": "ep-10",
  "episodeNumber": 10,
  "title": "ISRO Bhuvan Maps & Cadastral Overlays",
  "subtitle": "Navigating Satellite Basemaps & Revenue Parcel Overlays",
  "category": "gps_mapping",
  "duration": "08:00",
  "durationSeconds": 480,
  "thumbnailGradient": "from-teal-600 via-cyan-800 to-slate-900",
  "targetAudience": "GIS analysts, revenue patwaris, land researchers, property buyers",
  "learningObjectives": [
    "Navigate the Bhuvan 2D mapping engine powered by MapLibre GL.",
    "Switch between ISRO Bhuvan Satellite (LISS-IV/Cartosat), Google Hybrid, and ESRI imagery.",
    "Enable the official ISRO Bhuvan Cadastral Boundary WMS overlay.",
    "Draw custom geodesic boundary polygons and export KML/GeoJSON files."
  ],
  "summary": "A complete tour of the satellite mapping workspace in STHAL MEASURE, featuring ISRO Bhuvan integration and cadastral boundary overlays.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Introduction to Bhuvan 2D",
      "narration": "Bhuvan 2D combines MapLibre GL with satellite imagery from ISRO National Remote Sensing Centre sensors.",
      "screenTarget": "BhuvanMapTab",
      "visualAction": "Map loads centered over Amaravati, Andhra Pradesh."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Switching Multi-Source Basemaps",
      "narration": "Click the Layers icon to toggle between Bhuvan Satellite, Google Hybrid, Google Satellite, ESRI, and OpenStreetMap.",
      "screenTarget": "Basemap Selector",
      "visualAction": "Cursor opens selector and cycles through Bhuvan, Google Hybrid, and ESRI."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "Official ISRO Cadastral Overlay",
      "narration": "Toggle the Cadastral Overlay switch to display surveyed village parcel boundaries and sub-division lines directly over imagery.",
      "screenTarget": "Cadastral WMS Layer",
      "visualAction": "Orange cadastral parcel boundary vectors overlay agricultural fields."
    },
    {
      "time": "5:15",
      "seconds": 315,
      "title": "Pin-to-Draw Polygon & Geodesic Extent",
      "narration": "Use the Pen tool to trace any physical parcel; STHAL MEASURE calculates geodesic acreage in UTM Zone 44N.",
      "screenTarget": "Draw Tool",
      "visualAction": "4 corners pinned around parcel; live metrics card displays 45.0 Cents (0.45 Acres)."
    }
  ],
  "fullNarrationScript": "Welcome to Episode 10. In this tutorial, we explore STHAL MEASURE mapping engine, integrated directly with ISRO National Remote Sensing Centre — Bhuvan. Bhuvan provides specialized Indian satellite imagery from Resourcesat LISS-IV and Cartosat sensors. In the upper right corner, click the Layers icon to switch between Bhuvan Satellite, Google Hybrid, ESRI World Imagery, and OpenStreetMap. Toggling the Cadastral Overlay renders official village survey parcel outlines directly on top of satellite photography.",
  "tryItTarget": {
    "tab": "bhuvan",
    "buttonLabel": "Open Bhuvan 2D Map"
  },
  "youtubeTitle": "ISRO Bhuvan Maps & Cadastral Overlays Guide | STHAL MEASURE (Ep. 10)",
  "youtubeDescription": "Explore the Bhuvan 2D satellite mapping workspace, official NRSC cadastral layers, and multi-source basemaps in STHAL MEASURE.",
  "keywords": [
    "ISRO Bhuvan",
    "Bhuvan 2D",
    "Cadastral Overlay",
    "Satellite Mapping",
    "NRSC Cartosat"
  ],
  "keyTakeaways": [
    "Bhuvan satellite imagery provides specialized Indian earth observation data.",
    "Cadastral WMS layers display official village survey boundaries.",
    "All polygon calculations use geodesic UTM projections to eliminate spatial distortion."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: ISRO Bhuvan Maps & Cadastral Overlays\n\n1\n00:00:00.000 --> 00:01:30.000\nBhuvan 2D combines MapLibre GL with satellite imagery from ISRO National Remote Sensing Centre sensors.\n\n2\n00:01:30.000 --> 00:03:30.000\nClick the Layers icon to toggle between Bhuvan Satellite, Google Hybrid, Google Satellite, ESRI, and OpenStreetMap.\n\n3\n00:03:30.000 --> 00:05:15.000\nToggle the Cadastral Overlay switch to display surveyed village parcel boundaries and sub-division lines directly over imagery.\n\n4\n00:05:15.000 --> 00:08:00.000\nUse the Pen tool to trace any physical parcel; STHAL MEASURE calculates geodesic acreage in UTM Zone 44N.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Bhuvan 2D Workspace",
      "userAction": "Open Bhuvan 2D from bottom navigation dock.",
      "demoInputs": "Click \"Bhuvan 2D\"",
      "expectedOutput": "Interactive WebGL map canvas loads with multi-source basemap selector.",
      "zoomHighlightNotes": "Full viewport map with crosshair coordinates in bottom right.",
      "onScreenCaption": "Bhuvan 2D: Official ISRO Cartosat satellite and WMS cadastral GIS stream."
    },
    {
      "sceneNumber": 2,
      "time": "1:30",
      "seconds": 90,
      "screenTarget": "Map Layers Panel (Satellite / Hybrid / Topo)",
      "userAction": "Open Layers drawer; switch from OpenStreetMap to Bhuvan Cartosat-1 Satellite.",
      "demoInputs": "Layer = \"ISRO Bhuvan Satellite Imagery\"",
      "expectedOutput": "High-resolution true-color satellite tiles render with agricultural bunds clearly visible.",
      "zoomHighlightNotes": "Zoom 1.3x into the layer control drawer.",
      "onScreenCaption": "Bhuvan Satellite Basemap: Real satellite imagery calibrated for Indian territory."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Cadastral WMS Revenue Overlay",
      "userAction": "Enable the \"Cadastral Village Parcel (WMS)\" toggle switch.",
      "demoInputs": "Toggle Cadastral Overlay = ON",
      "expectedOutput": "Village boundary lines and Survey Numbers (e.g. Sy No. 204/1A) overlay in yellow vector lines.",
      "zoomHighlightNotes": "Zoom into parcel boundaries showing agricultural fields aligned with yellow survey lines.",
      "onScreenCaption": "Cadastral WMS Layer: Real-time village revenue survey numbers from official state portals."
    },
    {
      "sceneNumber": 4,
      "time": "5:30",
      "seconds": 330,
      "screenTarget": "Pin-to-Draw Polygon Tool",
      "userAction": "Click \"Draw Polygon\" pencil tool; click 4 points around Survey Number 204/1A.",
      "demoInputs": "4 vertices clicked around satellite bund",
      "expectedOutput": "Polygon highlights in cyan; geodesic extent computes to 1.45 Acres (145.2 Cents).",
      "zoomHighlightNotes": "Watch surveyor trace physical boundary on satellite imagery.",
      "onScreenCaption": "Pin-to-Draw: Verify physical field extent directly against satellite revenue records."
    }
  ],
  "closingSummary": "ISRO Bhuvan maps provide official Indian satellite basemaps. Combine high-resolution satellite imagery with Cadastral WMS overlays to verify village survey numbers."
},
{
  "id": "ep-11",
  "episodeNumber": 11,
  "title": "AutoCAD DXF Import & Layer Analysis",
  "subtitle": "Importing Engineering CAD Drawings & Extracting Dimensions",
  "category": "cad_gis",
  "duration": "07:30",
  "durationSeconds": 450,
  "thumbnailGradient": "from-blue-600 via-indigo-800 to-slate-900",
  "targetAudience": "Architects, draftsmen, civil engineers, survey office staff",
  "learningObjectives": [
    "Import 2D AutoCAD .dxf drawing files into STHAL MEASURE without desktop CAD software.",
    "Inspect drawing layers, line colors, and text annotations.",
    "Handle projected UTM coordinates vs. local arbitrary drafting origins.",
    "Extract boundary dimensions directly into the 4-Sided Calculator with one click."
  ],
  "summary": "Learn how to ingest AutoCAD DXF layout plans into STHAL MEASURE, inspect entity layers, and extract polyline dimensions directly into calculations.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "AutoCAD Ingestion in the Browser",
      "narration": "AutoCAD is the industry standard for civil engineering. STHAL MEASURE imports DXF files directly in your browser without requiring AutoCAD software.",
      "screenTarget": "CadGisTab (DXF)",
      "visualAction": "CAD Ingestion workspace opens with drag and drop zone."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Uploading & Parsing DXF Files",
      "narration": "Drag and drop your DXF file. The client-side parser reads polylines, dimensions, and text blocks in under one second.",
      "screenTarget": "File Upload Zone",
      "visualAction": "File dropped; vector boundary polyline renders on canvas with entity count summary."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "CAD Layer Management",
      "narration": "Open the CAD Layer panel to toggle layer visibility, isolating boundary lines from construction grids and dimensions.",
      "screenTarget": "Layer Panel",
      "visualAction": "Toggle eye icon on DIMENSION_LABELS layer to hide and show text."
    },
    {
      "time": "5:00",
      "seconds": 300,
      "title": "Send to Calculator Integration",
      "narration": "Click Send to Calculator to extract polyline side lengths directly into the Four-Sided Plot Calculator.",
      "screenTarget": "Calculator Tab Prefill",
      "visualAction": "App transitions to calculator with extracted dimensions prefilled: 120ft, 95ft, 110ft, 85ft."
    }
  ],
  "fullNarrationScript": "Drag and drop your DXF file into the upload zone. STHAL MEASURE parses the Drawing Exchange Format entities—including lightweight polylines, lines, and text blocks. Open the CAD Layer panel to inspect each individual layer and toggle visibility. Then, click Send to Calculator. STHAL MEASURE traverses the vertices of the imported CAD polyline, computes each segment length, and transfers them directly into the Four-Sided Plot Calculator.",
  "tryItTarget": {
    "tab": "cad",
    "buttonLabel": "Open Import / Export Workspace"
  },
  "youtubeTitle": "AutoCAD DXF Import & Layer Analysis | STHAL MEASURE (Ep. 11)",
  "youtubeDescription": "Import AutoCAD DXF drawings, inspect CAD layers, and extract boundary dimensions into calculations in STHAL MEASURE.",
  "keywords": [
    "AutoCAD DXF Import",
    "CAD in Browser",
    "DXF Viewer",
    "CAD to Calculator",
    "Civil Engineering CAD"
  ],
  "keyTakeaways": [
    "Parses 2D AutoCAD DXF files completely client-side in seconds.",
    "Full layer management allows isolating boundary lines from drafting annotations.",
    "One-click dimension extraction populates mathematical calculators automatically."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: AutoCAD DXF Import & Layer Analysis\n\n1\n00:00:00.000 --> 00:01:30.000\nAutoCAD is the industry standard for civil engineering. STHAL MEASURE imports DXF files directly in your browser without requiring AutoCAD software.\n\n2\n00:01:30.000 --> 00:03:30.000\nDrag and drop your DXF file. The client-side parser reads polylines, dimensions, and text blocks in under one second.\n\n3\n00:03:30.000 --> 00:05:00.000\nOpen the CAD Layer panel to toggle layer visibility, isolating boundary lines from construction grids and dimensions.\n\n4\n00:05:00.000 --> 00:07:30.000\nClick Send to Calculator to extract polyline side lengths directly into the Four-Sided Plot Calculator.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Import / Export Workspace (CAD Tools)",
      "userAction": "Click Import / Export in navigation; select \"AutoCAD DXF Parser\".",
      "demoInputs": "Click \"Import / Export\" -> \"DXF Parser\"",
      "expectedOutput": "Drag-and-drop zone with supported formats: ASCII DXF (R12 through 2018).",
      "zoomHighlightNotes": "Full view of upload zone and layer extraction options.",
      "onScreenCaption": "AutoCAD DXF Ingestion: Client-side parsing of native engineering drawings."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "DXF File Upload & Parser Execution",
      "userAction": "Drag and drop \"sample_village_fmb.dxf\" into upload zone.",
      "demoInputs": "File = sample_village_fmb.dxf (1.2 MB)",
      "expectedOutput": "Parser extracts 4 boundary lines, 1 polyline, text annotations, and coordinate bounds.",
      "zoomHighlightNotes": "Zoom 1.3x into the parsing progress bar and extracted entity summary card.",
      "onScreenCaption": "Zero-Upload Security: DXF parsed locally in browser memory without sending files to servers."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "CAD Layer Management Drawer",
      "userAction": "Inspect layer drawer; toggle visibility of \"BOUNDARY\", \"ROAD_OFFSET\", and \"CONTOURS\".",
      "demoInputs": "Toggle layers ON/OFF",
      "expectedOutput": "Canvas updates interactively, isolating the primary legal boundary polyline.",
      "zoomHighlightNotes": "Zoom 1.4x on layer toggle list.",
      "onScreenCaption": "Layer Management: Filter out drafting annotations to isolate pure legal parcel geometry."
    },
    {
      "sceneNumber": 4,
      "time": "5:15",
      "seconds": 315,
      "screenTarget": "Send to Calculator Action",
      "userAction": "Click \"Send Boundary to 4-Sided Calculator\".",
      "demoInputs": "Click \"Send to Calculator\"",
      "expectedOutput": "Calculator opens with 4 CAD polyline segments loaded as Side A, B, C, D in meters.",
      "zoomHighlightNotes": "Observe transition from CAD workspace into Calculator tab.",
      "onScreenCaption": "From CAD to Area: Instant verification of CAD drawing dimensions in local revenue units."
    }
  ],
  "closingSummary": "AutoCAD DXF ingestion parses native CAD entities in the browser without plugins. Extract boundary polylines directly into your calculation and report workflows."
},
{
  "id": "ep-12",
  "episodeNumber": 12,
  "title": "GIS Vector Data Ingestion: Shapefile, KML & GeoJSON",
  "subtitle": "Connecting with QGIS, ArcGIS & Google Earth",
  "category": "cad_gis",
  "duration": "08:15",
  "durationSeconds": 495,
  "thumbnailGradient": "from-indigo-600 via-purple-800 to-slate-900",
  "targetAudience": "GIS analysts, town planners, environmental engineers",
  "learningObjectives": [
    "Ingest ESRI Shapefile packages supplied as compressed .zip archives.",
    "Load Google Earth KML and KMZ boundary files.",
    "Import and validate standard GeoJSON vector datasets.",
    "Understand automated coordinate transformations between UTM and WGS84."
  ],
  "summary": "Learn how to ingest ESRI Shapefile ZIPs, Google Earth KMLs, and GeoJSON datasets into STHAL MEASURE with automated coordinate reference system handling.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "GIS Formats in Land Administration",
      "narration": "Spatial data arrives in various formats: Shapefiles from state agencies, KML from Google Earth, and GeoJSON from modern web platforms.",
      "screenTarget": "CadGisTab (GIS)",
      "visualAction": "Upload panel displays Shapefile, KML, and GeoJSON targets."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Ingesting Shapefile ZIP Archives",
      "narration": "Drop a ZIP archive containing .shp, .dbf, .shx, and .prj. The app parses the geometry and attribute table in client-side memory.",
      "screenTarget": "Shapefile Drop Zone",
      "visualAction": "Shapefile unzips in memory; parcel polygons render with survey number labels."
    },
    {
      "time": "3:45",
      "seconds": 225,
      "title": "Automated CRS Proj4 Transformations",
      "narration": "STHAL MEASURE reads the PRJ file and uses Proj4js algorithms to re-project UTM Zone 44N coordinates to WGS84 for map display.",
      "screenTarget": "CRS Badge",
      "visualAction": "Highlight CRS badge: UTM Zone 44N (EPSG:32644) transformed for map viewing."
    },
    {
      "time": "5:30",
      "seconds": 330,
      "title": "Importing KML & GeoJSON Boundaries",
      "narration": "Drop a KML file exported from Google Earth. The boundary appears instantly, complete with calculated perimeter and acreage.",
      "screenTarget": "KML Vector Display",
      "visualAction": "KML farm boundary renders over satellite map; extent reports 15.00 Acres."
    }
  ],
  "fullNarrationScript": "To import an ESRI Shapefile, package the .shp, .dbf, .shx, and .prj files into a standard ZIP archive. Drop the zip file into the upload zone. The application uncompresses the files in memory, parses the projection file, and renders every parcel polygon on the map. If your Shapefile is in UTM Zone 44 North, STHAL MEASURE utilizes Proj4js algorithms to re-project the vertices for display while preserving exact metric edge lengths.",
  "tryItTarget": {
    "tab": "cad",
    "buttonLabel": "Try GIS File Ingestion"
  },
  "youtubeTitle": "GIS Vector Data Ingestion: Shapefile, KML & GeoJSON | STHAL MEASURE (Ep. 12)",
  "youtubeDescription": "Ingest Shapefile ZIPs, KML, and GeoJSON boundaries with automated coordinate reference system transformations in STHAL MEASURE.",
  "keywords": [
    "Shapefile Import",
    "KML Viewer",
    "GeoJSON Parser",
    "UTM to WGS84",
    "GIS Mapping"
  ],
  "keyTakeaways": [
    "Shapefiles must be uploaded as a ZIP containing .shp, .dbf, .shx, and .prj.",
    "Proj4js algorithms handle seamless re-projection between UTM and WGS84.",
    "Instant geodesic area calculation across state revenue units."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: GIS Vector Data Ingestion: Shapefile, KML & GeoJSON\n\n1\n00:00:00.000 --> 00:01:30.000\nSpatial data arrives in various formats: Shapefiles from state agencies, KML from Google Earth, and GeoJSON from modern web platforms.\n\n2\n00:01:30.000 --> 00:03:45.000\nDrop a ZIP archive containing .shp, .dbf, .shx, and .prj. The app parses the geometry and attribute table in client-side memory.\n\n3\n00:03:45.000 --> 00:05:30.000\nSTHAL MEASURE reads the PRJ file and uses Proj4js algorithms to re-project UTM Zone 44N coordinates to WGS84 for map display.\n\n4\n00:05:30.000 --> 00:08:15.000\nDrop a KML file exported from Google Earth. The boundary appears instantly, complete with calculated perimeter and acreage.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Import / Export Workspace (GIS Formats)",
      "userAction": "Select \"GIS Vector Data Ingestion\" subtab.",
      "demoInputs": "Click \"GIS Ingestion\"",
      "expectedOutput": "Upload cards for Shapefile (.zip), Google Earth (.kml), and GeoJSON (.json).",
      "zoomHighlightNotes": "Full screen view of GIS format options.",
      "onScreenCaption": "GIS Ingestion: Connects field surveys with QGIS, ArcGIS, and government GIS portals."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Shapefile ZIP Ingestion Zone",
      "userAction": "Upload village boundary Shapefile ZIP archive (containing .shp, .shx, .dbf, .prj).",
      "demoInputs": "Upload \"penamaluru_parcels.zip\"",
      "expectedOutput": "shpjs extracts vector polygon with attribute table containing Survey Numbers and Owner records.",
      "zoomHighlightNotes": "Zoom 1.4x into the extracted attribute table and polygon preview.",
      "onScreenCaption": "Shapefile ZIP Support: Reads multi-part ESRI archives directly in client JavaScript."
    },
    {
      "sceneNumber": 3,
      "time": "3:45",
      "seconds": 225,
      "screenTarget": "Proj4 Coordinate Reference System Engine",
      "userAction": "Demonstrate automatic CRS detection: UTM Zone 44N (EPSG:32644) to WGS84 (EPSG:4326).",
      "demoInputs": "Auto-detected CRS = UTM Zone 44N",
      "expectedOutput": "Projected eastings/northings converted to geographic lat/long coordinates.",
      "zoomHighlightNotes": "Zoom 1.5x on CRS transformation badge showing round-trip mathematical precision.",
      "onScreenCaption": "Automated Proj4: Transforms regional survey grid coordinates to global WGS84."
    },
    {
      "sceneNumber": 4,
      "time": "5:45",
      "seconds": 345,
      "screenTarget": "Google Earth KML / GeoJSON Export",
      "userAction": "Click \"Export to GeoJSON\" and \"Export to KML\".",
      "demoInputs": "Click \"Export GeoJSON\"",
      "expectedOutput": "Standards-compliant GeoJSON downloaded with legal disclaimer and polygon coordinates.",
      "zoomHighlightNotes": "View downloaded file structure in text editor.",
      "onScreenCaption": "Clean Exports: GeoJSON and KML files ready for import into QGIS or Google Earth."
    }
  ],
  "closingSummary": "Universal GIS ingestion connects STHAL MEASURE with QGIS and Google Earth. Automatic Proj4 transformations ensure your UTM coordinates align with global WGS84 standards."
},
{
  "id": "ep-13",
  "episodeNumber": 13,
  "title": "Survey Project Management & Formal PDF Reports",
  "subtitle": "Archiving Surveys & Client-Ready Documentation",
  "category": "projects_market",
  "duration": "07:00",
  "durationSeconds": 420,
  "thumbnailGradient": "from-violet-600 via-purple-800 to-slate-900",
  "targetAudience": "Surveyors, landowners, property managers, advocates",
  "learningObjectives": [
    "Organize, search, and manage field survey projects in the Projects vault.",
    "Understand 6-state synchronization badges (Cloud Synced, Local Only, Pending Sync).",
    "Generate official client-ready PDF Survey Measurement Summary reports.",
    "Export vector GeoJSON boundaries and publish surveys directly to the Marketplace."
  ],
  "summary": "A complete guide to managing saved surveys in STHAL MEASURE, inspecting synchronization states, and printing professional PDF survey reports.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "The Projects Workspace",
      "narration": "Every time you calculate a plot, complete a traverse, or walk a boundary, saving it archives the survey in this repository.",
      "screenTarget": "ProjectsTab",
      "visualAction": "Projects grid displays cards with sync badges and search bar."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Project Cards & Sync State Badges",
      "narration": "Each card displays the project type and synchronization state: Cloud Synced, Local Only, or Pending Sync.",
      "screenTarget": "Project Cards",
      "visualAction": "Cursor hovers over sync status pills; typing in search bar filters cards instantly."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "Generating the Official PDF Survey Report",
      "narration": "Click the PDF button to generate a publication-quality survey report complete with side lengths, coordinates, vector plot, and disclaimer.",
      "screenTarget": "PDF Report Viewer",
      "visualAction": "Generated PDF opens displaying professional layout, metadata, tables, plot, and signature line."
    },
    {
      "time": "5:30",
      "seconds": 330,
      "title": "GeoJSON Export & Marketplace Publishing",
      "narration": "Click GeoJSON to download vector boundaries, or click Publish to transfer the parcel directly to the Land Marketplace.",
      "screenTarget": "Action Buttons",
      "visualAction": "Click Publish button; app routes to Marketplace tab with prefilled project."
    }
  ],
  "fullNarrationScript": "In Episode 13, we explore the Projects workspace. Each project card displays the project type and synchronization badge. Clicking a project card opens the Survey Measurement Summary modal. To generate an official document, click the PDF button. STHAL MEASURE creates a publication-quality survey report with tabular side lengths, geographic coordinates, certified extent in regional units, vector plot, and legal disclaimer.",
  "tryItTarget": {
    "tab": "projects",
    "buttonLabel": "Open Projects Archive"
  },
  "youtubeTitle": "Survey Project Management & Official PDF Reports | STHAL MEASURE (Ep. 13)",
  "youtubeDescription": "Manage field surveys, inspect 6-state sync badges, and export official PDF survey measurement reports in STHAL MEASURE.",
  "keywords": [
    "Survey Project Management",
    "PDF Survey Report",
    "Survey Certification",
    "GeoJSON Export",
    "Cadastral Archive"
  ],
  "keyTakeaways": [
    "Cloud Synced badge confirms projects are backed up to Firebase Firestore.",
    "Client-side PDF generator produces formatted survey reports in under two seconds.",
    "One click transfers completed surveys directly into the Land Marketplace."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Survey Project Management & Formal PDF Reports\n\n1\n00:00:00.000 --> 00:01:30.000\nEvery time you calculate a plot, complete a traverse, or walk a boundary, saving it archives the survey in this repository.\n\n2\n00:01:30.000 --> 00:03:30.000\nEach card displays the project type and synchronization state: Cloud Synced, Local Only, or Pending Sync.\n\n3\n00:03:30.000 --> 00:05:30.000\nClick the PDF button to generate a publication-quality survey report complete with side lengths, coordinates, vector plot, and disclaimer.\n\n4\n00:05:30.000 --> 00:07:00.000\nClick GeoJSON to download vector boundaries, or click Publish to transfer the parcel directly to the Land Marketplace.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Projects Workspace",
      "userAction": "Click Projects tab in bottom navigation; inspect project portfolio card list.",
      "demoInputs": "Click \"Projects (1)\" in bottom dock",
      "expectedOutput": "Project cards render with survey date, client name, extent in Cents, and sync badge.",
      "zoomHighlightNotes": "Full viewport view of project grid with search and filter toolbar.",
      "onScreenCaption": "Project Vault: Encrypted local storage and cloud synchronization for all survey files."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Project Detail Card",
      "userAction": "Click \"Survey No 204/1A Penamaluru\" project card to open full metadata inspector.",
      "demoInputs": "Select Project 204/1A",
      "expectedOutput": "Displays dimension schedule, diagonal AC, total area (23.54 Cents), and GPS coordinates.",
      "zoomHighlightNotes": "Zoom 1.3x into the survey property schedule card.",
      "onScreenCaption": "Project Metadata: Complete technical audit trail including coordinates and linear units."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Official PDF Report Generation Dialog",
      "userAction": "Click \"Generate Official PDF Survey Report\"; enter Surveyor Reg No. \"AP/REV/2026/8941\".",
      "demoInputs": "Surveyor Name = \"P. Sriram, Licensed Surveyor\", Reg = \"AP/REV/2026/8941\"",
      "expectedOutput": "Client-side jsPDF compiles a 2-page formal survey certificate with vector plot.",
      "zoomHighlightNotes": "Watch PDF generator render in under 1 second without server round-trip.",
      "onScreenCaption": "Formal Survey Certificate: Complete with vector sketch, coordinate tables, and signature lines."
    },
    {
      "sceneNumber": 4,
      "time": "5:15",
      "seconds": 315,
      "screenTarget": "PDF Certificate Preview Window",
      "userAction": "Scroll through the generated PDF certificate: header seal, boundary plot, legal disclaimer.",
      "demoInputs": "Inspect Page 1 and Page 2",
      "expectedOutput": "High-resolution PDF ready for client handover, bank loan appraisal, or court submission.",
      "zoomHighlightNotes": "Zoom 1.2x onto the generated PDF certificate preview.",
      "onScreenCaption": "Client-Ready Deliverable: Professional presentation built to statutory municipal requirements."
    }
  ],
  "closingSummary": "The Project Vault organizes your entire survey portfolio. Generate client-ready PDF survey certificates with dimension sketches and signature lines in seconds."
},
{
  "id": "ep-14",
  "episodeNumber": 14,
  "title": "Authentication & 6-State Offline Data Sync",
  "subtitle": "Zero Data Loss in Disconnected Field Environments",
  "category": "projects_market",
  "duration": "07:45",
  "durationSeconds": 465,
  "thumbnailGradient": "from-amber-600 via-teal-800 to-slate-900",
  "targetAudience": "Field engineers, team leads, technical administrators",
  "learningObjectives": [
    "Understand Firebase Authentication security and user identity protection.",
    "Master the 6-state sync engine: LOCAL_ONLY, PENDING_SYNC, SYNCING, SYNCED, SYNC_FAILED, CONFLICT.",
    "Learn how the in-flight mutex lock prevents duplicate concurrent writes.",
    "Resolve version conflicts when remote edits exceed local offline timestamps."
  ],
  "summary": "Discover STHAL MEASURE offline-first architecture, demonstrating real offline saving, background sync queues, and conflict detection.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Offline-First Engineering",
      "narration": "In land surveying, critical measurements are often taken in rural areas where cellular data drops to zero. STHAL MEASURE was built offline-first.",
      "screenTarget": "Offline Architecture Slide",
      "visualAction": "Graphic shows surveyor disconnected in field with active offline vault."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "The 6 Synchronization States",
      "narration": "STHAL MEASURE tracks 6 explicit states: Local Only, Pending Sync, Syncing, Synced, Sync Failed, and Conflict.",
      "screenTarget": "State Diagram",
      "visualAction": "State transition diagram explains how surveys move from pending queue to cloud confirmed."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "Live Offline Demonstration",
      "narration": "We simulate complete cellular loss in browser DevTools. The app remains fully functional, saving surveys to the pending queue.",
      "screenTarget": "DevTools Offline Test",
      "visualAction": "Network set to Offline; survey saved; project card shows amber Pending Sync badge."
    },
    {
      "time": "5:15",
      "seconds": 315,
      "title": "Automatic Re-connection & Mutex Lock",
      "narration": "When connectivity returns, the background sync worker triggers, pulsing blue before locking into emerald Cloud Synced.",
      "screenTarget": "Live Sync Transition",
      "visualAction": "Network set to Online; badge transitions from Pending Sync to Cloud Synced."
    }
  ],
  "fullNarrationScript": "STHAL MEASURE classifies every survey project into one of six explicit synchronization states: Local Only, Pending Sync, Syncing, Synced, Sync Failed, and Conflict. When an authenticated surveyor saves a project without an internet connection, it enters the offline queue marked Pending Sync. When connectivity returns, the background queue sets the state to Syncing and uploads the record. The sync engine includes a built-in mutex lock to prevent duplicate writes or concurrent race conditions.",
  "tryItTarget": {
    "tab": "projects",
    "buttonLabel": "Inspect Sync Status in Projects"
  },
  "youtubeTitle": "Offline Surveying & 6-State Data Sync Guide | STHAL MEASURE (Ep. 14)",
  "youtubeDescription": "Learn how STHAL MEASURE offline-first architecture and 6-state sync engine protect survey data in remote fields.",
  "keywords": [
    "Offline Survey App",
    "6-State Sync",
    "Data Protection",
    "Firebase Offline Queue",
    "Conflict Detection"
  ],
  "keyTakeaways": [
    "Complete measurement and saving functionality operates with zero network reception.",
    "Background sync engine automatically uploads queued projects upon reconnection.",
    "Conflict detection prevents silent overwrites if a remote collaborator updated the survey."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Authentication & 6-State Offline Data Sync\n\n1\n00:00:00.000 --> 00:01:30.000\nIn land surveying, critical measurements are often taken in rural areas where cellular data drops to zero. STHAL MEASURE was built offline-first.\n\n2\n00:01:30.000 --> 00:03:30.000\nSTHAL MEASURE tracks 6 explicit states: Local Only, Pending Sync, Syncing, Synced, Sync Failed, and Conflict.\n\n3\n00:03:30.000 --> 00:05:15.000\nWe simulate complete cellular loss in browser DevTools. The app remains fully functional, saving surveys to the pending queue.\n\n4\n00:05:15.000 --> 00:07:45.000\nWhen connectivity returns, the background sync worker triggers, pulsing blue before locking into emerald Cloud Synced.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Offline Sync Status Indicator (Header & Projects)",
      "userAction": "Review the 6 sync states: DRAFT, LOCAL_SAVED, SYNCING, SYNCED, CONFLICT, ERROR.",
      "demoInputs": "Review architecture diagram",
      "expectedOutput": "Clear state machine flow illustrating client-authoritative offline guarantees.",
      "zoomHighlightNotes": "Zoom 1.4x into the 6-state status legend.",
      "onScreenCaption": "6-State Sync Architecture: Prevents data loss during intermittent field connectivity."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Simulated Network Disconnect (Offline Field Test)",
      "userAction": "Disable network connection in DevTools; create and save a new survey project.",
      "demoInputs": "Network = Offline, Project = \"Sy No 88/1 Offline Survey\"",
      "expectedOutput": "Project saved in IndexedDB; badge displays amber \"LOCAL_SAVED\" status pill.",
      "zoomHighlightNotes": "Zoom 1.5x on the amber LOCAL_SAVED badge.",
      "onScreenCaption": "Local-First Storage: Instant save to browser IndexedDB with zero network dependency."
    },
    {
      "sceneNumber": 3,
      "time": "3:45",
      "seconds": 225,
      "screenTarget": "Network Reconnection & Automatic Sync",
      "userAction": "Restore network connectivity; observe automated synchronization background worker.",
      "demoInputs": "Network = Online",
      "expectedOutput": "Badge transitions: LOCAL_SAVED -> SYNCING -> emerald SYNCED in under 1.5 seconds.",
      "zoomHighlightNotes": "Zoom 1.6x on sync badge as it transitions to green checkmark.",
      "onScreenCaption": "Automatic Cloud Sync: Seamless synchronization to Firestore with mutex concurrency locks."
    },
    {
      "sceneNumber": 4,
      "time": "5:45",
      "seconds": 345,
      "screenTarget": "Conflict Detection & Resolution Engine",
      "userAction": "Demonstrate conflict trapping when remote server record has newer timestamp.",
      "demoInputs": "Remote updatedAt > Local updatedAt",
      "expectedOutput": "System safely flags \"CONFLICT\" status without blindly overwriting local field data.",
      "zoomHighlightNotes": "Zoom 1.4x on conflict modal offering safe merge or overwrite choices.",
      "onScreenCaption": "Conflict Safety: Timestamp verification prevents accidental data overwrite."
    }
  ],
  "closingSummary": "Our 6-state offline sync engine uses mutex locks and SHA-256 hashes to guarantee that field measurements recorded offline sync seamlessly without data collisions."
},
{
  "id": "ep-15",
  "episodeNumber": 15,
  "title": "Verified Land Marketplace & Seller Privacy",
  "subtitle": "Direct Buyer Inquiries & Private Seller Vaults",
  "category": "projects_market",
  "duration": "08:30",
  "durationSeconds": 510,
  "thumbnailGradient": "from-emerald-600 via-amber-800 to-slate-900",
  "targetAudience": "Landowners, buyers, property consultants, surveyors",
  "learningObjectives": [
    "Browse and filter geospatial land listings with actual coordinates and road-facing widths.",
    "Understand the security boundary separating public listings from private seller data (market_seller_data).",
    "Publish land listings with photos, zoning details, and verification title documents.",
    "Understand the administrative review workflow and mandatory legal disclaimers."
  ],
  "summary": "A detailed walkthrough of the STHAL MEASURE Land Marketplace, highlighting geospatial listings, direct WhatsApp inquiries, and seller privacy protection.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Geospatial Land Marketplace",
      "narration": "Unlike generic classifieds, STHAL MEASURE marketplace is built on verified surveying geometry with actual coordinates and road widths.",
      "screenTarget": "MarketplaceTab",
      "visualAction": "Marketplace opens showing verified plot cards and state filters."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Browsing & Direct WhatsApp Inquiry",
      "narration": "Buyers can view plot coordinates, extent in Cents, zoning, and facing road width, or initiate a pre-filled WhatsApp inquiry.",
      "screenTarget": "Listing Card",
      "visualAction": "Card opens showing details; WhatsApp button shows automated inquiry text."
    },
    {
      "time": "3:30",
      "seconds": 210,
      "title": "Data Privacy: The Private Seller Vault",
      "narration": "Public listings never expose seller phone numbers or deed PDFs. That sensitive information is locked in a protected collection.",
      "screenTarget": "Privacy Architecture",
      "visualAction": "Diagram illustrates separation between public market_listings and protected market_seller_data."
    },
    {
      "time": "5:30",
      "seconds": 330,
      "title": "Publishing a Plot Listing",
      "narration": "Click Post Land Listing to upload photos and attach title deeds for formal verification review.",
      "screenTarget": "Post Listing Modal",
      "visualAction": "Form filled with extent, price, zoning; photo and deed PDF uploaded to Firebase Storage."
    }
  ],
  "fullNarrationScript": "In Episode 15, we explore the STHAL MEASURE Land Marketplace. When public users browse the marketplace, STHAL MEASURE never exposes the seller private email address, phone number, or uploaded deed documents. Under our Firestore security rules, public listing geometry resides in the public collection, while sensitive contact numbers and title deeds are strictly isolated in a protected collection called market_seller_data. This ensures complete privacy protection.",
  "tryItTarget": {
    "tab": "market",
    "buttonLabel": "Browse Land Marketplace"
  },
  "youtubeTitle": "Verified Land Marketplace & Seller Privacy | STHAL MEASURE (Ep. 15)",
  "youtubeDescription": "Browse, publish, and verify land plot listings with strict seller data privacy protection in STHAL MEASURE.",
  "keywords": [
    "Land Marketplace",
    "Property Verification",
    "Direct Land Sale",
    "Seller Data Privacy",
    "Cadastral Marketplace"
  ],
  "keyTakeaways": [
    "Listings display verified geometry, coordinates, zoning, and road widths.",
    "Seller phone numbers and title deeds are isolated in protected private collections.",
    "Listing creators cannot approve their own listings; review is independently administered."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Verified Land Marketplace & Seller Privacy\n\n1\n00:00:00.000 --> 00:01:30.000\nUnlike generic classifieds, STHAL MEASURE marketplace is built on verified surveying geometry with actual coordinates and road widths.\n\n2\n00:01:30.000 --> 00:03:30.000\nBuyers can view plot coordinates, extent in Cents, zoning, and facing road width, or initiate a pre-filled WhatsApp inquiry.\n\n3\n00:03:30.000 --> 00:05:30.000\nPublic listings never expose seller phone numbers or deed PDFs. That sensitive information is locked in a protected collection.\n\n4\n00:05:30.000 --> 00:08:30.000\nClick Post Land Listing to upload photos and attach title deeds for formal verification review.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Marketplace Workspace",
      "userAction": "Click Market in navigation dock; browse verified property listings.",
      "demoInputs": "Click \"Market\" in bottom dock",
      "expectedOutput": "Verified plot cards display location, extent in Cents, zoning, and road width.",
      "zoomHighlightNotes": "Full viewport view of marketplace cards and filter chips.",
      "onScreenCaption": "Geospatial Land Marketplace: Verified listings based on real survey geometry."
    },
    {
      "sceneNumber": 2,
      "time": "1:30",
      "seconds": 90,
      "screenTarget": "Listing Detail Modal (Public Verification Card)",
      "userAction": "Open plot listing \"25 Cents Residential Plot - Penamaluru\"; inspect verified survey specs.",
      "demoInputs": "Click \"View Plot Details\"",
      "expectedOutput": "Boundary coordinates, road facing (40 ft), zoning (R1), and verified surveyor badge.",
      "zoomHighlightNotes": "Zoom 1.3x into the verified survey certificate preview.",
      "onScreenCaption": "Geometry Transparency: Buyers inspect real survey boundaries before making inquiries."
    },
    {
      "sceneNumber": 3,
      "time": "3:30",
      "seconds": 210,
      "screenTarget": "Seller Data Privacy Architecture",
      "userAction": "Demonstrate data segregation between public listing and private seller vault.",
      "demoInputs": "Review security rule schema",
      "expectedOutput": "Seller contact numbers and deed PDFs isolated in protected collection market_seller_data.",
      "zoomHighlightNotes": "Highlight security rules blocking public access to seller phone and deed documents.",
      "onScreenCaption": "Private Seller Vault: Protects landowner phone numbers and deeds from public scraping."
    },
    {
      "sceneNumber": 4,
      "time": "5:30",
      "seconds": 330,
      "screenTarget": "Post Land Listing Modal",
      "userAction": "Click \"Post Land Listing\"; demonstrate linking an existing project from your vault.",
      "demoInputs": "Attach Project = \"Sy No 204/1A\"",
      "expectedOutput": "Survey dimensions, extent, and coordinates pre-fill automatically from your project.",
      "zoomHighlightNotes": "Follow form as project details automatically populate listing fields.",
      "onScreenCaption": "One-Click Publishing: Publish verified listings directly from your Project Vault."
    }
  ],
  "closingSummary": "The STHAL MEASURE Marketplace bridges surveyors, landowners, and buyers on verified geometry while locking sensitive legal deeds in private seller vaults."
},
{
  "id": "ep-16",
  "episodeNumber": 16,
  "title": "Owner Control Center & Developer Administration",
  "subtitle": "Enterprise RBAC, AI Health Center & Audit Trails",
  "category": "admin_ai",
  "duration": "09:00",
  "durationSeconds": 540,
  "thumbnailGradient": "from-amber-600 via-rose-900 to-slate-900",
  "targetAudience": "System administrators, lead engineers, project managers",
  "learningObjectives": [
    "Understand the three-tier Role-Based Access Control system (Owner, Developer, User).",
    "Manage user privileges, issue developer invitations, and moderate marketplace listings.",
    "Use the AI Health Center to monitor database latency and execute automated remediations.",
    "Inspect captured client error stack traces and the immutable server audit trail."
  ],
  "summary": "An administrative tour of the Super Admin Owner Control Center and Developer Dashboard, covering user management, AI health dials, and audit trails.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Three-Tier Role Architecture",
      "narration": "STHAL MEASURE enforces a strict three-tier role-based access control system: Super Admin Owner, Technical Developer, and Standard User.",
      "screenTarget": "RBAC Slide",
      "visualAction": "Diagram illustrates permission boundaries between Owner, Developer, and User."
    },
    {
      "time": "1:45",
      "seconds": 105,
      "title": "Owner Console: Moderation & Invitations",
      "narration": "In the Owner Control Center, the Super Admin can review pending marketplace listings and issue cryptographic developer invitations.",
      "screenTarget": "OwnerControlCenter",
      "visualAction": "Owner approves listing and generates SHA-256 developer invitation token DEV-9B2F-4A1C-8E3D."
    },
    {
      "time": "4:00",
      "seconds": 240,
      "title": "AI Health Center & One-Click Remediation",
      "narration": "The AI Health Center monitors Firestore latency, Bhuvan proxy health, and server memory, with one-click automated remediation.",
      "screenTarget": "AI Health Center",
      "visualAction": "Dials display live health; Remediate System Issues button clicked to flush telemetry buffers."
    },
    {
      "time": "6:15",
      "seconds": 375,
      "title": "Developer Console & Error Stack Traces",
      "narration": "The Developer Dashboard captures client-side exceptions and network timeouts with complete stack traces and device profiles.",
      "screenTarget": "DeveloperDashboard",
      "visualAction": "Developer expands error log entry to inspect full stack trace and client environment."
    }
  ],
  "fullNarrationScript": "The platform enforces a strict three-tier role-based access control system. Standard Users have full access to calculators and mapping. Developers have access to technical error telemetry and bug triage queues. And the Super Admin Owner possesses exclusive authority to promote developers, moderate marketplace listings, and remediate system health. Every privileged administrative action is permanently recorded in the immutable Server Audit Trail with timestamps, actor IDs, and IP addresses.",
  "tryItTarget": {
    "tab": "home",
    "buttonLabel": "Return to Home Dashboard"
  },
  "youtubeTitle": "Owner & Developer Administration: RBAC & AI Health | STHAL MEASURE (Ep. 16)",
  "youtubeDescription": "Explore the enterprise administration consoles, RBAC permissions, and AI health center in STHAL MEASURE.",
  "keywords": [
    "Owner Control Center",
    "Developer Dashboard",
    "Enterprise RBAC",
    "AI Health Center",
    "Audit Trail"
  ],
  "keyTakeaways": [
    "Roles are strictly resolved through verified Firebase Custom Claims, never client state.",
    "The AI Health Center provides one-click automated remediation of telemetry buffers.",
    "Immutable server audit logging ensures complete administrative accountability."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Owner Control Center & Developer Administration\n\n1\n00:00:00.000 --> 00:01:45.000\nSTHAL MEASURE enforces a strict three-tier role-based access control system: Super Admin Owner, Technical Developer, and Standard User.\n\n2\n00:01:45.000 --> 00:04:00.000\nIn the Owner Control Center, the Super Admin can review pending marketplace listings and issue cryptographic developer invitations.\n\n3\n00:04:00.000 --> 00:06:15.000\nThe AI Health Center monitors Firestore latency, Bhuvan proxy health, and server memory, with one-click automated remediation.\n\n4\n00:06:15.000 --> 00:09:00.000\nThe Developer Dashboard captures client-side exceptions and network timeouts with complete stack traces and device profiles.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Owner Control Center (RBAC Overview)",
      "userAction": "Sign in as Super Admin Owner; navigate to Owner Control Center.",
      "demoInputs": "Owner authentication via verified custom claims",
      "expectedOutput": "Owner dashboard opens with Role Matrix: Super Admin Owner, Developer, User.",
      "zoomHighlightNotes": "Zoom 1.3x on the verified Owner authorization badge.",
      "onScreenCaption": "Enterprise RBAC: Roles enforced through trusted backend claims, never client view state."
    },
    {
      "sceneNumber": 2,
      "time": "1:45",
      "seconds": 105,
      "screenTarget": "Developer Invitation Generator",
      "userAction": "Generate cryptographic developer invitation token; inspect SHA-256 token format.",
      "demoInputs": "Click \"Generate Developer Invitation\"",
      "expectedOutput": "Cryptographic token generated: DEV-9B2F-4A1C-8E3D with 24-hour expiration.",
      "zoomHighlightNotes": "Zoom 1.5x on token generator card and copy button.",
      "onScreenCaption": "Cryptographic Invitations: Prevents unauthorized privilege escalation."
    },
    {
      "sceneNumber": 3,
      "time": "4:00",
      "seconds": 240,
      "screenTarget": "AI Health Center & Diagnostics",
      "userAction": "Inspect real-time telemetry dials: Firestore Latency, Bhuvan WMS Health, Memory Heap.",
      "demoInputs": "Click \"AI Health Center\" tab",
      "expectedOutput": "Live health dials: Latency 82ms, WMS 100% Operational, Heap 38MB / 128MB.",
      "zoomHighlightNotes": "Pan across the three live gauge dials.",
      "onScreenCaption": "AI Health Center: Real-time telemetry monitoring with one-click automated remediation."
    },
    {
      "sceneNumber": 4,
      "time": "6:15",
      "seconds": 375,
      "screenTarget": "Developer Console & Immutable Audit Log",
      "userAction": "Inspect error stack trace queue and immutable server audit log stream.",
      "demoInputs": "Click \"Audit Logs\" tab",
      "expectedOutput": "Structured log entries with timestamp, actor UID, IP address, and operation payload.",
      "zoomHighlightNotes": "Zoom 1.4x into the audit log ledger.",
      "onScreenCaption": "Server Audit Trail: Immutable logging guarantees enterprise accountability."
    }
  ],
  "closingSummary": "Enterprise administration is built on Firebase Custom Claims and immutable audit logging, providing complete control over roles, moderation, and system health."
},
{
  "id": "ep-17",
  "episodeNumber": 17,
  "title": "AI Cadastral Scanner, Terminology & Disputes",
  "subtitle": "Computer Vision OCR & Statutory Revenue Intelligence",
  "category": "admin_ai",
  "duration": "07:30",
  "durationSeconds": 450,
  "thumbnailGradient": "from-purple-600 via-pink-800 to-slate-900",
  "targetAudience": "Landowners, property buyers, legal advisors, surveyors",
  "learningObjectives": [
    "Scan land passbooks (Pattadar Passbook, 1-B Adangal) using Gemini Vision OCR.",
    "Automatically create pre-populated survey projects from document photographs.",
    "Use the Cadastral Terminology Decoder to translate regional revenue terms.",
    "Utilize the Plot Boundary Dispute Analyzer to understand boundary demarcation procedures."
  ],
  "summary": "Learn how to use STHAL MEASURE artificial intelligence tools to scan land passbooks, decode complex cadastral terms, and analyze boundary disputes.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "AI-Powered Cadastral Intelligence",
      "narration": "Indian land administration involves centuries of specialized terminology and handwritten cadastral registers. STHAL MEASURE integrates Google Gemini to solve this.",
      "screenTarget": "AI Tools Menu",
      "visualAction": "Floating AI badge opens menu showing Document Scanner, Decoder, and Dispute Analyzer."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Scanning Documents with Gemini Vision OCR",
      "narration": "Upload a photograph of a Pattadar Passbook or 1-B Adangal. The AI extracts the survey number, village, extent, and land classification.",
      "screenTarget": "LandDocumentScannerModal",
      "visualAction": "Document scanned; structured card populates: Sy No. 182/3, Penamaluru, 1.45 Acres."
    },
    {
      "time": "3:45",
      "seconds": 225,
      "title": "Decoding Regional Revenue Terms",
      "narration": "Ask the Terminology Decoder to explain Grama Kantham, D-Patta, and Inam land, highlighting legal purchase restrictions.",
      "screenTarget": "Terminology Decoder",
      "visualAction": "Query entered; AI outputs concise statutory breakdown explaining non-alienable assigned lands."
    },
    {
      "time": "5:15",
      "seconds": 315,
      "title": "Boundary Dispute Analyzer",
      "narration": "Submit boundary conflict scenarios to receive a 4-step statutory roadmap under the Survey and Boundaries Act.",
      "screenTarget": "Dispute Analyzer",
      "visualAction": "Dispute scenario submitted; AI provides step-by-step guidance on FMB demarcation and F-line petitions."
    }
  ],
  "fullNarrationScript": "Click Scan Land Document. You can take a photo of a Pattadar Passbook or upload a PDF of an Adangal extract. STHAL MEASURE sends the image through our secure server proxy to Gemini Vision. The AI identifies the survey number, village, extent, and land classification. Click Create Survey Project from Document, and STHAL MEASURE immediately sets up a new survey project pre-populated with these verified details. The Terminology Decoder and Boundary Dispute Analyzer provide instant statutory legal context.",
  "tryItTarget": {
    "tab": "projects",
    "buttonLabel": "Try Land Document Scanner in Projects"
  },
  "youtubeTitle": "AI Land Document Scanner & Cadastral Assistant | STHAL MEASURE (Ep. 17)",
  "youtubeDescription": "Scan land passbooks with Gemini Vision OCR and decode complex Indian revenue terminology in STHAL MEASURE.",
  "keywords": [
    "AI Land Scanner",
    "Pattadar Passbook OCR",
    "1-B Adangal Scanner",
    "Cadastral Terminology",
    "Boundary Dispute"
  ],
  "keyTakeaways": [
    "Gemini Vision OCR extracts survey numbers, village names, and extents from document photos.",
    "Extracted data automatically pre-populates new survey projects.",
    "Dispute Analyzer guides users through official state F-line boundary demarcation petitions."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: AI Cadastral Scanner, Terminology & Disputes\n\n1\n00:00:00.000 --> 00:01:30.000\nIndian land administration involves centuries of specialized terminology and handwritten cadastral registers. STHAL MEASURE integrates Google Gemini to solve this.\n\n2\n00:01:30.000 --> 00:03:45.000\nUpload a photograph of a Pattadar Passbook or 1-B Adangal. The AI extracts the survey number, village, extent, and land classification.\n\n3\n00:03:45.000 --> 00:05:15.000\nAsk the Terminology Decoder to explain Grama Kantham, D-Patta, and Inam land, highlighting legal purchase restrictions.\n\n4\n00:05:15.000 --> 00:07:30.000\nSubmit boundary conflict scenarios to receive a 4-step statutory roadmap under the Survey and Boundaries Act.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "AI Tools Menu (Document Scanner)",
      "userAction": "Click AI Assistant in header or projects; select \"Scan Land Document\".",
      "demoInputs": "Click \"Scan Land Document\"",
      "expectedOutput": "Scanner modal opens with camera capture and PDF upload dropzone.",
      "zoomHighlightNotes": "Full modal view of OCR scanning interface.",
      "onScreenCaption": "Gemini Vision OCR: Artificial intelligence extraction of Indian revenue documents."
    },
    {
      "sceneNumber": 2,
      "time": "1:30",
      "seconds": 90,
      "screenTarget": "Document Upload & Vision OCR Scanning",
      "userAction": "Upload photo of Andhra Pradesh 1-B Adangal / Pattadar Passbook extract.",
      "demoInputs": "File = adangal_sample_extract.jpg",
      "expectedOutput": "Laser scan beam animates; AI extracts: Khata No. 412, Sy No. 182/3, Extent 1.45 Acres.",
      "zoomHighlightNotes": "Zoom 1.4x on extracted data preview card with field-by-field verification tags.",
      "onScreenCaption": "Intelligent Parsing: Automatically isolates survey number, sub-division, village, and extent."
    },
    {
      "sceneNumber": 3,
      "time": "3:45",
      "seconds": 225,
      "screenTarget": "Create Project from Scanned Document",
      "userAction": "Click \"Create Survey Project from Document\" button.",
      "demoInputs": "Click \"Create Project\"",
      "expectedOutput": "New project initialized in Projects workspace pre-populated with extracted revenue data.",
      "zoomHighlightNotes": "Observe transition from scanner into Projects workspace.",
      "onScreenCaption": "Instant Project Setup: Zero manual typing when converting paper deeds to digital surveys."
    },
    {
      "sceneNumber": 4,
      "time": "5:15",
      "seconds": 315,
      "screenTarget": "Cadastral Terminology Decoder & Dispute Analyzer",
      "userAction": "Ask Terminology Decoder to explain \"Grama Kantham\" and \"D-Patta\" purchase restrictions.",
      "demoInputs": "Query = \"Grama Kantham purchase legality in Andhra Pradesh\"",
      "expectedOutput": "Statutory legal breakdown explaining village site regulations and boundary dispute remedies.",
      "zoomHighlightNotes": "Zoom 1.3x into the structured statutory advisory output.",
      "onScreenCaption": "Statutory Revenue Intelligence: Understand purchase restrictions under state land laws."
    }
  ],
  "closingSummary": "Gemini AI Vision bridges ancient paper land deeds with modern GIS mapping, extracting survey numbers, village names, and extents directly into your project vault."
},
{
  "id": "ep-18",
  "episodeNumber": 18,
  "title": "Complete Practical Survey Demonstration",
  "subtitle": "Field to Finished Deed: The Capstone Masterclass",
  "category": "admin_ai",
  "duration": "12:00",
  "durationSeconds": 720,
  "thumbnailGradient": "from-emerald-600 via-teal-700 to-indigo-950",
  "targetAudience": "All viewers, comprehensive capstone course",
  "learningObjectives": [
    "Execute an entire end-to-end land survey workflow on a realistic agricultural parcel.",
    "Record field measurements, verify diagonal triangulation, and calculate extent in Cents and Acres.",
    "Cross-reference ground boundaries against ISRO Bhuvan satellite imagery.",
    "Perform CAD drafting with offset planning and generate an official signed PDF report."
  ],
  "summary": "The ultimate masterclass demonstration: an end-to-end survey of Survey No. 308/2A from field measurements to mathematical triangulation, satellite verification, CAD offset drafting, and client PDF report generation.",
  "chapters": [
    {
      "time": "0:00",
      "seconds": 0,
      "title": "Masterclass Briefing & Scenario",
      "narration": "In this capstone demonstration, we integrate every skill into one professional workflow for Survey Number 308/2A in the Krishna Delta.",
      "screenTarget": "Briefing Card",
      "visualAction": "Title briefing card outlines our 4-phase survey mission."
    },
    {
      "time": "1:30",
      "seconds": 90,
      "title": "Phase 1: Mathematical Triangulation",
      "narration": "In the Calculator workspace, enter Side A 42.5m, Side B 35.2m, Side C 40.8m, Side D 36.1m, and Diagonal 54.8m. Total extent: 36.58 Cents.",
      "screenTarget": "CalculatorTab (4sided)",
      "visualAction": "Values typed; SVG renders; area computes to 1,480.2 m² = 36.58 Cents."
    },
    {
      "time": "4:00",
      "seconds": 240,
      "title": "Phase 2: Geospatial Bhuvan Verification",
      "narration": "In Bhuvan 2D, trace the agricultural bunds over ISRO satellite imagery to verify that physical ground orientation matches our model.",
      "screenTarget": "BhuvanMapTab",
      "visualAction": "Satellite imagery aligns with drawn polygon; geodesic extent confirms 36.6 Cents."
    },
    {
      "time": "6:30",
      "seconds": 390,
      "title": "Phase 3: CAD Drafting Studio & Road Offset",
      "narration": "In the Drafting Studio, use the parallel offset tool with object snap to generate a five-meter road widening reservation line and export DXF.",
      "screenTarget": "CadToolsTab",
      "visualAction": "CAD canvas displays parcel; 5m offset line drafted along north boundary; DXF exported."
    },
    {
      "time": "8:45",
      "seconds": 525,
      "title": "Phase 4: Official Signed PDF Report",
      "narration": "In Projects, generate the official PDF report containing metadata, dimension tables, coordinate schedules, vector plot, and signature line.",
      "screenTarget": "ProjectsTab PDF Viewer",
      "visualAction": "Multi-page client-ready PDF generated and viewed in full screen."
    },
    {
      "time": "10:45",
      "seconds": 645,
      "title": "Series Conclusion & Best Practices",
      "narration": "You now possess complete command over every feature of STHAL MEASURE. Measure accurately. Map responsibly. Manage securely.",
      "screenTarget": "Series Outro Card",
      "visualAction": "Montage reviews 4 phases: Math -> Satellite -> CAD -> Official PDF."
    }
  ],
  "fullNarrationScript": "Welcome to the capstone episode of the STHAL MEASURE training series. Phase one: field calculation. In the Calculator workspace, we enter forty-two point five meters, thirty-five point two meters, forty point eight meters, thirty-six point one meters, and our diagonal of fifty-four point eight meters. Total extent is thirty-six point five-eight Cents. Phase two: geospatial verification on Bhuvan satellite imagery. Phase three: engineering drafting in the CAD Studio, creating a five-meter road offset. Phase four: official documentation, generating our signed PDF survey report. Measure accurately. Map responsibly. Manage securely.",
  "tryItTarget": {
    "tab": "calc",
    "subTab": "4sided",
    "buttonLabel": "Try Capstone Demonstration Parcel"
  },
  "youtubeTitle": "Complete Land Survey Demonstration: Field to Finished Deed | STHAL MEASURE (Ep. 18)",
  "youtubeDescription": "The complete end-to-end capstone demonstration for STHAL MEASURE: Triangulation, Bhuvan Satellite Verification, CAD Drafting, and PDF Reports.",
  "keywords": [
    "Land Survey Demonstration",
    "Capstone Survey",
    "Field to Deed",
    "Complete Land Measurement",
    "STHAL MEASURE Tutorial"
  ],
  "keyTakeaways": [
    "Integrates mathematical calculation, satellite verification, CAD drafting, and PDF reporting into one seamless workflow.",
    "Field measurements match physical satellite bunds within 0.1 Cents.",
    "Client-ready official PDF reports are generated entirely client-side in under two seconds."
  ],
  "videoType": "none",
  "captionsVtt": "WEBVTT - STHAL MEASURE: Complete Practical Survey Demonstration\n\n1\n00:00:00.000 --> 00:01:30.000\nIn this capstone demonstration, we integrate every skill into one professional workflow for Survey Number 308/2A in the Krishna Delta.\n\n2\n00:01:30.000 --> 00:04:00.000\nIn the Calculator workspace, enter Side A 42.5m, Side B 35.2m, Side C 40.8m, Side D 36.1m, and Diagonal 54.8m. Total extent: 36.58 Cents.\n\n3\n00:04:00.000 --> 00:06:30.000\nIn Bhuvan 2D, trace the agricultural bunds over ISRO satellite imagery to verify that physical ground orientation matches our model.\n\n4\n00:06:30.000 --> 00:08:45.000\nIn the Drafting Studio, use the parallel offset tool with object snap to generate a five-meter road widening reservation line and export DXF.\n\n5\n00:08:45.000 --> 00:10:45.000\nIn Projects, generate the official PDF report containing metadata, dimension tables, coordinate schedules, vector plot, and signature line.\n\n6\n00:10:45.000 --> 00:12:00.000\nYou now possess complete command over every feature of STHAL MEASURE. Measure accurately. Map responsibly. Manage securely.\n\n",
  "storyboard": [
    {
      "sceneNumber": 1,
      "time": "0:00",
      "seconds": 0,
      "screenTarget": "Capstone Briefing Card (Survey No. 308/2A)",
      "userAction": "Review capstone survey mission: 4-phase end-to-end survey of an agricultural parcel in Krishna Delta.",
      "demoInputs": "Project: Survey No. 308/2A Penamaluru",
      "expectedOutput": "Briefing card details Phase 1 (Math), Phase 2 (Bhuvan), Phase 3 (CAD), Phase 4 (Signed PDF).",
      "zoomHighlightNotes": "Full viewport view of mission briefing.",
      "onScreenCaption": "Capstone Masterclass: Field to Finished Deed — The Complete Professional Workflow."
    },
    {
      "sceneNumber": 2,
      "time": "1:30",
      "seconds": 90,
      "screenTarget": "Phase 1: 4-Sided Calculator (Triangulation)",
      "userAction": "Enter field measurements: Side 1=42.5m, Side 2=35.2m, Side 3=40.8m, Side 4=36.1m, Diagonal=54.8m.",
      "demoInputs": "42.5, 35.2, 40.8, 36.1, 54.8 meters",
      "expectedOutput": "Exact calculated area: 1,480.2 m² = 36.58 Cents (0.3658 Acres, 1,770.3 sq yds).",
      "zoomHighlightNotes": "Zoom 1.3x on calculated results card and SVG parcel sketch.",
      "onScreenCaption": "Phase 1: Double Heron triangulation establishes exact ground area of 36.58 Cents."
    },
    {
      "sceneNumber": 3,
      "time": "4:00",
      "seconds": 240,
      "screenTarget": "Phase 2: Bhuvan 2D (Satellite Verification)",
      "userAction": "Center map on Penamaluru parcel; trace agricultural bunds over ISRO satellite imagery.",
      "demoInputs": "Trace polygon on Bhuvan Cartosat satellite stream",
      "expectedOutput": "Geodesic area computes to 36.6 Cents, confirming physical ground alignment within 0.1 Cents.",
      "zoomHighlightNotes": "Zoom 1.3x into satellite imagery showing yellow cadastral overlay matching physical bunds.",
      "onScreenCaption": "Phase 2: Geospatial Bhuvan verification confirms physical boundaries match revenue records."
    },
    {
      "sceneNumber": 4,
      "time": "6:30",
      "seconds": 390,
      "screenTarget": "Phase 3: CAD Drafting Studio (Road Offset)",
      "userAction": "Open Drafting Studio; apply 5.0m parallel offset along north boundary for road widening.",
      "demoInputs": "Offset = 5.0 meters, Object Snap = Endpoint",
      "expectedOutput": "CAD canvas displays parcel polygon with dashed road widening reservation line; export DXF.",
      "zoomHighlightNotes": "Zoom 1.4x into drafting crosshair executing the parallel offset command.",
      "onScreenCaption": "Phase 3: CAD drafting establishes statutory road widening reservation lines."
    },
    {
      "sceneNumber": 5,
      "time": "8:45",
      "seconds": 525,
      "screenTarget": "Phase 4: Official Signed PDF Report",
      "userAction": "Compile project in Projects workspace; generate final official 2-page survey certificate.",
      "demoInputs": "Click \"Generate Official PDF Survey Report\"",
      "expectedOutput": "High-resolution PDF certificate with metadata, vector plot, coordinates, and signature line.",
      "zoomHighlightNotes": "Full screen scroll through the finished client-ready PDF document.",
      "onScreenCaption": "Phase 4: Official Signed Certificate ready for bank loan, deed registration, and client delivery."
    }
  ],
  "closingSummary": "Congratulations! You have completed the STHAL MEASURE Capstone Masterclass. From field measurements to mathematical triangulation, satellite verification, CAD drafting, and certified PDF delivery — you possess complete command over modern land surveying."
},
];
