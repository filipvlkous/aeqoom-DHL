export type BarcodeType = 'LPN' | 'EAN' | 'SN' | 'NODEF';

export type ClassifiedCode = {
  content: string;
  corners?: { x: number; y: number }[];
  added: boolean;
  barcodeType: BarcodeType;
  maskName?: string;
};

export type ScanValidationResult =
  | { ok: true }
  | { ok: false; error: ErrorCode; meta?: Record<string, unknown> };

export type ErrorCode = 'ERR-01' | 'ERR-02' | 'ERR-03' | 'ERR-04' | 'ERR-05' | 'ERR-06';

// ---------------------------------------------------------------------------
// Barcode masks — loaded dynamically from DB
// ---------------------------------------------------------------------------

export type SnMask = { name: string; regex: RegExp }; // kept for backwards compat
export type DbMask = { barcodeType: BarcodeType; name: string; regex: RegExp };

/** Convert a DB mask record's barcode_mask string into a RegExp. */
export function parseMaskPattern(pattern: string): RegExp {
  return new RegExp(pattern);
}

export function classifyBarcode(
  value: string,
  masks: DbMask[],
): { type: BarcodeType; maskName?: string } {
  console.log('Classifying', value, 'against masks', masks);
  for (const mask of masks) {
    if (mask.regex.test(value)) {
      return mask.barcodeType === 'SN'
        ? { type: 'SN', maskName: mask.name }
        : { type: mask.barcodeType };
    }
  }
  return { type: 'NODEF' };
}

// ---------------------------------------------------------------------------
// Classification of a full codes[] array from one scan
// ---------------------------------------------------------------------------

export function classifyCodes(
  codes: {
    content: string;
    corners?: { x: number; y: number }[];
    added: boolean;
  }[],
  masks: DbMask[],
): ClassifiedCode[] {
  return codes.map((c) => {
    const { type, maskName } = classifyBarcode(c.content, masks);
    return { ...c, barcodeType: type, maskName };
  });
}

// ---------------------------------------------------------------------------
// ERR-01 … ERR-05 validation (ERR-06 requires height from setup, handled in store)
// ---------------------------------------------------------------------------

export function validateScan(
  codes: ClassifiedCode[],
  expectedSnCount: number | null,
  appMode: string,
  ean: string | null,
): ScanValidationResult {
  const lpns = codes.filter((c) => c.barcodeType === 'LPN');
  const eans = codes.filter((c) => c.barcodeType === 'EAN');
  const sns = codes.filter((c) => c.barcodeType === 'SN');
  // ERR-01 – no LPN
  if (lpns.length === 0) {
    return { ok: false, error: 'ERR-01' };
  }

  // ERR-02 – multiple LPNs
  if (lpns.length > 1) {
    return {
      ok: false,
      error: 'ERR-02',
      meta: { lpns: lpns.map((l) => l.content) },
    };
  }

  // ERR-03 – no EAN
  if (eans.length === 0) {
    return { ok: false, error: 'ERR-03' };
  }

  // ERR-04 – multiple EANs (more than one distinct EAN value = defective)
  const uniqueEans = [
    ...new Set(
      eans.map((e) => {
        if (e.content !== ean) {
          return e.content + ' (!)';
        } else {
          return e.content;
        }
      }),
    ),
  ];
  if (
    uniqueEans.length > 1 ||
    (uniqueEans.length === 1 && uniqueEans[0] !== ean)
  ) {
    return {
      ok: false,
      error: 'ERR-04',
      meta: { eans: uniqueEans.map((e) => e) },
    };
  }

  // ERR-05 – SN count mismatch (only when expectedSnCount is known from WMS)
  if (expectedSnCount !== null && sns.length !== expectedSnCount) {
    return {
      ok: false,
      error: 'ERR-05',
      meta: { found: sns.length, expected: expectedSnCount },
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// ERR-06 – height check (called separately with value from setup)
// ---------------------------------------------------------------------------

export function validateHeight(
  heightCm: number,
  heightFrom: number,
  heightTo: number,
): ScanValidationResult {
  if (heightCm < heightFrom || heightCm > heightTo) {
    return {
      ok: false,
      error: 'ERR-06',
      meta: { height: heightCm, from: heightFrom, to: heightTo },
    };
  }
  return { ok: true };
}