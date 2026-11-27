import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const LandingFaq: React.FC = () => {
  const { ref, isVisible } = useScrollReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Music Hub는 정말 무료로 사용할 수 있나요?',
      a: '네, 100% 무료로 사용할 수 있습니다. 글로벌 클라우드의 무료 인프라 정책을 활용하여 모든 사용자에게 기본 10GB의 개인 보관함 용량을 제공하며, 다운로드 트래픽(Egress) 요금이 전혀 발생하지 않아 영구적으로 무료 운영이 가능합니다.',
    },
    {
      q: '어떤 오디오 파일 포맷을 지원하나요?',
      a: 'MP3, FLAC, M4A, WAV, OGG 등 현대 웹 표준 및 브라우저에서 지원하는 대부분의 주요 오디오 포맷을 지원합니다. 특히 고음질 FLAC 음원도 브라우저 네이티브 기술로 끊김 없이 스트리밍 재생할 수 있습니다.',
    },
    {
      q: '모바일 스마트폰이나 태블릿에서도 사용할 수 있나요?',
      a: '물론입니다. 별도의 앱을 스토어에서 내려받을 필요 없이, 모바일 크롬이나 사파리 브라우저로 접속하면 반응형 웹 플레이어가 실행됩니다. 화면이 잠겨 있거나 다른 앱을 사용할 때도 백그라운드 재생 및 잠금화면 컨트롤(MediaSession API)이 지원됩니다.',
    },
    {
      q: '내가 업로드한 음악 파일은 다른 사람에게 공개되나요?',
      a: '절대 공개되지 않습니다. Music Hub는 순수한 개인 클라우드 보관함(Personal Locker)입니다. 업로드된 파일은 사용자 고유 ID 기반으로 격리된 스토리지에 암호화되어 저장되며, 본인 계정 외에는 다른 사용자나 외부에 노출되지 않습니다.',
    },
    {
      q: '오디오 파일의 태그나 앨범 커버를 직접 수정할 수 있나요?',
      a: '네. 라이브러리 목록에서 곡 제목, 아티스트, 앨범명을 언제든지 인라인으로 편집할 수 있으며, 수정된 메타데이터는 클라우드에 보관된 실제 원본 오디오 파일에도 안전하게 비동기 동기화됩니다.',
    },
  ];

  return (
    <section
      id="faq"
      ref={ref}
      className={`py-20 md:py-28 px-4 md:px-6 border-t border-white/[0.06] bg-[#090a0b] transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-neutral-300 text-xs font-medium mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            자주 묻는 질문
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Music Hub 이용 및 보안에 대해 궁금한 점을 확인하세요.
          </p>
        </div>

        {/* Accordion List */}
        <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-2xl bg-[#0d0e10] overflow-hidden">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="transition-colors hover:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full py-4.5 px-5 md:px-6 flex items-center justify-between text-left gap-4"
                >
                  <span className="text-sm md:text-base font-medium text-white tracking-tight">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {isOpen ? (
                  <div className="px-5 md:px-6 pb-5 text-xs md:text-sm text-neutral-400 leading-relaxed font-normal animate-fadeIn">
                    {faq.a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
