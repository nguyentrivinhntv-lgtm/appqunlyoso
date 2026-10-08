import { useState, useEffect } from 'react';
import { getDisplayNhomNganh } from '../utils/studentUtils';

function Field({ value, onChange, placeholder, bold, className = '' }) {
  const hasValue = value && value.trim() !== '';
  const size = Math.max((value || '').length, (placeholder || '').length, 5);
  return (
    <input
      className={`border-b bg-transparent focus:outline-none focus:border-blue-500 text-center ${hasValue ? 'border-transparent' : 'border-dashed border-gray-400 text-red-600'
        } ${bold ? 'font-bold' : ''} ${className}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '...........'}
      size={size}
    />
  );
}

export default function DuToanKinhPhiForm({ student, globalSettings = {} }) {
  const [data, setData] = useState({});
  const [dateStr, setDateStr] = useState('ngày 18 tháng 08 năm 2026');
  const [hocKy, setHocKy] = useState('Học kỳ 1');
  const [namHoc, setNamHoc] = useState('2026 - 2027');
  const [mucThu, setMucThu] = useState('2.268.000');
  const [soThang, setSoThang] = useState('05');

  useEffect(() => {
    if (globalSettings?.signDate) {
      const parts = globalSettings.signDate.split('-');
      if (parts.length === 3) {
        setDateStr(`ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`);
      }
    }
  }, [globalSettings?.signDate]);

  useEffect(() => {
    if (student && student.fullName) {
      setData({
        fullName: student.fullName || '',
        studentId: student.studentId || '',
        major: student.major || '',
        classCode: student.classCode || '',
        educationLevel: student.educationLevel || 'Cao đẳng',
        educationType: student.educationType || '',
        nhomNganh: getDisplayNhomNganh(student.department, student.major, student.nhomNganh),
      });
      if (globalSettings.semester || student.semester) {
        const s = globalSettings.semester || student.semester;
        setHocKy(String(s).includes('Học kỳ') ? s : `Học kỳ ${s}`);
      }
      if (globalSettings.schoolYear || student.schoolYear) setNamHoc(globalSettings.schoolYear || student.schoolYear);
      if (globalSettings.tuitionFee || student.tuitionFee) setMucThu(globalSettings.tuitionFee || student.tuitionFee);
      if (globalSettings.soThang || student.soThang) setSoThang(globalSettings.soThang || student.soThang);
    }
  }, [student, globalSettings]);

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const mucThuNum = parseInt((mucThu || '0').replace(/\./g, '')) || 0;
  const soThangNum = parseInt(soThang) || 0;
  const total = mucThuNum * soThangNum * 0.7;
  const formattedTotal = total.toLocaleString('vi-VN');

  const fontFamily = globalSettings?.fontFamily || '"Times New Roman", serif';
  const baseFontSize = globalSettings?.baseFontSize || 12;

  return (
    <div className="print:p-0 p-4" style={{ fontFamily, fontSize: `${baseFontSize}pt`, lineHeight: 1.5 }}>
      <div className="text-center font-bold mb-4">
        <div>PHỤ LỤC VI</div>
        <div style={{ fontSize: `${baseFontSize + 1}pt` }}>DỰ TOÁN KINH PHÍ CẤP BÙ TIỀN MIỄN, GIẢM HỌC PHÍ</div>
        <div className="font-normal italic">(Kèm theo Nghị định số 238/2025/NĐ-CP ngày 03 tháng 9 năm 2025 của Chính phủ)</div>
      </div>

      <div className="font-bold mb-3 text-center" style={{ fontSize: `${baseFontSize + 1}pt` }}>
        Tên cơ sở giáo dục nghề nghiệp: TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN<br />
        DỰ TOÁN KINH PHÍ CẤP BÙ TIỀN MIỄN, GIẢM HỌC PHÍ NĂM 2026
      </div>

      <div className="mb-3 text-justify">
        <span className="font-bold">Đối tượng:</span> Được giảm 70% học phí – Học sinh sinh viên học ngành nghề nặng nhọc, độc hại, nguy hiểm (Theo Điểm b, Khoản 1, Điều 16 Nghị định 238/2025/NĐ-CP của Chính Phủ)
      </div>

      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center flex-nowrap text-[12pt]">
          <span className="whitespace-nowrap">(đối với sinh viên:&nbsp;</span>
          <Field value={data.fullName} onChange={v => update('fullName', v)} bold placeholder="Họ và tên..." className="font-bold text-red-600" />
          <span className="whitespace-nowrap">&nbsp;,Mã lớp:&nbsp;</span>
          <Field value={data.classCode} onChange={v => update('classCode', v)} placeholder="Mã lớp..." className="text-red-600" />
          <span className="whitespace-nowrap">&nbsp;,Mã số sinh viên:&nbsp;</span>
          <Field value={data.studentId} onChange={v => update('studentId', v)} placeholder="MSSV..." className="text-red-600" />
          <span>)</span>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-center mb-4">
        <thead>
          <tr className="font-bold text-[12pt]">
            <th className="border border-black p-1 w-10">STT</th>
            <th className="border border-black p-1">Nội dung</th>
            <th className="border border-black p-1 w-20 leading-tight">Số đối tượng được miễn, giảm học phí</th>
            <th className="border border-black p-1 w-28 leading-tight">Mức thu học phí/ tháng</th>
            <th className="border border-black p-1 w-16 leading-tight">Số tháng miễn giảm</th>
            <th className="border border-black p-1 leading-tight">Tổng kinh phí cấp bù tiền miễn, giảm học phí</th>
            <th className="border border-black p-1 w-32 min-w-[100px]">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2 text-left" colSpan={7}>
              1. <Field value={data.educationLevel} onChange={v => update('educationLevel', v)} placeholder="Cao đẳng" className="w-24" />
            </td>
          </tr>
          <tr><td className="border border-black p-2 text-left" colSpan={7}>Nhóm ngành, nghề đào tạo: {data.nhomNganh || 'Sức khỏe'}</td></tr>
          <tr>
            <td className="border border-black p-2">1.1</td>
            <td className="border border-black p-2 text-left">
              <div className="flex items-baseline flex-nowrap">
                <span className="whitespace-nowrap">Ngành:&nbsp;</span>
                <Field value={data.major} onChange={v => update('major', v)} placeholder="Nhập ngành..." />
              </div>
            </td>
            <td className="border border-black p-2">01</td>
            <td className="border border-black p-2">
              <input className="w-full text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none" value={mucThu} onChange={e => setMucThu(e.target.value)} />
            </td>
            <td className="border border-black p-2">
              <input className="w-full text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none" value={soThang} onChange={e => setSoThang(e.target.value)} />
            </td>
            <td className="border border-black p-2">{mucThu} * {soThang} * 70%<br />= {formattedTotal}</td>
            <td className="border border-black p-2 text-center text-[12pt] leading-snug">
              <input className="w-full text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none text-[12pt]" value={hocKy} onChange={e => setHocKy(e.target.value)} />
              <span>, năm học</span><br />
              <input className="w-full text-center bg-transparent border-b border-dashed border-gray-400 focus:outline-none text-[12pt]" value={namHoc} onChange={e => setNamHoc(e.target.value)} />
            </td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-2 text-center" colSpan={5}>TỔNG DỰ TOÁN</td>
            <td className="border border-black p-2">{formattedTotal}</td>
            <td className="border border-black p-2"></td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end text-center whitespace-nowrap">
        <div className="px-8">
          <div className="italic flex items-center justify-center">
            Tp. Hồ Chí Minh,{' '}
            <input className="w-48 text-center ml-1 border-b border-dashed border-gray-400 bg-transparent focus:outline-none" value={dateStr} onChange={e => setDateStr(e.target.value)} />
          </div>
          <div className="font-bold mt-1">TL. HIỆU TRƯỞNG<br />KT. GIÁM ĐỐC CƠ SỞ<br />PHÓ GIÁM ĐỐC</div>
          <div className="mt-28 font-bold">ThS. Nguyễn Chí Trọng</div>
        </div>
      </div>
    </div>
  );
}
