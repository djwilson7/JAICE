export const PT_PER_INCH = 72;
export const PX_PER_INCH = 96;
export const PT_TO_PX = PX_PER_INCH / PT_PER_INCH;
export const PX_TO_PT = PT_PER_INCH / PX_PER_INCH;

const round = (value: number, precision: number) => {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
};

export const roundPt = (value: number, precision = 2) => round(value, precision);
export const roundPx = (value: number, precision = 2) => round(value, precision);

export const ptToPx = (pt: number): number => pt * PT_TO_PX;
export const pxToPt = (px: number): number => px * PX_TO_PT;
export const inToPt = (inches: number): number => inches * PT_PER_INCH;
export const ptToIn = (pt: number): number => pt / PT_PER_INCH;

export const ptCss = (pt: number): string => `${roundPt(pt)}pt`;
export const pxCss = (px: number): string => `${roundPx(px)}px`;
export const pxFromPtCss = (pt: number): string => pxCss(ptToPx(pt));
