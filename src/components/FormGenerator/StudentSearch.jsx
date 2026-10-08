import { useState } from 'react';
import { Search, Printer } from 'lucide-react';

export default function StudentSearch({
  handlePrint,
  searchTerm,
  setSearchTerm,
  advancedFilterType,
  setAdvancedFilterType,
  advancedFilterValue,
  setAdvancedFilterValue,
  printFilter,
  setPrintFilter,
  filteredStudentsForSidebar,
  selectedStudent,
  setSelectedStudent,
  processedProfiles,
  selectedForm,
  globalSettings,
  customKiemTraList = []
}) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
      <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-primary-500" />
        3. Tìm Sinh Viên & In
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 ml-4 px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          Xem Trước & In
        </button>
      </h2>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder="Nhập tên, CCCD, lớp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <select 
          className="border border-slate-200 rounded-lg text-sm px-2 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-slate-50"
          value={printFilter}
          onChange={e => setPrintFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="unprinted">Chưa làm</option>
          <option value="printed">Đã làm ✅</option>
        </select>
      </div>

      <div className="mb-4">
        <button 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          {showAdvancedFilters ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc (Hệ ĐT, Khóa, Ngày sinh)'}
        </button>
        {showAdvancedFilters && (
          <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <select 
              className="w-full border border-slate-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
              value={advancedFilterType}
              onChange={e => {
                setAdvancedFilterType(e.target.value);
                setAdvancedFilterValue('');
              }}
            >
              <option value="none">-- Chọn tiêu chí lọc --</option>
              <option value="eduType">Hệ đào tạo</option>
              <option value="courseYear">Khóa</option>
              <option value="dob">Ngày sinh</option>
            </select>
            
            {advancedFilterType !== 'none' && (
              <div>
                <input 
                  type="text" 
                  className="w-full px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-primary-500 focus:outline-none" 
                  placeholder={
                    advancedFilterType === 'eduType' ? 'Nhập Hệ ĐT (VD: Chính quy)' :
                    advancedFilterType === 'courseYear' ? 'Nhập Khóa (VD: 2023)' :
                    'Nhập Ngày sinh (VD: 15/05)'
                  } 
                  value={advancedFilterValue} 
                  onChange={e => setAdvancedFilterValue(e.target.value)} 
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {selectedForm === 'kiem_tra_hoc_phi' && (
        <div className="text-[11px] text-emerald-600 font-medium italic mb-2 bg-emerald-50 p-2 rounded border border-emerald-100">
          * Mẹo: Click vào sinh viên để thêm vào danh sách in (có thể click nhiều lần). Xóa ở màn hình xem trước.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
        {filteredStudentsForSidebar.length > 0 ? (
          filteredStudentsForSidebar.map(student => {
            const isPrinted = processedProfiles.some(p => 
              p.studentId === student.id && 
              (selectedForm === 'all_forms' ? true : p.formId === selectedForm) &&
              p.semester === globalSettings.semester &&
              p.schoolYear === globalSettings.schoolYear
            );
            const kiemTraCount = selectedForm === 'kiem_tra_hoc_phi' ? customKiemTraList.filter(s => s.id === student.id).length : 0;
            
            return (
            <button
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                kiemTraCount > 0 
                  ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                  : selectedStudent?.id === student.id
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-slate-200 hover:border-primary-200'
              }`}
            >
              <div className="font-medium text-slate-900 text-sm flex justify-between items-center">
                <span>{student.fullName}</span>
                {kiemTraCount > 0 ? (
                  <span className="text-emerald-600 text-xs flex items-center gap-1 font-bold border border-emerald-300 bg-white px-1.5 py-0.5 rounded shadow-sm">✓ Đã chọn ({kiemTraCount})</span>
                ) : isPrinted ? (
                  <span className="text-emerald-500 text-xs flex items-center gap-1 font-semibold border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded">✅ Đã làm</span>
                ) : null}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span>{student.classCode}</span>
                <span>{student.studentId ? `MSSV: ${student.studentId}` : student.idCard}</span>
              </div>
            </button>
            );
          })
        ) : searchTerm ? (
          <div className="text-center text-slate-500 text-sm py-4">Không tìm thấy sinh viên</div>
        ) : (
          <div className="text-center text-slate-400 text-sm py-4 italic">Gõ để tìm kiếm...</div>
        )}
      </div>
    </div>
  );
}
