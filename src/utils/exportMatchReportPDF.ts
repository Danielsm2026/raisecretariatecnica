import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatchPlayer } from '../types';

export interface ExportMatchReportOptions {
  competicion: string;
  fecha: string;
  partido: string;
  fechaHoraDetallada?: string;
  autor: string;
  equipoLocal: string;
  equipoVisitante: string;
  golesLocal: number;
  golesVisitante: number;
  comentariosLocal?: string;
  comentariosVisitante?: string;
  jugadoresLocal: MatchPlayer[];
  jugadoresVisitante: MatchPlayer[];
  escudoLocal?: string;
  escudoVisitante?: string;
}

export async function exportMatchReportPDF(data: ExportMatchReportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    competicion,
    fecha,
    autor,
    equipoLocal,
    equipoVisitante,
    golesLocal,
    golesVisitante,
    comentariosLocal,
    comentariosVisitante,
    jugadoresLocal,
    jugadoresVisitante,
    fechaHoraDetallada
  } = data;

  // Header Colors
  const primaryColor = [15, 23, 42]; // Slate 900

  // Top Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 26, 'F');

  // Title Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('ACTA DE PARTIDO - SCOUTING', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Real Avilés Industrial | Ojeador: ${autor || 'Daniel'}`, 14, 20);

  // Top Right Info
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(competicion || 'Competición', 196, 13, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(fecha || new Date().toISOString().split('T')[0], 196, 20, { align: 'right' });

  let y = 32;

  // Scoreboard Card Box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);

  // Team names and score
  const locName = equipoLocal || 'Equipo Local';
  const visName = equipoVisitante || 'Equipo Visitante';
  const scoreText = `${golesLocal} - ${golesVisitante}`;

  doc.text(locName, 55, y + 13, { align: 'center' });

  // Score badge
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(95, y + 4, 20, 14, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(scoreText, 105, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(visName, 155, y + 13, { align: 'center' });

  if (fechaHoraDetallada) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(fechaHoraDetallada, 105, y + 20, { align: 'center' });
  }

  y += 28;

  // --- TACTICAL PITCHES SECTION ---
  const startersLocal = jugadoresLocal.filter((p) => p.isTitular);
  const startersVisitante = jugadoresVisitante.filter((p) => p.isTitular);

  const drawTacticalPitch = (
    startX: number,
    startY: number,
    width: number,
    height: number,
    teamName: string,
    players: MatchPlayer[],
    badgeColor: [number, number, number],
    accentTitleColor: [number, number, number]
  ) => {
    // Pitch header banner
    doc.setFillColor(accentTitleColor[0], accentTitleColor[1], accentTitleColor[2]);
    doc.rect(startX, startY, width, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`TÁCTICA: ${teamName.toUpperCase()}`, startX + width / 2, startY + 3.8, { align: 'center' });

    const pitchYStart = startY + 5.5;
    const pitchH = height - 5.5;

    // Dark emerald green pitch background
    doc.setFillColor(6, 78, 59); // emerald-900
    doc.setDrawColor(16, 185, 129); // emerald-500 line accent
    doc.setLineWidth(0.3);
    doc.roundedRect(startX, pitchYStart, width, pitchH, 1.5, 1.5, 'FD');

    // Outer boundary line
    const pad = 2.5;
    const fieldX = startX + pad;
    const fieldY = pitchYStart + pad;
    const fieldW = width - pad * 2;
    const fieldH = pitchH - pad * 2;

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.25);
    doc.rect(fieldX, fieldY, fieldW, fieldH, 'D');

    // Halfway line
    doc.line(fieldX, fieldY + fieldH / 2, fieldX + fieldW, fieldY + fieldH / 2);

    // Center circle
    const centerRadius = fieldW * 0.16;
    doc.circle(fieldX + fieldW / 2, fieldY + fieldH / 2, centerRadius, 'D');
    doc.setFillColor(255, 255, 255);
    doc.circle(fieldX + fieldW / 2, fieldY + fieldH / 2, 0.5, 'F');

    // Penalty Boxes
    const boxW = fieldW * 0.52;
    const boxH = fieldH * 0.16;
    const goalAreaW = fieldW * 0.28;
    const goalAreaH = fieldH * 0.07;

    // Top Box
    doc.rect(fieldX + (fieldW - boxW) / 2, fieldY, boxW, boxH, 'D');
    doc.rect(fieldX + (fieldW - goalAreaW) / 2, fieldY, goalAreaW, goalAreaH, 'D');

    // Bottom Box
    doc.rect(fieldX + (fieldW - boxW) / 2, fieldY + fieldH - boxH, boxW, boxH, 'D');
    doc.rect(fieldX + (fieldW - goalAreaW) / 2, fieldY + fieldH - goalAreaH, goalAreaW, goalAreaH, 'D');

    // Render starters on pitch
    players.forEach((p) => {
      const rawX = typeof p.pitchX === 'number' ? p.pitchX : 50;
      const rawY = typeof p.pitchY === 'number' ? p.pitchY : 50;

      // Convert percentage coordinates to mm inside pitch
      const px = fieldX + (rawX / 100) * fieldW;
      const py = fieldY + (rawY / 100) * fieldH;

      // Player Badge (Circle)
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.circle(px, py, 2.8, 'FD');

      // Dorsal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      const dorsalStr = p.dorsal !== undefined && p.dorsal !== null && String(p.dorsal).trim() !== '' ? String(p.dorsal) : '';
      doc.text(dorsalStr, px, py + 0.9, { align: 'center' });

      // Pts Badge if present
      if (p.pts && String(p.pts).trim() !== '' && String(p.pts) !== '-') {
        doc.setFillColor(234, 179, 8); // Yellow 500
        doc.circle(px + 2.4, py - 2.0, 1.3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4);
        doc.setTextColor(15, 23, 42);
        doc.text(String(p.pts), px + 2.4, py - 1.4, { align: 'center' });
      }

      // Name Label box below player
      doc.setFillColor(15, 23, 42); // slate 900
      doc.roundedRect(px - 7.5, py + 3.1, 15, 3.2, 0.5, 0.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.8);
      doc.setTextColor(255, 255, 255);
      const shortName = p.nombre.length > 11 ? p.nombre.slice(0, 9) + '..' : p.nombre;
      doc.text(shortName, px, py + 5.2, { align: 'center' });

      // Position label below box
      if (p.posicion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4);
        doc.setTextColor(203, 213, 225); // slate 300
        doc.text(p.posicion.toUpperCase(), px, py + 7.3, { align: 'center' });
      }
    });
  };

  const pitchHeight = 88;
  drawTacticalPitch(14, y, 86, pitchHeight, locName, startersLocal, [37, 99, 235], [30, 41, 59]);
  drawTacticalPitch(110, y, 86, pitchHeight, visName, startersVisitante, [16, 185, 129], [30, 41, 59]);

  y += pitchHeight + 6;

  // Helper function to format table data
  const formatPlayersTable = (players: MatchPlayer[]) => {
    return players.map((p) => {
      const footLabel = p.pie === 'D' ? 'Diestro' : p.pie === 'Z' ? 'Zurdo' : p.pie === 'A' ? 'Ambi' : '-';

      return [
        p.dorsal !== undefined && p.dorsal !== null && String(p.dorsal).trim() !== '' ? String(p.dorsal) : '-',
        p.nombre || '-',
        p.anoNacimiento ? String(p.anoNacimiento) : '-',
        p.posicion || '-',
        footLabel,
        p.pts ? String(p.pts) : '-',
        p.comentarios || '-'
      ];
    });
  };

  const tableHeaders = ['Nº', 'Nombre', 'Año', 'Posición', 'Pie', 'Pts', 'Observaciones / Comentarios'];

  // --- LOCAL TEAM SECTION ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`ALINEACIÓN: ${locName.toUpperCase()}`, 18, y + 5);

  y += 9;

  const subsLocal = jugadoresLocal.filter((p) => !p.isTitular);

  autoTable(doc, {
    head: [tableHeaders],
    body: formatPlayersTable(startersLocal),
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica' },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 'auto' }
    }
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  if (subsLocal.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Suplentes ${locName}:`, 14, y);
    y += 2;

    autoTable(doc, {
      head: [tableHeaders],
      body: formatPlayersTable(subsLocal),
      startY: y,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.2, font: 'helvetica' },
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 26 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 'auto' }
      }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 4;
  }

  if (comentariosLocal && comentariosLocal.trim()) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Notas Tácticas (${locName}):`, 14, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitNotesLoc = doc.splitTextToSize(comentariosLocal, 182);
    doc.text(splitNotesLoc, 14, y);
    y += splitNotesLoc.length * 3.8 + 4;
  }

  // --- VISITANTE TEAM SECTION ---
  if (y > 230) {
    doc.addPage();
    y = 20;
  } else {
    y += 4;
  }

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`ALINEACIÓN: ${visName.toUpperCase()}`, 18, y + 5);

  y += 9;

  const subsVisitante = jugadoresVisitante.filter((p) => !p.isTitular);

  autoTable(doc, {
    head: [tableHeaders],
    body: formatPlayersTable(startersVisitante),
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica' },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 'auto' }
    }
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  if (subsVisitante.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Suplentes ${visName}:`, 14, y);
    y += 2;

    autoTable(doc, {
      head: [tableHeaders],
      body: formatPlayersTable(subsVisitante),
      startY: y,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.2, font: 'helvetica' },
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 26 },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 'auto' }
      }
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 4;
  }

  if (comentariosVisitante && comentariosVisitante.trim()) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Notas Tácticas (${visName}):`, 14, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitNotesVis = doc.splitTextToSize(comentariosVisitante, 182);
    doc.text(splitNotesVis, 14, y);
    y += splitNotesVis.length * 3.8 + 4;
  }

  // Footer for all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Acta de Partido - Scouting Real Avilés Industrial | Página ${i} de ${totalPages}`, 14, 288);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 196, 288, { align: 'right' });
  }

  // Clean filename
  const cleanLoc = locName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanVis = visName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Acta_Partido_${cleanLoc}_vs_${cleanVis}_${fecha || 'reporte'}.pdf`;

  doc.save(filename);
}
