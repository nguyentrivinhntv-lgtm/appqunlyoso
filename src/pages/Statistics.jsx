import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, BookOpen, GraduationCap, Library, Loader2, AlertCircle
} from 'lucide-react';
import { getApiBaseUrl } from '../services/connectionConfig';

const getApiUrl = () => `${getApiBaseUrl()}/students`;

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e', '#6366f1'];

export default function Statistics() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(getApiUrl());
      setStudents(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Không thể tải dữ liệu sinh viên.');
    } finally {
      setLoading(false);
    }
  };

  // Tính toán thống kê
  const stats = useMemo(() => {
    if (!students.length) return null;

    const totalStudents = students.length;
    
    // Nhóm theo hệ đào tạo
    const eduTypeCount = students.reduce((acc, s) => {
      const type = s.educationType || 'Chưa phân loại';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const eduTypeData = Object.keys(eduTypeCount).map(key => ({ name: key, value: eduTypeCount[key] }));

    // Nhóm theo khóa học
    const courseYearCount = students.reduce((acc, s) => {
      const year = s.courseYear || 'Chưa rõ';
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});
    const courseYearData = Object.keys(courseYearCount).sort().map(key => ({ name: key, students: courseYearCount[key] }));

    // Nhóm theo ngành
    const majorCount = students.reduce((acc, s) => {
      const major = s.major || 'Chưa có ngành';
      acc[major] = (acc[major] || 0) + 1;
      return acc;
    }, {});
    // Top 10 ngành đông nhất
    const majorData = Object.keys(majorCount)
      .map(key => ({ name: key, students: majorCount[key] }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 10);

    // Nhóm theo năm sinh
    const birthYearCount = students.reduce((acc, s) => {
      let year = 'Chưa rõ';
      if (s.dob) {
        const parts = s.dob.split('/');
        if (parts.length === 3) year = parts[2];
        else if (s.dob.length === 4) year = s.dob;
      }
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});
    const birthYearData = Object.keys(birthYearCount)
      .filter(y => y !== 'Chưa rõ' && !isNaN(parseInt(y)))
      .sort()
      .map(key => ({ name: key, students: birthYearCount[key] }));

    return {
      totalStudents,
      totalMajors: Object.keys(majorCount).length,
      totalEduTypes: Object.keys(eduTypeCount).length,
      eduTypeData,
      courseYearData,
      majorData,
      birthYearData
    };
  }, [students]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
        <p className="text-slate-500">Đang tổng hợp dữ liệu thống kê...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  if (!stats || stats.totalStudents === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
        <BarChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Chưa có dữ liệu thống kê</h3>
        <p className="text-slate-500 mt-1">Vui lòng nhập dữ liệu sinh viên để xem các biểu đồ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Thống Kê & Báo Cáo</h1>
        <p className="text-slate-500 mt-1">Tổng quan về số lượng sinh viên, ngành học và hệ đào tạo</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Sinh Viên</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalStudents}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Số Ngành</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalMajors}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hệ Đào Tạo</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalEduTypes}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Khóa Đang Học</p>
            <p className="text-2xl font-bold text-slate-800">{stats.courseYearData.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ Khóa học */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-sky-500 rounded-sm"></div> Thống Kê Theo Khóa Học
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.courseYearData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="students" name="Số lượng SV" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Hệ Đào tạo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-sm"></div> Phân Bổ Hệ Đào Tạo
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.eduTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {stats.eduTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Biểu đồ Top Ngành */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-amber-500 rounded-sm"></div> Top 10 Ngành Đông Sinh Viên Nhất
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.majorData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 13}} width={150} />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="students" name="Số lượng SV" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biểu đồ Năm Sinh */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-purple-500 rounded-sm"></div> Thống Kê Theo Năm Sinh
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.birthYearData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="students" name="Số lượng SV" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
