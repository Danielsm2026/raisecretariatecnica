import { jsPDF } from 'jspdf';
import { ScoutedPlayer } from '../types';
import { getPlayerEscudoUrl, getCategoryEscudoUrl } from './escudoHelper';

async function urlToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  const loadImageDataUrl = (imgSrc: string, useCrossOrigin = true): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      if (useCrossOrigin) img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 120;
          canvas.height = img.naturalHeight || img.height || 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            if (dataUrl && dataUrl.length > 100) {
              resolve(dataUrl);
              return;
            }
          }
        } catch (err) {
          console.warn('Canvas toDataURL SecurityError for:', imgSrc, err);
        }
        resolve(null);
      };

      img.onerror = () => resolve(null);
      img.src = imgSrc;
    });
  };

  const fetchToDataUrl = async (targetUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result || null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // 1. Direct canvas load
  let data = await loadImageDataUrl(url, true);
  if (data) return data;

  // 2. Direct fetch
  data = await fetchToDataUrl(url);
  if (data) return data;

  // 3. Try CORS proxy fallbacks
  const proxiedUrls = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  for (const proxied of proxiedUrls) {
    data = await fetchToDataUrl(proxied);
    if (data) return data;
    data = await loadImageDataUrl(proxied, true);
    if (data) return data;
  }

  return null;
}

export async function exportPlayerReportPDF(
  player: ScoutedPlayer,
  reportData?: {
    equipo?: string;
    altura?: string;
    fotoUrl?: string;
    escudoUrl?: string;
    recomendacion?: string;
    recomendacionComentario?: string;
    descripcionGeneral?: string;
    fortalezas?: string;
    debilidades?: string;
    enSuEquipo?: string;
    enPocasPalabras?: string;
    tieneValorPor?: string;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const equipo = reportData?.equipo || player.equipo || 'Real Avilés Industrial';
  const altura = reportData?.altura || player.altura || '-';
  const recomendacion = reportData?.recomendacion || player.recomendacion || 'SEGUIR';
  const recomendacionComentario = reportData?.recomendacionComentario || player.recomendacionComentario || '';
  const descripcionGeneral = reportData?.descripcionGeneral || player.descripcionGeneral || '';
  const fortalezas = reportData?.fortalezas || player.fortalezas || '';
  const debilidades = reportData?.debilidades || player.debilidades || '';
  const enSuEquipo = reportData?.enSuEquipo || player.enSuEquipo || '';
  const enPocasPalabras = reportData?.enPocasPalabras || player.enPocasPalabras || '';
  const tieneValorPor = reportData?.tieneValorPor || player.tieneValorPor || '';

  const playerPhotoUrl = reportData?.fotoUrl || player.fotoUrl || '';
  const escudoUrl = reportData?.escudoUrl || getPlayerEscudoUrl(player);
  const categoryEscudoUrl = getCategoryEscudoUrl(player.categoria);

  // Preload player photo, team escudo, and category escudo as Data URLs for jsPDF
  const [playerPhotoData, escudoData, categoryData] = await Promise.all([
    urlToDataUrl(playerPhotoUrl),
    urlToDataUrl(escudoUrl),
    urlToDataUrl(categoryEscudoUrl)
  ]);

  const age = player.anoNacimiento ? new Date().getFullYear() - player.anoNacimiento : '-';

  // --- Top Header Bar ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DEPARTAMENTO DE SCOUTING', 12, 10);

  doc.setFontSize(11);
  doc.text('REAL AVILÉS INDUSTRIAL CLUB DE FÚTBOL', 198, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`EXPEDIENTE DEPORTIVO • ID: ${player.id} • FECHA: ${new Date().toLocaleDateString('es-ES')}`, 12, 17);

  let y = 28;

  // --- Category Logo (Left side) ---
  if (categoryData) {
    try {
      doc.addImage(categoryData, 'PNG', 12, y - 7, 36, 16);
    } catch {
      // Fallback text if image rendering fails
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(player.categoria || 'Primera RFEF', 12, y);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(player.categoria || 'Primera RFEF', 12, y);
  }

  // --- Document Title (Centered) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORME DESCRIPTIVO', 105, y, { align: 'center' });

  // Recommendation Badge Box
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(135, y - 6, 63, 12, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`★ RECOMENDACIÓN: ${recomendacion}`, 166.5, y - 1, { align: 'center' });
  if (recomendacionComentario) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    const splitCom = doc.splitTextToSize(recomendacionComentario, 60);
    doc.text(splitCom[0] || '', 166.5, y + 3, { align: 'center' });
  }

  y += 12;

  // --- Player Main Card Header Box with Photo & Escudo ---
  const mainCardHeight = 28;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, 186, mainCardHeight, 1.5, 1.5, 'FD');

  // Player Photo rendering
  const photoSize = 22;
  const photoX = 15;
  const photoY = y + 3;

  if (playerPhotoData) {
    try {
      doc.addImage(playerPhotoData, 'PNG', photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(203, 213, 225);
      doc.rect(photoX, photoY, photoSize, photoSize);
    } catch {
      // Fallback photo box
      doc.setFillColor(226, 232, 240);
      doc.rect(photoX, photoY, photoSize, photoSize, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(player.nombre.charAt(0).toUpperCase(), photoX + photoSize / 2, photoY + 14, { align: 'center' });
    }
  } else {
    // Placeholder photo box
    doc.setFillColor(226, 232, 240);
    doc.rect(photoX, photoY, photoSize, photoSize, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(player.nombre.charAt(0).toUpperCase(), photoX + photoSize / 2, photoY + 14, { align: 'center' });
  }

  // Player Name & Position (Next to photo)
  const infoX = 42;
  doc.setTextColor(220, 38, 38); // red-600
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA JUGADOR', infoX, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(player.nombre.toUpperCase(), infoX, y + 14);

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`POSICIÓN: ${player.posicion.toUpperCase()}`, infoX, y + 20);

  // Table Data on Right Side of Main Card Box with Team Escudo
  const rightX = 112;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  // Team Crest rendering
  let equipoTextX = rightX;
  if (escudoData) {
    try {
      const escudoSize = 7;
      doc.addImage(escudoData, 'PNG', rightX, y + 3.5, escudoSize, escudoSize);
      equipoTextX = rightX + escudoSize + 2;
    } catch {
      equipoTextX = rightX;
    }
  }

  doc.text(`Equipo: ${equipo}`, equipoTextX, y + 8.5);
  doc.text(`Año Nacimiento / Edad: ${player.anoNacimiento} (${age} años)`, rightX, y + 15);
  doc.text(`Pie / Altura: ${player.lateralidad} / ${altura}`, rightX, y + 21.5);

  y += mainCardHeight + 6;

  // Helper for section headers
  const drawSectionHeader = (title: string, bgR = 15, bgG = 23, bgB = 42) => {
    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(12, y, 186, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 15, y + 4.2);
    y += 6;
  };

  const drawTextBlock = (content: string, minH = 18) => {
    const textWidth = 180;
    const lines = doc.splitTextToSize(content || 'Sin datos registrados.', textWidth);

    const contentHeight = Math.max(minH, lines.length * 4.5 + 4);
    
    if (y + contentHeight > 280) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(12, y, 186, contentHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    let textY = y + 5;
    lines.forEach((l: string) => {
      doc.text(l, 15, textY);
      textY += 4.5;
    });

    y += contentHeight + 4;
  };

  // --- Section 1: DESCRIPCIÓN GENERAL ---
  drawSectionHeader('DESCRIPCIÓN GENERAL DEL JUGADOR');
  drawTextBlock(descripcionGeneral, 16);

  // --- Two Columns Layout for FORTALEZAS & DEBILIDADES ---
  const colW = 91;
  const colGap = 4;
  
  const fortLines: string[] = [];
  fortalezas.split('\n').forEach(l => {
    const cleaned = l.trim().replace(/^[\s·•\-*\d+.)]+/, '');
    if (cleaned) fortLines.push(...doc.splitTextToSize(`• ${cleaned}`, colW - 6));
  });
  if (fortLines.length === 0) fortLines.push('Sin puntos destacados.');

  const debLines: string[] = [];
  debilidades.split('\n').forEach(l => {
    const cleaned = l.trim().replace(/^[\s·•\-*\d+.)]+/, '');
    if (cleaned) debLines.push(...doc.splitTextToSize(`• ${cleaned}`, colW - 6));
  });
  if (debLines.length === 0) debLines.push('Sin aspectos señalados.');

  const twoColHeight = Math.max(30, Math.max(fortLines.length, debLines.length) * 4.5 + 10);

  if (y + twoColHeight > 280) {
    doc.addPage();
    y = 15;
  }

  // Left col header: FORTALEZAS
  doc.setFillColor(30, 41, 59);
  doc.rect(12, y, colW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PUNTOS FUERTES / VIRTUDES', 15, y + 3.8);

  // Right col header: DEBILIDADES
  doc.setFillColor(153, 27, 27); // red-800
  doc.rect(12 + colW + colGap, y, colW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ASPECTOS A MEJORAR / DEBILIDADES', 12 + colW + colGap + 3, y + 3.8);

  const bodyY = y + 5.5;

  // Left col body
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, bodyY, colW, twoColHeight - 5.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  let fy = bodyY + 4.5;
  fortLines.forEach(l => {
    doc.text(l, 15, fy);
    fy += 4.2;
  });

  // Right col body
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202);
  doc.rect(12 + colW + colGap, bodyY, colW, twoColHeight - 5.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  let dy = bodyY + 4.5;
  debLines.forEach(l => {
    doc.text(l, 12 + colW + colGap + 3, dy);
    dy += 4.2;
  });

  y += twoColHeight + 4;

  // --- Section 3: DESEMPEÑO EN SU EQUIPO ---
  drawSectionHeader('DESEMPEÑO Y ROL EN SU EQUIPO');
  drawTextBlock(enSuEquipo, 14);

  // --- Two Columns Bottom: EN POCAS PALABRAS & TIENE VALOR POR ---
  const pocasLines: string[] = [];
  enPocasPalabras.split('\n').forEach(l => {
    const cleaned = l.trim().replace(/^[\s·•\-*\d+.)]+/, '');
    if (cleaned) pocasLines.push(...doc.splitTextToSize(`• ${cleaned}`, colW - 6));
  });
  if (pocasLines.length === 0) pocasLines.push('Sin notas.');

  const valorLines: string[] = [];
  tieneValorPor.split('\n').forEach(l => {
    const cleaned = l.trim().replace(/^[\s·•\-*\d+.)]+/, '');
    if (cleaned) valorLines.push(...doc.splitTextToSize(`• ${cleaned}`, colW - 6));
  });
  if (valorLines.length === 0) valorLines.push('Sin notas.');

  const botColHeight = Math.max(26, Math.max(pocasLines.length, valorLines.length) * 4.5 + 10);

  if (y + botColHeight > 280) {
    doc.addPage();
    y = 15;
  }

  // Header 1: EN POCAS PALABRAS
  doc.setFillColor(30, 58, 138); // blue-900
  doc.rect(12, y, colW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EN POCAS PALABRAS', 15, y + 3.8);

  // Header 2: TIENE VALOR POR
  doc.setFillColor(6, 78, 59); // emerald-900
  doc.rect(12 + colW + colGap, y, colW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TIENE VALOR POR', 12 + colW + colGap + 3, y + 3.8);

  const botBodyY = y + 5.5;

  // Body 1
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, botBodyY, colW, botColHeight - 5.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  let py = botBodyY + 4.5;
  pocasLines.forEach(l => {
    doc.text(l, 15, py);
    py += 4.2;
  });

  // Body 2
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.rect(12 + colW + colGap, botBodyY, colW, botColHeight - 5.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  let vy = botBodyY + 4.5;
  valorLines.forEach(l => {
    doc.text(l, 12 + colW + colGap + 3, vy);
    vy += 4.2;
  });

  y += botColHeight + 6;

  // Footer / Seal
  const footerY = Math.min(288, Math.max(y, 280));
  doc.setDrawColor(203, 213, 225);
  doc.line(12, footerY - 3, 198, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`DOCUMENTO OFICIAL REF: REAL_AVILES_OJEADOS_${player.id}`, 12, footerY);
  doc.text('DEPARTAMENTO DE SCOUTING • REAL AVILÉS INDUSTRIAL CF', 105, footerY, { align: 'center' });
  doc.text('FIRMADO ELECTRÓNICAMENTE', 198, footerY, { align: 'right' });

  // Save the PDF
  const filename = `Informe_${player.nombre.replace(/\s+/g, '_')}_RealAviles.pdf`;
  doc.save(filename);
}
