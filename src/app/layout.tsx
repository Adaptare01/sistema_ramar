import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Velo Adaptare — Sistema Ramar',
    description: 'Sistema de conferência de cargas',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body className="min-h-screen">
                {children}
            </body>
        </html>
    );
}
