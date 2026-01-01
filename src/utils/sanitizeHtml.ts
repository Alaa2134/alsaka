import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe printing
 * Removes potentially dangerous elements while preserving layout
 */
export const sanitizeForPrint = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'tfoot',
      'img', 'svg', 'path', 'rect', 'g', 'text', 'line', 'polygon',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u',
      'header', 'footer', 'main', 'section', 'article',
      'canvas'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'id',
      'src', 'alt', 'width', 'height',
      'href', 'target',
      'colspan', 'rowspan',
      'dir', 'lang',
      // SVG attributes for barcodes
      'd', 'viewBox', 'fill', 'stroke', 'x', 'y', 'transform',
      'xmlns', 'xmlns:xlink', 'preserveAspectRatio',
      'font-size', 'font-family', 'text-anchor'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
};

/**
 * Create a safe print window with sanitized content
 */
export const createSafePrintWindow = (
  content: string,
  title: string,
  options?: {
    direction?: 'rtl' | 'ltr';
    paperWidth?: string;
    additionalStyles?: string;
  }
): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open print window");
    return;
  }

  const direction = options?.direction || 'rtl';
  const paperWidth = options?.paperWidth || '210mm';
  const additionalStyles = options?.additionalStyles || '';

  // Sanitize the content before printing
  const sanitizedContent = sanitizeForPrint(content);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="${direction}" lang="${direction === 'rtl' ? 'ar' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${DOMPurify.sanitize(title)}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        body { font-family: 'Cairo', sans-serif; }
        @page { size: ${paperWidth} auto; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        ${additionalStyles}
      </style>
    </head>
    <body>
      ${sanitizedContent}
      <script>
        setTimeout(() => {
          window.print();
          window.close();
        }, 500);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};
