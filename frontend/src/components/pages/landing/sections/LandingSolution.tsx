import React from 'react';
import { Check, X, Shield, Sparkles } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const LandingSolution: React.FC = () => {
  const { ref, isVisible } = useScrollReveal();

  const comparisonRows = [
    {
      category: '커버 & 미발매 음원',
      local: '케이블 연결, 블루투스 등 파일 이동 시 번거로운 절차 필요',
      streaming: '정식 유통 음원만 제공. 라이브, 미발매 데모, 커버곡, 앨범 리핑 트랙 재생 불가',
      musichub: 'MP3, FLAC, M4A, 데모, 커버곡 등 용량/출처 무관 자유 보관/재생 가능',
    },
    {
      category: '메타데이터 & 앨범아트',
      local: '앨범아트가 누락되거나 제목, 가수, 앨범 등을 각 곡마다 직접 수정해야 함',
      streaming: '플랫폼이 지정한 정보로만 표시되어 오타나 제목, 가수 등의 메타데이터 수정 불가',
      musichub: '브라우저에서 내에서 직접 수정 및 여러 곡 일괄 수정/다운로드 가능',
    },
    {
      category: '용량 & 비용',
      local: '기기 용량 제한 및 클라우드 저장소 비용 필요',
      streaming:
        '매월 1~2만 원 정기 구독 필수. 미 구독 시 오디오 광고나 백그라운드 재생 차단 등 기능 제한',
      musichub: '광고 없이, 기본 10GB 무료. 모바일 백그라운드 & 잠금화면 제어 기본 제공',
    },
  ];

  return (
    <section
      id="solution"
      ref={ref}
      className={`py-20 md:py-28 px-4 md:px-6 border-t border-white/[0.06] bg-[#08090a] transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-18">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 text-[#8590ed] text-xs font-medium mb-3">
            <Sparkles className="w-3 h-3" />
            <span>The Music Hub Advantage</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            어떤 음원이든 제약 없이,
            <br />
            나만의 음악으로 온전히 채우는 공간.
          </h2>
          <p className="mt-3 text-sm md:text-base text-neutral-400">
            번거로운 파일 복사나 기기 용량 걱정 없이, 매달 나가는 구독료 부담 없이 온전히 내 음악을
            즐기세요.
          </p>
        </div>

        {/* Comparison Table / Matrix */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0e10] overflow-hidden shadow-xl">
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/[0.08] bg-white/[0.02] text-xs font-medium text-neutral-400">
            <div className="md:col-span-3 p-4 md:px-5">비교 항목</div>
            <div className="hidden md:block md:col-span-3 p-4 md:px-5 text-neutral-400">
              내 기기 직접 보관 (휴대폰, PC)
            </div>
            <div className="hidden md:block md:col-span-3 p-4 md:px-5 text-neutral-400">
              일반 스트리밍
            </div>
            <div className="hidden md:block md:col-span-3 p-4 md:px-5 text-[#8590ed] font-semibold bg-[#5e6ad2]/10 border-l border-white/[0.08]">
              Music Hub
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/[0.04]">
            {comparisonRows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 text-xs md:text-sm hover:bg-white/[0.02] transition-colors"
              >
                {/* Category */}
                <div className="md:col-span-3 p-4 md:px-5 font-medium text-white flex items-center">
                  <span>{row.category}</span>
                </div>

                {/* Local Storage */}
                <div className="md:col-span-3 px-4 pb-2 md:py-4 md:px-5 text-neutral-400 flex items-start gap-2">
                  <X className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="md:hidden text-[10px] text-neutral-400 font-mono mb-0.5">
                      내 기기 직접 보관 (휴대폰, PC)
                    </span>
                    <span className="text-neutral-400 text-xs leading-relaxed">{row.local}</span>
                  </div>
                </div>

                {/* Commercial Streaming */}
                <div className="md:col-span-3 px-4 pb-2 md:py-4 md:px-5 text-neutral-400 flex items-start gap-2">
                  <X className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="md:hidden text-[10px] text-neutral-400 font-mono mb-0.5">
                      일반 스트리밍
                    </span>
                    <span className="text-neutral-400 text-xs leading-relaxed">
                      {row.streaming}
                    </span>
                  </div>
                </div>

                {/* Music Hub */}
                <div className="md:col-span-3 px-4 pb-4 md:py-4 md:px-5 text-neutral-200 bg-[#5e6ad2]/[0.03] md:border-l border-white/[0.06] flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#5e6ad2] flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="md:hidden text-[10px] text-[#8590ed] font-mono mb-0.5">
                      Music Hub
                    </span>
                    <span className="text-white text-xs md:text-sm font-medium leading-relaxed">
                      {row.musichub}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Security / Trust Footer note */}
          <div className="p-4 md:px-6 border-t border-white/[0.08] bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5e6ad2]" />
              <span>글로벌 클라우드 인프라 기반의 독립 저장소로 안전하게 암호화 보관됩니다.</span>
            </div>
            <span className="font-mono text-[11px] text-neutral-400">Unlimited Free Streaming</span>
          </div>
        </div>
      </div>
    </section>
  );
};
