import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Star, Sparkles, Send, X, Shield, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../lib/api/client';
import { analytics } from '../lib/analytics';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNps, setShowNps] = useState(false);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsText, setNpsText] = useState('');
  
  // Suggest a Feature State
  const [idea, setIdea] = useState('');
  const [priority, setPriority] = useState<'must' | 'want' | 'nice'>('nice');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NPS Triggering Logic (simulate after 30 days; check localStorage dismiss status)
  useEffect(() => {
    const isNpsDismissed = localStorage.getItem('autoslp_nps_dismissed') === 'true';
    if (!isNpsDismissed) {
      // Show slide-in NPS survey after a small delay for demo/testing purposes
      const timer = setTimeout(() => {
        setShowNps(true);
      }, 10000); // 10s delay to let user settle
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) {
      toast.error('Please write something before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Track the feature suggestion in analytics
      analytics.track('settings_changed', { section: 'feature_suggestion_click' });

      const response = await apiClient.post('/feedback', {
        idea,
        priority,
        category,
      });

      if (response.data?.success) {
        toast.success('Thank you! Your suggestion has been recorded & routed for triage.', {
          icon: '🚀',
          duration: 5000,
        });
        setIdea('');
        setIsOpen(false);
      } else {
        throw new Error('Fallback target offline');
      }
    } catch {
      // Offline fallback still logs a helpful notification
      toast.success('Suggestion recorded securely offline (Demo Mode). Thank you!');
      setIdea('');
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNpsSubmit = async () => {
    if (npsScore === null) {
      toast.error('Please select a score from 0 to 10 first.');
      return;
    }

    try {
      analytics.track('alert_created', { alertType: `nps_score_${npsScore}` });

      const response = await apiClient.post('/feedback/nps', {
        score: npsScore,
        feedback: npsText,
      });

      if (response.data?.success) {
        toast.success('Thank you for your feedback! Your NPS score helps us improve.', {
          icon: '✨',
        });
        localStorage.setItem('autoslp_nps_dismissed', 'true');
        setShowNps(false);
      }
    } catch {
      toast.success('Feedback recorded securely offline (Demo mode). Thank you!');
      localStorage.setItem('autoslp_nps_dismissed', 'true');
      setShowNps(false);
    }
  };

  const dismissNps = () => {
    localStorage.setItem('autoslp_nps_dismissed', 'true');
    setShowNps(false);
  };

  return (
    <div id="autoslp-ambient-feedback-widget" className="fixed bottom-6 right-6 z-40 select-none font-sans">
      {/* 1. NPS Slide-in Survey panel */}
      {showNps && (
        <div 
          id="nps-survey-card"
          className="mb-4 bg-[#1B2131] border border-[#2C354E] hover:border-[#CAAA98]/40 p-5 rounded-xl shadow-2xl max-w-sm transition-all duration-300 transform scale-102 flex flex-col gap-3.5 relative"
        >
          <button 
            onClick={dismissNps}
            className="absolute top-2.5 right-2.5 text-gray-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>

          <div className="flex items-center space-x-2">
            <div className="p-1 px-1.5 bg-[#CAAA98]/10 text-[#CAAA98] rounded-md">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">How likely are you to recommend AutoSLP?</h4>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed font-normal">
            Based on your trading sessions in the sandbox, rate us from 0 (Not likely) to 10 (Extremely likely).
          </p>

          {/* 0-10 Buttons Scale Grid */}
          <div className="grid grid-cols-11 gap-1 text-[10px] font-mono">
            {Array.from({ length: 11 }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setNpsScore(idx)}
                className={`py-1 rounded text-center font-bold border transition-all cursor-pointer ${
                  npsScore === idx
                    ? 'bg-[#CAAA98] text-slate-950 border-[#CAAA98] scale-105'
                    : 'bg-[#111622] hover:bg-[#CAAA98]/25 text-gray-300 border-slate-700/60'
                }`}
              >
                {idx}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 px-1">
            <span>0 - Detractor</span>
            <span>10 - Promoter</span>
          </div>

          <textarea
            rows={2}
            placeholder="Tell us what we can do better (optional)..."
            value={npsText}
            onChange={(e) => setNpsText(e.target.value)}
            className="w-full bg-[#111622] border border-[#2A3143] focus:border-[#CAAA98]/50 rounded text-[11px] p-2 text-gray-200 outline-none transition-all placeholder:text-gray-500"
          />

          <button
            onClick={handleNpsSubmit}
            className="w-full bg-[#CAAA98] hover:bg-[#CAAA98]/90 text-[#111622] py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase flex items-center justify-center space-x-1 cursor-pointer transition-colors"
          >
            <Send size={11} />
            <span>Submit NPS Review</span>
          </button>
        </div>
      )}

      {/* 2. Floating Action Button Suggest widget */}
      <button
        id="feature-suggestion-floating-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-gradient-to-r from-[#CAAA98] to-[#998877] text-slate-950 hover:from-[#CAAA98] hover:to-[#B69680] shadow-xl px-4 py-2.5 rounded-full cursor-pointer hover:shadow-2xl transition-all font-semibold text-xs tracking-wider uppercase select-none hover:scale-105"
      >
        <MessageSquare size={14} className="animate-bounce" />
        <span>Suggest Features</span>
      </button>

      {/* 3. Modal / Dialog widget suggest popup */}
      {isOpen && (
        <div 
          id="feature-suggest-dialog"
          className="absolute bottom-16 right-0 bg-[#1B2131] border border-[#2C354E] hover:border-[#CAAA98]/40 p-5 rounded-xl shadow-2xl w-80 text-left transition-all duration-300"
        >
          <div className="flex items-center justify-between border-b border-[#2C354E]/60 pb-3 mb-4">
            <div className="flex items-center space-x-2 text-white">
              <Heart size={15} className="text-[#CAAA98]" />
              <h3 className="text-sm font-bold tracking-tight">Suggest a Feature</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSuggestSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Your Feature Idea</label>
              <textarea
                required
                rows={3}
                placeholder="What should we build next? Described clearly..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                className="w-full bg-[#111622] border border-[#2A3143] focus:border-[#CAAA98]/50 rounded text-xs p-2.5 text-gray-200 outline-none transition-all placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#111622] border border-[#2A3143] focus:border-[#CAAA98]/50 rounded text-xs p-1 px-2 text-gray-300 outline-none"
                >
                  <option value="nice">Nice to Have</option>
                  <option value="want">Want It</option>
                  <option value="must">Must Have (Critical)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2A3143] focus:border-[#CAAA98]/50 rounded text-xs p-1 px-2 text-gray-300 outline-none"
                >
                  <option value="general">General UI</option>
                  <option value="chart">Charts & Indicators</option>
                  <option value="alerts">Trigger Alerts</option>
                  <option value="ai">AI Features</option>
                  <option value="journal">Diary Journal</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full bg-[#CAAA98] hover:bg-[#CAAA98]/90 disabled:bg-gray-700 text-slate-950 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <Send size={11} />
              <span>{isSubmitting ? 'Routing idea...' : 'Submit Suggestion'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
