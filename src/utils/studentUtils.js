export const getDisplayDepartment = (department) => {
  if (!department) return '';
  const d = department.toLowerCase();
  if (d.includes('y dược') || d.includes('y duoc')) {
    return 'Chăm sóc sức khỏe';
  }
  return department;
};

export const getDisplayNhomNganh = (department, major, currentNhomNganh) => {
  const d = (department || '').toLowerCase();
  const m = (major || '').toLowerCase();
  
  if (d.includes('y dược') || d.includes('y duoc') || d.includes('chăm sóc sức khỏe') || d.includes('sức khỏe') || 
      m.includes('y') || m.includes('dược') || m.includes('duoc') || m.includes('điều dưỡng') || m.includes('dieu duong') || m.includes('hộ sinh') || m.includes('xét nghiệm') || m.includes('hình ảnh y học') || m.includes('phục hồi chức năng')) {
    return 'Sức khỏe';
  }
  
  if (d.includes('kỹ thuật') || d.includes('công nghệ') || d.includes('ky thuat') || d.includes('cong nghe') || 
      m.includes('kỹ thuật') || m.includes('công nghệ') || m.includes('ky thuat') || m.includes('cong nghe') || m.includes('cntt') || m.includes('ô tô') || m.includes('oto') || m.includes('cơ khí') || m.includes('điện')) {
    return 'Kỹ thuật và công nghệ thông tin';
  }
  
  return currentNhomNganh || 'Sức khỏe';
};

export const getAutoCeiling = (year, nganh) => {
  if (!year) return 0;
  const is2026 = year.includes('2026') && year.includes('2027');
  if (nganh === 'Sức khỏe') return is2026 ? 2800000 : 2380000;
  return is2026 ? 2400000 : 2040000;
};

export const calculateFromAbsoluteSemester = (student, semNum) => {
  const calcNamThu = Math.ceil(semNum / 2).toString();
  const calcHocKy = semNum % 2 === 0 ? 2 : 1;
  
  let calcNamHoc = '';
  const courseYearStr = student.courseYear || '';
  const match = courseYearStr.match(/^(\d{4})/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const syStart = startYear + parseInt(calcNamThu, 10) - 1;
    calcNamHoc = `${syStart} - ${syStart + 1}`;
  }

  return {
    currentYear: calcNamThu,
    semester: calcHocKy.toString(),
    schoolYear: calcNamHoc
  };
};
