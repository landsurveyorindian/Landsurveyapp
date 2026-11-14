import { jsPDF } from 'jspdf';
import { SurveyProject } from '../services/projectsService';
import { getUtmZoneForLngLat, projectWgs84ToUtm } from './geometryValidation';

export interface PdfExportOptions {
  includeDisclaimer?: boolean;
}

/**
 * Generate and download a PDF report for a survey measurement summary.
 * Strictly adheres to non-legal, self-measured disclaimer requirements.
 */
export function generateSurveyReportPdf(project: SurveyProject, options: PdfExportOptions = {}): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('STHAL MEASURE', margin, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text('Survey Measurement Summary', margin, y);

  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('(Self-Measured Reference — Not an Official Legal Document)', margin, y);

  // Top metadata box
  y += 6;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const col1 = margin + 4;
  const col2 = margin + 95;

  doc.text(`Project Name: ${project.name}`, col1, y + 6);
  doc.text(`State / Standard: ${project.state}`, col1, y + 12);
  doc.text(`Survey Type: ${project.type}`, col1, y + 18);

  doc.text(`Ref ID: ${project.id}`, col2, y + 6);
  doc.text(`Recorded Date: ${new Date(project.createdAt).toLocaleDateString()}`, col2, y + 12);
  doc.text(`Source: Sthal Measure GNSS / CAD Module`, col2, y + 18);

  y += 26;

  // Prominent Legal Disclaimer Banner (Required by Part 1, Item 2)
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.setFillColor(254, 252, 232); // amber-50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('LEGAL DISCLAIMER & NOTICE:', col1, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15);
  const disclaimerText =
    'This summary is generated from self-reported device GNSS coordinates and manual vertex inputs for calculation and planning reference only. It does NOT constitute an official government survey record, cadastral title deed, or legal land registry endorsement. For official transactions, obtain certified revenue records from your state land revenue portal.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2 - 8);
  doc.text(splitDisclaimer, col1, y + 9);

  y += 20;

  // Extent Metrics Table
  if (project.polygon) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Calculated Land Extent & Dimensions', margin, y);
    y += 4;

    const boxWidth = (pageWidth - margin * 2 - 9) / 4;
    const boxHeight = 16;

    const metrics = [
      { label: 'ACRES', value: `${project.polygon.areaAcres}` },
      { label: 'CENTS', value: `${project.polygon.areaCents}` },
      { label: 'SQ. METERS', value: `${project.polygon.areaSqm?.toLocaleString()}` },
      { label: 'VERTICES', value: `${project.polygon.coordinates.length} Corners` },
    ];

    metrics.forEach((m, idx) => {
      const bx = margin + idx * (boxWidth + 3);
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bx, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, bx + 3, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(m.value, bx + 3, y + 12);
    });

    y += boxHeight + 6;

    // Coordinate Table (Auto-detecting UTM Zone!)
    if (project.polygon.coordinates && project.polygon.coordinates.length > 0) {
      const firstCoord = project.polygon.coordinates[0];
      const autoZone = getUtmZoneForLngLat(firstCoord[0], firstCoord[1]);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Boundary Corner Coordinates (WGS84 & ${autoZone.name})`, margin, y);
      y += 4;

      // Table Header
      const colWidths = [18, 38, 38, 44, 44];
      const headers = ['Station', 'Latitude (°N)', 'Longitude (°E)', `${autoZone.name} Easting`, `${autoZone.name} Northing`];

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, pageWidth - margin * 2, 7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      let currentX = margin;
      headers.forEach((h, i) => {
        doc.text(h, currentX + 2, y + 5);
        currentX += colWidths[i];
      });
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      const rowsToShow = project.polygon.coordinates.slice(0, 20); // First 20 stations
      rowsToShow.forEach((coord, rIdx) => {
        const utm = projectWgs84ToUtm(coord[0], coord[1], autoZone.epsgCode);
        currentX = margin;

        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
        }

        doc.text(`Stn ${rIdx + 1}`, currentX + 2, y + 4.5);
        currentX += colWidths[0];
        doc.text(coord[1].toFixed(6), currentX + 2, y + 4.5);
        currentX += colWidths[1];
        doc.text(coord[0].toFixed(6), currentX + 2, y + 4.5);
        currentX += colWidths[2];
        doc.text(`${utm.easting.toLocaleString()} m`, currentX + 2, y + 4.5);
        currentX += colWidths[3];
        doc.text(`${utm.northing.toLocaleString()} m`, currentX + 2, y + 4.5);

        y += 6;
      });

      if (project.polygon.coordinates.length > 20) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`... and ${project.polygon.coordinates.length - 20} additional stations. Download GeoJSON/DXF for complete vector points.`, margin, y + 4);
        y += 6;
      }

      y += 4;
    }

    // Boundary Edge lengths
    if (project.polygon.edgeLengths && project.polygon.edgeLengths.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Boundary Side Dimensions', margin, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      const edgeStrings = project.polygon.edgeLengths
        .slice(0, 12)
        .map((e) => `Side ${e.index}: ${e.lengthMeters}m (${e.lengthFeet}ft)`);

      const edgeText = edgeStrings.join('  •  ');
      const splitEdges = doc.splitTextToSize(edgeText, pageWidth - margin * 2);
      doc.text(splitEdges, margin, y);
      y += splitEdges.length * 4 + 4;
    }
  }

  // Footer Disclaimer (Non-official acknowledgment)
  y = Math.max(y + 6, 260);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Sthal Measure GIS Tool • Generated for private field calculation • Not an authorized cadastral title certificate', margin, y + 4);
  doc.text(`Export Timestamp: ${new Date().toISOString()}`, margin, y + 8);

  // Save PDF
  const safeName = project.name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  doc.save(`sthal_measure_${safeName}_summary.pdf`);
}
