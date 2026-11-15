import React, { useState } from 'react';
import { Modal } from '../../../organisms/Modal';
import { Dropzone } from '../../../molecules/Dropzone';
import { UploadQueueItem, type UploadItem } from './UploadQueueItem';
import { Button } from '../../../atoms/Button';
import { musicApi } from '../../../../api/musicApi';
import { useAuthStore } from '../../../../stores/authStore';

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { updateStorageUsage } = useAuthStore();

  const handleFilesSelected = (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      }),
    );
  };

  const processUploadItem = async (item: UploadItem): Promise<boolean> => {
    try {
      // Step 1: Request Presigned PUT URL from backend
      updateItem(item.id, { status: 'uploading', progress: 5 });
      const initResult = await musicApi.initDirectUpload({
        fileName: item.file.name,
        mimeType: item.file.type || 'audio/mpeg',
        fileSize: item.file.size,
      });

      // Step 2: Upload directly to Cloudflare R2
      await musicApi.uploadToR2(initResult.uploadUrl, item.file, (percent) => {
        // Reserve 90-100% for backend tagging
        const scaledPercent = Math.min(90, Math.max(5, Math.round(percent * 0.9)));
        updateItem(item.id, { progress: scaledPercent });
      });

      // Step 3: Complete upload and parse metadata
      updateItem(item.id, { status: 'processing', progress: 95 });
      await musicApi.completeDirectUpload({
        storageKey: initResult.storageKey,
        fileName: item.file.name,
      });

      updateItem(item.id, { status: 'completed', progress: 100 });
      updateStorageUsage(item.file.size);
      return true;
    } catch {
      // Step 4: Fallback to proxy upload if direct R2 upload fails
      try {
        updateItem(item.id, { status: 'uploading', progress: 10 });
        await musicApi.uploadViaProxy(item.file, (percent) => {
          updateItem(item.id, { progress: Math.min(95, percent) });
        });

        updateItem(item.id, { status: 'completed', progress: 100 });
        updateStorageUsage(item.file.size);
        return true;
      } catch (fallbackErr: unknown) {
        const errorMsg =
          fallbackErr instanceof Error ? fallbackErr.message : 'Upload failed. Quota exceeded?';
        updateItem(item.id, { status: 'error', errorMessage: errorMsg });
        return false;
      }
    }
  };

  const startUploadAll = async () => {
    setIsUploading(true);
    let successCount = 0;

    for (const item of queue) {
      if (item.status === 'pending' || item.status === 'error') {
        const ok = await processUploadItem(item);
        if (ok) {
          successCount += 1;
        }
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      onSuccess();
    }
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const handleModalClose = () => {
    if (isUploading) {
      return;
    }
    setQueue([]);
    onClose();
  };

  const pendingCount = queue.filter((i) => i.status === 'pending' || i.status === 'error').length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Upload Music Files" maxWidth="lg">
      <div className="flex flex-col gap-5">
        <Dropzone onFilesSelected={handleFilesSelected} />

        {queue.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Queue: {queue.length} file(s) ({completedCount} completed)
              </span>
              {completedCount > 0 && !isUploading ? (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Clear Done
                </button>
              ) : null}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {queue.map((item) => (
                <UploadQueueItem key={item.id} item={item} />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={handleModalClose} disabled={isUploading}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={startUploadAll}
                isLoading={isUploading}
                disabled={pendingCount === 0}
              >
                Upload ({pendingCount})
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
