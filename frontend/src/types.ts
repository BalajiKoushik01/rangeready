export type RFBand = 'UHF' | 'L-Band' | 'S-Band' | 'C-Band' | 'X-Band' | 'Ku-Band';

export const BAND_PRESETS: Record<RFBand, { min: number; max: number }> = {
  'UHF': { min: 0.3, max: 3.0 },
  'L-Band': { min: 1.0, max: 2.0 },
  'S-Band': { min: 2.0, max: 4.0 },
  'C-Band': { min: 4.0, max: 8.0 },
  'X-Band': { min: 8.0, max: 12.0 },
  'Ku-Band': { min: 12.0, max: 18.0 }
};
