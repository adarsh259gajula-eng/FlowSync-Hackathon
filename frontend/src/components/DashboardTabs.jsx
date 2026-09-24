import React from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart2, Sliders, Wind, Droplet, Clock, MessageSquare, Send, Search, Navigation, AlertTriangle, AlertOctagon, Image as ImageIcon } from 'lucide-react';

export function CongestionTab({ appMetrics, theme }) {
  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
      <div className="w-full max-w-5xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-white text-2xl font-bold mb-8 flex items-center gap-3"><Activity className="text-teal-400" /> Intersection Traffic Telemetry</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="flex items-center bg-white/5 p-6 rounded-2xl mb-6 border border-white/10 shadow-inner">
              <BarChart2 size={32} className="text-red-500" />
              <div className="ml-6 flex-1">
                <p className="text-white text-lg font-bold">{appMetrics.observation.vehicle_count} Vehicles Detected</p>
                <p className="text-slate-400 text-sm mt-1">Corridor operating at {(appMetrics.observation.vehicle_density).toFixed(0)}% capacity. Delay spike imminent.</p>
              </div>
              <div className="bg-red-500/20 px-4 py-2 rounded-xl border border-red-500 text-red-500 text-xs font-bold animate-pulse">
                HEAVY TRAFFIC
              </div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <p className="text-slate-400 text-sm mb-4">Current Congestion Level</p>
              <div className="flex justify-between gap-2">
                {['Low', 'Medium', 'High'].map(level => (
                  <div key={level} className={`flex-1 text-center py-3 rounded-xl transition-all ${level === 'High' ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/20 text-slate-500 border border-white/5'}`}>
                    {level}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="text-white text-lg font-bold mb-4">How FlowSync Monitors Traffic</h4>
            <p className="text-slate-400 leading-relaxed mb-6">
              Our platform continuously ingests live telemetry from city cameras, road sensors, and connected vehicles. By analyzing <strong className="text-teal-400">vehicle density</strong> and <strong className="text-teal-400">average speed</strong> in real-time, FlowSync can predict congestion spikes before they cascade through the grid.
            </p>
            <div className="bg-teal-500/10 border border-teal-500/20 p-5 rounded-xl">
              <p className="text-teal-400 text-sm font-medium flex justify-between">
                <span>Average Flow Speed:</span>
                <span className="font-bold">{appMetrics.observation.avg_speed.toFixed(1)} km/h</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SignalsTab({ appMetrics, theme }) {
  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
      <div className="w-full max-w-5xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-white text-2xl font-bold mb-8 flex items-center gap-3"><Sliders className="text-teal-400" /> Adaptive Signal Timing Model</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="bg-teal-500/20 p-6 rounded-2xl text-center mb-6 border border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
              <p className="text-teal-400 text-xl font-bold">Total Delay Reduced by {appMetrics.optimized.delay_reduction.toFixed(2)}s</p>
              <p className="text-teal-500 text-sm mt-1">Compared to static pre-timed baseline signals.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between mb-4 border-b border-white/10 pb-3 text-slate-400 text-sm uppercase tracking-wider font-semibold">
                <span className="flex-[2]">Direction</span>
                <span className="flex-1 text-center">Baseline</span>
                <span className="flex-1 text-center">Optimized</span>
                <span className="flex-[1.5] text-right">Delta</span>
              </div>
              {[
                { lane: 'North-South Green', base: `${appMetrics.baseline.north_south_green}s`, opt: `${appMetrics.optimized.north_south_green}s`, delta: `+${(appMetrics.optimized.north_south_green - appMetrics.baseline.north_south_green).toFixed(0)}s`, color: 'text-teal-400' },
                { lane: 'East-West Green', base: `${appMetrics.baseline.east_west_green}s`, opt: `${appMetrics.optimized.east_west_green}s`, delta: `-${(appMetrics.baseline.east_west_green - appMetrics.optimized.east_west_green).toFixed(0)}s`, color: 'text-orange-500' },
                { lane: 'Total Cycle Delay', base: `${appMetrics.baseline.delay.toFixed(1)}s`, opt: `${appMetrics.optimized.delay.toFixed(1)}s`, delta: `-${appMetrics.optimized.delay_reduction.toFixed(1)}s`, color: 'text-teal-400' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center mb-4 last:mb-0 bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="text-white flex-[2] font-medium">{row.lane}</span>
                  <span className="text-slate-300 flex-1 text-center">{row.base}</span>
                  <span className="text-white flex-1 text-center font-bold bg-white/10 py-1 rounded">{row.opt}</span>
                  <span className={`${row.color} flex-[1.5] text-right font-bold text-lg`}>{row.delta}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="text-white text-lg font-bold mb-4">Deep Reinforcement Learning in Action</h4>
            <p className="text-slate-400 leading-relaxed mb-6">
              Our AI replaces outdated, pre-timed traffic light schedules. When a heavy corridor is detected, FlowSync instantly calculates a new signal timing plan (green splits) to dynamically flush out congestion.
            </p>
            <p className="text-slate-400 leading-relaxed">
              By stealing seconds from empty cross-streets and reallocating them to the busiest lanes, we minimize the aggregate waiting time across the entire intersection grid—resulting in the massive delay reduction you see here.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function EcoImpactTab({ appMetrics, theme }) {
  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
      <div className="w-full max-w-5xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-white text-2xl font-bold mb-8 flex items-center gap-3"><Wind className="text-teal-400" /> Green Mobility & Savings</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="flex justify-between gap-4 mb-6">
              <div className="flex-1 flex flex-col items-center justify-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/10 rounded-bl-full" />
                <Wind size={32} className="text-teal-400 mb-3" />
                <span className="text-teal-400 text-2xl font-bold">{appMetrics.impact.co2_saved_kg.toFixed(4)} kg</span>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-2">CO2 Offset</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full" />
                <Droplet size={32} className="text-blue-400 mb-3" />
                <span className="text-blue-400 text-2xl font-bold">{appMetrics.impact.fuel_saved_liters.toFixed(4)} L</span>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-2">Fuel Saved</span>
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full" />
              <Clock size={32} className="text-orange-500 mb-3" />
              <span className="text-orange-500 text-2xl font-bold">{appMetrics.impact.vehicle_hours_saved.toFixed(3)} hrs</span>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-2">Commute Time Regained</span>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="text-white text-lg font-bold mb-4">Driving Sustainability</h4>
            <p className="text-slate-400 leading-relaxed mb-6">
              Every second a vehicle spends idling at a red light burns fuel and emits greenhouse gases into the urban environment. By smoothing the flow of traffic, FlowSync directly contributes to your city's sustainability metrics.
            </p>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-l-2xl" />
              <p className="text-white italic text-lg leading-relaxed">
                "Signal timing optimization prevented <strong className="text-teal-400">{appMetrics.impact.co2_saved_kg.toFixed(3)}kg</strong> of idling carbon emissions on this cycle alone."
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CommunityTab({ theme, chatMessages, currentUser, toggleReaction, messagesEndRef, handleSendMessage, fileInputRef, handleImageUpload, inputText, setInputText }) {
  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-10 flex flex-col items-center pt-24 px-4 overflow-y-auto pb-32" style={{ backgroundColor: theme.bg }}>
      <div className="w-full max-w-5xl bg-[#0B0E14]/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col h-[75vh]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-white text-2xl font-bold flex items-center gap-3"><MessageSquare className="text-teal-400" /> Live Community Updates</h3>
          <span className="bg-teal-500/20 text-teal-400 border border-teal-500/50 px-4 py-1.5 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(20,184,166,0.2)] animate-pulse uppercase tracking-widest">LIVE Feed</span>
        </div>
      
        <div className="flex-1 overflow-y-auto bg-black/20 rounded-2xl border border-white/5 p-6 space-y-6 shadow-inner mb-6 flex flex-col">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex flex-col max-w-[75%] ${msg.user === (currentUser?.name || 'You') ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-slate-300">{msg.user}</span>
                <span className="text-xs text-slate-500 font-medium">{msg.time}</span>
              </div>
              <div className={`px-5 py-4 rounded-2xl text-[15px] border shadow-lg leading-relaxed ${
                msg.user === (currentUser?.name || 'You')
                  ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-black border-transparent shadow-teal-500/20 rounded-tr-sm' 
                  : msg.type === 'alert'
                    ? 'bg-red-500/10 border-red-500/50 text-red-100 rounded-tl-sm shadow-red-500/10'
                    : 'bg-white/5 border-white/10 text-white rounded-tl-sm'
              }`}>
                {msg.image && <img src={msg.image} alt="upload" className="max-w-[250px] rounded-xl mb-3 shadow-md" />}
                {msg.text && <span>{msg.text}</span>}
              </div>
              <div className={`flex gap-2 mt-2 ${msg.user === (currentUser?.name || 'You') ? 'justify-end' : 'justify-start'}`}>
                {['👍', '⚠️', '❤️', '😱'].map(emoji => {
                  const count = msg.reactions?.[emoji] || 0;
                  return (
                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className={`px-3 py-1 rounded-full text-xs border transition-all hover:scale-105 ${count > 0 ? 'border-teal-500 bg-teal-500/20 text-white shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'border-white/10 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'}`}>
                      {emoji} {count > 0 ? <span className="ml-1 font-bold">{count}</span> : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3 items-center w-full bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 shadow-lg relative">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-xl transition-all">
              <ImageIcon size={22} />
            </button>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type an update or report a traffic issue..."
              className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-slate-500 text-[15px]"
            />
            <button type="submit" disabled={!inputText.trim()} className={`p-3 rounded-xl transition-all ${inputText.trim() ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20 hover:bg-teal-400 hover:scale-105' : 'bg-white/5 text-slate-600'}`}>
              <Send size={20} className={inputText.trim() ? 'ml-0.5' : ''}/>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveMapTab({ isDarkMode, mapCenter, searchQuery, setSearchQuery, handleSearch, handleLocateMe, handleFlagTraffic }) {
  return (
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
        <button 
          type="button" 
          onClick={handleLocateMe}
          className="ml-2 p-2 rounded-full bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
          title="Locate Me"
        >
          <Navigation size={18} />
        </button>
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
  );
}
