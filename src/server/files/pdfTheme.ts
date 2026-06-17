export type PdfTheme = {
  name: string;
  margin: number;
  fonts: {
    regular: string;
    bold: string;
    italic: string;
    boldItalic: string;
    mono: string;
  };
  paragraph: { size: number; color: string; lineGap: number; indent: number };
  heading: Record<number, { size: number; color: string; spaceBefore: number; spaceAfter: number }>;
  list: { indent: number; itemSpacing: number };
  code: { background: string; padding: number; color: string; size: number };
  blockquote: { color: string; border: string; indent: number; padding: number };
  table: { borderColor: string; headerBackground: string; padding: number };
  colors: {
    link: string;
  };
};

export const defaultTheme: PdfTheme = {
  name: "Compacto",
  margin: 40,
  fonts: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    boldItalic: "Helvetica-BoldOblique",
    mono: "Courier"
  },
  paragraph: { size: 9.5, color: "#1f2937", lineGap: 2.5, indent: 0 },
  heading: {
    1: { size: 16, color: "#111827", spaceBefore: 8, spaceAfter: 6 },
    2: { size: 14, color: "#111827", spaceBefore: 6, spaceAfter: 4 },
    3: { size: 12, color: "#111827", spaceBefore: 4, spaceAfter: 3 },
    4: { size: 11, color: "#111827", spaceBefore: 3, spaceAfter: 2 },
    5: { size: 10, color: "#374151", spaceBefore: 2, spaceAfter: 2 },
    6: { size: 9.5, color: "#4b5563", spaceBefore: 2, spaceAfter: 2 }
  },
  list: { indent: 14, itemSpacing: 2 },
  code: { background: "#f3f4f6", padding: 6, color: "#1f2937", size: 8.5 },
  blockquote: { color: "#4b5563", border: "#d1d5db", indent: 15, padding: 5 },
  table: { borderColor: "#e5e7eb", headerBackground: "#f9fafb", padding: 6 },
  colors: { link: "#1d4ed8" }
};
