import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import Hyperspeed from './Hyperspeed';

const dashboardBgConfig = {
  onSpeedUp: () => { },
  onSlowDown: () => { },
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 9,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 50,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [12, 80],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x050505,
    islandColor: 0x070707,
    background: 0x000000,
    shoulderLines: 0x555555,
    brokenLines: 0x555555,
    leftCars: [0xD856BF, 0x6750A2, 0xC247AC],
    rightCars: [0x03B3C3, 0x0E5EA5, 0x324555],
    sticks: 0x03B3C3
  }
};

const NAV_ITEMS = [
  { id: 'home', icon: '⎈', title: 'Home Dashboard', desc: 'Central Command Active. Overview of your AI deployments.' },
  { id: 'murphy-ai', icon: '∞', title: 'Murphy AI', desc: 'An intelligent assistant for reasoning, coding, research, writing, planning, and problem solving.' },
  { id: 'my-projects', icon: '◫', title: 'My Projects', desc: 'All your AI projects and workflows in one place. Start building, organizing, and managing your projects here.' },
  { id: 'api-keys', icon: '🔑', title: 'API Keys', desc: 'Manage your API keys for programmatic access and tracking.' }
];

const mockTokenData = [
  { name: 'Mon', tokens: 12000 },
  { name: 'Tue', tokens: 28000 },
  { name: 'Wed', tokens: 19000 },
  { name: 'Thu', tokens: 42000 },
  { name: 'Fri', tokens: 51000 },
  { name: 'Sat', tokens: 38000 },
  { name: 'Sun', tokens: 62000 }
];

const mockApiData = [
  { name: 'Mon', calls: 120 },
  { name: 'Tue', calls: 280 },
  { name: 'Wed', calls: 190 },
  { name: 'Thu', calls: 420 },
  { name: 'Fri', calls: 510 },
  { name: 'Sat', calls: 380 },
  { name: 'Sun', calls: 620 }
];

const Dashboard = ({ user, handleSignOut }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Chat States
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Real-time Database Stats State
  const [realStats, setRealStats] = useState({
    totalTokens: 0,
    totalCalls: 0,
    tokenData: [],
    apiData: []
  });

  const navigate = useNavigate();

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch usage stats from Supabase
  useEffect(() => {
    if (activeTab === 'home') {
      const fetchRealStats = async () => {
        try {
          const { data, error } = await supabase
            .from('murphy_usage')
            .select('*')
            .order('created_at', { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            let tokensSum = 0;
            let callsCount = data.length;

            const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dailyTokens = {};
            const dailyCalls = {};

            // Initialize last 7 days with 0
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dayName = weekdayNames[d.getDay()];
              dailyTokens[dayName] = 0;
              dailyCalls[dayName] = 0;
            }

            data.forEach(row => {
              tokensSum += row.prompt_tokens + row.completion_tokens;
              const date = new Date(row.created_at);
              const dayName = weekdayNames[date.getDay()];
              if (dailyTokens[dayName] !== undefined) {
                dailyTokens[dayName] += row.prompt_tokens + row.completion_tokens;
                dailyCalls[dayName] += 1;
              }
            });

            const chartTokens = Object.keys(dailyTokens).map(name => ({
              name,
              tokens: dailyTokens[name]
            }));
            
            const chartCalls = Object.keys(dailyCalls).map(name => ({
              name,
              calls: dailyCalls[name]
            }));

            setRealStats({
              totalTokens: tokensSum,
              totalCalls: callsCount,
              tokenData: chartTokens,
              apiData: chartCalls
            });
          }
        } catch (err) {
          console.error('Error fetching real usage stats:', err);
        }
      };

      fetchRealStats();
    }
  }, [activeTab]);

  const activeItem = NAV_ITEMS.find(item => item.id === activeTab) || NAV_ITEMS[0];

  const handleTabClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false); // close sidebar on mobile after selecting
  };

  const handleDisconnect = async () => {
    await handleSignOut();
    navigate('/', { replace: true });
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessageCount = messages.filter(msg => msg.role === 'user').length;
    if (userMessageCount >= 5) return;

    const userMessage = { role: 'user', content: inputText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { message: userMessage.content }
      });

      if (error) throw error;

      const aiMessage = { role: 'ai', content: data.reply || "No response received." };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'ai', content: `Error connecting to Murphy AI: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Background */}
      <div className="dashboard-bg">
        <Hyperspeed effectOptions={dashboardBgConfig} />
      </div>

      {/* ── Mobile topbar ── */}
      <div className="dashboard-topbar">
        <span className="topbar-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/murphylogo.png" alt="Murphy Logo" style={{ width: '22px', height: '22px', marginRight: '8px', objectFit: 'contain' }} />
          Murphy
        </span>
        <button
          className={`hamburger-btn ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* ── Overlay (mobile) ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/murphylogo.png" alt="Murphy Logo" style={{ width: '24px', height: '24px', marginRight: '8px', objectFit: 'contain' }} />
            Murphy
          </div>
          <div className="sidebar-user-badge">Verified Node</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabClick(item.id)}
            >
              <span style={{ fontSize: '1.15em', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.title}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-signout-btn" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="dashboard-main">
        <div className="dashboard-content-wrapper">
          <header className="dashboard-header">
            <h1 className="dashboard-title">{activeItem.title}</h1>
            <div className="dashboard-user-info">
              <div className="user-name">{user?.displayName || user?.email?.split('@')[0]}</div>
              <div className="user-avatar">
                {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          {activeItem.id === 'home' ? (
            <div className="dashboard-overview">
              <div className="overview-stats-grid">
                <div className="stat-card">
                  <div className="stat-title">Murphy AI Tokens Used</div>
                  <div className="stat-value">{realStats.totalTokens > 0 ? realStats.totalTokens.toLocaleString() : '0'}</div>
                  <div className="stat-trend positive">↑ Realtime Sync</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Murphy AI API Calls</div>
                  <div className="stat-value">{realStats.totalCalls > 0 ? realStats.totalCalls.toLocaleString() : '0'}</div>
                  <div className="stat-trend positive">↑ Realtime Sync</div>
                </div>
              </div>

              <div className="overview-charts-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Murphy AI Token Consumption</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={realStats.tokenData.length > 0 ? realStats.tokenData : mockTokenData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#03b3c3" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#03b3c3" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          itemStyle={{ color: '#03b3c3' }}
                        />
                        <Area type="monotone" dataKey="tokens" stroke="#03b3c3" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Murphy AI API Call Frequency</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={realStats.apiData.length > 0 ? realStats.apiData : mockApiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="calls" fill="#6750a2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : activeItem.id === 'murphy-ai' ? (
            <div className="murphy-chat-container">
              {!chatStarted ? (
                <div className="dashboard-card murphy-start-card">
                  <div className="placeholder-icon">{activeItem.icon}</div>
                  <h2>{activeItem.title}</h2>
                  <p>{activeItem.desc}</p>
                  <button 
                    className="try-murphy-btn"
                    onClick={() => setChatStarted(true)}
                  >
                    Try Murphy AI
                  </button>
                </div>
              ) : (
                <div className="chat-interface">
                  <div className="chat-messages">
                    {messages.length === 0 && (
                      <div className="chat-empty">
                        <div className="placeholder-icon">∞</div>
                        <p>Murphy AI is ready. How can I assist you today?</p>
                      </div>
                    )}
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble-wrapper ${msg.role}`}>
                        <div className={`chat-bubble ${msg.role}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="chat-bubble-wrapper ai">
                        <div className="chat-bubble ai typing-indicator">
                          <span>.</span><span>.</span><span>.</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {messages.filter(msg => msg.role === 'user').length >= 5 ? (
                    <div className="premium-upgrade-container">
                      <div className="premium-upgrade-card">
                        <span className="premium-shield-icon">✦</span>
                        <h3>Free Limit Reached</h3>
                        <p>You have successfully completed 5 complimentary interactions with Murphy AI.</p>
                        <button className="upgrade-premium-btn" onClick={() => alert('Premium plan subscriptions are coming soon!')}>
                          Try Premium
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form className="chat-input-form" onSubmit={handleChatSubmit}>
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Message Murphy..."
                        disabled={isChatLoading}
                      />
                      <button type="submit" disabled={!inputText.trim() || isChatLoading}>
                        Send
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-card" key={activeItem.id}>
              <div className="placeholder-icon">{activeItem.icon}</div>
              <h2>{activeItem.title}</h2>
              <p>{activeItem.desc}</p>
              <p style={{
                marginTop: '1.2rem',
                color: 'var(--color-cyan, #03b3c3)',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                opacity: 0.8
              }}>
                — Initializing Module —
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
