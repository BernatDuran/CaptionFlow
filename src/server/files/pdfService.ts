import PDFDocument from "pdfkit";
import { PdfAstRenderer } from "./PdfAstRenderer";
import { defaultTheme } from "./pdfTheme";

export function markdownToPdfBuffer(markdown: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const theme = defaultTheme;
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: theme.margin,
      info: {
        Title: title,
        Creator: "CaptionFlow"
      }
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(theme.fonts.bold).fontSize(9).fillColor("#64748b").text("CaptionFlow", { align: "right" });
    doc.moveDown(1.2);

    const renderer = new PdfAstRenderer(doc, theme);
    renderer.render(markdown);

    doc.end();
  });
}
