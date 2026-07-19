import { toPng, toSvg } from 'html-to-image';

export interface ExportOptions {
  format: 'png' | 'svg';
  filename?: string;
}

/**
 * KNOWN LIMITATION:
 * html-to-image serialises inline styles and computed CSS but has limited support for:
 * - backdrop-filter: blur() — the glass effect won't appear in the export (background will be solid #1E3442 instead of blurred)
 * - CSS custom properties that reference other custom properties may not resolve in all browsers
 */
export async function exportDiagram(
  viewportEl: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { format, filename = 'dblens-diagram' } = options;

  // Capture the full react-flow__viewport element
  // Scale 2x for retina-quality PNG
  const commonOptions = {
    backgroundColor: '#142030',
    pixelRatio: format === 'png' ? 2 : 1,
    cacheBust: true,
    style: {
      // Ensure the export background matches the canvas background
      backgroundColor: '#142030',
    },
    // Filter out React Flow UI controls (minimap, controls panel) from export
    filter: (node: HTMLElement) => {
      if (!node.classList) return true;
      const excludeClasses = [
        'react-flow__minimap',
        'react-flow__controls',
        'react-flow__panel',
      ];
      return !excludeClasses.some(cls => node.classList.contains(cls));
    },
  };

  try {
    let dataUrl: string;

    if (format === 'png') {
      dataUrl = await toPng(viewportEl, commonOptions);
    } else {
      dataUrl = await toSvg(viewportEl, commonOptions);
    }

    // Trigger download
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = dataUrl;
    link.click();
    link.remove();
  } catch (err) {
    console.error('[DBLens] Export failed:', err);
    throw new Error(`Failed to export as ${format.toUpperCase()}. Try fitting the view first.`);
  }
}
