import { useState, useEffect } from 'react';
import HomeModule from './components/HomeModule';
import CreditModule from './components/CreditModule';
import OrderModule from './components/OrderModule';
import { Home, BookOpen, Users, Sun, Moon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'credit' | 'orders'>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <>
      {/* Header */}
      <header className="app-header" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
        <h1 className="text-heading m-0 text-gray-900" style={{ fontSize: '20px' }}>Sri Sai StoreMate</h1>
        <button 
          onClick={toggleTheme} 
          className="btn btn-ghost" 
          style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} className="text-warning-600" /> : <Moon size={20} className="text-gray-600" />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1" style={{ paddingBottom: '80px' }}>
        {activeTab === 'home' && <HomeModule onNavigate={setActiveTab} />}
        {activeTab === 'credit' && <CreditModule />}
        {activeTab === 'orders' && <OrderModule />}
      </main>

      {/* Bottom Navigation */}
      <nav className="floating-nav">
        <button 
          onClick={() => setActiveTab('home')}
          className={`floating-nav-btn ${activeTab === 'home' ? 'active' : 'inactive'}`}
        >
          <Home size={32} />
          <span className="text-caption" style={{ color: 'inherit', fontWeight: activeTab === 'home' ? 600 : 400, fontSize: '14px' }}>Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('credit')}
          className={`floating-nav-btn ${activeTab === 'credit' ? 'active' : 'inactive'}`}
        >
          <Users size={32} />
          <span className="text-caption" style={{ color: 'inherit', fontWeight: activeTab === 'credit' ? 600 : 400, fontSize: '14px' }}>Khata</span>
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`floating-nav-btn ${activeTab === 'orders' ? 'active' : 'inactive'}`}
        >
          <BookOpen size={32} />
          <span className="text-caption" style={{ color: 'inherit', fontWeight: activeTab === 'orders' ? 600 : 400, fontSize: '14px' }}>Orders</span>
        </button>
      </nav>
    </>
  );
}

export default App;
