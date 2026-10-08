import { useState, useEffect } from 'react';
import { getDisplayNhomNganh } from '../utils/studentUtils';

function Field({ value, onChange, placeholder, bold, className = '' }) {
  const hasValue = value && value.trim() !== '';
  return (
    <input
      className={`border-b bg-transparent focus:outline-none focus:border-blue-500 ${
        hasValue ? 'border-transparent' : 'border-dashed border-gray-400 text-red-600'
      } ${bold ? 'font-bold' : ''} ${className}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '...........'}
      style={{ minWidth: hasValue ? undefined : '60px' }}
    />
  );
}

export default function DanhSachSinhVienForm({ student, studentsList = [], globalSettings = {} }) {
  const [data, setData] = useState({});
  const [dateStr, setDateStr] = useState('ngày ... tháng ... năm 2026');
  const [hocKy, setHocKy] = useState('Học kỳ 2');
  const [namHoc, setNamHoc] = useState('2025 - 2026');
  const [mucThu, setMucThu] = useState('2.290.000');
  const [soThang, setSoThang] = useState('5');
  const [quyetDinhSo, setQuyetDinhSo] = useState('');

  useEffect(() => {
    if (student && student.fullName) {
      setData({
        fullName: student.fullName || '',
        dob: student.dob || '',
        major: student.major || '',
        classCode: student.classCode || '',
        educationType: student.educationType || '',
      });
      if (student.semester || globalSettings.semester) {
        const s = student.semester || globalSettings.semester;
        setHocKy(s.includes('Học kỳ') ? s : `Học kỳ ${s}`);
      }
      if (student.schoolYear || globalSettings.schoolYear) setNamHoc(student.schoolYear || globalSettings.schoolYear);
      if (student.tuitionFee || globalSettings.tuitionFee) setMucThu(student.tuitionFee || globalSettings.tuitionFee);
      if (student.soThang || globalSettings.soThang) setSoThang(student.soThang || globalSettings.soThang);
    }
  }, [student, globalSettings]);

  const update = (field, value) => setData(prev => ({...prev, [field]: value}));

  const mucThuNum = parseInt((mucThu || '0').replace(/\./g, '')) || 0;
  const soThangNum = parseInt(soThang) || 0;
  const total = mucThuNum * soThangNum * 0.7;
  const formattedTotal = total.toLocaleString('vi-VN');

  const fontFamily = globalSettings?.fontFamily || '"Times New Roman", serif';
  const baseFontSize = globalSettings?.baseFontSize || 12;

  return (
    <div className="print:p-0 p-4" style={{ fontFamily, fontSize: `${baseFontSize}pt` }}>
      <div className="grid grid-cols-2 text-center mb-8 font-bold whitespace-nowrap" style={{ fontSize: `${baseFontSize + 1}pt` }}>
        <div>
          <div className="font-normal">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
          <div>TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN</div>
        </div>
        <div>
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div>Độc lập - Tự do - Hạnh phúc</div>
          <div className="border-t border-black w-3/4 mx-auto mt-1"></div>
        </div>
      </div>

      <div className="text-center font-bold mb-4 leading-relaxed" style={{ fontSize: `${baseFontSize + 1}pt` }}>
        DANH SÁCH SINH VIÊN ĐANG HỌC TẠI TRƯỜNG THUỘC ĐỐI TƯỢNG ĐƯỢC GIẢM 70% HỌC PHÍ – HỌC SINH<br/>
        SINH VIÊN HỌC NGÀNH NGHỀ NẶNG NHỌC, ĐỘC HẠI, NGUY HIỂM (THEO ĐIỂM B, KHOẢN 1, ĐIỀU 16 NGHỊ ĐỊNH<br/>
        SỐ 238/2025/NĐ-CP CỦA CHÍNH PHỦ)
      </div>

      <div className="text-center italic mb-6 flex items-baseline justify-center flex-wrap gap-1">
        (Ban hành kèm theo Quyết định số{' '}
        <input className="w-12 text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none" value={quyetDinhSo} onChange={e => setQuyetDinhSo(e.target.value)} />
        /QĐNB-ĐVSG-CT{' '}
        <input className="w-48 text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none" value={dateStr} onChange={e => setDateStr(e.target.value)} />
        <br/>của Hiệu trưởng Trường Cao đẳng Đại Việt Sài Gòn)
      </div>

      <table className="w-full border-collapse border border-black text-center mb-4">
        <thead>
          <tr className="font-bold bg-gray-50">
            <th className="border border-black p-2 w-10">STT</th>
            <th className="border border-black p-2">Họ và tên</th>
            <th className="border border-black p-2">Mã số sinh<br/>viên/Lớp</th>
            <th className="border border-black p-2">Ngày sinh</th>
            <th className="border border-black p-2">Ngành</th>
            <th className="border border-black p-2">Hệ đào<br/>tạo</th>
            <th className="border border-black p-2">Nhóm ngành</th>
            <th className="border border-black p-2">Mức thu HP/tháng<br/>của đơn vị (đồng)</th>
            <th className="border border-black p-2">Số<br/>tháng</th>
            <th className="border border-black p-2">Tổng mức<br/>thu x 70%<br/>(đồng)</th>
            <th className="border border-black p-2 w-40">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {(studentsList.length > 0 ? studentsList : (student ? [student] : [])).map((s, index) => (
            <tr key={s.id || index}>
              <td className="border border-black p-2">{index + 1}</td>
              <td className="border border-black p-2 font-bold text-center">{s.fullName}</td>
              <td className="border border-black p-2 font-bold text-center">
                {s.studentId ? `${s.studentId} / ` : ''}{s.classCode}
              </td>
              <td className="border border-black p-2 font-bold text-center">{s.dob}</td>
              <td className="border border-black p-2 font-bold text-center">{s.major}</td>
              <td className="border border-black p-2 font-bold text-center">{s.educationType}</td>
              <td className="border border-black p-2 font-bold">{getDisplayNhomNganh(s.department, s.major, s.nhomNganh)}</td>
              <td className="border border-black p-2">
                <input className="w-full text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none font-bold" value={mucThu} onChange={e => setMucThu(e.target.value)} />
              </td>
              <td className="border border-black p-2">
                <input className="w-full text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none font-bold" value={soThang} onChange={e => setSoThang(e.target.value)} />
              </td>
              <td className="border border-black p-2 font-bold">{formattedTotal}</td>
              <td className="border border-black p-2">
                <input className="w-full text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none" value={hocKy} onChange={e => setHocKy(e.target.value)} />, năm học<br/>
                <input className="w-full text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none" value={namHoc} onChange={e => setNamHoc(e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center italic">
        (Tổng cộng danh sách có <span className="font-bold">01</span> sinh viên)
      </div>
    </div>
  );
}
