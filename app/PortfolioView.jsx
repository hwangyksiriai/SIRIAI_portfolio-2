'use client';

import { useEffect, useRef, useState } from 'react';

const BRAND_SYMBOL = '/media/brand/symbol.png';

/* 1x1 transparent GIF. Without a poster, mobile browsers paint their own grey
   play-button placeholder until the first frame decodes; this hands them an
   invisible one so the card background shows through instead. */
const BLANK_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function Clip({ src, landscape, badge }) {
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
      {badge && <span className="clip-badge">{badge}</span>}
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

/* clips may be plain src strings or { src, badge } when a region label
   needs to ride along (e.g. combined 국내/해외 feeds). */
function ClipGrid({ layout, clips }) {
  const items = clips.map((c) => (typeof c === 'string' ? { src: c } : c));

  return (
    <div className="clip-grid">
      {layout === 'travel' ? (
        <div className="travel-grid">
          {[0, 1].map((colIndex) => {
            const half = Math.ceil(items.length / 2);
            const colItems = colIndex === 0 ? items.slice(0, half) : items.slice(half);
            return (
              <div className="travel-col" key={colIndex}>
                {(colItems.length ? colItems : [{}]).map((item, i) => (
                  <Clip key={i} src={item.src} badge={item.badge} landscape />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="reel-strip">
          {(items.length ? items : [{}]).map((item, i) => (
            <Clip key={i} src={item.src} badge={item.badge} />
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

/* A couple of clips to preview a category with in the search view,
   Apple-Music-"인기 신곡"-style, regardless of whether it uses regions. */
function previewClipsOf(cat, n) {
  const clips = Array.isArray(cat.clips) && cat.clips.length
    ? cat.clips
    : (cat.regions || []).flatMap((r) => r.clips || []);
  return clips.slice(0, n);
}

function CategoryFeed({ cat, categories }) {
  const hasRegions = Array.isArray(cat.regions) && cat.regions.length > 0;
  const clips = hasRegions
    ? cat.regions.flatMap((r) => r.clips.map((src) => ({ src, badge: r.label })))
    : (cat.clips || []);
  const continuations = continuationsFor(categories, cat.id);

  return (
    <div className="cat-feed">
      <ClipGrid layout={cat.layout} clips={clips} />
      {continuations.map((c) => (
        <ClipGrid key={c.id} layout={c.layout} clips={c.clips} />
      ))}
    </div>
  );
}

function ProfileCard({ config }) {
  return (
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
  );
}

export default function PortfolioView({ config }) {
  const categories = config.categories;
  const navCategories = categories.filter((cat) => !cat.hideFromNav);
  const [view, setView] = useState('home'); // 'home' | 'search' | a category id
  const activeCategory = categories.find((cat) => cat.id === view) || null;
  const [query, setQuery] = useState('');
  const searchResults = navCategories.filter((cat) =>
    cat.navLabel.toLowerCase().includes(query.trim().toLowerCase())
  );
  const mainRef = useRef(null);

  function selectView(v) {
    setView(v);
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
          <button type="button" className={'app-nav-item' + (view === 'search' ? ' active' : '')} onClick={() => selectView('search')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            검색
          </button>
          <button type="button" className={'app-nav-item' + (view === 'home' ? ' active' : '')} onClick={() => selectView('home')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v10h12V10" /></svg>
            홈
          </button>
          {navCategories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              className={'app-nav-item' + (view === cat.id ? ' active' : '')}
              onClick={() => selectView(cat.id)}
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

            <CategoryFeed cat={activeCategory} categories={categories} key={activeCategory.id} />
          </div>
        ) : view === 'search' ? (
          <div className="app-main-inner" key="search">
            <div className="ig-topbar">
              <span />
              <div className="ig-topbar-actions">
                <a className="ig-btn-link" href="https://siriai.co.kr" target="_blank" rel="noopener noreferrer">홈으로 이동</a>
              </div>
            </div>

            <ProfileCard config={config} />

            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                type="text"
                className="search-input"
                placeholder="캠페인 카테고리 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <h2 className="search-section-title">
              {query.trim() ? `"${query}" 검색 결과` : '인기 캠페인'}
            </h2>

            {searchResults.length > 0 ? (
              <div className="search-results">
                {searchResults.map((cat) => (
                  <button type="button" className="search-result" key={cat.id} onClick={() => selectView(cat.id)}>
                    <div className="search-result-thumbs">
                      {previewClipsOf(cat, 2).map((src, i) => <Clip key={i} src={src} />)}
                    </div>
                    <span className="search-result-label">{cat.navLabel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="search-empty">&ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.</p>
            )}
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

      <LeadForm categoryLabel={activeCategory?.navLabel} />
    </div>
  );
}

function LeadForm({ categoryLabel }) {
  const [brand, setBrand] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error

  async function onSubmit(e) {
    e.preventDefault();
    if (!brand.trim() || !phone.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, phone, category: categoryLabel || null }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
      setBrand('');
      setPhone('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="floating-bar floating-bar-form">
        <div className="lead-done">
          <span>문의가 접수됐어요. 빠르게 연락드릴게요! 🎉</span>
          <button type="button" className="lead-again" onClick={() => setStatus('idle')}>다시 문의하기</button>
        </div>
      </div>
    );
  }

  return (
    <form className="floating-bar floating-bar-form" onSubmit={onSubmit}>
      <div className="lead-title">
        {categoryLabel ? `${categoryLabel} 릴스 제작 문의` : 'SIRIAI 캠페인 제작 문의'} <span className="lead-bolt">⚡</span>
      </div>
      <div className="lead-fields">
        <input
          type="text"
          className="lead-input"
          placeholder="브랜드명"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          required
        />
        <input
          type="tel"
          className="lead-input"
          placeholder="010-"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <button type="submit" className="lead-submit" disabled={status === 'sending'}>
          {status === 'sending' ? '전송 중...' : '완료'}
        </button>
      </div>
      {status === 'error' && <p className="lead-error">전송에 실패했어요. 다시 시도해주세요.</p>}
    </form>
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
