import { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '../components/ui/Dropdown';
import { SearchBar } from '../components/ui/SearchBar';
import { DatePicker } from '../components/ui/DatePicker';
import ImportModal from '../components/ui/ImportModal';
import { licenseApi, type License } from '../api';
import { formatDate } from '../utils/auth';
import AdminLayout from '../layouts/admin';

export default function Dashboard() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [formData, setFormData] = useState({
    domain: '',
    remark: '',
    expire_time: '',
    license_key: '',
    status: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const datePresets = [
    { label: '1 月后', days: 30 },
    { label: '3 月后', days: 90 },
    { label: '6 月后', days: 180 },
    { label: '1 年', days: 365 },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLicenses();
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    loadLicenses();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('复制成功');
      } else {
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
    setFormData({ domain: '', remark: '', expire_time: '', license_key: '', status: 1 });
    setIsModalOpen(true);
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    const expireDate = new Date(license.expire_time);
    const year = expireDate.getFullYear();
    const month = String(expireDate.getMonth() + 1).padStart(2, '0');
    const day = String(expireDate.getDate()).padStart(2, '0');
    setFormData({
      domain: license.domain,
      remark: license.remark || '',
      expire_time: `${year}-${month}-${day}`,
      license_key: license.license_key,
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
      const [year, month, day] = formData.expire_time.split('-').map(Number);
      const expireTime = new Date(year, month - 1, day, 23, 59, 59).getTime();

      if (editingLicense) {
        await licenseApi.update({
          id: editingLicense.id,
          domain: formData.domain,
          remark: formData.remark,
          expire_time: expireTime,
          status: formData.status,
          license_key: formData.license_key !== editingLicense.license_key ? formData.license_key : undefined,
        });
        toast.success('更新成功');
      } else {
        await licenseApi.create({
          domain: formData.domain,
          remark: formData.remark,
          expire_time: expireTime,
          license_key: formData.license_key || undefined,
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

  const handleExport = async () => {
    try {
      const response = await licenseApi.export();
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `licenses-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '导出失败');
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

      <div className="flex items-center justify-between mb-4 gap-3">
        <SearchBar
          isVisible={isSearchVisible}
          value={keyword}
          placeholder="搜索域名、UUID 或备注..."
          onOpen={() => setIsSearchVisible(true)}
          onClose={() => setIsSearchVisible(false)}
          onChange={setKeyword}
          width="240px"
        />
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleCreate}>
            新增
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            导出
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
            导入
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  UUID
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  域名
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  备注
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  到期时间
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLicense ? '编辑授权' : '新增授权'}
        footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)} className="min-w-[80px] h-9">
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting} className="min-w-[80px] h-9">
                保存
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
          <div className="flex items-center gap-2">
            <DatePicker
              value={formData.expire_time}
              onChange={(date) => {
                if (date) {
                  const { year, month, day } = date;
                  const m = String(month).padStart(2, '0');
                  const d = String(day).padStart(2, '0');
                  setFormData({ ...formData, expire_time: `${year}-${m}-${d}` });
                } else {
                  setFormData({ ...formData, expire_time: '' });
                }
              }}
            />
            <Dropdown>
              <DropdownTrigger>
                <Button variant="primary" size="sm" className="shrink-0 h-9">快捷</Button>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            授权 UUID
          </label>
          <input
            type="text"
            value={formData.license_key}
            onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
            placeholder={editingLicense ? '留空保持不变' : '留空自动生成'}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">
            {editingLicense
              ? '修改后将更新此授权的 UUID，留空则保持不变'
              : '可选：手动指定 UUID，留空则自动生成'}
          </p>
        </div>

        {!editingLicense && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors h-9"
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
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors h-9"
            >
              <option value={1}>有效</option>
              <option value={0}>已禁用</option>
              <option value={-1}>已过期</option>
            </select>
          </div>
        )}
      </div>
    </Modal>

    <ImportModal
      isOpen={isImportOpen}
      onClose={() => setIsImportOpen(false)}
      onSuccess={loadLicenses}
    />
  </AdminLayout>
  );
}
