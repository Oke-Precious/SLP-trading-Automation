import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('💥 [AutoSLP ErrorBoundary] Caught exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReport = () => {
    alert('Incident reported successfully. AutoSLP core engineers have been notified (Mock Simulation).');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111622] text-[#F3F4F6] flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-xl w-full bg-[#1A1F2C] border border-[#EF5350]/30 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-500/15 text-[#EF5350] rounded-xl border border-red-500/25">
                <AlertTriangle size={32} />
              </div>
              <div>
                <span className="text-red-400 font-mono text-[10px] uppercase font-bold tracking-wider">CRITICAL ENGINE EXCEPTION</span>
                <h1 className="text-xl font-bold font-display tracking-tight text-white mt-0.5">AutoSLP Application Crashed</h1>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-normal">
              A rendering exception or malformed JSON data sequence interrupted the AutoSLP workspace loop. Stop-loss levels and alarms remain secured on our persistent server architecture.
            </p>

            <div className="bg-[#111622] border border-[#2A2E39] rounded-xl p-4 font-mono text-xs">
              <div className="text-red-400 font-bold mb-1">Error Message:</div>
              <div className="text-[#E5E7EB] break-all leading-normal bg-black/30 p-2.5 rounded border border-[#2A2E39]/50 shadow-inner">
                {this.state.error?.toString() || 'Unknown runtime error exception'}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors py-1 cursor-pointer font-mono"
              >
                <span className="flex items-center space-x-1.5">
                  <Bug size={14} />
                  <span>{this.state.showDetails ? 'Hide' : 'Reveal'} full stack traces</span>
                </span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div className="bg-[#111622] border border-[#2A2E39] rounded-xl p-4 font-mono text-[10px] text-gray-500 max-h-48 overflow-y-auto overflow-x-auto leading-normal whitespace-pre">
                  {this.state.error?.stack || 'No extended stack traces available.'}
                  {this.state.errorInfo && `\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-[#CAAA98] hover:bg-[#CAAA98]/90 text-slate-950 font-bold py-2.5 px-4 rounded-lg cursor-pointer uppercase tracking-wider text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw size={14} className="animate-spin" />
                <span>Reload Session</span>
              </button>
              <button
                onClick={this.handleReport}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer border border-slate-700 uppercase tracking-wider text-xs transition-colors"
              >
                Report Incident
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
