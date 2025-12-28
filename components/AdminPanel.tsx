
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, ShieldCheck, Search, Ban, Coins, 
  Settings2, X, Crown, Layout, Save,
  Edit3, Trash2, Gift as GiftIcon, ShoppingBag, Gamepad2, Plus,
  TrendingUp, Key, Truck, Eraser, Unlock, UserPlus, UserMinus,
  Image as ImageIcon, Camera, Star, Zap, RefreshCcw, Database, Upload, Trash, Clover, Settings, ShieldAlert, UserX, Smile, Clock, ChevronRight, Palette, CheckCircle2,
  Sparkles, Smartphone, AlertTriangle, Percent, Activity, Target, Flame, Wand2
} from 'lucide-react';
import { User, Room, Gift, StoreItem, GameSettings, VIPPackage, LuckyMultiplier, ItemType, GiftAnimationType } from '../types';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, updateDoc, writeBatch, query, where } from 'firebase/firestore';

const compressImage = (base64: string, maxWidth: number, maxHeight: number, quality: number = 0.4): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', quality));
    };
  });
};

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  onUpdateRoom: (roomId: string, data: Partial<Room>) => Promise<void>;
  gifts: Gift[];
  setGifts: (gifts: Gift[]) => void;
  storeItems: StoreItem[];
  setStoreItems: (items: StoreItem[]) => void;
  vipLevels: VIPPackage[];
  setVipLevels: (levels: VIPPackage[]) => void;
  gameSettings: GameSettings;
  setGameSettings: (settings: GameSettings) => void;
  appBanner: string;
  onUpdateAppBanner: (url: string) => void;
  appLogo: string;
  onUpdateAppLogo: (url: string) => void;
}

type AdminTab = 'users' | 'vip' | 'gifts' | 'store' | 'games' | 'identity' | 'maintenance';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, onClose, currentUser, users = [], onUpdateUser, rooms = [], gifts = [], setGifts, storeItems = [], setStoreItems, vipLevels = [], setVipLevels, gameSettings, setGameSettings, appBanner, onUpdateAppBanner, appLogo, onUpdateAppLogo
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [editingGift, setEditingGift] = useState<Partial<Gift> | null>(null);
  const [editingStoreItem, setEditingStoreItem] = useState<Partial<StoreItem> | null>(null);
  const [editingVip, setEditingVip] = useState<Partial<VIPPackage> | null>(null);

  const [editingUserFields, setEditingUserFields] = useState({ 
    coins: 0, customId: '', vipLevel: 0, idColor: '#fbbf24', isBanned: false 
  });

  if (!isOpen || !currentUser.isAdmin) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, w: number, h: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target?.result as string, w, h, 0.5);
        callback(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateGameSettings = async (updates: Partial<GameSettings>) => {
    const newSettings = { ...gameSettings, ...updates };
    setGameSettings(newSettings);
    await setDoc(doc(db, 'appSettings', 'global'), { gameSettings: newSettings }, { merge: true });
  };

  const saveGiftsToDb = async (newGifts: Gift[]) => {
    setGifts(newGifts);
    await setDoc(doc(db, 'appSettings', 'gifts'), { gifts: newGifts });
  };

  const saveStoreToDb = async (newItems: StoreItem[]) => {
    setStoreItems(newItems);
    await setDoc(doc(db, 'appSettings', 'store'), { items: newItems });
  };

  const saveVipToDb = async (newVips: VIPPackage[]) => {
    setVipLevels(newVips);
    await setDoc(doc(db, 'appSettings', 'vip'), { levels: newVips });
  };

  const menuItems = [
    { id: 'users', label: 'الأعضاء', icon: Users, color: 'text-blue-400' },
    { id: 'games', label: 'مركز الحظ', icon: Activity, color: 'text-orange-400' },
    { id: 'gifts', label: 'الهدايا', icon: GiftIcon, color: 'text-pink-400' },
    { id: 'store', label: 'المتجر', icon: ShoppingBag, color: 'text-cyan-400' },
    { id: 'vip', label: 'الـ VIP', icon: Crown, color: 'text-amber-400' },
    { id: 'identity', label: 'الهوية', icon: Smartphone, color: 'text-emerald-400' },
    { id: 'maintenance', label: 'الصيانة', icon: Eraser, color: 'text-red-500' },
  ];

  const animationTypes: {id: GiftAnimationType, label: string}[] = [
    { id: 'pop', label: 'Pop' }, { id: 'fly', label: 'Fly' }, { id: 'full-screen', label: 'Fullscreen' },
    { id: 'shake', label: 'Shake' }, { id: 'glow', label: 'Glow' }, { id: 'bounce', label: 'Bounce' },
    { id: 'rotate', label: 'Rotate' }, { id: 'slide-up', label: 'Slide Up' }
  ];

  const renderIcon = (icon: string) => {
    if (!icon) return <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500"><ImageIcon size={20}/></div>;
    const isImage = icon.includes('http') || icon.includes('data:image') || icon.includes('base64');
    return isImage ? <img src={icon} className="w-12 h-12 object-contain" alt="" /> : <span className="text-3xl">{icon}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col md:flex-row font-cairo overflow-hidden text-right" dir="rtl">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-950 border-l border-white/5 flex flex-col shrink-0 shadow-2xl z-10">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg shadow-lg"><ShieldCheck size={20} className="text-white" /></div>
            <span className="font-black text-white">لوحة الإدارة</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 p-2"><X size={24}/></button>
        </div>
        <nav className="flex md:flex-col p-3 gap-1 overflow-x-auto md:overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as AdminTab)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}>
              <item.icon size={18} className={activeTab === item.id ? item.color : ''} />
              <span className="text-xs font-black">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 bg-slate-900/40 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        
        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder="بحث بالاسم أو الـ ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pr-12 text-white text-sm outline-none shadow-lg focus:border-blue-500/50 transition-all" />
            </div>
            <div className="bg-slate-950/40 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
               <table className="w-full text-right">
                  <thead className="bg-black/40 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                     <tr><th className="p-5">المستخدم</th><th className="p-5 text-center">ID العرض</th><th className="p-5 text-center">الرصيد</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">الإجراء</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.customId?.toString().includes(searchQuery)).map(u => (
                        <tr key={u.id} className={u.isBanned ? 'opacity-40 grayscale' : ''}>
                           <td className="p-5 flex items-center gap-3">
                              <img src={u.avatar} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg" />
                              <span className="text-xs font-bold text-white">{u.name} {u.isBanned && '🚫'}</span>
                           </td>
                           <td className="p-5 text-center">
                              <span className="px-3 py-1 rounded-lg text-[10px] font-black shadow-lg" style={{ backgroundColor: u.idColor || '#fbbf24', color: '#000' }}>{u.customId || u.id}</span>
                           </td>
                           <td className="p-5 text-center text-xs text-yellow-500 font-black">🪙 {u.coins?.toLocaleString()}</td>
                           <td className="p-5 text-center text-[10px] font-black uppercase">
                              {u.isAdmin ? <span className="text-red-500">ADMIN</span> : (u.isVip ? <span className="text-amber-500">VIP {u.vipLevel}</span> : <span className="text-slate-600">عادي</span>)}
                           </td>
                           <td className="p-5 text-center">
                              <button onClick={() => { setSelectedUser(u); setEditingUserFields({ coins: u.coins || 0, customId: u.customId?.toString() || '', vipLevel: u.vipLevel || 0, idColor: u.idColor || '#fbbf24', isBanned: u.isBanned || false }); }} className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-md"><Settings2 size={18}/></button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* --- GAMES TAB (LUCK CENTER) --- */}
        {activeTab === 'games' && (
           <div className="max-w-4xl mx-auto space-y-10">
              <div className="flex flex-col gap-2">
                 <h3 className="text-2xl font-black text-white flex items-center gap-3"><Activity className="text-orange-500"/> مركز التحكم في الحظ والنسب</h3>
                 <p className="text-slate-500 text-xs font-bold mr-10">تحكم في احتمالات الفوز لجميع الألعاب والهدايا</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                    <h4 className="text-lg font-black text-white flex justify-between">عجلة الحظ <span>{gameSettings.wheelWinRate}%</span></h4>
                    <input type="range" min="1" max="95" value={gameSettings.wheelWinRate} onChange={e => handleUpdateGameSettings({ wheelWinRate: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                 </div>
                 <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                    <h4 className="text-lg font-black text-white flex justify-between">السلوتس <span>{gameSettings.slotsWinRate}%</span></h4>
                    <input type="range" min="1" max="95" value={gameSettings.slotsWinRate} onChange={e => handleUpdateGameSettings({ slotsWinRate: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                 </div>
              </div>
              <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                 <h4 className="text-lg font-black text-white flex justify-between items-center"><Clover className="text-emerald-500"/> هدايا الحظ <span>{gameSettings.luckyGiftWinRate}%</span></h4>
                 <input type="range" min="1" max="100" value={gameSettings.luckyGiftWinRate} onChange={e => handleUpdateGameSettings({ luckyGiftWinRate: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    {gameSettings.luckyMultipliers.map((m, i) => (
                       <div key={i} className="bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-500 block mb-1">{m.label}</span>
                          <input type="number" value={m.value} onChange={e => {
                             const nm = [...gameSettings.luckyMultipliers]; nm[i].value = parseInt(e.target.value) || 0;
                             handleUpdateGameSettings({ luckyMultipliers: nm });
                          }} className="w-full bg-transparent text-white font-bold outline-none" />
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {/* --- GIFTS TAB --- */}
        {activeTab === 'gifts' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-white">إدارة الهدايا</h3>
                 <button onClick={() => setEditingGift({ id: Date.now().toString(), name: '', icon: '', cost: 10, animationType: 'pop', category: 'popular' })} className="px-6 py-3 bg-pink-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl active:scale-95"><Plus size={18}/> إضافة هدية</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {gifts.map(gift => (
                    <div key={gift.id} className="bg-slate-950/60 p-4 rounded-[2rem] border border-white/10 flex flex-col items-center gap-2 group relative">
                       <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingGift(gift)} className="p-1.5 bg-blue-600 rounded-lg text-white"><Edit3 size={12}/></button>
                          <button onClick={() => { if(confirm('حذف؟')) saveGiftsToDb(gifts.filter(g => g.id !== gift.id)) }} className="p-1.5 bg-red-600 rounded-lg text-white"><Trash2 size={12}/></button>
                       </div>
                       {renderIcon(gift.icon)}
                       <span className="text-xs font-black text-white truncate w-full text-center">{gift.name}</span>
                       <span className="text-[10px] text-yellow-500 font-bold">🪙 {gift.cost}</span>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- STORE TAB --- */}
        {activeTab === 'store' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-white">إدارة المتجر</h3>
                 <button onClick={() => setEditingStoreItem({ id: Date.now().toString(), name: '', type: 'frame', price: 500, url: '' })} className="px-6 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl active:scale-95"><Plus size={18}/> إضافة عنصر</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {storeItems.map(item => (
                    <div key={item.id} className="bg-slate-950/60 p-4 rounded-[2rem] border border-white/10 flex flex-col items-center gap-2 group relative">
                       <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingStoreItem(item)} className="p-1.5 bg-blue-600 rounded-lg text-white"><Edit3 size={12}/></button>
                          <button onClick={() => { if(confirm('حذف؟')) saveStoreToDb(storeItems.filter(i => i.id !== item.id)) }} className="p-1.5 bg-red-600 rounded-lg text-white"><Trash2 size={12}/></button>
                       </div>
                       <img src={item.url} className="w-16 h-16 object-contain" />
                       <span className="text-xs font-black text-white truncate w-full text-center">{item.name}</span>
                       <span className="text-[10px] text-yellow-500 font-bold">🪙 {item.price}</span>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- VIP TAB --- */}
        {activeTab === 'vip' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-white">عضويات VIP</h3>
                 <button onClick={() => setEditingVip({ level: (vipLevels.length + 1), name: '', cost: 1000, frameUrl: '', color: 'text-white', nameStyle: '' })} className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl active:scale-95"><Plus size={18}/> إضافة رتبة</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {vipLevels.sort((a,b)=>a.level-b.level).map(vip => (
                    <div key={vip.level} className="bg-slate-950/60 p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-4 group relative">
                       <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingVip(vip)} className="p-2 bg-blue-600 rounded-xl text-white"><Edit3 size={16}/></button>
                          <button onClick={() => { if(confirm('حذف؟')) saveVipToDb(vipLevels.filter(v => v.level !== vip.level)) }} className="p-2 bg-red-600 rounded-xl text-white"><Trash2 size={16}/></button>
                       </div>
                       <img src={vip.frameUrl} className="w-14 h-14 object-contain scale-[1.3]" />
                       <div><h4 className={`font-black text-lg ${vip.color}`}>{vip.name}</h4><span className="text-[10px] text-yellow-500 font-bold">🪙 {vip.cost.toLocaleString()}</span></div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- IDENTITY TAB --- */}
        {activeTab === 'identity' && (
           <div className="max-w-2xl mx-auto space-y-10">
              <h3 className="text-2xl font-black text-white flex items-center gap-3"><Smartphone className="text-emerald-500"/> هوية التطبيق</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-4 text-center">
                    <label className="text-xs font-black text-slate-500 uppercase">Logo</label>
                    <div className="relative aspect-square w-32 mx-auto rounded-3xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center bg-black/40 group">
                       <img src={appLogo} className="w-full h-full object-cover group-hover:opacity-40" />
                       <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                          <Camera size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, onUpdateAppLogo, 400, 400)} />
                       </label>
                    </div>
                 </div>
                 <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-4 text-center">
                    <label className="text-xs font-black text-slate-500 uppercase">Banner</label>
                    <div className="relative h-32 w-full rounded-2xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center bg-black/40 group">
                       <img src={appBanner} className="w-full h-full object-cover group-hover:opacity-40" />
                       <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                          <ImageIcon size={24} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, onUpdateAppBanner, 800, 300)} />
                       </label>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* --- MAINTENANCE TAB --- */}
        {activeTab === 'maintenance' && (
           <div className="max-w-4xl mx-auto space-y-10">
              <h3 className="text-2xl font-black text-white flex items-center gap-3"><Eraser className="text-red-500"/> صيانة النظام</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-red-600/5 border-2 border-red-600/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-6 shadow-2xl">
                    <AlertTriangle size={40} className="text-red-600" />
                    <h4 className="text-white font-black text-xl">مسح شامل للبيانات</h4>
                    <button onClick={async () => { if(confirm('مسح كافة البيانات (باستثناء الأدمن)؟')) {
                       setIsProcessing(true); try {
                          const batch = writeBatch(db);
                          (await getDocs(collection(db, 'users'))).forEach(d => { if (d.id !== currentUser.id) batch.delete(d.ref); });
                          (await getDocs(collection(db, 'rooms'))).forEach(d => batch.delete(d.ref));
                          (await getDocs(collection(db, 'private_chats'))).forEach(d => batch.delete(d.ref));
                          (await getDocs(collection(db, 'lucky_bags'))).forEach(d => batch.delete(d.ref));
                          await batch.commit(); alert('تم التطهير ✅'); window.location.reload();
                       } catch(e) { alert('فشل'); } finally { setIsProcessing(false); }
                    }}} disabled={isProcessing} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl">بدء المسح النهائي</button>
                 </div>
                 <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center text-center gap-6 shadow-2xl">
                    <Layout size={40} className="text-blue-500" />
                    <h4 className="text-white font-black text-xl">تصفية الغرف</h4>
                    <button onClick={async () => { if(confirm('حذف كافة الغرف النشطة؟')) {
                       setIsProcessing(true); try {
                          const batch = writeBatch(db); (await getDocs(collection(db, 'rooms'))).forEach(d => batch.delete(d.ref));
                          await batch.commit(); alert('تم التنظيف ✅');
                       } catch(e) { alert('فشل'); } finally { setIsProcessing(false); }
                    }}} disabled={isProcessing} className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl">حذف الغرف المعلقة</button>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-4 text-white"><img src={selectedUser.avatar} className="w-14 h-14 rounded-2xl border border-white/10 shadow-lg" /><div><h3 className="font-black text-lg">{selectedUser.name}</h3><span className="text-[10px] text-slate-500 font-mono uppercase">{selectedUser.id}</span></div></div>
                  <button onClick={() => setSelectedUser(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase pr-2">تغيير الـ ID</label><input type="text" value={editingUserFields.customId} onChange={e => setEditingUserFields({...editingUserFields, customId: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs font-black outline-none shadow-inner" /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase pr-2">لون الـ ID</label><div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl p-2 h-[54px]"><input type="color" value={editingUserFields.idColor} onChange={e => setEditingUserFields({...editingUserFields, idColor: e.target.value})} className="h-full w-full bg-transparent border-none cursor-pointer" /></div></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase pr-2">الرصيد الحالي</label><input type="number" value={editingUserFields.coins} onChange={e => setEditingUserFields({...editingUserFields, coins: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-yellow-500 font-black text-sm outline-none shadow-inner" /></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase pr-2">رتبة VIP</label><select value={editingUserFields.vipLevel} onChange={e => setEditingUserFields({...editingUserFields, vipLevel: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs font-black outline-none appearance-none"><option value={0}>بدون رتبة</option>{vipLevels.map(v => <option key={v.level} value={v.level}>{v.name}</option>)}</select></div>
                     <div className="flex items-end"><button onClick={() => setEditingUserFields({...editingUserFields, isBanned: !editingUserFields.isBanned})} className={`w-full py-4 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${editingUserFields.isBanned ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{editingUserFields.isBanned ? 'إلغاء الحظر' : 'حظر الحساب'}</button></div>
                  </div>
                  <div className="pt-4"><button onClick={async () => { try { const updates: any = { coins: Number(editingUserFields.coins), vipLevel: editingUserFields.vipLevel, isVip: editingUserFields.vipLevel > 0, idColor: editingUserFields.idColor, isBanned: editingUserFields.isBanned, customId: editingUserFields.customId || null, isSpecialId: !!editingUserFields.customId }; if (updates.vipLevel > 0) { const vip = vipLevels.find(v => v.level === updates.vipLevel); if (vip) { updates.frame = vip.frameUrl; updates.nameStyle = vip.nameStyle; } } await onUpdateUser(selectedUser.id, updates); alert('تم التحديث بنجاح ✅'); setSelectedUser(null); } catch (e) { alert('حدث خطأ'); } }} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><Save size={20}/> حفظ الإعدادات</button></div>
               </div>
            </motion.div>
          </div>
        )}

        {editingGift && (
           <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                 <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-white flex items-center gap-2"><Wand2 className="text-pink-500"/> إعداد الهدية</h3><button onClick={() => setEditingGift(null)}><X size={24} className="text-slate-500" /></button></div>
                 <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 p-6 bg-black/30 rounded-3xl border border-white/5 relative group">
                       <div className="w-24 h-24 flex items-center justify-center bg-slate-800 rounded-3xl border border-white/10 shadow-inner overflow-hidden">{renderIcon(editingGift.icon || '')}</div>
                       <label className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-2 transition-all">
                          <Upload size={14} /> رفع صورة الهدية<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setEditingGift({...editingGift, icon: url}), 300, 300)} />
                       </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">اسم الهدية</label><input type="text" value={editingGift.name} onChange={e => setEditingGift({...editingGift, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">سعر الهدية</label><input type="number" value={editingGift.cost} onChange={e => setEditingGift({...editingGift, cost: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-yellow-500 font-black text-xs outline-none" /></div>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">تأثير ظهور الهدية (Animation)</label>
                       <div className="grid grid-cols-2 gap-2">
                          {animationTypes.map(type => (
                             <button key={type.id} onClick={() => setEditingGift({...editingGift, animationType: type.id})} className={`p-3 rounded-xl text-[10px] font-black text-right border transition-all ${editingGift.animationType === type.id ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500 hover:bg-black/40'}`}>{type.label}</button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">التصنيف</label><select value={editingGift.category} onChange={e => setEditingGift({...editingGift, category: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold"><option value="popular">شائع</option><option value="exclusive">مميز</option><option value="lucky">الحظ</option><option value="celebrity">مشاهير</option><option value="trend">ترند</option></select></div>
                    <button onClick={async () => { const newGifts = gifts.filter(g => g.id !== editingGift.id); saveGiftsToDb([...newGifts, { ...editingGift, isLucky: editingGift.category === 'lucky' } as Gift]); setEditingGift(null); }} className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">حفظ الهدية</button>
                 </div>
              </motion.div>
           </div>
        )}

        {editingStoreItem && (
           <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                 <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-white flex items-center gap-2"><ShoppingBag className="text-cyan-500"/> إعداد المتجر</h3><button onClick={() => setEditingStoreItem(null)}><X size={24} className="text-slate-500" /></button></div>
                 <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 p-6 bg-black/30 rounded-3xl border border-white/5 relative group">
                       <div className="w-24 h-24 flex items-center justify-center bg-slate-800 rounded-3xl border border-white/10 shadow-inner overflow-hidden"><img src={editingStoreItem.url || ''} className="w-full h-full object-contain" /></div>
                       <label className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-2 transition-all">
                          <Upload size={14} /> رفع صورة العنصر<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setEditingStoreItem({...editingStoreItem, url: url}), 300, 300)} />
                       </label>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">الاسم</label><input type="text" value={editingStoreItem.name} onChange={e => setEditingStoreItem({...editingStoreItem, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">النوع</label><select value={editingStoreItem.type} onChange={e => setEditingStoreItem({...editingStoreItem, type: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none"><option value="frame">إطار</option><option value="bubble">فقاعة</option></select></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">السعر</label><input type="number" value={editingStoreItem.price} onChange={e => setEditingStoreItem({...editingStoreItem, price: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-yellow-500 font-black text-xs outline-none" /></div>
                    </div>
                    <button onClick={async () => { const newItems = storeItems.filter(i => i.id !== editingStoreItem.id); saveStoreToDb([...newItems, editingStoreItem as StoreItem]); setEditingStoreItem(null); }} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">حفظ العنصر</button>
                 </div>
              </motion.div>
           </div>
        )}

        {editingVip && (
           <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                 <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-white flex items-center gap-2"><Crown className="text-amber-500"/> إعداد الـ VIP</h3><button onClick={() => setEditingVip(null)}><X size={24} className="text-slate-500" /></button></div>
                 <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 p-6 bg-black/30 rounded-3xl border border-white/5 relative group">
                       <div className="w-24 h-24 flex items-center justify-center bg-slate-800 rounded-3xl border border-white/10 shadow-inner overflow-hidden"><img src={editingVip.frameUrl || ''} className="w-full h-full object-contain scale-[1.3]" /></div>
                       <label className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-2 transition-all">
                          <Upload size={14} /> رفع إطار الرتبة<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setEditingVip({...editingVip, frameUrl: url}), 350, 350)} />
                       </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">اسم الرتبة</label><input type="text" value={editingVip.name} onChange={e => setEditingVip({...editingVip, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">رقم المستوى</label><input type="number" value={editingVip.level} onChange={e => setEditingVip({...editingVip, level: parseInt(e.target.value) || 1})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-black outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">التكلفة</label><input type="number" value={editingVip.cost} onChange={e => setEditingVip({...editingVip, cost: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-yellow-500 font-black text-xs outline-none" /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">لون الاسم (Style)</label><input type="text" value={editingVip.nameStyle} onChange={e => setEditingVip({...editingVip, nameStyle: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-[10px] font-bold outline-none" /></div>
                    </div>
                    <button onClick={async () => { const newVips = vipLevels.filter(v => v.level !== editingVip.level); saveVipToDb([...newVips, editingVip as VIPPackage]); setEditingVip(null); }} className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black rounded-2xl shadow-xl active:scale-95 transition-all">حفظ الرتبة</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default AdminPanel;
