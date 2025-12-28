
import React, { useState, useEffect, useMemo } from 'react';
import { Home, User as UserIcon, Plus, Bell, Crown, Gem, Settings, ChevronRight, Edit3, Share2, LogOut, Shield, Database, ShoppingBag, Camera, Trophy, Flame, Sparkles, UserX, Star, ShieldCheck, MapPin, Download, Smartphone, MessageCircle, Languages } from 'lucide-react';
import RoomCard from './components/RoomCard';
import VoiceRoom from './components/VoiceRoom';
import AuthScreen from './components/AuthScreen';
import Toast, { ToastMessage } from './components/Toast';
import VIPModal from './components/VIPModal';
import EditProfileModal from './components/EditProfileModal';
import BagModal from './components/BagModal';
import CreateRoomModal from './components/CreateRoomModal';
import GlobalBanner from './components/GlobalBanner';
import GlobalLuckyBagBanner from './components/GlobalLuckyBagBanner';
import AdminPanel from './components/AdminPanel';
import MiniPlayer from './components/MiniPlayer';
import PrivateChatModal from './components/PrivateChatModal';
import MessagesTab from './components/MessagesTab';
import { DEFAULT_VIP_LEVELS, DEFAULT_GIFTS, DEFAULT_STORE_ITEMS } from './constants';
import { Room, User, VIPPackage, UserLevel, Gift, StoreItem, GameSettings, GlobalAnnouncement, LuckyBag } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { db, auth } from './services/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, addDoc, getDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, increment, limit, where } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';

const translations = {
  ar: { home: "الرئيسية", messages: "الرسائل", profile: "حسابي", createRoom: "إنشاء غرفة", topSupporters: "كبار الداعمين", activeRooms: "الغرف النشطة", noRooms: "لا توجد غرف نشطة حالياً", coinsBalance: "رصيد العملات", adminPanel: "لوحة الإدارة", editAccount: "تعديل الحساب", storeBag: "المتجر والحقيبة", vipMembership: "عضوية الـ VIP", logout: "خروج", deleteAccount: "حذف الحساب نهائياً", appVersion: "نسخة الجوال متوفرة!", installNow: "تثبيت التطبيق الآن", search: "بحث في المحادثات...", id: "ID", lvl: "Lv.", confirmDelete: "هل أنت متأكد من حذف حسابك نهائياً؟" },
  en: { home: "Home", messages: "Messages", profile: "Profile", createRoom: "Create", topSupporters: "Top Supporters", activeRooms: "Active Rooms", noRooms: "No active rooms now", coinsBalance: "Coins Balance", adminPanel: "Admin Panel", editAccount: "Edit Profile", storeBag: "Store & Bag", vipMembership: "VIP Membership", logout: "Logout", deleteAccount: "Delete Account Forever", appVersion: "Mobile Version Available!", installNow: "Install App Now", search: "Search conversations...", id: "ID", lvl: "Lv.", confirmDelete: "Are you sure you want to delete your account?" }
};

const DEFAULT_LOGO = 'https://storage.googleapis.com/static.aistudio.google.com/stables/2025/03/06/f0e64906-e7e0-4a87-af9b-029e2467d302/f0e64906-e7e0-4a87-af9b-029e2467d302.png';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'profile' | 'rank'>('home');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isRoomMinimized, setIsRoomMinimized] = useState(false);
  const [isUserMuted, setIsUserMuted] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]); 
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [vipLevels, setVipLevels] = useState<VIPPackage[]>(DEFAULT_VIP_LEVELS);
  const [announcement, setAnnouncement] = useState<GlobalAnnouncement | null>(null);
  const [appBanner, setAppBanner] = useState('');
  const [privateChatPartner, setPrivateChatPartner] = useState<User | null>(null);

  const [appLogo, setAppLogo] = useState(() => {
    return localStorage.getItem('vivo_live_logo_fixed') || DEFAULT_LOGO;
  });

  const t = translations[language];

  const [gameSettings, setGameSettings] = useState<GameSettings>({
     slotsWinRate: 35, wheelWinRate: 45, luckyGiftWinRate: 30, luckyGiftRefundPercent: 200, luckyXEnabled: true,
     luckyMultipliers: [{ label: 'X10', value: 10, chance: 70 }, { label: 'X50', value: 50, chance: 20 }, { label: 'X100', value: 100, chance: 8 }, { label: 'X500', value: 500, chance: 2 }],
     wheelJackpotX: 8, wheelNormalX: 2, slotsSevenX: 20, slotsFruitX: 5, availableEmojis: [], emojiDuration: 1.5
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (appLogo) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (link) link.href = appLogo;
      const appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (appleIcon) appleIcon.href = appLogo;
      localStorage.setItem('vivo_live_logo_fixed', appLogo);
    }
  }, [appLogo]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'appSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.appBanner) setAppBanner(data.appBanner);
        if (data.appLogo && data.appLogo !== appLogo) {
          setAppLogo(data.appLogo);
        }
        if (data.gameSettings) setGameSettings(data.gameSettings);
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);
        if (user) {
          const currentInDb = usersData.find(u => u.id === user.id);
          if (currentInDb) {
            if (currentInDb.isBanned) { handleLogout(); } 
            else {
               // Update only if data is different to avoid state loops
               if (JSON.stringify(currentInDb) !== JSON.stringify(user)) {
                  setUser(currentInDb);
                  localStorage.setItem('voice_chat_user', JSON.stringify(currentInDb));
               }
            }
          }
        }
    });

    const qRooms = query(collection(db, 'rooms'), orderBy('listeners', 'desc'));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(roomsData);
      if (currentRoom) {
        const updatedCurrent = roomsData.find(r => r.id === currentRoom.id);
        if (updatedCurrent) setCurrentRoom(updatedCurrent);
        else { setCurrentRoom(null); setIsRoomMinimized(false); }
      }
    });

    const unsubGifts = onSnapshot(doc(db, 'appSettings', 'gifts'), (docSnap) => {
      if (docSnap.exists()) setGifts(docSnap.data().gifts || DEFAULT_GIFTS);
      else setGifts(DEFAULT_GIFTS);
    });

    const unsubStore = onSnapshot(doc(db, 'appSettings', 'store'), (docSnap) => {
      if (docSnap.exists()) setStoreItems(docSnap.data().items || DEFAULT_STORE_ITEMS);
      else setStoreItems(DEFAULT_STORE_ITEMS);
    });

    const unsubVip = onSnapshot(doc(db, 'appSettings', 'vip'), (docSnap) => {
      if (docSnap.exists()) setVipLevels(docSnap.data().levels || DEFAULT_VIP_LEVELS);
    });

    const savedUser = localStorage.getItem('voice_chat_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      getDoc(doc(db, 'users', parsedUser.id)).then((docSnap) => {
        if (docSnap.exists()) setUser(docSnap.data() as User);
        setTimeout(() => setInitializing(false), 1500); 
      }).catch(() => setInitializing(false));
    } else {
      setTimeout(() => setInitializing(false), 1500);
    }
    
    return () => { unsubSettings(); unsubRooms(); unsubUsers(); unsubGifts(); unsubStore(); unsubVip(); };
  }, []);

  const onUpdateAppBanner = async (url: string) => {
    setAppBanner(url);
    await setDoc(doc(db, 'appSettings', 'global'), { appBanner: url }, { merge: true });
  };

  const onUpdateAppLogo = async (url: string) => {
    setAppLogo(url);
    localStorage.setItem('vivo_live_logo_fixed', url);
    await setDoc(doc(db, 'appSettings', 'global'), { appLogo: url }, { merge: true });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null); setCurrentRoom(null);
      localStorage.removeItem('voice_chat_user');
      setActiveTab('home');
    } catch (err) { console.error(err); }
  };

  const handleCreateRoom = async (roomData: any) => {
    if (!user || !user.customId) return;
    const roomId = user.customId.toString();
    const newRoom = { ...roomData, id: roomId, hostId: user.id, listeners: 1, speakers: [{ ...user, seatIndex: 0, charm: 0 }], createdAt: serverTimestamp() };
    await setDoc(doc(db, 'rooms', roomId), newRoom);
    setShowCreateRoomModal(false);
  };

  const handleUpdateUser = async (updatedData: Partial<User>) => {
    if (!user) return;
    const userId = updatedData.id || user.id;
    
    // 1. Optimistic UI Update: تحديث فوري للحالة المحلية
    const newUserState = { ...user, ...updatedData };
    if (userId === user.id) {
       setUser(newUserState);
       localStorage.setItem('voice_chat_user', JSON.stringify(newUserState));
    }

    // 2. تحديث قاعدة بيانات المستخدمين
    await setDoc(doc(db, 'users', userId), updatedData, { merge: true });

    // 3. تحديث بيانات المتحدث في الغرفة الحالية (إن وجد) لضمان ظهور التحديث للجميع فوراً
    if (currentRoom) {
       const roomRef = doc(db, 'rooms', currentRoom.id);
       const roomSnap = await getDoc(roomRef);
       if (roomSnap.exists()) {
          const roomData = roomSnap.data() as Room;
          const updatedSpeakers = (roomData.speakers || []).map(s => 
             s.id === userId ? { ...s, ...updatedData } : s
          );
          await updateDoc(roomRef, { speakers: updatedSpeakers });
       }
    }
  };

  const handleRoomJoin = (room: Room) => {
    setCurrentRoom(room);
    setIsRoomMinimized(false);
    handleUpdateRoom(room.id, { listeners: (room.listeners || 0) + 1 });
  };

  const handleRoomLeave = async () => {
    if (!currentRoom || !user) return;
    if (user.id === currentRoom.hostId) {
      await deleteDoc(doc(db, 'rooms', currentRoom.id));
    } else {
      const updatedSpeakers = (currentRoom.speakers || []).filter(s => s.id !== user.id);
      await updateDoc(doc(db, 'rooms', currentRoom.id), { speakers: updatedSpeakers, listeners: increment(-1) });
    }
    setCurrentRoom(null);
    setIsRoomMinimized(false);
  };

  const handleUpdateRoom = async (roomId: string, data: Partial<Room>) => {
    await updateDoc(doc(db, 'rooms', roomId), data);
  };

  if (initializing) return (
    <div className="h-[100dvh] w-full bg-[#020617] flex flex-col items-center justify-center font-cairo">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
        <div className="w-44 h-44 bg-yellow-400 rounded-[3rem] overflow-hidden shadow-[0_20px_50px_rgba(251,191,36,0.3)] border-4 border-white/20 relative z-10">
          <motion.img animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} src={appLogo} className="w-full h-full object-cover" alt="App Logo" />
        </div>
        <div className="absolute -inset-10 bg-yellow-500/10 blur-[60px] rounded-full animate-pulse"></div>
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600">فـيـفـو لايف</motion.h1>
      <div className="flex gap-2 mt-6">
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={(u) => { setUser(u); localStorage.setItem('voice_chat_user', JSON.stringify(u)); }} appLogo={appLogo} />;

  return (
    <div className={`h-[100dvh] w-full bg-[#0f172a] text-white relative md:max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col font-cairo ${language === 'en' ? 'text-left' : 'text-right'}`}>
      <Toast toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <AnimatePresence>{announcement && <GlobalBanner announcement={announcement} />}</AnimatePresence>
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {activeTab === 'home' && (
           <div className="mt-2 space-y-3">
              <div className="px-4 flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                    <img src={appLogo} className="w-8 h-8 rounded-lg shadow-lg border border-white/10" alt="Logo" />
                    <div className="text-xs font-black tracking-widest text-white/40 uppercase">VIVO LIVE</div>
                 </div>
              </div>
              <div className="px-4">
                 <div className="relative w-full h-28 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-slate-800">
                   {appBanner ? <img src={appBanner} className="w-full h-full object-cover" alt="Banner" /> : <div className="w-full h-full bg-slate-800 animate-pulse"></div>}
                 </div>
              </div>
              <div className="px-4">
                 <div className="flex justify-between items-center mb-2">
                   <h2 className="text-xs font-bold text-white flex items-center gap-1.5"><Trophy size={14} className="text-yellow-500" /> {t.topSupporters}</h2>
                 </div>
                 <div className="bg-slate-900/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm overflow-x-auto">
                   <div className="flex gap-3 min-w-max">
                     {[...users].filter(u => (u.wealth || 0) > 0).sort((a, b) => (b.wealth || 0) - (a.wealth || 0)).slice(0, 10).map((contributor, idx) => (
                       <div key={contributor.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                          <img src={contributor.avatar} className={`w-12 h-12 rounded-full border-2 ${idx === 0 ? 'border-yellow-500' : 'border-slate-700'}`} alt="" />
                          <span className="text-[9px] font-bold text-white max-w-[60px] truncate">{contributor.name}</span>
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
              <div className="px-4">
                 <h2 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5"><Flame size={14} className="text-orange-500" /> {t.activeRooms}</h2>
                 <div className="grid gap-2.5">
                   {rooms.map(room => ( <RoomCard key={room.id} room={room} onClick={handleRoomJoin} /> ))}
                   {rooms.length === 0 && <div className="text-center text-slate-500 py-10 text-xs">{t.noRooms}</div>}
                 </div>
              </div>
           </div>
        )}
        {activeTab === 'messages' && <MessagesTab currentUser={user} onOpenChat={(partner) => setPrivateChatPartner(partner)} />}
        {activeTab === 'profile' && user && (
           <div className="relative">
              <div className="h-40 bg-slate-900 relative overflow-hidden">
                {user.cover ? <img src={user.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-r from-indigo-900 to-slate-900"></div>}
              </div>
              <div className="px-5 pb-10">
                 <div className="relative -mt-10 mb-4 flex justify-between items-end">
                    <div className="relative w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center">
                        <img src={user.avatar} className="w-full h-full rounded-full object-cover" />
                        {user.frame && <img src={user.frame} className="absolute inset-0 w-full h-full object-contain scale-[1.3]" />}
                    </div>
                 </div>
                 <h2 className={`text-2xl ${user.nameStyle || 'font-bold text-white'}`}>{user.name}</h2>
                 <span className="font-mono text-xs text-slate-400 block mb-6">{t.id}: {user.customId || user.id}</span>
                 <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
                    {user.isAdmin && (
                      <div onClick={() => setShowAdminPanel(true)} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-red-500/5 cursor-pointer">
                         <ChevronRight size={18} className="text-slate-600" />
                        <div className="flex items-center gap-3"><span className="text-sm font-black text-red-500">{t.adminPanel}</span><ShieldCheck size={18} className="text-red-500" /></div>
                      </div>
                    )}
                    <div onClick={() => setShowEditProfileModal(true)} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                       <ChevronRight size={18} className="text-slate-600" />
                      <div className="flex items-center gap-3"><span className="text-sm font-medium text-white">{t.editAccount}</span><Edit3 size={18} className="text-emerald-500" /></div>
                    </div>
                    <div onClick={() => setShowBagModal(true)} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                       <ChevronRight size={18} className="text-slate-600" />
                      <div className="flex items-center gap-3"><span className="text-sm font-medium text-white">{t.storeBag}</span><ShoppingBag size={18} className="text-blue-500" /></div>
                    </div>
                    <div onClick={() => setShowVIPModal(true)} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                       <ChevronRight size={18} className="text-slate-600" />
                      <div className="flex items-center gap-3"><span className="text-sm font-medium text-white">{t.vipMembership}</span><Crown size={18} className="text-amber-500" /></div>
                    </div>
                    <div onClick={handleLogout} className="flex items-center justify-between p-4 hover:bg-red-900/10 cursor-pointer">
                       <ChevronRight size={18} className="text-slate-600" />
                      <div className="flex items-center gap-3"><span className="text-sm font-medium text-red-500">{t.logout}</span><LogOut size={18} className="text-red-500" /></div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-lg border-t border-white/5 flex justify-around items-center h-20 pb-2 z-20">
         <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'home' ? 'text-amber-400' : 'text-slate-500'}`}><Home size={24} /><span className="text-[10px] font-medium">{t.home}</span></button>
         <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'messages' ? 'text-amber-400' : 'text-slate-500'}`}><MessageCircle size={24} /><span className="text-[10px] font-medium">{t.messages}</span></button>
         <button onClick={() => setShowCreateRoomModal(true)} className="flex flex-col items-center gap-1 p-2 -mt-8"><div className="bg-gradient-to-br from-amber-400 to-orange-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900"><Plus size={28} className="text-white" /></div></button>
         <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'profile' ? 'text-amber-400' : 'text-slate-500'}`}><UserIcon size={24} /><span className="text-[10px] font-medium">{t.profile}</span></button>
      </div>
      <AnimatePresence>
        {currentRoom && !isRoomMinimized && (
          <VoiceRoom room={currentRoom} currentUser={user!} onUpdateUser={handleUpdateUser} onLeave={handleRoomLeave} onMinimize={() => setIsRoomMinimized(true)} gifts={gifts} onEditProfile={() => setShowEditProfileModal(true)} gameSettings={gameSettings} onUpdateRoom={handleUpdateRoom} isMuted={isUserMuted} onToggleMute={() => setIsUserMuted(!isUserMuted)} onAnnouncement={(a) => setAnnouncement(a)} users={users} setUsers={() => {}} onOpenPrivateChat={(p) => setPrivateChatPartner(p)} onToggleFollow={() => {}} handleLogout={handleLogout} />
        )}
      </AnimatePresence>
      <AnimatePresence>{privateChatPartner && (<PrivateChatModal partner={privateChatPartner} currentUser={user!} onClose={() => setPrivateChatPartner(null)} />)}</AnimatePresence>
      {showVIPModal && user && <VIPModal user={user} vipLevels={vipLevels} onClose={() => setShowVIPModal(false)} onBuy={(v) => handleUpdateUser({ isVip: true, vipLevel: v.level, coins: user.coins - v.cost, frame: v.frameUrl, nameStyle: v.nameStyle })} />}
      {showEditProfileModal && user && <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} currentUser={user} onSave={handleUpdateUser} />}
      {showBagModal && user && <BagModal isOpen={showBagModal} onClose={() => setShowBagModal(false)} items={storeItems} user={user} onBuy={(item) => handleUpdateUser({ coins: user.coins - item.price, ownedItems: [...(user.ownedItems || []), item.id] })} onEquip={(item) => handleUpdateUser(item.type === 'frame' ? { frame: item.url } : { activeBubble: item.url })} />}
      {showCreateRoomModal && <CreateRoomModal isOpen={showCreateRoomModal} onClose={() => setShowCreateRoomModal(false)} onCreate={handleCreateRoom} />}
      {showAdminPanel && user && (<AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} currentUser={user} users={users} onUpdateUser={async (id, data) => await handleUpdateUser({ ...data, id })} rooms={rooms} setRooms={setRooms} onUpdateRoom={handleUpdateRoom} gifts={gifts} setGifts={setGifts} storeItems={storeItems} setStoreItems={setStoreItems} vipLevels={vipLevels} setVipLevels={setVipLevels} gameSettings={gameSettings} setGameSettings={setGameSettings} appBanner={appBanner} onUpdateAppBanner={onUpdateAppBanner} appLogo={appLogo} onUpdateAppLogo={onUpdateAppLogo} />)}
    </div>
  );
}
