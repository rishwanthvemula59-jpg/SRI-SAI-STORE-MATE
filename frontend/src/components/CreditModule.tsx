import { useEffect, useState } from 'react';
import { api } from '../api';
import { Phone, Plus, Search, SlidersHorizontal } from 'lucide-react';
import CustomerDetail from './CustomerDetail';

export default function CreditModule() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'debt' | 'overdue' | 'settled'>('all');
  const [sortMode, setSortMode] = useState<'name' | 'debt-desc' | 'recent'>('name');

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [selectedCustomer]); // reload when backing out of detail view

  const handleAddCustomer = async () => {
    if (!newCustName || newCustPhone.length !== 10) return;
    try {
      await api.createCustomer(newCustName, newCustPhone);
      setShowAddCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      loadCustomers();
    } catch (e) {
      alert("Failed to create customer. Phone might be duplicate or invalid.");
    }
  };

  if (selectedCustomer) {
    return <CustomerDetail id={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  const totalGet = customers.reduce((sum, c) => c.balance > 0 ? sum + c.balance : sum, 0);
  const totalGive = customers.reduce((sum, c) => c.balance < 0 ? sum + Math.abs(c.balance) : sum, 0);
  
  // Calculate days overdue based on oldest debit date
  const getDaysPending = (dateStr: string) => {
    if (!dateStr) return 0;
    const past = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - past.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const overdueCustomers = customers.filter(c => c.balance > 0 && getDaysPending(c.oldest_debit_date) > 30);

  // Filter and Sort Logic
  const filteredCustomers = customers
    .filter(c => {
      // 1. Search Query
      const query = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(query) || c.phone.includes(query);
      if (!matchesSearch) return false;

      // 2. Filter Pills
      if (filterMode === 'debt') return c.balance > 0;
      if (filterMode === 'overdue') return c.balance > 0 && getDaysPending(c.oldest_debit_date) > 30;
      if (filterMode === 'settled') return c.balance === 0;
      return true; // 'all'
    })
    .sort((a, b) => {
      // 3. Sort Mode
      if (sortMode === 'debt-desc') {
        return b.balance - a.balance;
      }
      if (sortMode === 'recent') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      // 'name' (A-Z)
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-xl">
      {/* Dashboard Facts */}
      <div className="flex gap-md mb-lg mt-4">
        <div className="flex-1 card" style={{ padding: '16px', backgroundColor: 'var(--color-success-50)', borderColor: 'var(--color-success-100)' }}>
          <div className="text-success-700 text-caption mb-1">You will get</div>
          <div className="text-display text-success-600" style={{ fontSize: '24px' }}>₹{totalGet}</div>
        </div>
        <div className="flex-1 card" style={{ padding: '16px', backgroundColor: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}>
          <div className="text-primary-700 text-caption mb-1">You will give</div>
          <div className="text-display text-primary-600" style={{ fontSize: '24px' }}>₹{totalGive}</div>
        </div>
      </div>
      
      <div className="mb-lg">
        <button onClick={() => setShowAddCustomer(true)} className="btn btn-primary w-full" style={{ padding: '12px 16px', fontSize: '16px' }}>
          <Plus size={24} /> Add New Customer
        </button>
      </div>

      {/* Advanced Filter, Search, and Sort Controls */}
      <div className="card p-md mb-lg flex flex-col gap-sm">
        {/* Search */}
        <div className="flex items-center gap-xs" style={{ position: 'relative' }}>
          <Search size={18} className="text-gray-400" style={{ position: 'absolute', left: '12px' }} />
          <input 
            className="input" 
            placeholder="Search name or phone..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px', paddingTop: '10px', paddingBottom: '10px', fontSize: '14px' }}
          />
        </div>

        {/* Filters and Sort Row */}
        <div className="flex justify-between items-center gap-sm mt-xs">
          {/* Sorting */}
          <div className="flex items-center gap-xs text-xs font-semibold text-gray-500">
            <SlidersHorizontal size={14} />
            <span>Sort:</span>
            <select 
              className="input" 
              value={sortMode}
              onChange={e => setSortMode(e.target.value as any)}
              style={{ padding: '6px 20px 6px 10px', width: 'auto', fontSize: '13px', border: 'none', backgroundColor: 'var(--color-gray-100)', cursor: 'pointer' }}
            >
              <option value="name">Name (A-Z)</option>
              <option value="debt-desc">Highest Balance</option>
              <option value="recent">Recent Activity</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-xs" style={{ overflowX: 'auto', paddingBottom: '2px', display: 'flex', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilterMode('all')}
            className="btn text-xs" 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '99px',
              backgroundColor: filterMode === 'all' ? 'var(--color-gray-900)' : 'var(--color-gray-100)',
              color: filterMode === 'all' ? 'white' : 'var(--color-gray-600)'
            }}
          >
            All ({customers.length})
          </button>
          <button 
            onClick={() => setFilterMode('debt')}
            className="btn text-xs" 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '99px',
              backgroundColor: filterMode === 'debt' ? 'var(--color-success-600)' : 'var(--color-gray-100)',
              color: filterMode === 'debt' ? 'white' : 'var(--color-gray-600)'
            }}
          >
            Has Debt ({customers.filter(c => c.balance > 0).length})
          </button>
          <button 
            onClick={() => setFilterMode('overdue')}
            className="btn text-xs" 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '99px',
              backgroundColor: filterMode === 'overdue' ? 'var(--color-warning-600)' : 'var(--color-gray-100)',
              color: filterMode === 'overdue' ? 'white' : 'var(--color-gray-600)'
            }}
          >
            Overdue ({overdueCustomers.length})
          </button>
          <button 
            onClick={() => setFilterMode('settled')}
            className="btn text-xs" 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '99px',
              backgroundColor: filterMode === 'settled' ? 'var(--color-gray-500)' : 'var(--color-gray-100)',
              color: filterMode === 'settled' ? 'white' : 'var(--color-gray-600)'
            }}
          >
            Settled ({customers.filter(c => c.balance === 0).length})
          </button>
        </div>
      </div>

      {overdueCustomers.length > 0 && filterMode === 'all' && (
        <div className="card mb-lg" style={{ borderLeft: '4px solid var(--color-warning-500)', backgroundColor: 'var(--color-warning-50)', padding: '16px' }}>
          <h3 className="text-heading text-warning-700 mb-xs flex items-center gap-xs" style={{ fontSize: '15px' }}>
            ⚠️ {overdueCustomers.length} Customers overdue 30+ days
          </h3>
          <p className="text-caption text-warning-700" style={{ fontSize: '13px' }}>Chase these first for pending credits.</p>
        </div>
      )}

      {/* Customer List */}
      <div className="flex flex-col gap-md">
        {filteredCustomers.length === 0 ? (
          <div className="card p-xl text-center text-gray-500 text-sm">
            No customers match the criteria.
          </div>
        ) : (
          filteredCustomers.map(c => {
            const days = getDaysPending(c.oldest_debit_date);
            let balanceColor = 'text-gray-500';
            let balanceSub = 'Settled';
            if (c.balance > 0) {
              balanceColor = 'text-success-600';
              balanceSub = 'You will get';
            } else if (c.balance < 0) {
              balanceColor = 'text-primary-600';
              balanceSub = 'You will give';
            }

            return (
              <div key={c.id} className="card flex justify-between items-center cursor-pointer hover-bg-gray" style={{ padding: '16px' }} onClick={() => setSelectedCustomer(c.id)}>
                <div>
                  <div className="text-heading text-gray-900">{c.name}</div>
                  <div className="text-caption flex items-center gap-xs mt-1" style={{ fontSize: '14px' }}>
                    <Phone size={14} /> {c.phone}
                  </div>
                  {c.balance > 0 && days > 0 && (
                    <div className={`text-xs mt-1 font-semibold ${days > 30 ? 'text-warning-600' : 'text-gray-400'}`}>
                      Pending {days} days
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`text-display ${balanceColor}`} style={{ fontSize: '22px' }}>
                    ₹{Math.abs(c.balance).toLocaleString('en-IN')}
                  </div>
                  <div className={`text-caption ${balanceColor}`} style={{ fontSize: '12px' }}>{balanceSub}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Bottom Sheet */}
      {showAddCustomer && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAddCustomer(false)}></div>
          <div className="sheet-content">
            <h2 className="text-heading mb-lg">New customer</h2>
            <div className="flex flex-col gap-md mb-lg">
              <input 
                className="input" 
                placeholder="Customer Name" 
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
              />
              <input 
                className="input" 
                placeholder="Phone (10 digits)" 
                type="number"
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-primary w-full" 
              onClick={handleAddCustomer}
              disabled={!newCustName || newCustPhone.length !== 10}
            >
              Save Customer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
