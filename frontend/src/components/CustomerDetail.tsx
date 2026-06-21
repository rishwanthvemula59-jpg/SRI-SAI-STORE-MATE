import { useEffect, useState } from 'react';
import { api } from '../api';
import { ArrowLeft, MessageCircle, Check, Calendar, Share2, Trash2, Copy, AlertCircle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  id: number;
  onBack: () => void;
}

export default function CustomerDetail({ id, onBack }: Props) {
  const [data, setData] = useState<any>(null);
  const [sheetMode, setSheetMode] = useState<'debit' | 'credit' | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Editing state
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Share Statement state
  const [showStatement, setShowStatement] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getCustomer(id);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleTransaction = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    
    try {
      await api.addLedgerEntry(id, sheetMode!, Number(amount), note, dueDate || undefined);
      
      // Confetti logic
      if (sheetMode === 'credit') {
        const remaining = data.balance - Number(amount);
        if (remaining <= 0) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }

      setSheetMode(null);
      setAmount('');
      setNote('');
      setDueDate('');
      loadData();
    } catch (e) {
      alert("Failed to process transaction");
    }
  };

  const handleEditTransaction = async () => {
    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) return;

    try {
      await api.updateLedgerEntry(editingEntry.id, {
        amount: Number(editAmount),
        note: editNote,
        date: editDate,
        due_date: editDueDate || null
      });

      setEditingEntry(null);
      loadData();
    } catch (e) {
      alert("Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async () => {
    if (!window.confirm("Are you sure you want to delete this transaction? This will adjust the balance.")) return;
    try {
      await api.deleteLedgerEntry(editingEntry.id);
      setEditingEntry(null);
      loadData();
    } catch (e) {
      alert("Failed to delete transaction");
    }
  };

  const generateStatementText = () => {
    if (!data) return '';
    let text = `*Sri Sai Medical & General Stores*\n`;
    text += `*Account Statement*\n\n`;
    text += `Customer Name: ${data.name}\n`;
    text += `Phone: ${data.phone}\n`;
    text += `Current Balance: *₹${Math.abs(data.balance)}* ${data.balance > 0 ? '(Pending)' : (data.balance < 0 ? '(Overpaid)' : '(Settled)')}\n\n`;
    text += `*Ledger History:*\n`;
    
    if (data.ledger) {
      data.ledger.forEach((entry: any) => {
        const sign = entry.type === 'debit' ? '[+]' : '[-]';
        text += `• ${entry.date}: ${sign} ₹${entry.amount} (${entry.note || (entry.type === 'debit' ? 'Medicines' : 'Payment')})\n`;
        if (entry.type === 'debit' && entry.due_date) {
          text += `  (Due Date: ${entry.due_date})\n`;
        }
      });
    }
    
    text += `\nThank you for shopping with us! For queries, call 9848012345.`;
    return text;
  };

  const openWhatsApp = (isThankYou: boolean) => {
    let msg = '';
    if (isThankYou) {
      msg = `Hello ${data.name} garu, we have received your full payment. Thank you for shopping at Sri Sai Medical and General Stores.`;
    } else {
      msg = `Hello ${data.name} garu, this is a reminder from Sri Sai Medical and General Stores. Your pending amount is ₹${data.balance}. Please pay when possible. Thank you.`;
    }
    window.open(`https://wa.me/91${data.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareStatementWhatsApp = () => {
    const text = generateStatementText();
    window.open(`https://wa.me/91${data.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyStatementToClipboard = () => {
    const text = generateStatementText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return <div className="p-xl text-center text-gray-500">Loading...</div>;

  const isClear = data.balance === 0;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '100vh', backgroundColor: 'var(--color-gray-50)' }}>
      {/* Header */}
      <div className="app-header">
        <button onClick={onBack} className="btn btn-ghost text-gray-900" style={{ padding: '8px' }}>
          <ArrowLeft size={28} /> Back
        </button>
        <div className="text-heading text-gray-900" style={{ fontSize: '20px' }}>Khata Account</div>
        <button className="btn btn-ghost" onClick={() => setShowStatement(true)} style={{ padding: '8px' }} title="Share Statement">
          <Share2 size={24} className="text-gray-700" />
        </button>
      </div>

      <div className="p-xl flex-1 flex flex-col gap-lg">
        {/* Hero Card */}
        <div className="card text-center flex flex-col items-center gap-md" style={{ padding: '24px' }}>
          <div className="text-caption text-gray-500">{data.name} · {data.phone}</div>
          <div className={`text-display ${data.balance > 0 ? 'text-success-600' : (data.balance < 0 ? 'text-primary-600' : 'text-gray-500')}`} style={{ fontSize: '48px' }}>
            ₹{Math.abs(data.balance).toLocaleString('en-IN')}
          </div>
          <div className="text-caption text-gray-500 mb-2" style={{ fontSize: '15px' }}>
            {data.balance > 0 ? 'You will get' : (data.balance < 0 ? 'You will give' : 'Settled')}
          </div>
          
          <button 
            className={`btn w-full ${isClear ? 'btn-success' : 'btn-ghost'}`} 
            style={{ 
              backgroundColor: isClear ? 'var(--color-success-600)' : 'var(--color-success-50)',
              color: isClear ? 'white' : 'var(--color-success-700)',
              padding: '14px',
              fontSize: '16px'
            }}
            onClick={() => openWhatsApp(isClear)}
          >
            <MessageCircle size={24} />
            {isClear ? 'Send thank-you' : 'Send reminder'}
          </button>
        </div>

        {/* Actions Grid */}
        <div className="flex gap-md">
          <button 
            className="flex-1 btn" 
            style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', padding: '14px', fontSize: '16px' }}
            onClick={() => setSheetMode('debit')}
          >
            You Gave ₹
          </button>
          <button 
            className="flex-1 btn" 
            style={{ backgroundColor: 'var(--color-success-50)', color: 'var(--color-success-700)', padding: '14px', fontSize: '16px' }}
            onClick={() => setSheetMode('credit')}
          >
            You Got ₹
          </button>
        </div>

        {/* Ledger */}
        <div className="card flex-1 p-0 overflow-hidden mt-2">
          <div className="p-md text-heading text-gray-900" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
            Transaction History <span className="text-xs text-gray-400 font-normal">(Tap entry to Edit or Delete)</span>
          </div>
          <div className="flex flex-col">
            {data.ledger && data.ledger.length === 0 && (
              <div className="p-xl text-center text-gray-500">No entries yet.</div>
            )}
            {data.ledger && data.ledger.map((entry: any) => {
              const isOverdue = entry.type === 'debit' && entry.due_date && new Date(entry.due_date) < new Date() && data.balance > 0;
              return (
                <div 
                  key={entry.id} 
                  className="flex justify-between items-center p-md cursor-pointer hover-bg-gray" 
                  style={{ borderBottom: '1px solid var(--color-gray-200)' }}
                  onClick={() => {
                    setEditingEntry(entry);
                    setEditAmount(String(entry.amount));
                    setEditNote(entry.note || '');
                    setEditDate(entry.date);
                    setEditDueDate(entry.due_date || '');
                  }}
                >
                  <div className="flex-1">
                    <div className="text-body text-gray-900 flex items-center gap-xs">
                      {entry.note || (entry.type === 'credit' ? 'Payment received' : 'Medicines')}
                    </div>
                    <div className="text-caption mt-1 flex items-center gap-sm" style={{ fontSize: '13px' }}>
                      <span>{entry.date}</span>
                      {entry.due_date && (
                        <span className={`flex items-center gap-xs text-xs font-semibold ${isOverdue ? 'text-warning-600' : 'text-gray-400'}`}>
                          <Calendar size={12} /> Due: {entry.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-xs" style={{ textAlign: 'right' }}>
                    {isOverdue && <span className="badge badge-warning text-xs text-warning-700 bg-warning-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-xs"><AlertCircle size={10} /> Overdue</span>}
                    <div className={`text-heading ${entry.type === 'debit' ? 'text-primary-700' : 'text-success-700'}`}>
                      {entry.type === 'debit' ? '+' : '−'}₹{entry.amount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/New Transaction Bottom Sheet */}
      {sheetMode && (
        <>
          <div className="sheet-overlay" onClick={() => { setSheetMode(null); setDueDate(''); }}></div>
          <div className="sheet-content">
            <h2 className="text-heading mb-lg">
              {sheetMode === 'debit' ? 'You Gave ₹' : 'You Got ₹'}
            </h2>
            <div className="flex flex-col gap-md mb-lg">
              <input 
                className="input" 
                placeholder="Amount ₹" 
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <input 
                className="input" 
                placeholder={sheetMode === 'debit' ? 'Medicines (e.g., Dolo, Pantop)' : 'Note (optional)'} 
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              {sheetMode === 'debit' && (
                <div className="flex flex-col gap-xs">
                  <label className="text-caption text-gray-500 font-semibold flex items-center gap-xs"><Calendar size={14} /> Due Date (Optional)</label>
                  <input 
                    className="input" 
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>
            <button 
              className={`btn w-full ${sheetMode === 'debit' ? 'btn-primary' : 'btn-success'}`}
              style={{ padding: '14px', fontSize: '16px' }}
              onClick={handleTransaction}
              disabled={!amount || Number(amount) <= 0}
            >
              SAVE
            </button>
          </div>
        </>
      )}

      {/* Edit/Delete Entry Bottom Sheet */}
      {editingEntry && (
        <>
          <div className="sheet-overlay" onClick={() => setEditingEntry(null)}></div>
          <div className="sheet-content">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="text-heading text-gray-900">Edit Ledger Entry</h2>
              <button className="btn btn-ghost text-danger-600" onClick={handleDeleteTransaction} style={{ padding: '8px' }}>
                <Trash2 size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-md mb-lg">
              <div>
                <label className="text-caption text-gray-500 font-semibold mb-1 block">Amount ₹</label>
                <input 
                  className="input" 
                  type="number"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-caption text-gray-500 font-semibold mb-1 block">Note / Medicines</label>
                <input 
                  className="input" 
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                />
              </div>
              <div>
                <label className="text-caption text-gray-500 font-semibold mb-1 block">Transaction Date</label>
                <input 
                  className="input" 
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                />
              </div>
              {editingEntry.type === 'debit' && (
                <div>
                  <label className="text-caption text-gray-500 font-semibold mb-1 block flex items-center gap-xs"><Calendar size={14} /> Due Date (Optional)</label>
                  <input 
                    className="input" 
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>
            <button 
              className="btn btn-primary w-full"
              style={{ padding: '14px', fontSize: '16px' }}
              onClick={handleEditTransaction}
              disabled={!editAmount || Number(editAmount) <= 0}
            >
              SAVE CHANGES
            </button>
          </div>
        </>
      )}

      {/* Share Statement Overlay Modal */}
      {showStatement && (
        <div className="sheet-overlay flex items-center justify-center p-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card w-full max-w-md p-lg flex flex-col gap-md" style={{ backgroundColor: 'var(--color-gray-100)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center pb-sm" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
              <h3 className="text-heading text-gray-900 flex items-center gap-xs"><Share2 size={20} /> Share Statement</h3>
              <button className="btn btn-ghost p-1" onClick={() => setShowStatement(false)}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            {/* Statement Preview Container */}
            <div className="card p-md" style={{ fontSize: '13px', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace', backgroundColor: 'var(--color-gray-50)', borderColor: 'var(--color-gray-200)' }}>
              {generateStatementText()}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-sm">
              <button className="btn btn-success w-full" onClick={shareStatementWhatsApp}>
                <MessageCircle size={20} /> Send via WhatsApp
              </button>
              <button className="btn btn-secondary w-full" onClick={copyStatementToClipboard}>
                {copied ? <Check size={20} className="text-success-600" /> : <Copy size={20} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
