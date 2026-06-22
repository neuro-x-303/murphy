import React, { useState, useEffect } from 'react';
import './App.css';
import Hyperspeed from './Hyperspeed';
import LogoLoop from './LogoLoop';
import content from './content.json';
import { 
  addWaitlistSubscriber 
} from './firebase';

// Custom Premium Inline SVGs for LogoLoop partners
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginRight: '8px' }}>
    <path d="M21.3,10.6a5.5,5.5,0,0,0-.4-3,5.6,5.6,0,0,0-2.4-2.5,5.7,5.7,0,0,0-5.7,0A5.5,5.5,0,0,0,10.4,2.5,5.7,5.7,0,0,0,4.7,5.6a5.5,5.5,0,0,0-2.4,4,5.6,5.6,0,0,0,0,5.7,5.5,5.5,0,0,0,2.4,3,5.7,5.7,0,0,0,5.7,0A5.5,5.5,0,0,0,13.6,21.5,5.7,5.7,0,0,0,19.3,18.4a5.5,5.5,0,0,0,2.4-4A5.6,5.6,0,0,0,21.3,10.6ZM13.6,19.7a3.8,3.8,0,0,1-1.9-.5l.1-.1,3.8-2.2a.9.9,0,0,0,.5-.8V11.2l1.8,1.0a.1.1,0,0,1,0,.1v4.3A3.8,3.8,0,0,1,13.6,19.7ZM5.7,15.2a3.8,3.8,0,0,1,0-1.9l.1.1,3.8,2.2a.9.9,0,0,0,.9,0l4.3-2.5v2.0l-3.7,2.1a.1.1,0,0,1-.1,0L7.1,15.7A3.8,3.8,0,0,1,5.7,15.2ZM4.3,7.2a3.8,3.8,0,0,1,1.9.5l-.1.1L2.3,10.0a.9.9,0,0,0-.5.8v4.9l-1.8-1.0a.1.1,0,0,1,0-.1V10.3A3.8,3.8,0,0,1,4.3,7.2ZM10.4,4.3a3.8,3.8,0,0,1,1.9.5l-.1-.1L8.4,6.9a.9.9,0,0,0-.5.8v4.9l-1.8-1.0v-4.3A3.8,3.8,0,0,1,10.4,4.3ZM18.3,8.8A3.8,3.8,0,0,1,18.3,10.7l-.1-.1-3.8-2.2a.9.9,0,0,0-.9,0L9.2,10.9v-2.0l3.7-2.1a.1.1,0,0,1,.1,0l3.8,2.2A3.8,3.8,0,0,1,18.3,8.8ZM19.7,16.8a3.8,3.8,0,0,1-1.9-.5l.1-.1,3.8-2.2a.9.9,0,0,0,.5-.8V8.3l1.8,1.0a.1.1,0,0,1,0,.1v4.3A3.8,3.8,0,0,1,19.7,16.8Z" />
  </svg>
);

const GeminiLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginRight: '8px' }}>
    <path d="M12 0c-.3 3.3-3 6-6.3 6.3C9 12.6 11.7 15.3 12 18.6c.3-3.3 3-6 6.3-6.3C15 12 12.3 9.3 12 0z" />
    <path d="M19 14.5c-.2 1.6-1.4 2.8-3 3 1.6.2 2.8 1.4 3 3 .2-1.6 1.4-2.8 3-3-1.6-.2-2.8-1.4-3-3z" />
  </svg>
);

const ClaudeLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginRight: '8px' }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
  </svg>
);

const MetaLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginRight: '8px' }}>
    <path d="M17.43,8c-1.11,0-2.13,0.52-2.91,1.38C13.27,10.79,12,12.33,12,12.33s-1.27-1.54-2.52-2.95C8.7,8.52,7.68,8,6.57,8C4.05,8,2,10.05,2,12.57S4.05,17.14,6.57,17.14c1.11,0,2.13-0.52,2.91-1.38c1.25-1.41,2.52-2.95,2.52-2.95s1.27,1.54,2.52,2.95c0.78,0.86,1.8,1.38,2.91,1.38c2.52,0,4.57-2.05,4.57-4.57S19.95,8,17.43,8z M6.57,14.86c-1.26,0-2.29-1.03-2.29-2.29s1.03-2.29,2.29-2.29c0.55,0,1.06,0.26,1.45,0.7C8.74,11.83,9.58,12.8,9.58,12.8S8.74,13.78,8.02,14.16C7.63,14.6,7.12,14.86,6.57,14.86z M17.43,14.86c-0.55,0-1.06-0.26-1.45-0.7c-0.72-0.81-1.56-1.78-1.56-1.78s0.84-0.97,1.56-1.78c0.39-0.44,0.9-0.7,1.45-0.7c1.26,0,2.29,1.03,2.29,2.29S18.69,14.86,17.43,14.86z" />
  </svg>
);

const MistralLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginRight: '8px' }}>
    <path d="M12,2L2,22h20L12,2z M12,6l6.5,13h-13L12,6z" />
  </svg>
);

const HuggingFaceLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style={{ marginRight: '8px' }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.5h-2v-2h2v2zm0-4.5h-2V7h2v6z" />
  </svg>
);

function App() {
  // Waitlist form state
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState({ type: '', message: '' });
  
  // Custom toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Mobile menu open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Handle email waitlist sign up
  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    const email = waitlistEmail.trim();
    if (!email) return;

    setWaitlistStatus({ type: 'loading', message: 'Syncing with Go Infinity database...' });

    try {
      await addWaitlistSubscriber(email);
      setWaitlistStatus({ type: 'success', message: 'Authorization complete! Welcome to the waitlist.' });
      setWaitlistEmail('');
      setToast({ show: true, type: 'success', message: `Subscriber node registered: ${email}` });
    } catch (error) {
      setWaitlistStatus({ type: 'error', message: `Sync failed: ${error.message}` });
    }
  };

  // Mousemove parallax handlers for floating features cloud
  const handleMouseMove = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    container.style.setProperty('--mouse-x', x.toFixed(3));
    container.style.setProperty('--mouse-y', y.toFixed(3));
  };

  const handleMouseLeave = (e) => {
    const container = e.currentTarget;
    container.style.setProperty('--mouse-x', '0');
    container.style.setProperty('--mouse-y', '0');
  };

  // Helper icons for dynamic features rendering
  const featureIcons = ['∞', 'λ', '⚡', '⚙', '✦', '❖', '◈', '◇'];



  const partnerLogos = [
    { node: <div className="logo-item-wrapper"><OpenAILogo /><span>OpenAI</span></div>, href: "https://openai.com" },
    { node: <div className="logo-item-wrapper"><GeminiLogo /><span>Gemini</span></div>, href: "https://deepmind.google/technologies/gemini" },
    { node: <div className="logo-item-wrapper"><ClaudeLogo /><span>Claude</span></div>, href: "https://anthropic.com" },
    { node: <div className="logo-item-wrapper"><MetaLogo /><span>Llama</span></div>, href: "https://meta.com" },
    { node: <div className="logo-item-wrapper"><MistralLogo /><span>Mistral</span></div>, href: "https://mistral.ai" },
    { node: <div className="logo-item-wrapper"><HuggingFaceLogo /><span>HuggingFace</span></div>, href: "https://huggingface.co" }
  ];

  return (
    <div className="app-container">
      {/* Background Hyperspeed WebGL component */}
      <div className="background-wrapper">
        <Hyperspeed 
          effectOptions={{
            distortion: 'turbulentDistortion',
            length: 400,
            roadWidth: 10,
            islandWidth: 2,
            lanesPerRoad: 4,
            fov: 90,
            fovSpeedUp: 150,
            speedUp: 3.5,
            carLightsFade: 0.4,
            totalSideLightSticks: 20,
            lightPairsPerRoadWay: 40,
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
              leftCars: [0xD856BF, 0x6750A2, 0xC247AC], // Magenta / Violet
              rightCars: [0x03B3C3, 0x0E5EA5, 0x324555], // Cyan / Deep Blue
              sticks: 0x03B3C3
            }
          }}
        />
      </div>

      {/* Dynamic Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span className="toast-pulse"></span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
      {/* Premium Fixed Navigation Header */}
      <header className={`navbar-fixed ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-logo">
            <span className="logo-icon-pulse">∞</span>
            <div className="logo-brand-info">
              <span className="logo-brand-title">MURPHY</span>
              <span className="logo-brand-subtitle">BY VERTEX HALEX</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            <a href="#about" className="nav-item-link">About</a>
            <a href="#features" className="nav-item-link">Features</a>
            <a href="#platform" className="nav-item-link">Capabilities</a>
            <a href="#waitlist" className="cta-btn-header">Join Waitlist</a>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button 
            className={`hamburger-toggle ${mobileMenuOpen ? 'toggle-active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`mobile-dropdown-menu ${mobileMenuOpen ? 'dropdown-active' : ''}`}>
          <a href="#about" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#features" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#platform" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Capabilities</a>
          <a href="#waitlist" className="mobile-cta-btn" onClick={() => setMobileMenuOpen(false)}>Join Waitlist</a>
        </div>
      </header>
      {/* Main Content Layout */}
      <main className="content-container">

        {/* Hero Section */}
        <section className="hero-section" id="hero">
          <div className="hero-intro-clean">
            {/* Project Introducing Headers */}
            <h1 className="welcome-title gradient-text">Welcome to Murphy AI</h1>
            <div className="introducing-label">INTRODUCING MURPHY PROJECT</div>
            <div className="creator-badge">Murphy by Vertex HaleX</div>

            <h2 className="hero-title">
              {content.hero.title}
            </h2>
            
            <p className="hero-description">
              {content.hero.subtitle}
            </p>

            <div className="hero-buttons">
              <a href="#waitlist" className="glow-btn pink-neon">
                {content.hero.primaryButton}
              </a>
            </div>
          </div>

          {/* Logo Loop Carousel for integrations */}
          <div className="hero-logos-container">
            <p className="logo-loop-title">POWERING NEXT-GENERATION INTEGRATIONS</p>
            <LogoLoop
              logos={partnerLogos}
              speed={40}
              direction="left"
              logoHeight={26}
              gap={50}
              hoverSpeed={0}
              scaleOnHover
              fadeOut
              fadeOutColor="#000000"
            />
          </div>
        </section>

        {/* About Section */}
        <section className="about-section" id="about">
          <div className="about-card">
            <div className="glow-edge"></div>
            <h2 className="section-title">{content.about.title}</h2>
            <p className="about-description">
              {content.about.description}
            </p>
          </div>
        </section>

        {/* Features Floating Cloud Section */}
        <section className="features-section" id="features">
          <h2 className="section-title">{content.features.title}</h2>
          
          <div 
            className="features-universe"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {content.features.items.map((item, index) => {
              const isEven = index % 2 === 0;
              const parallaxFactors = [
                { x: 30, y: -20 },
                { x: -35, y: 25 },
                { x: 20, y: 35 },
                { x: -25, y: -20 },
                { x: 40, y: 15 },
                { x: -20, y: -35 },
                { x: 25, y: 25 },
                { x: -30, y: -30 }
              ];
              const factor = parallaxFactors[index % parallaxFactors.length];
              return (
                <div 
                  key={index} 
                  className={`floating-card-wrapper wrapper-${index + 1}`}
                >
                  <div 
                    className={`floating-card ${isEven ? 'pink-border' : 'cyan-border'}`}
                    style={{
                      '--parallax-x': `${factor.x}px`,
                      '--parallax-y': `${factor.y}px`
                    }}
                  >
                    <div className="card-overlay"></div>
                    <div className={`feature-icon ${isEven ? 'icon-pink' : 'icon-cyan'}`}>
                      {featureIcons[index % featureIcons.length]}
                    </div>
                    <h3 className="floating-card-title">{item.title}</h3>
                    <p className="floating-card-description">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Platform Details Section */}
        <section className="platform-section" id="platform">
          <h2 className="section-title">Platform Capabilities</h2>
          
          <div className="platform-details-grid">
            
            <div className="detail-card">
              <div className="glow-edge"></div>
              <h3>{content.platform.title}</h3>
              <p>{content.platform.description}</p>
            </div>

            <div className="detail-card">
              <div className="glow-edge"></div>
              <h3>{content.integrations.title}</h3>
              <p>{content.integrations.description}</p>
            </div>

            <div className="detail-card">
              <div className="glow-edge"></div>
              <h3>{content.developers.title}</h3>
              <p>{content.developers.description}</p>
            </div>

            <div className="detail-card">
              <div className="glow-edge"></div>
              <h3>{content.security.title}</h3>
              <p>{content.security.description}</p>
            </div>

            <div className="detail-card wide-card">
              <div className="glow-edge"></div>
              <h3>{content.vision.title}</h3>
              <p>{content.vision.description}</p>
            </div>

          </div>
        </section>

        {/* Waitlist Access Section */}
        <section className="waitlist-section" id="waitlist">
          <div className="waitlist-card">
            <h2 className="waitlist-title">{content.cta.title}</h2>
            <p className="waitlist-subtitle">
              {content.cta.description}
            </p>
            
            <form onSubmit={handleWaitlistSubmit} className="waitlist-form">
              <input
                type="email"
                required
                placeholder="Secure Node Email Address..."
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                className="waitlist-input"
                id="waitlist-email-input"
              />
              <button 
                type="submit" 
                className="waitlist-btn"
                id="waitlist-submit-btn"
              >
                {content.cta.primaryButton.toUpperCase()}
              </button>
            </form>

            {waitlistStatus.message && (
              <div className={`status-banner status-${waitlistStatus.type}`}>
                {waitlistStatus.message}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p>{content.footer.copyright}</p>
          <div className="footer-links">
            <span>{content.footer.tagline.toUpperCase()}</span>
            <span>STATUS: ACTIVE</span>
            <span>SYSTEM VERSION: {content.version}</span>
          </div>
        </footer>

      </main>
    </div>
  );
}

export default App;
