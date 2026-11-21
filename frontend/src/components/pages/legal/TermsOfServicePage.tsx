import React from 'react';
import { LegalLayout } from './LegalLayout';
import { FileText, AlertTriangle, Music, Scale } from 'lucide-react';

interface TermsOfServicePageProps {
  onBack: () => void;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
  return (
    <LegalLayout
      title="서비스 이용약관"
      subtitle="Music Hub(이하 '서비스')를 이용해 주셔서 감사합니다. 본 약관은 서비스 이용에 관한 권리, 의무 및 책임사항을 규정합니다."
      lastUpdated="2026년 11월 21일"
      onBack={onBack}
    >
      {/* Overview Card */}
      <div className="p-4 sm:p-5 rounded-lg border border-white/[0.08] bg-[#0f1011] text-neutral-300 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium text-sm">
          <FileText className="w-4 h-4 text-[#5e6ad2]" />
          <span>핵심 이용 수칙 요약</span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Music Hub는 개인이 정당하게 소장하고 있는 음원을 클라우드에 보관하고 개인적으로 감상할 수 있도록
          지원하는 프라이빗 클라우드 오디오 라이브러리 서비스입니다. 저작권 침해 음원의 불법적인 업로드나
          공유는 엄격히 금지됩니다.
        </p>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">제1조 (목적)</h2>
        <p className="text-neutral-300">
          본 약관은 회원이 Music Hub가 제공하는 음악 스트리밍 및 클라우드 음원 보관 서비스(이하
          '서비스')를 이용함에 있어 서비스와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">제2조 (용어의 정의)</h2>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1.5 pl-2">
          <li>
            <strong className="text-neutral-200">'서비스':</strong> 단말기(PC, 모바일 등)에 상관없이 회원이
            이용할 수 있는 Music Hub 웹 서비스 및 제반 오디오 플레이어 기능.
          </li>
          <li>
            <strong className="text-neutral-200">'회원':</strong> 본 약관에 동의하고 계정을 등록하여 서비스를
            이용하는 자.
          </li>
          <li>
            <strong className="text-neutral-200">'업로드 음원':</strong> 회원이 개인 보관 및 스트리밍 감상을
            목적으로 서비스에 직접 업로드한 오디오 파일 및 메타데이터.
          </li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <Music className="w-4 h-4 text-[#5e6ad2]" />
          <span>제3조 (서비스의 내용 및 저장 공간)</span>
        </h2>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1.5 pl-2">
          <li>
            서비스는 각 회원에게 개인 클라우드 오디오 스토리지 공간(계정당 기본 저장소)을 제공합니다.
          </li>
          <li>
            음원 파일은 회원 본인의 계정에 안전하게 보관되며, 태그 수정, 재생목록 편성, 개인 큐(Queue)
            스트리밍 기능을 이용할 수 있습니다.
          </li>
          <li>
            제공되는 저장 공간과 서비스 정책은 시스템 안정성 및 운영 정책에 따라 변경될 수 있으며,
            사전에 공지합니다.
          </li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>제4조 (회원의 의무 및 저작권 준수)</span>
        </h2>
        <p className="text-neutral-300">
          회원은 관계 법령, 본 약관의 규정, 이용 안내 및 공지사항을 준수하여야 하며, 다음 각 호의 행위를
          하여서는 안 됩니다.
        </p>
        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] space-y-2 text-xs text-neutral-300">
          <p className="font-medium text-amber-300">저작권 및 관련 법령 준수 의무</p>
          <ul className="list-disc list-inside space-y-1 text-neutral-400">
            <li>
              회원은 자신이 적법한 권리(저작권, 저작인접권 등)를 보유하고 있거나, 사적 이용을 위해 합법적으로
              취득한 음원만을 업로드해야 합니다.
            </li>
            <li>
              타인의 저작권을 침해하는 음원을 업로드하거나, 이를 영리 목적으로 이용 또는 제3자에게 불법
              배포·공유하는 행위는 엄격히 금지됩니다.
            </li>
            <li>
              저작권 침해와 관련하여 제3자로부터 이의 제기, 소송 등의 분쟁이 발생할 경우, 이에 따른 민·형사상
              책임은 전적으로 해당 음원을 업로드한 회원 본인에게 있습니다.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          제5조 (서비스 이용의 제한 및 계정 해지)
        </h2>
        <p className="text-neutral-300">
          서비스는 회원이 다음 각 호에 해당하는 경우, 사전 통지 없이 서비스 이용을 제한하거나 계정을
          중지할 수 있습니다.
        </p>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1 pl-2">
          <li>타인의 개인정보 또는 계정을 도용한 경우</li>
          <li>서비스의 정상적인 운영을 방해하거나 고의로 과도한 트래픽/부하를 발생시키는 경우</li>
          <li>저작권 등 타인의 권리를 침해하는 행위를 지속하는 경우</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-neutral-400" />
          <span>제6조 (면책 조항)</span>
        </h2>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1.5 pl-2">
          <li>
            서비스는 천재지변, 정전, 디도스(DDoS) 공격, 클라우드 호스팅 인프라 장애 등 불가항력으로 인하여
            서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
          </li>
          <li>
            서비스는 회원이 서비스에 저장하거나 게재한 정보, 자료, 음원의 신뢰도나 적법성에 관하여 어떠한
            보증도 하지 않으며, 회원이 이를 이용함으로써 입게 된 손해에 대해 고의 또는 중과실이 없는 한
            책임을 부담하지 않습니다.
          </li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">제7조 (준거법 및 관할 법원)</h2>
        <p className="text-neutral-300">
          본 약관은 대한민국 법률에 따라 규율되고 해석되며, 서비스와 회원 간에 발생한 분쟁에 대해서는
          대한민국 법원을 관할 법원으로 합니다.
        </p>
      </section>
    </LegalLayout>
  );
};
