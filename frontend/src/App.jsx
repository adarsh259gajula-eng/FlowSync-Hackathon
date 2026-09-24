import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BarChart3, 
  Activity, 
  Settings, 
  MessageSquare, 
  Bell, 
  Search, 
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Users,
  TrendingUp,
  Clock,
  Menu,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// --- MOCK DATA ---
const chartData = [
  { name: 'Mon', visitors: 4000, interactions: 2400 },
  { name: 'Tue', visitors: 3000, interactions: 1398 },
  { name: 'Wed', visitors: 2000, interactions: 9800 },
  { name: 'Thu', visitors: 2780, interactions: 3908 },
  { name: 'Fri', visitors: 1890, interactions: 4800 },
  { name: 'Sat', visitors: 2390, interactions: 3800 },
  { name: 'Sun', visitors: 3490, interactions: 4300 },
];

const initialMessages = [
  { id: 1, text: "Hey! How is the new dashboard coming along?", sender: "Alex", isMe: false, time: "10:24 AM" },
  { id: 2, text: "It's looking great! Just adding the final touches to the chat integration.", sender: "Me", isMe: true, time: "10:26 AM" },
  { id: 3, text: "Awesome, can't wait to see it. 🚀", sender: "Alex", isMe: false, time: "10:27 AM" }
];

const contacts = [
  { id: 1, name: 'Alex Stanton', status: 'online', avatar: 'https://i.pravatar.cc/150?u=alex' },
  { id: 2, name: 'Sarah Jenkins', status: 'offline', avatar: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 3, name: 'Design Team', status: 'online', avataf: 'https://i.pravatar.cc/150?u=design' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isChatOpen, setChatOpen] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: "Me",
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate reply
    setTimeout(() => {
    setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "That sounds perfect! Let's review it later.",
        sender: "Alex",
        isMe: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* 1. LEFT NAVIGATION BAR */}
      <motion.aside 
        initial={{ width: 260 }}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="h-screen bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col relative z-20 shrink-0 hidden md:flex"
      >
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex,items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 font-bold text-lg tracking-tight whitespace-nowrap"
              >
                NexDash
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
          {[
            { id: 'Overview', icon: LayoutDashboard },
            { id: 'Analytics', icon: BarChart3 },
            { id: 'Activity', icon: Activity },
            { id: 'Settings', icon: Settings },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center h-12 px-3 rounded-xl transition-all duration-300 group ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
                  />
                )}
                <item.icon size={20} className="relative z-10 shrink-0 group-hover:scale-110 transition-transform" />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="ml-3 font-medium text-sm relative z-10 whitespace-nowrap"
                    >
                      {item.id}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </nav>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <img src="https://i.pravatar.cc/150?u=me" alt="User" className="w-10 h-10 rounded-full border border-indigo-500/30" />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <p className="text-sm font-semibold text-slate-100">Jane Doe</p>
                  <p className="text-xs text-slate-400">jane@nexdash.com</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* 2. CENTER / MAIN CANVAS */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-900 relative">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors hidden md:block">
              <Menu size={20} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-slate-800/50 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 transition-all placeholder:text-slate-500 text-slate-200"
              />
            </div>
            <button className="p-2 relative rounded-full hover:bg-white/5 text-slate-400 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-slate-900"></span>
            </button>
            <button 
              onClick={() => setChatOpen(!isChatOpen)}
              className={`p-2 rounded-full transition-colors md:hidden ${isChatOpen ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <MessageSquare size={20} />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-32">
          
          {/* Welcome Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-slate-800/40 border border-indigo-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
            <h2 className="text-3xl font-bold mb-2">Good morning, Jane! 👢</h2>
            <p className="text-slate-400 max-w-lg">Your dashboard is looking great today. You have <span className="text-amber-500 font-medium">3 new messages</span> and your metrics are up by 12% this week.</p>
          </motion.div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Active Users', value: '24,592', change: '+12.5%', icon: Users, color: 'text-indigo-400' },
              { label: 'Revenue (MRR)', value: '$84,230', change: '+8.2%', icon: TrendingUp, color: 'text-amber-400' },
              { label: 'Avg. Session Time', value: '4m 32s', change: '-2.1%', icon: Clock, color: 'text-emerald-400' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-slate-800/40 backdrop-blur-sm border border-white/5 p-6 rounded-2xl hover:border-white/10 hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.15)] transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-w rounded-xl bg-slate-900/50 ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                  <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
                <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Main Visual Area (Chart) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-slate-800/40 backdrop-blur-sm border border-white/5 p-6 rounded-2xl h-[400px]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Engagement Analytics</h3>
              <select className="bg-slate-900 border border-white/10 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500">
                <option>Last 7 Days</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Area type="monotone" dataKey="visitors" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          
        </div>
      </main>

      {/* 3. RIGHT DOCK / FLOATING DRAWER (CHAT HUB) */}
      <AnimatePresence>
        {(isChatOpen || window.innerWidth >= 1024) && (
          <motion.aside 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 right-0 z-40 w-full md:w[400px] lg:relative lg:flex bg-slate-900 border-l border-white/10 shadow-2xl lg:shadow-none flex flex-col ${!isChatOpen && 'hidden lg:flex'}`}
          >
            {/* Drawer Close (Mobile) */}
            <button onClick={() => setChatOpen(false)} className="lg:hidden absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400">
              <X size={20} />
            </button>

            {/* Chat Header */}
            <div className="h-20 border-b border-white/5 flex items-center px-6 gap-4 shrink-0">
              <div className="relative">
                <img src={contacts[0].avatar} alt="Active Chat" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{contacts[0].name}</h3>
                <p className="text-xs text-emerald-400">Online</p>
              </div>
              <button className="text-slate-400 hover:text-white transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hidde">
              <div className="text-center text-xs text-slate-500 mb-8 font-medium">Today</div>
              
              {messages.map((msg, idx) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col max-w-[85%] ${msg.isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start max-w-[85%]">
                  <div className="bg-slate-800/80 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/5 bg-slate-900/90 backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-1 focus-within:border-indigo-500/50 focus-within:bg-slate-800 transition-colors">
                <button type="button" className="p-2.5 text-slate-400 hover:text-amber-500 transition-colors rounded-xl shrink-0">
                  <Smile size={20} />
                </button>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm py-3 px-1 placeholder:text-slate-500"
                />
                <button type="button" className="p-2.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-xl shrink-0">
                  <Paperclip size={20} />
                </button>
                <button 
                  type="submit" 
                  disabled={!inputValue.trim()}
                  className="p-2.5 m-0.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl shrink-0 transition-all active:scale-95"
                >
                  <Send size={18} className={inputValue.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                </button>
              </form>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Chat Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
    );
}
