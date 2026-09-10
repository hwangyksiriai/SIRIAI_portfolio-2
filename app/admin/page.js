'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function AdminPage() {
  const [config, setConfig] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRegionKey, setSelectedRegionKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [highlightUploading, setHighlightUploading] = useState(false);
  const [dragOverCatId, setDragOverCatId] = useState(null);
  const dragSource = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        return data;
      })
      .then((data) => {
        setConfig(data);
        setSelectedId(data.categories[0]?.id);
        const first = data.categories[0];
        if (first?.regions) setSelectedRegionKey(first.regions[0].key);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  if (loadError) {
    return (
      <div style={styles.loading}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ color: C.accent, fontWeight: 700, marginBottom: 8 }}>설정을 불러오지 못했습니다</p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{loadError}</p>
          <p style={{ fontSize: 12, marginTop: 12 }}>
            데이터가 덮어써지지 않도록 편집을 막았습니다. 새로고침 후에도 같은 메시지가 뜨면 알려주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!config) {
    return <div style={styles.loading}>불러오는 중...</div>;
  }

  const category = config.categories.find((c) => c.id === selectedId);
  const hasRegions = Array.isArray(category?.regions) && category.regions.length > 0;
  const clips = hasRegions
    ? category.regions.find((r) => r.key === selectedRegionKey)?.clips || []
    : category?.clips || [];

  function updateClips(newClips) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const cat = next.categories.find((c) => c.id === selectedId);
      if (hasRegions) {
        const region = cat.regions.find((r) => r.key === selectedRegionKey);
        region.clips = newClips;
      } else {
        cat.clips = newClips;
      }
      return next;
    });
  }

  function addAbroadRegion() {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const cat = next.categories.find((c) => c.id === selectedId);
      if (Array.isArray(cat.regions) && cat.regions.length > 0) {
        cat.regions.push({ key: 'abroad', label: '해외', clips: [] });
      } else {
        cat.regions = [
          { key: 'domestic', label: '국내', clips: cat.clips || [] },
          { key: 'abroad', label: '해외', clips: [] },
        ];
        delete cat.clips;
      }
      return next;
    });
    setSelectedRegionKey('abroad');
  }

  function updateCategoryTitle(title) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const cat = next.categories.find((c) => c.id === selectedId);
      cat.title = title;
      return next;
    });
  }

  function updateCategoryHighlight(url) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const cat = next.categories.find((c) => c.id === selectedId);
      cat.highlightImage = url;
      return next;
    });
  }

  function updateAvatar(url) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      next.profile = { ...(next.profile || {}), avatarUrl: url };
      return next;
    });
  }

  async function onAvatarSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      const blob = await upload(`profile/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
      });
      updateAvatar(blob.url);
    } catch (err) {
      console.error('avatar upload failed', err);
      alert('프로필 사진 업로드에 실패했습니다');
    }
    setAvatarUploading(false);
  }

  async function onHighlightSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setHighlightUploading(true);
    try {
      const blob = await upload(`media/${selectedId}/highlight-${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
      });
      updateCategoryHighlight(blob.url);
    } catch (err) {
      console.error('highlight upload failed', err);
      alert('하이라이트 사진 업로드에 실패했습니다');
    }
    setHighlightUploading(false);
  }

  function removeClip(index) {
    const next = clips.slice();
    next.splice(index, 1);
    updateClips(next);
  }

  function onDragStart(index) {
    dragSource.current = { catId: selectedId, regionKey: selectedRegionKey, index };
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function onDrop(index) {
    const src = dragSource.current;
    dragSource.current = null;
    if (!src) return;
    if (src.catId === selectedId && src.regionKey === selectedRegionKey) {
      if (src.index === index) return;
      const next = clips.slice();
      const [moved] = next.splice(src.index, 1);
      next.splice(index, 0, moved);
      updateClips(next);
    } else {
      moveClipAcrossPages(src, { catId: selectedId, regionKey: selectedRegionKey, index });
    }
  }

  function moveClipAcrossPages(src, dest) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const srcCat = next.categories.find((c) => c.id === src.catId);
      const srcHasRegions = Array.isArray(srcCat.regions) && srcCat.regions.length > 0;
      const srcArr = srcHasRegions
        ? srcCat.regions.find((r) => r.key === src.regionKey).clips
        : srcCat.clips;
      const [moved] = srcArr.splice(src.index, 1);

      const destCat = next.categories.find((c) => c.id === dest.catId);
      const destHasRegions = Array.isArray(destCat.regions) && destCat.regions.length > 0;
      let destArr;
      if (destHasRegions) {
        const regionKey = dest.regionKey && destCat.regions.some((r) => r.key === dest.regionKey)
          ? dest.regionKey
          : destCat.regions[0].key;
        destArr = destCat.regions.find((r) => r.key === regionKey).clips;
      } else {
        destArr = destCat.clips || (destCat.clips = []);
      }
      if (dest.index != null) {
        destArr.splice(dest.index, 0, moved);
      } else {
        destArr.push(moved);
      }
      return next;
    });
  }

  function onSidebarDragOver(e, catId) {
    e.preventDefault();
    if (dragSource.current && dragSource.current.catId !== catId) setDragOverCatId(catId);
  }

  function onSidebarDragLeave(catId) {
    setDragOverCatId((cur) => (cur === catId ? null : cur));
  }

  function onSidebarDrop(catId) {
    const src = dragSource.current;
    dragSource.current = null;
    setDragOverCatId(null);
    if (!src || src.catId === catId) return;
    moveClipAcrossPages(src, { catId, regionKey: null, index: null });
  }

  async function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingCount(files.length);
    const uploaded = [];
    for (const file of files) {
      try {
        const blob = await upload(`media/${selectedId}/${Date.now()}-${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload',
        });
        uploaded.push(blob.url);
      } catch (err) {
        console.error('upload failed', file.name, err);
        alert(`업로드 실패: ${file.name}`);
      }
      setUploadingCount((c) => c - 1);
    }
    updateClips([...clips, ...uploaded]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function onSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString('ko-KR'));
      } else {
        // Surface what the server actually said — a blanket "failed" hides
        // whether this is an expired session, a missing Blob token, etc.
        const detail = await res.text().catch(() => '');
        let message = detail;
        try {
          message = JSON.parse(detail).error || detail;
        } catch {}
        setSaveError(
          res.status === 401
            ? '세션이 만료되었습니다. 다시 로그인해주세요.'
            : `저장 실패 (${res.status}) ${message}`.trim()
        );
      }
    } catch (err) {
      setSaveError(`저장 실패: ${err.message}`);
    }
    setSaving(false);
  }

  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <div style={styles.wrap}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>SIRIAI Admin</div>

        <div style={styles.profileBox}>
          <div style={styles.profileAvatar}>
            {config.profile?.avatarUrl && <img src={config.profile.avatarUrl} alt="" style={styles.profileAvatarImg} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.profileLabel}>프로필 사진</div>
            <label style={styles.smallBtn}>
              {avatarUploading ? '업로드 중...' : '사진 변경'}
              <input type="file" accept="image/png,image/jpeg" onChange={onAvatarSelected} style={{ display: 'none' }} />
            </label>
            {config.profile?.avatarUrl && (
              <button onClick={() => updateAvatar(null)} style={styles.smallRemoveBtn}>기본으로</button>
            )}
          </div>
        </div>

        {config.categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedId(cat.id);
              setSelectedRegionKey(cat.regions ? cat.regions[0].key : null);
            }}
            onDragOver={(e) => onSidebarDragOver(e, cat.id)}
            onDragLeave={() => onSidebarDragLeave(cat.id)}
            onDrop={() => onSidebarDrop(cat.id)}
            style={{
              ...styles.navItem,
              ...(cat.id === selectedId ? styles.navItemActive : {}),
              ...(cat.id === dragOverCatId ? styles.navItemDragOver : {}),
            }}
          >
            <span style={styles.navItemIdx}>{String(i + 1).padStart(2, '0')}</span>
            {cat.navLabel}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onLogout} style={styles.logoutBtn}>로그아웃</button>
      </aside>

      <main style={styles.main}>
        <div style={styles.topBar}>
          <input
            value={category.title}
            onChange={(e) => updateCategoryTitle(e.target.value)}
            style={styles.titleInput}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveError
              ? <span style={styles.saveErrorNote}>{saveError}</span>
              : savedAt && <span style={styles.savedNote}>저장됨 {savedAt}</span>}
            <button onClick={onSave} disabled={saving} style={styles.saveBtn}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div style={styles.highlightBox}>
          <div style={styles.highlightThumb}>
            {category.highlightImage
              ? <img src={category.highlightImage} alt="" style={styles.profileAvatarImg} />
              : <span style={styles.highlightThumbEmpty}>아이콘</span>}
          </div>
          <div>
            <div style={styles.profileLabel}>이 카테고리의 하이라이트 사진</div>
            <label style={styles.smallBtn}>
              {highlightUploading ? '업로드 중...' : '사진 변경'}
              <input type="file" accept="image/png,image/jpeg" onChange={onHighlightSelected} style={{ display: 'none' }} />
            </label>
            {category.highlightImage && (
              <button onClick={() => updateCategoryHighlight(null)} style={styles.smallRemoveBtn}>기본 아이콘으로</button>
            )}
          </div>
        </div>

        {hasRegions && (
          <>
            <div style={styles.regionTabs}>
              {category.regions.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setSelectedRegionKey(r.key)}
                  style={{
                    ...styles.regionTab,
                    ...(r.key === selectedRegionKey ? styles.regionTabActive : {}),
                  }}
                >
                  {r.label}
                  <span style={styles.regionTabCount}>{category.regions.find((x) => x.key === r.key)?.clips.length || 0}</span>
                </button>
              ))}
              {!category.regions.some((r) => r.key === 'abroad') && (
                <button onClick={addAbroadRegion} style={styles.regionTabAdd}>+ 해외 추가</button>
              )}
            </div>
            <p style={styles.hint}>
              지금 <b style={{ color: C.accent }}>{category.regions.find((r) => r.key === selectedRegionKey)?.label}</b> 탭이 선택되어 있습니다.
              여기서 영상을 추가하면 이 지역으로 들어가요. 실제 사이트에서도 이 탭 이름 그대로 국내/해외(또는 국가별) 버튼으로 보여집니다.
            </p>
          </>
        )}

        {!hasRegions && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={addAbroadRegion} style={styles.regionTabAdd}>+ 해외 추가 (국내/해외로 나누기)</button>
          </div>
        )}

        <p style={styles.hint}>카드를 드래그해서 순서를 바꾸세요. 왼쪽 페이지 목록으로 드래그하면 해당 페이지로 영상이 이동합니다. 영상을 추가하려면 아래 버튼을 누르세요.</p>

        <div style={styles.clipGrid}>
          {clips.map((src, i) => (
            <div
              key={src + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              style={styles.clipCard}
            >
              <video src={src} muted loop playsInline style={styles.clipVideo}
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
              <div style={styles.clipFooter}>
                <span style={styles.clipIndex}>{i + 1}</span>
                <button onClick={() => removeClip(i)} style={styles.removeBtn}>삭제</button>
              </div>
            </div>
          ))}

          <label style={styles.addCard}>
            {uploadingCount > 0 ? `업로드 중 (${uploadingCount})` : '+ 영상 추가'}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,image/png,image/jpeg"
              multiple
              onChange={onFilesSelected}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </main>
    </div>
  );
}

/* Palette mirrors the public site's tokens (app/globals.css :root) so the
   admin doesn't feel like a different, unrelated tool. */
const C = {
  bg: '#ffffff', ink: '#171310', muted: '#6f6a5c', accent: '#fa233b',
  line: '#e4ded2', card: '#f5f2ec', accentSoft: 'rgba(250,35,59,.14)', shellBg: '#ebeae7',
};

const styles = {
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, background: C.shellBg, fontFamily: 'system-ui, sans-serif' },
  wrap: { display: 'flex', minHeight: '100vh', alignItems: 'flex-start', gap: 10, background: C.shellBg, padding: 10, color: C.ink, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' },
  sidebar: { width: 240, flex: '0 0 auto', height: 'calc(100vh - 20px)', position: 'sticky', top: 10, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16, gap: 4, background: C.bg, borderRadius: 16 },
  sidebarHeader: { fontWeight: 700, fontSize: 16, marginBottom: 12, padding: '0 4px' },
  profileBox: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginBottom: 12, border: `1px solid ${C.line}`, borderRadius: 10, background: C.card },
  profileAvatar: { width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: C.line, flex: '0 0 auto' },
  profileAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  profileLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  smallBtn: { display: 'inline-block', fontSize: 11, color: C.ink, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' },
  smallRemoveBtn: { display: 'inline-block', fontSize: 11, color: C.accent, background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 8, padding: 0 },
  highlightBox: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', marginBottom: 16, border: `1px solid ${C.line}`, borderRadius: 10, background: C.card },
  highlightThumb: { width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' },
  highlightThumbEmpty: { fontSize: 10, color: C.muted },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: 'transparent', border: '1px solid transparent', color: C.ink, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 500 },
  navItemActive: { background: C.accentSoft, color: C.accent, fontWeight: 700 },
  navItemDragOver: { borderColor: C.accent, background: C.accentSoft, color: C.accent },
  navItemIdx: { fontSize: 11, color: C.accent, fontVariantNumeric: 'tabular-nums' },
  logoutBtn: { background: 'transparent', border: `1px solid ${C.line}`, color: C.muted, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5 },
  main: { flex: 1, minWidth: 0, height: 'calc(100vh - 20px)', overflowY: 'auto', background: C.bg, borderRadius: 16, padding: 28, boxSizing: 'border-box' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 },
  titleInput: { fontSize: 22, fontWeight: 700, background: 'transparent', border: 'none', color: C.ink, borderBottom: `1px solid ${C.line}`, padding: '4px 0', flex: 1 },
  savedNote: { fontSize: 12, color: C.muted },
  saveErrorNote: { fontSize: 12, color: C.accent, fontWeight: 600, maxWidth: 420, textAlign: 'right' },
  saveBtn: { background: C.accent, border: 'none', color: '#fff', fontWeight: 700, padding: '9px 20px', borderRadius: 999, cursor: 'pointer', fontSize: 13.5 },
  regionTabs: { display: 'flex', gap: 8, marginBottom: 12 },
  regionTab: { display: 'flex', alignItems: 'center', gap: 6, background: C.card, border: `1px solid ${C.line}`, color: C.muted, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  regionTabActive: { color: '#fff', borderColor: C.accent, background: C.accent },
  regionTabCount: { fontSize: 11, opacity: .75, fontVariantNumeric: 'tabular-nums' },
  regionTabAdd: { background: 'transparent', border: `1px dashed ${C.line}`, color: C.muted, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  hint: { fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 },
  clipGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 },
  clipCard: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', cursor: 'grab' },
  clipVideo: { width: '100%', aspectRatio: '9/16', objectFit: 'cover', background: '#000' },
  clipFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' },
  clipIndex: { fontSize: 11, color: C.muted },
  removeBtn: { background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 11 },
  addCard: { aspectRatio: '9/16', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${C.line}`, borderRadius: 10, color: C.muted, fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: 8 },
};
