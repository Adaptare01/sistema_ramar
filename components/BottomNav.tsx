import React from 'react';
import { LayoutGrid, Users, FileBarChart, Settings } from 'lucide-react';
import { AppScreen } from '../types';

interface BottomNavProps {
    currentScreen: AppScreen;
    onNavigate: (screen: AppScreen) => void;
}

export const BottomNav = ({ currentScreen, onNavigate }: BottomNavProps) => {
    const navItems = [
        { id: 'dashboard', label: 'Início', icon: LayoutGrid },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'loads', label: 'Cargas', icon: FileBarChart },
        { id: 'settings', label: 'Config', icon: Settings },
    ];

    return (
        <nav className="h-[70px] bg-[var(--bg-app)] border-t border-[var(--border-color)] flex justify-around items-center px-4 pb-2 z-40">
            {navItems.map((item) => {
                const isActive =
                    (item.id === 'clients' && (currentScreen === 'clients' || currentScreen === 'upload' || currentScreen === 'conference')) ||
                    currentScreen === item.id;

                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id as AppScreen)}
                        className="flex flex-col items-center justify-center w-16 relative"
                    >
                        {isActive && (
                            <div className="absolute -top-10 w-12 h-12 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-[20px] opacity-40"></div>
                        )}

                        <div className={`transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 p-3 -mt-6 rounded-full border-4 border-[var(--bg-app)]' : 'text-black hover:text-gray-700'}`}>
                            <Icon size={isActive ? 24 : 20} />
                        </div>

                        <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-white' : 'text-black'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};
