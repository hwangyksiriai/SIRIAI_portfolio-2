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

/* Instagram-homage content-type tabs shown above each category's clips.
   Every category here is video, so Reels is always the active tab (drawn as
   a solid badge, matching Instagram's filled state); the rest are
   decorative, matching the real profile tab row. */
function ContentTypeTabs({ className }) {
  return (
    <div className={'cat-tabs' + (className ? ' ' + className : '')}>
      <span className="cat-tab" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
      </span>
      <span className="cat-tab active">
        <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" /><path d="M10 8l6 4-6 4V8Z" fill="var(--bg)" /></svg>
      </span>
      <span className="cat-tab" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
      </span>
      <span className="cat-tab" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="10" r="3" /><path d="M7 17c0-2.8 2.2-5 5-5s5 2.2 5 5" /></svg>
      </span>
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

function CategorySection({ cat }) {
  const hasRegions = Array.isArray(cat.regions) && cat.regions.length > 0;
  const [activeRegion, setActiveRegion] = useState(hasRegions ? cat.regions[0].key : null);
  const clips = hasRegions
    ? (cat.regions.find((r) => r.key === activeRegion)?.clips || [])
    : (cat.clips || []);

  return (
    <section className="page" id={cat.id}>
      {hasRegions && (
        <RegionToggle regions={cat.regions} active={activeRegion} onChange={setActiveRegion} />
      )}
      <ContentTypeTabs />
      <div className="clip-grid">
        {cat.layout === 'travel' ? (
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
    </section>
  );
}

export default function PortfolioView({ config }) {
  const categories = config.categories;
  const navCategories = categories.filter((cat) => !cat.hideFromNav);

  function goToCategory(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <div className="deck" id="deck">
        {/* 01 PROFILE (Instagram-homage hero) */}
        <section className="page ig-page">
          <div className="ig-topbar">
            <span className="ig-topbar-logo">SIRIAI</span>
            <div className="ig-topbar-actions">
              <a className="ig-btn-fill" href="https://siriai-business.vercel.app/#contact" target="_blank" rel="noopener noreferrer">Contact</a>
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

          <div className="ig-highlights">
            {navCategories.map((cat) => (
              <a className="ig-highlight" href={`#${cat.id}`} key={cat.id} onClick={(e) => { e.preventDefault(); goToCategory(cat.id); }}>
                <span className="ig-highlight-ring">
                  <span className="ig-highlight-circle">
                    {cat.highlightImage ? <img src={cat.highlightImage} alt="" /> : <SegIcon id={cat.id} />}
                  </span>
                </span>
                <span className="ig-highlight-label">{cat.navLabel}</span>
              </a>
            ))}
          </div>

          <ContentTypeTabs className="cat-tabs-spaced" />
        </section>

        {categories.map((cat) => (
          <CategorySection cat={cat} key={cat.id} />
        ))}
      </div>
    </>
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
