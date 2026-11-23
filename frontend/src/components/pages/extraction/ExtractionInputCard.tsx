import React, { useState } from 'react';
import { Clipboard, Info, AlertCircle } from 'lucide-react';
import { YoutubeIcon } from '../../atoms/YoutubeIcon';
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
    <div className="bg-[#0f1011] border border-white/[0.08] rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
          <YoutubeIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2 tracking-tight">
            새 YouTube 음원 추출
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
              MP3
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            YouTube 또는 YouTube Music 영상 링크를 입력하여 보관함에 고음질 MP3로 추가하세요.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
            <YoutubeIcon className="w-4 h-4" />
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
            className={`w-full bg-white/[0.03] border rounded-lg pl-10 pr-24 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 transition-colors outline-none ${
              isInvalid
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/[0.08] focus:border-[#5e6ad2]'
            }`}
          />

          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading}
              title="클립보드에서 붙여넣기"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-400 hover:text-neutral-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Clipboard className="w-3 h-3" />
              <span>붙여넣기</span>
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>재생시간 최대 30분 이내 단일 영상 지원 &bull; 썸네일 및 태그 자동 파싱</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim() || isInvalid}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-lg text-white bg-[#5e6ad2] hover:bg-[#4f5bbf] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>추출 요청 중...</span>
              </>
            ) : (
              <>
                <YoutubeIcon className="w-3.5 h-3.5" />
                <span>음원 추출</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
