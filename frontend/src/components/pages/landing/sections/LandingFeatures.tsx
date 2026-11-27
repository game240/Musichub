import React from 'react';
import { Zap, Tag, Smartphone } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const LandingFeatures: React.FC = () => {
  const { ref, isVisible } = useScrollReveal();

  const features = [
    {
      icon: Zap,
      tag: '초고속 스트리밍',
      title: '0초 대기 시간의 네이티브 Range Request',
      description:
        '곡 전체가 다운로드되길 기다릴 필요가 없습니다. Cloudflare R2의 Presigned URL 기술로 100MB가 넘는 고음질 FLAC 음원도 즉시 재생되고, 원하는 재생 위치로 딜레이 없이 즉시 이동(Seek)합니다.',
      metric: '0ms 초기 버퍼링',
    },
    {
      icon: Tag,
      tag: '정교한 메타데이터',
      title: '자동 ID3 태그 분석과 앨범아트 추출',
      description:
        '파일을 끌어다 놓는 순간 메타데이터와 앨범 커버를 자동으로 추출합니다. 브라우저에서 태그를 직접 수정하거나 여러 곡을 한 번에 일괄 편집할 수 있으며, 원본 오디오 파일에도 안전하게 반영됩니다.',
      metric: 'ID3v2.3 / FLAC 완전 호환',
    },
    {
      icon: Smartphone,
      tag: '크로스 플랫폼',
      title: '스마트폰 화면이 꺼져도 멈추지 않는 감상',
      description:
        '데스크톱, 태블릿, 모바일 웹 브라우저를 완벽 지원합니다. 웹 표준 MediaSession API 연동으로 모바일 잠금화면, 알림창, 블루투스 이어폰 제스처로 곡을 넘기고 볼륨을 조절할 수 있습니다.',
      metric: 'MediaSession API 기본 내장',
    },
  ];

  return (
    <section
      id="features"
      ref={ref}
      className={`py-20 md:py-28 px-4 md:px-6 border-t border-white/[0.06] bg-[#090a0b] transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-18">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 block mb-2">
            Core Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            오직 음악 감상만을 위해
            <br />
            군더더기 없이 정제된 핵심 기능.
          </h2>
          <p className="mt-3 text-sm md:text-base text-neutral-400">
            필요 없는 복잡함은 덜어내고, 가장 쾌적한 스트리밍 경험에 집중했습니다.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] hover:border-white/[0.18] bg-[#0e0f11] p-6 md:p-7 flex flex-col justify-between transition-all duration-300 hover:bg-[#121316] group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 flex items-center justify-center text-[#8590ed] group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-[#8590ed] bg-[#5e6ad2]/10 px-2 py-0.5 rounded-full border border-[#5e6ad2]/20">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-base md:text-lg font-semibold text-white tracking-tight mb-2.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-400">0{idx + 1}</span>
                  <span className="font-medium text-neutral-300 text-[11px] font-mono">
                    {item.metric}
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
