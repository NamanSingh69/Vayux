'use client';

import React, { useState } from 'react';
import { useJarvisVoice } from '@/hooks/useJarvisVoice';

export default function JarvisVoiceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { isRecording, isSpeaking, transcript, startListening, stopListening } = useJarvisVoice();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {isOpen && (
        <div className="w-80 rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">VayuX JARVIS Voice</span>
            </div>
            <span className="text-[10px] text-slate-400">{isSpeaking ? 'Speaking...' : isRecording ? 'Listening...' : 'Standby'}</span>
          </div>

          <div className="my-3 min-h-[60px] max-h-40 overflow-y-auto text-xs leading-relaxed text-slate-200">
            {transcript || 'Say "Jarvis, why is AQI rising in Anand Vihar?" or ask for policy simulation...'}
          </div>

          <button
            type="button"
            onClick={isRecording ? stopListening : startListening}
            className={`w-full rounded-xl py-2 text-xs font-medium uppercase tracking-wider transition-all ${
              isRecording
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            {isRecording ? 'Stop Listening' : 'Speak to Jarvis'}
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="Toggle Jarvis Voice"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !isRecording) startListening();
        }}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${
          isSpeaking
            ? 'scale-110 shadow-[0_0_35px_rgba(6,182,212,0.8)]'
            : isRecording
            ? 'scale-105 shadow-[0_0_25px_rgba(244,63,94,0.7)]'
            : 'shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 opacity-80 blur-sm" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 border border-cyan-400/50">
          <svg className={`h-6 w-6 text-cyan-400 transition-transform duration-300 ${isSpeaking ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
          </svg>
        </div>
      </button>
    </div>
  );
}
