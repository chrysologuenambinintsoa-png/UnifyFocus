"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

// Pre-defined particle positions to avoid hydration mismatch
const particlePositions = [
  { x: "10%", y: "20%" },
  { x: "25%", y: "60%" },
  { x: "40%", y: "35%" },
  { x: "55%", y: "80%" },
  { x: "70%", y: "15%" },
  { x: "85%", y: "50%" },
  { x: "15%", y: "75%" },
  { x: "30%", y: "45%" },
  { x: "50%", y: "25%" },
  { x: "65%", y: "70%" },
  { x: "80%", y: "40%" },
  { x: "45%", y: "90%" },
  { x: "60%", y: "55%" },
  { x: "20%", y: "10%" },
  { x: "75%", y: "85%" },
];

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  return (
    <AnimatePresence onExitComplete={onAnimationComplete}>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5, ease: "circOut" }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden"
      >
        {/* Futuristic grid background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Animated grid lines */}
          <div className="absolute inset-0 opacity-10">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`h-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className="absolute w-full h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent"
                style={{ top: `${i * 5}%` }}
              />
            ))}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`v-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.2, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 1 + 4,
                  ease: "easeInOut"
                }}
                className="absolute h-full w-px bg-gradient-to-b from-transparent via-gray-500 to-transparent"
                style={{ left: `${i * 5}%` }}
              />
            ))}
          </div>

          {/* Rotating futuristic rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-gray-700/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-gray-600/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-gray-500/15 rounded-full"
          />

          {/* Scanning line effect */}
          <motion.div
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.5)]"
          />

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-gray-600/40 rounded-tl-lg" />
          <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-gray-600/40 rounded-tr-lg" />
          <div className="absolute bottom-24 left-8 w-16 h-16 border-l-2 border-b-2 border-gray-600/40 rounded-bl-lg" />
          <div className="absolute bottom-24 right-8 w-16 h-16 border-r-2 border-b-2 border-gray-600/40 rounded-br-lg" />

          {/* Floating particles with fixed positions */}
          {particlePositions.map((pos, i) => (
            <motion.div
              key={`particle-${i}`}
              initial={{
                left: pos.x,
                top: pos.y,
                opacity: 0,
                scale: 0.5
              }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0.5, 1, 0.5],
                y: [0, -50, 0]
              }}
              transition={{
                duration: 5 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
              className="absolute w-1 h-1 bg-gray-400 rounded-full"
              style={{
                left: pos.x,
                top: pos.y
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.2 }}
          className="relative flex flex-col items-center gap-12"
        >
          {/* App name with pulsation animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.08, 1],
                textShadow: [
                  "0 0 20px rgba(56, 189, 248, 0.3)",
                  "0 0 60px rgba(124, 58, 237, 0.6)",
                  "0 0 20px rgba(56, 189, 248, 0.3)"
                ]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="text-5xl sm:text-6xl font-black tracking-wider"
            >
              <span className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                Unify
              </span>
              <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
                Focus
              </span>
            </motion.div>
          </motion.div>

          {/* Logo with larger size and robot-like animations */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 80, delay: 0.3 }}
            className="relative"
          >
            <Logo markSize={200} iconOnly textClassName="text-5xl font-black" />
          </motion.div>
          
          {/* Futuristic progress bar */}
          <div className="w-64 h-1 bg-gray-800/50 rounded-full overflow-hidden relative">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-500 to-transparent shadow-[0_0_15px_rgba(56,189,248,0.8)]"
            />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-transparent"
              style={{ transformOrigin: "left" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}