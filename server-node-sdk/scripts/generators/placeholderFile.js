'use strict';

// ─── Placeholder Medical PDF Generator ───────────────────────────────────────
// Creates a minimal valid PDF buffer (~600 bytes) for IPFS upload seeding.
// This avoids storing/generating large files while maintaining a real CID.

/**
 * Generate a lightweight valid PDF buffer.
 * Contains a single page with a brief medical report header.
 * @returns {Buffer}
 */
const generatePlaceholderPDF = () => {
    // Minimal valid PDF 1.4 structure
    const content = [
        '%PDF-1.4',
        '1 0 obj',
        '<< /Type /Catalog /Pages 2 0 R >>',
        'endobj',
        '2 0 obj',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        'endobj',
        '3 0 obj',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]',
        '   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        'endobj',
        '4 0 obj',
        '<< /Length 120 >>',
        'stream',
        'BT',
        '/F1 16 Tf',
        '72 720 Td',
        '(EHR Blockchain - Sample Medical Report) Tj',
        '0 -24 Td',
        '/F1 12 Tf',
        '(Placeholder document for system seeding.) Tj',
        'ET',
        'endstream',
        'endobj',
        '5 0 obj',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        'endobj',
        'xref',
        '0 6',
        '0000000000 65535 f ',
        '0000000009 00000 n ',
        '0000000058 00000 n ',
        '0000000115 00000 n ',
        '0000000266 00000 n ',
        '0000000438 00000 n ',
        'trailer',
        '<< /Size 6 /Root 1 0 R >>',
        'startxref',
        '520',
        '%%EOF',
    ].join('\n');

    return Buffer.from(content, 'utf-8');
};

module.exports = { generatePlaceholderPDF };
