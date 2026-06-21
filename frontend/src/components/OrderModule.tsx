import { useEffect, useState } from 'react';
import { api } from '../api';
import { Mic, Check, Trash, Package, Send, Plus, CheckSquare } from 'lucide-react';

export default function OrderModule() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Tab State: 'to-order' (pending), 'transit' (ordered), 'received' (received)
  const [activeSubTab, setActiveSubTab] = useState<'to-order' | 'transit' | 'received'>('to-order');

  // Builder State
  const [medName, setMedName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('strips');
  const [priority, setPriority] = useState('normal');
  const [isListening, setIsListening] = useState(false);
  const [commandText, setCommandText] = useState('');
  
  // Draft State
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftSupplier, setDraftSupplier] = useState<number | '' | 'new'>('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  const loadData = async () => {
    try {
      const [supps, ords] = await Promise.all([
        api.getSuppliers(),
        api.getOrders()
      ]);
      setSuppliers(supps);
      setOrders(ords);
      if (supps.length > 0 && draftSupplier === '') {
        setDraftSupplier(supps[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDraft = () => {
    if (!medName) return;
    setDrafts([...drafts, {
      id: Date.now(), // temp id
      medicine_name: medName,
      qty: Number(qty) || 1,
      unit,
      priority
    }]);
    setMedName('');
    setQty('');
    setUnit('strips');
    setPriority('normal');
  };

  const simulateVoiceInput = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setDrafts([
        ...drafts,
        { id: Date.now()+1, medicine_name: 'Dolo 650', qty: 10, unit: 'strips', priority: 'normal' },
        { id: Date.now()+2, medicine_name: 'Pantop 40', qty: 10, unit: 'strips', priority: 'normal' },
        { id: Date.now()+3, medicine_name: 'ORS', qty: 2, unit: 'boxes', priority: 'urgent' }
      ]);
    }, 1500);
  };

  const parseTranscript = (text: string) => {
    const newDrafts: any[] = [];
    
    const numberWords: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'twenty': 20, 'fifty': 50, 'hundred': 100,
      'okati': 1, 'rendu': 2, 'moodu': 3, 'nalugu': 4, 'aidu': 5,
      'padhi': 10, 'iravai': 20, 'yaabhai': 50, 'vandha': 100
    };

    let cleanText = text.replace(/,/g, ' ').replace(/\band\b/gi, ' ');

    // Match pattern: [Medicine Name] [Quantity] [Unit] [Optional: Urgent]
    const regex = /(.*?)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred|okati|rendu|moodu|nalugu|aidu|padhi|iravai|yaabhai|vandha)\s+(strips?|boxes?|bottles?|packets?|tablets?)(?:\s+(urgent))?/gi;

    let matches = [...cleanText.matchAll(regex)];

    if (matches.length > 0) {
      matches.forEach((match, index) => {
        let medicine_name = match[1].trim();
        let qtyStr = match[2].toLowerCase();
        let unit = match[3].toLowerCase();
        let urgentMatch = match[4];

        let priority = 'normal';
        if (medicine_name.toLowerCase().includes('urgent')) {
          priority = 'urgent';
          medicine_name = medicine_name.replace(/urgent/ig, '').trim();
        }
        if (urgentMatch) priority = 'urgent';

        if (!unit.endsWith('s')) unit += 's';

        let qty = parseInt(qtyStr);
        if (isNaN(qty)) qty = numberWords[qtyStr] || 1;

        if (medicine_name) {
          newDrafts.push({
            id: Date.now() + index,
            medicine_name,
            qty,
            unit,
            priority
          });
        }
      });
    } else {
      // Fallback for single item without a standard unit
      let trimmed = text.trim();
      let priority = 'normal';
      if (trimmed.toLowerCase().includes('urgent')) {
        priority = 'urgent';
        trimmed = trimmed.replace(/urgent/ig, '').trim();
      }
      
      let qty = 1;
      const numMatches = trimmed.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|padhi)\b/ig);
      if (numMatches && numMatches.length > 0) {
        const lastNumStr = numMatches[numMatches.length - 1].toLowerCase();
        let parsedNum = parseInt(lastNumStr);
        if (isNaN(parsedNum)) parsedNum = numberWords[lastNumStr] || 1;
        
        if (!(numMatches.length === 1 && parsedNum > 100)) {
           qty = parsedNum;
           const lastIdx = trimmed.lastIndexOf(numMatches[numMatches.length - 1]);
           trimmed = (trimmed.substring(0, lastIdx) + trimmed.substring(lastIdx + numMatches[numMatches.length - 1].length)).trim();
        }
      }
      if (trimmed) {
        newDrafts.push({
          id: Date.now(),
          medicine_name: trimmed,
          qty,
          unit: 'strips',
          priority
        });
      }
    }

    if (newDrafts.length > 0) {
      setDrafts(prev => [...prev, ...newDrafts]);
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice not supported on this browser. Try Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      parseTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      if (event.error !== 'no-speech') {
        alert("Voice recognition error: " + event.error);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const removeDraft = (id: number) => {
    setDrafts(drafts.filter(d => d.id !== id));
  };

  const handleConfirmDrafts = async () => {
    if (drafts.length === 0 || !draftSupplier) return;
    
    let finalSupplierId = draftSupplier;
    
    if (draftSupplier === 'new') {
      if (!newSupplierName || newSupplierPhone.length !== 10) {
        alert("Please enter a valid distributor name and 10-digit phone number.");
        return;
      }
      try {
        const newSupp = await api.createSupplier(newSupplierName, newSupplierPhone);
        finalSupplierId = newSupp.id;
        setSuppliers(prev => [...prev, newSupp]);
      } catch (e) {
        alert("Failed to add new distributor");
        return;
      }
    }
    
    const items = drafts.map(d => ({
      medicine_name: d.medicine_name,
      qty: d.qty,
      unit: d.unit,
      priority: d.priority,
      supplier_id: finalSupplierId
    }));

    try {
      await api.bulkConfirmOrders(items);
      setDrafts([]);
      setDraftSupplier('');
      setNewSupplierName('');
      setNewSupplierPhone('');
      loadData();
    } catch (e) {
      alert("Failed to confirm orders.");
    }
  };

  const sendOrderToSupplier = async (supplierId: number, items: any[]) => {
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) return;

    let text = `Hello ${supp.name},\n\nPlease send the following medicines urgently to Sri Sai Medical and General Stores:\n\n`;
    items.forEach((item, idx) => {
      text += `${idx + 1}. ${item.medicine_name} - ${item.qty} ${item.unit}${item.priority === 'urgent' ? ' (URGENT)' : ''}\n`;
    });
    text += `\nThank you.`;

    window.open(`https://wa.me/91${supp.phone}?text=${encodeURIComponent(text)}`, '_blank');
    
    // Mark as ordered
    try {
      await api.markSupplierOrdered(supplierId);
      loadData();
      setActiveSubTab('transit'); // Navigate to transit tab
    } catch (e) {
      console.error(e);
    }
  };

  const markItemReceived = async (id: number) => {
    try {
      await api.updateOrder(id, { status: 'received' });
      loadData();
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const markAllReceived = async (items: any[]) => {
    try {
      await Promise.all(items.map(it => api.updateOrder(it.id, { status: 'received' })));
      loadData();
    } catch (e) {
      alert("Failed to update order status");
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) return;
    if (window.confirm(`Are you sure you want to delete supplier "${supp.name}"? This will not delete past orders.`)) {
      try {
        await api.deleteSupplier(supplierId);
        setDraftSupplier('');
        loadData();
      } catch (e) {
        alert("Failed to delete distributor");
      }
    }
  };

  // Group pending orders by supplier
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const groupedOrders: Record<number, any[]> = {};
  pendingOrders.forEach(o => {
    if (!groupedOrders[o.supplier_id]) groupedOrders[o.supplier_id] = [];
    groupedOrders[o.supplier_id].push(o);
  });

  // Group transit/ordered orders by supplier
  const transitOrders = orders.filter(o => o.status === 'ordered');
  const groupedTransit: Record<number, any[]> = {};
  transitOrders.forEach(o => {
    if (!groupedTransit[o.supplier_id]) groupedTransit[o.supplier_id] = [];
    groupedTransit[o.supplier_id].push(o);
  });

  // Group received orders by date (for History log)
  const receivedOrders = orders.filter(o => o.status === 'received');

  return (
    <div className="p-xl flex flex-col gap-lg pb-[100px]">
      {/* Builder Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-md">
          <h2 className="text-heading text-gray-900">Add to order book</h2>
          
          <div className="flex items-center gap-xs">
            {isListening && (
              <div className="wave-container">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
              </div>
            )}
            <button 
              className="btn"
              style={{ 
                backgroundColor: isListening ? 'var(--color-primary-700)' : 'var(--color-primary-50)', 
                color: isListening ? 'white' : 'var(--color-primary-700)',
                padding: '10px 16px',
                fontSize: '15px'
              }}
              onClick={() => {
                if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
                  startVoiceRecognition();
                } else {
                  alert("Voice not supported — use 'Try sample' or type instead");
                }
              }}
            >
              <Mic size={20} /> {isListening ? 'Listening...' : 'Speak'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-sm mb-md">
          <div className="flex gap-sm w-full">
            <input 
              className="input flex-1" 
              placeholder="Medicine Name" 
              value={medName}
              onChange={e => setMedName(e.target.value)}
              style={{ flex: 2 }}
            />
            <input 
              className="input" 
              placeholder="Qty" 
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <div className="flex gap-sm w-full">
            <select 
              className="input flex-1" 
              value={unit}
              onChange={e => setUnit(e.target.value)}
              style={{ flex: 2 }}
            >
              <option value="strips">strips</option>
              <option value="boxes">boxes</option>
              <option value="bottles">bottles</option>
              <option value="packets">packets</option>
              <option value="tablets">tablets</option>
            </select>
            <button 
              className="btn flex-1"
              style={{ 
                backgroundColor: priority === 'urgent' ? 'var(--color-warning-500)' : 'var(--color-gray-100)',
                color: priority === 'urgent' ? 'white' : 'var(--color-gray-500)'
              }}
              onClick={() => setPriority(priority === 'urgent' ? 'normal' : 'urgent')}
            >
              {priority === 'urgent' ? 'Urgent!' : 'Normal'}
            </button>
          </div>
        </div>

        <div className="flex gap-sm">
          <button 
            className="btn flex-1"
            style={{ backgroundColor: 'var(--color-gray-900)', color: 'white', padding: '12px', fontSize: '15px' }}
            onClick={handleAddDraft}
            disabled={!medName}
          >
            <Plus size={20} /> Add row
          </button>
          <button 
            className="btn"
            style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', border: '1px solid var(--color-primary-200)', padding: '12px', fontSize: '15px' }}
            onClick={simulateVoiceInput}
          >
            ✨ Try sample
          </button>
        </div>

        {/* Quick Keyboard Command Parser */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-gray-200)' }}>
          <label className="text-caption text-gray-500 font-semibold mb-1 block">⌨️ Quick Keyboard Parser</label>
          <input
            className="input"
            placeholder="Type e.g., 'dolo 650 10 strips urgent' and press Enter"
            value={commandText}
            onChange={e => setCommandText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && commandText) {
                parseTranscript(commandText);
                setCommandText('');
              }
            }}
            style={{ padding: '10px 14px', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Draft Confirmation List */}
      {drafts.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h2 className="text-heading text-gray-900 mb-md">Review before adding ({drafts.length})</h2>
          <div className="flex flex-col gap-sm mb-lg">
            {drafts.map(d => (
              <div key={d.id} className="flex items-center gap-xs">
                <input 
                  className="input flex-1 text-body" 
                  style={{ padding: '8px 12px' }}
                  value={d.medicine_name}
                  onChange={(e) => {
                    setDrafts(drafts.map(curr => curr.id === d.id ? { ...curr, medicine_name: e.target.value } : curr));
                  }}
                />
                <input 
                  className="input text-body" 
                  style={{ width: '70px', padding: '8px 4px', textAlign: 'center' }}
                  type="number"
                  value={d.qty}
                  onChange={(e) => {
                    setDrafts(drafts.map(curr => curr.id === d.id ? { ...curr, qty: e.target.value } : curr));
                  }}
                />
                <div className="text-caption" style={{ width: '45px' }}>{d.unit}</div>
                {d.priority === 'urgent' && <span className="text-warning-600 font-bold ml-1">!</span>}
                <button className="btn btn-ghost p-1" onClick={() => removeDraft(d.id)}>
                  <Trash size={20} className="text-danger-600" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-xs mb-md">
            <label className="text-caption text-gray-500 font-semibold">Select Distributor</label>
            <div className="flex gap-sm items-center">
              <select 
                className="input flex-1" 
                value={draftSupplier}
                onChange={e => setDraftSupplier(e.target.value === 'new' ? 'new' : Number(e.target.value))}
              >
                <option value="" disabled>Select Distributor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="new">+ Add new distributor...</option>
              </select>

              {draftSupplier && draftSupplier !== 'new' && (
                <button 
                  className="btn btn-ghost p-sm text-danger-600" 
                  onClick={() => handleDeleteSupplier(Number(draftSupplier))}
                  title="Delete Supplier"
                >
                  <Trash size={20} />
                </button>
              )}
            </div>
          </div>

          {draftSupplier === 'new' && (
            <div className="flex flex-col gap-sm mb-md p-md" style={{ backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <input 
                className="input" 
                placeholder="Distributor Name" 
                value={newSupplierName}
                onChange={e => setNewSupplierName(e.target.value)}
              />
              <input 
                className="input" 
                placeholder="WhatsApp Number (10 digits)" 
                type="number"
                value={newSupplierPhone}
                onChange={e => setNewSupplierPhone(e.target.value)}
              />
            </div>
          )}

          <button className="btn btn-primary w-full" style={{ padding: '14px', fontSize: '16px' }} onClick={handleConfirmDrafts} disabled={!draftSupplier || (draftSupplier === 'new' && (!newSupplierName || newSupplierPhone.length !== 10))}>
            <Check size={24} /> Confirm & add
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex gap-xs" style={{ borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveSubTab('to-order')}
          className="btn text-sm" 
          style={{ 
            padding: '8px 16px', 
            borderRadius: '99px',
            backgroundColor: activeSubTab === 'to-order' ? 'var(--color-gray-900)' : 'transparent',
            color: activeSubTab === 'to-order' ? 'white' : 'var(--color-gray-500)',
            boxShadow: 'none'
          }}
        >
          To Order ({pendingOrders.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('transit')}
          className="btn text-sm" 
          style={{ 
            padding: '8px 16px', 
            borderRadius: '99px',
            backgroundColor: activeSubTab === 'transit' ? 'var(--color-gray-900)' : 'transparent',
            color: activeSubTab === 'transit' ? 'white' : 'var(--color-gray-500)',
            boxShadow: 'none'
          }}
        >
          In Transit ({transitOrders.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('received')}
          className="btn text-sm" 
          style={{ 
            padding: '8px 16px', 
            borderRadius: '99px',
            backgroundColor: activeSubTab === 'received' ? 'var(--color-gray-900)' : 'transparent',
            color: activeSubTab === 'received' ? 'white' : 'var(--color-gray-500)',
            boxShadow: 'none'
          }}
        >
          History ({receivedOrders.length})
        </button>
      </div>

      {/* Subtab Contents */}
      <div>
        {/* 1. To Order Tab */}
        {activeSubTab === 'to-order' && (
          <div>
            {Object.keys(groupedOrders).length === 0 ? (
              <div className="card text-center text-gray-500 p-xl">
                Nothing to order. Speak or parse a medicine command above to draft.
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {Object.keys(groupedOrders).map(suppIdStr => {
                  const suppId = Number(suppIdStr);
                  const items = groupedOrders[suppId];
                  const supp = suppliers.find(s => s.id === suppId);

                  return (
                    <div key={suppId} className="card" style={{ padding: '16px' }}>
                      <div className="flex items-center justify-between mb-md">
                        <div className="flex items-center gap-sm text-heading text-gray-900" style={{ fontSize: '18px' }}>
                          <Package size={24} className="text-primary-700" />
                          {supp ? supp.name : 'Unknown Supplier'}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-sm mb-lg">
                        {items.map((it: any) => (
                          <div key={it.id} className="flex justify-between items-center order-item p-2">
                            <input 
                              className="input flex-1 text-body" 
                              style={{ padding: '8px 12px', border: 'none', backgroundColor: 'transparent', fontWeight: '500' }}
                              value={it.medicine_name}
                              onBlur={(e) => api.updateOrder(it.id, { medicine_name: e.target.value }).then(loadData)}
                              onChange={(e) => {
                                setOrders(orders.map(o => o.id === it.id ? { ...o, medicine_name: e.target.value } : o));
                              }}
                            />
                            {it.priority === 'urgent' && <span className="badge badge-warning text-xs mr-2 text-danger-600">!</span>}
                            <input 
                              className="input text-body" 
                              style={{ width: '60px', padding: '8px', textAlign: 'center', border: 'none', backgroundColor: 'transparent', fontWeight: '600' }}
                              type="number"
                              value={it.qty}
                              onBlur={(e) => api.updateOrder(it.id, { qty: parseInt(e.target.value) }).then(loadData)}
                              onChange={(e) => {
                                setOrders(orders.map(o => o.id === it.id ? { ...o, qty: e.target.value } : o));
                              }}
                            />
                            <select
                              className="text-body text-gray-900"
                              style={{ width: '80px', padding: '6px', border: 'none', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', outline: 'none' }}
                              value={it.unit}
                              onChange={(e) => {
                                setOrders(orders.map(o => o.id === it.id ? { ...o, unit: e.target.value } : o));
                                api.updateOrder(it.id, { unit: e.target.value }).then(loadData);
                              }}
                            >
                              <option value="strips">strips</option>
                              <option value="boxes">boxes</option>
                              <option value="bottles">bottles</option>
                              <option value="packets">packets</option>
                              <option value="tablets">tablets</option>
                            </select>
                            <button 
                              className="btn btn-ghost p-1 text-gray-400"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={async () => {
                                if (window.confirm('Delete this item from the order?')) {
                                  await api.deleteOrder(it.id);
                                  loadData();
                                }
                              }}
                            >
                              <Trash size={18} className="text-danger-600 opacity-80" />
                            </button>
                          </div>
                        ))}
                        <button 
                          className="btn btn-ghost w-full" 
                          style={{ border: '1px dashed var(--color-gray-300)', padding: '12px', color: 'var(--color-primary-600)', borderRadius: 'var(--radius-md)', marginTop: '4px' }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={async () => {
                            await api.createOrder('New Medicine', 1, 'strips', 'normal', suppId);
                            loadData();
                          }}
                        >
                          <Plus size={20} /> Add more items
                        </button>
                      </div>
                      <button 
                        className="btn btn-success w-full" 
                        style={{ padding: '14px', fontSize: '16px' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => sendOrderToSupplier(suppId, items)}
                      >
                        <Send size={24} /> Send order
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. In Transit Tab */}
        {activeSubTab === 'transit' && (
          <div>
            {Object.keys(groupedTransit).length === 0 ? (
              <div className="card text-center text-gray-500 p-xl">
                No orders are currently in transit. Mark pending drafts as ordered to track here.
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {Object.keys(groupedTransit).map(suppIdStr => {
                  const suppId = Number(suppIdStr);
                  const items = groupedTransit[suppId];
                  const supp = suppliers.find(s => s.id === suppId);

                  return (
                    <div key={suppId} className="card" style={{ padding: '16px' }}>
                      <div className="flex items-center justify-between mb-md">
                        <div className="flex items-center gap-sm text-heading text-gray-900" style={{ fontSize: '18px' }}>
                          <Package size={24} className="text-warning-600" />
                          {supp ? supp.name : 'Unknown Supplier'}
                        </div>
                        <button 
                          className="btn btn-ghost text-xs text-success-600 flex items-center gap-xs font-semibold"
                          onClick={() => markAllReceived(items)}
                          style={{ padding: '4px 8px' }}
                        >
                          <CheckSquare size={14} /> Mark all Received
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-sm mb-md">
                        {items.map((it: any) => (
                          <div key={it.id} className="flex justify-between items-center order-item p-md">
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900">{it.medicine_name}</span>
                              <div className="text-caption text-gray-500 text-xs mt-1">Qty: {it.qty} {it.unit}</div>
                            </div>
                            <button 
                              className="btn btn-ghost text-success-600" 
                              onClick={() => markItemReceived(it.id)}
                              style={{ padding: '6px' }}
                              title="Mark Received"
                            >
                              <Check size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Received History Tab */}
        {activeSubTab === 'received' && (
          <div>
            {receivedOrders.length === 0 ? (
              <div className="card text-center text-gray-500 p-xl">
                No history of completed/received orders.
              </div>
            ) : (
              <div className="card">
                <div className="p-md text-heading text-gray-900" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                  Completed Orders Log
                </div>
                <div className="flex flex-col">
                  {receivedOrders.map(it => (
                    <div key={it.id} className="flex justify-between items-center p-md" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                      <div>
                        <div className="text-body font-semibold text-gray-900">{it.medicine_name}</div>
                        <div className="text-caption mt-1 flex items-center gap-sm text-xs text-gray-400">
                          <span>{it.qty} {it.unit}</span>
                          <span>·</span>
                          <span>{it.supplier_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-xs">
                        <span className="badge text-xs text-success-600 bg-success-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-xs">
                          <Check size={12} /> Received
                        </span>
                        <button 
                          className="btn btn-ghost p-1 text-gray-400" 
                          onClick={async () => {
                            if (window.confirm("Delete this log from order history?")) {
                              await api.deleteOrder(it.id);
                              loadData();
                            }
                          }}
                        >
                          <Trash size={16} className="text-danger-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
