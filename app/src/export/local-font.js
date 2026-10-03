import { CustomFontEmbedder, PDFFont, PDFRawStream } from "pdf-lib";
import metrics from "../../assets/fonts/NotoSansSC-metrics.json" with { type: "json" };

// Embed intact, precompressed TrueType bytes. No runtime subsetter or multi-MB
// synchronous compression is needed, including inside the SDK's worker-free CSP.
class LocalFontEmbedder extends CustomFontEmbedder {
  constructor(bytes) {
    const used = new Set(),
      glyph = (cp) => {
        used.add(cp);
        const [id, advanceWidth] = metrics.cmap[cp] || [0, metrics.unitsPerEm];
        return { id, advanceWidth, codePoints: [cp] };
      };
    const font = {
      unitsPerEm: metrics.unitsPerEm,
      postscriptName: "NotoSansSC-Regular",
      ascent: metrics.ascent,
      descent: metrics.descent,
      bbox: {
        minX: metrics.bbox[0],
        minY: metrics.bbox[1],
        maxX: metrics.bbox[2],
        maxY: metrics.bbox[3],
      },
      get characterSet() {
        return [...used];
      },
      glyphForCodePoint: glyph,
      layout: (text) => ({
        glyphs: Array.from(text, (c) => glyph(c.codePointAt(0))),
      }),
    };
    super(font, new Uint8Array());
    this.bytes = bytes;
  }
  async embedFontStream(context) {
    return context.register(
      PDFRawStream.of(
        context.obj({ Filter: "FlateDecode", Length1: 10596252 }),
        this.bytes,
      ),
    );
  }
  async embedFontDescriptor(context) {
    const s = 1000 / metrics.unitsPerEm;
    return context.register(
      context.obj({
        Type: "FontDescriptor",
        FontName: this.baseFontName,
        Flags: 4,
        FontBBox: metrics.bbox.map((v) => v * s),
        ItalicAngle: 0,
        Ascent: metrics.ascent * s,
        Descent: metrics.descent * s,
        CapHeight: metrics.ascent * s,
        StemV: 80,
        FontFile2: await this.embedFontStream(context),
      }),
    );
  }
}
export function embedLocalFont(doc, bytes) {
  const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const font = PDFFont.of(
    doc.context.nextRef(),
    doc,
    new LocalFontEmbedder(data),
  );
  return font;
}
