import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';

export const OrientationLock = () => {
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        window.addEventListener('resize', checkOrientation);
        checkOrientation();

        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    return (
        <AnimatePresence>
            {isPortrait && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020202] text-teal-500 font-mono p-10 text-center"
                >
                    <motion.div
                        animate={{ rotate: 90 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="mb-8"
                    >
                        <Smartphone size={64} strokeWidth={1} />
                    </motion.div>
                    
                    <h2 className="text-xl tracking-[0.3em] mb-4 uppercase">Crucible_OS // Hardware_Alert</h2>
                    <p className="text-sm opacity-60 tracking-widest leading-loose max-w-md">
                        TACTICAL OVERVIEW REQUIRES LANDSCAPE ORIENTATION. 
                        PLEASE ROTATE YOUR DEVICE TO INITIALIZE SECTOR CONTROL.
                    </p>
                    
                    <div className="mt-12 w-48 h-[2px] bg-teal-500/20 relative overflow-hidden">
                        <motion.div 
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-teal-500 shadow-[0_0_15px_rgba(0,128,128,1)]"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
