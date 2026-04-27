import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '../components/ui/Dropdown';
import { SearchIcon } from '../components/ui/SearchIcon';
import { licenseApi, type License } from '../api';
import { formatDate } from '../utils/auth';
import AdminLayout from '../layouts/admin';

export default function Dashboard() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [formData, setFormData] = useState({
    domain: '',
    remark: '',
    expire_time: '',
    status: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 日期快捷选项
  const datePresets = [
    { label: '1 月后', days: 30 },
    { label: '3 月后', days: 90 },
    { label: '6 月后', days: 180 },
    { label: '1 年后', days: 365 },
  ];

  // 实时搜索（300ms 防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLicenses();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    loadLicenses();
  }, []);

  // 复制到剪贴板（支持非 HTTPS）
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // 现代浏览器（推荐 HTTPS）
        await navigator.clipboard.writeText(text);
        toast.success('复制成功');
      } else {
        // 降级方案（支持非 HTTPS）
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('复制成功');
      }
    } catch (err) {
      toast.error('复制失败');
    }
  };

  const loadLicenses = async () => {
    setIsLoading(true);
    try {
      const response = await licenseApi.list(keyword);
      setLicenses(response.data.list);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLicense(null);
    setFormData({ domain: '', remark: '', expire_time: '', status: 1 });
    setIsModalOpen(true);
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    // 将毫秒时间戳转换为 YYYY-MM-DD 格式
    const expireDate = new Date(license.expire_time);
    const year = expireDate.getFullYear();
    const month = String(expireDate.getMonth() + 1).padStart(2, '0');
    const day = String(expireDate.getDate()).padStart(2, '0');
    setFormData({
      domain: license.domain,
      remark: license.remark || '',
      expire_time: `${year}-${month}-${day}`,
      status: license.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个授权吗？')) return;

    try {
      await licenseApi.delete(id);
      toast.success('删除成功');
      loadLicenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleSubmit = async () => {
    if (!formData.domain || !formData.expire_time) {
      toast.error('请填写完整信息');
      return;
    }

    setIsSubmitting(true);
    try {
      // 将日期字符串转换为时间戳（本地时间 23:59:59）
      const [year, month, day] = formData.expire_time.split('-').map(Number);
      const expireTime = new Date(year, month - 1, day, 23, 59, 59).getTime();
      
      console.log('Creating license:', {
        domain: formData.domain,
        expire_time: formData.expire_time,
        timestamp: expireTime,
        date: new Date(expireTime).toISOString()
      });
      
      if (editingLicense) {
        await licenseApi.update({
          id: editingLicense.id,
          domain: formData.domain,
          remark: formData.remark,
          expire_time: expireTime,
          status: formData.status,
        });
        toast.success('更新成功');
      } else {
        await licenseApi.create({
          domain: formData.domain,
          remark: formData.remark,
          expire_time: expireTime,
        });
        toast.success('创建成功');
      }
      
      setIsModalOpen(false);
      loadLicenses();
    } catch (error: any) {
      console.error('License operation failed:', error);
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return <span className="text-green-600">有效</span>;
      case 0: return <span className="text-gray-600">已禁用</span>;
      case -1: return <span className="text-red-600">已过期</span>;
      default: return <span className="text-gray-600">未知</span>;
    }
  };

  return (
    <AdminLayout>
      <Toaster position="top-center" />
        
        {/* 搜索和操作栏 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索域名、UUID 或备注..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="primary" onClick={handleCreate}>
                新建授权
              </Button>
            </div>
          </div>
        </div>

        {/* 授权列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UUID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    域名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    备注
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    到期时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => copyToClipboard(license.license_key)}
                        title="点击复制"
                      >
                        {license.license_key}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => copyToClipboard(license.domain)}
                        title="点击复制"
                      >
                        {license.domain}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                        onClick={() => copyToClipboard(license.remark || '')}
                        title="点击复制"
                      >
                        {license.remark || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(license.expire_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusText(license.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleEdit(license)}
                          >
                            编辑
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDelete(license.id)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 新建/编辑弹窗 */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingLicense ? '编辑授权' : '新建授权'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                确定
              </Button>
            </>
          }
        >
        <div className="space-y-4">
          <Input
            label="域名"
            type="text"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="例如：panel.example.com"
          />
          
          <Input
            label="备注"
            type="text"
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder="备注客户信息（可选）"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              到期时间
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={formData.expire_time}
                onChange={(e) => setFormData({ ...formData, expire_time: e.target.value })}
                className="flex-1"
              />
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="primary" size="sm">
                    快捷
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="日期快捷选项">
                  {datePresets.map((preset) => (
                    <DropdownItem
                      key={preset.label}
                      onPress={() => {
                        const date = new Date();
                        date.setDate(date.getDate() + preset.days);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFormData({ ...formData, expire_time: `${year}-${month}-${day}` });
                      }}
                    >
                      {preset.label}
                    </DropdownItem>
                  ))}
                  <DropdownItem
                    onPress={() => {
                      const date = new Date();
                      date.setFullYear(date.getFullYear() + 100);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setFormData({ ...formData, expire_time: `${year}-${month}-${day}` });
                    }}
                  >
                    永久
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
            <p className="text-xs text-gray-500 mt-1">例：20281001</p>
          </div>
          
          {!editingLicense && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>有效</option>
                <option value={0}>已禁用</option>
              </select>
            </div>
          )}
          {editingLicense && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>有效</option>
                <option value={0}>已禁用</option>
                <option value={-1}>已过期</option>
              </select>
            </div>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
}
