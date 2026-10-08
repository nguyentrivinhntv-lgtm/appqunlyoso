import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, Search, HandCoins, FileText, Check, X, Filter, ChevronDown, ListTree, TrendingUp, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getApiBaseUrl } from '../services/connectionConfig';
import { api } from '../services/api';
import LuanChuyenTable from '../components/DocumentDistribution/LuanChuyenTable';

const getApiUrl = () => getApiBaseUrl();
const SEMESTERS = [1, 2, 3, 4, 5, 6];

function normalizeStr(str) {
  return (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

export default function DocumentDistribution() {
  const [activeTab, setActiveTab] = useState('hoSo'); // 'hoSo' | 'vayVon' | 'xacNhanSV' | 'xacNhanHoanThanh'
  const [students, setStudents] = useState([]);
  const [distributions, setDistributions] = useState([]); // documentDistribution
  const [loanDists, setLoanDists] = useState([]); // loanDistribution
  const [xacNhanSVDists, setXacNhanSVDists] = useState([]); // xacNhanSVDistribution
  const [xacNhanHoanThanhDists, setXacNhanHoanThanhDists] = useState([]); // xacNhanHoanThanhDistribution
  const [documentRoutingDists, setDocumentRoutingDists] = useState([]); // documentRouting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSemester, setFilterSemester] = useState('all'); // 'all' | '1'...'6' | 'none'
  const [filterLuanChuyen, setFilterLuanChuyen] = useState('all'); // 'all' | 'da_di' | 'chua_di'
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [studentsRes, distRes, loanRes, svRes, htRes, routeRes] = await Promise.all([
          axios.get(`${getApiUrl()}/students`),
          axios.get(`${getApiUrl()}/documentDistribution`),
          axios.get(`${getApiUrl()}/loanDistribution`),
          axios.get(`${getApiUrl()}/xacNhanSVDistribution`).catch(() => ({ data: [] })),
          axios.get(`${getApiUrl()}/xacNhanHoanThanhDistribution`).catch(() => ({ data: [] })),
          axios.get(`${getApiUrl()}/documentRouting`).catch(() => ({ data: [] })),
        ]);
        setStudents(studentsRes.data);
        setDistributions(distRes.data);
        setLoanDists(loanRes.data);
        setXacNhanSVDists(svRes.data);
        setXacNhanHoanThanhDists(htRes.data);
        setDocumentRoutingDists(routeRes.data);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
        toast.error('Không thể kết nối server. Hãy chắc chắn json-server đang chạy.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Current distribution list based on active tab
  const currentDists = activeTab === 'hoSo' ? distributions 
                     : activeTab === 'vayVon' ? loanDists 
                     : activeTab === 'xacNhanSV' ? xacNhanSVDists 
                     : activeTab === 'luanChuyen' ? documentRoutingDists
                     : xacNhanHoanThanhDists;

  const setCurrentDists = activeTab === 'hoSo' ? setDistributions 
                        : activeTab === 'vayVon' ? setLoanDists 
                        : activeTab === 'xacNhanSV' ? setXacNhanSVDists 
                        : activeTab === 'luanChuyen' ? setDocumentRoutingDists
                        : setXacNhanHoanThanhDists;

  const apiEndpoint = activeTab === 'hoSo' ? 'documentDistribution' 
                    : activeTab === 'vayVon' ? 'loanDistribution' 
                    : activeTab === 'xacNhanSV' ? 'xacNhanSVDistribution' 
                    : activeTab === 'luanChuyen' ? 'documentRouting'
                    : 'xacNhanHoanThanhDistribution';

  const tabLabel = activeTab === 'hoSo' ? 'Hồ sơ NĐ238' 
                 : activeTab === 'vayVon' ? 'Giấy vay vốn'
                 : activeTab === 'xacNhanSV' ? 'Xác nhận sinh viên'
                 : activeTab === 'luanChuyen' ? 'Luân chuyển hồ sơ'
                 : 'Xác nhận hoàn thành CTĐT';

  // Get unique class codes
  const classOptions = useMemo(() => {
    const classes = [...new Set(students.map(s => s.classCode).filter(Boolean))];
    return classes.sort();
  }, [students]);

  // Build a lookup map: studentId -> { semester -> record }
  const distMap = useMemo(() => {
    const map = {};
    currentDists.forEach(d => {
      if (!map[d.studentId]) map[d.studentId] = {};
      map[d.studentId][d.semester] = d;
    });
    return map;
  }, [currentDists]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeStr(searchTerm);
    let filtered = students.filter(s => {
      if (normalizedSearch) {
        const match =
          normalizeStr(s.fullName).includes(normalizedSearch) ||
          normalizeStr(s.studentId).includes(normalizedSearch) ||
          normalizeStr(s.classCode).includes(normalizedSearch);
        if (!match) return false;
      }
      if (filterClass && s.classCode !== filterClass) return false;
      return true;
    });

    // Filter by semester distribution status
    if (activeTab === 'luanChuyen' && filterLuanChuyen !== 'all') {
      const daDiIds = new Set(currentDists.filter(d => d.forwardDate).map(d => d.studentId));
      if (filterLuanChuyen === 'da_di') {
        filtered = filtered.filter(s => daDiIds.has(s.id));
      } else if (filterLuanChuyen === 'chua_di') {
        filtered = filtered.filter(s => !daDiIds.has(s.id));
      }
    } else if (activeTab !== 'luanChuyen' && filterSemester !== 'all') {
      if (filterSemester === 'none') {
        // Show students that have NO distributions at all
        filtered = filtered.filter(s => !distMap[s.id] || Object.keys(distMap[s.id]).length === 0);
      } else {
        const sem = parseInt(filterSemester);
        // Show students NOT yet distributed for this semester
        filtered = filtered.filter(s => !distMap[s.id] || !distMap[s.id][sem]);
      }
    }

    return filtered;
  }, [students, searchTerm, filterClass, filterSemester, filterLuanChuyen, activeTab, distMap, currentDists]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterClass, filterSemester, filterLuanChuyen, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const result = {};
    SEMESTERS.forEach(sem => {
      let count = 0;
      students.forEach(s => {
        if (distMap[s.id] && distMap[s.id][sem]) count++;
      });
      result[sem] = count;
    });
    return result;
  }, [students, distMap]);

  // Toggle distribution
  const handleToggle = async (student, semester) => {
    const existing = distMap[student.id]?.[semester];
    if (existing) {
      // Confirm remove
      if (!window.confirm(`Bạn có chắc muốn hủy cấp phát HK${semester} cho ${student.fullName}?`)) return;
      try {
        await axios.delete(`${getApiUrl()}/${apiEndpoint}/${existing.id}`);
        setCurrentDists(prev => prev.filter(d => d.id !== existing.id));
        toast.success(`Đã hủy cấp phát HK${semester} - ${student.fullName}`);
        api.logActivity('Hủy cấp phát', `Hủy cấp phát ${tabLabel} (HK${semester}) cho SV ${student.fullName}`);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi hủy cấp phát');
      }
    } else {
      // Add new distribution
      const record = {
        studentId: student.id,
        studentName: student.fullName,
        classCode: student.classCode || '',
        semester: semester,
        distributedAt: new Date().toISOString(),
        note: '',
      };
      try {
        const res = await axios.post(`${getApiUrl()}/${apiEndpoint}`, record);
        setCurrentDists(prev => [...prev, res.data]);
        toast.success(`✅ Đã cấp phát HK${semester} - ${student.fullName}`);
        api.logActivity('Cấp phát', `Đã cấp ${tabLabel} (HK${semester}) cho SV ${student.fullName}`);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi lưu cấp phát');
      }
    }
  };



  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-violet-500" />
            Quản Lý Cấp Phát Hồ Sơ
          </h1>
          <p className="text-slate-500 mt-1">Theo dõi cấp phát hồ sơ & giấy vay vốn cho sinh viên theo từng học kỳ</p>
        </div>
        {filteredStudents.length > 0 && (
          <button onClick={() => {
            const exportRows = filteredStudents.map((s, idx) => {
              const row = { 'STT': idx + 1, 'Họ và tên': s.fullName, 'MSSV': s.studentId, 'Lớp': s.classCode };
              if (activeTab === 'luanChuyen') {
                const records = currentDists.filter(d => d.studentId === s.id);
                const latest = records[records.length - 1];
                row['Ngày nhận'] = latest?.receiveDate || '';
                row['Ngày đi'] = latest?.forwardDate || '';
                row['Khoa'] = latest?.toKhoa ? 'X' : '';
                row['Kế toán'] = latest?.toKeToan ? 'X' : '';
                row['Đào tạo'] = latest?.toDaoTao ? 'X' : '';
                row['Giám đốc'] = latest?.toGiamDoc ? 'X' : '';
              } else {
                [1,2,3,4,5,6].forEach(sem => {
                  row['HK' + sem] = distMap[s.id] && distMap[s.id][sem] ? 'X' : '';
                });
              }
              return row;
            });
            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Cấp phát');
            XLSX.writeFile(wb, 'CapPhatHoSo_' + new Date().toLocaleDateString('vi-VN').replace(/\//g, '-') + '.xlsx');
            toast.success('Đã xuất ' + filteredStudents.length + ' sinh viên ra Excel');
          }} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors font-medium text-sm border border-violet-200 shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('hoSo')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'hoSo'
              ? 'bg-white text-violet-700 shadow-sm border border-violet-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Hồ sơ NĐ238
        </button>
        <button
          onClick={() => setActiveTab('vayVon')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'vayVon'
              ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          Giấy vay vốn
        </button>
        <button
          onClick={() => setActiveTab('xacNhanSV')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'xacNhanSV'
              ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Xác nhận là SV
        </button>
        <button
          onClick={() => setActiveTab('xacNhanHoanThanh')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'xacNhanHoanThanh'
              ? 'bg-white text-orange-700 shadow-sm border border-orange-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Xác nhận hoàn thành CTĐT
        </button>
        <button
          onClick={() => setActiveTab('luanChuyen')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'luanChuyen'
              ? 'bg-white text-rose-700 shadow-sm border border-rose-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListTree className="w-4 h-4" />
          Luân chuyển hồ sơ
        </button>
      </div>

      {/* Stats bar */}
      {activeTab !== 'luanChuyen' && (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {SEMESTERS.map(sem => (
          <div key={sem} className={`rounded-xl p-3 text-center border ${
            activeTab === 'hoSo' ? 'bg-violet-50 border-violet-100' : 
            activeTab === 'vayVon' ? 'bg-emerald-50 border-emerald-100' :
            activeTab === 'xacNhanSV' ? 'bg-blue-50 border-blue-100' :
            'bg-orange-50 border-orange-100'
          }`}>
            <div className="text-xs text-slate-500 font-medium">HK{sem}</div>
            <div className={`text-xl font-bold ${
              activeTab === 'hoSo' ? 'text-violet-700' : 
              activeTab === 'vayVon' ? 'text-emerald-700' :
              activeTab === 'xacNhanSV' ? 'text-blue-700' :
              'text-orange-700'
            }`}>{stats[sem] || 0}</div>
            <div className="text-[10px] text-slate-400">/ {students.length} SV</div>
          </div>
        ))}
      </div>
      )}
      
      {/* Progress Bar for Selected Class */}
      {filterClass && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 animate-in slide-in-from-top-2">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            Tiến độ lớp {filterClass}
          </h3>
          {activeTab === 'luanChuyen' ? (() => {
            const classStudents = students.filter(s => s.classCode === filterClass);
            const total = classStudents.length;
            
            // Build a simple array-based map for routing since distMap for luanChuyen maps studentId -> array of records
            // Wait, in DocumentDistribution, distMap for luanChuyen is NOT an array, it's mapped by `semester`.
            // Actually, wait: "const existing = distMap[student.id]?.[semester];". For `luanChuyen`, the table component `LuanChuyenTable` does its own mapping. `DocumentDistribution`'s `distMap` maps `d.semester` which is undefined for `documentRouting`.
            // So `distMap[s.id][undefined]` would hold the last record. This is a bit buggy in `DocumentDistribution`.
            // Let's calculate directly from `currentDists`:
            const classDistIds = new Set(classStudents.map(s => s.id));
            const classRecords = currentDists.filter(d => classDistIds.has(d.studentId));
            
            const completed = new Set(classRecords.filter(d => d.forwardDate).map(d => d.studentId)).size;
            const pending = new Set(classRecords.filter(d => d.receiveDate && !d.forwardDate).map(d => d.studentId)).size;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
            
            return (
              <div>
                 <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                   <span>Đã luân chuyển xong: <strong className="text-slate-700">{completed}/{total}</strong> SV</span>
                   <span className="text-violet-700 font-bold">{percent}%</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                   <div className="bg-violet-500 h-2.5 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                   {pendingPercent > 0 && <div className="bg-amber-400 h-2.5 transition-all duration-500" style={{ width: `${pendingPercent}%` }}></div>}
                 </div>
                 {pending > 0 && <div className="text-[10px] text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    Đang tồn đọng (đã nhận nhưng chưa đi): {pending} SV
                 </div>}
              </div>
            );
          })() : (
             <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
               {SEMESTERS.map(sem => {
                  const classStudents = students.filter(s => s.classCode === filterClass);
                  const total = classStudents.length;
                  const completed = classStudents.filter(s => distMap[s.id] && distMap[s.id][sem]).length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={sem}>
                      <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1.5">
                        <span>HK{sem}</span>
                        <span className={percent === 100 ? 'text-emerald-600 font-bold' : 'text-slate-700 font-bold'}>{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
               })}
             </div>
          )}
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, MSSV, lớp..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none border border-slate-300 rounded-lg px-3 py-2 pr-8 bg-white text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="">Tất cả lớp</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
          </div>
          {activeTab === 'luanChuyen' && (
            <div className="relative">
              <select
                className="appearance-none border border-slate-300 rounded-lg px-3 py-2 pr-8 bg-white text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                value={filterLuanChuyen}
                onChange={e => setFilterLuanChuyen(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="da_di">Hồ sơ đã đi</option>
                <option value="chua_di">Hồ sơ chưa đi</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          )}
          {activeTab !== 'luanChuyen' && (
          <div className="relative">
            <select
              className="appearance-none border border-slate-300 rounded-lg px-3 py-2 pr-8 bg-white text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
              value={filterSemester}
              onChange={e => setFilterSemester(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="none">Chưa cấp kỳ nào</option>
              {SEMESTERS.map(sem => (
                <option key={sem} value={sem.toString()}>Chưa cấp HK{sem}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
          </div>
          )}
          <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Hiển thị: <span className={`font-bold ${activeTab === 'hoSo' ? 'text-violet-600' : 'text-emerald-600'}`}>{filteredStudents.length}</span> / {students.length} SV
          </div>
        </div>

        {/* Table */}
        {activeTab === 'luanChuyen' ? (
          <LuanChuyenTable 
            paginatedStudents={paginatedStudents} 
            currentDists={currentDists} 
            setCurrentDists={setCurrentDists}
            loading={loading}
            startIndex={startIndex}
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 font-semibold w-12 text-center">STT</th>
                <th className="px-3 py-3 font-semibold min-w-[180px]">Họ và tên</th>
                <th className="px-3 py-3 font-semibold">Lớp</th>
                <th className="px-3 py-3 font-semibold">MSSV</th>
                {SEMESTERS.map(sem => (
                  <th key={sem} className="px-2 py-3 font-semibold text-center w-[90px]">
                    <div>HK{sem}</div>
                    <div className="text-[10px] font-normal text-slate-400 normal-case">
                      {stats[sem] || 0} đã cấp
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4 + SEMESTERS.length} className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={4 + SEMESTERS.length} className="px-6 py-12 text-center text-slate-500">
                    {searchTerm || filterClass || filterSemester !== 'all'
                      ? 'Không tìm thấy sinh viên nào phù hợp.'
                      : 'Chưa có dữ liệu sinh viên.'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => {
                  const studentDist = distMap[student.id] || {};
                  const distCount = Object.keys(studentDist).length;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-center text-slate-500 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{student.fullName}</div>
                        {distCount > 0 && (
                          <div className={`text-[10px] mt-0.5 ${
                            activeTab === 'hoSo' ? 'text-violet-500' : 
                            activeTab === 'vayVon' ? 'text-emerald-500' : 
                            activeTab === 'xacNhanSV' ? 'text-blue-500' : 
                            'text-orange-500'}`}>
                            Đã cấp {distCount}/{SEMESTERS.length} kỳ
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-medium text-xs">{student.classCode}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs">{student.studentId || '-'}</td>
                      {SEMESTERS.map(sem => {
                        const record = studentDist[sem];
                        return (
                          <td key={sem} className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => handleToggle(student, sem)}
                              className={`group relative w-full flex flex-col items-center justify-center rounded-lg py-1.5 px-1 transition-all ${
                                record
                                  ? activeTab === 'hoSo'
                                    ? 'bg-violet-100 hover:bg-violet-200 border border-violet-200'
                                    : activeTab === 'vayVon'
                                      ? 'bg-emerald-100 hover:bg-emerald-200 border border-emerald-200'
                                      : activeTab === 'xacNhanSV'
                                        ? 'bg-blue-100 hover:bg-blue-200 border border-blue-200'
                                        : 'bg-orange-100 hover:bg-orange-200 border border-orange-200'
                                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                              }`}
                              title={record ? `Đã cấp lúc ${formatDate(record.distributedAt)}\nClick để hủy` : `Đánh dấu đã cấp HK${sem}`}
                            >
                              {record ? (
                                <>
                                  <Check className={`w-4 h-4 ${
                                    activeTab === 'hoSo' ? 'text-violet-600' : 
                                    activeTab === 'vayVon' ? 'text-emerald-600' : 
                                    activeTab === 'xacNhanSV' ? 'text-blue-600' : 
                                    'text-orange-600'}`} />
                                  <span className={`text-[9px] font-medium mt-0.5 ${
                                    activeTab === 'hoSo' ? 'text-violet-500' : 
                                    activeTab === 'vayVon' ? 'text-emerald-500' : 
                                    activeTab === 'xacNhanSV' ? 'text-blue-500' : 
                                    'text-orange-500'}`}>
                                    {formatShortDate(record.distributedAt)}
                                  </span>
                                  <X className="w-3 h-3 text-red-400 absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Hiển thị <span className="font-medium">{startIndex + 1}</span> đến <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> trong số <span className="font-medium">{filteredStudents.length}</span> sinh viên
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <div className="px-3 py-1 text-sm font-medium text-slate-700">
                Trang {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
