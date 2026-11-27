import React, { useState, useEffect } from 'react';
import { Disc3, LogIn, Sparkles, Menu, X } from 'lucide-react';
import { Button } from '../../../atoms/Button';

interface LandingHeaderProps {
  onLogin: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onLogin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: '문제점', href: '#problem' },
    { label: '해결책', href: '#solution' },
    { label: '주요 기능', href: '#features' },
    { label: '이용 방법', href: '#how-it-works' },
    { label: '자주 묻는 질문', href: '#faq' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'h-14 backdrop-blur-xl bg-[#08090a]/85 border-b border-white/[0.08] shadow-lg shadow-black/40'
          : 'h-16 bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#5e6ad2] flex items-center justify-center shadow-md shadow-[#5e6ad2]/20 group-hover:scale-105 transition-transform">
            <Disc3
              className="w-4 h-4 text-white animate-spin"
              style={{ animationDuration: '10s' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-white">Music Hub</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-400">
              v0.3
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-400">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="hover:text-white transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={onLogin}
            className="text-xs font-medium text-neutral-300 hover:text-white px-3 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
          <Button
            onClick={onLogin}
            className="text-xs font-medium !h-8 !px-3.5 bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-md shadow-[#5e6ad2]/25"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-white/90" />
            무료로 시작하기
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Button onClick={onLogin} className="text-xs !h-7 !px-2.5 bg-[#5e6ad2] text-white">
            로그인
          </Button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-neutral-400 hover:text-white"
            aria-label="메뉴 토글"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen ? (
        <div className="md:hidden border-b border-white/[0.08] bg-[#0c0d0e]/95 backdrop-blur-2xl px-6 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm text-neutral-300 hover:text-white py-1.5 border-b border-white/[0.04]"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Button onClick={onLogin} className="w-full text-xs !h-9 bg-[#5e6ad2] text-white">
              무료로 내 보관함 만들기
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
};
