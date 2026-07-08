import { jsPDF } from 'jspdf';
import { generateMandala } from './certificateService';

export interface SessionData {
  userName: string;
  date: string;
  message: string;
  symbolType?: string;
  breathsCompleted?: number;
  duration?: string;
  practiceType?: string;
  sessionId?: string;
  sessionDurationMinutes?: number;
}

/**
 * Certificate Generator Service
 * Creates PDF certificates with AI-generated mandalas
 */
class CertificateGenerator {
  /**
   * Generates a complete PDF certificate with mandala
   */
  async generateCertificate(sessionData: SessionData): Promise<{
    pdf: jsPDF;
    mandala: { imageData: string; timestamp: string };
    filename: string;
  }> {
    // Generate unique mandala first
    const mandalaImageData = await generateMandala({
      userName: sessionData.userName,
      date: sessionData.date,
      message: sessionData.message,
      symbolType: sessionData.symbolType || 'space',
    });

    const timestamp = new Date().toISOString();

    // Create PDF certificate (landscape A4)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Set background (dark navy from app: #0f172a = rgb(15, 23, 42))
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 297, 210, 'F');

    // Add golden border (golden-bronze: #D4A574 = rgb(212, 165, 116))
    pdf.setDrawColor(212, 165, 116);
    pdf.setLineWidth(2);
    pdf.rect(10, 10, 277, 190);

    // Add decorative corner flourishes
    this.drawCornerFlourishes(pdf);

    // Add mandala image (centered top)
    try {
      // jsPDF can handle data URLs directly, but we need to ensure it's in the right format
      // The mandala is already a data URL from generateMandala
      if (mandalaImageData && mandalaImageData.startsWith('data:image')) {
        pdf.addImage(mandalaImageData, 'PNG', 118.5, 30, 60, 60);
      } else {
        console.warn('Mandala image data format not recognized');
      }
    } catch (error) {
      console.error('Failed to add mandala to PDF:', error);
      // Continue without mandala if it fails
    }

    // Add decorative wave (signature element)
    this.drawWave(pdf, 148.5, 100);

    // Add main text
    pdf.setTextColor(212, 165, 116); // Golden-bronze
    pdf.setFontSize(40);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`congrats ${sessionData.userName}`, 148.5, 115, { align: 'center' });

    // Add date
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(16);
    pdf.text(sessionData.date, 148.5, 130, { align: 'center' });

    // Add motivational message
    pdf.setFontSize(24);
    pdf.setTextColor(212, 165, 116);
    pdf.text(sessionData.message || 'Small breaths. Big shifts.', 148.5, 150, { align: 'center' });

    // Add session details at bottom (if provided)
    if (sessionData.breathsCompleted || sessionData.duration || sessionData.practiceType) {
      const details: string[] = [];
      if (sessionData.breathsCompleted) {
        details.push(`${sessionData.breathsCompleted} breaths`);
      }
      if (sessionData.duration) {
        details.push(sessionData.duration);
      }
      if (sessionData.practiceType) {
        details.push(`${sessionData.practiceType} energy`);
      }

      pdf.setFontSize(12);
      pdf.setTextColor(160, 160, 160);
      pdf.text(details.join(' • '), 148.5, 175, { align: 'center' });
    }

    // Add "The School of Breath" at bottom
    pdf.setFontSize(14);
    pdf.setTextColor(120, 120, 120);
    pdf.text('The School of Breath', 148.5, 190, { align: 'center' });

    // Add unique certificate ID (for authenticity)
    const certificateId = `${timestamp.substring(0, 10)}-${sessionData.sessionId || Date.now().toString().slice(-6)}`;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Certificate ID: ${certificateId}`, 148.5, 200, { align: 'center' });

    return {
      pdf: pdf,
      mandala: {
        imageData: mandalaImageData,
        timestamp: timestamp,
      },
      filename: `breath-certificate-${sessionData.userName.replace(/\s+/g, '-')}-${sessionData.date.replace(/\s+/g, '-')}.pdf`,
    };
  }

  /**
   * Draws decorative corner flourishes
   */
  private drawCornerFlourishes(pdf: jsPDF): void {
    pdf.setDrawColor(212, 165, 116);
    pdf.setLineWidth(0.5);
    const cornerSize = 15;

    // Top-left corner
    pdf.line(10, 10, 10 + cornerSize, 10);
    pdf.line(10, 10, 10, 10 + cornerSize);
    pdf.circle(10, 10, 2, 'S');

    // Top-right corner
    pdf.line(287, 10, 287 - cornerSize, 10);
    pdf.line(287, 10, 287, 10 + cornerSize);
    pdf.circle(287, 10, 2, 'S');

    // Bottom-left corner
    pdf.line(10, 200, 10 + cornerSize, 200);
    pdf.line(10, 200, 10, 200 - cornerSize);
    pdf.circle(10, 200, 2, 'S');

    // Bottom-right corner
    pdf.line(287, 200, 287 - cornerSize, 200);
    pdf.line(287, 200, 287, 200 - cornerSize);
    pdf.circle(287, 200, 2, 'S');
  }

  /**
   * Draws signature wave element
   */
  private drawWave(pdf: jsPDF, x: number, y: number): void {
    pdf.setDrawColor(212, 165, 116);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(212, 165, 116);
    pdf.setGState(pdf.GState({ opacity: 0.3 }));

    // Draw wave pattern (simplified sine wave)
    const waveHeight = 8;
    const waveLength = 40;
    const points: number[][] = [];

    for (let i = 0; i <= waveLength; i++) {
      const px = x - waveLength / 2 + i;
      const py = y + Math.sin((i / waveLength) * Math.PI * 4) * waveHeight;
      points.push([px, py]);
    }

    // Draw wave line
    for (let i = 0; i < points.length - 1; i++) {
      pdf.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    }

    pdf.setGState(pdf.GState({ opacity: 1.0 }));
  }

  /**
   * Downloads the generated PDF certificate
   */
  async downloadCertificate(sessionData: SessionData): Promise<void> {
    const result = await this.generateCertificate(sessionData);
    result.pdf.save(result.filename);
  }

  /**
   * Returns the PDF as a blob URL for preview/download
   */
  async getCertificateBlob(sessionData: SessionData): Promise<{
    blobUrl: string;
    filename: string;
  }> {
    const result = await this.generateCertificate(sessionData);
    const pdfBlob = result.pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    return {
      blobUrl,
      filename: result.filename,
    };
  }
}

export default new CertificateGenerator();

