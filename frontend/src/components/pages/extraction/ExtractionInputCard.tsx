import React, { useState } from 'react';
import { Clipboard, AlertCircle, Download } from 'lucide-react';
import { YoutubeIcon } from '../../atoms/YoutubeIcon';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

export interface ExtractionInputCardProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
}

const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]+.*/i;

export const ExtractionInputCard: React.FC<ExtractionInputCardProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setErrorMessage(null);
      }
    } catch {
      // Clipboard read may fail without user gesture or permissions
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setErrorMessage('YouTube 영상 URL을 입력해주세요.');
      return;
    }

    if (!YOUTUBE_REGEX.test(trimmed)) {
      setErrorMessage('올바른 YouTube 영상 URL 형식이 아닙니다. (예: https://www.youtube.com/watch?v=...)');
      return;
    }

    setErrorMessage(null);
    try {
      await onSubmit(trimmed);
      setUrl('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '추출 요청 중 오류가 발생했습니다.';
      setErrorMessage(message);
    }
  };

  const isInvalid = url.length > 0 && !YOUTUBE_REGEX.test(url.trim());

  return (
    <div className="bg-[#0f1011] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
          <YoutubeIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-neutral-100 flex items-center gap-2">
            YouTube 음원 추출
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            YouTube 또는 YouTube Music 영상 링크를 입력하여 보관함에 고음질 MP3로 추가하세요.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative flex-1 flex items-center min-w-0">
            <div className="absolute left-3.5 text-neutral-400 pointer-events-none">
              <YoutubeIcon className="w-4 h-4 text-neutral-500" />
            </div>

            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
              disabled={isLoading}
              className={`w-full bg-white/[0.03] border rounded-xl pl-10 pr-20 sm:pr-24 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 transition-colors outline-none focus:ring-1 ${
                isInvalid
                  ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-white/[0.1] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]/20'
              }`}
            />

            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                title="클립보드에서 붙여넣기"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Clipboard className="w-3 h-3" />
                <span>붙여넣기</span>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !url.trim() || isInvalid}
            className="h-[38px] rounded-xl px-4 sm:px-5 text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Spinner size="sm" />
                <span>추출 요청 중...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Download className="w-4 h-4" />
                <span>음원 추출</span>
              </span>
            )}
          </Button>
        </div>

        {errorMessage ? (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </form>
    </div>
  );
};
