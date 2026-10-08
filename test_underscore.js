const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs = require('fs');

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  };
}

function centerBoldPara(text, size = 24) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, before: 0 },
    children: [new TextRun({ text, bold: true, size, font: 'Times New Roman' })]
  });
}

function underscoreLine(length = 15) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: 120, lineRule: "exact" },
    children: [new TextRun({
      text: '_'.repeat(length),
      bold: true,
      size: 24,
      font: 'Times New Roman'
    })]
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders(),
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders(),
                  children: [
                    centerBoldPara('BỘ GIÁO DỤC VÀ ĐÀO TẠO'),
                    centerBoldPara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN'),
                    underscoreLine(15), // half length
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders(),
                  children: [
                    centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),
                    centerBoldPara('Độc lập - Tự do - Hạnh phúc'),
                    underscoreLine(22), // full length
                  ]
                })
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun('Content here')] })
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('test_underscore.docx', buf);
  console.log('Done underscore test');
});
