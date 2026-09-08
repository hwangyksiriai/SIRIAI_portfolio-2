'use client';

import { useEffect, useRef, useState } from 'react';

const BRAND_SYMBOL = '/media/brand/symbol.png';

/* 1x1 transparent GIF. Without a poster, mobile browsers paint their own grey
   play-button placeholder until the first frame decodes; this hands them an
   invisible one so the card background shows through instead. */
const BLANK_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function Clip({ src, landscape }) {
  const cls = 'clip' + (landscape ? ' landscape' : '') + (src ? '' : ' empty');
  const ref = useRef(null);
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!src || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  // A cached video can reach HAVE_CURRENT_DATA before React attaches the
  // handlers below, which would leave it faded out for good.
  useEffect(() => {
    if (visible && videoRef.current && videoRef.current.readyState >= 2) setReady(true);
  }, [visible]);

  return (
    <div className={cls} ref={ref}>
      {src ? (
        visible && (
          <video
            ref={videoRef}
            className={'fill' + (ready ? ' ready' : '')}
            src={src}
            poster={BLANK_POSTER}
            preload="auto"
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setReady(true)}
            onCanPlay={() => setReady(true)}
          />
        )
      ) : (
        <span className="slot-msg"><span className="plus">+</span><span className="label">준비중</span></span>
      )}
    </div>
  );
}

function RegionToggle({ regions, active, onChange }) {
  return (
    <div className="region-toggle">
      {regions.map((r) => (
        <button
          key={r.key}
          type="button"
          className={'region-btn' + (r.key === active ? ' active' : '')}
          onClick={() => onChange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ClipGrid({ layout, clips }) {
  return (
    <div className="clip-grid">
      {layout === 'travel' ? (
        <div className="travel-grid">
          {[0, 1].map((colIndex) => {
            const half = Math.ceil(clips.length / 2);
            const colClips = colIndex === 0 ? clips.slice(0, half) : clips.slice(half);
            return (
              <div className="travel-col" key={colIndex}>
                {(colClips.length ? colClips : [null]).map((src, i) => (
                  <Clip key={i} src={src} landscape />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="reel-strip">
          {(clips.length ? clips : [null]).map((src, i) => (
            <Clip key={i} src={src} />
          ))}
        </div>
      )}
    </div>
  );
}

/* Continuation pages hold overflow clips for the same nav category, e.g.
   cat-beauty-2..9 for cat-beauty. Scrolling the story panel for "Beauty"
   should surface all of them, one grid after another. */
function continuationsFor(categories, id) {
  const re = new RegExp('^' + id + '-\\d+$');
  return categories.filter((c) => re.test(c.id) && (c.clips || []).length > 0);
}

function CategoryFeed({ cat, categories }) {
  const hasRegions = Array.isArray(cat.regions) && cat.regions.length > 0;
  const [activeRegion, setActiveRegion] = useState(hasRegions ? cat.regions[0].key : null);
  const clips = hasRegions
    ? (cat.regions.find((r) => r.key === activeRegion)?.clips || [])
    : (cat.clips || []);
  const continuations = continuationsFor(categories, cat.id);

  return (
    <div className="cat-feed">
      {hasRegions && (
        <RegionToggle regions={cat.regions} active={activeRegion} onChange={setActiveRegion} />
      )}
      <ClipGrid layout={cat.layout} clips={clips} />
      {continuations.map((c) => (
        <ClipGrid key={c.id} layout={c.layout} clips={c.clips} />
      ))}
    </div>
  );
}

export default function PortfolioView({ config }) {
  const categories = config.categories;
  const navCategories = categories.filter((cat) => !cat.hideFromNav);
  const [activeCatId, setActiveCatId] = useState(null);
  const activeCategory = categories.find((cat) => cat.id === activeCatId) || null;
  const mainRef = useRef(null);

  function selectCategory(id) {
    setActiveCatId(id);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-logo">
          <span className="app-sidebar-logo-mark" />
          SIRIAI
        </div>

        <nav className="app-nav-section">
          <button type="button" className="app-nav-item" disabled>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            검색
          </button>
          <button type="button" className={'app-nav-item' + (activeCatId === null ? ' active' : '')} onClick={() => selectCategory(null)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v10h12V10" /></svg>
            홈
          </button>
          {navCategories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              className={'app-nav-item' + (activeCatId === cat.id ? ' active' : '')}
              onClick={() => selectCategory(cat.id)}
            >
              <SegIcon id={cat.id} />
              {cat.navLabel}
            </button>
          ))}
        </nav>

        <a className="app-sidebar-cta" href="https://siriai-business.vercel.app/#contact" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
          Contact
        </a>
      </aside>

      <main className="app-main" ref={mainRef}>
        {activeCategory ? (
          <div className="app-main-inner">
            <div className="ig-topbar">
              <span />
              <div className="ig-topbar-actions">
                <a className="ig-btn-link" href="https://siriai.co.kr" target="_blank" rel="noopener noreferrer">홈으로 이동</a>
              </div>
            </div>

            <div className="ig-profile">
              <div className={'ig-avatar' + (config.profile?.avatarUrl ? '' : ' ig-avatar-default')}>
                <img src={config.profile?.avatarUrl || BRAND_SYMBOL} alt="Siriai" />
              </div>
              <div className="ig-profile-info">
                <h1 className="ig-username">siriai.official</h1>
                <div className="ig-stats">
                  <span><strong>128</strong> 팔로워</span>
                  <span><strong>42</strong> 팔로우</span>
                </div>
                <p className="ig-bio-name">SIRIAI — Private Influencer Curation</p>
                <p className="ig-bio">
                  SEOUL | BRAND CURATION 🎬 ✦<br className="brk" />
                  📩 hello@siriai.co.kr<br className="brk" />
                  새로움을 설계하는 프라이빗 인플루언서 풀
                </p>
                <a className="ig-bio-link" href="https://siriai.co.kr" target="_blank" rel="noopener noreferrer">siriai.co.kr</a>
              </div>
            </div>

            <CategoryFeed cat={activeCategory} categories={categories} key={activeCategory.id} />
          </div>
        ) : (
          <div className="home-hero" key="home">
            <div className="home-hero-inner">
              <div className="home-hero-brand">SIRIAI</div>
              <h1 className="home-hero-title">감각적인 비주얼을<br />만나보세요.</h1>
              <img className="home-hero-symbol" src={BRAND_SYMBOL} alt="Siriai" />
              <p className="home-hero-sub">
                브랜드의 아이덴티티에 가장 근접한 인플루언서 큐레이션.<br className="brk" />
                왼쪽 메뉴에서 캠페인을 둘러보세요.
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="floating-bar">감각적인 비주얼을 만나보세요</div>
    </div>
  );
}

const ICONS = {
  'cat-beauty': <path d="M12 3c3 4 6 7.6 6 11.2A6 6 0 1 1 6 14.2C6 10.6 9 7 12 3Z" />,
  'cat-living': <><path d="M9 3h6M10 3v3h4V3M8 6h8l1 3H7l1-3Z" /><rect x="6" y="9" width="12" height="12" rx="2" /></>,
  'cat-fashion': <><path d="M12 4a2 2 0 1 1 2 2c-.4.8-1.1 1.3-2 1.3s-1.6-.5-2-1.3a2 2 0 1 1 2-2Z" /><path d="M12 7 3 11l2 2 2-1v8h10v-8l2 1 2-2Z" /></>,
  'cat-travel': <path d="M3 12h18M3 12l5-5M3 12l5 5M21 12l-5-5M21 12l-5 5" />,
  'cat-fnb': <path d="M6 3v7a3 3 0 0 0 3 3v8M9 3v6M12 3v6M17 3c-2 1-2 4-2 6s.6 3 2 3v9" />,
  'cat-artist': <><path d="M3 10v4h4l5 5V5L7 10H3Z" /><path d="M16 8a5 5 0 0 1 0 8" /></>,
  'cat-celebrity': <><path d="M15 12a4 4 0 1 0-4-4M8 21v-2a5 5 0 0 1 5-5h1M18 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="3.2" /></>,
  'cat-health': <path d="M20.8 7.6c0 5-4.4 8-8.8 11.4C7.6 15.6 3.2 12.6 3.2 7.6a4.4 4.4 0 0 1 8-2.6 4.4 4.4 0 0 1 8 0 4.4 4.4 0 0 1 1.6 2.6Z" />,
  'cat-medical': <><path d="M12 3v6M9 6h6" /><rect x="4" y="9" width="16" height="12" rx="1.5" /><path d="M9 14h6M12 11v6" /></>,
  'cat-popup': <path d="M4 9l1-5h14l1 5M4 9v10h16V9M4 9h16M9 19v-6h6v6" />,
};

function SegIcon({ id }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6">
      {ICONS[id] || null}
    </svg>
  );
}
