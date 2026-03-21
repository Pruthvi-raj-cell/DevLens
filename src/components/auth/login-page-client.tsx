"use client";

import { motion } from "framer-motion";
import { SignInButton } from "@/components/auth/sign-in-button";
import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Engine } from "tsparticles-engine";

export function LoginPageClient() {
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine);
    }, []);

    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
                <div className="absolute inset-0 bg-[#050505] z-0" />
                
                {/* Plexus Background */}
                <Particles
                    id="tsparticles"
                    init={particlesInit}
                    options={{
                        background: { color: { value: "transparent" } },
                        fpsLimit: 120,
                        interactivity: {
                            events: {
                                onHover: { enable: true, mode: "grab" },
                                resize: true,
                            },
                            modes: {
                                grab: { distance: 150, links: { opacity: 0.8 } }
                            },
                        },
                        particles: {
                            color: { value: "#14b8a6" },
                            links: {
                                color: "#14b8a6",
                                distance: 150,
                                enable: true,
                                opacity: 0.2,
                                width: 1,
                            },
                            move: {
                                direction: "none",
                                enable: true,
                                outModes: { default: "bounce" },
                                random: false,
                                speed: 1.2,
                                straight: false,
                            },
                            number: {
                                density: { enable: true, area: 800 },
                                value: 80,
                            },
                            opacity: { value: 0.5 },
                            shape: { type: "circle" },
                            size: { value: { min: 1, max: 2 } },
                        },
                        detectRetina: true,
                    }}
                    className="absolute inset-0 z-0 opacity-80"
                />

                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative z-20 flex items-center text-xl font-bold gap-3 drop-shadow-sm"
                >
                    <img src="/logo.svg?v=2" alt="DevLens" className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-300 to-teal-600 drop-shadow-sm">
                        DevLens
                    </span>
                </motion.div>
                
                <div className="relative z-20 mt-auto">
                    <motion.blockquote 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                        className="space-y-4"
                    >
                        <p className="text-xl leading-relaxed text-teal-50 drop-shadow-sm font-light">
                            &ldquo;Unveil the story behind your code. Developer intelligence that visualizes your GitHub journey with unprecedented clarity.&rdquo;
                        </p>
                    </motion.blockquote>
                </div>
            </div>
            
            <div className="lg:p-8 relative z-10 w-full flex items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                    className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] bg-card/60 backdrop-blur-xl p-8 rounded-2xl border border-primary/20 shadow-neon-purple dark:shadow-[0_0_40px_rgba(20,184,166,0.15)] transition-all hover:border-primary/40"
                >
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Welcome back
                        </h1>
                        <p className="text-sm text-muted-foreground/80">
                            Sign in to your account with GitHub to continue
                        </p>
                    </div>
                    
                    <div className="pt-2 pb-2">
                        <SignInButton />
                    </div>
                    
                    <p className="text-center text-sm text-muted-foreground/60">
                        By clicking continue, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
