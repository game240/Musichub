import React from 'react';
import { LegalLayout } from './LegalLayout';
import { Shield, Lock, Database, Trash2, Mail, UserCheck } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <LegalLayout
      title="개인정보처리방침"
      subtitle="Music Hub(이하 '서비스')는 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 개인정보 보호법을 준수하며, 이용자의 개인정보를 소중하게 보호합니다."
      lastUpdated="2026년 11월 21일"
      onBack={onBack}
    >
      {/* Overview Card */}
      <div className="p-4 sm:p-5 rounded-lg border border-white/[0.08] bg-[#0f1011] text-neutral-300 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium text-sm">
          <Shield className="w-4 h-4 text-[#5e6ad2]" />
          <span>개인정보 보호 서약</span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Music Hub는 이용자의 개인 식별 정보를 광고나 마케팅 목적으로 제3자에게 판매하거나 무단
          공유하지 않으며, 클라우드 기반 개인 음악 라이브러리 및 스트리밍 서비스 제공을 위한
          최소한의 정보만을 수집합니다.
        </p>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <span>제1조 (수집하는 개인정보 항목 및 수집 방법)</span>
        </h2>
        <p className="text-neutral-300">
          서비스는 원활한 서비스 제공 및 본인 식별을 위해 다음의 개인정보를 수집하고 있습니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-lg border border-white/[0.06] bg-[#0c0d0e]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span>Google 로그인 이용 시</span>
            </div>
            <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1">
              <li>Google 고유 식별자(sub / Google User ID)</li>
              <li>Google 계정 이메일 주소</li>
              <li>기본 프로필 이름 (선택/표시용)</li>
            </ul>
          </div>
          <div className="p-3.5 rounded-lg border border-white/[0.06] bg-[#0c0d0e]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
              <Lock className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span>자체 이메일 회원가입 시</span>
            </div>
            <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1">
              <li>이메일 주소 (아이디)</li>
              <li>암호화된 비밀번호 (단방향 해시 암호화)</li>
              <li>사용자 닉네임 (선택)</li>
            </ul>
          </div>
        </div>
        <div className="p-3.5 rounded-lg border border-white/[0.06] bg-[#0c0d0e] mt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
            <Database className="w-3.5 h-3.5 text-neutral-400" />
            <span>서비스 이용 과정에서 생성/수집되는 정보</span>
          </div>
          <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1">
            <li>이용자가 업로드한 음원 파일 및 음원 메타데이터 (곡명, 아티스트, 앨범 등)</li>
            <li>개인 재생목록(Playlist), 재생 큐(Queue) 및 플레이어 음량 설정값</li>
            <li>서비스 보안 및 부정 이용 방지를 위한 접속 IP 주소, 브라우저 User-Agent 정보</li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          제2조 (개인정보의 처리 목적)
        </h2>
        <p className="text-neutral-300">
          서비스는 수집한 개인정보를 다음의 목적을 위해 활용합니다. 목적이 변경될 경우에는 사전에
          동의를 구할 것입니다.
        </p>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1.5 pl-2">
          <li>
            <strong className="text-neutral-200">회원 관리:</strong> 회원제 서비스 이용에 따른 본인
            확인, 개인 식별, 불량 회원의 부정 이용 방지, 가입 의사 확인
          </li>
          <li>
            <strong className="text-neutral-200">핵심 서비스 제공:</strong> 개인 음악 라이브러리
            스트리밍, 음원 파일 저장 및 관리, 태그 메타데이터 동기화
          </li>
          <li>
            <strong className="text-neutral-200">보안 및 시스템 안정성:</strong> 비정상적인 접근
            차단, 세션 관리 및 계정 보안 강화
          </li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          제3조 (개인정보의 보유 및 이용 기간)
        </h2>
        <p className="text-neutral-300">
          이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이
          파기합니다.
        </p>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1 pl-2">
          <li>
            <strong className="text-neutral-200">회원 정보 및 라이브러리 데이터:</strong> 회원 탈퇴
            시 또는 서비스 종료 시까지
          </li>
          <li>
            <strong className="text-neutral-200">관계 법령에 의한 보존:</strong> 전자상거래법,
            통신비밀보호법 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 해당 법령이 정한
            기간 동안 보관
          </li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          제4조 (개인정보 처리 위탁 및 국외 이전)
        </h2>
        <p className="text-neutral-300">
          서비스는 안정적인 클라우드 스토리지 인프라 운영을 위해 다음과 같이 개인정보 처리 업무를
          위탁하고 있습니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-white/[0.08] rounded-lg overflow-hidden">
            <thead className="bg-[#0f1011] text-neutral-300 border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3">수탁업체</th>
                <th className="py-2.5 px-3">위탁 업무 내용</th>
                <th className="py-2.5 px-3">보유 및 이용 기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-neutral-400">
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Cloudflare, Inc.</td>
                <td className="py-2.5 px-3">
                  업로드된 음원 파일의 클라우드 스토리지(R2) 저장 및 보안 스트리밍 전송
                </td>
                <td className="py-2.5 px-3">회원 탈퇴 또는 파일 삭제 시까지</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <span>제5조 (이용자의 권리와 행사 방법 및 회원 탈퇴)</span>
        </h2>
        <p className="text-neutral-300">
          이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 수집 및 이용에 대한 동의
          철회(회원 탈퇴)를 요청할 수 있습니다.
        </p>
        <div className="p-4 rounded-lg border border-white/[0.08] bg-[#0f1011] space-y-2 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-white font-medium">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>회원 탈퇴 및 데이터 삭제 신청</span>
          </div>
          <p className="leading-relaxed">
            서비스 내 설정 메뉴의 연동 해제를 이용하시거나, 아래의 고객지원 이메일로 가입된 이메일
            계정과 함께 탈퇴 및 데이터 파기를 요청하시면 확인 즉시 계정 및 업로드된 음원 데이터를
            영구 파기합니다.
          </p>
          <p className="text-neutral-300 font-mono">신청 및 문의 이메일: support@musichub.kr</p>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          제6조 (개인정보의 기술적·관리적 보호 조치)
        </h2>
        <ul className="list-disc list-inside text-xs sm:text-sm text-neutral-400 space-y-1.5 pl-2">
          <li>
            <strong className="text-neutral-200">비밀번호 단방향 암호화:</strong> 회원의 비밀번호는
            복호화가 불가능하도록 BCrypt 알고리즘을 적용하여 암호화 저장됩니다.
          </li>
          <li>
            <strong className="text-neutral-200">네트워크 보안 전송(HTTPS):</strong> 모든 통신
            데이터는 SSL/TLS 보안 프로토콜을 통해 안전하게 암호화되어 전송됩니다.
          </li>
          <li>
            <strong className="text-neutral-200">토큰 보안 체계:</strong> 세션 하이재킹을 방지하기
            위해 액세스 토큰은 메모리에 보관하며, 리프레시 토큰은 XSS 공격에 안전한 HttpOnly 쿠키로
            보호됩니다.
          </li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <span>제7조 (개인정보 보호책임자 및 연락처)</span>
        </h2>
        <p className="text-neutral-300">
          서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의
          불만처리 및 피해구제 등을 위하여 아래와 같이 담당자를 지정하고 있습니다.
        </p>
        <div className="p-3.5 rounded-lg border border-white/[0.08] bg-[#0c0d0e] text-xs text-neutral-300 space-y-1">
          <div className="flex items-center gap-1.5 text-white font-medium">
            <Mail className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>Music Hub 개인정보 관리팀</span>
          </div>
          <p className="text-neutral-400">문의 이메일: cjh648666@gmail.com</p>
        </div>
      </section>
    </LegalLayout>
  );
};
