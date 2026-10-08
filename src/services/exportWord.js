import { Document, Packer, Paragraph, TextRun, TabStopType, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, VerticalAlign, SectionType, PageOrientation, UnderlineType, TableLayoutType } from 'docx';
import { saveAs } from 'file-saver';
import { numberToWords } from '../utils/numberToWords';
import { getDisplayNhomNganh, getAutoCeiling } from '../utils/studentUtils';

// ============= HELPER FUNCTIONS =============

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
    insideHorizontal: { style: BorderStyle.NONE, size: 0 },
    insideVertical: { style: BorderStyle.NONE, size: 0 },
  };
}

function centerBoldPara(text, size = 26) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, line: 276 },
    children: [new TextRun({ text, bold: true, size, font: 'Times New Roman' })]
  });
}

function centerPara(text, size = 26) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, line: 276 },
    children: [new TextRun({ text, bold: false, size, font: 'Times New Roman' })]
  });
}

function centerLine() {
  // Không dùng nữa, đã thay bằng underline sát chữ. (Giữ lại hàm rỗng để tránh lỗi nếu còn sót)
  return new Paragraph({ spacing: { after: 0 } });
}

/**
 * Đường gạch chân sử dụng một bảng ẩn để điều chỉnh độ dài chính xác
 * widthPercentage: phần trăm độ dài so với cột chứa nó (VD: 40, 75)
 */
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

function emptyPara() {
  return new Paragraph({ spacing: { after: 0, line: 276 }, children: [new TextRun({ text: '', size: 26, font: 'Times New Roman' })] });
}

function tabbedLine(label, value, fontSize = 26) {
  return new Paragraph({
    indent: { left: 567 },
    spacing: { after: 40, line: 276 },
    children: [
      new TextRun({ text: label, size: fontSize, font: 'Times New Roman' }),
      new TextRun({ text: value, size: fontSize, font: 'Times New Roman' }),
    ]
  });
}

function tabbedTwoCol(label1, value1, label2, value2, fontSize = 26, tabPosition = 5000) {
  return new Paragraph({
    indent: { left: 567 },
    spacing: { after: 40, line: 276 },
    tabStops: [{ type: TabStopType.LEFT, position: tabPosition }],
    children: [
      new TextRun({ text: label1, size: fontSize, font: 'Times New Roman' }),
      new TextRun({ text: value1, size: fontSize, font: 'Times New Roman' }),
      new TextRun({ text: '\t', size: fontSize }),
      new TextRun({ text: label2, size: fontSize, font: 'Times New Roman' }),
      new TextRun({ text: value2, size: fontSize, font: 'Times New Roman' }),
    ]
  });
}

function tableCellSimple(text, bold = false, widthPercent = 10, borders = {}, fontSize = 26, lineSpacing = 276) {
  return new TableCell({
    borders,
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 20, bottom: 20, left: 30, right: 30 }, // Thêm lề (padding) cho text không dính viền
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: lineSpacing },
      children: [new TextRun({ text, bold, size: fontSize, font: 'Times New Roman' })]
    })]
  });
}

function tableCellSize24(text, bold = false, widthPercent = 10, borders = {}) {
  return tableCellSimple(text, bold, widthPercent, borders, 24, 240);
}

function tableCellSize12(text, bold = false, widthPercent = 10, borders = {}) {
  return tableCellSimple(text, bold, widthPercent, borders, 12, 120);
}

// Cell helper dùng DXA (twips) cho bảng NĐ238 fixed-layout
function tableCellDxa(text, bold = false, widthDxa = 800, borders = {}) {
  return new TableCell({
    borders,
    width: { size: widthDxa, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 40, right: 40 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold, size: 12, font: 'Times New Roman' })]
    })]
  });
}

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1 },
  bottom: { style: BorderStyle.SINGLE, size: 1 },
  left: { style: BorderStyle.SINGLE, size: 1 },
  right: { style: BorderStyle.SINGLE, size: 1 },
};

/**
 * Tạo khối chữ ký (ngày tháng + chức danh + tên) căn giữa bên phải
 * Dùng table 2 cột: cột trái rỗng, cột phải căn giữa
 */
function signatureBlock(fullDateString, fontSize = 24) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [emptyPara()]
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60, line: 276 },
                children: [new TextRun({ text: fullDateString, italics: true, size: fontSize, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0, line: 276 },
                children: [new TextRun({ text: 'TL. HIỆU TRƯỞNG', bold: true, size: fontSize, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0, line: 276 },
                children: [new TextRun({ text: 'KT. GIÁM ĐỐC CƠ SỞ', bold: true, size: fontSize, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0, line: 276 },
                children: [new TextRun({ text: 'PHÓ GIÁM ĐỐC', bold: true, size: fontSize, font: 'Times New Roman' })]
              }),
              emptyPara(), emptyPara(), emptyPara(), emptyPara(), emptyPara(),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 276 },
                children: [new TextRun({ text: 'ThS. Nguyễn Chí Trọng', bold: true, size: fontSize, font: 'Times New Roman' })]
              }),
            ]
          }),
        ]
      }),
    ]
  });
}

// ============= PAGE MARGIN (A4) =============
const pageProps = {
  page: {
    margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
    size: { width: 11906, height: 16838 }
  }
};

const landscapePageProps = {
  page: {
    margin: { top: 567, bottom: 567, left: 567, right: 567 },
    size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }
  }
};

// ============= SECTION BUILDERS =============

/**
 * Build Giấy Xác Nhận section children (ngành nghề nặng nhọc)
 */
function buildGiayXacNhanChildren(data) {
  const fullDateString = data.dateStrFull || 'Tp. Hồ Chí Minh, ngày ... tháng ... năm 2026';

  return [
    // Header: 2 columns
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
                centerPara('BỘ GIÁO DỤC VÀ ĐÀO TẠO', 22),
                centerBoldPara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', 22),
                separateLineTable(40)
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders(),
              children: [
                centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 22),
                centerBoldPara('Độc lập - Tự do - Hạnh phúc', 22),
                separateLineTable(55)
              ]
            }),
          ]
        })
      ]
    }),

    emptyPara(),

    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'GIẤY XÁC NHẬN', bold: true, size: 32, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 276 },
      children: [new TextRun({
        text: 'Học sinh, sinh viên đang theo học ngành nghề nặng nhọc, độc hại, nguy hiểm',
        bold: true, size: 24, font: 'Times New Roman'
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: 276 },
      children: [new TextRun({ text: 'trình độ Cao đẳng', bold: true, size: 24, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 276 },
      children: [new TextRun({ text: 'Trường Cao đẳng Đại Việt Sài Gòn xác nhận:', bold: true, size: 26, font: 'Times New Roman' })]
    }),

    // Student info
    new Paragraph({
      indent: { left: 567 },
      spacing: { after: 40, line: 276 },
      children: [
        new TextRun({ text: 'Họ và tên sinh viên: ', size: 24, font: 'Times New Roman' }),
        new TextRun({ text: data.fullName || '', bold: true, size: 24, font: 'Times New Roman' }),
      ]
    }),
    tabbedTwoCol('Ngày sinh: ', data.dob || '', 'Giới tính: ', data.gender || '', 24, 6000),
    tabbedTwoCol('Số CMND/CCCD: ', data.idCard || '', 'Ngày cấp: ', data.idCardIssueDate || '', 24, 6000),
    tabbedLine('Nơi cấp: ', data.idCardIssuePlace || '', 24),
    new Paragraph({
      indent: { left: 567 },
      spacing: { after: 40, line: 276 },
      tabStops: [{ type: TabStopType.LEFT, position: 6000 }],
      children: [
        new TextRun({ text: 'Tên trường: ', size: 24, font: 'Times New Roman' }),
        new TextRun({ text: data.schoolName || 'Trường Cao đẳng Đại Việt Sài Gòn', bold: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: '\t', size: 24 }),
        new TextRun({ text: 'Mã trường theo học: ', size: 24, font: 'Times New Roman' }),
        new TextRun({ text: data.schoolCode || 'CSG', bold: true, size: 24, font: 'Times New Roman' }),
      ]
    }),
    tabbedTwoCol('Khoa: ', data.department || '', 'Ngành: ', data.major || '', 24, 6000),
    tabbedTwoCol('Lớp: ', data.classCode || '', 'Khóa học: ', data.courseYear || '', 24, 6000),
    tabbedTwoCol('Hệ đào tạo: ', data.educationLevel || 'Cao đẳng', 'Loại hình đào tạo: ', data.educationType || '', 24, 6000),

    // Content
    emptyPara(),
    new Paragraph({
      indent: { left: 567 },
      spacing: { after: 120, line: 276 },
      children: [
        new TextRun({ text: 'Hiện đang là sinh viên của trường Cao đẳng Đại Việt Sài Gòn, đang theo học ngành ', size: 24, font: 'Times New Roman' }),
        new TextRun({ text: data.major || '...........................', bold: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: ' thuộc ngành nghề nặng nhọc, độc hại, nguy hiểm được quy định tại Điểm b, Khoản 1, Điều 16, Nghị định 238/2025/NĐ-CP và Thông tư 05/2023/TT-BLĐTBXH.', size: 24, font: 'Times New Roman' }),
      ]
    }),

    // Reason
    new Paragraph({
      indent: { left: 567 },
      spacing: { after: 300, line: 276 },
      children: [
        new TextRun({ text: 'Lý do xác nhận: ', size: 24, font: 'Times New Roman' }),
        new TextRun({ text: data.reason || 'Bổ túc hồ sơ Nghị định 238./.', size: 24, font: 'Times New Roman' }),
      ]
    }),

    emptyPara(),

    // Signature block (căn giữa bên phải)
    signatureBlock(fullDateString),
  ];
}


/**
 * Build Giấy Xác Nhận Miễn Giảm section children (PHỤ LỤC V)
 */
function buildGiayXacNhanMienGiamChildren(data) {
  return [
    // Header
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 276 },
      children: [new TextRun({ text: 'PHỤ LỤC V', bold: true, size: 26, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 276 },
      children: [new TextRun({ text: 'GIẤY XÁC NHẬN', bold: true, size: 26, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: 276 },
      children: [new TextRun({ text: '(Kèm theo Nghị định số 238/2025/NĐ-CP ngày 03 tháng 9 năm 2025 của Chính phủ)', italics: true, size: 26, font: 'Times New Roman' })]
    }),

    emptyPara(),

    // CỘNG HÒA
    centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 26),
    centerBoldPara('Độc lập - Tự do - Hạnh phúc', 26),
    separateLineTable(30),

    emptyPara(),

    centerBoldPara('GIẤY XÁC NHẬN', 28),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 276 },
      children: [new TextRun({ text: '(Dùng cho các cơ sở giáo dục nghề nghiệp và giáo dục đại học tư thục, thuộc', size: 28, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 276 },
      children: [new TextRun({ text: 'doanh nghiệp nhà nước, tổ chức kinh tế)', size: 28, font: 'Times New Roman' })]
    }),

    // Kính gửi
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [
        new TextRun({ text: 'Kính gửi: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: `Ủy ban nhân dân cấp xã, phường${data.committee ? ' ' + data.committee : '....................'}`, size: 28, font: 'Times New Roman' }),
      ]
    }),

    emptyPara(),

    // Info
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Trường: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: 'Cao đẳng Đại Việt Sài Gòn', size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Xác nhận anh/chị: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.fullName || '', bold: true, size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Số căn cước/CCCD: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.idCard || '', size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Hiện là học sinh, sinh viên năm thứ: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.currentYear || '1', bold: true, size: 28, font: 'Times New Roman' }),
        new TextRun({ text: '   Học kỳ: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.semester || '1', bold: true, size: 28, font: 'Times New Roman' }),
        new TextRun({ text: '   Năm học: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.schoolYear || '', bold: true, size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Khoa: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.department || '', bold: true, size: 28, font: 'Times New Roman' }),
        new TextRun({ text: '; Khóa học: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.courseYear || '', bold: true, size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Hình thức đào tạo: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.educationType || '', size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Thời gian đào tạo toàn khóa học: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: `${data.courseDuration || '36'} tháng`, size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Kỷ luật: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: data.discipline || 'Không', size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Mức thu học phí: ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: `${data.tuitionFee || ''}`, bold: true, size: 28, font: 'Times New Roman' }),
        new TextRun({ text: ' đồng/tháng', size: 28, font: 'Times New Roman' }),
      ]
    }),

    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Đề nghị quý cơ quan xem xét giải quyết tiền hỗ trợ miễn, giảm học phí theo quy định hiện hành.', size: 28, font: 'Times New Roman' }),
      ]
    }),

    emptyPara(),

    // Signature
    signatureBlock(data.dateStrFull || 'Tp. Hồ Chí Minh, ngày ... tháng ... năm 2026', 28),
  ];
}


/**
 * Build Dự Toán Kinh Phí section children (PHỤ LỤC VI)
 */
function buildDuToanKinhPhiChildren(data) {
  const fullDateString = data.dateStrFull || 'Tp. Hồ Chí Minh, ngày ... tháng ... năm 2026';
  const mucThu = data.mucThu || '2.290.000';
  const soThang = data.soThang || '05';
  const mucThuNum = parseInt((mucThu || '0').replace(/\./g, '')) || 0;
  const soThangNum = parseInt(soThang) || 0;
  const total = mucThuNum * soThangNum * 0.7;
  const formattedTotal = total.toLocaleString('vi-VN');
  const hocKy = data.hocKy || `Học kỳ ${data.semester || '1'}`;
  const namHoc = data.namHoc || data.schoolYear || '2026 - 2027';

  return [
    // Header
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: 'PHỤ LỤC VI', bold: true, size: 26, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: 'DỰ TOÁN KINH PHÍ CẤP BÙ TIỀN MIỄN, GIẢM HỌC PHÍ', bold: true, size: 26, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 240 },
      children: [new TextRun({ text: '(Kèm theo Nghị định số 238/2025/NĐ-CP ngày 03 tháng 9 năm 2025 của Chính phủ)', italics: true, size: 26, font: 'Times New Roman' })]
    }),

    new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: '', size: 26, font: 'Times New Roman' })] }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [
        new TextRun({ text: 'Tên cơ sở giáo dục nghề nghiệp: ', bold: true, size: 28, font: 'Times New Roman' }),
        new TextRun({ text: 'TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', bold: true, size: 28, font: 'Times New Roman' }),
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: 'DỰ TOÁN KINH PHÍ CẤP BÙ TIỀN MIỄN, GIẢM HỌC PHÍ NĂM 2026', bold: true, size: 26, font: 'Times New Roman' })]
    }),

    new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: '', size: 26, font: 'Times New Roman' })] }),

    // Đối tượng
    new Paragraph({
      spacing: { after: 120, line: 240 },
      children: [
        new TextRun({ text: 'Đối tượng: ', bold: true, size: 26, font: 'Times New Roman' }),
        new TextRun({ text: 'Được giảm 70% học phí – Học sinh sinh viên học ngành nghề nặng nhọc, độc hại, nguy hiểm (Theo Điểm b, Khoản 1, Điều 16 Nghị định 238/2025/NĐ-CP của Chính Phủ)', size: 24, font: 'Times New Roman' }),
      ]
    }),

    // Student info
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 240 },
      children: [
        new TextRun({ text: `(đối với sinh viên: ${data.fullName || ''}, Mã lớp: ${data.classCode || ''}, Mã số sinh viên: ${data.studentId || ''})`, size: 24, font: 'Times New Roman' }),
      ]
    }),

    new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: '', size: 26, font: 'Times New Roman' })] }),

    // Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Header row
        new TableRow({
          children: [
            tableCellSize24('STT', true, 5, cellBorders),
            tableCellSize24('Nội dung', true, 25, cellBorders),
            tableCellSize24('Số đối tượng được miễn, giảm học phí', true, 10, cellBorders),
            tableCellSize24('Mức thu học phí/ tháng', true, 15, cellBorders),
            tableCellSize24('Số tháng miễn giảm', true, 8, cellBorders),
            tableCellSize24('Tổng kinh phí cấp bù tiền miễn, giảm học phí', true, 20, cellBorders),
            tableCellSize24('Ghi chú', true, 17, cellBorders),
          ]
        }),
        // Empty row
        new TableRow({
          children: Array(7).fill(null).map(() => new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { line: 240 } })] }))
        }),
        // 1. Cao đẳng
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              columnSpan: 7,
              children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: '1. Cao đẳng', size: 24, font: 'Times New Roman' })] })]
            })
          ]
        }),
        // Nhóm ngành
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              columnSpan: 7,
              children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: `Nhóm ngành, nghề đào tạo: ${data.nhomNganh || 'Sức khỏe'}`, size: 24, font: 'Times New Roman' })] })]
            })
          ]
        }),
        // Data row
        new TableRow({
          children: [
            tableCellSize24('1.1', false, 5, cellBorders),
            new TableCell({
              borders: cellBorders,
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: `Ngành: ${data.major || ''}`, size: 24, font: 'Times New Roman' })] })]
            }),
            tableCellSize24('01', false, 10, cellBorders),
            tableCellSize24(mucThu, false, 15, cellBorders),
            tableCellSize24(soThang, false, 8, cellBorders),
            new TableCell({
              borders: cellBorders,
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: `${mucThu}*${soThang}*70%`, size: 24, font: 'Times New Roman' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: `= ${formattedTotal}`, size: 24, font: 'Times New Roman' })] }),
              ]
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 17, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: `${hocKy}, năm học`, size: 24, font: 'Times New Roman' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: namHoc, size: 24, font: 'Times New Roman' })] }),
              ]
            }),
          ]
        }),
        // Total row
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              columnSpan: 5,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: 'TỔNG DỰ TOÁN', bold: true, size: 24, font: 'Times New Roman' })] })]
            }),
            tableCellSize24(formattedTotal, false, 20, cellBorders),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { line: 240 } })] }),
          ]
        }),
      ]
    }),

    emptyPara(), emptyPara(),

    // Signature
    signatureBlock(fullDateString),
  ];
}


/**
 * Build Danh Sách Sinh Viên section children (Giảm Miễn Học Phí - Quyết Định)
 */
function buildDanhSachSinhVienChildren(studentsDataList, globalSettings = {}) {
  const dateStr = 'ngày ... tháng ... năm 2026'; // Có thể lấy từ globalSettings nếu cần

  const rows = [
    // Header row
    new TableRow({
      children: [
        tableCellSimple('STT', true, 3, cellBorders),
        tableCellSimple('Họ và tên', true, 13, cellBorders),
        tableCellSimple('Mã số sinh viên/Lớp', true, 12, cellBorders),
        tableCellSimple('Ngày sinh', true, 8, cellBorders),
        tableCellSimple('Ngành', true, 12, cellBorders),
        tableCellSimple('Hệ đào tạo', true, 8, cellBorders),
        tableCellSimple('Nhóm ngành', true, 10, cellBorders),
        tableCellSimple('Mức thu HP/tháng của đơn vị (đồng)', true, 10, cellBorders),
        tableCellSimple('Số tháng', true, 5, cellBorders),
        tableCellSimple('Tổng mức thu x 70% (đồng)', true, 10, cellBorders),
        tableCellSimple('Ghi chú', true, 9, cellBorders),
      ]
    })
  ];

  studentsDataList.forEach((s, index) => {
    const mucThu = s.mucThu || globalSettings.tuitionFee || '2.290.000';
    const soThang = s.soThang || globalSettings.soThang || '5';
    const mucThuNum = parseInt((mucThu || '0').replace(/\./g, '')) || 0;
    const soThangNum = parseInt(soThang) || 0;
    const total = mucThuNum * soThangNum * 0.7;
    const formattedTotal = total.toLocaleString('vi-VN');
    const hocKy = s.hocKy || `Học kỳ ${globalSettings.semester || '1'}`;
    const namHoc = s.namHoc || globalSettings.schoolYear || '2026 - 2027';

    rows.push(new TableRow({
      children: [
        tableCellSimple((index + 1).toString(), false, 3, cellBorders),
        tableCellSimple(s.fullName || '', false, 13, cellBorders),
        tableCellSimple(`${s.studentId ? s.studentId + ' / ' : ''}${s.classCode || ''}`, false, 12, cellBorders),
        tableCellSimple(s.dob || '', false, 8, cellBorders),
        tableCellSimple(s.major || '', false, 12, cellBorders),
        tableCellSimple(s.educationType || '', false, 8, cellBorders),
        tableCellSimple(s.nhomNganh || 'Sức khỏe', false, 10, cellBorders),
        tableCellSimple(mucThu, false, 10, cellBorders),
        tableCellSimple(soThang, false, 5, cellBorders),
        tableCellSimple(formattedTotal, false, 10, cellBorders),
        tableCellSimple(`${hocKy}, năm học ${namHoc}`, false, 9, cellBorders),
      ]
    }));
  });

  return [
    // Header
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
                centerPara('BỘ GIÁO DỤC VÀ ĐÀO TẠO', 22),
                centerBoldPara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', 22),
                separateLineTable(28)
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders(),
              children: [
                centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 22),
                centerBoldPara('Độc lập - Tự do - Hạnh phúc', 22),
                separateLineTable(38)
              ]
            }),
          ]
        })
      ]
    }),

    emptyPara(),

    // Title
    centerBoldPara('DANH SÁCH SINH VIÊN ĐANG HỌC TẠI TRƯỜNG THUỘC ĐỐI TƯỢNG ĐƯỢC GIẢM 70% HỌC PHÍ – HỌC SINH', 26),
    centerBoldPara('SINH VIÊN HỌC NGÀNH NGHỀ NẶNG NHỌC, ĐỘC HẠI, NGUY HIỂM (THEO ĐIỂM B, KHOẢN 1, ĐIỀU 16 NGHỊ ĐỊNH', 26),
    centerBoldPara('SỐ 238/2025/NĐ-CP CỦA CHÍNH PHỦ)', 26),
    
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, before: 100 },
      children: [
        new TextRun({ text: `(Ban hành kèm theo Quyết định số        /QĐNB-ĐVSG-CT ${dateStr}`, italics: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: '\ncủa Hiệu trưởng Trường Cao đẳng Đại Việt Sài Gòn)', italics: true, size: 24, font: 'Times New Roman' }),
      ]
    }),

    // Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows
    }),

    emptyPara(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `(Tổng cộng danh sách có `, italics: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: studentsDataList.length < 10 ? `0${studentsDataList.length}` : studentsDataList.length.toString(), bold: true, italics: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: ` sinh viên)`, italics: true, size: 24, font: 'Times New Roman' }),
      ]
    })
  ];
}

function buildXacNhanListChildren(studentsDataList, globalSettings = {}) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        tableCellSimple('STT', true, 5, cellBorders),
        tableCellSimple('Họ và lót', true, 20, cellBorders),
        tableCellSimple('Tên', true, 10, cellBorders),
        tableCellSimple('Ngày sinh', true, 10, cellBorders),
        tableCellSimple('Lớp', true, 12, cellBorders),
        tableCellSimple('Địa chỉ', true, 20, cellBorders),
        tableCellSimple('Ngày trình hồ sơ', true, 13, cellBorders),
        tableCellSimple('Ghi chú', true, 10, cellBorders),
      ]
    })
  ];

  const dateStr = new Date().toLocaleDateString('vi-VN');

  studentsDataList.forEach((s, index) => {
    const fullName = (s.fullName || '').trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts.pop() || '';
    const lastNameAndMiddle = nameParts.join(' ') || '';
    
    rows.push(new TableRow({
      children: [
        tableCellSimple((index + 1).toString(), false, 5, cellBorders),
        tableCellSimple(lastNameAndMiddle, false, 20, cellBorders),
        tableCellSimple(firstName, false, 10, cellBorders),
        tableCellSimple(s.dob || '', false, 10, cellBorders),
        tableCellSimple(s.classCode || '', false, 12, cellBorders),
        tableCellSimple('', false, 20, cellBorders),
        tableCellSimple(dateStr, false, 13, cellBorders),
        tableCellSimple('NĐ 238', false, 10, cellBorders),
      ]
    }));
  });

  const city = globalSettings.city || 'Tp. Hồ Chí Minh';
  const today = new Date();
  const dateText = `${city}, ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  return [
    // Header
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
                centerPara('BỘ GIÁO DỤC & ĐÀO TẠO', 22),
                centerBoldPara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', 22),
                separateLineTable(28)
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders(),
              children: [
                centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 22),
                centerBoldPara('Độc lập - Tự do - Hạnh phúc', 22),
                separateLineTable(38)
              ]
            }),
          ]
        })
      ]
    }),

    emptyPara(),

    // Title
    centerBoldPara('DANH SÁCH SINH VIÊN XIN GIẤY XÁC NHẬN', 28),
    emptyPara(),

    // Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows
    }),

    emptyPara(),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: dateText, italics: true, size: 24, font: 'Times New Roman' })
      ]
    }),
    
    // Signatures
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
                            centerBoldPara('PHÒNG ĐÀO TẠO VÀ CTHSSV', 24),
                            emptyPara(), emptyPara(), emptyPara(),
                            centerBoldPara('Trương Kiều Oanh', 24),
                        ]
                    }),
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: noBorders(),
                        children: [
                            centerBoldPara('Người lập', 24),
                            emptyPara(), emptyPara(), emptyPara(),
                            centerBoldPara('Nguyễn Trí Vinh', 24),
                        ]
                    })
                ]
            })
        ]
    }),
    emptyPara(),
    centerBoldPara('PHÓ GIÁM ĐỐC', 24)
  ];
}


function buildKiemTraHocPhiChildren(studentsList, globalSettings = {}) {
  const kiemTraSemesters = globalSettings.kiemTraSemesters || [];
  const hasMultiSemesters = kiemTraSemesters.length > 0;

  const rowsData = [];
  if (hasMultiSemesters && studentsList.length > 0) {
    studentsList.forEach(s => {
      kiemTraSemesters.forEach(sem => {
        rowsData.push({
          ...s,
          _semesterLabel: `HK${sem.semester} - ${sem.schoolYear}`,
        });
      });
    });
  } else {
    studentsList.forEach(s => {
      rowsData.push({ ...s, _semesterLabel: '' });
    });
  }

  const tableHeaderRows = [
    tableCellSimple('TT', true, 5, cellBorders, 24, 240),
    tableCellSimple('Mã lớp', true, 15, cellBorders, 24, 240),
    tableCellSimple('Họ và tên', true, 25, cellBorders, 24, 240),
    tableCellSimple('Ngày sinh', true, 15, cellBorders, 24, 240)
  ];
  if (hasMultiSemesters) {
    tableHeaderRows.push(tableCellSimple('Học kỳ', true, 15, cellBorders, 24, 240));
  }
  tableHeaderRows.push(tableCellSimple('Học phí', true, 15, cellBorders, 24, 240));
  tableHeaderRows.push(tableCellSimple('Số hóa đơn', true, 10, cellBorders, 24, 240));

  const rows = [
    new TableRow({
      tableHeader: true,
      children: tableHeaderRows
    })
  ];

  rowsData.forEach((row, index) => {
    const rCells = [
      tableCellSimple((index + 1).toString(), false, 5, cellBorders, 24, 240),
      tableCellSimple(row.classCode || '', false, 15, cellBorders, 24, 240),
      new TableCell({
        borders: cellBorders,
        width: { size: 25, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: ` ${row.fullName || ''}`, size: 24, font: 'Times New Roman' })] })]
      }),
      tableCellSimple(row.dob || '', false, 15, cellBorders, 24, 240)
    ];
    if (hasMultiSemesters) {
      rCells.push(tableCellSimple(row._semesterLabel || '', false, 15, cellBorders, 24, 240));
    }
    rCells.push(tableCellSimple(row.tuitionStatus || '', false, 15, cellBorders, 24, 240));
    rCells.push(tableCellSimple(row.invoiceNumber || '', false, 10, cellBorders, 24, 240));

    rows.push(new TableRow({ children: rCells }));
  });

  const dateStr = 'ngày ... tháng ... năm 2026'; // Match UI

  return [
    // Header
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
                centerPara('BỘ GIÁO DỤC VÀ ĐÀO TẠO', 22),
                centerBoldPara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', 22),
                separateLineTable(40)
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders(),
              children: [
                centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 22),
                centerBoldPara('Độc lập - Tự do - Hạnh phúc', 22),
                separateLineTable(38)
              ]
            }),
          ]
        })
      ]
    }),

    emptyPara(),

    // Title
    centerBoldPara('DANH SÁCH SINH VIÊN KIỂM TRA TÌNH TRẠNG HỌC PHÍ ĐỂ THỰC HIỆN HỒ SƠ', 26),
    new Paragraph({
      spacing: { after: 120, before: 60, line: 240 },
      children: [
        new TextRun({ text: `Ngày kiểm tra: ${dateStr}`, size: 24, font: 'Times New Roman' })
      ]
    }),

    // Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows
    }),

    emptyPara(),
    // Signatures
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
                            centerBoldPara('PHÒNG KH-TC', 24),
                        ]
                    }),
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: noBorders(),
                        children: [
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Cần Thơ, ${dateStr}`, italics: true, size: 24, font: 'Times New Roman' })] }),
                            centerBoldPara('Người lập biểu', 24),
                        ]
                    })
                ]
            })
        ]
    })
  ];
}

// ============================================
// HỖ TRỢ NĐ 238
// ============================================
function buildDanhSachNghiDinh238MoiChildren(queueItems, globalSettings) {
  const rows = [];
  // Column widths in DXA (twips) - total = 15704 (landscape A4 minus 1cm margins)
  const CW = [314, 1413, 471, 785, 942, 1413, 942, 942, 471, 942, 785, 785, 785, 314, 785, 1256, 942, 785, 631];
  
  // Build header row 1
  rows.push(new TableRow({
    children: [
      tableCellDxa('STT', true, CW[0], cellBorders),
      tableCellDxa('Họ và tên', true, CW[1], cellBorders),
      tableCellDxa('Năm sinh', true, CW[2], cellBorders),
      tableCellDxa('Số CCCD', true, CW[3], cellBorders),
      tableCellDxa('Ngày tháng năm cấp, nơi cấp', true, CW[4], cellBorders),
      tableCellDxa('Địa chỉ', true, CW[5], cellBorders),
      tableCellDxa('Học trường', true, CW[6], cellBorders),
      tableCellDxa('Ngành học', true, CW[7], cellBorders),
      tableCellDxa('Khóa học', true, CW[8], cellBorders),
      tableCellDxa('Năm học, Học kỳ', true, CW[9], cellBorders),
      tableCellDxa('Mức trần học phí/ tháng', true, CW[10], cellBorders),
      tableCellDxa('Mức học phí sinh viên đã đóng/tháng', true, CW[11], cellBorders),
      tableCellDxa('Mức học phí được hỗ trợ/ tháng', true, CW[12], cellBorders),
      tableCellDxa('Số tháng', true, CW[13], cellBorders),
      tableCellDxa('Tổng cộng (hỗ trợ 70%)', true, CW[14], cellBorders),
      tableCellDxa('Tên tài khoản thụ hưởng', true, CW[15], cellBorders),
      tableCellDxa('Số tài khoản thụ hưởng', true, CW[16], cellBorders),
      tableCellDxa('Ngân hàng', true, CW[17], cellBorders),
      tableCellDxa('Số điện thoại', true, CW[18], cellBorders),
    ]
  }));
  // header row 2 (A B C 1 2 ...)
  rows.push(new TableRow({
    children: [
      tableCellDxa('A', false, CW[0], cellBorders),
      tableCellDxa('B', false, CW[1], cellBorders),
      tableCellDxa('C', false, CW[2], cellBorders),
      tableCellDxa('D', false, CW[3], cellBorders),
      tableCellDxa('E', false, CW[4], cellBorders),
      tableCellDxa('G', false, CW[5], cellBorders),
      tableCellDxa('H', false, CW[6], cellBorders),
      tableCellDxa('1', false, CW[7], cellBorders),
      tableCellDxa('2', false, CW[8], cellBorders),
      tableCellDxa('3', false, CW[9], cellBorders),
      tableCellDxa('4', false, CW[10], cellBorders),
      tableCellDxa('5', false, CW[11], cellBorders),
      tableCellDxa('6', false, CW[12], cellBorders),
      tableCellDxa('7', false, CW[13], cellBorders),
      tableCellDxa('8=6*7*70%', false, CW[14], cellBorders),
      tableCellDxa('9', false, CW[15], cellBorders),
      tableCellDxa('10', false, CW[16], cellBorders),
      tableCellDxa('11', false, CW[17], cellBorders),
      tableCellDxa('12', false, CW[18], cellBorders),
    ]
  }));
  
  // Row for title group
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        columnSpan: 19,
        width: { size: 15704, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Học ngành nghề nặng nhọc, độc hại, nguy hiểm (giảm 70% học phí)', bold: true, size: 12, font: 'Times New Roman' })] })]
      })
    ]
  }));

  // Map data to rows
  let grandTotal = 0;
  
  let qdSo = '';
  let dateStr = 'ngày ... tháng ... năm 2026';
  if (queueItems.length > 0) {
    const firstItem = queueItems[0].savedSettings || queueItems[0].itemGlobalSettings;
    if (firstItem && firstItem.quyetDinhSoND238) qdSo = firstItem.quyetDinhSoND238;
    if (firstItem && firstItem.ngayQuyetDinhND238) dateStr = firstItem.ngayQuyetDinhND238;
  }

  const flatRows = [];
  queueItems.forEach((item, index) => {
    const s = item.student || item.data;
    const isMulti = item.formId === 'danh_sach_nd238_moi_multi';
    const settings = item.savedSettings || item.itemGlobalSettings || globalSettings;
    
    if (isMulti && settings.multiSemesters && settings.multiSemesters.length > 0) {
      settings.multiSemesters.forEach(sem => {
        const nganh = getDisplayNhomNganh(s.department, s.major);
        const autoMucTran = getAutoCeiling(sem.schoolYear, nganh);
        flatRows.push({
          student: s,
          namHoc: `${sem.schoolYear}, Học kỳ ${sem.semester}`,
          mucTran: autoMucTran,
          mucDong: parseInt((sem.tuitionFee || '').replace(/\./g, '')) || 0,
          soThang: parseInt(sem.soThang) || 0
        });
      });
    } else {
      const hocKyStr = settings.semester?.includes('Học kỳ') ? settings.semester : `Học kỳ ${settings.semester}`;
      const nganh = getDisplayNhomNganh(s.department);
      const autoMucTran = getAutoCeiling(settings.schoolYear, nganh);
      flatRows.push({
        student: s,
        namHoc: `${settings.schoolYear}, ${hocKyStr}`,
        mucTran: autoMucTran,
        mucDong: parseInt((settings.tuitionFee || '').replace(/\./g, '')) || 0,
        soThang: parseInt(settings.soThang) || 0
      });
    }
  });

  flatRows.forEach((row, index) => {
    const { student: s, namHoc, mucTran, mucDong, soThang } = row;
    const mucHoTro = mucDong > mucTran ? mucTran : mucDong;
    const tongCong = mucHoTro * soThang * 0.7;
    grandTotal += tongCong;

    const issueDate = s.idCardIssueDate || '';
    const issuePlace = s.idCardIssuePlace || '';
    const dobParts = (s.dob || '').split('/');
    const birthYear = dobParts.length > 0 ? dobParts[dobParts.length - 1] : '';

    rows.push(new TableRow({
      children: [
        tableCellDxa((index + 1).toString(), false, CW[0], cellBorders),
        tableCellDxa(s.fullName || '', false, CW[1], cellBorders),
        tableCellDxa(birthYear, false, CW[2], cellBorders),
        tableCellDxa(s.idCard || '', false, CW[3], cellBorders),
        tableCellDxa(`${issueDate} ${issuePlace}`, false, CW[4], cellBorders),
        tableCellDxa(s.address || '', false, CW[5], cellBorders),
        tableCellDxa('Trường Cao đẳng Đại Việt Sài Gòn', false, CW[6], cellBorders),
        tableCellDxa(s.major || '', false, CW[7], cellBorders),
        tableCellDxa(s.classCode || '', false, CW[8], cellBorders),
        tableCellDxa(namHoc, false, CW[9], cellBorders),
        tableCellDxa(mucTran.toLocaleString('vi-VN'), false, CW[10], cellBorders),
        tableCellDxa(mucDong.toLocaleString('vi-VN'), false, CW[11], cellBorders),
        tableCellDxa(mucHoTro.toLocaleString('vi-VN'), false, CW[12], cellBorders),
        tableCellDxa(soThang.toString(), false, CW[13], cellBorders),
        tableCellDxa(tongCong.toLocaleString('vi-VN'), false, CW[14], cellBorders),
        tableCellDxa(s.accountName !== undefined ? s.accountName : (s.fullName || ''), false, CW[15], cellBorders),
        tableCellDxa(s.accountNumber || '', false, CW[16], cellBorders), // STK
        tableCellDxa(s.bankName || '', false, CW[17], cellBorders), // Ngân hàng
        tableCellDxa(s.phone || '', false, CW[18], cellBorders),
      ]
    }));
  });

  // Dòng tổng cộng
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        columnSpan: 14,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        width: { size: CW.slice(0, 14).reduce((a, b) => a + b, 0), type: WidthType.DXA },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TỔNG CỘNG', bold: true, size: 12, font: 'Times New Roman' })] })]
      }),
      tableCellDxa(grandTotal.toLocaleString('vi-VN'), true, CW[14], cellBorders),
      new TableCell({
        borders: cellBorders,
        columnSpan: 4,
        margins: { top: 60, bottom: 60, left: 40, right: 40 },
        width: { size: CW.slice(15).reduce((a, b) => a + b, 0), type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 12, font: 'Times New Roman' })] })]
      })
    ]
  }));

  return [
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
                centerPara('BỘ GIÁO DỤC VÀ ĐÀO TẠO', 12),
                centerBoldPara('TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN', 12),
                separateLineTable(40)
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders(),
              children: [
                centerBoldPara('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 12),
                centerBoldPara('Độc lập - Tự do - Hạnh phúc', 12),
                separateLineTable(55)
              ]
            }),
          ]
        })
      ]
    }),
    emptyPara(),
    centerBoldPara('DANH SÁCH SINH VIÊN ĐỀ NGHỊ HƯỞNG CHẾ ĐỘ MIỄN, GIẢM HỌC PHÍ THEO NGHỊ ĐỊNH 238/NĐ-CP NGÀY 03/9/2025 CỦA CHÍNH PHỦ', 16),
    centerBoldPara(`HỌC KỲ ${globalSettings.semester}, NĂM HỌC ${globalSettings.schoolYear}`, 16),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, before: 100 },
      children: [
        new TextRun({ text: `(Ban hành kèm theo Quyết định số ${qdSo}/QĐNB-SV-ĐVSG-ĐT&QLSV ${dateStr}`, italics: true, size: 16, font: 'Times New Roman' }),
        new TextRun({ text: '\ncủa Hiệu trưởng Trường Cao đẳng Đại Việt Sài Gòn)', italics: true, size: 16, font: 'Times New Roman' }),
      ]
    }),
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 15704, type: WidthType.DXA },
      columnWidths: [400, 1200, 500, 900, 900, 1200, 900, 900, 600, 900, 800, 800, 800, 400, 800, 1200, 1000, 800, 604],
      rows: rows
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, before: 200 },
      children: [
        new TextRun({ text: `Số tiền bằng chữ: ${numberToWords(grandTotal)}`, bold: true, italics: true, size: 12, font: 'Times New Roman' }),
      ]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders(), children: [emptyPara()] }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders(),
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: 'TL. HIỆU TRƯỞNG', bold: true, size: 26, font: 'Times New Roman' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: 'KT. GIÁM ĐỐC CƠ SỞ', bold: true, size: 26, font: 'Times New Roman' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: 'PHÓ GIÁM ĐỐC', bold: true, size: 26, font: 'Times New Roman' })] }),
                emptyPara(), emptyPara(), emptyPara(),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: 'ThS. Nguyễn Chí Trọng', bold: true, size: 26, font: 'Times New Roman' })] }),
              ]
            })
          ]
        })
      ]
    })
  ];
}


// ============= EXPORT FUNCTIONS =============

/**
 * Xuất Giấy Xác Nhận (ngành nghề nặng nhọc) - 1 file
 */
export async function exportGiayXacNhan(data, globalSettings = {}) {
  const doc = new Document({
    sections: [{
      properties: pageProps,
      children: buildGiayXacNhanChildren(data),
    }]
  });
  const blob = await Packer.toBlob(doc);
  const fileName = `Giay_Xac_Nhan_${(data.fullName || 'SV').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

/**
 * Xuất Giấy Xác Nhận Miễn Giảm (PHỤ LỤC V) - 1 file
 */
export async function exportGiayXacNhanMienGiam(data, globalSettings = {}) {
  const doc = new Document({
    sections: [{
      properties: pageProps,
      children: buildGiayXacNhanMienGiamChildren(data),
    }]
  });
  const blob = await Packer.toBlob(doc);
  const fileName = `Giay_Xac_Nhan_Mien_Giam_${(data.fullName || 'SV').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

/**
 * Xuất Dự Toán Kinh Phí (PHỤ LỤC VI) - 1 file
 */
export async function exportDuToanKinhPhi(data, globalSettings = {}) {
  const doc = new Document({
    sections: [{
      properties: pageProps,
      children: buildDuToanKinhPhiChildren(data),
    }]
  });
  const blob = await Packer.toBlob(doc);
  const fileName = `Du_Toan_Kinh_Phi_${(data.fullName || 'SV').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

/**
 * Xuất Danh Sách Sinh Viên (Giảm Miễn Học Phí) - 1 file
 */
export async function exportDanhSachSinhVien(studentsDataList, globalSettings = {}) {
  const doc = new Document({
    sections: [{
      properties: landscapePageProps,
      children: buildDanhSachSinhVienChildren(studentsDataList, globalSettings),
    }]
  });
  const blob = await Packer.toBlob(doc);
  const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
  const fileName = `Danh_Sach_Sinh_Vien_Giam_70_${date}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

/**
 * Xuất Danh Sách Kiểm Tra Học Phí - 1 file
 */
export async function exportDanhSachKiemTraHocPhi(studentsList, globalSettings = {}, customFileName = null) {
  const doc = new Document({
    sections: [{
      properties: pageProps,
      children: buildKiemTraHocPhiChildren(studentsList, globalSettings),
    }]
  });
  const blob = await Packer.toBlob(doc);
  const fileName = customFileName || `Danh_Sach_SV_Kiem_Tra_Hoc_Phi_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

/**
 * Xuất TRỌN BỘ - tất cả 4 biểu mẫu (có thêm danh sách) gộp vào 1 file Word duy nhất
 * Mỗi biểu mẫu nằm trên 1 trang riêng (page break between sections)
 */
export async function exportTronBo(data, globalSettings = {}) {
  const doc = new Document({
    sections: [
      {
        properties: pageProps,
        children: buildGiayXacNhanChildren(data),
      },
      {
        properties: { ...pageProps, type: SectionType.NEXT_PAGE },
        children: buildGiayXacNhanMienGiamChildren(data),
      },
      {
        properties: { ...pageProps, type: SectionType.NEXT_PAGE },
        children: buildDuToanKinhPhiChildren(data),
      },
      {
        properties: { ...landscapePageProps, type: SectionType.NEXT_PAGE },
        children: buildDanhSachSinhVienChildren([data], globalSettings),
      },
    ]
  });
  const blob = await Packer.toBlob(doc);
  const fileName = `Ho_So_Tron_Bo_${(data.fullName || 'SV').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

/**
 * Xuất hàng đợi (Print Queue) - gộp tất cả các biểu mẫu của nhiều sinh viên vào 1 file Word duy nhất.
 * queueItems là mảng các object: { formId, data }
 */
export async function exportQueue(queueItems, globalSettings = {}, customFileName = null, exportType = 'all') {
  const sections = [];
  
  for (let i = 0; i < queueItems.length; i++) {
    const item = queueItems[i];
    const { formId, data } = item;
    
    // Hàm helper để thêm section với NEXT_PAGE nếu không phải section đầu tiên
    const addSection = (children) => {
      sections.push({
        properties: { ...pageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
        children
      });
    };

    if (exportType === 'all' || exportType === 'portrait') {
      if (formId === 'giay_xac_nhan' || formId === 'all_forms' || formId === 'all_forms_multi' || formId === 'all_forms_nd238_moi' || formId === 'all_forms_nd238_moi_multi') {
        addSection(buildGiayXacNhanChildren(data));
      }

      if (formId === 'giay_xac_nhan_mien_giam' || formId === 'all_forms' || formId === 'all_forms_nd238_moi') {
        addSection(buildGiayXacNhanMienGiamChildren(data));
      }
      
      if (formId === 'du_toan' || formId === 'all_forms' || formId === 'all_forms_nd238_moi') {
        addSection(buildDuToanKinhPhiChildren(data));
      }
    }
    
    if (exportType === 'all' || exportType === 'landscape') {
      if (formId === 'danh_sach' || formId === 'all_forms') {
        // Mỗi bộ hồ sơ chỉ có danh sách của sinh viên đó thôi
        const dsList = [data];
        sections.push({
          properties: { ...landscapePageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
          children: buildDanhSachSinhVienChildren(dsList, globalSettings)
        });
      } else if (formId === 'all_forms_nd238_moi') {
        sections.push({
          properties: { ...landscapePageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
          children: buildDanhSachNghiDinh238MoiChildren([{ formId: 'danh_sach_nd238_moi', data, student: data, itemGlobalSettings: globalSettings }], globalSettings)
        });
      }
    }
    
    if (formId === 'all_forms_multi' || formId === 'all_forms_nd238_moi_multi') {
      // Ưu tiên dùng itemGlobalSettings (đã lưu kèm multiSemesters từ lúc thêm vào hàng đợi)
      const effectiveSettings = item.itemGlobalSettings || globalSettings;
      const multiSemesters = effectiveSettings.multiSemesters || [];
      for (const sem of multiSemesters) {
        const semData = { 
          ...data, 
          semester: sem.semester, 
          schoolYear: sem.schoolYear,
          soThang: sem.soThang,
          tuitionFee: sem.tuitionFee,
          mucThu: sem.tuitionFee,
          hocKy: `Học kỳ ${sem.semester}`,
          namHoc: sem.schoolYear,
          currentYear: sem.currentYear || data.currentYear
        };
        
        if (exportType === 'all' || exportType === 'portrait') {
          addSection(buildGiayXacNhanMienGiamChildren(semData));
          addSection(buildDuToanKinhPhiChildren(semData));
        }
        
        if (exportType === 'all' || exportType === 'landscape') {
          if (formId === 'all_forms_multi') {
            const dsListMulti = [semData];
            sections.push({
              properties: { ...landscapePageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
              children: buildDanhSachSinhVienChildren(dsListMulti, effectiveSettings)
            });
          } else if (formId === 'all_forms_nd238_moi_multi') {
            sections.push({
              properties: { ...landscapePageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
              children: buildDanhSachNghiDinh238MoiChildren([{ formId: 'danh_sach_nd238_moi_multi', data: semData, student: semData, itemGlobalSettings: effectiveSettings }], effectiveSettings)
            });
          }
        }
      }
    }

    if (formId === 'kiem_tra_hoc_phi') {
      const kiemTraData = item.allStudents || [item.data];
      sections.push({
        properties: { ...pageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
        children: buildKiemTraHocPhiChildren(kiemTraData, globalSettings)
      });
    }
  }

  // Handle new summary lists that compile all data from the queue
  if (exportType === 'landscape_xacnhan') {
    const allData = queueItems.map(item => item.data);
    sections.push({
      properties: { ...landscapePageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
      children: buildXacNhanListChildren(allData, globalSettings)
    });
  }

  if (exportType === 'kiem_tra_hp') {
    const allData = queueItems.map(item => item.data);
    sections.push({
      properties: { ...pageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
      children: buildKiemTraHocPhiChildren(allData, globalSettings)
    });
  }

  if (exportType === 'nd238') {
    const nd238Items = queueItems.filter(item => item.formId === 'danh_sach_nd238_moi' || item.formId === 'danh_sach_nd238_moi_multi');
    if (nd238Items.length > 0) {
      sections.push({
        properties: { ...landscapePageProps, type: sections.length > 0 ? SectionType.NEXT_PAGE : undefined },
        children: buildDanhSachNghiDinh238MoiChildren(nd238Items, globalSettings)
      });
    }
  }

  if (sections.length === 0) {
    throw new Error('Hàng đợi đang trống hoặc không có hồ sơ hợp lệ để xuất.');
  }

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
  const fileName = customFileName || `Hang_Doi_Ho_So_${queueItems.length}_Bo_${date}.docx`;
  saveAs(blob, fileName);
  return fileName;
}
