import React from 'react';
import { ArrowLeft, Disc3 } from 'lucide-react';
import { Button } from '../../atoms/Button';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  onBack,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#08090a] text-neutral-200 antialiased selection:bg-[#5e6ad2]/30 selection:text-white">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#08090a]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1.5 text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>돌아가기</span>
            </Button>
            <div className="h-4 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#5e6ad2]/20 flex items-center justify-center border border-[#5e6ad2]/30">
                <Disc3 className="w-3.5 h-3.5 text-[#5e6ad2]" />
              </div>
              <span className="font-semibold text-sm text-white tracking-tight">Music Hub</span>
            </div>
          </div>

          <span className="text-xs text-neutral-500 font-mono">시행일: {lastUpdated}</span>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Document Header */}
        <div className="mb-10 pb-8 border-b border-white/[0.08]">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">{subtitle}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-neutral max-w-none text-sm leading-relaxed space-y-8">
          {children}
        </div>

        {/* Bottom Back Button & Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© 2026 Music Hub. All rights reserved.</p>
          <Button variant="secondary" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>로그인 화면으로 이동</span>
          </Button>
        </div>
      </main>
    </div>
  );
};
