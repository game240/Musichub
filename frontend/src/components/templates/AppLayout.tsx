import React from 'react';
import { Disc3 } from 'lucide-react';
import { ToastContainer } from '../organisms/ToastContainer';

export interface AppLayoutProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  bottomBar?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, headerRight, bottomBar }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#08090a] text-neutral-100 antialiased">
      <ToastContainer />
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-14 bg-[#08090a]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-1.5 bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 rounded-lg text-[#5e6ad2] shrink-0">
            <Disc3 className="w-5 h-5 animate-spin-slow" />
          </div>
          <h1 className="text-sm font-semibold text-neutral-100 truncate">Music Hub</h1>
        </div>

        {headerRight ? (
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">{headerRight}</div>
        ) : null}
      </header>

      {/* Main Content Area (padding-bottom reserved for bottom player) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-32">
        {children}
      </main>

      {/* Sticky Bottom Dock (Player Slot) */}
      {bottomBar ? <aside className="fixed bottom-0 left-0 right-0 z-50">{bottomBar}</aside> : null}
    </div>
  );
};
