import * as fs from 'fs';

interface Corner {
  x: number;
  y: number;
}

export interface BarcodeData {
  content: string;
  corners: Corner[];
}

function processSvgAndReturnBase64(svgPath: string, jsonData: any): string {
  const codes: BarcodeData[] = jsonData;

  let svgContent = fs.readFileSync(svgPath, 'utf8');

  svgContent = svgContent.replace(/<text[\s\S]*?<\/text>/gi, '');
  svgContent = svgContent.replace(/<polygon[^>]*class="result"[^>]*\/>/gi, '');

  const rectangles = codes
    .map((code, i) => {
      try {
        if (
          !code ||
          !Array.isArray(code.corners) ||
          code.corners.length === 0
        ) {
          throw new Error(`Missing or empty corners at index ${i}`);
        }

        const xCoords = code.corners.map((c) => c.x);
        const yCoords = code.corners.map((c) => c.y);

        const minX = Math.min(...xCoords);
        const minY = Math.min(...yCoords);
        const maxX = Math.max(...xCoords);
        const maxY = Math.max(...yCoords);

        const width = maxX - minX;
        const height = maxY - minY;

        // Add minimum size validation
        if (width <= 0 || height <= 0) {
          console.warn(
            `Invalid dimensions at index ${i}: width=${width}, height=${height}`,
          );
          return '';
        }

        return `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" stroke="green" stroke-width="5" fill="green" />`;
      } catch (err: any) {
        console.error('Error at index:', i, err.message);
        return '';
      }
    })
    .filter((rect) => rect !== '') // Remove empty strings
    .join('\n');

  svgContent = svgContent.replace('</svg>', `  ${rectangles}\n</svg>`);

  // Convert to base64
  const fileData = Buffer.from(svgContent, 'utf8').toString('base64');

  return fileData;
}

export { processSvgAndReturnBase64 };
