"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Github, Activity, Search, Layout, GitCommit } from "lucide-react";
import { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import type { Engine } from "tsparticles-engine";

// 5. Smooth Performance: Lazy Loading the heavy canvas background
const Particles = dynamic(() => import("react-tsparticles").then(mod => mod.default), { 
    ssr: false
});

export function LandingPageClient() {
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine);
    }, []);

    // 6. Interactive Elements: Parallax scroll values
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });
    
    // Parallax effect for the hero text
    const yHero = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        // 1. Minimalist Design: Deep black (#020202), clean structure, massive padding
        <div ref={containerRef} className="relative min-h-screen flex flex-col bg-[#020202] overflow-hidden text-foreground selection:bg-teal-500/30">
            
            <Particles
                id="tsparticles-landing"
                init={particlesInit}
                options={{
                    background: { color: { value: "transparent" } },
                    fpsLimit: 120,
                    interactivity: { events: { onHover: { enable: true, mode: "grab" }, resize: true }, modes: { grab: { distance: 150, links: { opacity: 0.8 } } } },
                    particles: {
                        color: { value: "#14b8a6" },
                        links: { color: "#14b8a6", distance: 150, enable: true, opacity: 0.2, width: 1 },
                        move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: false, speed: 1.2, straight: false },
                        number: { density: { enable: true, area: 800 }, value: 80 },
                        opacity: { value: 0.5 }, shape: { type: "circle" }, size: { value: { min: 1, max: 2 } },
                    },
                    detectRetina: true,
                }}
                className="absolute inset-0 z-0 opacity-60 pointer-events-auto"
            />

            <div className="relative z-10 flex flex-col min-h-screen pointer-events-none">
                
                {/* Navbar */}
                <header className="px-6 lg:px-14 h-24 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.svg?v=2" alt="DevLens" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold tracking-tight text-white">DevLens</span>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start px-4 pt-20 pb-32 pointer-events-auto">
                    
                    {/* Hero Section */}
                    <motion.div 
                        style={{ y: yHero, opacity: opacityHero }}
                        className="max-w-5xl w-full mx-auto text-center space-y-10 pt-10"
                    >
                        {/* 2. Bold Titles: Sharp, highly legible, modern typography */}
                        <h1 className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tighter leading-[0.95] text-white">
                            Developer <br />
                            <span className="text-zinc-500">Analytics.</span>
                        </h1>
                        
                        <p className="mx-auto max-w-2xl text-xl md:text-2xl text-zinc-400 font-medium leading-relaxed tracking-tight">
                            Clean. Sharp. Minimal. Instantly decode your GitHub engineering output into beautiful visual dashboards.
                        </p>

                        {/* 7. Engaging CTAs: Multiple explicit options */}
                        <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                            <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-black shadow-2xl transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95">
                                Start Building <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </div>
                    </motion.div>

                    {/* 4. Organized Layout: Multi-column grid with deep minimalist padding */}
                    <div className="w-full max-w-7xl mx-auto mt-40 space-y-32">
                        
                        <div className="text-center space-y-6">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Powerful Tools. <br/> Zero Friction.</h2>
                            <p className="text-xl text-zinc-500">Everything you need, elegantly organized.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            {/* Feature 1 */}
                            <div className="space-y-6 group cursor-pointer">
                                <div className="h-48 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col p-6 relative overflow-hidden group-hover:border-zinc-700 transition-colors">
                                    <Activity className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
                                    <div className="absolute bottom-0 right-0 p-6 opacity-10">
                                        <Activity className="w-32 h-32" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Beautiful Analytics</h3>
                                    <p className="text-zinc-500 leading-relaxed">Instantly parse thousands of commits into organized, readable data charts.</p>
                                </div>
                            </div>
                            
                            {/* Feature 2 */}
                            <div className="space-y-6 group cursor-pointer">
                                <div className="h-48 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col p-6 relative overflow-hidden group-hover:border-zinc-700 transition-colors">
                                    <Search className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
                                    <div className="absolute bottom-0 right-0 p-6 opacity-10">
                                        <Search className="w-32 h-32" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Instant Global Lookup</h3>
                                    <p className="text-zinc-500 leading-relaxed">Search specific GitHub usernames and immediately generate deep-dive portfolios.</p>
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="space-y-6 group cursor-pointer">
                                <div className="h-48 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col p-6 relative overflow-hidden group-hover:border-zinc-700 transition-colors">
                                    <Layout className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
                                    <div className="absolute bottom-0 right-0 p-6 opacity-10">
                                        <Layout className="w-32 h-32" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Pristine Layouts</h3>
                                    <p className="text-zinc-500 leading-relaxed">Shareable dynamic portfolios structured around extreme minimalist design principles.</p>
                                </div>
                            </div>
                        </div>

                    </div>

                </main>
                
                <footer className="py-12 w-full flex flex-col items-center justify-center border-t border-zinc-900 bg-[#020202] mt-auto pointer-events-auto">
                    <div className="flex items-center gap-2 mb-4 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.svg?v=2" alt="DevLens" className="w-5 h-5 grayscale" />
                        <span className="font-bold tracking-tight text-white">DevLens</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-700">
                        Designed with precision. Building clarity.
                    </p>
                </footer>
            </div>
        </div>
    );
}
