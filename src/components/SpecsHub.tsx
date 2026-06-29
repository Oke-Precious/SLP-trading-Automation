import React, { useState } from 'react';
import { TRADER_PERSONAS, DESIGN_SPECIFICATION_MARKDOWN } from '../data/specData';
import { USER_DOCUMENTATION, DEVELOPER_DOCUMENTATION, DocSection, DocCategory } from '../data/documentationData';
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
  ArrowUpRight,
  Code,
  Cpu,
  Database,
  Wrench,
  HelpCircle,
  Activity,
  FileText,
  ChevronRight,
  Menu
} from 'lucide-react';

interface SpecsHubProps {
  onClose: () => void;
  initialTab?: 'spec' | 'user_docs' | 'dev_docs' | 'personas';
}

export default function SpecsHub({ onClose, initialTab = 'spec' }: SpecsHubProps) {
  const [activeTab, setActiveTab] = useState<'spec' | 'user_docs' | 'dev_docs' | 'personas'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Section states for Documentation Sub-navigation
  const [selectedUserSecId, setSelectedUserSecId] = useState<string>('intro');
  const [selectedDevSecId, setSelectedDevSecId] = useState<string>('installation');

  const handleCopy = () => {
    navigator.clipboard.writeText(DESIGN_SPECIFICATION_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filterable sections for the Design Blueprint tab
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

  const filteredSpecSections = specSections.filter(sec => 
    sec.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sec.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper: Get icon based on category ID
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'overview': return <Info size={14} className="text-[#CAAA98]" />;
      case 'user_guide': return <BookOpen size={14} className="text-[#CAAA98]" />;
      case 'get_started': return <Terminal size={14} className="text-emerald-400" />;
      case 'architecture': return <Layers size={14} className="text-[#CAAA98]" />;
      case 'developer_docs': return <Code size={14} className="text-[#CAAA98]" />;
      case 'trading_logic': return <Activity size={14} className="text-emerald-400" />;
      case 'maintenance': return <Wrench size={14} className="text-red-400" />;
      default: return <FileText size={14} className="text-gray-400" />;
    }
  };

  // Helper: Simple Markdown inline parser and line renderer
  const renderDocMarkdown = (content: string) => {
    const lines = content.split('\n');
    let inList = false;
    let listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    const flushList = (keyPrefix: string | number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="space-y-1.5 my-2.5 pl-1">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Heading 3
      if (trimmed.startsWith('### ')) {
        flushList(idx);
        elements.push(
          <h3 
            key={idx} 
            className="text-sm font-bold text-white mt-6 mb-3 font-display uppercase tracking-wider border-l-2 border-[#CAAA98] pl-2.5"
          >
            {trimmed.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Heading 4
      if (trimmed.startsWith('#### ')) {
        flushList(idx);
        elements.push(
          <h4 
            key={idx} 
            className="text-xs font-bold text-[#CAAA98] mt-4 mb-2 font-mono uppercase tracking-normal"
          >
            {trimmed.replace('#### ', '')}
          </h4>
        );
        return;
      }

      // Code block lines (skip marker, render standard monospace blocks)
      if (trimmed.startsWith('```')) {
        flushList(idx);
        return;
      }

      if (trimmed.startsWith('//') || trimmed.startsWith('# ') || trimmed.startsWith('cd ') || trimmed.startsWith('npm ') || trimmed.startsWith('npx ') || trimmed.startsWith('interface ') || trimmed.startsWith('const ')) {
        flushList(idx);
        if (trimmed !== '') {
          elements.push(
            <pre key={idx} className="bg-[#111622] text-[#CAAA98] border border-[#2A2E39] p-3 rounded font-mono text-[11px] overflow-x-auto my-2 whitespace-pre leading-relaxed">
              {line}
            </pre>
          );
          return;
        }
      }

      // Bullet points
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        inList = true;
        const cleanText = trimmed.replace(/^[\*\-]\s+/, '');
        listItems.push(
          <li key={`li-${idx}`} className="list-none flex items-start text-xs text-gray-300 ml-1.5">
            <span className="text-[#CAAA98] mr-2 font-bold select-none">•</span>
            <span>{parseInlineMarkdown(cleanText)}</span>
          </li>
        );
        return;
      }

      // Tables
      if (trimmed.startsWith('|')) {
        flushList(idx);
        if (trimmed.includes('---')) return; // skip line dividers
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        const isHeader = idx === 0 || (lines[idx - 1] && lines[idx - 1].startsWith('###')) || (lines[idx + 1] && lines[idx + 1].includes('---'));
        elements.push(
          <div 
            key={idx} 
            className={`grid grid-cols-${cells.length > 0 ? cells.length : 3} gap-4 p-2.5 text-[11px] font-mono border-b border-[#2A2E39]/40 ${
              isHeader ? 'bg-[#1E2433] text-[#CAAA98] font-bold border-b border-[#2A2E39] uppercase' : 'text-gray-300'
            }`}
          >
            {cells.map((cell, cIdx) => (
              <div key={cIdx} className="truncate" title={cell}>
                {parseInlineMarkdown(cell)}
              </div>
            ))}
          </div>
        );
        return;
      }

      // Empty line / paragraph break
      if (trimmed === '') {
        flushList(idx);
        elements.push(<div key={`spacer-${idx}`} className="h-2.5" />);
        return;
      }

      // Default standard line
      if (inList) {
        flushList(idx);
      }
      elements.push(
        <p key={idx} className="text-xs text-gray-300 leading-relaxed font-sans my-1">
          {parseInlineMarkdown(line)}
        </p>
      );
    });

    flushList('final');
    return <div className="space-y-1">{elements}</div>;
  };

  const parseInlineMarkdown = (text: string) => {
    let parts: React.ReactNode[] = [text];
    
    // Parse Bold (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    if (text.match(boldRegex)) {
      const segments = text.split(/\*\*(.*?)\*\*/g);
      parts = segments.map((seg, i) => i % 2 === 1 ? <strong key={`b-${i}`} className="text-[#CAAA98] font-bold">{seg}</strong> : seg);
    }
    
    // Parse Inline Code (`code`)
    const codeRegex = /`(.*?)`/g;
    parts = parts.map((part) => {
      if (typeof part !== 'string') return part;
      if (!part.match(codeRegex)) return part;
      const segments = part.split(/`(.*?)`/g);
      return segments.map((seg, i) => i % 2 === 1 ? (
        <code key={`c-${i}`} className="bg-[#111622] text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-[#2A2E39] text-[10px]">
          {seg}
        </code>
      ) : seg);
    });

    return <>{parts}</>;
  };

  // Document Searching Engine
  const filterDocCategory = (cats: DocCategory[]): DocCategory[] => {
    if (!searchTerm.trim()) return cats;
    return cats.map(cat => {
      const matchedSecs = cat.sections.filter(sec => 
        sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...cat, sections: matchedSecs };
    }).filter(cat => cat.sections.length > 0);
  };

  const filteredUserDocs = filterDocCategory(USER_DOCUMENTATION);
  const filteredDevDocs = filterDocCategory(DEVELOPER_DOCUMENTATION);

  // Active section lookups
  const activeUserSection = USER_DOCUMENTATION.flatMap(c => c.sections).find(s => s.id === selectedUserSecId);
  const activeDevSection = DEVELOPER_DOCUMENTATION.flatMap(c => c.sections).find(s => s.id === selectedDevSecId);

  return (
    <div id="specs-personas-hub-overlay" className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        id="specs-personas-hub-modal"
        className="bg-[#1A1F2C] border border-[#2A2E39] w-full max-w-6xl h-[88vh] rounded-xl flex flex-col overflow-hidden shadow-2xl relative"
      >
        {/* Modal Close */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer z-50"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="p-5 border-b border-[#2A2E39] bg-[#1E2433] shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="bg-[#CAAA98]/10 text-[#CAAA98] p-1.5 rounded">
                  <BookOpen size={16} />
                </div>
                <h2 className="text-md font-bold text-gray-100 font-display uppercase tracking-wider">
                  Documentation & Blueprint Hub
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                Explore setup guides, technical specifications, user manuals, and the core algorithmic architecture of AutoSLP.
              </p>
            </div>

            {/* Responsive Tab Selector */}
            <div className="flex flex-wrap bg-[#111622] p-1 rounded-lg border border-[#2A2E39] self-start lg:self-auto gap-0.5">
              <button
                id="tab-spec"
                onClick={() => { setActiveTab('spec'); setSearchTerm(''); }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'spec' 
                    ? 'bg-[#2A3245] text-[#CAAA98] shadow-inner' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Design Blueprint
              </button>
              
              <button
                id="tab-user-docs"
                onClick={() => { setActiveTab('user_docs'); setSearchTerm(''); }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'user_docs' 
                    ? 'bg-[#2A3245] text-[#CAAA98] shadow-inner' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                User Manual
              </button>

              <button
                id="tab-dev-docs"
                onClick={() => { setActiveTab('dev_docs'); setSearchTerm(''); }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'dev_docs' 
                    ? 'bg-[#2A3245] text-[#CAAA98] shadow-inner' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Developer Guide
              </button>

              <button
                id="tab-personas"
                onClick={() => { setActiveTab('personas'); setSearchTerm(''); }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${
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
        <div className="flex-1 overflow-hidden flex flex-col bg-[#111622]">
          
          {/* Global Search Bar (Only shown for docs/specs) */}
          {activeTab !== 'personas' && (
            <div className="p-4 bg-[#141926] border-b border-[#2A2E39] flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <div className="relative w-full sm:w-80">
                <Search size={13} className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder={`Search in ${activeTab === 'spec' ? 'Design Specification' : activeTab === 'user_docs' ? 'User Manual' : 'Developer Guide'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2A2E39] text-xs text-gray-200 pl-9 pr-4 py-2 rounded focus:outline-none focus:border-[#CAAA98] font-sans"
                />
              </div>
              
              {activeTab === 'spec' && (
                <button
                  id="btn-copy-markdown"
                  onClick={handleCopy}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-[#26A69A]/10 hover:bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/30 px-3.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied Specs!' : 'Copy Specs Markdown'}</span>
                </button>
              )}
            </div>
          )}

          {/* Tab Contents Frame */}
          <div className="flex-1 overflow-hidden p-5 flex flex-col h-full">
            
            {/* TAB 1: DESIGN BLUEPRINTS */}
            {activeTab === 'spec' && (
              <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                {filteredSpecSections.map((sec, idx) => (
                  <div key={idx} className="bg-[#1A1F2C] border border-[#2A2E39] rounded-lg p-5 hover:border-gray-700 transition-colors">
                    <h3 className="text-xs font-bold text-[#CAAA98] uppercase tracking-wider border-b border-[#2A2E39] pb-2 mb-3 flex items-center space-x-2 font-mono">
                      <span className="text-gray-500">0{idx + 1}.</span>
                      <span>{sec.title}</span>
                    </h3>
                    <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {sec.content}
                    </div>
                  </div>
                ))}

                {filteredSpecSections.length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-xs font-mono">
                    No specifications match "{searchTerm}"
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: USER MANUAL */}
            {activeTab === 'user_docs' && (
              <div className="flex flex-col md:flex-row h-full overflow-hidden gap-4 flex-1">
                {/* Manual Navigation Sidebar */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#2A2E39] pb-4 md:pb-0 md:pr-4 overflow-y-auto shrink-0 space-y-4">
                  {filteredUserDocs.map((cat) => (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">
                        {getCategoryIcon(cat.id)}
                        <span>{cat.title}</span>
                      </div>
                      <div className="space-y-1">
                        {cat.sections.map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => setSelectedUserSecId(sec.id)}
                            className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                              selectedUserSecId === sec.id 
                                ? 'bg-[#2A3245] text-[#CAAA98] font-bold' 
                                : 'text-gray-400 hover:bg-[#1A1F2C] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{sec.title}</span>
                            <ChevronRight size={12} className={selectedUserSecId === sec.id ? 'text-[#CAAA98]' : 'text-gray-600'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredUserDocs.length === 0 && (
                    <div className="text-center text-xs text-gray-600 font-mono py-6">No matches found</div>
                  )}
                </div>

                {/* Content Reader Box */}
                <div className="flex-1 bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 md:p-6 overflow-y-auto max-h-[50vh] md:max-h-full">
                  {activeUserSection ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="border-b border-[#2A2E39] pb-3 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#CAAA98] uppercase tracking-widest bg-[#2A3245]/40 px-2 py-0.5 rounded">
                          AUTO-SLP USER MANUAL
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          ID: {activeUserSection.id}
                        </span>
                      </div>
                      <h2 className="text-md sm:text-lg font-bold text-white font-display uppercase tracking-wide">
                        {activeUserSection.title}
                      </h2>
                      <div className="pt-2">
                        {renderDocMarkdown(activeUserSection.content)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                      Select a topic from the left sidebar to begin reading.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DEVELOPER GUIDE */}
            {activeTab === 'dev_docs' && (
              <div className="flex flex-col md:flex-row h-full overflow-hidden gap-4 flex-1">
                {/* Guide Navigation Sidebar */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#2A2E39] pb-4 md:pb-0 md:pr-4 overflow-y-auto shrink-0 space-y-4">
                  {filteredDevDocs.map((cat) => (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">
                        {getCategoryIcon(cat.id)}
                        <span>{cat.title}</span>
                      </div>
                      <div className="space-y-1">
                        {cat.sections.map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => setSelectedDevSecId(sec.id)}
                            className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                              selectedDevSecId === sec.id 
                                ? 'bg-[#2A3245] text-[#CAAA98] font-bold' 
                                : 'text-gray-400 hover:bg-[#1A1F2C] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{sec.title}</span>
                            <ChevronRight size={12} className={selectedDevSecId === sec.id ? 'text-[#CAAA98]' : 'text-gray-600'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredDevDocs.length === 0 && (
                    <div className="text-center text-xs text-gray-600 font-mono py-6">No matches found</div>
                  )}
                </div>

                {/* Content Reader Box */}
                <div className="flex-1 bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 md:p-6 overflow-y-auto max-h-[50vh] md:max-h-full">
                  {activeDevSection ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="border-b border-[#2A2E39] pb-3 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#CAAA98] uppercase tracking-widest bg-[#2A3245]/40 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Terminal size={10} className="text-emerald-400" />
                          <span>DEVELOPER CORE RESOURCE</span>
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          ID: {activeDevSection.id}
                        </span>
                      </div>
                      <h2 className="text-md sm:text-lg font-bold text-white font-display uppercase tracking-wide">
                        {activeDevSection.title}
                      </h2>
                      <div className="pt-2">
                        {renderDocMarkdown(activeDevSection.content)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                      Select a topic from the left sidebar to inspect details.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DETAILED TRADER PERSONAS DOSSIERS */}
            {activeTab === 'personas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto pr-1 flex-1">
                {TRADER_PERSONAS.map((p, idx) => (
                  <div 
                    key={idx} 
                    id={`persona-card-${idx}`}
                    className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#CAAA98]/40 transition-all duration-300"
                  >
                    {/* Persona Header Banner */}
                    <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39]">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#CAAA98]/10 border border-[#CAAA98] flex items-center justify-center text-[#CAAA98] font-bold text-md font-display">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-200 font-display">{p.name}</h4>
                          <div className="flex items-center space-x-1 mt-0.5 text-[9px] text-gray-400">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono">Age: {p.age}</span>
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded font-sans">{p.experience}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Persona Body Details */}
                    <div className="p-4 flex-1 space-y-3 text-[11px] font-sans">
                      {/* Markets */}
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">TRADED MARKETS</span>
                        <div className="flex flex-wrap gap-1">
                          {p.markets.map((m, mIdx) => (
                            <span key={mIdx} className="bg-[#111622] text-[#CAAA98] border border-[#2A2E39] px-2 py-0.5 rounded text-[9px] font-mono">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Workflow */}
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">DAILY WORKFLOW</span>
                        <ul className="space-y-1 text-gray-300 leading-relaxed text-[10px]">
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
                        <span className="text-[9px] text-[#EF5350] uppercase tracking-wider font-bold block mb-1">PAIN POINTS WITH TV/MT4</span>
                        <ul className="space-y-1 text-gray-300 text-[10px]">
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
                        <span className="text-[9px] text-[#26A69A] uppercase tracking-wider font-bold block mb-1">PRIORITY FEATURES</span>
                        <ul className="space-y-1 text-gray-300 text-[10px]">
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
                    <div className="p-3 bg-[#141822] border-t border-[#2A2E39] space-y-1 text-[9px] font-mono">
                      <div className="flex justify-between text-gray-500">
                        <span>Rig: <span className="text-gray-300 truncate max-w-[130px] inline-block align-bottom" title={p.device}>{p.device}</span></span>
                        <span>Lit: <span className="text-gray-300">{p.literacy.split(' ')[0]}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2A2E39] bg-[#1E2433] shrink-0 text-center flex justify-between items-center text-xs text-gray-400">
          <span className="font-mono text-[10px] uppercase tracking-wider">
            AutoSLP Documentation Suite &bull; V4.2 Professional Edition
          </span>
          <button 
            onClick={onClose}
            className="text-[#CAAA98] hover:text-white font-bold cursor-pointer font-sans"
          >
            Acknowledge Spec & Return to Live App
          </button>
        </div>
      </div>
    </div>
  );
}
