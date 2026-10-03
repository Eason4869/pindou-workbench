"""Development-only: precompress the intact font and cache its Unicode metrics."""
from fontTools.ttLib import TTFont
from pathlib import Path
import json, zlib
root = Path(__file__).resolve().parent.parent / 'assets' / 'fonts'
source = root / 'NotoSansSC-Regular.ttf'
font = TTFont(source)
mapping = {str(cp): [font.getGlyphID(name), font['hmtx'][name][0]] for cp, name in font.getBestCmap().items()}
head, hhea = font['head'], font['hhea']
metrics = dict(unitsPerEm=head.unitsPerEm, ascent=hhea.ascent, descent=hhea.descent,
               bbox=[head.xMin, head.yMin, head.xMax, head.yMax], cmap=mapping)
(root / 'NotoSansSC-Regular.deflate').write_bytes(zlib.compress(source.read_bytes(), 9))
(root / 'NotoSansSC-metrics.json').write_text(json.dumps(metrics, separators=(',', ':')), encoding='utf-8')
print('Intact font compressed and Unicode metrics saved.')
