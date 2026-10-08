import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Users, Plus, Edit2, Trash2, KeyRound, Save, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';

const EMPTY_USER = { username: '', password: '', fullName: '', role: 'staff' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_USER });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err) {
      toast.error('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData(user);
    } else {
      setEditingId(null);
      setFormData({ ...EMPTY_USER });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName) {
      toast.error('Vui lòng điền đủ thông tin');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await api.updateUser(editingId, formData);
        setUsers(users.map(u => u.id === editingId ? updated : u));
        toast.success('Đã cập nhật tài khoản');
        api.logActivity('Cập nhật tài khoản', `Cập nhật tài khoản: ${formData.username}`);
      } else {
        // Check if username exists
        if (users.some(u => u.username === formData.username)) {
          toast.error('Tên đăng nhập đã tồn tại');
          setIsSaving(false);
          return;
        }
        const created = await api.createUser(formData);
        setUsers([...users, created]);
        toast.success('Đã tạo tài khoản mới');
        api.logActivity('Tạo tài khoản', `Tạo tài khoản mới: ${formData.username}`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Lỗi khi lưu tài khoản');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, username) => {
    if (username === 'admin') {
      toast.error('Không thể xóa tài khoản admin mặc định');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${username}"?`)) return;

    try {
      await api.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success('Đã xóa tài khoản');
      api.logActivity('Xóa tài khoản', `Xóa tài khoản: ${username}`);
    } catch (err) {
      toast.error('Lỗi khi xóa tài khoản');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-600" />
            Quản Lý Tài Khoản
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Tạo và phân quyền cho nhân viên sử dụng phần mềm
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm tài khoản
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Tên đăng nhập</th>
                <th className="px-6 py-4">Mật khẩu</th>
                <th className="px-6 py-4">Phân quyền</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.fullName}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono text-xs">
                      {user.username}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">••••••••</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenModal(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={user.username === 'admin'}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    Chưa có tài khoản nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Họ và tên người dùng
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  required
                  disabled={editingId && formData.username === 'admin'}
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:bg-slate-100"
                  placeholder="Nhập tên đăng nhập viết liền không dấu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="Mật khẩu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phân quyền
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  disabled={editingId && formData.username === 'admin'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all disabled:bg-slate-100"
                >
                  <option value="staff">Nhân viên (Chỉ xem và làm hồ sơ)</option>
                  <option value="admin">Quản trị viên (Toàn quyền)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
