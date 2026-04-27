import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { adminApi } from '../api';
import { removeToken } from '../utils/auth';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.old_password || !formData.new_password || !formData.confirm_password) {
      toast.error('请填写完整信息');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error('新密码长度不能少于 6 位');
      return;
    }

    setIsLoading(true);
    try {
      const response = await adminApi.changePassword({
        old_password: formData.old_password,
        new_password: formData.new_password,
      });

      if (response.status === 200) {
        toast.success('密码修改成功，请重新登录');
        setTimeout(() => {
          removeToken();
          navigate('/login');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.error || '密码修改失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Toaster position="top-center" />

      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">修改密码</h1>
            <p className="text-gray-600 mt-2">请输入当前密码和新密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="当前密码"
              type="password"
              value={formData.old_password}
              onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
              placeholder="请输入当前密码"
            />

            <Input
              label="新密码"
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              placeholder="请输入新密码（至少 6 位）"
            />

            <Input
              label="确认新密码"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              placeholder="请再次输入新密码"
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => navigate('/')}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                isLoading={isLoading}
              >
                确定
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
