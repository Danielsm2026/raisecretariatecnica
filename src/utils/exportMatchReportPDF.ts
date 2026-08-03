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

  const startersLocal = jugadoresLocal.filter((p) => p.isTitular);
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

  const startersVisitante = jugadoresVisitante.filter((p) => p.isTitular);
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
