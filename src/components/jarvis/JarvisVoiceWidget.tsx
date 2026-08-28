'use client';

import React, { useState } from 'react';
import { useJarvisVoice } from '@/hooks/useJarvisVoice';

export default function JarvisVoiceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, isRecording, isSpeaking, transcript, activeVoiceModel, activeReasoningModel, startListening, stopListening } = useJarvisVoice();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
      {isOpen && (
        <div className="w-96 rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 block">VayuVani (वायुवाणी) AI</span>
                <span className="text-[9px] text-slate-400 font-mono">Live: {activeVoiceModel.replace('gemini-', '')}</span>
              </div>
            </div>

            {/* Grouped Status Pill and Close Button */}
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/50">
                {isSpeaking ? '🔊 Speaking...' : isRecording ? '🎙️ Listening (Live)...' : 'Ready'}
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (isRecording) stopListening(); // Safely kill the mic when closing
                }}
                className="text-slate-400 hover:text-rose-400 transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Model Selection GPT-Live Architecture Badge */}
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-teal-400 bg-teal-950/40 rounded-lg p-1.5 border border-teal-800/30">
            <span>⚡ Dual-Agent Delegation:</span>
            <span className="font-semibold text-emerald-300 font-mono">🧠 {activeReasoningModel}</span>
          </div>

          <div className="my-2.5 min-h-[68px] max-h-48 overflow-y-auto rounded-xl bg-slate-900/60 p-2.5 text-xs leading-relaxed text-slate-200 border border-slate-800">
            {transcript || (
              <span className="text-slate-400 italic">
                Speak freely in English or Hindi: &ldquo;What is the live weather and air quality?&rdquo;, &ldquo;Are there active stubble fires?&rdquo;, or &ldquo;Simulate 50% vehicle curbs...&rdquo;
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={isRecording ? stopListening : startListening}
            className={`w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isRecording
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30'
                : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-200 border border-cyan-400/50 hover:from-cyan-600/40 hover:to-blue-600/40'
              }`}
          >
            {isRecording ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                End Conversation
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                </svg>
                Talk to VayuVani
              </>
            )}
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="Toggle VayuVani Voice"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !isRecording) startListening();
        }}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${isSpeaking
            ? 'scale-110 shadow-[0_0_35px_rgba(6,182,212,0.9)]'
            : isRecording
              ? 'scale-105 shadow-[0_0_30px_rgba(16,185,129,0.8)]'
              : 'shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105'
          }`}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 opacity-85 blur-sm animate-pulse" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 border border-cyan-400/60 shadow-inner">
          <svg className={`h-6 w-6 text-cyan-300 transition-transform duration-300 ${isSpeaking ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
          </svg>
        </div>
      </button>
    </div>
  );
}
