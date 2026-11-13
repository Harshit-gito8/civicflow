import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CivicFlow ErrorBoundary caught an exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b132b] flex items-center justify-center p-6 text-slate-100">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-rose-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-rose-300">Application Render Notice</h2>
            <p className="text-xs text-slate-300">
              An unexpected interface error occurred during execution:
            </p>
            <pre className="text-[11px] bg-slate-950 p-3 rounded-lg text-rose-200 overflow-x-auto text-left font-mono">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-teal-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload CivicFlow</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
