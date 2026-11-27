import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { LandingHeader } from './sections/LandingHeader';
import { LandingHero } from './sections/LandingHero';
import { LandingProblem } from './sections/LandingProblem';
import { LandingSolution } from './sections/LandingSolution';
import { LandingFeatures } from './sections/LandingFeatures';
import { LandingHowItWorks } from './sections/LandingHowItWorks';
import { LandingFaq } from './sections/LandingFaq';
import { LandingFooter } from './sections/LandingFooter';
import { Button } from '../../atoms/Button';

interface LandingPageProps {
  onLogin: () => void;
  onNavigateLegal?: (route: 'privacy' | 'terms') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onNavigateLegal }) => {
  return (
    <div className="min-h-screen bg-[#08090a] text-neutral-100 selection:bg-[#5e6ad2]/30 selection:text-white flex flex-col">
      {/* Sticky Frosted Header */}
      <LandingHeader onLogin={onLogin} />

      {/* Main Sections */}
      <main className="flex-1">
        <LandingHero onStart={onLogin} />
        <LandingProblem />
        <LandingSolution />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingFaq />

        {/* Final CTA Banner */}
        <section className="py-20 md:py-28 px-4 md:px-6 border-t border-white/[0.08] bg-[#090a0b] relative overflow-hidden text-center">
          <div className="max-w-2xl mx-auto relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center text-[#8590ed] mb-6 shadow-lg shadow-[#5e6ad2]/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              지금, 잠자고 있는 소장 음원을
              <br />
              나만의 클라우드로 불러오세요.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-400 max-w-lg leading-relaxed">
              Google 계정으로 몇 초 만에 시작할 수 있습니다.
              <br />
              영구 무료 10GB 공간과 다운로드 트래픽 무료 혜택을 즉시 경험하세요.
            </p>
            <div className="mt-8">
              <Button
                onClick={onLogin}
                className="text-sm !h-12 !px-8 bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-2xl shadow-[#5e6ad2]/30 font-medium"
              >
                <span>무료로 내 보관함 만들기</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <LandingFooter onNavigateLegal={onNavigateLegal} />
    </div>
  );
};
