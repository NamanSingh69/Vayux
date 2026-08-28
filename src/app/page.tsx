"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function OnboardingPage() {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-[#ffffff] font-sans antialiased selection:bg-[#556adc] selection:text-white flex flex-col pb-[120px]">
      
      {/* 
        HERO SECTION (Floating Cinematic Card)
      */}
      <section className="relative w-[calc(100%-24px)] md:w-[calc(100%-48px)] h-[calc(100vh-24px)] md:h-[calc(100vh-48px)] mx-auto mt-[12px] md:mt-[24px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-[#2a2c33]/50">
        
        {/* Background Video: AutoPlays, Muted, and STOPS on last frame (no loop) */}
        <video
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/vayux.mp4" type="video/mp4" />
        </video>

        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-[#0a0a0a]/30 to-transparent z-10"></div>

        {/* Top Navigation inside the Hero Card (Links Removed) */}
        <nav className="relative z-20 w-full px-[24px] py-[24px] md:px-[48px] md:py-[40px] flex justify-between items-center">
          <div className="flex items-center">
            {/* Massively scaled up logo */}
            <Image 
              src="/vayux.webp" 
              alt="VayuX Logo" 
              width={160} 
              height={64} 
              className="object-contain w-[130px] md:w-[180px] h-auto drop-shadow-lg" 
              priority
            />
          </div>
          
          <Link
            href="/dashboard"
            className="rounded-[9999px] border border-[#ffffff] px-[20px] py-[8px] md:px-[24px] md:py-[10px] text-[12px] md:text-[14px] font-[525] hover:bg-[#ffffff] hover:text-[#1f1f1f] transition-all duration-[0.2s] backdrop-blur-sm"
          >
            ACCESS VAYUX &rarr;
          </Link>
        </nav>

        {/* Bottom-Left Anchored Text - Typography Enhanced */}
        <div className={`relative z-20 mt-auto p-[24px] md:p-[48px] lg:p-[64px] max-w-5xl transition-all duration-1000 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          
          <div className="mb-[16px] md:mb-[24px] inline-flex items-center gap-[8px] px-[12px] py-[6px] rounded-[9999px] bg-[#000000]/50 backdrop-blur-md border border-[#ffffff]/20">
            <span className="w-[6px] h-[6px] rounded-[9999px] bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></span>
            <span className="text-[11px] font-[625] uppercase tracking-[0.1em] text-[#ffffff]">MoES Secure Uplink</span>
          </div>

          <h1 className="text-[48px] md:text-[72px] lg:text-[96px] leading-[1] font-[625] tracking-tight mb-[24px] text-[#ffffff] drop-shadow-2xl">
            Atmospheric<br /> Intelligence Platform.
          </h1>
          
          <p className="text-[16px] md:text-[20px] lg:text-[24px] font-[425] text-[#e6e6e6] max-w-3xl leading-[1.4] drop-shadow-lg">
            India's first two-way weather-chemistry coupled physics engine. Delivering <strong className="font-[625] text-[#ffffff]">72-hour predictive modeling</strong>, socio-economic GIS, and dynamic policy simulation for Delhi NCR.
          </p>
        </div>
      </section>

      {/* 
        SCROLLABLE CONTENT BELOW HERO 
      */}
      <main id="capabilities" className="relative z-10 flex flex-col pt-[80px] md:pt-[120px] max-w-[1280px] mx-auto w-full px-[24px] md:px-[48px] gap-[80px]">
        
        {/* Core Capabilities Grid */}
        <section className="flex flex-col gap-[32px]">
          <div className="mb-[16px]">
            <h2 className="text-[28px] md:text-[32px] font-[625] text-[#ffffff]">A Bureaucratic Superpower</h2>
            <p className="text-[16px] font-[425] text-[#999999] mt-[8px]">Replacing disjointed tools with one unified digital twin.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            {/* Card 1 */}
            <div className="bg-[#141414] border border-[#2a2c33] rounded-[16px] p-[32px] flex flex-col gap-[16px] hover:border-[#556adc]/50 transition-all duration-[0.2s] group shadow-[0_2px_6px_0px_rgba(0,0,0,0.5)]">
              <div className="h-[160px] w-full bg-[#0a0a0a] rounded-[8px] flex items-center justify-center overflow-hidden relative border border-[#2a2c33]">
                <img alt="Predictive Matrix" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity duration-500" style={{ objectPosition: 'left center' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKFgT-fd3zZe_ytjG16L-u89DnJTmMIDKv6bRXtpuYUsh7Uq0VlsP2vYzpT_YeZrs7JiCKBH9_AxmD2Sw6SNlVIvIBe2p1b9KXYuPgA1rrAmNqdc2sAfOcji-5a6rA-1czbMudDvoXFnDTO4Y-xDWqAoQ89pAhy7B9Jo7UpZmtek4YjK4LdQGqwKXLLlRtzziVzWOKmeAm8T6VZTUdlZz8hn7I1F1PGhjD3Lh6_v6I5b78JNE5kYtv" />
              </div>
              <div>
                <h3 className="text-[21px] font-[625] text-[#e8effc] mb-[8px]">72-Hour Predictive Matrix</h3>
                <p className="text-[14px] font-[425] text-[#999999] leading-[1.6]">Powered by Chronos-Bolt AI. Anticipate severe AQI events 3 days in advance with high-resolution atmospheric boundary layer tracking.</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#141414] border border-[#2a2c33] rounded-[16px] p-[32px] flex flex-col gap-[16px] hover:border-[#556adc]/50 transition-all duration-[0.2s] group shadow-[0_2px_6px_0px_rgba(0,0,0,0.5)]">
              <div className="h-[160px] w-full bg-[#0a0a0a] rounded-[8px] flex items-center justify-center overflow-hidden relative border border-[#2a2c33]">
                <img alt="GRAP Policy Sandbox" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity duration-500" style={{ objectPosition: 'right center' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKFgT-fd3zZe_ytjG16L-u89DnJTmMIDKv6bRXtpuYUsh7Uq0VlsP2vYzpT_YeZrs7JiCKBH9_AxmD2Sw6SNlVIvIBe2p1b9KXYuPgA1rrAmNqdc2sAfOcji-5a6rA-1czbMudDvoXFnDTO4Y-xDWqAoQ89pAhy7B9Jo7UpZmtek4YjK4LdQGqwKXLLlRtzziVzWOKmeAm8T6VZTUdlZz8hn7I1F1PGhjD3Lh6_v6I5b78JNE5kYtv" />
              </div>
              <div>
                <h3 className="text-[21px] font-[625] text-[#ee7944] mb-[8px]">GRAP Policy Sandbox</h3>
                <p className="text-[14px] font-[425] text-[#999999] leading-[1.6]">Simulate emission interventions dynamically. Calculate direct-benefit carbon credit payouts for farmers to reduce upwind stubble burning.</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#141414] border border-[#2a2c33] rounded-[16px] p-[32px] flex flex-col gap-[16px] hover:border-[#556adc]/50 transition-all duration-[0.2s] group shadow-[0_2px_6px_0px_rgba(0,0,0,0.5)]">
              <div className="h-[160px] w-full bg-[#0a0a0a] rounded-[8px] flex items-center justify-center overflow-hidden relative border border-[#2a2c33]">
                <img alt="Health Vulnerability GIS" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity duration-500" style={{ objectPosition: 'center bottom' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKFgT-fd3zZe_ytjG16L-u89DnJTmMIDKv6bRXtpuYUsh7Uq0VlsP2vYzpT_YeZrs7JiCKBH9_AxmD2Sw6SNlVIvIBe2p1b9KXYuPgA1rrAmNqdc2sAfOcji-5a6rA-1czbMudDvoXFnDTO4Y-xDWqAoQ89pAhy7B9Jo7UpZmtek4YjK4LdQGqwKXLLlRtzziVzWOKmeAm8T6VZTUdlZz8hn7I1F1PGhjD3Lh6_v6I5b78JNE5kYtv" />
              </div>
              <div>
                <h3 className="text-[21px] font-[625] text-[#d4508e] mb-[8px]">Health Vulnerability GIS</h3>
                <p className="text-[14px] font-[425] text-[#999999] leading-[1.6]">Translate physics into public health. Instantly visualize active asthma risk corridors and calculate regional hospital bed surges.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Wide Bottom Institutional Card */}
        <section>
          <div className="bg-[#141414] border border-[#2a2c33] rounded-[24px] p-[32px] md:p-[48px] flex flex-col md:flex-row items-center gap-[32px] md:gap-[64px] shadow-2xl">
            <div className="flex-1 flex flex-col gap-[16px]">
              <div className="flex items-center gap-[8px] text-[#6ea335]">
                <svg className="w-[16px] h-[16px]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span className="text-[12px] font-[625] uppercase tracking-widest">Resilient Infrastructure</span>
              </div>
              <h2 className="text-[28px] md:text-[36px] font-[625] text-[#ffffff] leading-[1.2]">Edge-Compute Disaster Mode.</h2>
              <p className="text-[16px] font-[425] text-[#999999] leading-[1.6]">
                Government infrastructure must be fully resilient during severe smog crises. VayuX operates seamlessly offline by aggressively caching 72-hour predictive matrices directly in the browser.
              </p>
            </div>
            
            <div className="flex-1 w-full relative h-[120px] md:h-[160px] border border-[#2a2c33] rounded-[16px] overflow-hidden bg-[#0a0a0a]">
              <div className="absolute inset-0 flex items-center justify-center px-[24px]">
                <div className="w-full h-px bg-[#2a2c33] relative">
                  <div className="absolute top-1/2 left-0 h-[2px] bg-[#556adc] shadow-[0_0_12px_rgba(85,106,220,1)] w-full -translate-y-1/2 opacity-50"></div>
                </div>
              </div>
              <div className="absolute bottom-[16px] right-[16px] text-[12px] font-[625] tracking-widest text-[#666666]">
                 PWA // ACTIVE
              </div>
            </div>
          </div>
        </section>

      </main>

    </div>
  );
}