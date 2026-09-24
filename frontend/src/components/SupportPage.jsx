import React from 'react';
import { ArrowRight, LifeBuoy, Mail, Phone } from 'lucide-react';

export default function SupportPage({ setCurrentView }) {
  return (
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
}
