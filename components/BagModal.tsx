
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingBag, Check, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { StoreItem, User, ItemType } from '../types';

interface BagModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StoreItem[];
  user: User;
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
}

const BagModal: React.FC<BagModalProps> = ({ isOpen, onClose, items, user, onBuy, onEquip }) => {
  const [activeTab, setActiveTab] = useState<'frame' | 'bubble'>('frame');

  if (!isOpen) return null;

  // حصر المتجر على الإطارات والفقاعات فقط بناءً على الطلب
  const filteredItems = items.filter(item => item.type === activeTab);

  const tabs: { id: 'frame' | 'bubble', label: string, icon: any }[] = [
    { id: 'frame', label: 'الإطارات', icon: ImageIcon },
    { id: 'bubble', label: 'الفقاعات', icon: MessageSquare }
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm bg-gradient-to-br from-slate-900 via-[#1a1f35] to-slate-900 rounded-[2.5rem] border border-blue-500/30 shadow-2xl overflow-hidden flex flex-col h-[80vh]"
      >
        {/* Header */}
        <div className="relative p-6 text-center border-b border-white/5 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition">
             <X size={20} />
          </button>
          <div className="inline-block p-3 rounded-full bg-blue-500/10 mb-2 border border-blue-500/20">
             <ShoppingBag size={32} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-cyan-400 to-blue-600">
             المتجر الحصري
          </h2>
          
          <div className="mt-4 bg-black/40 rounded-xl p-2 flex items-center justify-between px-4 border border-white/5">
             <span className="text-xs text-slate-400">رصيدك الحالي</span>
             <span className="font-bold text-yellow-400 flex items-center gap-1 text-sm">
                {(user.coins ?? 0).toLocaleString()} 🪙
             </span>
          </div>
        </div>

        {/* Tabs Selection Buttons */}
        <div className="flex p-2 gap-2 bg-black/20 flex-shrink-0">
           {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                   activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
           ))}
        </div>

        {/* Store List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide min-h-0">
           <div className="grid grid-cols-2 gap-3 pb-10">
             {filteredItems.map((item) => {
               const isOwned = user.ownedItems?.includes(item.id);
               const isEquipped = item.type === 'frame' ? user.frame === item.url : user.activeBubble === item.url;
               const canAfford = user.coins >= item.price;

               return (
                 <div 
                   key={item.id} 
                   className={`relative rounded-[2rem] p-3 border transition-all overflow-hidden flex flex-col items-center gap-2 group ${
                     isEquipped 
                       ? 'bg-blue-900/20 border-blue-500/50' 
                       : isOwned ? 'bg-slate-800/80 border-white/10' : 'bg-slate-800/40 border-white/5'
                   }`}
                 >
                   <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center bg-black/30 rounded-full">
                      {item.type === 'frame' ? (
                         <div className="relative w-16 h-16">
                            <img src={user.avatar} className="absolute inset-1 rounded-full w-[88%] h-[88%] object-cover opacity-40 grayscale" alt="preview" />
                            <img src={item.url} className="absolute inset-0 w-full h-full object-contain drop-shadow-lg scale-[1.2]" alt={item.name} />
                         </div>
                      ) : (
                         <div 
                           className="w-16 h-12 rounded-xl flex items-center justify-center text-[8px] text-white font-bold shadow-sm border border-white/10 overflow-hidden"
                           style={{ 
                              backgroundImage: `url(${item.url})`, 
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                           }}
                         >
                            {item.name}
                         </div>
                      )}
                   </div>

                   <div className="text-center w-full">
                      <h3 className="font-black text-[11px] text-white truncate px-2">{item.name}</h3>
                      {!isOwned && <p className="text-[10px] text-yellow-500 font-mono mt-0.5">{item.price.toLocaleString()} 🪙</p>}
                   </div>

                   <div className="w-full mt-auto">
                      {isEquipped ? (
                         <div className="w-full py-2 bg-green-500/20 text-green-400 text-[10px] font-black rounded-xl border border-green-500/20 flex items-center justify-center gap-1">
                            <Check size={10} /> مفعل
                         </div>
                      ) : isOwned ? (
                         <button 
                            onClick={() => onEquip(item)}
                            className="w-full py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg"
                         >
                            استخدام
                         </button>
                      ) : (
                         <button 
                            disabled={!canAfford}
                            onClick={() => onBuy(item)}
                            className={`w-full py-2 rounded-xl text-[10px] font-black ${
                               canAfford ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow' : 'bg-slate-700 text-slate-500'
                            }`}
                         >
                            شراء
                         </button>
                      )}
                   </div>
                 </div>
               );
             })}
           </div>
           {filteredItems.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-20 font-bold">
                 لا توجد عناصر متاحة حالياً
              </div>
           )}
        </div>
      </motion.div>
    </div>
  );
};

export default BagModal;
