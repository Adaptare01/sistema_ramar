import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AppScreen } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    currentScreen: AppScreen;
    onNavigate: (screen: AppScreen) => void;
}

export const Layout = ({ children, currentScreen, onNavigate }: LayoutProps) => {
    return (
        <div className="flex flex-col h-screen bg-[var(--bg-app)] text-[var(--text-main)] overflow-hidden">
            {/* Header only shows on Dashboard for now, or maybe always? sticking to design */}
            <Header />

            <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-20">
                {children}
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-40">
                <BottomNav currentScreen={currentScreen} onNavigate={onNavigate} />
            </div>
        </div>
    );
};
