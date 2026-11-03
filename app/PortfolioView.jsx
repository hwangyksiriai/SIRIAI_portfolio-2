'use client';

import { useEffect, useRef, useState } from 'react';

import { pathForView, viewForSlug } from '@/lib/slugs';

const BRAND_SYMBOL = '/media/brand/symbol-black.png';
const BRAND_WORDMARK = '/media/brand/logo-wordmark.png';
const BRAND_WORDMARK_GREY = '/media/brand/logo-wordmark-grey.png';

/* 1x1 transparent GIF. Without a poster, mobile browsers paint their own grey
   play-button placeholder until the first frame decodes; this hands them an
   invisible one so the card background shows through instead. */
const BLANK_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function Clip({ src, badge, style }) {
  const cls = 'clip' + (src ? '' : ' empty');
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
    <div className={cls} ref={ref} style={style}>
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

const LANDSCAPE = 16 / 9;

/* Width/height of each travel clip, read from the file itself so footage can
   be uploaded in either orientation without tagging it in the admin. Only
   the metadata is fetched; the card's own <video> still loads lazily. Kept
   across renders so switching region tabs doesn't probe the same file again. */
const ratioCache = new Map();

function useVideoRatios(srcs) {
  const [, setProbed] = useState(0);
  const key = srcs.join('\n');

  useEffect(() => {
    let alive = true;
    const probes = srcs.filter((src) => src && !ratioCache.has(src)).map((src) => {
      const video = document.createElement('video');
      const done = (ratio) => {
        ratioCache.set(src, ratio);
        video.removeAttribute('src');
        video.load();
        if (alive) setProbed((n) => n + 1);
      };
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () =>
        done(video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : LANDSCAPE);
      video.onerror = () => done(LANDSCAPE);
      video.src = src;
      return video;
    });
    return () => {
      alive = false;
      probes.forEach((video) => {
        video.onloadedmetadata = video.onerror = null;
      });
    };
  }, [key]);

  // Until a file's metadata arrives it is laid out as landscape, which is
  // what travel footage almost always is, so most cards never move.
  return srcs.map((src) => ratioCache.get(src) ?? LANDSCAPE);
}

/* Rows of equal height, filled left to right in admin order. Each card's
   flex-grow is its aspect ratio, so widths come out proportional and every
   card in a row lands on the same height whatever its orientation. A row
   closes once it holds about `target` worth of width — two landscape clips
   on desktop, one on phones — so a row of portrait clips is as tall as a
   row of landscape ones. */
function packRows(ratios, target) {
  const rows = [];
  let row = [];
  let sum = 0;
  ratios.forEach((ratio, i) => {
    if (row.length && sum + ratio > target * 1.15) {
      rows.push({ items: row, sum });
      row = [];
      sum = 0;
    }
    row.push(i);
    sum += ratio;
  });
  if (row.length) rows.push({ items: row, sum });
  return rows;
}

function useNarrow(query) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return narrow;
}

function TravelRows({ items }) {
  const ratios = useVideoRatios(items.map((item) => item.src));
  const narrow = useNarrow('(max-width:720px)');
  const target = (narrow ? 1 : 2) * LANDSCAPE;

  if (!items.length) {
    return (
      <div className="travel-rows">
        <div className="travel-row"><Clip style={{ '--r': LANDSCAPE }} /></div>
      </div>
    );
  }

  const rows = packRows(ratios, target);
  return (
    <div className="travel-rows">
      {rows.map((row, r) => (
        <div className="travel-row" key={r}>
          {row.items.map((i) => (
            <Clip key={items[i].src + i} src={items[i].src} badge={items[i].badge} style={{ '--r': ratios[i] }} />
          ))}
          {/* A short last row keeps the full-row height instead of
              stretching one portrait clip across the whole feed. */}
          {r === rows.length - 1 && row.sum < target && (
            <div className="travel-row-filler" style={{ '--r': target - row.sum }} />
          )}
        </div>
      ))}
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
        <TravelRows items={items} />
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

function CategoryFeed({ cat }) {
  const hasRegions = Array.isArray(cat.regions) && cat.regions.length > 0;
  const regions = hasRegions ? cat.regions.filter((r) => (r.clips || []).length > 0) : [];
  const [activeIndex, setActiveIndex] = useState(0);

  if (!hasRegions) {
    return (
      <div className="cat-feed">
        <ClipGrid layout={cat.layout} clips={cat.clips || []} />
      </div>
    );
  }

  // A single populated region (e.g. only domestic footage submitted so far,
  // or only one country for Artist Promotion): no tabs to switch between,
  // but the region still gets a plain label so it's clear what's showing.
  if (regions.length <= 1) {
    const region = regions[0];
    return (
      <div className="cat-feed">
        {region && (
          <div className="cat-region-tabs">
            <span className="cat-region-tab active">{region.label}</span>
          </div>
        )}
        <ClipGrid layout={cat.layout} clips={region ? region.clips : []} />
      </div>
    );
  }

  const active = regions[Math.min(activeIndex, regions.length - 1)];

  return (
    <div className="cat-feed">
      <div className="cat-region-tabs">
        {regions.map((r, i) => (
          <button
            key={r.key}
            type="button"
            className={'cat-region-tab' + (i === activeIndex ? ' active' : '')}
            onClick={() => setActiveIndex(i)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="cat-region-panel" key={active.key}>
        <ClipGrid layout={cat.layout} clips={active.clips} />
      </div>
    </div>
  );
}

const MARQUEE_BRANDS_BY_CATEGORY = {
  'cat-beauty': [
    'ODDTYPE', 'INNISFREE', 'TOCOBO', 'Quadthera', 'forhz', 'OFFLOW', 'KEEPINTOUCH',
    'Ohayoh', 'No the Love', 'COSRX', 'Musinsa standard beauty', 'wizzy', 'Finv',
    'Lusom', 'Pretty Actually', 'Yadah', 'if:fu', 'Keybo', 'Skinsignal',
  ],
  'cat-fashion': [
    '8division', 'TOOMUCHTAX', 'innir', 'as if', 'Calie', 'Bluesunset', 'OJOS',
    'Luaeb', 'The Cactus Hotel', 'Seven Eight Under', 'RATED GREEN', 'Lumiere Blanche', 'Velvaskin',
  ],
};

function MarqueeItems({ brands }) {
  // Doubled so the loop can reset invisibly at the halfway point (seamless,
  // constant-speed right-to-left scroll — no jump or restart flicker).
  const items = [...brands, ...brands];
  return items.map((label, i) => (
    <span key={i} className="cat-marquee-item">
      <span className="cat-marquee-item-label">{label}</span>
      <span className="cat-marquee-dot" aria-hidden="true">•</span>
    </span>
  ));
}

function BrandMarquee({ categoryId }) {
  const brands = MARQUEE_BRANDS_BY_CATEGORY[categoryId];
  if (!brands) return null;

  return (
    <div className="cat-marquee">
      <div className="cat-marquee-track">
        <MarqueeItems brands={brands} />
      </div>
      {/* A second, identically-scrolling copy of the text, gradient-colored
          and revealed only through a moving spotlight mask — so whichever
          brand happens to sit under the sweep lights up, independent of the
          scroll itself. Purely decorative, hidden from assistive tech. */}
      <div className="cat-marquee-shine-mask" aria-hidden="true">
        <div className="cat-marquee-track cat-marquee-track-shine">
          <MarqueeItems brands={brands} />
        </div>
      </div>
    </div>
  );
}

function ContactBar({ category }) {
  const [brand, setBrand] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'done' | 'error'
  // The form covers a fifth of a phone screen, so it starts folded there and
  // only unfolds when tapped. On desktop there is room for it to stay open.
  // Resolved after mount because the server has no viewport to measure.
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setOpen(!window.matchMedia('(max-width:900px)').matches);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!brand.trim() || !phone.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, phone, category: category || null }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  if (open === null) return null;

  if (status === 'done') {
    return (
      <div className="floating-dock">
        <div className="floating-bar floating-bar-done">문의가 접수되었습니다.</div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="floating-dock">
        <button
          type="button"
          className="floating-bar floating-bar-pill"
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <span>Contact</span>
          <svg className="floating-bar-pill-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="floating-dock">
      <form className="floating-bar floating-bar-form" onSubmit={onSubmit}>
        <button
          type="button"
          className="floating-bar-fold"
          onClick={() => setOpen(false)}
          aria-label="문의 폼 접기"
          aria-expanded
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <span className="floating-bar-copy">가장 쉬운 방법으로 감각적인 비주얼을 만나보세요</span>
        <div className="floating-bar-row">
          <input
            className="floating-bar-input"
            placeholder="브랜드명"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            maxLength={200}
          />
          <input
            className="floating-bar-input"
            placeholder="연락처"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={50}
          />
          <button type="submit" className="floating-bar-submit" disabled={status === 'sending'}>
            <span>{status === 'sending' ? '접수 중...' : 'Contact'}</span>
            {status !== 'sending' && (
              <svg className="floating-bar-submit-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
        {status === 'error' && <span className="floating-bar-error">접수에 실패했어요. 다시 시도해주세요.</span>}
      </form>
    </div>
  );
}

export default function PortfolioView({ config, initialView = 'home' }) {
  const categories = config.categories;
  const navCategories = categories.filter((cat) => !cat.hideFromNav);
  const [view, setView] = useState(initialView); // 'home' | a category id
  const activeCategory = categories.find((cat) => cat.id === view) || null;
  const mainRef = useRef(null);

  // Switching category stays a client-side state change so it's instant, but
  // the address bar is pushed along with it so every view has a shareable
  // URL and browser back/forward move between them.
  useEffect(() => {
    function onPopState() {
      const slug = window.location.pathname.replace(/^\/|\/$/g, '');
      setView(viewForSlug(categories, slug) || 'home');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [categories]);

  function selectView(v) {
    setView(v);
    window.history.pushState({}, '', pathForView(v));
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-logo">
          <span className="app-sidebar-logo-mark"><img src={BRAND_SYMBOL} alt="" /></span>
          <img className="app-sidebar-logo-word" src={BRAND_WORDMARK} alt="Siriai" />
        </div>

        <nav className="app-nav-section">
          <button type="button" className={'app-nav-item' + (view === 'home' ? ' active' : '')} onClick={() => selectView('home')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v10h12V10" /></svg>
            Home
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

        <div className="app-sidebar-bottom">
          <a className="app-sidebar-link" href="https://siriai.co.kr" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 8l6 4-6 4V8Z" /></svg>
            홈으로 이동
            <span className="app-sidebar-link-arrow">↗</span>
          </a>
        </div>
      </aside>

      <main className="app-main" ref={mainRef}>
        {activeCategory ? (
          <div className="app-main-inner">
            <div className="cat-header">
              <h1 className="cat-title">{activeCategory.navLabel}</h1>
              <BrandMarquee categoryId={activeCategory.id} />
            </div>

            <CategoryFeed cat={activeCategory} key={activeCategory.id} />
          </div>
        ) : (
          <div className="home-hero" key="home">
            <div className="home-hero-inner">
              <img className="home-hero-brand" src={BRAND_WORDMARK_GREY} alt="Siriai" />
              <h1 className="home-hero-title">감각적인 비주얼을<br />만나보세요.</h1>
              <img className="home-hero-symbol" src={BRAND_SYMBOL} alt="Siriai" />
              <p className="home-hero-sub">
                브랜드의 아이덴티티에 가장 근접한 인플루언서 큐레이션.{' '}
                <br className="brk" />
                메뉴에서 캠페인을 둘러보세요.
              </p>
            </div>
          </div>
        )}
      </main>

      <ContactBar category={activeCategory?.navLabel} />
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
