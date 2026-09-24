import React from 'react';
import { ArrowRight, Shield } from 'lucide-react';

export default function PrivacyPage({ setCurrentView }) {
  return (
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
}
