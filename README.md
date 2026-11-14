# Sthal Measure (స్థల్ మెజర్) - Smart Land Measurement & Cadastral GIS Platform

A professional land survey, cadastral GIS, and plot area calculation platform built for Indian landowners, licensed surveyors, civil engineers, and revenue patwaris.

## Node.js & Runtime Requirements
- **Node.js**: `>= 22.0.0` (Node 22 LTS or Node 24+ recommended)
- Firebase `^13.0.0` requires Node.js runtime `>= 22.0.0`.

## Modes

### 1. Simple Mode (Default)
Tailored for common landowners with zero survey background:
- **Measure My Land**: GPS perimeter walking with auto-polygon closure and instant acreage in local units (Cents, Guntas, Acres, Bigha).
- **Calculate Land Area**: 4-sided plots and triangular plots with Heron triangulation and Cyclic approximation.
- **My Saved Surveys**: Stored projects, certificates, and exportable PDF reports.
- **Land Marketplace**: Verified land listings with verified survey numbers and revenue documents.
- **Plain GPS Signal**: "GPS Signal: Good / OK / Poor" status indicator with practical walking advice instead of confusing geodetic jargon.
- **Advanced / Professional Tools**: Collapsible drawer keeping professional tools neatly organized without cluttering the screen.

### 2. Advanced Mode (For Surveyors & CAD Professionals)
- **Drafting Studio**: Complete AutoCAD-like drafting suite with Polyline, OSNAP (F3), Ortho mode (F8), coordinate tracking, layer management, and DXF download.
- **Setbacks & Subdivision**: Building clearance offsets, road widening buffers, and polygon split tools.
- **COGO (Coordinate Geometry)**: Inverse traverse, bearing & distance calculations, and coordinate station entry.
- **FMB Ladder**: Field Measurement Book G-Line ladder offset drafting and visualization.
- **Closed Traverse**: Bowditch balancing, transit rules, and angular closure sheet.
- **High-Precision GPS Engine**: 2D Kalman filter, stationary epoch averaging, and GCP benchmark calibration.
- **File Import / Export**: AutoCAD DXF, GIS Shapefile (.shp/.zip), GeoJSON, and Google Earth KML.

## Development & Testing
```bash
# Run unit test suite
npm test

# Run TypeScript linter
npm run lint

# Build production bundle
npm run build

# Start full-stack development server
npm run dev
```
