import React from 'react';
import { Disc, HardDrive, FolderSync, AlertTriangle } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const LandingProblem: React.FC = () => {
  const { ref, isVisible } = useScrollReveal();

  const problems = [
    {
      icon: Disc,
      tag: '커버 & 미발매 음원',
      title: '내가 듣고 싶은 음원은 스트리밍에 없습니다',
      desc: '유튜브 커버 영상, 사운드클라우드 데모, 인디 라이브 음원은 정식 유통 음원이 아니라는 이유로 상용 스트리밍 앱에서 들을 수 없습니다.',
    },
    {
      icon: HardDrive,
      tag: '기기 이동과 용량 압박',
      title: '스마트폰에 옮기기는 여전히 번거롭습니다',
      desc: 'PC에서 구한 고음질 음원을 스마트폰에 넣으려면 케이블을 찾거나 메신저 나에게 보내기를 반복해야 하고, 기기 저장 용량은 늘 부족합니다.',
    },
    {
      icon: FolderSync,
      tag: '메타데이터 & 앨범아트 누락',
      title: '기기에 음악을 옮기면 정보와 커버가 뒤섞입니다',
      desc: '휴대폰이나 PC에 직접 파일을 넣으면 앨범 커버가 사라지거나 가수/곡명이 제각각 깨져, 곡마다 수작업으로 편집해야 하는 피로감이 큽니다.',
    },
  ];

  return (
    <section
      id="problem"
      ref={ref}
      className={`py-20 md:py-28 px-4 md:px-6 border-t border-white/[0.06] bg-[#090a0b] transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-18">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs font-medium mb-3">
            <AlertTriangle className="w-3 h-3" />
            <span>The Real Problem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            우리가 아끼던 음악들은
            <br />왜 항상 여러 곳에 흩어져 있을까요?
          </h2>
          <p className="mt-3 text-sm md:text-base text-neutral-400">
            상용 스트리밍 서비스가 우리가 듣고 싶은 세상의 모든 음악을 담아주지는 못합니다.
          </p>
        </div>

        {/* 3 Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-white/[0.08] hover:border-white/[0.16] bg-[#0e0f11] p-6 flex flex-col justify-between transition-all duration-300 hover:bg-[#121316]"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300 group-hover:text-white group-hover:border-white/20 transition-colors mb-4">
                    <Icon className="w-5 h-5 text-neutral-400 group-hover:text-[#8590ed] transition-colors" />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                    {item.tag}
                  </span>
                  <h3 className="text-base font-semibold text-white tracking-tight mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Pain Point 0{idx + 1}</span>
                  <span className="text-amber-400/80">해결 필요</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
