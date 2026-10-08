import { useState, useEffect } from 'react';
import { numberToWords } from '../utils/numberToWords';
import { getDisplayDepartment, getDisplayNhomNganh, getAutoCeiling } from '../utils/studentUtils';

export default function DanhSachNghiDinh238MoiForm({ queueItems = [], globalSettings = {} }) {
  const fontFamily = globalSettings?.fontFamily || '"Times New Roman", serif';
  const baseFontSize = globalSettings?.baseFontSize || 11;

  // Nếu trong queue không có phần tử nào có quyetDinhSo, dùng mặc định
  let qdSo = '';
  let initDate = 'ngày ... tháng ... năm 2026';
  if (queueItems.length > 0) {
    const firstItem = queueItems[0].savedSettings;
    if (firstItem && firstItem.quyetDinhSoND238) qdSo = firstItem.quyetDinhSoND238;
    if (firstItem && firstItem.ngayQuyetDinhND238) initDate = firstItem.ngayQuyetDinhND238;
  }

  const [quyetDinhSo, setQuyetDinhSo] = useState(qdSo);
  const [dateStr, setDateStr] = useState(initDate);

  useEffect(() => {
    if (queueItems.length > 0) {
      const firstItem = queueItems[0].savedSettings;
      if (firstItem && firstItem.quyetDinhSoND238) setQuyetDinhSo(firstItem.quyetDinhSoND238);
      if (firstItem && firstItem.ngayQuyetDinhND238) setDateStr(firstItem.ngayQuyetDinhND238);
    }
  }, [queueItems]);

  // Expand queue items to rows. 
  const rows = [];
  queueItems.forEach((item, index) => {
    const s = item.student;
    const isMulti = item.formId === 'danh_sach_nd238_moi_multi';
    const settings = item.savedSettings || globalSettings;
    
    if (isMulti && settings.multiSemesters && settings.multiSemesters.length > 0) {
      settings.multiSemesters.forEach(sem => {
        const nganh = getDisplayNhomNganh(s.department, s.major);
        const autoMucTran = getAutoCeiling(sem.schoolYear, nganh);
        rows.push({
          student: s,
          namHoc: `${sem.schoolYear}, Học kỳ ${sem.semester}`,
          mucTran: autoMucTran,
          mucDong: parseInt((sem.tuitionFee || '').replace(/\./g, '')) || 0,
          soThang: parseInt(sem.soThang) || 0,
          nganh: nganh
        });
      });
    } else {
      const hocKyStr = settings.semester?.includes('Học kỳ') ? settings.semester : `Học kỳ ${settings.semester}`;
      const nganh = getDisplayNhomNganh(s.department, s.major);
      const autoMucTran = getAutoCeiling(settings.schoolYear, nganh);
      rows.push({
        student: s,
        namHoc: `${settings.schoolYear}, ${hocKyStr}`,
        mucTran: autoMucTran,
        mucDong: parseInt((settings.tuitionFee || '').replace(/\./g, '')) || 0,
        soThang: parseInt(settings.soThang) || 0,
        nganh: nganh
      });
    }
  });

  let grandTotal = 0;

  const thStyle = { border: '1px solid black', padding: '2px 3px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', fontSize: '6.5pt', lineHeight: '1.2' };
  const tdStyle = { border: '1px solid black', padding: '1px 2px', verticalAlign: 'middle', textAlign: 'center', fontSize: '8pt', lineHeight: '1.3' };
  const labelStyle = { border: '1px solid black', padding: '1px 2px', verticalAlign: 'middle', textAlign: 'center', fontStyle: 'italic', fontSize: '6.5pt' };

  return (
    <div className="print:p-0 w-full" style={{ fontFamily, fontSize: '8pt' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginBottom: '12px', fontSize: '8pt' }}>
        <div style={{ flex: 1 }}>
          <div>BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
          <div style={{ fontWeight: 'bold' }}>TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style={{ fontWeight: 'bold' }}>Độc lập - Tự do - <span style={{ textDecoration: 'underline' }}>Hạnh phúc</span></div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '4px', fontSize: '8pt', lineHeight: '1.4' }}>
        DANH SÁCH SINH VIÊN ĐỀ NGHỊ HƯỞNG CHẾ ĐỘ MIỄN, GIẢM HỌC PHÍ THEO NGHỊ ĐỊNH 238/NĐ-CP NGÀY 03/9/2025 CỦA CHÍNH PHỦ
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px', fontSize: '8pt' }}>
        HỌC KỲ {globalSettings.semester}, NĂM HỌC {globalSettings.schoolYear}
      </div>

      {/* Sub header */}
      <div style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: '8px', fontSize: '8pt' }}>
        (Ban hành kèm theo Quyết định số:{' '}
        <input className="bg-transparent border-b border-dashed border-gray-400 focus:outline-none" style={{ width: '50px', textAlign: 'center', fontSize: '8pt' }} value={quyetDinhSo} onChange={e => setQuyetDinhSo(e.target.value)} />
        /QĐNB-SV-ĐVSG-ĐT&QLSV{' '}
        <input className="bg-transparent border-b border-dashed border-gray-400 focus:outline-none" style={{ width: '150px', textAlign: 'center', fontSize: '8pt' }} value={dateStr} onChange={e => setDateStr(e.target.value)} />
        <br/>của Hiệu trưởng Trường Cao đẳng Đại Việt Sài Gòn)
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '8px' }}>
        <colgroup>
          <col style={{ width: '3%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '3.5%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '3%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '5%' }} />
        </colgroup>
        <thead>
          {/* Row 1: Column Headers - font 6.5pt */}
          <tr>
            <th style={thStyle}>STT</th>
            <th style={thStyle}>Họ và tên</th>
            <th style={thStyle}>Năm sinh</th>
            <th style={thStyle}>Số CCCD</th>
            <th style={thStyle}>Ngày tháng năm cấp, nơi cấp</th>
            <th style={thStyle}>Địa chỉ</th>
            <th style={thStyle}>Học trường</th>
            <th style={thStyle}>Ngành học</th>
            <th style={thStyle}>Khóa học</th>
            <th style={thStyle}>Năm học, Học kỳ</th>
            <th style={thStyle}>Mức trần học phí/ tháng</th>
            <th style={thStyle}>Mức học phí sinh viên đã đóng/ tháng</th>
            <th style={thStyle}>Mức học phí được hỗ trợ/ tháng</th>
            <th style={thStyle}>Số tháng</th>
            <th style={thStyle}>Tổng cộng (hỗ trợ 70%)</th>
            <th style={thStyle}>Tên tài khoản thụ hưởng</th>
            <th style={thStyle}>Số tài khoản thụ hưởng</th>
            <th style={thStyle}>Ngân hàng</th>
            <th style={thStyle}>Số điện thoại</th>
          </tr>
          {/* Row 2: Column Labels - font 6.5pt */}
          <tr>
            <td style={labelStyle}>A</td>
            <td style={labelStyle}>B</td>
            <td style={labelStyle}>C</td>
            <td style={labelStyle}>D</td>
            <td style={labelStyle}>E</td>
            <td style={labelStyle}>G</td>
            <td style={labelStyle}>H</td>
            <td style={labelStyle}>1</td>
            <td style={labelStyle}>2</td>
            <td style={labelStyle}>3</td>
            <td style={labelStyle}>4</td>
            <td style={labelStyle}>5</td>
            <td style={labelStyle}>6</td>
            <td style={labelStyle}>7</td>
            <td style={labelStyle}>8=6*7*70%</td>
            <td style={labelStyle}>9</td>
            <td style={labelStyle}>10</td>
            <td style={labelStyle}>11</td>
            <td style={labelStyle}>12</td>
          </tr>
          {/* Row 3: Section Header */}
          <tr>
            <td colSpan="19" style={{ border: '1px solid black', fontWeight: 'bold', textAlign: 'left', fontSize: '8pt', padding: '3px 4px' }}>
              Học ngành nghề nặng nhọc, độc hại, nguy hiểm (giảm 70% học phí)
            </td>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const { student: s, namHoc, mucTran, mucDong, soThang } = row;
            
            // Tính Mức hỗ trợ (Lấy số nhỏ hơn giữa mức đóng và mức trần)
            const mucHoTro = mucDong > mucTran ? mucTran : mucDong;
            
            // Tính Tổng cộng: Mức hỗ trợ * Số tháng * 70%
            const tongCong = mucHoTro * soThang * 0.7;
            grandTotal += tongCong;

            // Parse ngày cấp
            const issueDate = s.idCardIssueDate || '';
            const issuePlace = s.idCardIssuePlace || '';
            const dobParts = (s.dob || '').split('/');
            const birthYear = dobParts.length > 0 ? dobParts[dobParts.length - 1] : '';

            return (
              <tr key={idx}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', wordBreak: 'break-word' }}>{s.fullName}</td>
                <td style={tdStyle}>{birthYear}</td>
                <td style={{ ...tdStyle, fontSize: '7pt' }}>{s.idCard}</td>
                <td style={{ ...tdStyle, fontSize: '7pt', wordBreak: 'break-word' }}>{issueDate}{issuePlace && <><br/>-{issuePlace}</>}</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontSize: '7pt', wordBreak: 'break-word' }}>{s.address}</td>
                <td style={{ ...tdStyle, fontSize: '7pt' }}>Trường Cao đẳng Đại Việt Sài Gòn</td>
                <td style={{ ...tdStyle, fontSize: '7pt', wordBreak: 'break-word' }}>{s.major}</td>
                <td style={{ ...tdStyle, fontSize: '7pt' }}>{s.classCode}</td>
                <td style={{ ...tdStyle, fontSize: '7pt', wordBreak: 'break-word' }}>{namHoc}</td>
                <td style={tdStyle}>{mucTran.toLocaleString('vi-VN')}</td>
                <td style={tdStyle}>{mucDong.toLocaleString('vi-VN')}</td>
                <td style={tdStyle}>{mucHoTro.toLocaleString('vi-VN')}</td>
                <td style={tdStyle}>{soThang}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{tongCong.toLocaleString('vi-VN')}</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontSize: '7pt', wordBreak: 'break-word' }}>{s.accountName !== undefined ? s.accountName : s.fullName}</td>
                <td style={{ ...tdStyle, fontSize: '7pt', wordBreak: 'break-word' }}>{s.accountNumber}</td>
                <td style={{ ...tdStyle, fontSize: '7pt', wordBreak: 'break-word' }}>{s.bankName}</td>
                <td style={{ ...tdStyle, fontSize: '7pt' }}>{s.phone}</td>
              </tr>
            );
          })}
          
          {/* Dòng tổng cộng */}
          <tr>
            <td colSpan="14" style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', padding: '3px' }}>TỔNG CỘNG</td>
            <td style={{ ...tdStyle, fontWeight: 'bold' }}>{grandTotal.toLocaleString('vi-VN')}</td>
            <td colSpan="4" style={tdStyle}></td>
          </tr>
        </tbody>
      </table>

      {/* Số tiền bằng chữ */}
      <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '6.5pt', marginTop: '8px', marginBottom: '16px' }}>
        Số tiền bằng chữ: {numberToWords(grandTotal)}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', textAlign: 'center', fontWeight: 'bold', marginTop: '24px', fontSize: '8pt' }}>
        <div>
          <div>KT. HIỆU TRƯỞNG</div>
          <div>PHÓ HIỆU TRƯỞNG</div>
          <div style={{ marginTop: '60px' }}>ThS. Nguyễn Tấn Thông</div>
        </div>
      </div>
    </div>
  );
}
