/**
 * @file POIMapPanel.tsx
 * @description List of HTF POIs for the selected pair and timeframe loaded from the real backend API.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { usePOIStore } from '../../store/usePOIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { Layers, Plus, X, RotateCw } from 'lucide-react';
import { POI } from '../../types';
import { Skeleton } from '../ui/Skeleton';

export const POIMapPanel: React.FC = () => {
  const { selectedPair } = useMarketStore();
  const { activePOI, setActivePOI } = usePOIStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'OB',
    priceRange: '',
    timeframe: '1H',
    status: 'Active',
  });

  const { data: rawPois, isLoading, refetch } = useQuery({
    queryKey: ['pois', selectedPair],
    queryFn: async () => {
      const { data } = await apiClient.get('/pois', { params: { pair: selectedPair } });
      return data?.data ?? data ?? [];
    }
  });

  // Normalize backend / DB items safely to Frontend POI model
  const pois: POI[] = Array.isArray(rawPois) ? rawPois.map((item: any) => {
    const typeMapped = (item.type === 'ORDER_BLOCK' || item.type === 'OB') ? 'OB' : 'BB';
    const rawStatus = String(item.status || '').toUpperCase();
    let statusMapped: 'Active' | 'Mitigated' | 'Tested' = 'Active';
    
    if (rawStatus === 'MITIGATED') {
      statusMapped = 'Mitigated';
    } else if (rawStatus === 'TESTED') {
      statusMapped = 'Tested';
    }

    // Parse simple ranges or format values
    const priceFromVal = item.priceFrom !== undefined ? item.priceFrom : (item.priceMin || 0);
    const priceToVal = item.priceTo !== undefined ? item.priceTo : (item.priceMax || 0);
    const rangeText = item.priceRange || `$${Number(priceFromVal).toLocaleString()} - $${Number(priceToVal).toLocaleString()}`;

    return {
      id: String(item.id),
      name: item.notes || item.name || (typeMapped === 'OB' ? 'Demand OB' : 'Breaker OB'),
      type: typeMapped,
      priceRange: rangeText,
      priceMin: Number(priceFromVal),
      priceMax: Number(priceToVal),
      status: statusMapped,
      timeframe: item.timeframe || '1H'
    };
  }) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formSubmitting) return;
    
    setFormSubmitting(true);
    try {
      const parsedMin = parseFloat(formData.priceRange.split('-')[0]?.replace(/[^0-9.]/g, '') || '0');
      const parsedMax = parseFloat(formData.priceRange.split('-')[1]?.replace(/[^0-9.]/g, '') || '0') || parsedMin + 100;

      await apiClient.post('/pois', {
        pair: selectedPair,
        timeframe: formData.timeframe,
        type: formData.type === 'OB' ? 'ORDER_BLOCK' : 'BREAKER_BLOCK',
        priceFrom: parsedMin,
        priceTo: parsedMax,
        status: formData.status.toUpperCase(),
        notes: formData.name
      });
      
      await refetch();
      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'OB',
        priceRange: '',
        timeframe: '1H',
        status: 'Active',
      });
    } catch (err) {
      console.error('Failed to save POI:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'Tested':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25';
      case 'Mitigated':
      default:
        return 'bg-neutral-800 text-gray-500 border-neutral-700';
    }
  };

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Layers className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">HTF POI Matrix</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider">
            {selectedPair}
          </span>
          <button
            onClick={() => refetch()}
            aria-label="Refresh POIs"
            className="p-1 hover:bg-[#2A3245] rounded text-gray-400 hover:text-white transition-colors"
          >
            <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            data-testid="add-poi-btn"
            className="flex items-center space-x-1 bg-[#CAAA98] hover:bg-opacity-95 text-slate-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer transition-colors"
          >
            <Plus size={10} />
            <span>Add POI</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="w-full h-16" />
            <Skeleton className="w-full h-16" />
            <Skeleton className="w-full h-16" />
          </div>
        ) : pois.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs font-mono">
            No active Points of Interest (POIs) found.
          </div>
        ) : (
          pois.map((poi) => {
            const isActive = activePOI?.id === poi.id;
            return (
              <div 
                key={poi.id}
                onClick={() => setActivePOI(isActive ? null : poi)}
                data-testid={`poi-row-${poi.id}`}
                className={`flex items-center justify-between p-3 rounded-lg bg-surface border transition-all cursor-pointer ${
                  isActive ? 'border-[#CAAA98] ring-1 ring-[#CAAA98]' : 'border-[#2D313E]/30'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-extrabold ${
                      poi.type === 'OB' ? 'bg-bullish/10 text-bullish border border-bullish/20' : 'bg-[#EF5350]/10 text-bearish border border-[#EF5350]/20'
                    }`}>
                      {poi.type}
                    </span>
                    <span className="text-[#E0E3EB] font-bold text-xs font-display">{poi.name}</span>
                  </div>
                  <p className="text-[10px] italic font-mono text-gray-500 mt-1">{poi.priceRange} &bull; Timeframe: {poi.timeframe}</p>
                </div>

                <div className="flex items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getBadgeColor(poi.status)}`}>
                    {poi.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="add-poi-modal">
          <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 w-80 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Create HTF POI</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Name</label>
                <input 
                  type="text"
                  required
                  data-testid="poi-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#131722] text-white border border-[#2A2E39] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#CAAA98]"
                  placeholder="e.g. Daily Demand OB"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#131722] text-white border border-[#2A2E39] rounded px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="OB">OB</option>
                    <option value="BB">BB</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Timeframe</label>
                  <select 
                    value={formData.timeframe}
                    onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                    className="w-full bg-[#131722] text-white border border-[#2A2E39] rounded px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="1D">1D</option>
                    <option value="4H">4H</option>
                    <option value="1H">1H</option>
                    <option value="15m">15m</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Price Range</label>
                <input 
                  type="text"
                  required
                  value={formData.priceRange}
                  onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                  className="w-full bg-[#131722] text-white border border-[#2A2E39] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#CAAA98]"
                  placeholder="e.g. 61200 - 61800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-[#131722] text-white border border-[#2A2E39] rounded px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Tested">Tested</option>
                  <option value="Mitigated">Mitigated</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={formSubmitting}
                data-testid="submit-poi-btn"
                className="w-full bg-[#CAAA98] disabled:opacity-50 text-slate-900 py-1.5 rounded font-bold text-xs uppercase cursor-pointer hover:bg-opacity-90 transition-all font-display mt-2"
              >
                {formSubmitting ? 'Saving POI...' : 'Save Point of Interest'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POIMapPanel;
