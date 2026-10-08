const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } = require('docx');
const fs = require('fs');

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'BỘ GIÁO DỤC VÀ ĐÀO TẠO', bold: true, size: 24 })]
        }),
        new Table({
          alignment: AlignmentType.CENTER,
          width: { size: 1, type: WidthType.AUTO },
          borders: {
            top: { style: BorderStyle.NONE, size: 0 },
            bottom: { style: BorderStyle.NONE, size: 0 },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
            insideHorizontal: { style: BorderStyle.NONE, size: 0 },
            insideVertical: { style: BorderStyle.NONE, size: 0 },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: 'TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', bold: true, size: 24 })]
                    })
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
  fs.writeFileSync('test_table_underline.docx', buf);
  console.log('Done');
});
