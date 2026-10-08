import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

export default function DanhSachKiemTraHocPhiForm({ studentsList = [], globalSettings = {}, onRemoveStudent, onUpdateStudent }) {
  const [dateStr, setDateStr] = useState(() => {
    if (globalSettings?.signDate) {
      const parts = globalSettings.signDate.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  });
  
  const [footerDate, setFooterDate] = useState(() => {
    if (globalSettings?.signDate) {
      const parts = globalSettings.signDate.split('-');
      if (parts.length === 3) return `${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')} tháng ${(d.getMonth() + 1).toString().padStart(2, '0')} năm ${d.getFullYear()}`;
  });

  // Lấy danh sách học kỳ cần kiểm tra từ globalSettings
  const kiemTraSemesters = globalSettings.kiemTraSemesters || [];
  const hasMultiSemesters = kiemTraSemesters.length > 0;

  // Tạo danh sách dòng: nhân bản mỗi sinh viên theo số học kỳ
  const rows = [];
  if (hasMultiSemesters && studentsList.length > 0) {
    studentsList.forEach(s => {
      kiemTraSemesters.forEach(sem => {
        rows.push({
          ...s,
          _semesterLabel: `HK${sem.semester} - ${sem.schoolYear}`,
          _semesterId: sem.id
        });
      });
    });
  } else {
    studentsList.forEach(s => {
      rows.push({ ...s, _semesterLabel: '', _semesterId: null });
    });
  }

  const fontFamily = globalSettings?.fontFamily || '"Times New Roman", serif';
  const baseFontSize = globalSettings?.baseFontSize || 12;

  return (
    <div className="p-0" style={{ fontFamily, fontSize: `${baseFontSize}pt` }}>
      <div className="grid grid-cols-2 font-bold mb-6 whitespace-nowrap" style={{ fontSize: `${baseFontSize + 1}pt` }}>
        <div className="text-center leading-tight">
          <div className="font-normal">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
          <div>TRƯỜNG <span className="border-b border-black inline-block pb-0.5">CAO ĐẲNG</span> ĐẠI VIỆT SÀI GÒN</div>
        </div>
        <div className="text-center leading-tight">
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div className="border-b border-black inline-block pb-0.5 mt-1">Độc lập - Tự do - Hạnh phúc</div>
        </div>
      </div>

      <div className="text-center font-bold mb-6 uppercase" style={{ fontSize: `${baseFontSize + 1}pt` }}>
        DANH SÁCH SINH VIÊN KIỂM TRA TÌNH TRẠNG HỌC PHÍ ĐỂ THỰC HIỆN HỒ SƠ
      </div>

      <div className="mb-2 flex items-center">
        Ngày kiểm tra:{' '}
        <input 
          className="font-bold bg-transparent border-none focus:outline-none w-32 ml-1" 
          value={dateStr} 
          onChange={e => setDateStr(e.target.value)} 
        />
        <div className="relative inline-block hide-on-print ml-1 hover:bg-slate-100 p-1 rounded transition-colors">
          <Calendar className="w-4 h-4 text-slate-500 cursor-pointer" />
          <input 
            type="date"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={e => {
              const d = new Date(e.target.value);
              if (!isNaN(d)) setDateStr(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`);
            }}
          />
        </div>
      </div>

      <table className="w-full border-collapse border border-black mb-8">
        <thead>
          <tr className="font-bold text-center">
            <th className="border border-black p-1 w-12">TT</th>
            <th className="border border-black p-1">Mã lớp</th>
            <th className="border border-black p-1">Họ và tên</th>
            <th className="border border-black p-1">Ngày sinh</th>
            {hasMultiSemesters && (
              <th className="border border-black p-1">Học kỳ</th>
            )}
            <th className="border border-black p-1">Học phí</th>
            <th className="border border-black p-1">Số hóa đơn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row._instanceId || row.id || index}-${row._semesterId || 'single'}`} className="group">
              <td className="border border-black p-1 text-center relative">
                {onRemoveStudent && (
                  <button 
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 hide-on-print transition-opacity p-1"
                    onClick={() => onRemoveStudent(row._instanceId || row.id)}
                    title="Xóa sinh viên này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {index + 1}
              </td>
              <td className="border border-black p-1 text-center">{row.classCode}</td>
              <td className="border border-black p-1 px-2">{row.fullName}</td>
              <td className="border border-black p-1 text-center">{row.dob}</td>
              {hasMultiSemesters && (
                <td className="border border-black p-1 text-center text-[12pt]">{row._semesterLabel}</td>
              )}
              <td className="border border-black p-1 text-center">
                <input 
                  className="w-full bg-transparent border-none focus:outline-none text-center" 
                  value={row.tuitionStatus || ''} 
                  onChange={e => onUpdateStudent && onUpdateStudent(row._instanceId || row.id, 'tuitionStatus', e.target.value)}
                />
              </td>
              <td className="border border-black p-1 text-center">
                <input 
                  className="w-full bg-transparent border-none focus:outline-none text-center" 
                  value={row.invoiceNumber || ''} 
                  onChange={e => onUpdateStudent && onUpdateStudent(row._instanceId || row.id, 'invoiceNumber', e.target.value)}
                />
              </td>
            </tr>
          ))}
          {/* If list is empty, show some empty rows for preview */}
          {rows.length === 0 && Array(5).fill(0).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black p-1 text-center">{i + 1}</td>
              <td className="border border-black p-1">&nbsp;</td>
              <td className="border border-black p-1">&nbsp;</td>
              <td className="border border-black p-1">&nbsp;</td>
              {hasMultiSemesters && <td className="border border-black p-1">&nbsp;</td>}
              <td className="border border-black p-1">&nbsp;</td>
              <td className="border border-black p-1">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between">
        <div className="text-center font-bold ml-12">
          PHÒNG KH-TC
        </div>
        <div className="text-center mr-8">
          <div className="italic flex items-center justify-center">
            Cần Thơ, ngày{' '}
            <input 
              className="bg-transparent border-none focus:outline-none w-48 text-center italic" 
              value={footerDate} 
              onChange={e => setFooterDate(e.target.value)} 
            />
            <div className="relative inline-block hide-on-print ml-1 hover:bg-slate-100 p-1 rounded transition-colors">
              <Calendar className="w-4 h-4 text-slate-500 cursor-pointer" />
              <input 
                type="date"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d)) setFooterDate(`${d.getDate().toString().padStart(2, '0')} tháng ${(d.getMonth() + 1).toString().padStart(2, '0')} năm ${d.getFullYear()}`);
                }}
              />
            </div>
          </div>
          <div className="font-bold mt-1">Bộ phận Công tác - HSSV</div>
        </div>
      </div>
    </div>
  );
}
