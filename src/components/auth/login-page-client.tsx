"use client";

import { motion } from "framer-motion";
import { SignInButton } from "@/components/auth/sign-in-button";

export function LoginPageClient() {
    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
                <div className="absolute inset-0 bg-zinc-900" />
                
                {/* Decorative background shapes for left pane */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-zinc-900 to-zinc-900 z-0" />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                    className="absolute -bottom-[20%] -left-[20%] w-[500px] h-[500px] rounded-full bg-amber-600/10 blur-[100px] z-0 pointer-events-none"
                />

                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative z-20 flex items-center text-xl font-bold gap-3 drop-shadow-sm"
                >
                    <img src="/logo.svg?v=2" alt="DevLens" className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-600 drop-shadow-sm">
                        DevLens
                    </span>
                </motion.div>
                
                <div className="relative z-20 mt-auto">
                    <motion.blockquote 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                        className="space-y-2"
                    >
                        <p className="text-lg">
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
                    className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] bg-background/50 backdrop-blur-md p-8 rounded-2xl border border-border shadow-full dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]"
                >
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to your account with GitHub to continue
                        </p>
                    </div>
                    
                    <div className="pt-2 pb-2">
                        <SignInButton />
                    </div>
                    
                    <p className="text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
