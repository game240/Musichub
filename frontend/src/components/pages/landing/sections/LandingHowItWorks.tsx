import React from 'react';
import { UploadCloud, Sparkles, Headphones } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const LandingHowItWorks: React.FC = () => {
  const { ref, isVisible } = useScrollReveal();

  const steps = [
    {
      step: '01',
      title: '소장 음원 업로드',
      icon: UploadCloud,
      desc: 'PC나 기기에 보관 중인 MP3, FLAC, M4A 오디오 파일을 화면에 드래그 앤 드롭으로 끌어다 놓습니다.',
    },
    {
      step: '02',
      title: '자동 메타데이터 정리',
      icon: Sparkles,
      desc: '곡 제목, 아티스트, 앨범명, 앨범 커버를 시스템이 자동으로 분석해 정돈된 라이브러리로 구축합니다.',
    },
    {
      step: '03',
      title: '어디서나 즉시 감상',
      icon: Headphones,
      desc: '스마트폰, 태블릿, 노트북 브라우저에서 주소로 접속하면 나만의 클라우드 보관함이 그대로 열립니다.',
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      className={`py-20 md:py-28 px-4 md:px-6 border-t border-white/[0.06] bg-[#08090a] transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-18">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 block mb-2">
            Seamless Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            단 3단계로 완성되는
            <br />
            나만의 클라우드 음악 보관함.
          </h2>
          <p className="mt-3 text-sm md:text-base text-neutral-400">
            복잡한 동기화 소프트웨어나 변환 과정 없이, 파일 그대로 클라우드에 올리세요.
          </p>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-white/[0.08] bg-[#0d0e10] p-6 md:p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-mono font-bold text-neutral-400">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300">
                      <Icon className="w-5 h-5 text-[#8590ed]" />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04]">
                  <span className="text-[11px] font-mono text-neutral-400">
                    Step {item.step} of 03
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
