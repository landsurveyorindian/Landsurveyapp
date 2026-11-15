# Sthal Measure (Android)

Native **Kotlin + Jetpack Compose** GIS and land surveying application for Indian landowners, licensed surveyors, civil engineers, and revenue officials.

## Key Features
- **36 States & UTs Unit Catalog & Converter**: Accurate bidirectional conversion across Cents, Guntas, Pucca/Kacha Bigha, Kanal, Marla, Ground, Ankanam, Square Yards, Square Feet, Acres, and Hectares.
- **Field Triangulation & Traverse Calculator**:
  - 4-Sided Plots with Measured Diagonal (Heron split + vertex plot preview)
  - 4-Sided Plots without Diagonal (Brahmagupta cyclic upper bound vs. Patwari average comparison)
  - 3-Sided Triangles (Heron formula)
  - Hissa Co-Owner Fractional Partitioning
  - Bowditch Closed Traverse Sheet with misclosure adjustment and relative precision grading
- **CAD Drafting Studio**: COGO bearing/distance plotting, building setback buffer polygon, ratio split subdivision, and FMB G-Line ladder offsets on an interactive `Canvas`.
- **GNSS Boundary Walk & UTM Projection**: `FusedLocationProviderClient` GPS tracking with 2D Kalman filtering, static epoch averaging, WGS84-to-UTM coordinate conversion, and automatic Indian state detection.
- **GIS Import / Export**: System Storage Access Framework (SAF) import and export for AutoCAD `.dxf`, `.geojson`, and `.kml` polygons.
- **Firebase Cloud Vault, Marketplace & AI Logic**:
  - Google Sign-In via Jetpack Credential Manager (`GetSignInWithGoogleOption`)
  - Cloud-synced Survey Vault (`survey_projects`) and Land Marketplace (`market_listings` + owner-only `market_seller_data`) protected by Firebase App Check and zero-trust `firestore.rules`
  - AI Plot Advisor and structured JSON Land Document Scanner (7/12, ROR, Patta) powered by Firebase AI Logic
  - 18-Episode Guided Surveying Academy and in-app issue reporting (`bug_reports`)

## Build & Testing
```bash
# Build Android Debug APK
gradle assembleDebug

# Run JS Firestore Security Rules tests (requires Firestore emulator at 127.0.0.1:8085)
FIRESTORE_EMULATOR_HOST="127.0.0.1:8085" node --test firestore.test.mjs

# Run Android unit & Robolectric tests (domain engines, Firestore rule tests, Compose UI tests)
gradle :app:testDebugUnitTest --rerun-tasks
```
