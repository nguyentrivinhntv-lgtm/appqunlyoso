import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  FileCheck,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Printer,
  BarChart3,
  Upload,
  History
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../services/api';
import axios from 'axios';
import { getApiBaseUrl } from '../services/connectionConfig';

const getApiUrl = () => getApiBaseUrl();
const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#f43f5e', '#6366f1'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    processedForms: 0,
    pendingDistributions: 0,
    todayActivity: 0
  });

  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, formsRes, distRes, logsRes] = await Promise.all([
          api.getStudents().catch(() => []),
          api.getProcessedProfiles().catch(() => []),
          axios.get(`${getApiUrl()}/documentRouting`).catch(() => ({ data: [] })),
          api.getLogs().catch(() => [])
        ]);

        const students = Array.isArray(studentsRes) ? studentsRes : [];
        const forms = Array.isArray(formsRes) ? formsRes : [];
        const routing = distRes?.data || [];
        const logs = Array.isArray(logsRes) ? logsRes : [];

        const today = new Date().toISOString().split('T')[0];

        // Calculate pending distributions
        const pending = routing.filter(d =>
          d.receiveDate && (!d.toKhoa && !d.toKeToan && !d.toDaoTao && !d.toGiamDoc)
        ).length;

        const todayActivities = routing.filter(d =>
          (d.receiveDate && d.receiveDate.startsWith(today)) ||
          (d.forwardDate && d.forwardDate.startsWith(today))
        ).length;

        setStats({
          totalStudents: students.length,
          processedForms: forms.length,
          pendingDistributions: pending,
          todayActivity: todayActivities
        });

        // Build 7-day chart data from activity logs
        const last7Days = [];
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const count = logs.filter(l => l.timestamp && l.timestamp.startsWith(dateStr)).length;
          last7Days.push({
            name: i === 0 ? 'Hôm nay' : dayNames[d.getDay()],
            value: count,
            date: dateStr
          });
        }
        setChartData(last7Days);

        // Build pie data by department
        const deptCount = {};
        students.forEach(s => {
          const dept = s.department || 'Chưa phân loại';
          deptCount[dept] = (deptCount[dept] || 0) + 1;
        });
        const pie = Object.entries(deptCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
        setPieData(pie);

        // Recent activity logs (last 8)
        const sorted = logs
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 8);
        setRecentLogs(sorted);

      } catch (err) {
        console.error('Lỗi khi tải thống kê:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { name: 'Tổng Sinh Viên', value: stats.totalStudents, icon: Users, color: 'bg-blue-500', link: '/students' },
    { name: 'Hồ sơ đã Xử lý', value: stats.processedForms, icon: FileCheck, color: 'bg-emerald-500', link: '/processed' },
    { name: 'Hồ sơ Tồn đọng', value: stats.pendingDistributions, icon: AlertTriangle, color: 'bg-amber-500', link: '/distribution' },
    { name: 'Hoạt động Hôm nay', value: stats.todayActivity, icon: TrendingUp, color: 'bg-violet-500', link: '/distribution' }
  ];

  const quickActions = [
    { name: 'Import Excel', desc: 'Nhập danh sách SV từ file', icon: Upload, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100', href: '/students' },
    { name: 'In Hồ sơ', desc: 'Tạo biểu mẫu & in ấn', icon: Printer, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100', href: '/forms' },
    { name: 'Cấp phát HK', desc: 'Quản lý cấp phát giấy tờ', icon: ClipboardCheck, color: 'text-violet-600 bg-violet-50 hover:bg-violet-100', href: '/distribution' },
    { name: 'Thống kê', desc: 'Xem biểu đồ & báo cáo', icon: BarChart3, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100', href: '/statistics' },
  ];

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan Hệ thống</h1>
        <div className="flex items-center text-sm text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          <Clock className="w-4 h-4 mr-1.5 text-violet-500" />
          Cập nhật lúc: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.name}</p>
                <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl text-white ${stat.color} shadow-sm transform group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100/50 z-10">
              <Link to={stat.link} className="text-sm text-violet-600 font-medium flex items-center group-hover:text-violet-700 transition-colors">
                Xem chi tiết
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10 ${stat.color} blur-2xl group-hover:opacity-20 transition-opacity duration-300`}></div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${action.color} border border-transparent hover:border-current/10`}
            >
              <action.icon className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{action.name}</p>
                <p className="text-[11px] opacity-70">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-500" />
            Hoạt động 7 Ngày Qua
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                  cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                  formatter={(value) => [`${value} hoạt động`, 'Số lượng']}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Students by Department */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            SV theo Khoa
          </h2>
          {pieData.length > 0 ? (
            <>
              <div className="h-40 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                    <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                    <span className="font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Bottom Row: Alerts + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Cảnh báo
          </h2>
          {stats.pendingDistributions > 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800">Cần xử lý hồ sơ</h4>
                <p className="text-xs text-amber-700 mt-1">Có <b>{stats.pendingDistributions}</b> hồ sơ đã nhận nhưng chưa chuyển đi.</p>
                <Link to="/distribution" className="text-xs text-amber-800 font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
                  Xem ngay <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-emerald-50 rounded-xl text-center border border-emerald-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm text-emerald-700 font-medium">Tuyệt vời! Không có hồ sơ nào tồn đọng.</p>
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" />
              Hoạt động gần đây
            </h2>
            <Link to="/logs" className="text-xs font-medium text-violet-600 hover:text-violet-700">Xem tất cả</Link>
          </div>
          {recentLogs.length > 0 ? (
            <div className="space-y-0">
              {recentLogs.map((log, idx) => (
                <div key={log.id || idx} className="flex gap-3 py-2.5 group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 group-hover:bg-violet-600 transition-colors"></div>
                    {idx < recentLogs.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1"></div>}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{log.action}</p>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{formatTime(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{log.userFullName}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">Chưa có hoạt động nào được ghi nhận.</div>
          )}
        </div>
      </div>
    </div>
  );
}
