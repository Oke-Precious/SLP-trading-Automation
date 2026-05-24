import React, { useState } from 'react';
import { TRADER_PERSONAS, DESIGN_SPECIFICATION_MARKDOWN } from '../data/specData';
import { 
  X, 
  Copy, 
  Check, 
  BookOpen, 
  User, 
  Search, 
  Terminal, 
  Info,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface SpecsHubProps {
  onClose: () => void;
  initialTab?: 'spec' | 'personas';
}

export default function SpecsHub({ onClose, initialTab = 'spec' }: SpecsHubProps) {
  const [activeTab, setActiveTab] = useState<'spec' | 'personas'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(DESIGN_SPECIFICATION_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtrable sections
  const specSections = DESIGN_SPECIFICATION_MARKDOWN.split('\n\n## ').map((section, idx) => {
    if (idx === 0) {
      return {
        title: 'Overview',
        content: section.replace('# AutoSLP — Design & Architecture Specification', '').trim()
      };
    }
    const lines = section.split('\n');
    const title = lines[0].replace('## ', '');
    const content = lines.slice(1).join('\n');
    return { title, content };
  });

  const filteredSections = specSections.filter(sec => 
    sec.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sec.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="specs-personas-hub-overlay" className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div 
        id="specs-personas-hub-modal"
        className="bg-[#1A1F2C] border border-[#2A2E39] w-full max-w-5xl h-[85vh] rounded-xl flex flex-col overflow-hidden shadow-2xl relative"
      >
        {/* Modal Close */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer z-50"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="p-6 border-b border-[#2A2E39] bg-[#1E2433] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="bg-[#CAAA98]/10 text-[#CAAA98] p-1.5 rounded">
                  <BookOpen size={18} />
                </div>
                <h2 className="text-lg font-bold text-gray-100 font-display uppercase tracking-wide">
                  Specs & Persona Archive
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Explore the complete blueprints, design specifications, and buyer dossiers for AutoSLP.
              </p>
            </div>

            {/* Tab Toggles */}
            <div className="flex bg-[#111622] p-1 rounded-lg border border-[#2A2E39] self-start sm:self-auto">
              <button
                id="tab-spec"
                onClick={() => setActiveTab('spec')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wider uppercase transition-colors ${
                  activeTab === 'spec' 
                    ? 'bg-[#2A3245] text-[#CAAA98] shadow-inner' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Design Blueprint
              </button>
              <button
                id="tab-personas"
                onClick={() => {
                  setActiveTab('personas');
                  setSearchTerm('');
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wider uppercase transition-colors ${
                  activeTab === 'personas' 
                    ? 'bg-[#2A3245] text-[#CAAA98] shadow-inner' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Trader Personas ({TRADER_PERSONAS.length})
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#111622]">
          
          {/* TAB 1: DESIGN SPECIFICATION BLUEPRINT */}
          {activeTab === 'spec' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#1A1F2C] p-4 rounded-lg border border-[#2A2E39]">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search specification nodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#111622] border border-[#2A2E39] text-xs text-gray-200 pl-9 pr-4 py-2 rounded focus:outline-none focus:border-[#CAAA98] font-sans"
                  />
                </div>
                
                <button
                  id="btn-copy-markdown"
                  onClick={handleCopy}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#26A69A]/10 hover:bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/30 px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied Spec!' : 'Copy Blueprint Markdown'}</span>
                </button>
              </div>

              {/* Specification Nodes */}
              <div className="space-y-4">
                {filteredSections.map((sec, idx) => (
                  <div key={idx} className="bg-[#1A1F2C] border border-[#2A2E39] rounded-lg p-5 hover:border-gray-700 transition-colors">
                    <h3 className="text-sm font-semibold text-[#CAAA98] uppercase tracking-wide border-b border-[#2A2E39] pb-2 mb-3 flex items-center space-x-2">
                      <span className="text-gray-500 font-mono text-xs">0{idx + 1}.</span>
                      <span>{sec.title}</span>
                    </h3>
                    <div className="text-xs text-gray-300 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                      {sec.content}
                    </div>
                  </div>
                ))}

                {filteredSections.length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    No blueprints match "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED TRADER PERSONAS DOSSIERS */}
          {activeTab === 'personas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {TRADER_PERSONAS.map((p, idx) => (
                <div 
                  key={idx} 
                  id={`persona-card-${idx}`}
                  className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#CAAA98]/40 transition-all duration-300"
                >
                  {/* Persona Header Banner */}
                  <div className="p-5 bg-[#1E2433] border-b border-[#2A2E39]">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#CAAA98]/10 border border-[#CAAA98] flex items-center justify-center text-[#CAAA98] font-bold text-lg font-display">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-200 font-display">{p.name}</h4>
                        <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-gray-400">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono">Age: {p.age}</span>
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded font-sans">{p.experience}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Persona Body Details */}
                  <div className="p-5 flex-1 space-y-4 text-xs font-sans">
                    {/* Markets */}
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">TRADED MARKETS</span>
                      <div className="flex flex-wrap gap-1">
                        {p.markets.map((m, mIdx) => (
                          <span key={mIdx} className="bg-[#111622] text-[#CAAA98] border border-[#2A2E39] px-2 py-0.5 rounded text-[10px] font-mono">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Workflow */}
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">DAILY WORKFLOW</span>
                      <ul className="space-y-1.5 text-gray-300 text-[11px] leading-relaxed">
                        {p.workflow.map((w, wIdx) => (
                          <li key={wIdx} className="flex items-start">
                            <span className="text-[#CAAA98] mr-1.5 font-mono select-none">›</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pain Points */}
                    <div>
                      <span className="text-[10px] text-[#EF5350] uppercase tracking-wider font-semibold block mb-1.5">PAIN POINTS WITH TRADINGVIEW/MT4</span>
                      <ul className="space-y-1.5 text-gray-300 text-[11px]">
                        {p.painPoints.map((pp, ppIdx) => (
                          <li key={ppIdx} className="flex items-start">
                            <span className="text-[#EF5350] mr-1.5 font-mono select-none">×</span>
                            <span>{pp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Core Features */}
                    <div>
                      <span className="text-[10px] text-[#26A69A] uppercase tracking-wider font-semibold block mb-1.5">PRIORITY FEATURES CARED MOST</span>
                      <ul className="space-y-1.5 text-gray-300 text-[11px]">
                        {p.keyFeatures.map((kf, kfIdx) => (
                          <li key={kfIdx} className="flex items-start">
                            <span className="text-[#26A69A] mr-1.5 font-mono select-none">✓</span>
                            <span>{kf}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Persona Footer metadata */}
                  <div className="p-4 bg-[#141822] border-t border-[#2A2E39] space-y-1.5 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500 uppercase">Hardware Rig:</span>
                      <span className="text-gray-300 text-right truncate max-w-[150px]" title={p.device}>{p.device}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 uppercase">Tech Literacy:</span>
                      <span className="text-gray-300">{p.literacy.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2A2E39] bg-[#1E2433] shrink-0 text-center flex justify-between items-center text-xs text-gray-400">
          <span>AutoSLP Design Spec &bull; Professional Edition</span>
          <button 
            onClick={onClose}
            className="text-[#CAAA98] hover:text-white font-semibold cursor-pointer"
          >
            Acknowledge Spec & Return to Live App
          </button>
        </div>
      </div>
    </div>
  );
}
