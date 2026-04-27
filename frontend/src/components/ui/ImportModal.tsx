import { useState, useRef, DragEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from './Button';
import { Modal } from './Modal';
import { licenseApi } from '../../api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('请选择 JSON 文件');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('请先选择文件');
      return;
    }

    setIsUploading(true);
    try {
      const res = await licenseApi.import(selectedFile, overwrite);
      const { success, failed, errors } = res.data;

      if (failed > 0) {
        toast.success(`导入完成：成功 ${success} 条，失败 ${failed} 条`);
        if (errors && errors.length > 0) {
          console.warn('导入错误:', errors.slice(0, 10));
        }
      } else {
        toast.success(`成功导入 ${success} 条数据`);
      }

      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '导入失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setOverwrite(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="导入授权数据"
      footer={
            <>
              <Button variant="secondary" size="sm" onClick={handleClose} className="min-w-[80px] h-9">
                取消
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={!selectedFile}
                className="min-w-[80px] h-9"
              >
                确认导入
              </Button>
            </>
      }
    >
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-2">
              <svg className="w-10 h-10 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              <p className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                重新选择
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">拖拽 JSON 文件到此处，或 <span className="text-blue-600">点击选择</span></p>
              <p className="text-xs text-gray-400">仅支持 .json 格式</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            冲突处理策略
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conflict"
                checked={!overwrite}
                onChange={() => setOverwrite(false)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">跳过已有</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conflict"
                checked={overwrite}
                onChange={() => setOverwrite(true)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">覆盖已有</span>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {!overwrite
              ? '遇到已存在的授权码时，跳过该条数据'
              : '遇到已存在的授权码时，将更新其信息'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
