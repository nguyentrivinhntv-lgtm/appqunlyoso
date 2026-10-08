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

function separateLineTable(widthPercentage) {
  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: widthPercentage, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            children: [new Paragraph({ spacing: { before: 0, after: 0 } })]
          })
        ]
      })
    ]
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
                    separateLineTable(40)
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders(),
                  children: [
                    centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),
                    centerBoldPara('Độc lập - Tự do - Hạnh phúc'),
                    separateLineTable(75)
                  ]
                })
              ]
            })
          ]
        })
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('test_separate_line_table.docx', buf);
  console.log('Done separate line table test');
});
