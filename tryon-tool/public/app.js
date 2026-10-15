const $ = (id) => document.getElementById(id);
const el = {
  drop: $('drop'), file: $('file'), compare: $('compare'), before: $('imgBefore'), after: $('imgAfter'),
  slider: $('slider'), afterTag: $('afterTag'), busy: $('busy'), changePhoto: $('changePhoto'), download: $('download'),
  looks: $('looks'), looksRow: $('looksRow'), styles: $('styles'), swatches: $('swatches'), lengths: $('lengths'),
  colorPicked: $('colorPicked'), lengthPicked: $('lengthPicked'), lengthBlock: $('lengthBlock'), consent: $('consent'),
  go: $('go'), error: $('error'), form: $('form'), sumName: $('sumName'), sumLink: $('sumLink'), sumPrice: $('sumPrice'),
  mockNote: $('mockNote'), lede: $('lede'), consentText: $('consentText'), fine: $('fine'), busyText: $('busyText'),
};

const state = { mode: 'ai', modelUrl: null, catalog: [], styleId: null, color: null, length: null, photo: null, busy: false, looks: [], active: null };
const MAX_SIDE = 1280;
const CF_SIDE = 480; // Cloudflare's FLUX.2 wants input photos smaller than 512x512

// ---------- photo handling ----------
async function prepare(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPEG, PNG or WebP photo.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That photo could not be opened. Try another one.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h); // re-encoding also strips EXIF/location data
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  // A small copy for Cloudflare, which only accepts input photos under 512x512.
  const k = Math.min(1, CF_SIDE / Math.max(w, h));
  const sw = Math.max(64, Math.round(w * k));
  const sh = Math.max(64, Math.round(h * k));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  small.getContext('2d').drawImage(canvas, 0, 0, sw, sh);
  const smallUrl = small.toDataURL('image/jpeg', 0.92);

  return { dataUrl, mime: 'image/jpeg', data: dataUrl.split(',')[1], small: { mime: 'image/jpeg', data: smallUrl.split(',')[1], width: sw, height: sh } };
}

async function setPhoto(file) {
  setError('');
  try {
    state.photo = await prepare(file);
  } catch (e) {
    return setError(e.message);
  }
  state.looks = [];
  state.active = null;
  el.before.src = state.photo.dataUrl;
  el.after.removeAttribute('src');
  showCompare(false);
  el.drop.hidden = true;
  el.compare.hidden = false;
  el.before.style.visibility = 'visible';
  el.changePhoto.hidden = false;
  el.download.hidden = true;
  renderLooks();
  refresh();
}

function showCompare(hasAfter) {
  el.after.style.display = hasAfter ? 'block' : 'none';
  el.slider.style.display = hasAfter ? 'block' : 'none';
  document.querySelector('.bar').style.display = hasAfter ? 'block' : 'none';
  document.querySelector('.tag-after').style.display = hasAfter ? 'block' : 'none';
  document.querySelector('.tag-before').style.display = hasAfter ? 'block' : 'none';
}

el.file.addEventListener('change', () => el.file.files[0] && setPhoto(el.file.files[0]));
el.changePhoto.addEventListener('click', () => {
  el.file.value = '';
  el.file.click();
});
['dragenter', 'dragover'].forEach((t) => el.drop.addEventListener(t, (e) => { e.preventDefault(); el.drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => el.drop.addEventListener(t, (e) => { e.preventDefault(); el.drop.classList.remove('over'); }));
el.drop.addEventListener('drop', (e) => e.dataTransfer.files[0] && setPhoto(e.dataTransfer.files[0]));

el.slider.addEventListener('input', () => el.compare.style.setProperty('--cut', `${el.slider.value}%`));

// ---------- catalog UI ----------
const style = () => state.catalog.find((s) => s.id === state.styleId);
const money = (n) => `$${n.toFixed(2)}`;

function renderStyles() {
  el.styles.innerHTML = '';
  for (const s of state.catalog) {
    const wrap = document.createElement('div');
    wrap.className = 'style';
    wrap.innerHTML = `<input type="radio" name="style" id="st-${s.id}" value="${s.id}"><label for="st-${s.id}"><b></b><small></small><span class="grp"></span></label>`;
    wrap.querySelector('b').textContent = s.name;
    wrap.querySelector('small').textContent = s.blurb;
    wrap.querySelector('.grp').textContent = s.group;
    wrap.querySelector('input').addEventListener('change', () => selectStyle(s.id));
    el.styles.append(wrap);
  }
}

function selectStyle(id) {
  state.styleId = id;
  const s = style();
  document.getElementById(`st-${id}`).checked = true;
  state.color = s.colors[0].name;
  state.length = s.lengths ? s.lengths[Math.min(4, s.lengths.length - 1)].inches : null;
  renderColors();
  renderLengths();
  refresh();
}

function renderColors() {
  const s = style();
  el.swatches.innerHTML = '';
  for (const c of s.colors) {
    const id = `c-${c.name.replace(/\W+/g, '-')}`;
    const wrap = document.createElement('label');
    wrap.className = 'sw';
    wrap.title = c.name;
    wrap.innerHTML = `<input type="radio" name="color" id="${id}" aria-label="${c.name}"><span></span>`;
    const chip = wrap.querySelector('span');
    chip.style.setProperty('--c1', c.hex);
    if (c.hex2) chip.style.setProperty('--c2', c.hex2);
    const input = wrap.querySelector('input');
    input.checked = c.name === state.color;
    input.addEventListener('change', () => { state.color = c.name; refresh(); });
    el.swatches.append(wrap);
  }
}

function renderLengths() {
  const s = style();
  el.lengths.innerHTML = '';
  if (!s.lengths) {
    el.lengthBlock.hidden = !s.fixedInches;
    el.lengthPicked.textContent = s.fixedInches ? `${s.fixedInches}" (one length)` : '';
    return;
  }
  el.lengthBlock.hidden = false;
  for (const l of s.lengths) {
    const wrap = document.createElement('label');
    wrap.className = 'len';
    wrap.innerHTML = `<input type="radio" name="length" value="${l.inches}"><span>${l.inches}"</span>`;
    const input = wrap.querySelector('input');
    input.checked = l.inches === state.length;
    input.addEventListener('change', () => { state.length = l.inches; refresh(); });
    el.lengths.append(wrap);
  }
}

function currentPrice() {
  const s = style();
  if (!s) return null;
  const c = s.colors.find((x) => x.name === state.color);
  if (c?.price != null) return { value: c.price };
  const lp = s.lengths?.find((x) => x.inches === state.length)?.price;
  if (lp != null) return { value: lp };
  return s.fromPrice != null ? { value: s.fromPrice, from: true } : null;
}

function refresh() {
  const s = style();
  if (s) {
    el.colorPicked.textContent = state.color || '';
    if (s.lengths) el.lengthPicked.textContent = `${state.length}"`;
    el.sumName.textContent = `${s.name}, ${state.color}${state.length ? `, ${state.length}"` : ''}`;
    el.sumLink.href = s.url;
    const p = currentPrice();
    el.sumPrice.innerHTML = p ? `${p.from ? 'from ' : ''}${money(p.value)} <small>${p.from ? 'per pack, varies by length' : 'one pack'}</small>` : '';
  }
  el.go.disabled = state.busy || !(state.photo && s && el.consent.checked);
  el.go.textContent = state.busy ? 'Styling…' : 'Preview this look';
}
el.consent.addEventListener('change', refresh);

// ---------- generate ----------
function setError(msg) { el.error.textContent = msg; }

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (el.go.disabled) return;
  setError('');
  state.busy = true;
  el.busy.hidden = false;
  refresh();
  try {
    if (state.mode === 'free') {
      const st = style();
      const col = st.colors.find((c) => c.name === state.color);
      const { freePreview } = await import('./free.js');
      const out = await freePreview({
        dataUrl: state.photo.dataUrl, color: col, streaks: st.mode === 'streaks', modelUrl: state.modelUrl,
      });
      const look = { id: String(Date.now()), url: `data:${out.mime};base64,${out.data}`, label: `${st.name}, ${col.name} (colour)` };
      state.looks.unshift(look);
      showLook(look);
      renderLooks();
      return;
    }
    const res = await fetch('/api/tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: state.mode === 'cloudflare' ? state.photo.small : { mime: state.photo.mime, data: state.photo.data },
        styleId: state.styleId, color: state.color, length: state.length, consent: el.consent.checked,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
    const url = `data:${json.image.mime};base64,${json.image.data}`;
    const look = { id: String(Date.now()), url, label: json.label };
    state.looks.unshift(look);
    showLook(look);
    renderLooks();
  } catch (err) {
    setError(err.message);
  } finally {
    state.busy = false;
    el.busy.hidden = true;
    refresh();
  }
});

function showLook(look) {
  state.active = look.id;
  el.after.src = look.url;
  el.afterTag.textContent = look.label;
  el.slider.value = 0; // start on the new look, drag right to compare with the original
  el.compare.style.setProperty('--cut', '0%');
  showCompare(true);
  el.download.href = look.url;
  el.download.hidden = false;
  renderLooks();
}

function renderLooks() {
  el.looks.hidden = state.looks.length === 0;
  el.looksRow.innerHTML = '';
  for (const look of state.looks) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'look';
    b.setAttribute('aria-pressed', String(look.id === state.active));
    b.innerHTML = '<img alt=""><span></span>';
    b.querySelector('img').src = look.url;
    b.querySelector('span').textContent = look.label;
    b.addEventListener('click', () => showLook(look));
    el.looksRow.append(b);
  }
}

// ---------- boot ----------
const res = await fetch('/api/catalog');
const { styles, mock, mode, modelUrl } = await res.json();
state.catalog = styles;
state.mode = mode;
state.modelUrl = modelUrl;
if (mode === 'cloudflare') {
  el.consentText.textContent = 'This is a photo of me, and I\'m 18 or over. I understand it is sent to Cloudflare Workers AI to make the preview and is not saved by this page.';
  el.fine.textContent = 'AI previews are a guide, not a promise. Colour, length and texture will differ a little from the real product, and the photo is processed at a reduced size.';
}
if (mode === 'free') {
  el.lede.textContent = 'Pick a style and colour to see that shade on your own hair. This free preview changes colour only: length, texture and volume are not shown.';
  el.consentText.textContent = 'This is a photo of me. It stays on my device and is never uploaded.';
  el.fine.textContent = 'Free colour preview, done on your device. Colour will differ a little from the real product, and your own hair length and texture stay as they are.';
  el.busyText.textContent = 'Finding your hair and changing its colour. The first time can take a few seconds.';
}
el.mockNote.hidden = !mock;
renderStyles();
selectStyle(styles[0].id);
