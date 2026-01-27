import React from 'react';
import { X } from 'lucide-react';

export default function RulesModal({ onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, color: '#facc15' }}>How to Play Weiqi (Go)</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X />
                    </button>
                </div>

                <div style={{ lineHeight: 1.6, color: '#e2e8f0' }}>
                    <p><strong>Objective:</strong> Surround more territory than your opponent.</p>

                    <h3 style={{ marginTop: '1rem', color: 'white' }}>Basic Rules:</h3>
                    <ul style={{ paddingLeft: '1.2rem', listStyleType: 'disc' }}>
                        <li>Players take turns placing stones on the <strong>intersections</strong> of the grid.</li>
                        <li>Black plays first.</li>
                        <li>Stones captured: A stone or group of stones is captured and removed if it has no empty adjacent points ("liberties").</li>
                        <li><strong>Suicide is forbidden:</strong> You cannot place a stone where it would immediately have no liberties, unless it captures enemy stones.</li>
                        <li><strong>Ko Rule:</strong> You cannot make a move that repeats the board position from the previous turn (prevents infinite loops).</li>
                    </ul>

                    <h3 style={{ marginTop: '1rem', color: 'white' }}>Tips:</h3>
                    <ul style={{ paddingLeft: '1.2rem', listStyleType: 'disc' }}>
                        <li>Start near the corners (efficient for territory).</li>
                        <li>Don't let your stones get surrounded!</li>
                        <li>Connect your stones to form strong groups.</li>
                    </ul>
                </div>

                <button
                    onClick={onClose}
                    className="btn-primary"
                    style={{ marginTop: '1.5rem' }}
                >
                    Got it!
                </button>
            </div>
        </div>
    );
}
