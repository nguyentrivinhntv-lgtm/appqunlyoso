import { useState, useEffect } from 'react';
import { getDisplayDepartment } from '../utils/studentUtils';

function Field({ value, onChange, placeholder, bold, className = '', highlight = false }) {
  const hasValue = value && String(value).trim() !== '';
  const size = Math.max((value || '').length, (placeholder || '').length, 5);
  return (
    <input
      className={`bg-transparent focus:outline-none focus:border-blue-500 ${hasValue
          ? 'border-b border-transparent'
          : `border-b border-dashed border-red-400 text-red-600 ${highlight ? 'bg-red-50' : ''}`
        } ${bold ? 'font-bold' : ''} ${className}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '...........................'}
      size={size}
    />
  );
}

export default function GiayXacNhanMienGiamForm({ student, onMissingFieldsChange, globalSettings = {} }) {
  const [data, setData] = useState({
    committee: '',
    fullName: '',
    idCard: '',
    currentYear: '1',
    semester: '1',
    schoolYear: '2026 - 2027',
    department: '',
    courseYear: '',
    educationType: '',
    courseDuration: '',
    discipline: 'Không',
    manager: 'ThS. Nguyễn Chí Trọng',
    tuitionFee: '',
    dateStr: 'Tp. Hồ Chí Minh, ngày 18 tháng 08 năm 2026'
  });

  // Sync student data into local editable state
  useEffect(() => {
    if (student && student.fullName) {
      let formattedDate = data.dateStr;
      if (globalSettings.signDate) {
        const parts = globalSettings.signDate.split('-');
        if (parts.length === 3) {
          formattedDate = `Tp. Hồ Chí Minh, ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
        }
      }

      let cYear = student.courseYear || '';
      if (cYear && cYear.trim().length === 4 && !isNaN(cYear)) {
        const startYear = parseInt(cYear);
        const cls = (student.classCode || '').toUpperCase().replace(/[\s-]/g, '');
        const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
        const isShort = isSpecial24 || (student.educationType === 'Liên thông' || student.educationType === 'Văn bằng 2');
        cYear = `${startYear} - ${startYear + (isShort ? 2 : 3)}`;
      }

      setData(prev => ({
        ...prev,
        fullName: student.fullName || '',
        committee: student.committee || globalSettings.committee || '',
        currentYear: globalSettings.currentYear || student.currentYear || '1',
        semester: globalSettings.semester || student.semester || '1',
        schoolYear: globalSettings.schoolYear || student.schoolYear || '2026 - 2027',
        tuitionFee: globalSettings.tuitionFee || student.tuitionFee || '',
        discipline: student.discipline || globalSettings.discipline || 'Không',
        idCard: student.idCard || '',
        department: getDisplayDepartment(student.department),
        courseYear: cYear,
        educationType: student.educationType || 'Chính quy',
        courseDuration: student.courseDuration || (() => {
          const cls = (student.classCode || '').toUpperCase().replace(/[\s-]/g, '');
          const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
          if (isSpecial24 || student.educationType === 'Liên thông' || student.educationType === 'Văn bằng 2') return '24';
          return '36';
        })(),
        dateStr: formattedDate
      }));
    }
  }, [student, globalSettings]);

  // Check for missing required fields
  useEffect(() => {
    const missing = [];
    if (!data.committee) missing.push('UBND xã/phường');
    if (!data.idCard) missing.push('Số CCCD / MSSV');
    if (!data.department) missing.push('Khoa');
    if (!data.courseYear) missing.push('Khóa học');
    if (!data.tuitionFee) missing.push('Mức thu học phí');

    if (onMissingFieldsChange) {
      onMissingFieldsChange(missing);
    }
  }, [data.committee, data.idCard, data.department, data.courseYear, data.tuitionFee, onMissingFieldsChange]);

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const fontFamily = globalSettings?.fontFamily || '"Times New Roman", serif';
  const baseFontSize = globalSettings?.baseFontSize || 12;

  return (
    <div className="leading-normal" style={{ fontFamily, fontSize: `${baseFontSize}pt`, lineHeight: 1.5 }}>
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center mb-6 font-bold">
        <div>PHỤ LỤC V</div>
        <div>GIẤY XÁC NHẬN</div>
        <div className="italic font-normal mb-4">
          (Kèm theo Nghị định số 238/2025/NĐ-CP ngày 03 tháng 9 năm 2025 của Chính phủ)
        </div>

        <div className="mt-2 text-center w-full" style={{ fontSize: `${baseFontSize + 1}pt` }}>
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div>Độc lập – Tự do – Hạnh phúc</div>
          <div className="border-t border-black w-48 mx-auto mt-1 mb-4"></div>
        </div>

        <div style={{ fontSize: `${baseFontSize + 1}pt` }}>GIẤY XÁC NHẬN</div>
        <div className="font-normal w-[80%] mx-auto">
          (Dùng cho các cơ sở giáo dục nghề nghiệp và giáo dục đại học tư thục, thuộc <br/> doanh nghiệp nhà nước, tổ chức kinh tế)
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        <span className="mr-2">Kính gửi:</span> Ủy ban nhân dân cấp xã, phường
        <Field
          value={data.committee}
          onChange={v => update('committee', v)}
          placeholder=".............................."
          className="ml-1"
          highlight={!data.committee}
        />
      </div>

      {/* Content */}
      <div className="space-y-[0.5em] mb-4 pl-[1.27cm]">
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Trường: Cao đẳng Đại Việt Sài Gòn</span>
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Xác nhận anh/chị:</span>
          <Field value={data.fullName} onChange={v => update('fullName', v)} bold className="text-red-600 font-bold ml-2" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Số căn cước/CCCD:</span>
          <Field value={data.idCard} onChange={v => update('idCard', v)} placeholder="Nhập CCCD..." className="ml-2" highlight={!data.idCard} />
        </div>
        <div className="flex items-baseline whitespace-nowrap">
          <span className="shrink-0">Hiện là học sinh, sinh viên năm thứ:</span>
          <Field value={data.currentYear} onChange={v => update('currentYear', v)} bold className="text-red-600 font-bold text-center mx-1" />
          <span className="shrink-0">Học kỳ:</span>
          <Field value={data.semester} onChange={v => update('semester', v)} bold className="text-red-600 font-bold text-center mx-1" />
          <span className="shrink-0">Năm học:</span>
          <Field value={data.schoolYear} onChange={v => update('schoolYear', v)} bold className="text-red-600 font-bold ml-1" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Khoa:</span>
          <Field value={data.department} onChange={v => update('department', v)} className="text-red-600 mx-2" placeholder="Nhập Khoa..." highlight={!data.department} />;
          <span className="ml-2 whitespace-nowrap shrink-0">Khóa học:</span>
          <Field value={data.courseYear} onChange={v => update('courseYear', v)} className="text-red-600 mx-2" placeholder="2025 - 2027" highlight={!data.courseYear} />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Hình thức đào tạo:</span>
          <Field value={data.educationType} onChange={v => update('educationType', v)} className="ml-2" />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Thời gian đào tạo toàn khóa học:</span>
          <Field value={data.courseDuration} onChange={v => update('courseDuration', v)} className="mx-2 text-center flex-1 min-w-0" /> <span className="whitespace-nowrap shrink-0">tháng</span>
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Kỷ luật:</span>
          <Field value={data.discipline} onChange={v => update('discipline', v)} className="ml-2 flex-1 min-w-0" />
        </div>
        <div className="flex items-baseline mb-2 hide-on-print bg-indigo-50 p-2 rounded border border-indigo-100">
          <span className="whitespace-nowrap shrink-0 text-indigo-700 font-medium">Học phí 1 kỳ (Tự động chia tháng):</span>
          <Field 
            value={data.semesterTuitionFee || ''} 
            onChange={v => {
              let val = v.replace(/\D/g, '');
              val = val ? parseInt(val).toLocaleString('vi-VN') : '';
              update('semesterTuitionFee', val);
              const semNum = parseInt(val.replace(/\./g, '')) || 0;
              const th = parseInt(data.soThang || globalSettings.soThang || '5');
              const monthVal = semNum > 0 ? Math.round(semNum / th).toLocaleString('vi-VN') : '';
              update('tuitionFee', monthVal);
            }} 
            className="text-indigo-700 font-bold mx-2 text-center flex-1 min-w-0" 
            placeholder="Nhập học phí 1 kỳ..." 
          />
        </div>
        <div className="flex items-baseline">
          <span className="whitespace-nowrap shrink-0">Mức thu học phí:</span>
          <Field 
            value={data.tuitionFee} 
            onChange={v => {
              let val = v.replace(/\D/g, '');
              val = val ? parseInt(val).toLocaleString('vi-VN') : '';
              update('tuitionFee', val);
            }} 
            className="text-red-600 font-bold mx-2 text-center flex-1 min-w-0" 
            highlight={!data.tuitionFee} 
          /> 
          <span className="whitespace-nowrap shrink-0">đồng/tháng</span>
        </div>
      </div>

      <div className="mb-8 text-justify indent-[1.27cm]">
        Đề nghị quý cơ quan xem xét giải quyết tiền hỗ trợ miễn, giảm học phí theo quy định hiện hành.
      </div>

      {/* Footer */}
      <div className="flex justify-end text-center whitespace-nowrap">
        <div className="px-8">
          <div className="italic flex items-center justify-center mb-1">
            <Field
              value={data.dateStr}
              onChange={v => update('dateStr', v)}
              className="w-72 text-center italic text-[12pt]"
            />
          </div>
          <div className="font-bold">
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
