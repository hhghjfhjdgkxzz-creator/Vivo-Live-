
import React, { useState, useMemo } from 'react';
import { User, UserLevel } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Heart, UserPlus, UserCheck, Gift, MessageCircle, MoreHorizontal, Shield, Gem, Copy, MicOff, Mic, Sparkles, Truck, Coins, Zap, Flame, Star, UserX } from 'lucide-react';

interface UserProfileSheetProps {
  user: User;
  onClose: () => void;
  isCurrentUser: boolean;
  onAction: (action: string, payload?: any) => void;
  currentUser: User;
}

const UserProfileSheet: React.FC<UserProfileSheetProps> = ({ user, onClose, isCurrentUser, onAction, currentUser }) => {
  const [showAgencyCharge, setShowAgencyCharge] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<number>(1000);

  const isFollowing = currentUser.ownedItems?.includes(`follow_${user.id}`);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.customId ? user.customId.toString() : user.id); 
    onAction('copyId');
  };

  const calculateLevelInfo = (xp: number) => {
      const xpPerLevel = 2500;
      const level = 1 + Math.floor(xp / xpPerLevel);
      const currentLevelStart = (level - 1) * xpPerLevel;
      const progress = ((xp - currentLevelStart) / xpPerLevel) * 100;
      return { level, progress, nextLevelStart: level * xpPerLevel, current: xp };
  };

  const wealthInfo = calculateLevelInfo(user.wealth || 0);
  const charmInfo = calculateLevelInfo(user.charm || 0);

  const specialIdDisplay = useMemo(() => {
     // Apply dynamic ID color from admin
     const idColor = (user as any).idColor || '#fbbf24';
     const id = user.customId || user.id;

     if (!user.isSpecialId) return <span className="text-slate-400 font-mono">ID: {id}</span>;
     
     return (
        <span 
          className="flex items-center gap-1 px-3 py-1 rounded-xl font-black shadow-xl transition-all hover:scale-110"
          style={{ backgroundColor: idColor, color: '#000' }}
        >
           <Sparkles size={12} fill="currentColor" />
           {id}
        </span>
     );
  }, [user.customId, user.isSpecialId, (user as any).idColor]);

  const handleAgencyTransfer = () => {
     if (!currentUser.agencyBalance || currentUser.agencyBalance < chargeAmount) {
        alert('عذراً، رصيد وكالتك لا يكفي لهذا المبلغ!');
        return;
     }
     if (confirm(`هل أنت متأكد من شحن ${chargeAmount} كوينز لحساب ${user.name}؟`)) {
        onAction('agencyTransfer', { amount: chargeAmount, targetId: user.id });
        setShowAgencyCharge(false);
        alert(`تم شحن ${chargeAmount} كوينز بنجاح!`);
     }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />

      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className={`relative w-full max-w-md bg-[#10141f] rounded-t-[30px] overflow-hidden pointer-events-auto border-t border-white/10 shadow-2xl ${user.isBanned ? 'grayscale opacity-70' : ''}`}>
        <div className="h-32 bg-slate-900 relative overflow-hidden">
          {user.cover ? <img src={user.cover} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600"></div>}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur rounded-full text-white"><X size={20} /></button>
          
          {user.isBanned && (
            <div className="absolute inset-0 bg-red-900/60 backdrop-blur-[2px] flex items-center justify-center">
               <div className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-2xl">
                  <UserX size={16}/> هذا الحساب محظور حالياً
               </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-8 relative">
          <div className="flex justify-between items-end -mt-10 mb-4">
             <div className="relative">
                <div className={`w-16 h-16 rounded-full bg-[#10141f] relative flex items-center justify-center ${!user.frame ? 'p-1 border-[4px] border-[#10141f] bg-gradient-to-br from-amber-300 to-yellow-600' : ''}`}>
                   <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                   {user.frame && <img src={user.frame} className="absolute inset-0 w-full h-full object-contain z-20 scale-[1.3]" alt="" />}
                </div>
             </div>
             <div className="flex gap-2 mb-2">
                {!isCurrentUser ? (
                  <>
                    <button onClick={() => { onClose(); onAction('message', user); }} className="p-2.5 bg-slate-800 rounded-full text-slate-300 border border-slate-700 active:scale-95 transition-all"><MessageCircle size={20} /></button>
                    <button onClick={() => onAction('toggleFollow', user.id)} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 transition-all ${isFollowing ? 'bg-slate-700 text-slate-300' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'}`}>
                       {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                       {isFollowing ? 'تتابع' : 'متابعة'}
                    </button>
                  </>
                ) : (
                   <button onClick={() => onAction('editProfile')} className="px-6 py-2 bg-slate-800 border border-slate-600 rounded-full text-white font-bold text-sm">تعديل</button>
                )}
             </div>
          </div>

          <div className="mb-6">
             <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className={`text-2xl ${user.nameStyle ? user.nameStyle : 'font-bold text-white'}`}>{user.name}</h2>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.isVip ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'}`}>Lv.{user.level}</div>
                {user.isAdmin && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">ADMIN</span>}
             </div>
             <div className="flex items-center gap-4 text-slate-400 text-sm mb-3">
                <button onClick={handleCopyId} className="flex items-center gap-2 hover:text-white transition group">
                   {specialIdDisplay}
                   <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
             </div>
             <p className="text-slate-300 text-sm">{user.bio || 'لا يوجد وصف..'}</p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6 border-b border-slate-800 pb-6">
             {[{ label: 'متابعين', val: user.stats?.followers || 0 }, { label: 'يتابع', val: user.stats?.following || 0 }, { label: 'زوار', val: user.stats?.visitors || 0 }, { label: 'إعجابات', val: user.stats?.likes || 0 }].map((stat, i) => (
               <div key={i} className="text-center">
                  <div className="text-lg font-bold text-white">{stat.val}</div>
                  <div className="text-[10px] text-slate-500">{stat.label}</div>
               </div>
             ))}
          </div>

          <div className="space-y-4 mb-6">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-white text-xs font-black">Lv.{wealthInfo.level}</div>
                <div className="flex-1">
                   <div className="flex justify-between text-[10px] mb-1"><span className="text-amber-400 font-bold flex items-center gap-1"><Gem size={10}/> ثراء</span><span>{wealthInfo.current.toLocaleString()} / {wealthInfo.nextLevelStart.toLocaleString()}</span></div>
                   <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500" style={{ width: `${wealthInfo.progress}%` }}></div></div>
                </div>
             </div>
          </div>

          {!isCurrentUser && (
             <div className="grid grid-cols-4 gap-3">
                <button onClick={() => { onClose(); onAction('gift'); }} className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 active:scale-95 transition-all"><Gift className="text-pink-500" size={24} /></div><span className="text-[10px] text-slate-400">إهداء</span></button>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfileSheet;
