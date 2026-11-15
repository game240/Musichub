import React from 'react';
import { Disc3 } from 'lucide-react';

export interface AppLayoutProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  bottomBar?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, headerRight, bottomBar }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <Disc3 className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Music Hub
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Personal Cloud Locker
            </p>
          </div>
        </div>

        {headerRight ? <div className="flex items-center gap-4">{headerRight}</div> : null}
      </header>

      {/* Main Content Area (padding-bottom reserved for bottom player) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 pb-32">{children}</main>

      {/* Sticky Bottom Dock (Player Slot) */}
      {bottomBar ? <aside className="fixed bottom-0 left-0 right-0 z-50">{bottomBar}</aside> : null}
    </div>
  );
};
