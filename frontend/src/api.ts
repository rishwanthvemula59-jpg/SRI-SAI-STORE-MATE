const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5001/api'
  : '/api';

export const api = {
  getCustomers: async () => {
    const res = await fetch(`${API_BASE}/customers`);
    return res.json();
  },
  getCustomer: async (id: number) => {
    const res = await fetch(`${API_BASE}/customers/${id}`);
    return res.json();
  },
  createCustomer: async (name: string, phone: string) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });
    return res.json();
  },
  addLedgerEntry: async (id: number, type: 'debit' | 'credit', amount: number, note?: string, due_date?: string) => {
    const res = await fetch(`${API_BASE}/customers/${id}/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, note, due_date })
    });
    return res.json();
  },
  getRecentTransactions: async () => {
    const res = await fetch(`${API_BASE}/ledger/recent`);
    return res.json();
  },
  getLedgerSummary: async () => {
    const res = await fetch(`${API_BASE}/ledger/summary`);
    return res.json();
  },
  updateLedgerEntry: async (id: number, updates: { amount?: number; note?: string; date?: string; due_date?: string | null }) => {
    const res = await fetch(`${API_BASE}/ledger/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteLedgerEntry: async (id: number) => {
    const res = await fetch(`${API_BASE}/ledger/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  deleteSupplier: async (id: number) => {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  getOrders: async () => {
    const res = await fetch(`${API_BASE}/orders`);
    return res.json();
  },
  getSuppliers: async () => {
    const res = await fetch(`${API_BASE}/suppliers`);
    return res.json();
  },
  createSupplier: async (name: string, phone: string) => {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });
    return res.json();
  },
  bulkConfirmOrders: async (items: any[]) => {
    const res = await fetch(`${API_BASE}/orders/bulk-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    return res.json();
  },
  markSupplierOrdered: async (supplier_id: number) => {
    const res = await fetch(`${API_BASE}/orders/mark-ordered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_id })
    });
    return res.json();
  },
  createOrder: async (medicine_name: string, qty: number, unit: string, priority: string, supplier_id: number) => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicine_name, qty, unit, priority, supplier_id })
    });
    return res.json();
  },
  updateOrder: async (id: number, updates: any) => {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteOrder: async (id: number) => {
    const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
    return res.json();
  }
};
