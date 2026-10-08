const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } = require('docx');
const fs = require('fs');

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  };
}

function centerBoldUnderlinePara(text, size = 24) {
  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 1, type: WidthType.AUTO },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              top: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text, bold: true, size, font: 'Times New Roman' })]
              })
            ]
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
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('BỘ GIÁO DỤC VÀ ĐÀO TẠO')] }),
                    centerBoldUnderlinePara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN')
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders(),
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')] }),
                    centerBoldUnderlinePara('Độc lập - Tự do - Hạnh phúc')
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
  fs.writeFileSync('test_nested_table.docx', buf);
  console.log('Nested table OK');
});
