import { useState, useEffect } from 'react';
import { getDisplayDepartment } from '../utils/studentUtils';

function Field({ value, onChange, placeholder, bold, className = '' }) {
  const hasValue = value && value.trim() !== '';
  const size = Math.max((value || '').length, (placeholder || '').length, 5);
  return (
    <input
      className={`border-b bg-transparent focus:outline-none focus:border-blue-500 ${hasValue
          ? 'border-transparent'
          : 'border-dashed border-gray-400 text-red-600'
        } ${bold ? 'font-bold' : ''} ${className}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '...........................'}
      size={size}
    />
  );
}

export default function GiayXacNhanForm({ student, globalSettings }) {
  const [data, setData] = useState({});
  const [reason, setReason] = useState('Bổ túc hồ sơ Nghị định 238./.');
  const [dateStr, setDateStr] = useState('ngày 18 tháng 08 năm 2026');

  useEffect(() => {
    if (globalSettings?.signDate) {
      const parts = globalSettings.signDate.split('-');
      if (parts.length === 3) {
        setDateStr(`ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`);
      }
    }
  }, [globalSettings?.signDate]);

  // Sync student data into local editable state
  useEffect(() => {
    if (student && student.fullName) {
        let cYear = student.courseYear || '';
        if (cYear && cYear.trim().length === 4 && !isNaN(cYear)) {
          const startYear = parseInt(cYear);
          const cls = (student.classCode || '').toUpperCase().replace(/[\s-]/g, '');
          const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
          const isShort = isSpecial24 || (student.educationType === 'Liên thông' || student.educationType === 'Văn bằng 2');
          cYear = `${startYear} - ${startYear + (isShort ? 2 : 3)}`;
        }

        setData({
          fullName: student.fullName || '',
          dob: student.dob || '',
          gender: student.gender || '',
          idCard: student.idCard || '',
          idCardIssueDate: student.idCardIssueDate || '',
          idCardIssuePlace: student.idCardIssuePlace || '',
          schoolName: student.schoolName || 'Trường Cao đẳng Đại Việt Sài Gòn',
          schoolCode: student.schoolCode || 'CSG',
          department: getDisplayDepartment(student.department),
          major: student.major || '',
          classCode: student.classCode || '',
          courseYear: cYear,
        educationLevel: student.educationLevel || 'Cao đẳng',
        educationType: student.educationType || '',
      });
    }
  }, [student]);

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const fontFamily = globalSettings?.fontFamily || '"Times New Roman", serif';
  const baseFontSize = globalSettings?.baseFontSize || 12;

  return (
    <div style={{ fontFamily, fontSize: `${baseFontSize}pt`, lineHeight: 1.5 }}>
      {/* Header */}
      <div className="grid grid-cols-2 text-center mb-8 font-bold whitespace-nowrap" style={{ fontSize: `${baseFontSize + 1}pt` }}>
        <div>
          <div className="font-normal">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
          <div>TRƯỜNG CAO ĐẲNG ĐẠI VIỆT SÀI GÒN</div>
          <div className="border-t border-black w-2/3 mx-auto mt-1"></div>
        </div>
        <div>
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div>Độc lập - Tự do - Hạnh phúc</div>
          <div className="border-t border-black w-3/4 mx-auto mt-1"></div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-bold mb-1" style={{ fontSize: `${baseFontSize + 1}pt` }}>GIẤY XÁC NHẬN</h1>
        <div className="font-bold w-[90%] mx-auto">
          Học sinh, sinh viên đang theo học ngành nghề nặng nhọc, độc hại, nguy hiểm trình độ Cao đẳng
        </div>
      </div>

      <div className="font-bold mb-4 text-center">Trường Cao đẳng Đại Việt Sài Gòn xác nhận:</div>

      {/* Student Info - all fields are editable */}
      <div className="grid grid-cols-2 gap-y-[0.5em] mb-6 pl-[1cm]">
        <div className="col-span-2 flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Họ và tên sinh viên:</span>{' '}
          <Field
            value={data.fullName}
            onChange={v => update('fullName', v)}
            placeholder="Nhập họ tên..."
            className="ml-1 text-red-600"
          /></div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Ngày sinh:</span>{' '}
          <Field value={data.dob} onChange={v => update('dob', v)} placeholder="DD/MM/YYYY" className="ml-1" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Giới tính:</span>{' '}
          <Field value={data.gender} onChange={v => update('gender', v)} placeholder="Nam/Nữ" className="ml-1" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Số CMND/CCCD:</span>{' '}
          <Field value={data.idCard} onChange={v => update('idCard', v)} placeholder="Nhập CCCD..." className="ml-1" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Ngày cấp:</span>{' '}
          <Field value={data.idCardIssueDate} onChange={v => update('idCardIssueDate', v)} placeholder="DD/MM/YYYY" className="ml-1" />
        </div>
        <div className="col-span-2 flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Nơi cấp:</span>{' '}
          <Field value={data.idCardIssuePlace} onChange={v => update('idCardIssuePlace', v)} placeholder="Nhập nơi cấp..." className="ml-1" />
        </div>
        <div className="col-span-2 flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Tên trường:</span>{' '}
          <Field value={data.schoolName} onChange={v => update('schoolName', v)} bold className="ml-1 font-bold" />
          <span className="whitespace-nowrap shrink-0 ml-4">Mã trường theo học:</span>{' '}
          <Field value={data.schoolCode} onChange={v => update('schoolCode', v)} bold className="ml-1" />
        </div>
        <div className="col-span-2 flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Khoa:</span>
          <Field value={data.department} onChange={v => update('department', v)} className="text-red-600 mx-2" placeholder="Nhập Khoa..." />
          <span className="ml-4 whitespace-nowrap shrink-0">Ngành:</span>{' '}
          <Field value={data.major} onChange={v => update('major', v)} placeholder="Nhập ngành..." className="ml-1" />
        </div>
        <div className="col-span-2 flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Lớp:</span>
          <Field value={data.classCode} onChange={v => update('classCode', v)} className="text-red-600 mx-2" placeholder="Nhập lớp..." />
          <span className="ml-4 whitespace-nowrap shrink-0">Khóa học:</span>
          <Field value={data.courseYear} onChange={v => update('courseYear', v)} className="text-red-600 mx-2" placeholder="2025 - 2027" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Hệ đào tạo:</span>
          <Field value={data.educationLevel} onChange={v => update('educationLevel', v)} className="ml-2" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Loại hình đào tạo:</span>{' '}
          <Field value={data.educationType} onChange={v => update('educationType', v)} className="ml-2" />
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 text-justify leading-relaxed pl-[1cm]">
        Hiện đang là sinh viên của trường Cao đẳng Đại Việt Sài Gòn, đang theo học ngành{' '}
        <span className="font-bold">{data.major || '...........................'}</span> thuộc ngành nghề nặng nhọc, độc hại, nguy hiểm được quy định tại Điểm b, Khoản 1, Điều 16, Nghị định 238/2025/NĐ-CP và Thông tư 05/2023/TT-BLĐTBXH.
      </div>

      <div className="mb-8 flex items-baseline pl-[1cm]">
        Lý do xác nhận:{' '}
        <input
          className="flex-1 ml-2 border-b border-dashed border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end text-center whitespace-nowrap">
        <div className="px-8">
          <div className="text-center">
            <div className="italic mb-1">
              Tp. Hồ Chí Minh,{' '}
              <Field value={dateStr} onChange={setDateStr} className="w-48 text-center" />
            </div>
          </div>
          <div className="font-bold mt-1">
            TL. HIỆU TRƯỞNG<br />
            KT. GIÁM ĐỐC CƠ SỞ<br />
            PHÓ GIÁM ĐỐC
          </div>
          <div className="mt-28 font-bold">ThS. Nguyễn Chí Trọng</div>
        </div>
      </div>
    </div>
  );
}
