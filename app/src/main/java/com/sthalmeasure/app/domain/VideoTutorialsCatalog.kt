package com.sthalmeasure.app.domain

data class TutorialEpisode(
    val id: String,
    val number: Int,
    val title: String,
    val subtitle: String,
    val category: String,
    val duration: String,
    val summary: String,
    val steps: List<String>,
    val keyTakeaways: List<String>,
    val targetRoute: String,
    val difficulty: String = when {
        number <= 5 -> "Beginner"
        number <= 12 -> "Intermediate"
        else -> "Advanced"
    }
)

object AcademyVideoValidator {
    private val HOST_REGEX = Regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")

    fun isValidStreamUrl(url: String): Boolean {
        val clean = url.trim()
        if (clean.isEmpty() || clean.length > 500) return false
        if (clean.any { it.isWhitespace() }) return false
        if (!clean.startsWith("https://")) return false
        val uri = try {
            java.net.URI(clean)
        } catch (_: Throwable) {
            return false
        }
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme != "https") return false
        val host = uri.host ?: return false
        if (host.equals("localhost", ignoreCase = true) || host == "127.0.0.1") return false
        return HOST_REGEX.matches(host)
    }

    fun normalizeAndValidateForSave(url: String): String {
        val clean = url.trim()
        if (clean.isEmpty()) return ""
        require(isValidStreamUrl(clean)) {
            "Enter a valid https:// video URL (with domain and no spaces), or leave blank to clear."
        }
        return clean
    }
}

object VideoTutorialsCatalog {
    val categories = listOf("All", "Basics", "Calculators", "GPS & Map", "CAD & GIS", "Projects & Market", "AI Tools")
    val difficulties = listOf("All", "Beginner", "Intermediate", "Advanced")

    val episodes: List<TutorialEpisode> = listOf(
        TutorialEpisode(
            id = "ep-01",
            number = 1,
            title = "Introduction to Sthal Measure",
            subtitle = "7 Workspaces & All-India Cadastral Adaptation",
            category = "Basics",
            duration = "06:30",
            summary = "Overview of Sthal Measure architecture, regional unit adaptation across 28 states & 8 UTs, and field workflows.",
            steps = listOf(
                "Select your State Jurisdiction in the top header bar.",
                "Navigate across Calculators, Drafting Studio, GPS Walk, Import/Export, Projects, and Marketplace.",
                "Review regional conversion tables inside the Calculator converter mode."
            ),
            keyTakeaways = listOf(
                "One tap switches regional units between Cents, Guntas, Bighas, Kanals, and Grounds.",
                "Offline calculations execute directly on-device with zero latency."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-02",
            number = 2,
            title = "Dashboard & GNSS Sensor Diagnostics",
            subtitle = "Kalman Filtering & Multipath Spike Rejection",
            category = "Basics",
            duration = "05:45",
            summary = "Monitor live horizontal GNSS accuracy and activate the Static Epoch Accumulator at boundary stones.",
            steps = listOf(
                "Open GPS Walk and inspect live WGS84 & UTM Zone readouts.",
                "Watch Kalman-filtered accuracy converge below ±5m before dropping a vertex.",
                "Hold stationary at corner pegs for 20-epoch inverse-variance averaging."
            ),
            keyTakeaways = listOf(
                "2D Recursive Kalman filtering smooths consumer smartphone GNSS drift.",
                "Velocity gating rejects >15 m/s satellite multipath jumps."
            ),
            targetRoute = "gps"
        ),
        TutorialEpisode(
            id = "ep-03",
            number = 3,
            title = "State Land Unit Converter & DILRMP",
            subtitle = "Meebhoomi, Dharani, Bhulekh, AnyRoR & Bhoomi",
            category = "Calculators",
            duration = "06:15",
            summary = "Master instant bidirectional conversion across Cents, Guntas, Ankanams, Pucca/Kacha Bigha, Kanal, Marla, and Acres.",
            steps = listOf(
                "Open Calculator -> State Unit Converter.",
                "Pick source unit (e.g. Gunta, Pucca Bigha, or Ground) and enter measured area.",
                "Inspect equivalent Acres, Hectares, Cents, and Sq. Feet."
            ),
            keyTakeaways = listOf(
                "Includes Gunter's Chains (66 ft) and IS 1492 Metric Chains (20 m).",
                "Accounts for regional Bigha differences (UP 27,225 vs WB/Assam 14,400 vs HP 8,712 sq ft)."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-04",
            number = 4,
            title = "4-Sided Plot by Measured Diagonal",
            subtitle = "Heron Two-Triangle Field Triangulation",
            category = "Calculators",
            duration = "07:00",
            summary = "Compute exact irregular quadrilateral area from North, East, South, West boundaries plus Diagonal AC.",
            steps = listOf(
                "Select Linear Unit (Feet, Meters, Gunter's Links, or Metric Links).",
                "Enter Side A, B, C, D and measured Diagonal AC.",
                "Verify triangle inequality validation and view proportional 2D plot diagram."
            ),
            keyTakeaways = listOf(
                "Decomposes quad ABCD into exact ΔABC + ΔCDA.",
                "Avoids the systematic overestimation of the Patwari rectangle average."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-05",
            number = 5,
            title = "4-Sided Without Diagonal: Cyclic vs Patwari",
            subtitle = "Brahmagupta Upper Bound vs Sarasari Average",
            category = "Calculators",
            duration = "06:40",
            summary = "Compare Brahmagupta's cyclic maximum area against traditional ((A+C)/2)×((B+D)/2) Patwari estimation.",
            steps = listOf(
                "Switch Calculator mode to '4-Sided (No Diag)'.",
                "Compare exact Brahmagupta cyclic bound vs Patwari discrepancy.",
                "Understand why legal demarcation requires at least one measured diagonal."
            ),
            keyTakeaways = listOf(
                "Displays solved cyclic diagonals AC/BD and corner angles.",
                "Highlights why skewed rhomboids cannot be uniquely solved by 4 sides alone."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-06",
            number = 6,
            title = "5-Sided Plots & Triangle Heron Tool",
            subtitle = "Three-Triangle Penthouse Polygon Subdivision",
            category = "Calculators",
            duration = "05:50",
            summary = "Survey non-rectangular 3-sided and 5-sided parcels using sequential interior diagonals.",
            steps = listOf(
                "Choose 3-Sided Triangle or 5-Sided Pentagon calculator.",
                "Input all perimeter legs and braces D1, D2.",
                "Save completed parcel directly to your Firestore Project Vault."
            ),
            keyTakeaways = listOf(
                "Instant triangle inequality error feedback prevents impossible field tape entries.",
                "Automatic 2D sketch plotting validates corner geometry visually."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-07",
            number = 7,
            title = "Hissa Fractional Family Partition",
            subtitle = "ROR Khata Share Division in Acres & Cents",
            category = "Calculators",
            duration = "05:30",
            summary = "Divide ancestral joint holdings (Khata/Pahani shares) accurately across co-sharers using fractional shares.",
            steps = listOf(
                "Enter total parcel area in Sq. Meters or Cents.",
                "Add shareholder rows with fraction shares (e.g. 1/4, 3/8).",
                "Export individual Hissa area breakdown in Cents and Sq. Yards."
            ),
            keyTakeaways = listOf(
                "Ensures sum of Hissa allocations matches total registered extent.",
                "Displays both percentage share and exact Sq. Feet/Cents per co-owner."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-08",
            number = 8,
            title = "Closed Traverse Sheet & Bowditch Balancing",
            subtitle = "Compass Rule Latitude/Departure Adjustment",
            category = "Calculators",
            duration = "08:10",
            summary = "Enter Whole Circle Bearings and leg lengths, inspect linear closing error, and balance misclosure automatically.",
            steps = listOf(
                "Open Traverse mode and enter Station WCB (0-360°) & distance (m).",
                "Check relative precision (First-Order ≥ 1:5000, Second ≥ 1:2000, Third ≥ 1:1000).",
                "Compare unadjusted vs Bowditch-adjusted loop closure & Shoelace area."
            ),
            keyTakeaways = listOf(
                "Applies proportional Bowditch correction ΔL·(d/P) across every leg.",
                "Flags Sub-Standard closures (<1:1000) for field re-chaining."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-09",
            number = 9,
            title = "Drafting Studio: COGO Forward & Inverse",
            subtitle = "Precision Bearing-Distance Plotting",
            category = "CAD & GIS",
            duration = "07:20",
            summary = "Draft clean cadastral polygons using Whole Circle Bearings, polar distances, and Quadrantal Bearing readouts.",
            steps = listOf(
                "Open Drafting Studio -> COGO Panel.",
                "Enter bearing and distance from last corner to add surveyed vertices.",
                "Inspect live WCB and Quadrantal (N/S-E/W) bearing readouts per segment."
            ),
            keyTakeaways = listOf(
                "Zero drift Cartesian plotting with automatic Shoelace area & perimeter.",
                "Includes Undo and Endpoint/Midpoint OSNAP detection."
            ),
            targetRoute = "cad"
        ),
        TutorialEpisode(
            id = "ep-10",
            number = 10,
            title = "Setback Buffers & Parcel Split Tools",
            subtitle = "Building Margin Offsets & Ratio Subdivision",
            category = "CAD & GIS",
            duration = "06:50",
            summary = "Generate inward municipal setback margins and bisect irregular parcels by target area ratio.",
            steps = listOf(
                "Set setback inset distance (e.g. 2.0m or 3.0m) and toggle setback preview.",
                "Use Split Tool slider (10%-90%) to bisect the parcel vertically or horizontally.",
                "Compare resulting Part 1 and Part 2 areas in real time."
            ),
            keyTakeaways = listOf(
                "Half-plane clipping converges split line position using binary search.",
                "Protects against convex overshoot using centroid clamping."
            ),
            targetRoute = "cad"
        ),
        TutorialEpisode(
            id = "ep-11",
            number = 11,
            title = "FMB G-Line & Offset Ladder Sketching",
            subtitle = "Field Measurement Book Perpendicular Offsets",
            category = "CAD & GIS",
            duration = "06:10",
            summary = "Reconstruct rural Indian FMB sub-division sketches from chainage along the G-line baseline and Left/Right offsets.",
            steps = listOf(
                "Switch to FMB Ladder panel in Drafting Studio.",
                "Add chainage distance along G-line, perpendicular offset (m), and L/R side.",
                "Generate closed boundary vertices automatically and export DXF."
            ),
            keyTakeaways = listOf(
                "Faithful digital replica of South Indian Revenue FMB chain-and-offset method.",
                "Exports directly to standard AutoCAD LWPOLYLINE DXF."
            ),
            targetRoute = "cad"
        ),
        TutorialEpisode(
            id = "ep-12",
            number = 12,
            title = "GPS Boundary Walk & Static Averaging",
            subtitle = "Live Corner Tagging with Fused Location",
            category = "GPS & Map",
            duration = "07:45",
            summary = "Walk parcel boundaries using Android FusedLocationProviderClient with Kalman smoothing and GCP calibration.",
            steps = listOf(
                "Grant Precise Location permission on the GPS Walk workspace.",
                "Tap 'Capture Corner' at each boundary peg or trigger 20-epoch Static Averaging.",
                "Apply Ground Control Point (GCP) differential offset if a known benchmark exists."
            ),
            keyTakeaways = listOf(
                "Automatically detects your Indian state and UTM Zone (42N–47N).",
                "Computes live Haversine perimeter and local tangent-plane polygon area."
            ),
            targetRoute = "gps"
        ),
        TutorialEpisode(
            id = "ep-13",
            number = 13,
            title = "ISRO Bhuvan WMS & UTM Grid Reference",
            subtitle = "LULC, Cadastral & Satellite Layer Configuration",
            category = "GPS & Map",
            duration = "05:40",
            summary = "Inspect Bhuvan WMS endpoint layers, EPSG projections, DMS coordinates, and Easting/Northing UTM grid coordinates.",
            steps = listOf(
                "Open the Bhuvan / Coordinate Inspector drawer inside GPS Walk.",
                "Select regional Bhuvan cadastral or LULC layer preset.",
                "Copy WGS84 DMS and UTM zone coordinates into your survey notes."
            ),
            keyTakeaways = listOf(
                "Clean WGS84-to-UTM forward projection built natively in Kotlin.",
                "Displays live Bhuvan WMS metadata for Andhra Pradesh, Telangana, Maharashtra, and pan-India."
            ),
            targetRoute = "gps"
        ),
        TutorialEpisode(
            id = "ep-14",
            number = 14,
            title = "GIS Import & AutoCAD DXF / GeoJSON / KML",
            subtitle = "Zero-Permission Storage Access Framework Workflows",
            category = "CAD & GIS",
            duration = "06:25",
            summary = "Import `.geojson`, `.kml`, and `.dxf` boundary files via Android SAF and export clean survey files.",
            steps = listOf(
                "Open Import/Export workspace.",
                "Tap 'Import GIS File' to pick any `.geojson`, `.kml`, or `.dxf` via system picker.",
                "Inspect vertex count, area, and re-export to AutoCAD DXF, GeoJSON, or KML."
            ),
            keyTakeaways = listOf(
                "No broad storage permissions required—100% Google Play compliant.",
                "Load imported polygons directly into Drafting Studio for editing."
            ),
            targetRoute = "gis"
        ),
        TutorialEpisode(
            id = "ep-15",
            number = 15,
            title = "Cloud Project Vault & Sync Architecture",
            subtitle = "Google Sign-In & Firestore Multi-Device Sync",
            category = "Projects & Market",
            duration = "05:55",
            summary = "Persist every calculation, traverse, CAD sketch, and GPS walk in your private Firestore Survey Vault.",
            steps = listOf(
                "Sign in with your Google Account via Android Credential Manager.",
                "Save any survey from Calculator, Drafting Studio, or GPS Walk.",
                "Edit project field notes or promote a surveyed plot to the Land Marketplace."
            ),
            keyTakeaways = listOf(
                "Strict Firestore security rules isolate private projects to your Google UID.",
                "Real-time SnapshotListener keeps lists synced across devices."
            ),
            targetRoute = "projects"
        ),
        TutorialEpisode(
            id = "ep-16",
            number = 16,
            title = "Land Marketplace & Photo Picker",
            subtitle = "Publishing Surveyed Parcels Securely",
            category = "Projects & Market",
            duration = "06:35",
            summary = "Publish land listings with Survey No., state, Cents/Gaj/Acres breakdown, and plot photos using Android Photo Picker.",
            steps = listOf(
                "Open Market workspace and tap 'Publish Plot'.",
                "Attach a parcel image using the zero-permission Android Photo Picker.",
                "Seller phone and email remain isolated in `market_seller_data`."
            ),
            keyTakeaways = listOf(
                "Firestore rules block self-verification flags to maintain marketplace integrity.",
                "Supports instant state & district filtering."
            ),
            targetRoute = "market"
        ),
        TutorialEpisode(
            id = "ep-17",
            number = 17,
            title = "AI Plot Advisor: Gemini Cadastral Expert",
            subtitle = "Dispute Risk Checks, State Law Q&A & Audit",
            category = "AI Tools",
            duration = "06:45",
            summary = "Consult the Firebase AI Logic Gemini advisor on Indian state unit conversions, boundary disputes, and traverse audits.",
            steps = listOf(
                "Tap the AI Advisor button in the app bar.",
                "Choose a quick prompt or ask any question about regional ROR records or geometry.",
                "Review structured recommendations tailored to your active state."
            ),
            keyTakeaways = listOf(
                "Powered securely by Firebase AI Logic with App Check protection.",
                "Zero client API keys embedded in APK."
            ),
            targetRoute = "calc"
        ),
        TutorialEpisode(
            id = "ep-18",
            number = 18,
            title = "AI Land Document Scanner & OCR Extractor",
            subtitle = "Parse Patta, 7/12 Extract, Adangal & Pahani Photos",
            category = "AI Tools",
            duration = "07:15",
            summary = "Pick a photo of a land deed or FMB sketch and extract Survey Number, State, Area, Boundaries, and Owners as structured JSON.",
            steps = listOf(
                "Launch Land Document Scanner from the AI toolbar or Calculator.",
                "Select a deed or 7/12 image with Android Photo Picker.",
                "Extract structured fields and auto-load area values into the calculator."
            ),
            keyTakeaways = listOf(
                "Multimodal Gemini structured JSON output validates every extracted field.",
                "Highlights confidence notes and missing measurements for field verification."
            ),
            targetRoute = "calc"
        )
    )
}
