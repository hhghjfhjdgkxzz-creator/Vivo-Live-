
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Room, User, ChatMessage, Gift, UserLevel, GameSettings, GlobalAnnouncement, LuckyBag, StoreItem, ItemType, GiftAnimationType } from '../types';
import { DEFAULT_REACTIONS } from '../constants/emojis';
import { 
  Mic, MicOff, Gift as GiftIcon, X, Send, LayoutGrid, Gamepad2, Settings, 
  ChevronDown, Clover, Sparkles, RotateCcw, LogOut, ShieldCheck, Gem, 
  Timer, Zap, Eraser, Users as UsersIcon, UserMinus, Menu, Plus, Star, 
  Crown, Briefcase, Lock, Unlock, Image as ImageIcon, ShieldAlert, 
  Check, Users, Minimize2, ChevronUp, Flag, StarOff, Palette, 
  Calculator, MessageSquarePlus, ShieldQuestion, Trophy, Swords, 
  UserPlus, Settings2, PaintRoller, VolumeX, RefreshCcw, Coins, Smile, ShoppingBag, MessageSquare, TrendingUp, Wallet, ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserProfileSheet from './UserProfileSheet';
import Toast, { ToastMessage } from './Toast';
import WheelGameModal from './WheelGameModal';
import SlotsGameModal from './SlotsGameModal';
import GameCenterModal from './GameCenterModal';
import RoomSettingsModal from './RoomSettingsModal';
import LuckyBagModal from './LuckyBagModal';
import WinStrip from './WinStrip';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, increment, getDoc, writeBatch } from 'firebase/firestore';

interface VoiceRoomProps {
  room: Room;
  onLeave: () => void;
  onMinimize: () => void;
  currentUser: User;
  onUpdateUser: (user: Partial<User>) => Promise<any>;
  gifts: Gift[];
  onEditProfile: () => void;
  gameSettings: GameSettings;
  onUpdateRoom: (roomId: string, data: Partial<Room>) => Promise<any>;
  isMuted: boolean;
  onToggleMute: () => void;
  onAnnouncement: (ann: GlobalAnnouncement) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  onOpenPrivateChat: (partner: User) => void;
  onToggleFollow: (targetId: string) => void;
  handleLogout: () => void;
  storeItems?: StoreItem[];
}

interface ComboState {
  gift: Gift | null;
  recipientIds: string[];
  timer: number;
  count: number;
  active: boolean;
}

const QUANTITY_OPTIONS = [1, 10, 77, 99, 188, 520, 999, 1314];

const VoiceRoom: React.FC<VoiceRoomProps> = ({ 
  room, onLeave, onMinimize, currentUser, gifts = [], gameSettings, onUpdateRoom, isMuted, onToggleMute, onUpdateUser, onAnnouncement, users = [], setUsers, onEditProfile, onOpenPrivateChat, onToggleFollow, handleLogout, storeItems = []
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showLuckyBagModal, setShowLuckyBagModal] = useState(false);
  
  const [giftTab, setGiftTab] = useState<'popular' | 'exclusive' | 'lucky' | 'celebrity' | 'trend' | 'mybag'>('popular');
  const [bagFilter, setBagFilter] = useState<ItemType | 'all'>('all');
  
  const [showExitDropdown, setShowExitDropdown] = useState(false);
  const [showGameCenter, setShowGameCenter] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeGame, setActiveGame] = useState<'wheel' | 'slots' | null>(null);
  const [activeGiftEffect, setActiveGiftEffect] = useState<Gift | null>(null);
  
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [showQtyDropdown, setShowQtyDropdown] = useState(false);
  const [selectedGiftQuantity, setSelectedGiftQuantity] = useState(1);
  const [lastSelectedGift, setLastSelectedGift] = useState<Gift | null>(null);
  const [luckyWinAmount, setLuckyWinAmount] = useState<number>(0);
  
  const [comboState, setComboState] = useState<ComboState>({ gift: null, recipientIds: [], timer: 0, count: 0, active: false });
  const [isComboPulsing, setIsComboPulsing] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHost = currentUser.id === room.hostId || currentUser.isAdmin;
  const isOnMic = room.speakers?.some(s => s.id === currentUser.id);
  const isVip = currentUser.isVip || (currentUser.vipLevel && currentUser.vipLevel > 0);

  const availableEmojis = useMemo(() => {
    const emojis = gameSettings?.availableEmojis || DEFAULT_REACTIONS;
    return [...emojis]; 
  }, [gameSettings?.availableEmojis]);

  useEffect(() => {
    let interval: any;
    if (comboState.active && comboState.timer > 0) {
      interval = setInterval(() => {
        setComboState(prev => {
          if (prev.timer <= 0.1) {
            clearInterval(interval);
            return { ...prev, active: false, timer: 0 };
          }
          return { ...prev, timer: prev.timer - 0.1 };
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [comboState.active]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
     const id = Date.now().toString();
     setToasts(prev => [...prev, { id, message, type }]);
     setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000);
  }, []);

  const renderGiftIcon = (icon: string) => {
    if (!icon) return null;
    const isImage = icon.includes('http') || icon.includes('data:image') || icon.includes('base64');
    return isImage ? <img src={icon} className="w-full h-full object-contain" alt="" /> : <span className="text-3xl">{icon}</span>;
  };

  const handleSendEmoji = async (emoji: string) => {
    if (!isOnMic && !isVip) {
      addToast('يجب أن تكون على الميكروفون أو VIP لاستخدام التفاعلات', 'error');
      setShowEmojiPicker(false);
      return;
    }
    
    setShowEmojiPicker(false);

    if (isOnMic) {
      const updatedSpeakers = (room.speakers || []).map(s => s.id === currentUser.id ? { ...s, activeEmoji: emoji } : s);
      await onUpdateRoom(room.id, { speakers: updatedSpeakers });
      
      const duration = (gameSettings.emojiDuration || 1.5) * 1000;
      setTimeout(async () => {
        const roomSnap = await getDoc(doc(db, 'rooms', room.id));
        if (roomSnap.exists()) {
          const currentRoom = roomSnap.data() as Room;
          const currentSpeakers = (currentRoom.speakers || []).map(s => s.id === currentUser.id ? { ...s, activeEmoji: null } : s);
          onUpdateRoom(room.id, { speakers: currentSpeakers });
        }
      }, duration);
    } else {
      const emojiMsg: ChatMessage = { 
        id: Date.now().toString(), 
        userId: currentUser.id, 
        userName: currentUser.name, 
        userLevel: currentUser.level, 
        userNameStyle: currentUser.nameStyle || '', 
        content: `أرسل تفاعلاً: ${emoji}`, 
        type: 'text' 
      };
      setMessages(prev => [...prev, emojiMsg]);
    }
  };

  const handleSendGift = async (gift: Gift, quantity: number = 1, forceRecipientIds: string[] | null = null, isCombo: boolean = false) => {
    const recipients = forceRecipientIds || selectedRecipientIds;
    if (recipients.length === 0) {
        addToast('يرجى اختيار مستلم واحد على الأقل!', 'error');
        return;
    }
    const totalTargetCount = recipients.length;
    const totalCost = gift.cost * quantity * totalTargetCount;
    if (currentUser.coins < totalCost) { 
        addToast('رصيدك لا يكفي لإرسال الهدايا للجميع!', 'error'); 
        if (isCombo) setComboState(prev => ({ ...prev, active: false, timer: 0 }));
        return; 
    }
    if (!isCombo) setShowGiftModal(false);
    
    setComboState(prev => ({ gift, recipientIds: recipients, timer: 5, count: isCombo ? prev.count + quantity : quantity, active: true }));
    setActiveGiftEffect(null);
    setTimeout(() => setActiveGiftEffect(gift), 50);
    setTimeout(() => setActiveGiftEffect(null), 3500);

    let refundAmount = 0;
    let isLuckyWin = false;
    let winMultiplierLabel = "";
    if (gift.isLucky) {
        for(let i=0; i < totalTargetCount * quantity; i++) {
            if (Math.random() * 100 < (gameSettings.luckyGiftWinRate || 30)) {
                isLuckyWin = true;
                const roll = Math.random() * 100;
                let accumulated = 0;
                let selectedMul = gameSettings.luckyMultipliers[0];
                for (const m of gameSettings.luckyMultipliers) { 
                    accumulated += m.chance; 
                    if (roll <= accumulated) { selectedMul = m; break; } 
                }
                refundAmount += (gift.cost) * selectedMul.value;
                winMultiplierLabel = selectedMul.label;
            }
        }
        if (isLuckyWin) {
            setLuckyWinAmount(refundAmount);
            setTimeout(() => setLuckyWinAmount(0), 4000);
        }
    }

    try {
        const batch = writeBatch(db);
        const senderRef = doc(db, 'users', currentUser.id);
        batch.update(senderRef, {
            coins: increment(-totalCost + refundAmount),
            wealth: increment(totalCost)
        });

        const updatedSpeakers = [...(room.speakers || [])];
        for (const rid of recipients) {
            const charmIncrement = gift.cost * quantity;
            const recipientRef = doc(db, 'users', rid);
            batch.update(recipientRef, {
                charm: increment(charmIncrement)
            });
            const idx = updatedSpeakers.findIndex(s => s.id === rid);
            if (idx !== -1) {
                updatedSpeakers[idx] = { 
                    ...updatedSpeakers[idx], 
                    charm: (updatedSpeakers[idx].charm || 0) + charmIncrement 
                };
            }
        }

        const roomRef = doc(db, 'rooms', room.id);
        batch.update(roomRef, { speakers: updatedSpeakers });
        await batch.commit();

        const recipientNames = recipients.length === 1 ? (room.speakers?.find(s => s.id === recipients[0])?.name || 'مستخدم') : `${recipients.length} مستخدمين`;
        const giftMsg: ChatMessage = { 
            id: Date.now().toString(), 
            userId: currentUser.id, 
            userName: currentUser.name, 
            userLevel: currentUser.level, 
            content: isLuckyWin ? `ربح ${winMultiplierLabel} من ${gift.name} 🍀` : `أرسل ${gift.name} x${quantity} إلى ${recipientNames}`, 
            type: 'gift', 
            giftData: gift, 
            isLuckyWin, 
            winAmount: refundAmount 
        };
        setMessages(prev => [...prev, giftMsg]);

        if (totalCost >= 2000 || isLuckyWin) { 
            onAnnouncement({ 
                id: Date.now().toString(), 
                senderName: currentUser.name, 
                recipientName: recipientNames, 
                giftName: gift.name, 
                giftIcon: gift.icon, 
                roomTitle: room.title, 
                roomId: room.id, 
                type: isLuckyWin ? 'lucky_win' : 'gift', 
                amount: isLuckyWin ? refundAmount : totalCost, 
                timestamp: new Date() 
            }); 
        }
    } catch (err) {
        console.error("Gift transaction failed:", err);
    }
  };

  const handleSeatClick = async (index: number) => {
    const userAtSeat = seats[index];
    
    if (userAtSeat) {
      setSelectedUser(userAtSeat);
      return;
    }

    if (room.isLocked && !isHost) {
      addToast('الغرفة مقفلة حالياً 🔒', 'error');
      return;
    }

    try {
      const existingSpeakerData = (room.speakers || []).find(s => s.id === currentUser.id);
      const otherSpeakers = (room.speakers || []).filter(s => s.id !== currentUser.id);
      
      const updatedSeatData = {
        ...currentUser,
        ...(existingSpeakerData || {}),
        seatIndex: index,
        isMuted: existingSpeakerData ? !!existingSpeakerData.isMuted : false
      };

      // الانتقال الفوري في الخلفية دون رسائل "تم التنقل" المزعجة
      await onUpdateRoom(room.id, { speakers: [...otherSpeakers, updatedSeatData] });
      
      // التنبيه فقط عند الصعود لأول مرة
      if (!existingSpeakerData) {
         addToast('تم الصعود على الميكروفون 🎙️', 'success');
      }
    } catch (err) {
      console.error("Mic update failed:", err);
    }
  };

  const handleLeaveMic = async () => {
    const updatedSpeakers = (room.speakers || []).filter(s => s.id !== currentUser.id);
    await onUpdateRoom(room.id, { speakers: updatedSpeakers });
    setShowToolsDropdown(false);
  };

  const handleResetCharisma = async () => {
    if (!confirm('هل أنت متأكد من تصفير كاريزما كافة المتواجدين على المقاعد؟')) return;
    try {
      const resetSpeakers = (room.speakers || []).map(s => ({ ...s, charm: 0 }));
      await onUpdateRoom(room.id, { speakers: resetSpeakers });
      addToast('تم تصفير الكاريزما بنجاح ✅', 'success');
      setShowToolsDropdown(false);
    } catch (err) {
      addToast('فشل تصفير الكاريزما', 'error');
    }
  };

  const seats = useMemo(() => {
    const s = new Array(8).fill(null);
    if (!room.speakers) return s;
    for (const speaker of room.speakers) {
      if (speaker.seatIndex !== undefined && speaker.seatIndex >= 0 && speaker.seatIndex < 8) {
        s[speaker.seatIndex] = speaker;
      }
    }
    return s;
  }, [room.speakers]);

  const renderEmojiContent = (emoji: string, isPicker: boolean = false) => {
    if (!emoji) return null;
    const isUrl = emoji.includes('http') || emoji.includes('data:image');
    if (isUrl) return <img src={emoji} className={`${isPicker ? 'w-10 h-10' : 'w-full h-full'} object-contain drop-shadow-md`} alt="emoji" />;
    return <span className={isPicker ? 'text-3xl' : 'text-5xl'}>{emoji}</span>;
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]);
  };

  const selectAllSpeakers = () => {
    const allIds = (room.speakers || []).map(s => s.id);
    setSelectedRecipientIds(selectedRecipientIds.length === allIds.length ? [] : allIds);
  };

  const bgStyle = useMemo(() => {
    const isImageUrl = room.background?.includes('http') || room.background?.includes('data:image');
    if (isImageUrl) return { backgroundImage: `url(${room.background})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return { background: room.background || '#0f172a' };
  }, [room.background]);

  const myOwnedItems = useMemo(() => {
    let owned = storeItems.filter(item => currentUser.ownedItems?.includes(item.id));
    if (bagFilter !== 'all') {
      owned = owned.filter(item => item.type === bagFilter);
    }
    return owned;
  }, [storeItems, currentUser.ownedItems, bagFilter]);

  const renderGiftEffect = (gift: Gift) => {
    const animType = gift.animationType || 'pop';
    switch(animType) {
      case 'pop':
        return (
          <motion.div initial={{ scale: 0, opacity: 0, y: 100 }} animate={{ scale: [0, 1.2, 1], opacity: 1, y: 0 }} exit={{ scale: 2, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.3)]">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      case 'fly':
        return (
          <motion.div initial={{ y: 600, opacity: 0, scale: 0.5 }} animate={{ y: -600, opacity: [0, 1, 1, 0], scale: 1.5 }} transition={{ duration: 2.5, ease: "easeInOut" }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <div className="w-32 h-32 flex items-center justify-center drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      case 'full-screen':
        return (
          <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: [0.2, 2.5, 2.3], opacity: [0, 1, 1, 0] }} transition={{ duration: 3, times: [0, 0.3, 0.8, 1] }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[1px]">
             <div className="w-72 h-72 flex items-center justify-center">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      case 'shake':
        return (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1.3, opacity: 1, x: [0, -20, 20, -20, 20, 0], y: [0, 10, -10, 10, -10, 0] }} transition={{ duration: 1.5, x: { repeat: 3, duration: 0.15 } }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <div className="w-40 h-40 bg-red-500/10 backdrop-blur rounded-full flex items-center justify-center border-4 border-red-500/30 shadow-[0_0_100px_rgba(239,68,68,0.5)]">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      case 'glow':
        return (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1.1 }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <motion.div animate={{ scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-52 h-52 bg-amber-500/20 backdrop-blur-3xl rounded-full flex items-center justify-center border border-amber-500/50 shadow-[0_0_150px_rgba(245,158,11,0.6)]">
                <div className="scale-150">{renderGiftIcon(gift.icon)}</div>
             </motion.div>
          </motion.div>
        );
      case 'bounce':
        return (
          <motion.div initial={{ y: -400, opacity: 0 }} animate={{ y: [ -400, 0, -80, 0, -30, 0 ], opacity: 1 }} transition={{ duration: 1.5, times: [0, 0.4, 0.6, 0.8, 0.9, 1] }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <div className="w-36 h-36 flex items-center justify-center drop-shadow-2xl">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      case 'rotate':
        return (
          <motion.div initial={{ rotate: -180, scale: 0, opacity: 0 }} animate={{ rotate: 720, scale: 1.8, opacity: [0, 1, 1, 0] }} transition={{ duration: 2, ease: "easeOut" }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <div className="w-40 h-40 flex items-center justify-center">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      case 'slide-up':
        return (
          <motion.div initial={{ y: 500, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} transition={{ type: "spring", damping: 15 }} className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
             <div className="w-48 h-48 bg-white/5 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">{renderGiftIcon(gift.icon)}</div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden" style={bgStyle}>
      <Toast toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <AnimatePresence>{luckyWinAmount > 0 && <WinStrip amount={luckyWinAmount} />}</AnimatePresence>
      <AnimatePresence>{activeGiftEffect && renderGiftEffect(activeGiftEffect)}</AnimatePresence>

      <div className="flex justify-between items-center p-4 pt-12 bg-gradient-to-b from-black/80 to-transparent shrink-0">
         <div className="flex items-center gap-3 relative">
            <button onClick={() => setShowExitDropdown(!showExitDropdown)} className="w-9 h-9 flex items-center justify-center bg-black/40 rounded-xl transition-transform active:scale-90">
              <ChevronDown size={20} className={`text-white transition-transform ${showExitDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
               {showExitDropdown && (
                  <>
                     <div className="fixed inset-0 z-[190]" onClick={() => setShowExitDropdown(false)}></div>
                     <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-12 right-0 w-44 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden">
                        <button onClick={onLeave} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"><div className="p-1.5 bg-red-500/20 text-red-500 rounded-lg"><LogOut size={16}/></div><span className="text-xs font-black text-white">خروج من الغرفة</span></button>
                        <button onClick={onMinimize} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"><div className="p-1.5 bg-amber-500/20 text-amber-500 rounded-lg"><Minimize2 size={16}/></div><span className="text-xs font-black text-white">تصغير الغرفة</span></button>
                     </motion.div>
                  </>
               )}
            </AnimatePresence>
            <div className="text-white">
               <div className="flex items-center gap-1.5"><h2 className="font-black text-sm truncate max-w-[120px]">{room.title}</h2></div>
               <p className="text-[10px] opacity-60">ID: {room.id}</p>
            </div>
         </div>
         <div className="bg-black/40 px-4 py-1.5 rounded-full flex items-center gap-2">
            <UsersIcon size={12} className="text-emerald-400" />
            <span className="text-xs font-black text-white">{room.listeners || 0}</span>
         </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto mt-4 scrollbar-hide">
         <div className="grid grid-cols-4 gap-x-3 gap-y-24 pt-12">
            {seats.map((speaker, index) => (
               <div key={index} className="flex flex-col items-center relative">
                  <button onClick={() => handleSeatClick(index)} className="relative w-full aspect-square flex flex-col items-center justify-center transition-all">
                     {speaker ? (
                        <div className="relative w-full flex flex-col items-center">
                           <div className="relative z-10 w-16 h-16">
                              <div className="w-full h-full rounded-full overflow-hidden p-0.5 border border-white/20 shadow-xl bg-slate-800">
                                 <img src={speaker.avatar} className="w-full h-full rounded-full object-cover" />
                              </div>
                              {speaker.frame && <img src={speaker.frame} className="absolute inset-0 w-full h-full object-contain z-20 scale-[1.4] pointer-events-none" />}
                              <AnimatePresence>
                                {speaker.activeEmoji && (
                                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.3 }} className="absolute -top-4 inset-x-0 z-30 flex items-center justify-center pointer-events-none drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                                    <div className="w-14 h-14 flex items-center justify-center">
                                       {renderEmojiContent(speaker.activeEmoji)}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                           <div className="absolute -bottom-16 flex flex-col items-center w-full">
                              <span className={`text-[10px] font-black truncate max-w-[70px] ${speaker.nameStyle || 'text-white'}`}>{speaker.name}</span>
                              <div className="flex items-center gap-1 bg-black/40 px-2 rounded-full border border-white/10 mt-1">
                                 <Sparkles size={8} className="text-amber-400" />
                                 <span className="text-[9px] text-white font-black">{(speaker.charm || 0).toLocaleString()}</span>
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-900/60 border border-white/5 flex items-center justify-center shadow-inner group hover:bg-slate-800 transition-colors">
                           <Plus size={10} className="text-slate-500 group-hover:text-white" />
                        </div>
                     )}
                  </button>
               </div>
            ))}
         </div>
      </div>

      <div className="h-[40%] bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-4 pt-10 flex flex-col justify-end shrink-0">
         <div className="overflow-y-auto mb-4 space-y-2.5 pr-1 scrollbar-hide flex-1">
            {messages.map((msg) => (
               <div key={msg.id} className="flex flex-col items-start">
                  {msg.type === 'gift' ? (
                     <div className="rounded-2xl p-2 pr-5 pl-2.5 flex items-center gap-3 bg-white/5 border border-white/10">
                        <div className="w-10 h-10 bg-black/40 p-1.5 flex items-center justify-center shrink-0 border border-white/5">
                           {renderGiftIcon(msg.giftData?.icon || '')}
                        </div>
                        <div className="flex flex-col"><span className={`text-xs font-black ${msg.userNameStyle || 'text-amber-400'}`}>{msg.userName}</span><span className="text-[10px] text-white/80">{msg.content}</span></div>
                     </div>
                  ) : (
                     <div className="flex items-start gap-2.5 max-w-[92%]"><div className="flex flex-col"><span className={`text-[10px] mb-0.5 font-bold ${msg.userNameStyle || 'text-slate-400'}`}>{msg.userName}</span><div className="rounded-xl px-4 py-2 text-xs text-white bg-white/10 border border-white/10 shadow-lg">{msg.content}</div></div></div>
                  )}
               </div>
            ))}
            <div ref={messagesEndRef} />
         </div>

         <div className="flex items-center gap-2.5 mt-2">
            <div className="flex-1 bg-white/5 rounded-2xl h-14 flex items-center px-5 border border-white/10 relative">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`mr-1 transition-colors p-1 ${showEmojiPicker ? 'text-amber-400' : 'text-slate-400'}`}><Smile size={24} /></button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-[190]" onClick={() => setShowEmojiPicker(false)}></div>
                      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-[88px] left-0 right-0 bg-[#0a0c14]/98 backdrop-blur-3xl border-t border-white/10 p-5 shadow-[0_-15px_60px_rgba(0,0,0,0.9)] z-[200] flex flex-col gap-4">
                         <div className="flex items-center justify-between px-3">
                            <div className="flex items-center gap-2">
                               <Sparkles size={14} className="text-amber-400" />
                               <span className="text-xs font-black text-white uppercase tracking-widest">تفاعلات الميكروفون والـ VIP</span>
                            </div>
                            <div className="w-16 h-1 bg-white/20 rounded-full"></div>
                         </div>
                         <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                            {availableEmojis.map((emoji, index) => (
                              <button key={index} onClick={() => handleSendEmoji(emoji)} className="shrink-0 w-16 h-16 bg-white/5 hover:bg-amber-500/20 rounded-[1.5rem] active:scale-90 transition-all flex items-center justify-center border border-white/10 shadow-2xl snap-center group">
                                <div className="group-hover:scale-110 transition-transform duration-300">{renderEmojiContent(emoji, true)}</div>
                              </button>
                            ))}
                         </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (() => {
                  if (!inputValue.trim()) return;
                  const newMsg: ChatMessage = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name, userLevel: currentUser.level, userNameStyle: currentUser.nameStyle || '', content: inputValue, type: 'text', bubbleUrl: currentUser.activeBubble || '' };
                  setMessages(prev => [...prev, newMsg]);
                  setInputValue('');
                })()} placeholder="قل شيئاً جميلاً..." className="bg-transparent text-white w-full outline-none text-sm text-right font-medium" />
                <button onClick={() => {
                   if (!inputValue.trim()) return;
                   const newMsg: ChatMessage = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name, userLevel: currentUser.level, userNameStyle: currentUser.nameStyle || '', content: inputValue, type: 'text', bubbleUrl: currentUser.activeBubble || '' };
                   setMessages(prev => [...prev, newMsg]);
                   setInputValue('');
                }} className="ml-3 text-blue-400"><Send size={20} /></button>
            </div>
            <div className="flex items-center gap-2 shrink-0 relative">
                <AnimatePresence>
                    {comboState.active && (
                        <motion.div initial={{ scale: 0, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute -top-16 left-0 flex flex-col items-center justify-center z-[70]">
                            <button onClick={() => {
                                if (!comboState.active || !comboState.gift) return;
                                setIsComboPulsing(true);
                                setTimeout(() => setIsComboPulsing(false), 200);
                                handleSendGift(comboState.gift, 1, comboState.recipientIds, true);
                            }} className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all border-2 active:scale-95 shadow-2xl overflow-hidden ${isComboPulsing ? 'scale-110 brightness-125' : ''}`} style={{ background: 'rgba(139, 92, 246, 0.45)', backdropFilter: 'blur(15px)', borderColor: 'rgba(167, 139, 250, 0.8)' }}>
                                <div className="w-10 h-10 flex items-center justify-center z-10 drop-shadow-lg">{comboState.gift && renderGiftIcon(comboState.gift.icon)}</div>
                                <div className="absolute bottom-1 inset-x-0 flex justify-center"><span className="text-[10px] font-black text-white bg-black/40 px-2 rounded-full">{Math.ceil(comboState.timer)}s</span></div>
                            </button>
                            <motion.div key={comboState.count} initial={{ scale: 1.8, y: -5 }} animate={{ scale: 1, y: 0 }} className="absolute -top-3 -right-3 bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 text-black text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#020617] z-20 shadow-xl">x{comboState.count}</motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={onToggleMute} className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isMuted ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-blue-600 text-white border-blue-400 shadow-xl'}`}>{isMuted ? <MicOff size={22} /> : <Mic size={22} />}</button>
                    <div className="relative">
                      <button onClick={() => setShowToolsDropdown(!showToolsDropdown)} className={`w-12 h-12 bg-gradient-to-br from-indigo-500 to-slate-700 rounded-2xl text-white shadow-xl flex items-center justify-center border border-white/20 transition-all active:scale-95 ${showToolsDropdown ? 'brightness-125 ring-2 ring-indigo-400' : ''}`}><LayoutGrid size={22} /></button>
                      <AnimatePresence>
                        {showToolsDropdown && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setShowToolsDropdown(false)}></div>
                            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-6 left-4 right-4 bg-[#0a0a0b]/95 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 z-[110] overflow-hidden">
                               <div className="w-10 h-1.5 bg-white/10 rounded-full mx-auto mb-6"></div>
                               <div className="flex items-center justify-between mb-6 px-2"><div className="flex flex-col"><h3 className="text-white font-black text-lg">أدوات الغرفة</h3><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Vivo Live Tools</span></div><button onClick={() => setShowToolsDropdown(false)} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white transition-colors"><X size={18}/></button></div>
                               <div className="grid grid-cols-4 gap-y-6 gap-x-2 text-center pb-2">
                                  <ToolItem icon={isMuted ? <MicOff size={22}/> : <Mic size={22}/>} label="الصوت" onClick={() => { onToggleMute(); setShowToolsDropdown(false); }} />
                                  <ToolItem icon={<Gamepad2 size={22}/>} label="الألعاب" onClick={() => { setShowGameCenter(true); setShowToolsDropdown(false); }} />
                                  <ToolItem icon={<Briefcase size={22}/>} label="حقيبة" onClick={() => { setShowLuckyBagModal(true); setShowToolsDropdown(false); }} />
                                  {isHost && (<ToolItem icon={room.isLocked ? <Unlock size={22}/> : <Lock size={22}/>} label={room.isLocked ? "فتح" : "قفل"} onClick={() => { onUpdateRoom(room.id, { isLocked: !room.isLocked }); setShowToolsDropdown(false); }} />)}
                                  {isHost && <ToolItem icon={<Settings size={22}/>} label="إعدادات" onClick={() => { setShowSettingsModal(true); setShowToolsDropdown(false); }} />}
                                  {isHost && <ToolItem icon={<RotateCcw size={22}/>} label="تصفير" onClick={() => { handleResetCharisma(); setShowToolsDropdown(false); }} />}
                                  {isOnMic && <ToolItem icon={<ArrowRightLeft size={22}/>} label="تنقل" onClick={() => { addToast('انقر على مقعد فارغ للانتقال إليه', 'info'); setShowToolsDropdown(false); }} />}
                                  {isOnMic && !isHost && <ToolItem icon={<UserMinus size={22}/>} label="نزول" onClick={() => { handleLeaveMic(); setShowToolsDropdown(false); }} />}
                               </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <button onClick={() => { if (room.speakers?.length === 1) setSelectedRecipientIds([room.speakers[0].id]); setShowGiftModal(true); }} className="w-12 h-12 bg-gradient-to-br from-pink-500 to-indigo-700 rounded-2xl text-white shadow-xl flex items-center justify-center border border-white/20"><GiftIcon size={22} /></button>
                    <button onClick={() => setShowGameCenter(true)} className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl text-white shadow-xl flex items-center justify-center border border-white/20"><Gamepad2 size={22} /></button>
                </div>
            </div>
         </div>
      </div>

      <AnimatePresence>
         {showGiftModal && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowGiftModal(false)}>
               <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl rounded-t-[2rem] border-t border-white/10 flex flex-col h-[70vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  
                  <div className="relative pt-4 px-4 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-3"></div>
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-white font-black text-base">صندوق الهدايا</h3>
                       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg">
                          <Coins size={14} className="text-amber-500 animate-pulse" />
                          <div className="flex flex-col items-end">
                             <span className="text-[7px] text-amber-500/60 font-black uppercase leading-none">رصيدك</span>
                             <span className="text-yellow-400 font-black text-xs leading-none mt-0.5">{(currentUser.coins ?? 0).toLocaleString()}</span>
                          </div>
                       </motion.div>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-white/5 mt-2 flex items-center justify-between border-y border-white/5 h-12" dir="rtl">
                    <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
                      <div className="flex items-center shrink-0 ml-1">
                        <div className={`p-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center`}>
                           <Users size={12} />
                        </div>
                      </div>
                      {room.speakers?.map(speaker => { 
                        const isSelected = selectedRecipientIds.includes(speaker.id); 
                        return (
                          <button key={speaker.id} onClick={() => toggleRecipient(speaker.id)} className="shrink-0 relative active:scale-90 transition-transform">
                             <div className={`w-8 h-8 rounded-full p-0.5 transition-all duration-300 ${isSelected ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#0a0c14] scale-105' : 'opacity-40 grayscale'}`}>
                                <img src={speaker.avatar} className="w-full h-full rounded-full object-cover border border-white/10 shadow-sm" alt="" />
                             </div>
                             {isSelected && (
                               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 bg-amber-500 text-black p-0.5 rounded-full z-10 shadow-lg ring-1 ring-black">
                                  <Check size={5} strokeWidth={5} />
                               </motion.div>
                             )}
                          </button>
                        ); 
                      })}
                    </div>
                    
                    <button 
                      onClick={selectAllSpeakers} 
                      className={`ml-1 px-3 h-7 rounded-full text-[9px] font-black transition-all flex items-center gap-1.5 shrink-0 border ${
                        selectedRecipientIds.length === (room.speakers?.length || 0) 
                          ? 'bg-amber-500 text-black border-amber-600 shadow-md' 
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Users size={10} />
                      {selectedRecipientIds.length === (room.speakers?.length || 0) ? 'إلغاء' : 'الكل'}
                    </button>
                  </div>
                  
                  <div className="px-4 mt-2 flex items-center justify-between border-b border-white/5 overflow-x-auto scrollbar-hide shrink-0" dir="rtl">
                    <div className="flex gap-4 shrink-0">
                      {[
                        { id: 'popular', label: 'شائع' }, 
                        { id: 'exclusive', label: 'مميز' }, 
                        { id: 'lucky', label: 'الحظ' },
                        { id: 'celebrity', label: 'مشاهير', icon: Star },
                        { id: 'trend', label: 'ترندات', icon: TrendingUp },
                        { id: 'mybag', label: 'حقيبتي', icon: ShoppingBag }
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setGiftTab(tab.id as any)} className={`text-[10px] font-black transition-all flex items-center gap-1 pb-2 border-b-2 relative ${giftTab === tab.id ? 'text-amber-400 border-amber-400' : 'text-white/30 border-transparent'}`}>
                          {tab.icon && <tab.icon size={10} />}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {giftTab === 'mybag' && (
                     <div className="px-4 py-1.5 flex gap-2 overflow-x-auto scrollbar-hide bg-white/5" dir="rtl">
                        <button onClick={() => setBagFilter('all')} className={`shrink-0 px-3 py-1 rounded-lg text-[9px] font-black border transition-all ${bagFilter === 'all' ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/5 text-slate-500 border-white/5'}`}>الكل</button>
                        <button onClick={() => setBagFilter('frame')} className={`shrink-0 px-3 py-1 rounded-lg text-[9px] font-black border transition-all ${bagFilter === 'frame' ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/5 text-slate-500 border-white/5'}`}>إطارات</button>
                        <button onClick={() => setBagFilter('bubble')} className={`shrink-0 px-3 py-1 rounded-lg text-[9px] font-black border transition-all ${bagFilter === 'bubble' ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/5 text-slate-500 border-white/5'}`}>فقاعات</button>
                     </div>
                  )}
                  
                  <div className="grid grid-cols-4 gap-2 p-3 overflow-y-auto scrollbar-hide flex-1" dir="rtl">
                    {giftTab === 'mybag' ? (
                       myOwnedItems.length > 0 ? (
                         myOwnedItems.map(item => (
                            <button 
                              key={item.id} 
                              onClick={async () => {
                                 const updates = item.type === 'frame' ? { frame: item.url } : { activeBubble: item.url };
                                 await onUpdateUser(updates);
                                 addToast(`تم تفعيل ${item.name} ✅`, 'success');
                              }}
                              className={`group flex flex-col items-center p-2 rounded-2xl border transition-all border-white/5 bg-white/5 hover:bg-white/10 relative shadow-md`}
                            >
                               <div className="w-10 h-10 mb-1.5 flex items-center justify-center relative">
                                  {item.type === 'frame' ? (
                                    <>
                                      <img src={currentUser.avatar} className="w-7 h-7 rounded-full opacity-40" />
                                      <img src={item.url} className="absolute inset-0 w-full h-full object-contain scale-[1.3]" />
                                    </>
                                  ) : item.type === 'bubble' ? (
                                     <div className="w-10 h-8 rounded-lg bg-white/10 border border-white/10 overflow-hidden shadow-inner"><img src={item.url} className="w-full h-full object-cover" /></div>
                                  ) : <img src={item.url} className="w-10 h-10 object-contain" />}
                               </div>
                               <span className="text-white text-[8px] font-black truncate w-full text-center">{item.name}</span>
                               <div className="text-blue-400 text-[7px] font-black uppercase mt-0.5 tracking-tighter">مملوك</div>
                               {(currentUser.frame === item.url || currentUser.activeBubble === item.url) && (
                                  <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><Check size={6} className="text-white" strokeWidth={4} /></div>
                               )}
                            </button>
                         ))
                       ) : (
                         <div className="col-span-4 py-16 text-center text-slate-500 text-[10px] font-bold opacity-30">لا توجد عناصر مطابقة</div>
                       )
                    ) : (
                      gifts.filter(g => { 
                        if (giftTab === 'lucky') return g.isLucky; 
                        if (giftTab === 'exclusive') return g.category === 'exclusive'; 
                        if (giftTab === 'celebrity') return g.category === 'celebrity';
                        if (giftTab === 'trend') return g.category === 'trend';
                        return g.category === 'popular' || !g.category; 
                      }).map(gift => (
                        <button key={gift.id} onClick={() => setLastSelectedGift(gift)} className={`group flex flex-col items-center p-2 rounded-2xl border transition-all duration-300 ${lastSelectedGift?.id === gift.id ? 'border-amber-400 bg-amber-400/10 shadow-lg' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                           <div className="w-10 h-10 mb-1.5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                              {renderGiftIcon(gift.icon)}
                           </div>
                           <span className="text-white text-[9px] font-black truncate w-full text-center leading-none mb-1">{gift.name}</span>
                           <div className="text-yellow-400 text-[9px] font-black flex items-center gap-0.5"><span className="text-[7px]">🪙</span> {gift.cost}</div>
                        </button>
                      ))
                    )}
                  </div>
                  
                  {giftTab !== 'mybag' && (
                    <div className="p-4 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-3 shrink-0" dir="rtl">
                       <div className="relative shrink-0">
                          <button onClick={() => setShowQtyDropdown(!showQtyDropdown)} className="flex items-center gap-1.5 bg-slate-800 border border-white/10 px-4 py-2 rounded-xl text-white font-black text-xs active:scale-95 transition-all">
                             x{selectedGiftQuantity} <ChevronUp size={14} className={`transition-transform duration-300 ${showQtyDropdown ? '' : 'rotate-180'}`} />
                          </button>
                          <AnimatePresence>
                             {showQtyDropdown && (
                                <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }} className="absolute bottom-full mb-2 right-0 bg-slate-800 border border-white/10 rounded-2xl p-2 w-40 shadow-2xl grid grid-cols-2 gap-1 z-[130]">
                                   {QUANTITY_OPTIONS.map(qty => (
                                      <button key={qty} onClick={() => { setSelectedGiftQuantity(qty); setShowQtyDropdown(false); }} className={`py-2 rounded-lg text-[10px] font-black transition-all ${selectedGiftQuantity === qty ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-white/5'}`}>x{qty}</button>
                                   ))}
                                </motion.div>
                             )}
                          </AnimatePresence>
                       </div>
                       
                       <button disabled={!lastSelectedGift} onClick={() => lastSelectedGift && handleSendGift(lastSelectedGift, selectedGiftQuantity)} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black py-2.5 rounded-xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
                          <span className="text-sm">إرسال</span>
                          <span className="bg-black/10 px-1.5 py-0.5 rounded-lg text-[9px] font-bold">{(lastSelectedGift?.cost || 0) * selectedGiftQuantity * selectedRecipientIds.length} 🪙</span>
                       </button>
                    </div>
                  )}
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <LuckyBagModal isOpen={showLuckyBagModal} onClose={() => setShowLuckyBagModal(false)} onSend={(amount, recipients) => {
         const bagData = { senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar, roomId: room.id, roomTitle: room.title, totalAmount: amount, remainingAmount: amount, recipientsLimit: recipients, claimedBy: [], createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + 600000) };
         addDoc(collection(db, 'lucky_bags'), bagData);
         onUpdateUser({ coins: (currentUser.coins || 0) - amount, wealth: (currentUser.wealth || 0) + amount });
         onAnnouncement({ id: Date.now().toString(), senderName: currentUser.name, recipientName: 'الجميع', giftName: 'حقيبة حظ عالمية', giftIcon: '💰', roomTitle: room.title, roomId: room.id, type: 'lucky_bag', amount: amount, timestamp: new Date() } as any);
      }} userCoins={currentUser.coins} />
      <GameCenterModal isOpen={showGameCenter} onClose={() => setShowGameCenter(false)} onSelectGame={(game) => { setActiveGame(game); setShowGameCenter(false); }} />
      <RoomSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} room={room} onUpdate={onUpdateRoom} />
      <WheelGameModal isOpen={activeGame === 'wheel'} onClose={() => setActiveGame(null)} userCoins={currentUser.coins} onUpdateCoins={(c) => onUpdateUser({ coins: c })} winRate={gameSettings.wheelWinRate} gameSettings={gameSettings} />
      <SlotsGameModal isOpen={activeGame === 'slots'} onClose={() => setActiveGame(null)} userCoins={currentUser.coins} onUpdateCoins={(c) => onUpdateUser({ coins: c })} winRate={gameSettings.slotsWinRate} gameSettings={gameSettings} />

      <AnimatePresence>
        {selectedUser && (
           <UserProfileSheet 
              user={selectedUser} onClose={() => setSelectedUser(null)} isCurrentUser={selectedUser.id === currentUser.id} currentUser={currentUser} 
              onAction={async (act, data) => {
                 if (act === 'gift') { setSelectedUser(null); setSelectedRecipientIds([selectedUser.id]); setShowGiftModal(true); }
                 if (act === 'editProfile') onEditProfile();
                 if (act === 'message') { setSelectedUser(null); onOpenPrivateChat(data); }
                 if (act === 'toggleFollow') onToggleFollow(data);
                 if (act === 'toggleMute') {
                    const updatedSpeakers = (room.speakers || []).map(s => s.id === selectedUser.id ? { ...s, isMuted: !s.isMuted } : s);
                    onUpdateRoom(room.id, { speakers: updatedSpeakers });
                    setSelectedUser({ ...selectedUser, isMuted: !selectedUser.isMuted });
                 }
              }}
           />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ToolItem: React.FC<{icon: React.ReactNode, label: string, onClick: () => void}> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 group active:scale-90 transition-all">
     <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-all border border-white/5">{icon}</div>
     <span className="text-[10px] font-black text-slate-500 group-hover:text-white transition-colors">{label}</span>
  </button>
);

export default VoiceRoom;
