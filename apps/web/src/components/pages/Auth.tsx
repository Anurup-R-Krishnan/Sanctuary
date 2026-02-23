import React from "react";
import { User, BookOpen } from "lucide-react";
import { SignIn } from "@/hooks/useAuth";
import ScrapbookBackground from "../layout/ScrapbookBackground";

interface AuthProps {
  onContinueAsGuest?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onContinueAsGuest }) => {
  return (
    <ScrapbookBackground>
      <div className="fixed inset-0 flex items-center justify-center pt-10">
        <div className="relative w-full max-w-md mx-4 animate-fadeInUp">

          {/* Main Taped Note/Card */}
          <div className="relative bg-[#faf6f0] p-8 border-[3px] border-[#2c1e16] shadow-[8px_8px_0px_rgba(44,30,22,1)] transform rotate-1">

            {/* Washi Tape */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#e6d5b8] border border-[#2c1e16]/20 rotate-[-3deg] shadow-sm z-10 mix-blend-multiply" />

            {/* Secondary Tape */}
            <div className="absolute -bottom-3 -right-4 w-12 h-5 bg-[#b85e42]/60 border border-[#2c1e16]/20 rotate-[15deg] shadow-sm z-10 mix-blend-multiply" />

            <div className="text-center mb-8 relative z-20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e6d5b8] mb-5 border-2 border-[#2c1e16] shadow-[4px_4px_0px_rgba(44,30,22,1)] rounded-sm rotate-[-2deg]">
                <BookOpen className="w-8 h-8 text-[#b85e42]" strokeWidth={2} />
              </div>
              <h1 className="text-4xl font-black font-serif text-[#2c1e16] tracking-tight">Sanctuary</h1>
              <p className="text-[#6a5a4e] mt-2 font-bold font-sans tracking-wide uppercase text-xs">Your personal reading desk</p>
            </div>

            <div className="relative z-20 Space-y-6">
              <div className="bg-white border-2 border-[#2c1e16] p-2 shadow-inner">
                {/* The SignIn component manages its own styling largely, 
                    we wrap it in a hard physical border to fit the theme */}
                <SignIn />
              </div>

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-[2px] border-dashed border-[#2c1e16]/30" />
                </div>
                <div className="relative px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#6a5a4e] bg-[#faf6f0] border-2 border-[#2c1e16] shadow-[2px_2px_0px_rgba(44,30,22,1)] rotate-2">
                  or
                </div>
              </div>

              <button
                type="button"
                onClick={onContinueAsGuest}
                disabled={!onContinueAsGuest}
                className="w-full flex items-center justify-center gap-2.5 bg-[#e6d5b8] px-6 py-4 text-sm font-black uppercase tracking-wider text-[#2c1e16] border-[3px] border-[#2c1e16] transition-all duration-200 shadow-[4px_4px_0px_rgba(44,30,22,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_rgba(44,30,22,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
              >
                <User className="h-5 w-5" strokeWidth={2.5} />
                <span>Continue as guest</span>
              </button>

              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6a5a4e]/70 mt-5 text-center px-4">
                Guest data is stored locally. No cloud sync available without an account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrapbookBackground>
  );
};

export default Auth;
