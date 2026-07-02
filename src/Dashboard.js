import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import Hyperspeed from './Hyperspeed';
import { PluginManager } from './managers/PluginManager';
import { LoggingManager } from './managers/LoggingManager';
import { SettingsManager } from './managers/SettingsManager';

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
  { id: 'plugins', icon: '🔌', title: 'Integrations', desc: 'Connect and manage third-party developer platforms (GitHub, Vercel, Netlify).' },
  { id: 'logs', icon: '📋', title: 'Activity Logs', desc: 'Audit user actions and system-wide pipeline event history.' },
  { id: 'settings', icon: '⚙', title: 'Settings', desc: 'Configure workspace preferences, themes, and notification profiles.' },
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

const highlightCode = (code) => {
  if (!code) return '';
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokenRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)|(["'`])(?:\\.|[^\\])*?\2|\b(const|let|var|function|return|import|export|default|from|class|extends|if|else|for|while|switch|case|break|try|catch|new|this|async|await|true|false|null|undefined)\b|\b([a-zA-Z0-9_]+)(?=\()|\b(\d+)\b/g;

  return html.replace(tokenRegex, (match, comment, stringQuote, keyword, func, num) => {
    if (comment) return `<span class="token-comment">${match}</span>`;
    if (stringQuote) return `<span class="token-string">${match}</span>`;
    if (keyword) return `<span class="token-keyword">${match}</span>`;
    if (func) return `<span class="token-function">${match}</span>`;
    if (num) return `<span class="token-number">${match}</span>`;
    return match;
  });
};

const Dashboard = ({ user, handleSignOut }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Chat States
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightRef = useRef(null);

  const handleEditorScroll = (e) => {
    const { scrollTop, scrollLeft } = e.target;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  };

  // Real-time Database Stats State
  const [realStats, setRealStats] = useState({
    totalTokens: 0,
    totalCalls: 0,
    tokenData: [],
    apiData: []
  });

  const navigate = useNavigate();

  // Phase 1 Manager States
  const [connectedPlugins, setConnectedPlugins] = useState([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [workspaceSettings, setWorkspaceSettings] = useState({
    autoSave: true,
    editorTheme: "cyberpunk",
    notificationsEnabled: true,
    systemLogLevel: "info",
    analyticsConsent: false
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Plugin Credentials States
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState("");
  const [connectUsername, setConnectUsername] = useState("");
  const [connectToken, setConnectToken] = useState("");
  const [connectError, setConnectError] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Loader effects for Settings, Plugins, Logs
  const loadPhase1Data = async () => {
    if (!user) return;
    
    // Load Settings
    setSettingsLoading(true);
    try {
      const currentSettings = await SettingsManager.loadSettings();
      setWorkspaceSettings(currentSettings);
    } catch (err) {
      console.error("Dashboard: Settings fetch failure", err);
    } finally {
      setSettingsLoading(false);
    }

    // Load Plugins
    setPluginsLoading(true);
    try {
      const activePlugins = await PluginManager.getConnectedPlugins();
      setConnectedPlugins(activePlugins);
      
      // Update existing local compat states if github is connected
      const githubPlugin = activePlugins.find(p => p.platform === 'github');
      if (githubPlugin) {
        // Base64 decode for local compat use
        const decodedToken = atob(githubPlugin.maskedCredential || '');
        setGhUser(githubPlugin.username);
        setGhPat(decodedToken);
        setIsGhConnected(true);
        localStorage.setItem('murphy_github_user', githubPlugin.username);
        localStorage.setItem('murphy_github_pat', decodedToken);
      }
    } catch (err) {
      console.error("Dashboard: Plugin list fetch failure", err);
    } finally {
      setPluginsLoading(false);
    }

    // Load Logs
    setLogsLoading(true);
    try {
      const logsList = await LoggingManager.fetchLogs();
      setActivityLogs(logsList);
    } catch (err) {
      console.error("Dashboard: Activity logs fetch failure", err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Re-fetch when dashboard mounts or user session changes
  useEffect(() => {
    if (user) {
      loadPhase1Data();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Track logs and settings fetches specifically when selecting tabs
  useEffect(() => {
    if (activeTab === 'logs') {
      const fetchLogsOnly = async () => {
        setLogsLoading(true);
        const logsList = await LoggingManager.fetchLogs();
        setActivityLogs(logsList);
        setLogsLoading(false);
      };
      fetchLogsOnly();
    } else if (activeTab === 'plugins') {
      const fetchPluginsOnly = async () => {
        setPluginsLoading(true);
        const activePlugins = await PluginManager.getConnectedPlugins();
        setConnectedPlugins(activePlugins);
        setPluginsLoading(false);
      };
      fetchPluginsOnly();
    } else if (activeTab === 'settings') {
      const fetchSettingsOnly = async () => {
        setSettingsLoading(true);
        const currentSettings = await SettingsManager.loadSettings();
        setWorkspaceSettings(currentSettings);
        setSettingsLoading(false);
      };
      fetchSettingsOnly();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await SettingsManager.updateSettings(workspaceSettings);
    } catch (err) {
      console.error("Dashboard: Settings save failed", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleConnectPlugin = async (e) => {
    e.preventDefault();
    setConnectError("");
    if (!connectUsername.trim() || !connectToken.trim()) {
      setConnectError("All connection fields are required.");
      return;
    }

    setConnecting(true);
    try {
      await PluginManager.connectPlugin(connectPlatform, connectUsername.trim(), connectToken.trim());
      
      // Update list
      const activePlugins = await PluginManager.getConnectedPlugins();
      setConnectedPlugins(activePlugins);

      // Local compat state updates
      if (connectPlatform === 'github') {
        setGhUser(connectUsername.trim());
        setGhPat(connectToken.trim());
        setIsGhConnected(true);
        localStorage.setItem('murphy_github_user', connectUsername.trim());
        localStorage.setItem('murphy_github_pat', connectToken.trim());
      }

      // Close modal
      setIsConnectOpen(false);
      setConnectUsername("");
      setConnectToken("");
    } catch (err) {
      setConnectError(err.message || "Failed to save platform credentials.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectPlugin = async (platform) => {
    try {
      await PluginManager.disconnectPlugin(platform);
      
      // Update list
      const activePlugins = await PluginManager.getConnectedPlugins();
      setConnectedPlugins(activePlugins);

      // Local compat state removals
      if (platform === 'github') {
        setGhUser('');
        setGhPat('');
        setIsGhConnected(false);
        localStorage.removeItem('murphy_github_user');
        localStorage.removeItem('murphy_github_pat');
      }
    } catch (err) {
      console.error(`Dashboard: Failed to delete ${platform} credentials`, err);
    }
  };

  // GitHub & Editor States
  const [ghUser, setGhUser] = useState(localStorage.getItem('murphy_github_user') || '');
  const [ghPat, setGhPat] = useState(localStorage.getItem('murphy_github_pat') || '');
  const [isGhConnected, setIsGhConnected] = useState(!!(localStorage.getItem('murphy_github_user') && localStorage.getItem('murphy_github_pat')));
  const [ghRepos, setGhRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [ghError, setGhError] = useState('');
  const [rememberGh, setRememberGh] = useState(true);

  // Guide State
  const [showGhGuide, setShowGhGuide] = useState(false);

  // Active repository workspace states
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoContents, setRepoContents] = useState([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [openFile, setOpenFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileSha, setFileSha] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Update file via Murphy Dashboard');
  const [isPushing, setIsPushing] = useState(false);

  // GitHub Functions
  const fetchRepos = async (username, pat) => {
    setLoadingRepos(true);
    setGhError('');
    try {
      let response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
          headers: {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
      }
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setGhRepos(data);
      } else {
        setGhRepos([]);
      }
    } catch (err) {
      console.error(err);
      setGhError(err.message || 'Failed to fetch repositories. Please check your credentials.');
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (isGhConnected && activeTab === 'my-projects') {
      fetchRepos(ghUser, ghPat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGhConnected, activeTab]);

  const handleConnectGh = (e) => {
    e.preventDefault();
    if (!ghUser.trim() || !ghPat.trim()) {
      setGhError('Username and Token are required.');
      return;
    }
    if (rememberGh) {
      localStorage.setItem('murphy_github_user', ghUser.trim());
      localStorage.setItem('murphy_github_pat', ghPat.trim());
    } else {
      localStorage.removeItem('murphy_github_user');
      localStorage.removeItem('murphy_github_pat');
    }
    setIsGhConnected(true);
  };

  const handleDisconnectGh = () => {
    localStorage.removeItem('murphy_github_user');
    localStorage.removeItem('murphy_github_pat');
    setGhUser('');
    setGhPat('');
    setIsGhConnected(false);
    setGhRepos([]);
    setSelectedRepo(null);
    setRepoContents([]);
    setCurrentPath('');
    setOpenFile(null);
  };

  const fetchFolderContents = async (path = '') => {
    if (!selectedRepo) return;
    setLoadingContents(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${selectedRepo.owner.login}/${selectedRepo.name}/contents/${path}`, {
        headers: {
          'Authorization': `token ${ghPat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve contents.');
      }
      const data = await response.json();
      const sorted = Array.isArray(data) ? data.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      }) : [];
      setRepoContents(sorted);
      setCurrentPath(path);
    } catch (err) {
      console.error(err);
      alert('Error fetching folder contents: ' + err.message);
    } finally {
      setLoadingContents(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchFolderContents(currentPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepo]);

  const loadFileContent = async (file) => {
    setLoadingFile(true);
    try {
      const response = await fetch(file.url, {
        headers: {
          'Authorization': `token ${ghPat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) throw new Error('Failed to read file content.');
      const data = await response.json();
      
      let decoded = '';
      if (data.encoding === 'base64') {
        decoded = new TextDecoder('utf-8').decode(
          Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0))
        );
      } else {
        decoded = data.content || '';
      }
      
      setOpenFile(file);
      setFileContent(decoded);
      setOriginalContent(decoded);
      setFileSha(data.sha);
    } catch (err) {
      console.error(err);
      alert('Error loading file: ' + err.message);
    } finally {
      setLoadingFile(false);
    }
  };

  const handlePushToGit = async (e) => {
    e.preventDefault();
    if (!selectedRepo || !openFile) return;
    setIsPushing(true);
    try {
      const base64Content = btoa(
        new TextEncoder().encode(fileContent).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const response = await fetch(`https://api.github.com/repos/${selectedRepo.owner.login}/${selectedRepo.name}/contents/${openFile.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${ghPat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitMessage,
          content: base64Content,
          sha: fileSha
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Push operation failed.');
      }
      const data = await response.json();
      setOriginalContent(fileContent);
      setFileSha(data.content.sha);
      setShowCommitModal(false);
      alert('File successfully committed and pushed to GitHub!');
    } catch (err) {
      console.error(err);
      alert('Failed to commit file changes: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

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
      <main className={`dashboard-main ${activeTab === 'my-projects' ? 'no-scroll' : ''}`}>
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
          ) : activeItem.id === 'my-projects' ? (
            <div className="my-projects-container">
              {!isGhConnected ? (
                <div className="github-connect-grid">
                  <div className="github-connect-card">
                    <div className="connect-card-header">
                      <span className="connect-icon">⚙</span>
                      <h2>Connect GitHub</h2>
                      <p>Link your GitHub account to manage projects, edit files, and commit code directly.</p>
                    </div>
                    <form onSubmit={handleConnectGh} className="github-connect-form">
                      <div className="form-group">
                        <label>GitHub Username</label>
                        <input 
                          type="text" 
                          placeholder="e.g. octocat" 
                          value={ghUser}
                          onChange={(e) => setGhUser(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Personal Access Token (PAT)</label>
                        <input 
                          type="password" 
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                          value={ghPat}
                          onChange={(e) => setGhPat(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-checkbox">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={rememberGh}
                            onChange={(e) => setRememberGh(e.target.checked)}
                          />
                          <span>Remember token on this device</span>
                        </label>
                      </div>
                      
                      {ghError && (
                        <div className="github-error-msg">
                          <span>⚠</span> {ghError}
                        </div>
                      )}
                      
                      <button type="submit" className="github-connect-btn">
                        Connect Account
                      </button>
                    </form>
                    
                    <button 
                      type="button" 
                      className="github-guide-toggle-btn"
                      onClick={() => setShowGhGuide(prev => !prev)}
                    >
                      {showGhGuide ? 'Hide Murphy Guide' : 'Ask Murphy: How to get a Token?'}
                    </button>
                  </div>

                  {showGhGuide && (
                    <div className="murphy-guide-card">
                      <div className="guide-header">
                        <span className="guide-avatar">∞</span>
                        <div>
                          <h3>Murphy's Token Guide</h3>
                          <span>Interactive AI Directive</span>
                        </div>
                      </div>
                      <div className="guide-content">
                        <p>A Personal Access Token (PAT) serves as your secure credentials to interact with GitHub APIs. To generate one:</p>
                        <ol>
                          <li>Open <strong>github.com</strong> and click your profile picture &gt; <strong>Settings</strong>.</li>
                          <li>On the left sidebar, scroll down and click <strong>&lt;&gt; Developer settings</strong>.</li>
                          <li>Click <strong>Personal access tokens</strong> &gt; <strong>Tokens (classic)</strong>.</li>
                          <li>Click <strong>Generate new token</strong> &gt; select <strong>Generate new token (classic)</strong>.</li>
                          <li>Set a note (e.g., "Murphy Dashboard") and select the <strong><code>repo</code></strong> checkbox scope (this is essential for code reading & writing).</li>
                          <li>Scroll to the bottom, click <strong>Generate token</strong>, and copy it immediately (you won't be able to see it again).</li>
                        </ol>
                        <p className="guide-disclaimer">🛡 your token remains client-side in your local secure browser sandbox and is never transmitted to our backend databases.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="github-workspace">
                  {!selectedRepo ? (
                    <div className="repo-hub-container">
                      <div className="repo-hub-header">
                        <div className="hub-user-meta">
                          <span className="hub-status-pill"></span>
                          <span>Linked Account: <strong>@{ghUser}</strong></span>
                        </div>
                        <button className="hub-disconnect-btn" onClick={handleDisconnectGh}>
                          Disconnect GitHub
                        </button>
                      </div>

                      <div className="repo-search-bar">
                        <input 
                          type="text" 
                          placeholder="Search repositories..."
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                        />
                        <button className="repo-refresh-btn" onClick={() => fetchRepos(ghUser, ghPat)}>
                          Refresh List
                        </button>
                      </div>

                      {loadingRepos ? (
                        <div className="repo-loading-state">
                          <div className="spinner"></div>
                          <p>Retrieving your GitHub projects...</p>
                        </div>
                      ) : (
                        <div className="repo-grid">
                          {ghRepos
                            .filter(repo => repo.name.toLowerCase().includes(repoSearch.toLowerCase()))
                            .map(repo => (
                              <div key={repo.id} className="repo-card" onClick={() => { setSelectedRepo(repo); setCurrentPath(''); setOpenFile(null); }}>
                                <div className="repo-card-top">
                                  <span className="repo-visibility-badge">{repo.private ? '🔒 Private' : '🌐 Public'}</span>
                                  <span className="repo-stars">★ {repo.stargazers_count}</span>
                                </div>
                                <h3 className="repo-card-title">{repo.name}</h3>
                                <p className="repo-card-desc">{repo.description || 'No description provided.'}</p>
                                <div className="repo-card-footer">
                                  <span className="repo-lang">{repo.language || 'Plain Text'}</span>
                                  <span className="repo-open-link">Open Workspace →</span>
                                </div>
                              </div>
                            ))}
                          {ghRepos.length === 0 && (
                            <div className="repo-empty-state">
                              <p>No repositories found or token lacks permissions.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="workspace-editor-layout">
                      {/* Workspace Navigation Bar */}
                      <div className="workspace-top-bar">
                        <button className="workspace-back-btn" onClick={() => setSelectedRepo(null)}>
                          ← Back to Hub
                        </button>
                        <div className="workspace-breadcrumbs">
                          <span>{selectedRepo.name}</span>
                          {currentPath && (
                            <>
                              <span className="breadcrumb-separator">/</span>
                              <span>{currentPath}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Side-by-side workspace explorer */}
                      <div className="workspace-body">
                        {/* File explorer panel */}
                        <div className="file-explorer-pane">
                          <h4>Repository Files</h4>
                          {loadingContents ? (
                            <div className="pane-loading">Loading files...</div>
                          ) : (
                            <div className="files-list">
                              {currentPath && (
                                <div className="file-item parent-dir" onClick={() => {
                                  const parts = currentPath.split('/');
                                  parts.pop();
                                  fetchFolderContents(parts.join('/'));
                                }}>
                                  📁 .. (parent folder)
                                </div>
                              )}
                              {repoContents.map(item => (
                                <div 
                                  key={item.sha} 
                                  className={`file-item ${item.type} ${openFile?.path === item.path ? 'active-file' : ''}`}
                                  onClick={() => item.type === 'dir' ? fetchFolderContents(item.path) : loadFileContent(item)}
                                >
                                  {item.type === 'dir' ? '📁' : '📄'} {item.name}
                                </div>
                              ))}
                              {repoContents.length === 0 && (
                                <div className="pane-empty">This folder is empty.</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Code Editor Pane */}
                        <div className="code-editor-pane">
                          {loadingFile ? (
                            <div className="editor-loading-state">
                              <div className="spinner"></div>
                              <p>Loading file content...</p>
                            </div>
                          ) : openFile ? (
                            <div className="editor-workspace">
                              <div className="editor-meta-header">
                                <div className="file-info">
                                  <span className="file-name">{openFile.name}</span>
                                  <span className="file-path">{openFile.path}</span>
                                </div>
                                <div className="editor-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                  <div className="editor-status-badges">
                                    {fileContent !== originalContent ? (
                                      <span className="status-badge unsaved">● Unsaved Changes</span>
                                    ) : (
                                      <span className="status-badge synced">✓ Synced to Git</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="editor-textarea-container theme-cyberpunk">
                                <div className="line-numbers-gutter" ref={gutterRef}>
                                  {fileContent.split('\n').map((_, idx) => (
                                    <span key={idx}>{idx + 1}</span>
                                  ))}
                                </div>
                                <div className="editor-input-wrapper" style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
                                  <pre 
                                    className="editor-highlight-layer" 
                                    aria-hidden="true" 
                                    ref={highlightRef} 
                                    dangerouslySetInnerHTML={{ __html: highlightCode(fileContent) + '\n' }}
                                  />
                                  <textarea
                                    value={fileContent}
                                    onChange={(e) => setFileContent(e.target.value)}
                                    onScroll={handleEditorScroll}
                                    className="editor-textarea"
                                    spellCheck="false"
                                  />
                                </div>
                              </div>

                              <div className="editor-actions-bar">
                                <button 
                                  className="btn-editor-reset" 
                                  onClick={() => setFileContent(originalContent)}
                                  disabled={fileContent === originalContent}
                                >
                                  Reset
                                </button>
                                <button 
                                  className="btn-editor-push"
                                  onClick={() => setShowCommitModal(true)}
                                >
                                  Push to GitHub
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="editor-empty-placeholder">
                              <span className="editor-icon">⚡</span>
                              <h3>Murphy Code Workspace</h3>
                              <p>Select a file from the explorer sidebar to view and edit its code.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Commit Modal */}
              {showCommitModal && (
                <div className="commit-modal-overlay">
                  <div className="commit-modal">
                    <h3>Commit Changes</h3>
                    <p>Provide a commit message to push changes to your branch in <strong>{selectedRepo?.name}</strong>.</p>
                    <form onSubmit={handlePushToGit}>
                      <div className="form-group">
                        <label>Commit Message</label>
                        <textarea 
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder="Update file content"
                          required
                        />
                      </div>
                      <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={() => setShowCommitModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-commit" disabled={isPushing}>
                          {isPushing ? 'Committing...' : 'Commit & Push'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : activeItem.id === 'plugins' ? (
            <div className="plugins-dashboard">
              {pluginsLoading ? (
                <div style={{ color: '#aaa', padding: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>Loading active integrations...</div>
              ) : (
                <div className="plugins-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                  {PluginManager.getSupportedPlugins().map(plugin => {
                    const connected = connectedPlugins.find(p => p.platform === plugin.id);
                    return (
                      <div className="dashboard-card plugin-card" key={plugin.id} style={{ position: 'relative', border: connected ? '1px solid rgba(3, 179, 195, 0.4)' : '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                        <div className="plugin-info">
                          <div className="plugin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <span style={{ fontSize: '1.8rem' }}>{plugin.id === 'github' ? '🔑' : plugin.id === 'vercel' ? '▲' : '🔌'}</span>
                            <span className={`status-badge ${connected ? 'synced' : 'unsaved'}`} style={{ fontSize: '0.75rem' }}>
                              {connected ? 'Linked' : 'Not Linked'}
                            </span>
                          </div>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>{plugin.name}</h3>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4' }}>{plugin.description}</p>
                          {connected && (
                            <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--color-cyan)', background: 'rgba(3, 179, 195, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '4px', display: 'inline-block' }}>
                              Connected as: <strong>{connected.username}</strong>
                            </div>
                          )}
                        </div>
                        <div className="plugin-actions" style={{ marginTop: '1.5rem' }}>
                          {connected ? (
                            <button 
                              className="btn-editor-reset" 
                              style={{ width: '100%', padding: '0.6rem', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', cursor: 'pointer' }}
                              onClick={() => handleDisconnectPlugin(plugin.id)}
                            >
                              Disconnect Platform
                            </button>
                          ) : (
                            <button 
                              className="btn-editor-push"
                              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer' }}
                              onClick={() => {
                                setConnectPlatform(plugin.id);
                                setConnectUsername("");
                                setConnectToken("");
                                setConnectError("");
                                setIsConnectOpen(true);
                              }}
                            >
                              Connect Account
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Plugin Connect Modal */}
              {isConnectOpen && (
                <div className="commit-modal-overlay">
                  <div className="commit-modal" style={{ maxWidth: '450px' }}>
                    <h3>Link Developer Profile</h3>
                    <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.2rem' }}>
                      Enter your credentials for <strong>{connectPlatform.toUpperCase()}</strong>. Your secrets are encrypted at rest.
                    </p>
                    {connectError && (
                      <div className="auth-error-banner" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
                        <span>⚠</span> <span>{connectError}</span>
                      </div>
                    )}
                    <form onSubmit={handleConnectPlugin}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '0.4rem' }}>Username / Profile Identifier</label>
                        <input 
                          type="text"
                          value={connectUsername}
                          onChange={(e) => setConnectUsername(e.target.value)}
                          placeholder="Username..."
                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem', borderRadius: '6px', color: '#fff', outline: 'none' }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '0.4rem' }}>Personal Access Token / API Key</label>
                        <input 
                          type="password"
                          value={connectToken}
                          onChange={(e) => setConnectToken(e.target.value)}
                          placeholder="Secret token..."
                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem', borderRadius: '6px', color: '#fff', outline: 'none' }}
                          required
                        />
                      </div>
                      <div className="modal-actions" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-cancel" onClick={() => setIsConnectOpen(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-commit" disabled={connecting}>
                          {connecting ? 'Linking...' : 'Verify & Connect'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : activeItem.id === 'logs' ? (
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'auto', maxHeight: '550px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Workspace Audit History</h3>
                <button 
                  className="btn-editor-reset" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                  onClick={async () => {
                    setLogsLoading(true);
                    const list = await LoggingManager.fetchLogs();
                    setActivityLogs(list);
                    setLogsLoading(false);
                  }}
                >
                  Refresh Logs
                </button>
              </div>
              
              {logsLoading ? (
                <div style={{ color: '#aaa', padding: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>Fetching pipeline logs...</div>
              ) : activityLogs.length === 0 ? (
                <div style={{ color: '#666', padding: '2rem', textAlign: 'center', fontSize: '0.9rem', fontStyle: 'italic' }}>No logged events recorded in workspace.</div>
              ) : (
                <div style={{ overflowY: 'auto', flex: 1, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '0.8rem', color: '#888' }}>Severity</th>
                        <th style={{ padding: '0.8rem', color: '#888' }}>Event Type</th>
                        <th style={{ padding: '0.8rem', color: '#888' }}>Message</th>
                        <th style={{ padding: '0.8rem', color: '#888' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.map((log) => {
                        const timeStr = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : new Date().toLocaleTimeString();
                        const dateStr = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString();
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '0.8rem' }}>
                              <span className={`status-badge ${log.severity === 'error' ? 'unsaved' : log.severity === 'warning' ? 'warning' : 'synced'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                {log.severity}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem', fontWeight: 'bold', color: 'var(--color-cyan)', fontFamily: 'monospace' }}>{log.event.toUpperCase()}</td>
                            <td style={{ padding: '0.8rem', color: '#ddd' }}>{log.message}</td>
                            <td style={{ padding: '0.8rem', color: '#666' }}>{dateStr} {timeStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeItem.id === 'settings' ? (
            <div className="dashboard-card" style={{ padding: '2rem', maxWidth: '600px' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '1.1rem' }}>Workspace Preferences</h3>
              {settingsLoading ? (
                <div style={{ color: '#aaa', padding: '1rem', textAlign: 'center' }}>Loading configurations...</div>
              ) : (
                <form onSubmit={handleSaveSettings}>
                  <div className="form-group" style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Autocode Save</label>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>Automatically write local edits back to repository.</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={workspaceSettings.autoSave}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Enable Notifications</label>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>Show floating network status alerts and system changes.</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={workspaceSettings.notificationsEnabled}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.4rem' }}>System Diagnostic Log Level</label>
                    <select
                      value={workspaceSettings.systemLogLevel}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, systemLogLevel: e.target.value }))}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '6px', color: '#fff', outline: 'none', width: '100%', cursor: 'pointer' }}
                    >
                      <option value="debug">Debug (All events)</option>
                      <option value="info">Info (Default audit logging)</option>
                      <option value="warning">Warning (Issues and exceptions)</option>
                      <option value="error">Critical Error (Breaks compile flow)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Anonymous Analytics</label>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>Anonymously share crash reports to help build Murphy.</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={workspaceSettings.analyticsConsent}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, analyticsConsent: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-editor-push"
                    style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem', borderRadius: '6px', cursor: 'pointer' }}
                    disabled={savingSettings}
                  >
                    {savingSettings ? 'Saving Settings...' : 'Save Configuration'}
                  </button>
                </form>
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
