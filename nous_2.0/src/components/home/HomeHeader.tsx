"use client";

import Link from "next/link";
import { NousLogo } from "@/components/dom/NousLogo";

export function HomeHeader() {
    return (
        <header className="absolute top-0 left-0 w-full flex justify-between items-center px-8 md:px-16 py-8 pointer-events-auto z-40">
            {/* Logo */}
                <NousLogo showText={true} />

            {/* Central Navigation */}
            <nav className="hidden md:flex items-center gap-12">
                <Link href="#" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    Herramientas
                </Link>
                <Link href="/precios" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    Precios
                </Link>
                <Link href="#" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    About Us
                </Link>
            </nav>

            {/* Right Auth Buttons */}
            <div className="flex items-center bg-[#252525] rounded-full px-1 py-1 shadow-md">
                <Link href="/auth" className="text-sm font-semibold text-white px-6 py-2 rounded-full hover:bg-white/10 transition-colors">
                    Sign In
                </Link>
                <Link href="/auth" className="text-sm font-semibold text-white px-6 py-2 rounded-full hover:bg-white/10 transition-colors">
                    Sign Up
                </Link>
            </div>
        </header>
    );
}
