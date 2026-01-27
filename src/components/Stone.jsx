import React from 'react';
import { motion } from 'framer-motion';
import { BLACK, WHITE } from '../game/go-logic';

export default function Stone({ color, lastMove }) {
    const isBlack = color === BLACK;

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="stone"
            style={{
                position: 'absolute',
                inset: '10%', // Make stone slightly smaller than cell
                borderRadius: '50%',
                background: isBlack
                    ? 'radial-gradient(circle at 30% 30%, #444, #000)'
                    : 'radial-gradient(circle at 30% 30%, #fff, #ddd)',
                boxShadow: '2px 2px 4px rgba(0,0,0,0.4)',
                zIndex: 10
            }}
        >
            {lastMove && (
                <div className="stone-marker" />
            )}
        </motion.div>
    );
}
