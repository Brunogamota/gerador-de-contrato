import sharp from 'sharp';

export interface PreprocessResult {
  buffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  upscaleFactor: number;
  mimeType: 'image/png';
}

/**
 * Upscale + normalize + sharpen so small decimal digits are readable by Tesseract.
 * Target: ≥2400px wide, full-range grayscale PNG (lossless).
 */
export async function preprocessForOCR(
  input: Buffer
): Promise<PreprocessResult> {
  const image = sharp(input, { failOnError: false });
  const meta = await image.metadata();
  const ow = meta.width ?? 800;
  const oh = meta.height ?? 600;

  // Upscale until width ≥ 2400 px, but never more than 4×
  const factor = ow < 2400 ? Math.min(4, Math.ceil(2400 / ow)) : 1;
  const pw = ow * factor;

  let pipeline = sharp(input, { failOnError: false });
  if (factor > 1) {
    pipeline = pipeline.resize(pw, null, { kernel: 'lanczos3' });
  }

  const buffer = await pipeline
    .grayscale()
    .normalize()                         // stretch histogram to 0-255
    .sharpen({ sigma: 1.5, m1: 1, m2: 3 }) // crisp edges on digits
    .png({ compressionLevel: 1 })        // lossless, minimal CPU waste
    .toBuffer();

  return {
    buffer,
    originalWidth: ow,
    originalHeight: oh,
    processedWidth: pw,
    upscaleFactor: factor,
    mimeType: 'image/png',
  };
}
