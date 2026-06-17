import type PDFKit from "pdfkit";
import { marked, Token, Tokens } from "marked";
import { PdfTheme } from "./pdfTheme";

export class PdfAstRenderer {
  private doc: PDFKit.PDFDocument;
  private theme: PdfTheme;

  constructor(doc: PDFKit.PDFDocument, theme: PdfTheme) {
    this.doc = doc;
    this.theme = theme;
  }

  public render(markdown: string) {
    const tokens = marked.lexer(markdown);
    this.renderTokens(tokens);
  }

  private renderTokens(tokens: Token[]) {
    for (const token of tokens) {
      this.renderToken(token);
    }
  }

  private renderToken(token: Token) {
    switch (token.type) {
      case "heading":
        this.renderHeading(token as Tokens.Heading);
        break;
      case "paragraph":
        this.renderParagraph(token as Tokens.Paragraph);
        break;
      case "list":
        this.renderList(token as Tokens.List, 0);
        break;
      case "code":
        this.renderCode(token as Tokens.Code);
        break;
      case "blockquote":
        this.renderBlockquote(token as Tokens.Blockquote);
        break;
      case "table":
        this.renderTable(token as Tokens.Table);
        break;
      case "space":
        this.doc.moveDown(0.5);
        break;
      case "hr":
        this.doc.moveDown(0.5);
        this.doc.lineWidth(0.5).strokeColor("#cbd5e1").moveTo(this.doc.x, this.doc.y).lineTo(this.doc.page.width - this.doc.page.margins.right, this.doc.y).stroke();
        this.doc.moveDown(0.5);
        break;
      default:
        break;
    }
  }

  private renderTable(token: Tokens.Table) {
    const startX = this.doc.page.margins.left;
    const padding = this.theme.table.padding;
    const tableWidth = this.doc.page.width - this.doc.page.margins.left - this.doc.page.margins.right;
    
    const cols = token.header.length || 1;
    const colWidth = tableWidth / cols;
    
    this.doc.moveDown(0.5);

    const renderRow = (cells: Tokens.TableCell[], isHeader: boolean) => {
      let maxCellHeight = 0;
      
      this.doc.font(isHeader ? this.theme.fonts.bold : this.theme.fonts.regular).fontSize(this.theme.paragraph.size);
      
      const getRaw = (tkns: Token[]): string => tkns.map(t => ('text' in t ? t.text : 'raw' in t ? t.raw : '')).join('');
      const cellTexts = cells.map(c => getRaw(c.tokens || []));

      for (let i = 0; i < cells.length; i++) {
         const h = this.doc.heightOfString(cellTexts[i], { width: colWidth - padding * 2 });
         if (h > maxCellHeight) maxCellHeight = h;
      }
      
      const rowHeight = maxCellHeight + padding * 2;
      
      if (this.doc.y + rowHeight > this.doc.page.height - this.doc.page.margins.bottom) {
         this.doc.addPage();
      }
      
      const rowY = this.doc.y;
      this.doc.lineWidth(0.5);
      
      if (isHeader) {
         this.doc.rect(startX, rowY, tableWidth, rowHeight).fillAndStroke(this.theme.table.headerBackground, this.theme.table.borderColor);
      } else {
         this.doc.rect(startX, rowY, tableWidth, rowHeight).stroke(this.theme.table.borderColor);
      }
      
      for (let i = 0; i < cells.length; i++) {
        const cellX = startX + i * colWidth;
        
        if (i > 0) {
           this.doc.moveTo(cellX, rowY).lineTo(cellX, rowY + rowHeight).strokeColor(this.theme.table.borderColor).stroke();
        }
        
        this.doc.fillColor(isHeader ? "#000000" : this.theme.paragraph.color);
        this.doc.text(cellTexts[i], cellX + padding, rowY + padding, { width: colWidth - padding * 2 });
      }
      
      this.doc.x = startX;
      this.doc.y = rowY + rowHeight;
    };
    
    renderRow(token.header, true);
    for (const row of token.rows) {
       renderRow(row, false);
    }
    
    this.doc.moveDown(1);
  }

  private renderHeading(token: Tokens.Heading) {
    const level = Math.min(token.depth, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    const style = this.theme.heading[level];
    
    this.doc.moveDown(style.spaceBefore / 10);
    this.renderInlineTokens(token.tokens, "bold", style.size, style.color);
    this.doc.moveDown(style.spaceAfter / 10);
  }

  private renderParagraph(token: Tokens.Paragraph) {
    this.renderInlineTokens(token.tokens, "regular", this.theme.paragraph.size, this.theme.paragraph.color);
    this.doc.moveDown(this.theme.paragraph.lineGap / 10);
  }

  private renderList(token: Tokens.List, indentLevel: number) {
    const currentIndent = this.doc.x;
    const newIndent = currentIndent + this.theme.list.indent;
    
    for (let i = 0; i < token.items.length; i++) {
      const item = token.items[i];
      const bullet = token.ordered ? `${i + 1}.` : "•";
      
      this.doc.font(this.theme.fonts.regular).fontSize(this.theme.paragraph.size).fillColor(this.theme.paragraph.color);
      
      // Draw bullet
      this.doc.text(bullet, currentIndent, this.doc.y, { continued: false, width: this.theme.list.indent });
      
      // Move to content
      this.doc.x = newIndent;
      this.doc.y -= this.doc.currentLineHeight(true);
      
      // Render list item content
      for (const itemToken of item.tokens) {
        if (itemToken.type === "text" || itemToken.type === "paragraph") {
          const subTokens = (itemToken as any).tokens || [];
          if (subTokens.length > 0) {
            this.renderInlineTokens(subTokens, "regular", this.theme.paragraph.size, this.theme.paragraph.color);
          } else {
             this.doc.text((itemToken as any).text || itemToken.raw);
          }
        } else if (itemToken.type === "list") {
          this.doc.moveDown(this.theme.list.itemSpacing / 10);
          this.renderList(itemToken as Tokens.List, indentLevel + 1);
        }
      }
      
      this.doc.x = currentIndent;
      this.doc.moveDown(this.theme.list.itemSpacing / 10);
    }
    
    if (indentLevel === 0) {
      this.doc.moveDown(0.5);
    }
  }

  private renderCode(token: Tokens.Code) {
    const padding = this.theme.code.padding;
    const bg = this.theme.code.background;
    
    this.doc.moveDown(0.5);
    const startY = this.doc.y;
    
    this.doc.font(this.theme.fonts.mono).fontSize(this.theme.code.size).fillColor(this.theme.code.color);
    
    // Calculate height (hacky way, write text to a temporary position and measure, but pdfkit supports measuring)
    const height = this.doc.heightOfString(token.text, { width: this.doc.page.width - this.doc.page.margins.left - this.doc.page.margins.right - padding * 2 });
    
    // Draw background rect
    if (startY + height + padding * 2 > this.doc.page.height - this.doc.page.margins.bottom) {
        this.doc.addPage();
    }
    
    this.doc.rect(this.doc.x, this.doc.y, this.doc.page.width - this.doc.page.margins.left - this.doc.page.margins.right, height + padding * 2).fill(bg);
    
    // Write text
    this.doc.fillColor(this.theme.code.color);
    this.doc.text(token.text, this.doc.page.margins.left + padding, this.doc.y + padding);
    
    this.doc.x = this.doc.page.margins.left;
    this.doc.y += padding;
    this.doc.moveDown(1);
  }

  private renderBlockquote(token: Tokens.Blockquote) {
    const currentX = this.doc.x;
    const padding = this.theme.blockquote.padding;
    const indent = this.theme.blockquote.indent;
    
    this.doc.moveDown(0.5);
    const startY = this.doc.y;
    
    this.doc.x = currentX + indent + padding;
    
    // Render inner tokens but with blockquote styles
    for (const subToken of token.tokens) {
        if (subToken.type === "paragraph") {
           this.renderInlineTokens((subToken as Tokens.Paragraph).tokens, "italic", this.theme.paragraph.size, this.theme.blockquote.color);
        } else {
           this.renderToken(subToken);
        }
    }
    
    const endY = this.doc.y;
    
    // Draw left border
    this.doc.lineWidth(2).strokeColor(this.theme.blockquote.border).moveTo(currentX + indent, startY).lineTo(currentX + indent, endY).stroke();
    
    this.doc.x = currentX;
    this.doc.moveDown(0.5);
  }

  private renderInlineTokens(tokens: Token[], defaultFont: "regular" | "bold" | "italic" | "boldItalic" | "mono", size: number, color: string) {
    const segments: { text: string; font: string; link?: string }[] = [];

    const parseInline = (inlineTokens: Token[], currentFont: string, linkUrl?: string) => {
      for (const t of inlineTokens) {
        if (t.type === "text" || t.type === "escape") {
          const content = (t as Tokens.Text).text || t.raw;
          // Split by newline to avoid continuous text breaking pdfkit
          const parts = content.split("\n");
          for (let j=0; j < parts.length; j++) {
              segments.push({ text: parts[j], font: currentFont, link: linkUrl });
              if (j < parts.length - 1) {
                  segments.push({ text: "\n", font: currentFont, link: linkUrl });
              }
          }
        } else if (t.type === "strong") {
          parseInline((t as Tokens.Strong).tokens, currentFont === "italic" ? "boldItalic" : "bold", linkUrl);
        } else if (t.type === "em") {
          parseInline((t as Tokens.Em).tokens, currentFont === "bold" ? "boldItalic" : "italic", linkUrl);
        } else if (t.type === "codespan") {
          segments.push({ text: (t as Tokens.Codespan).text, font: "mono", link: linkUrl });
        } else if (t.type === "link") {
          parseInline((t as Tokens.Link).tokens, currentFont, (t as Tokens.Link).href);
        } else if (t.type === "br") {
          segments.push({ text: "\n", font: currentFont });
        } else {
            // raw fallback
            segments.push({ text: t.raw, font: currentFont });
        }
      }
    };

    parseInline(tokens, defaultFont);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;
      
      this.doc.font(this.theme.fonts[seg.font as keyof PdfTheme["fonts"]] || this.theme.fonts.regular);
      this.doc.fontSize(size);
      this.doc.fillColor(seg.link ? this.theme.colors.link : color);

      const options: any = { continued: !isLast };
      if (seg.link) options.link = seg.link;

      this.doc.text(seg.text, options);
    }
    
    if (segments.length === 0) {
        this.doc.text("", { continued: false });
    }
  }
}
