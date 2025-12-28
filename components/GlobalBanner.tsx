
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Flame, Crown, Star, Zap } from 'lucide-react';
import { GlobalAnnouncement } from '../types';

interface GlobalBannerProps {
  announcement: GlobalAnnouncement;
}

const GlobalBanner: React.FC<GlobalBannerProps> = ({ announcement }) => {
  const renderIcon = (icon: string) => {
    if (!icon) return null;
    const isImage = icon.startsWith('http') || icon.startsWith('data:');
    return isImage ? <img src={icon} className="w-6 h-6 object-contain drop-shadow-md" alt="" /> : <span className="text-lg">{icon}</span>;
  };

  const isLuckyWin = announcement.type === 'lucky_win';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] w-[95%] max-w-[340px] pointer-events-none">
      <motion.div
        initial={{ y: -100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`relative overflow-hidden rounded-full p-[1.5px] shadow-[0_15px_40px_rgba(0,0,0,0.4)] ${
          isLuckyWin 
          ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-600 shadow-emerald-500/30' 
          : 'bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-600 shadow-amber-500/30'
        }`}
      >
        {/* Glass Content */}
        <div className="bg-black/85 backdrop-blur-2xl rounded-full px-4 py-2 flex items-center gap-3 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
          
          {/* Status Icon */}
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
            isLuckyWin ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
          }`}>
            {isLuckyWin ? <Zap size={14} fill="currentColor" className="animate-pulse" /> : <Crown size={14} fill="currentColor" />}
          </div>

          {/* Main Text Layout */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
               <span className="text-white font-black text-[11px] truncate">{announcement.senderName}</span>
               <span className="text-white/40 text-[9px] shrink-0">أرسل</span>
               <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-md border border-white/10 shrink-0">
                  {renderIcon(announcement.giftIcon)}
                  <span className={`font-black text-[10px] ${isLuckyWin ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {announcement.giftName}
                  </span>
               </div>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
               <span className="text-white/40 text-[8px]">بقيمة</span>
               <span className="text-yellow-500 font-black text-[9px]">🪙 {announcement.amount?.toLocaleString()}</span>
               <span className="text-white/40 text-[8px]">إلى</span>
               <span className="text-blue-400 font-black text-[10px] truncate max-w-[60px]">{announcement.recipientName}</span>
            </div>
          </div>

          {/* Room Badge */}
          <div className="shrink-0 flex flex-col items-end border-r border-white/10 pr-2 mr-1">
             <span className="text-[7px] text-white/30 uppercase font-black">غرفة</span>
             <span className="text-[9px] text-white/70 font-bold truncate max-w-[50px]">{announcement.roomTitle}</span>
          </div>
        </div>

        {/* Dynamic Light Sweep */}
        <motion.div 
          animate={{ x: ['-150%', '300%'] }} 
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 w-1/3 pointer-events-none"
        />
      </motion.div>
    </div>
  );
};

export default GlobalBanner;
