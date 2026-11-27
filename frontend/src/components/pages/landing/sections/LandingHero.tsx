import React from 'react';
import { ArrowRight, ChevronDown, Cloud, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '../../../atoms/Button';
import { PlayerMockup } from '../components/PlayerMockup';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface LandingHeroProps {
  onStart: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStart }) => {
  const { ref, isVisible } = useScrollReveal();

  const handleScrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const elem = document.querySelector('#problem');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={ref}
      className={`relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 md:px-6 overflow-hidden transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Top Minimal Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-neutral-300 text-xs font-medium mb-6 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2]" />
          <span>개인 소장 음원을 위한 나만의 클라우드 보관함</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.15]">
          스트리밍에 없는 음악도,
          <br />
          <span className="text-neutral-300">어디서나 나만의 플레이리스트로.</span>
        </h1>

        {/* Subhead */}
        <p className="mt-5 text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl leading-relaxed font-normal">
          스트리밍 앱에 없는 커버곡, 라이브, 소장 음원까지.
          <br className="hidden sm:inline" />
          초고속 개인 클라우드 보관함에서 원본 음질 그대로, 어디서나 끊김 없이 스트리밍하세요.
        </p>

        {/* CTA Button Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={onStart}
            className="w-full sm:w-auto text-sm !h-11 !px-6 bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-xl shadow-[#5e6ad2]/20 font-medium"
          >
            <span>무료로 내 보관함 만들기</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          <button
            type="button"
            onClick={handleScrollToFeatures}
            className="w-full sm:w-auto text-xs sm:text-sm font-medium text-neutral-400 hover:text-white px-5 py-2.5 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-center gap-1.5"
          >
            <span>문제 해결 방식 둘러보기</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Micro Value Highlights */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>영구 무료 10GB 클라우드 스토리지</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>딜레이 없는 초고속 스트리밍</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>개인 전용 격리 암호화</span>
          </div>
        </div>

        {/* Player UI Mockup */}
        <div className="mt-12 md:mt-16 w-full">
          <PlayerMockup />
        </div>
      </div>
    </section>
  );
};
