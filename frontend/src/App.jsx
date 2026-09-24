import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, Activity, Sliders, Wind, MessageSquare, 
  User, Sun, Moon, Search, AlertTriangle, AlertOctagon,
  Send, Smile, Paperclip, Droplet, Clock, BarChart2,
  X, LogOut, Edit2, Camera, Image as ImageIcon,
  MapPin, Mail, Rss, ArrowRight, Globe, Phone, MessageCircle,
  UserPlus, Shield, LifeBuoy
} from 'lucide-react';

// --- CONSTANTS & MOCK DATA ---
const COLORS = {
  red: '#EF4444',
  orange: '#F59E0B',
  green: '#10B981',
  brand: '#10B981', // Match mobile green
};

const metrics = {
  traffic: { vehicle_count: 150, avg_speed: 12.5, vehicle_density: 0.88 },
  baseline: { delay: 2045.18, north_south_green: 41, east_west_green: 41 },
  optimized: { delay: 1960.00, delay_reduction: 85.18, north_south_green: 51, east_west_green: 31 },
  impact: { co2_reduction: 0.0328, fuel_reduction: 0.0142, time_saved: 0.023 }
};

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'app'
  
  // App State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  const [activePage, setActivePage] = useState('tab_live_map');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 37.77, lon: -122.41 });
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [appMetrics, setAppMetrics] = useState(metrics);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_count: 150 + Math.floor(Math.random() * 50),
            avg_speed: 12.5 + Math.random() * 5,
            vehicle_density: 0.80 + Math.random() * 0.15,
            free_flow_speed: 40.0,
            saturation_flow_rate: 1800.0,
            north_south_split: 0.5,
            east_west_split: 0.5
          })
        });
        const data = await res.json();
        if (data && data.optimized) {
           setAppMetrics({
             traffic: data.traffic,
             baseline: data.baseline,
             optimized: data.optimized,
             impact: data.impact || appMetrics.impact
           });
        }
      } catch (err) {
        console.log('Failed to fetch from backend, using fallback data', err);
      }
    };
    
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'Alex', text: 'Huge accident on I-95 South, traffic at a standstill.', time: '2m ago', type: 'alert', reactions: { '⚠️': 2, '😱': 1 } },
    { id: 2, user: 'Sarah', text: 'Thanks for the heads up, avoiding it now!', time: '1m ago', type: 'normal', reactions: { '👍': 4, '❤️': 1 } }
  ]);

  const toggleReaction = (msgId, emoji) => {
    setChatMessages(chatMessages.map(msg => {
      if (msg.id === msgId) {
        const currentCount = msg.reactions?.[emoji] || 0;
        return { ...msg, reactions: { ...msg.reactions, [emoji]: currentCount > 0 ? 0 : 1 } };
      }
      return msg;
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setMapCenter({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        setSearchQuery('');
      } else {
        alert("Location not found.");
      }
    } catch (e) {
      alert("Error searching location.");
    }
  };

  const handleFlagTraffic = (issueType) => {
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      user: 'System Alert',
      text: `${currentUser ? currentUser.name : 'A user'} just flagged ${issueType} near the selected location.`,
      time: 'Just now',
      type: 'alert',
      reactions: {},
      flaggedBy: currentUser ? currentUser.name : null
    }]);
    alert(`Area flagged for ${issueType}! Notification sent to Community.`);
  };  


  const theme = {
    bg: isDarkMode ? '#0B0E14' : '#F8F9FA',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    textMuted: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.10)' : '#E5E7EB',
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (inputText.trim()) {
      setChatMessages([...chatMessages, { 
        id: Date.now(), 
        user: currentUser ? currentUser.name : 'You', 
        text: inputText, 
        time: 'Just now', 
        type: 'normal' 
      }]);
      setInputText('');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setChatMessages([...chatMessages, { 
          id: Date.now(), 
          user: currentUser ? currentUser.name : 'You', 
          text: '', 
          image: event.target.result,
          time: 'Just now', 
          type: 'normal',
          reactions: {}
        }]);
      };
      reader.readAsDataURL(file);
    }
    // reset input so the same file can be selected again
    e.target.value = '';
  };

  useEffect(() => {
    if (currentView === 'app') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activePage, currentView]);

  const handleAuth = (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      alert('Please enter both username and password.');
      return;
    }
    const seed = encodeURIComponent(authUsername.trim());
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&backgroundColor=b6e3f4`;
    
    setCurrentUser({ name: authUsername.trim(), avatar: avatarUrl, phone: 'Not set', dob: 'Not set' });
    setAuthUsername('');
    setAuthPassword('');
    setIsLoginModalVisible(false);
  };

  // ---------------------------------------------------------------------------
  // 1. LANDING PAGE VIEW (Modern Enterprise SaaS Aesthetic)
  // ---------------------------------------------------------------------------
  const renderLandingPage = () => (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans overflow-x-hidden flex flex-col relative w-full selection:bg-teal-500/30">
      
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 md:px-12 flex justify-between items-center bg-[#0B0E14]/80 backdrop-blur-md border-b border-white/5">
        <div className="text-xl font-bold tracking-tight flex items-center gap-3">
          <img src="/logo.png" alt="FlowSync Logo" className="w-8 h-8 object-contain drop-shadow-md" />
          <span>FlowSync</span>
        </div>
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-400">
          <button onClick={() => { setActivePage('tab_live_map'); setCurrentView('app'); }} className="hover:text-teal-400 transition-colors text-white">Live</button>
          <button onClick={() => { setActivePage('tab_congestion'); setCurrentView('app'); }} className="hover:text-teal-400 transition-colors">Congestion</button>
          <button onClick={() => { setActivePage('tab_signals'); setCurrentView('app'); }} className="hover:text-teal-400 transition-colors">Signals</button>
          <button onClick={() => { setActivePage('tab_eco_impact'); setCurrentView('app'); }} className="hover:text-teal-400 transition-colors">Impact</button>
          <button onClick={() => { setActivePage('tab_community'); setCurrentView('app'); }} className="hover:text-teal-400 transition-colors">Community Chat</button>
        </div>
        <div className="flex items-center gap-4">
          {!currentUser ? (
            <>
              <button onClick={() => { setAuthMode('login'); setIsLoginModalVisible(true); }} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
                <User size={16} /> <span className="hidden sm:inline">Log In</span>
              </button>
              <button onClick={() => { setAuthMode('register'); setIsLoginModalVisible(true); }} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
                <UserPlus size={16} /> <span className="hidden sm:inline">Register</span>
              </button>
            </>
          ) : (
            <button onClick={() => setCurrentView('app')} className="w-8 h-8 rounded-full overflow-hidden border border-teal-500">
              <img src={currentUser.avatar} alt="User" />
            </button>
          )}
          <button 
            onClick={() => setCurrentView('app')}
            className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors shadow-lg ml-2"
          >
            Launch Platform
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between px-6 md:px-12 lg:px-24 pt-32 pb-20 max-w-7xl mx-auto w-full gap-12">
        <div className="flex-1 flex flex-col items-start text-left">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">FlowSync OS 2.0 Live</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
            Next-generation <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
              traffic intelligence.
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-gray-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed font-light">
            FlowSync uses real-time telemetry and adaptive AI signal optimization to eliminate commute delays, cut carbon emissions, and unify city transit.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setCurrentView('app')}
              className="bg-teal-500 hover:bg-teal-400 text-black px-8 py-3.5 rounded-full transition-all duration-300 font-bold shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] hover:-translate-y-0.5"
            >
              Start Free Trial
            </button>
            <button 
              onClick={() => setCurrentView('app')}
              className="border border-white/20 hover:border-white/40 hover:bg-white/5 text-white px-8 py-3.5 rounded-full transition-all duration-300 font-medium flex items-center gap-2"
            >
              Explore Features <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="flex-1 w-full max-w-xl relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
          <div className="relative bg-[#11151F] border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden">
            {/* Mac-style Window Controls */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            
            {/* Map Frame */}
            <div className="h-64 bg-[#0B0E14] rounded-lg border border-white/5 relative overflow-hidden">
               <iframe 
                src="https://www.openstreetmap.org/export/embed.html?bbox=-122.45%2C37.77%2C-122.41%2C37.80&layer=mapnik"
                className="w-full h-full border-0 pointer-events-none"
                style={{ filter: 'invert(90%) hue-rotate(180deg) opacity(80%)' }}
                title="Map"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent" />
              
              {/* Overlay Widget */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#11151F]/90 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                     <AlertTriangle size={14} className="text-red-400" />
                   </div>
                   <div>
                     <p className="text-xs text-gray-400">Current Delay</p>
                     <p className="text-sm font-bold text-white">+14m Spike</p>
                   </div>
                 </div>
                 <div className="w-px h-8 bg-white/10" />
                 <div>
                     <p className="text-xs text-gray-400">Optimization</p>
                     <p className="text-sm font-bold text-teal-400">Active</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Responsive Feature Cards Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-32 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#11151F] border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10 group cursor-pointer" onClick={() => { setActivePage('tab_congestion'); setCurrentView('app'); }}>
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Activity size={24} className="text-teal-400" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-white">Traffic Telemetry</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Corridor capacity analysis and real-time speed monitoring.
            </p>
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Live Speed</p>
              <p className="text-xl font-bold text-white">{appMetrics.traffic.avg_speed.toFixed(1)} <span className="text-sm text-gray-500 font-normal">km/h</span></p>
            </div>
          </div>
          
          <div className="bg-[#11151F] border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 group cursor-pointer" onClick={() => { setActivePage('tab_signals'); setCurrentView('app'); }}>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sliders size={24} className="text-blue-400" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-white">Signal Optimization</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              AI models adapting green-light phases to minimize wait times.
            </p>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Delay Reduced By</p>
              <p className="text-xl font-bold text-blue-400">-{appMetrics.optimized.delay_reduction.toFixed(1)} <span className="text-sm text-gray-500 font-normal">sec</span></p>
            </div>
          </div>

          <div className="bg-[#11151F] border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 group cursor-pointer" onClick={() => { setActivePage('tab_eco_impact'); setCurrentView('app'); }}>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Wind size={24} className="text-green-400" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-white">Eco Impact Reporting</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Track carbon footprint reductions achieved by minimizing idling.
            </p>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">CO2 Prevented</p>
              <p className="text-xl font-bold text-green-400">{appMetrics.impact.co2_reduction.toFixed(3)} <span className="text-sm text-gray-500 font-normal">kg</span></p>
            </div>
          </div>

          <div className="bg-[#11151F] border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 group cursor-pointer" onClick={() => { setActivePage('tab_community'); setCurrentView('app'); }}>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare size={24} className="text-purple-400" />
            </div>
            <h4 className="font-bold text-lg mb-2 text-white">Community Alerts</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Crowdsourced incident reports and real-time warnings.
            </p>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Active Reports</p>
              <p className="text-xl font-bold text-white">12 <span className="text-sm text-gray-500 font-normal">in radius</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works / Details Section */}
      <section className="relative z-10 w-full bg-[#11151F]/50 border-t border-b border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">How FlowSync Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              We integrate seamlessly with existing city infrastructure, utilizing AI to transform reactive traffic lights into a proactive, intelligent grid.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-500/30 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/10">
                <Globe size={28} className="text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. Data Aggregation</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                FlowSync continuously ingests live telemetry from city cameras, road sensors, and crowdsourced community reports to map the exact state of your transit grid.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10 relative">
                <div className="absolute top-1/2 -right-8 w-16 border-t-2 border-dashed border-white/10 hidden md:block" />
                <div className="absolute top-1/2 -left-8 w-16 border-t-2 border-dashed border-white/10 hidden md:block" />
                <Sliders size={28} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. AI Optimization</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Our proprietary Deep Reinforcement Learning models analyze the aggregated data in milliseconds, calculating the perfect signal timing phases to clear congestion.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-green-500/30 flex items-center justify-center mb-6 shadow-lg shadow-green-500/10">
                <Wind size={28} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Sustainable Output</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Optimized signals are pushed to intersections instantly. The result? Drastically reduced idling times, faster commutes, and a measurable drop in urban carbon emissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-12 px-6 md:px-12 mt-auto text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center z-10 relative bg-[#0B0E14]">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
           <img src="/logo.png" alt="FlowSync Logo" className="w-5 h-5 object-contain opacity-70" />
           <span className="text-gray-400 font-bold">FlowSync Inc. &copy; 2026</span>
        </div>
        <div className="flex gap-8">
           <button onClick={() => setCurrentView('privacy')} className="hover:text-white transition-colors flex items-center gap-2"><Shield size={14}/> Privacy Policy</button>
           <button onClick={() => setCurrentView('support')} className="hover:text-white transition-colors flex items-center gap-2"><LifeBuoy size={14}/> Support</button>
        </div>
      </footer>
    </div>
  );

  // ---------------------------------------------------------------------------
  // 2. FLOWSYNC APP UI (Mobile Layout Replica)
  // ---------------------------------------------------------------------------
  const renderAppView = () => (
    <div className="relative h-screen w-full flex flex-col overflow-hidden font-sans mx-auto shadow-2xl" style={{ backgroundColor: theme.bg }}>
      
      {/* Top Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b z-20 backdrop-blur-md" style={{ borderColor: theme.border, backgroundColor: isDarkMode ? 'rgba(11, 14, 20, 0.8)' : 'rgba(248, 249, 250, 0.8)' }}>
        {/* Left: Logo */}
        <div className="flex items-center cursor-pointer w-48" onClick={() => setCurrentView('landing')}>
          <div className="text-lg font-bold tracking-widest flex items-center gap-2">
            <img src="/logo.png" alt="FlowSync Logo" className="w-6 h-6 object-contain" />
            <span className="text-[#2DD4BF]">FLOW</span><span style={{ color: theme.text }}>SYNC</span>
          </div>
        </div>
        
        {/* Center: Navigation Tabs */}
        <div className="hidden md:flex h-full flex-1 justify-center gap-2">
          {[
            { id: 'tab_live_map', icon: Map, label: 'Live Map' },
            { id: 'tab_congestion', icon: Activity, label: 'Congestion' },
            { id: 'tab_signals', icon: Sliders, label: 'Signals' },
            { id: 'tab_eco_impact', icon: Wind, label: 'Impact' },
            { id: 'tab_community', icon: MessageSquare, label: 'Community' },
          ].map(item => {
            const isActive = activePage === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => setActivePage(item.id)}
                className="flex items-center gap-2 px-4 h-full relative hover:bg-white/5 transition-colors"
              >
                <item.icon size={16} color={isActive ? COLORS.brand : '#A1A1AA'} />
                <span className="text-sm font-medium" style={{ color: isActive ? COLORS.brand : '#A1A1AA' }}>{item.label}</span>
                {isActive && (
                  <motion.div layoutId="nav-indicator" className="absolute bottom-[0px] left-0 right-0 h-[2px] rounded-t-full" style={{ backgroundColor: COLORS.brand }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center justify-end gap-4 w-48">
          <button onClick={() => {
            if (currentUser) setActivePage('nav_profile');
            else setIsLoginModalVisible(true);
          }} className="p-2 border rounded-full hover:bg-white/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
            {currentUser ? <img src={currentUser.avatar} className="w-5 h-5 rounded-full" alt="User" /> : <User size={18} />}
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 border rounded-full hover:bg-white/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile-only Bottom Navigation for small screens */}
      <div className="md:hidden absolute bottom-0 w-full h-[70px] border-t z-30 px-2 flex justify-around items-center backdrop-blur-xl" style={{ borderColor: theme.border, backgroundColor: isDarkMode ? 'rgba(11, 14, 20, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}>
        {[
          { id: 'tab_live_map', icon: Map, label: 'Live Map' },
          { id: 'tab_congestion', icon: Activity, label: 'Congestion' },
          { id: 'tab_signals', icon: Sliders, label: 'Signals' },
          { id: 'tab_eco_impact', icon: Wind, label: 'Impact' },
          { id: 'tab_community', icon: MessageSquare, label: 'Community' },
        ].map(item => {
          const isActive = activePage === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setActivePage(item.id)}
              className="flex flex-col items-center justify-center w-16 h-full relative"
            >
              <item.icon size={20} color={isActive ? COLORS.brand : '#A1A1AA'} className="mb-1" />
              <span className="text-[10px] font-medium" style={{ color: isActive ? COLORS.brand : '#A1A1AA' }}>{item.label}</span>
              {isActive && (
                <motion.div layoutId="nav-indicator-mobile" className="absolute -top-[1px] w-8 h-[2px] rounded-full" style={{ backgroundColor: COLORS.brand }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {activePage === 'tab_live_map' && (
          <div className="absolute inset-0 z-0">
            <iframe 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lon-0.02}%2C${mapCenter.lat-0.02}%2C${mapCenter.lon+0.02}%2C${mapCenter.lat+0.02}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lon}`}
              className="w-full h-full border-0 pointer-events-none"
              style={{ filter: isDarkMode ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
              title="Map"
            />
            
            {/* Floating Search Bar */}
            <form onSubmit={handleSearch} className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#0B0E14]/95 backdrop-blur-md border border-white/10 rounded-2xl flex items-center px-4 py-3 shadow-2xl z-10">
              <Search size={20} className="text-slate-400 mr-3" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search road or area..." 
                className="bg-transparent border-none focus:outline-none text-white w-full text-base placeholder:text-slate-500"
              />
            </form>

            {/* Floating Action Buttons */}
            <div className="absolute bottom-[100px] right-6 flex flex-col gap-4 z-10">
              <button onClick={() => handleFlagTraffic('Traffic')} className="w-14 h-14 rounded-full bg-red-500 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-white/20">
                <AlertTriangle size={24} className="text-white" />
                <span className="text-[9px] font-bold text-white uppercase mt-0.5 shadow-sm">Traffic</span>
              </button>
              <button onClick={() => handleFlagTraffic('Blockage')} className="w-14 h-14 rounded-full bg-orange-500 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-white/20">
                <AlertOctagon size={24} className="text-white" />
                <span className="text-[9px] font-bold text-white uppercase mt-0.5 shadow-sm">Blockage</span>
              </button>
              <button onClick={() => handleFlagTraffic('Work')} className="w-14 h-14 rounded-full bg-yellow-500 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-white/20">
                <AlertTriangle size={24} className="text-white" />
                <span className="text-[9px] font-bold text-white uppercase mt-0.5 shadow-sm">Work</span>
              </button>
            </div>
          </div>
        )}
        
        {activePage === 'tab_community' && (
          <div className="absolute inset-0 z-10 flex flex-col" style={{ backgroundColor: theme.bg }}>
            <div className="p-5 border-b" style={{ borderColor: theme.border }}>
              <h2 className="font-bold text-lg flex items-center" style={{ color: theme.text }}>
                <MessageSquare size={18} className="mr-2 text-slate-400" />
                Live Community Updates
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.user === (currentUser?.name || 'You') ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs" style={{ color: theme.textMuted }}>{msg.user}</span>
                    <span className="text-[10px]" style={{ color: theme.textMuted }}>{msg.time}</span>
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm border ${
                    msg.user === (currentUser?.name || 'You')
                      ? 'bg-teal-500 text-black border-transparent' 
                      : msg.type === 'alert'
                        ? 'bg-red-500/20 border-red-500 text-white'
                        : 'bg-black/40 border-white/10 text-white'
                  }`}>
                    {msg.image && <img src={msg.image} alt="upload" className="max-w-[200px] rounded-lg mb-2" />}
                    {msg.text && <span>{msg.text}</span>}
                  </div>
                  {/* Reactions */}
                  <div className={`flex gap-2 mt-1 ${msg.user === (currentUser?.name || 'You') ? 'justify-end' : 'justify-start'}`}>
                    {['👍', '⚠️', '❤️', '😱'].map(emoji => {
                      const count = msg.reactions?.[emoji] || 0;
                      return (
                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className={`px-2 py-1 rounded-full text-xs border ${count > 0 ? 'border-teal-500 bg-teal-500/20 text-white' : 'border-white/10 text-slate-400'}`}>
                          {emoji} {count > 0 ? count : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center max-w-4xl mx-auto w-full">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-white mr-1 transition-colors">
                  <ImageIcon size={20} />
                </button>
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Report traffic or reply..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  style={{ color: theme.text }}
                />
                <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-black disabled:opacity-50 ml-1 hover:bg-teal-400 transition-colors shadow-lg">
                  <Send size={16} className="ml-1" />
                </button>
              </form>
            </div>
          </div>
        )}
        
        {activePage === 'nav_profile' && (
          <div className="absolute inset-0 z-10 flex flex-col pb-20 overflow-y-auto" style={{ backgroundColor: theme.bg }}>
            <div className="p-8 flex flex-col items-center">
              <img src={currentUser?.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-[#2DD4BF] mb-4" />
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>{currentUser?.name}</h2>
            </div>
            
            <div className="px-6 flex-1 max-w-2xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold" style={{ color: theme.text }}>Account Details</h3>
                <button className="text-[#2DD4BF] flex items-center"><Edit2 size={14} className="mr-1" /> Edit</button>
              </div>
              
              <div className="mb-4 bg-black/10 p-4 rounded-xl border border-white/5">
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Phone Number</p>
                <p className="text-base font-medium" style={{ color: theme.text }}>{currentUser?.phone}</p>
              </div>
              <div className="mb-8 bg-black/10 p-4 rounded-xl border border-white/5">
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Date of Birth</p>
                <p className="text-base font-medium" style={{ color: theme.text }}>{currentUser?.dob}</p>
              </div>

              <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>My Recent Alerts</h3>
              <p className="text-sm italic" style={{ color: theme.textMuted }}>No alerts flagged yet.</p>
              
              <button 
                onClick={() => { setCurrentUser(null); setActivePage('tab_live_map'); }}
                className="mt-12 w-full py-4 rounded-xl bg-red-500/10 text-red-500 font-bold flex justify-center items-center hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={18} className="mr-2" /> Log Out
              </button>
            </div>
          </div>
        )}

        {activePage === 'tab_congestion' && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
            <div className="w-full max-w-2xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-white text-xl font-bold mb-6">Intersection Traffic Telemetry</h3>
            <div className="flex items-center bg-white/5 p-4 rounded-2xl mb-4 border border-white/10">
              <BarChart2 size={24} className="text-red-500" />
              <div className="ml-4 flex-1">
                <p className="text-white font-bold">{appMetrics.traffic.vehicle_count} Vehicles Detected</p>
                <p className="text-slate-400 text-xs">Corridor operating at {(appMetrics.traffic.vehicle_density * 100).toFixed(0)}% capacity. Delay spike imminent.</p>
              </div>
              <div className="bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500 text-red-500 text-[10px] font-bold">
                HEAVY TRAFFIC
              </div>
            </div>
            <div className="flex justify-between bg-white/5 p-1 rounded-xl">
              {['Low', 'Medium', 'High'].map(level => (
                <div key={level} className={`flex-1 text-center py-2 rounded-lg ${level === 'High' ? 'bg-white/10 text-white font-bold' : 'text-slate-400'}`}>
                  {level}
                </div>
              ))}
            </div>
            </div>
          </motion.div>
        )}
        
        {activePage === 'tab_signals' && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
            <div className="w-full max-w-2xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-white text-xl font-bold mb-6">Adaptive Signal Timing Model</h3>
            <div className="bg-teal-500/20 p-4 rounded-2xl text-center mb-4 border border-teal-500">
              <p className="text-teal-400 text-lg font-bold">Delay Reduced by {appMetrics.optimized.delay_reduction.toFixed(2)}s</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex justify-between mb-3 border-b border-white/10 pb-2 text-slate-400 text-sm">
                <span className="flex-[2]">Lane</span>
                <span className="flex-1 text-center">Base</span>
                <span className="flex-1 text-center">Opt</span>
                <span className="flex-[1.5] text-right">Delta</span>
              </div>
              {[
                { lane: 'N-S Green', base: `${appMetrics.baseline.north_south_green}s`, opt: `${appMetrics.optimized.north_south_green}s`, delta: `+${(appMetrics.optimized.north_south_green - appMetrics.baseline.north_south_green).toFixed(0)}s`, color: 'text-teal-400' },
                { lane: 'E-W Green', base: `${appMetrics.baseline.east_west_green}s`, opt: `${appMetrics.optimized.east_west_green}s`, delta: `-${(appMetrics.baseline.east_west_green - appMetrics.optimized.east_west_green).toFixed(0)}s`, color: 'text-orange-500' },
                { lane: 'Total Delay', base: `${appMetrics.baseline.delay.toFixed(1)}s`, opt: `${appMetrics.optimized.delay.toFixed(1)}s`, delta: `-${appMetrics.optimized.delay_reduction.toFixed(1)}s`, color: 'text-teal-400' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between mb-3 last:mb-0">
                  <span className="text-white flex-[2]">{row.lane}</span>
                  <span className="text-white flex-1 text-center">{row.base}</span>
                  <span className="text-white flex-1 text-center">{row.opt}</span>
                  <span className={`${row.color} flex-[1.5] text-right font-bold`}>{row.delta}</span>
                </div>
              ))}
            </div>
            </div>
          </motion.div>
        )}
        
        {activePage === 'tab_eco_impact' && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
            <div className="w-full max-w-2xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-white text-xl font-bold mb-6">Green Mobility & Savings</h3>
            <div className="flex justify-between gap-2 mb-4">
              <div className="flex-1 flex flex-col items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <Wind size={24} className="text-teal-400 mb-2" />
                <span className="text-teal-400 font-bold">{appMetrics.impact.co2_reduction.toFixed(4)} kg</span>
                <span className="text-slate-400 text-[10px] mt-1">CO2 Offset</span>
              </div>
              <div className="flex-1 flex flex-col items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <Droplet size={24} className="text-teal-400 mb-2" />
                <span className="text-teal-400 font-bold">{appMetrics.impact.fuel_reduction.toFixed(4)} L</span>
                <span className="text-slate-400 text-[10px] mt-1">Fuel Saved</span>
              </div>
              <div className="flex-1 flex flex-col items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <Clock size={24} className="text-orange-500 mb-2" />
                <span className="text-orange-500 font-bold">{appMetrics.impact.time_saved.toFixed(3)} hrs</span>
                <span className="text-slate-400 text-[10px] mt-1">Regained</span>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-white text-xs italic text-center leading-relaxed">
                "Signal timing optimization prevented {appMetrics.impact.co2_reduction.toFixed(3)}kg of idling carbon emissions on this cycle."
              </p>
            </div>
            </div>
          </motion.div>
        )}
      </div>



      {/* Login Modal Overlay */}
      <AnimatePresence>
        {isLoginModalVisible && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLoginModalVisible(false)} />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-[#0B0E14] rounded-t-3xl p-8 pb-12 shadow-2xl border-t border-white/10 w-full max-w-lg mx-auto"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />
              <h2 className="text-3xl font-bold text-white mb-2">{authMode === 'login' ? 'Welcome Back' : 'Join FlowSync'}</h2>
              <p className="text-slate-400 mb-8">{authMode === 'login' ? 'Sign in to report live traffic conditions.' : 'Create an account and get your custom avatar.'}</p>
              
              <form onSubmit={handleAuth} className="flex flex-col gap-4">
                <input 
                  type="text" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Username" 
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#2DD4BF] transition-colors"
                />
                <input 
                  type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password" 
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#2DD4BF] transition-colors"
                />
                <button type="submit" className="bg-teal-500 text-black font-bold py-4 rounded-xl mt-4 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20">
                  {authMode === 'login' ? 'Log In' : 'Register'}
                </button>
              </form>
              
              <div className="flex justify-center mt-6 text-sm">
                <span className="text-slate-400">{authMode === 'login' ? "Don't have an account? " : "Already have an account? "}</span>
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-teal-400 font-bold ml-1 hover:text-teal-300">
                  {authMode === 'login' ? 'Register' : 'Log In'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderPrivacyPage = () => (
    <div className="min-h-screen bg-[#0B0E14] text-white p-8 md:p-20 font-sans">
      <button onClick={() => setCurrentView('landing')} className="flex items-center gap-2 text-teal-400 hover:text-teal-300 mb-10"><ArrowRight className="rotate-180" size={16}/> Back to Home</button>
      <div className="max-w-3xl mx-auto bg-white/5 p-10 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Shield size={32} className="text-teal-400" />
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
        </div>
        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>Last updated: September 2026</p>
          <h2 className="text-xl font-bold text-white mt-8">1. Information We Collect</h2>
          <p>FlowSync collects telemetry data, location data, and user-submitted incident reports to optimize city-wide traffic grids. We ensure all locational data is fully anonymized.</p>
          <h2 className="text-xl font-bold text-white mt-8">2. How We Use Your Data</h2>
          <p>We use your data solely for real-time signal optimization, congestion forecasting, and calculating carbon footprint reductions.</p>
          <h2 className="text-xl font-bold text-white mt-8">3. Data Security</h2>
          <p>We implement state-of-the-art encryption to secure all transit network data streams and user reports against unauthorized access.</p>
        </div>
      </div>
    </div>
  );

  const renderSupportPage = () => (
    <div className="min-h-screen bg-[#0B0E14] text-white p-8 md:p-20 font-sans">
      <button onClick={() => setCurrentView('landing')} className="flex items-center gap-2 text-teal-400 hover:text-teal-300 mb-10"><ArrowRight className="rotate-180" size={16}/> Back to Home</button>
      <div className="max-w-3xl mx-auto bg-white/5 p-10 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <LifeBuoy size={32} className="text-teal-400" />
          <h1 className="text-4xl font-bold">FlowSync Support</h1>
        </div>
        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>Need help integrating FlowSync OS 2.0 with your municipal grid?</p>
          <div className="grid gap-4 mt-8">
             <div className="bg-black/20 p-6 rounded-xl border border-white/5 flex items-center gap-4">
                <Mail size={24} className="text-teal-400"/>
                <div>
                   <h3 className="font-bold text-white">Email Support</h3>
                   <p className="text-sm">support@flowsync.city</p>
                </div>
             </div>
             <div className="bg-black/20 p-6 rounded-xl border border-white/5 flex items-center gap-4">
                <Phone size={24} className="text-blue-400"/>
                <div>
                   <h3 className="font-bold text-white">Emergency Engineering Hotline</h3>
                   <p className="text-sm">1-800-FLOW-NET</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {currentView === 'landing' && renderLandingPage()}
      {currentView === 'app' && renderAppView()}
      {currentView === 'privacy' && renderPrivacyPage()}
      {currentView === 'support' && renderSupportPage()}
    </>
  );
}
