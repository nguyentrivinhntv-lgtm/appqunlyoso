const fs = require('fs');
const xml = fs.readFileSync('temp_docx/word/document.xml', 'utf8');
const paras = xml.match(/<w:p\b[^>]*>.*?<\/w:p>/g) || [];
paras.forEach((p, i) => {
  const text = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g)?.map(t => t.replace(/<[^>]+>/g, '')).join('') || '';
  if (i < 25 && text.trim()) {
    const matchSz = p.match(/<w:sz w:val="(\d+)"/);
    const matchSpacing = p.match(/<w:spacing ([^>]+)>/);
    console.log(
      i, 
      text.substring(0, 40), 
      '| Size:', matchSz ? matchSz[1] : 'Unknown', 
      '| Spacing:', matchSpacing ? matchSpacing[1] : 'Unknown'
    );
  }
});
