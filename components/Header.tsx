import React from 'react';
import { Truck, Bell } from 'lucide-react';

export const Header = () => {
    return (
        <header className="h-16 px-6 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-app)]/90 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Truck className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-sm font-bold tracking-wider text-black">LOGICONTROL</h1>
                    <p className="text-[10px] text-black uppercase tracking-widest">Centro de Distribuição A4</p>
                </div>
            </div>

            <button className="p-2 relative rounded-full hover:bg-[var(--bg-card-hover)] transition">
                <Bell className="w-5 h-5 text-black" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-app)]"></span>
            </button>
        </header>
    );
};
