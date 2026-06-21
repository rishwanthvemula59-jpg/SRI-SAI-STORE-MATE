import { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, BookOpen, AlertTriangle, TrendingUp, Package, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface Props {
  onNavigate: (tab: 'credit' | 'orders') => void;
}

export default function HomeModule({ onNavigate }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [custData, orderData, txData, summaryData] = await Promise.all([
          api.getCustomers(),
          api.getOrders(),
          api.getRecentTransactions(),
          api.getLedgerSummary()
        ]);
        setCustomers(custData);
        setOrders(orderData);
        setRecentTx(txData);
        setSummary(summaryData);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const getDaysPending = (dateStr: string) => {
    if (!dateStr) return 0;
    const past = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - past.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Metrics
  const totalGet = customers.reduce((sum, c) => c.balance > 0 ? sum + c.balance : sum, 0);
  const overdueCount = customers.filter(c => c.balance > 0 && getDaysPending(c.oldest_debit_date) > 30).length;
  
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const urgentOrders = pendingOrders.filter(o => o.priority === 'urgent');
  const toOrderCount = pendingOrders.length;
  const urgentOrderCount = urgentOrders.length;

  // Donut/Segmented bar counts
  const totalAccounts = customers.length || 1;
  const settledCount = customers.filter(c => c.balance === 0).length;
  const overdueDebtCount = customers.filter(c => c.balance > 0 && getDaysPending(c.oldest_debit_date) > 30).length;
  const activeDebtCount = customers.filter(c => c.balance > 0 && getDaysPending(c.oldest_debit_date) <= 30).length;
  const youGiveCount = customers.filter(c => c.balance < 0).length;

  const settledPct = Math.round((settledCount / totalAccounts) * 100);
  const activePct = Math.round((activeDebtCount / totalAccounts) * 100);
  const overduePct = Math.round((overdueDebtCount / totalAccounts) * 100);
  const givePct = Math.round((youGiveCount / totalAccounts) * 100);

  // SVG Chart sizing
  const chartHeight = 120;
  const chartWidth = 320;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(
    ...summary.map(s => Math.max(s.total_debit, s.total_credit)),
    1000 // default max scale
  ) * 1.15;

  const getMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  if (loading) {
    return <div className="p-xl text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="p-xl flex flex-col gap-lg pb-[100px]">
      {/* Top Branding Header */}
      <div className="flex items-center justify-between mb-md pt-2">
        <div className="flex items-center gap-md">
          <div className="bg-success-600 text-white rounded-xl p-3 flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, var(--color-success-600), var(--color-success-700))' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <h1 className="text-heading text-gray-900" style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Sri Sai StoreMate</h1>
            <div className="text-xs font-bold text-gray-500 tracking-wide uppercase mt-1">Medical & General Stores</div>
          </div>
        </div>
      </div>

      {/* Primary Metric Hero Card */}
      <div 
        className="card mb-sm cursor-pointer" 
        style={{ 
          background: 'linear-gradient(145deg, #064E3B 0%, #059669 100%)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 12px 24px -8px rgba(5, 150, 105, 0.4)',
          borderRadius: '16px',
          padding: '24px'
        }}
        onClick={() => onNavigate('credit')}
      >
        <div className="flex items-center gap-sm mb-lg opacity-80">
          <TrendingUp size={24} />
          <span className="font-semibold text-sm tracking-wide uppercase">Total You Will Get</span>
        </div>
        <div className="text-display mb-md" style={{ fontSize: '42px', fontWeight: '800' }}>
          ₹{totalGet.toLocaleString('en-IN')}
        </div>
        <div className="flex justify-between items-center opacity-90 text-sm font-medium">
          <span>{customers.filter(c => c.balance > 0).length} active khata accounts</span>
          <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px' }}>View all &rarr;</span>
        </div>
      </div>

      {/* Grid for Overdue & To Order */}
      <div className="flex gap-md">
        {/* Overdue */}
        <button 
          className="card flex-1 text-left card-warning-gradient" 
          style={{ padding: '20px', borderRadius: '16px', cursor: 'pointer' }}
          onClick={() => onNavigate('credit')}
        >
          <div className="flex items-center gap-xs mb-md text-warning-700">
            <AlertTriangle size={20} />
            <span className="font-semibold text-sm">Overdue</span>
          </div>
          <div>
            <div className="text-display text-warning-700" style={{ fontSize: '32px' }}>
              {overdueCount}
            </div>
            <div className="text-caption text-warning-600 mt-1">Customers (30+ days)</div>
          </div>
        </button>

        {/* To Order */}
        <button 
          className="card flex-1 text-left card-gray-gradient" 
          style={{ padding: '20px', borderRadius: '16px', cursor: 'pointer' }}
          onClick={() => onNavigate('orders')}
        >
          <div className="flex items-center gap-xs mb-md text-gray-700">
            <Package size={20} />
            <span className="font-semibold text-sm">To Order</span>
          </div>
          <div>
            <div className="text-display text-gray-900" style={{ fontSize: '32px' }}>
              {toOrderCount}
            </div>
            <div className="text-caption mt-1 text-gray-500">
              {urgentOrderCount > 0 ? <span className="text-danger-600 font-bold">{urgentOrderCount} urgent</span> : 'Drafted items'}
            </div>
          </div>
        </button>
      </div>

      {/* Custom SVG Ledger Trends Chart */}
      {summary.length > 0 && (
        <div className="card p-lg">
          <h3 className="text-heading mb-sm" style={{ fontSize: '16px' }}>Ledger Trends (Last 6 Months)</h3>
          <p className="text-caption mb-lg">Comparing medicine debits vs. credit payments</p>
          
          <div className="flex justify-center">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ maxHeight: '160px' }}>
              {/* Horizontal grid lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="var(--color-gray-100)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={paddingX} y1={(chartHeight - paddingY) / 2 + paddingY / 2} x2={chartWidth - paddingX} y2={(chartHeight - paddingY) / 2 + paddingY / 2} stroke="var(--color-gray-100)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="var(--color-gray-200)" strokeWidth="1.5" />

              {/* Bars */}
              {summary.map((s, idx) => {
                const groupWidth = (chartWidth - paddingX * 2) / summary.length;
                const groupX = paddingX + idx * groupWidth;
                const barWidth = Math.max(6, groupWidth * 0.25);
                
                const debitHeight = (s.total_debit / maxVal) * (chartHeight - paddingY * 2);
                const creditHeight = (s.total_credit / maxVal) * (chartHeight - paddingY * 2);

                const debitY = chartHeight - paddingY - debitHeight;
                const creditY = chartHeight - paddingY - creditHeight;

                const centerX = groupX + groupWidth / 2;

                return (
                  <g key={s.month}>
                    {/* Debit Bar (Coral Red) */}
                    <rect 
                      x={centerX - barWidth - 2} 
                      y={debitY} 
                      width={barWidth} 
                      height={debitHeight} 
                      fill="var(--color-primary-500)" 
                      rx="2"
                    />
                    {/* Credit Bar (Emerald Green) */}
                    <rect 
                      x={centerX + 2} 
                      y={creditY} 
                      width={barWidth} 
                      height={creditHeight} 
                      fill="var(--color-success-600)" 
                      rx="2"
                    />
                    {/* X-axis labels */}
                    <text 
                      x={centerX} 
                      y={chartHeight - 4} 
                      textAnchor="middle" 
                      fontSize="10" 
                      fontWeight="600" 
                      fill="var(--color-gray-500)"
                    >
                      {getMonthName(s.month)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex gap-md justify-center mt-md text-xs font-semibold">
            <span className="flex items-center gap-xs"><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: 'var(--color-primary-500)', borderRadius: '3px' }}></span> Debits (Gave)</span>
            <span className="flex items-center gap-xs"><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: 'var(--color-success-600)', borderRadius: '3px' }}></span> Credits (Got)</span>
          </div>
        </div>
      )}

      {/* Account Distribution Segmented Progress Bar */}
      <div className="card p-lg">
        <h3 className="text-heading mb-sm" style={{ fontSize: '16px' }}>Khata Accounts Status</h3>
        <p className="text-caption mb-md">Breakdown of customer account balances</p>

        {/* Stacked bar */}
        <div style={{ height: 10, width: '100%', borderRadius: 5, overflow: 'hidden', display: 'flex', backgroundColor: 'var(--color-gray-200)' }}>
          {overduePct > 0 && <div style={{ width: `${overduePct}%`, backgroundColor: 'var(--color-warning-600)' }} title={`Overdue: ${overduePct}%`} />}
          {activePct > 0 && <div style={{ width: `${activePct}%`, backgroundColor: 'var(--color-success-600)' }} title={`Active Debt: ${activePct}%`} />}
          {settledPct > 0 && <div style={{ width: `${settledPct}%`, backgroundColor: 'var(--color-gray-400)' }} title={`Settled: ${settledPct}%`} />}
          {givePct > 0 && <div style={{ width: `${givePct}%`, backgroundColor: 'var(--color-primary-600)' }} title={`You owe them: ${givePct}%`} />}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-sm mt-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="flex items-center gap-xs text-xs font-medium">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-warning-600)' }}></div>
            <span className="text-gray-700">{overdueDebtCount} Overdue (30+ days)</span>
          </div>
          <div className="flex items-center gap-xs text-xs font-medium">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success-600)' }}></div>
            <span className="text-gray-700">{activeDebtCount} Active Debits</span>
          </div>
          <div className="flex items-center gap-xs text-xs font-medium">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-gray-400)' }}></div>
            <span className="text-gray-700">{settledCount} Settled Accounts</span>
          </div>
          <div className="flex items-center gap-xs text-xs font-medium">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary-600)' }}></div>
            <span className="text-gray-700">{youGiveCount} You Owe (Credits)</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="card">
        <div className="p-md flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
          <h3 className="text-heading flex items-center gap-xs" style={{ fontSize: '16px' }}>
            <Clock size={18} className="text-gray-400" /> Recent Transactions
          </h3>
        </div>
        
        <div className="flex flex-col">
          {recentTx.length === 0 ? (
            <div className="p-xl text-center text-gray-500 text-sm">No transactions recorded yet.</div>
          ) : (
            recentTx.map(tx => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-md cursor-pointer hover-bg-gray" 
                style={{ borderBottom: '1px solid var(--color-gray-200)' }}
                onClick={() => onNavigate('credit')}
              >
                <div>
                  <div className="text-body font-semibold text-gray-900">{tx.customer_name}</div>
                  <div className="text-caption flex items-center gap-xs mt-1" style={{ fontSize: '12px' }}>
                    <span>{tx.date}</span>
                    {tx.note && <span>· {tx.note}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-xs">
                  <div className={`text-body font-bold ${tx.type === 'credit' ? 'text-success-600' : 'text-primary-600'}`}>
                    {tx.type === 'credit' ? <ArrowDownRight size={16} style={{ display: 'inline', marginRight: 2 }} /> : <ArrowUpRight size={16} style={{ display: 'inline', marginRight: 2 }} />}
                    ₹{tx.amount}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-xs">
        <h2 className="text-heading mb-md" style={{ fontSize: '18px' }}>Quick Actions</h2>
        <div className="flex flex-col gap-sm">
          <button 
            className="card flex justify-between items-center w-full text-left cursor-pointer"
            style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}
            onClick={() => onNavigate('credit')}
          >
            <div className="flex items-center gap-md">
              <div className="p-sm bg-primary-50 text-primary-600" style={{ borderRadius: '10px' }}>
                <Users size={24} />
              </div>
              <span className="font-semibold text-gray-900">Record a payment or debt</span>
            </div>
            <span className="text-gray-400">&rarr;</span>
          </button>

          <button 
            className="card flex justify-between items-center w-full text-left cursor-pointer"
            style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}
            onClick={() => onNavigate('orders')}
          >
            <div className="flex items-center gap-md">
              <div className="p-sm bg-gray-100 text-gray-700" style={{ borderRadius: '10px' }}>
                <BookOpen size={24} />
              </div>
              <span className="font-semibold text-gray-900">Add to order book</span>
            </div>
            <span className="text-gray-400">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
