/* Guía de anfibios y reptiles de Costa Rica (antes guía de serpientes) – app sin conexión (misma lógica que la guía
   de aves). Los datos vienen de datos/serpientes.js (window.GUIA), generado por herramientas/construir_app.py.
   Las fotos personales se guardan en IndexedDB, aparte de los datos de la guía,
   para que una actualización de la app no las borre. */
(() => {
  'use strict';

  const G = window.GUIA;
  const grupos = new Map(G.grupos.map(g => [g.id, g]));
  const especies = new Map(G.especies.map(e => [e.id, e]));
  const gruposAlfa = [...G.grupos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  // Categorías del inicio (forma de vida); cada grupo y cada especie tiene la suya (g.cat, e.k)
  const categorias = new Map(G.categorias.map(c => [c.id, c]));
  // Secciones del inicio (Serpientes, Lagartijas, Tortugas, Cocodrilos…), cada una dentro de una clase (Reptiles, Anfibios)
  const secciones = new Map(G.secciones.map(s => [s.id, s]));
  const secDe = e => categorias.get(e.k)?.sec;
  const catsDe = sec => G.categorias.filter(c => c.sec === sec);
  const $vista = document.getElementById('vista');
  const $titulo = document.getElementById('titulo');
  const $subtitulo = document.getElementById('subtitulo');
  const $atras = document.getElementById('btn-atras');
  const $inicio = document.getElementById('btn-inicio');
  const $buscar = document.getElementById('btn-buscar');
  const $logo = document.getElementById('logo');
  let enfocarBusqueda = false;

  const ICONO = {
    buscar: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    camara: '<svg class="icono-camara" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    galeria: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
    lupa: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/></svg>',
    izq: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    der: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    cerrar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    estrella: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    basura: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13"/></svg>',
    libro: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>',
    respaldo: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 19h16"/></svg>',
    restaurar: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>',
    aprender: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/></svg>',
    visto: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
    comparar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/></svg>',
    correo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    pasos: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    alerta: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
    tema: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
    actualizar: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/></svg>',
    instalar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M12 7v6M9.5 10.5L12 13l2.5-2.5"/></svg>',
  };

  /* ---------- Versión de escritorio (página instalable de GitHub Pages) ----------
     El service worker (sw.js, lo genera construir_app.py) guarda toda la guía para usarla sin internet y baja
     solo los archivos que cambian en cada versión. No se usa dentro del APK, que trae los archivos consigo. */
  const ENWEB = !window.AndroidApp && window.isSecureContext && 'serviceWorker' in navigator
    && location.hostname !== 'appassets.androidplatform.net';
  let pedirInstalacion = null;   // evento del navegador para ofrecer «Instalar»
  const INSTALADA = matchMedia('(display-mode: standalone)').matches;   // abierta como programa instalado
  let registroSW = null;
  if (ENWEB) {
    const habiaVersion = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(r => { registroSW = r; r.update(); }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habiaVersion || window.__recargando) return;
      window.__recargando = true;
      try { sessionStorage.setItem('guia-serpientes-actualizada', '1'); } catch (_) { /* sin almacenamiento */ }
      location.reload();
    });
    window.addEventListener('beforeinstallprompt', ev => {
      ev.preventDefault();
      pedirInstalacion = ev;
      if ((location.hash || '#/') === '#/') render();
    });
    window.addEventListener('appinstalled', () => { pedirInstalacion = null; aviso('Guía instalada en esta computadora'); });
    try {
      if (sessionStorage.getItem('guia-serpientes-actualizada')) {
        sessionStorage.removeItem('guia-serpientes-actualizada');
        setTimeout(() => aviso(`Guía actualizada a la versión ${G.version}`), 600);
      }
    } catch (_) { /* sin almacenamiento */ }
  }

  /* ---------- Fila «Versión» del inicio: versión instalada, «Buscar actualización» y «Actualizar a la x.y» ----------
     En el APK revisa Actualizador.java (version.json del último Release de GitHub) y avisa cada cambio con
     window.estadoActualizacion. En la computadora se lee version-web.json (lo genera construir_app.py; el service
     worker no lo guarda) y, si es más nueva, el service worker baja la versión y la página se recarga sola. */
  const PUEDE_ACTUALIZAR = !!(window.AndroidApp && window.AndroidApp.buscarActualizacion) || ENWEB;
  const act = { estado: 'inicial', nueva: '' };   // inicial, buscando, al-dia, nueva, sin-red o descargando
  const ESTADO_TEXTO = {
    inicial: 'Revisa si hay una versión nueva', buscando: 'Buscando actualización…', 'al-dia': 'Es la versión más reciente',
    nueva: 'Hay una versión nueva', 'sin-red': 'No se pudo revisar: se necesita internet', descargando: 'Descargando la versión nueva…',
  };
  function masNueva(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let k = 0; k < Math.max(x.length, y.length); k++) if ((x[k] || 0) !== (y[k] || 0)) return (x[k] || 0) > (y[k] || 0);
    return false;
  }
  function versionInstalada() {
    try { return (window.AndroidApp && window.AndroidApp.versionInstalada && window.AndroidApp.versionInstalada()) || G.version; } catch (_) { return G.version; }
  }
  window.estadoActualizacion = (estado, nueva) => {
    act.estado = ESTADO_TEXTO[estado] ? estado : 'inicial';
    act.nueva = nueva || '';
    pintarVersion();
  };
  async function revisarWeb(manual) {
    if (manual) estadoActualizacion('buscando');
    try {
      const r = await fetch(`version-web.json?t=${Date.now()}`, { cache: 'no-store' });
      const v = (await r.json()).version;
      if (!masNueva(v, G.version)) { estadoActualizacion('al-dia'); return; }
      estadoActualizacion('nueva', v);
      if (registroSW) registroSW.update().catch(() => {});   // empieza a bajarla
    } catch (_) { if (manual) estadoActualizacion('sin-red'); }
  }
  function filaVersion() {
    if (!PUEDE_ACTUALIZAR) return `<li><div class="fila version">${ICONO.actualizar}<span class="fila-texto"><strong>Versión ${esc(versionInstalada())}</strong><span>Datos del ${esc(G.fecha.split('-').reverse().join('/'))}</span></span></div></li>`;
    return `<li><button class="fila version" id="fila-version">${ICONO.actualizar}<span class="fila-texto" id="version-texto"></span><span class="version-accion" id="version-accion"></span></button></li>`;
  }
  function pintarVersion() {
    const $t = document.getElementById('version-texto'), $a = document.getElementById('version-accion');
    if (!$t) return;
    $t.innerHTML = `<strong>Versión ${esc(versionInstalada())}</strong><span>${esc(ESTADO_TEXTO[act.estado])}</span>`;
    const ocupado = act.estado === 'buscando' || act.estado === 'descargando';
    $a.textContent = act.estado === 'nueva' ? `Actualizar a la ${act.nueva}` : ocupado ? '' : 'Buscar actualización';
    $a.classList.toggle('nueva', act.estado === 'nueva');
    $a.hidden = ocupado;
  }
  function tocarVersion() {
    if (act.estado === 'buscando' || act.estado === 'descargando') return;
    if (window.AndroidApp) {
      if (act.estado === 'nueva') window.AndroidApp.actualizar();
      else window.AndroidApp.buscarActualizacion();
    } else if (act.estado === 'nueva') {
      const v = act.nueva;
      estadoActualizacion('descargando', v);
      if (!registroSW) { location.reload(); return; }
      // Si el service worker encuentra la versión, la baja y la página se recarga sola (controllerchange)
      registroSW.update().then(() => {
        if (registroSW.installing || registroSW.waiting) return;
        estadoActualizacion('nueva', v);
        aviso('La versión nueva todavía se está publicando. Intenta de nuevo en unos minutos.');
      }).catch(() => { estadoActualizacion('nueva', v); aviso('No se pudo descargar: se necesita internet.'); });
    } else revisarWeb(true);
  }
  /* ---------- Apariencia: tema «Clásica» o «Técnica» (tema-tecnico.css), guardado en este equipo ---------- */
  const CLAVE_TEMA = 'guia-serpientes-tema';
  const COLOR_BARRA = { clasico: '#1f4d3a', tecnico: '#0f5c50' };
  const temaActual = () => document.documentElement.dataset.tema === 'tecnico' ? 'tecnico' : 'clasico';
  function ponerTema(tema) {
    if (tema === 'tecnico') document.documentElement.dataset.tema = 'tecnico';
    else delete document.documentElement.dataset.tema;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = COLOR_BARRA[temaActual()];
    try { localStorage.setItem(CLAVE_TEMA, temaActual()); } catch (_) { /* sin almacenamiento: dura hasta cerrar */ }
  }
  ponerTema(temaActual());
  function filaTema() {
    const t = temaActual();
    return `<li><div class="fila tema-fila">${ICONO.tema}<span class="fila-texto"><strong>Apariencia</strong>
      <span class="tema-opciones" role="group" aria-label="Apariencia">
        <button data-tema="clasico" aria-pressed="${t === 'clasico'}">Clásica</button>
        <button data-tema="tecnico" aria-pressed="${t === 'tecnico'}">Técnica</button></span></span></div></li>`;
  }

  // Al abrir: en el APK se lee el resultado de la revisión que hace Android; en la computadora se revisa en silencio
  if (window.AndroidApp && window.AndroidApp.estadoActualizacion) {
    try { const [e, v] = window.AndroidApp.estadoActualizacion().split('|'); act.estado = ESTADO_TEXTO[e] ? e : 'inicial'; act.nueva = v || ''; } catch (_) { /* APK viejo */ }
  } else if (ENWEB) setTimeout(() => revisarWeb(false), 1500);

  // Sección Contacto (al final del menú): nombre del autor y correo para sugerencias
  const CONTACTO = { nombre: 'MSc. Ing. Nelson Espinoza Mora', correo: 'nelsonmem@gmail.com' };

  /* ---------- utilidades ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normal = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Las especies sin foto libre muestran un dibujo neutro (no se usa la foto de otra especie)
  const SIN_FOTO = 'sin-foto.svg';
  // Galería de la guía: la foto 1 es fotos/<id>.webp y las demás fotos/<id>-<n>.webp (e.nf fotos en total)
  const foto = (id, n = 1) => especies.get(id)?.f === 0 ? SIN_FOTO : n > 1 ? `fotos/${id}-${n}.webp` : `fotos/${id}.webp`;
  const fotosGuia = e => e.f === 0 ? [SIN_FOTO] : Array.from({ length: e.nf || 1 }, (_, k) => foto(e.id, k + 1));
  const mini = id => especies.get(id)?.f === 0 ? SIN_FOTO : `fotos/min/${id}.webp`;
  // Nombre principal: el común en español; si la especie no tiene, el científico
  const nom = e => e.es || e.sci;
  const sci = e => `<i>${esc(e.sci)}</i>`;
  const paginas = p => !p ? '' : p[0] === p[1] ? `pág. ${p[0]}` : `págs. ${p[0]} a ${p[1]}`;
  // Fuente de cada ficha (e.fu): Solórzano (2022) para las serpientes; para los demás reptiles, la guía de bolsillo de
  // Muñoz Chacón y Johnston (2013) o, si la especie no está en ella, The Reptile Database
  const FUENTES = {
    sol: { cita: 'Solórzano, <i>Serpientes de Costa Rica</i> (2022)', nl: 'En el libro', mapa: 'Libro',
      sinMapa: 'El libro no da una distribución en Costa Rica que se pueda dibujar para esta especie.' },
    mcj: { cita: 'Muñoz Chacón y Johnston, <i>Anfibios y reptiles de Costa Rica</i> (2013)', nl: 'En la guía de bolsillo', mapa: 'Guía',
      sinMapa: 'La guía de bolsillo no describe su distribución con detalle. Mira «Registros GBIF».' },
    rdb: { cita: 'The Reptile Database (Uetz y colaboradores, reptile-database.org)', nl: 'También llamada', mapa: 'Guía',
      sinMapa: 'Esta especie no está en la guía de bolsillo. Mira «Registros GBIF».' },
  };
  const fuente = e => FUENTES[e.fu] || FUENTES.sol;

  function aviso(texto) {
    const a = document.getElementById('aviso');
    a.textContent = texto;
    a.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { a.hidden = true; }, 2600);
  }

  let urlsTemporales = [];
  function urlBlob(blob) {
    const u = URL.createObjectURL(blob);
    urlsTemporales.push(u);
    return u;
  }

  /* ---------- fotos personales (IndexedDB) ---------- */
  const BD = {
    db: null,
    abrir() {
      return new Promise((ok, mal) => {
        const r = indexedDB.open('guia-serpientes', 1);
        r.onupgradeneeded = () => {
          const s = r.result.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true });
          s.createIndex('especie', 'especie');
        };
        r.onsuccess = () => { this.db = r.result; ok(); };
        r.onerror = () => mal(r.error);
      });
    },
    tx(modo, fn) {
      return new Promise((ok, mal) => {
        const t = this.db.transaction('fotos', modo);
        const res = fn(t.objectStore('fotos'));
        t.oncomplete = () => ok(res && 'result' in res ? res.result : res);
        t.onerror = () => mal(t.error);
      });
    },
    todas() { return this.tx('readonly', s => s.getAll()); },
    deEspecie(id) { return this.tx('readonly', s => s.index('especie').getAll(id)); },
    agregar(reg) { return this.tx('readwrite', s => s.add(reg)); },
    guardar(reg) { return this.tx('readwrite', s => s.put(reg)); },
    borrar(id) { return this.tx('readwrite', s => s.delete(id)); },
  };

  // especie -> URL de la miniatura principal (solo especies con fotos personales)
  const misFotos = new Map();

  function ordenar(lista) {
    return lista.sort((a, b) => (b.principal - a.principal) || (a.fecha - b.fecha));
  }

  async function cargarMisFotos() {
    misFotos.forEach(u => URL.revokeObjectURL(u));
    misFotos.clear();
    const porEspecie = {};
    for (const r of await BD.todas()) (porEspecie[r.especie] ||= []).push(r);
    for (const [id, lista] of Object.entries(porEspecie)) {
      misFotos.set(id, URL.createObjectURL(ordenar(lista)[0].mini));
    }
  }

  async function reducir(archivo, lado, calidad) {
    const img = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
      .catch(() => createImageBitmap(archivo));
    const k = Math.min(1, lado / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    img.close?.();
    return new Promise(ok => c.toBlob(ok, 'image/jpeg', calidad));
  }

  async function agregarFotos(especieId, archivos) {
    if (!archivos.length) return;
    aviso('Guardando foto…');
    const previas = await BD.deEspecie(especieId);
    let primera = previas.length === 0;
    for (const f of archivos) {
      try {
        const [grande, chica] = await Promise.all([reducir(f, 1600, 0.85), reducir(f, 240, 0.75)]);
        await BD.agregar({ especie: especieId, foto: grande, mini: chica, fecha: Date.now(), principal: primera });
        primera = false;
      } catch (e) {
        aviso('No se pudo leer la imagen.');
        return;
      }
    }
    await cargarMisFotos();
    aviso(archivos.length > 1 ? 'Fotos guardadas' : 'Foto guardada');
    render();
  }

  /* ---------- aprendizaje: progreso y repaso espaciado (localStorage) ---------- */
  // Por especie: n = nivel de repaso (0 a 5), p = fecha del próximo repaso, a = aciertos, f = fallos,
  // s = marcada «Ya me la sé», c = especies con las que se confundió { id: veces }
  const CLAVE_PROGRESO = 'guia-serpientes-progreso';
  const DIA = 864e5;
  const DIAS_NIVEL = [1, 1, 3, 7, 14, 30];  // días hasta el próximo repaso según el nivel
  const NIVEL_DOMINADA = 3;
  let progreso = {};
  try { progreso = JSON.parse(localStorage.getItem(CLAVE_PROGRESO)) || {}; } catch { progreso = {}; }

  function guardarProgreso() {
    try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(progreso)); } catch { aviso('No se pudo guardar el progreso.'); }
  }
  const dominada = id => (progreso[id]?.n || 0) >= NIVEL_DOMINADA;
  const pendiente = id => !!progreso[id] && progreso[id].p <= Date.now();
  const nDominadas = ids => ids.filter(dominada).length;
  // Las horas de margen hacen que el repaso salga el día indicado aunque se practique un poco más temprano
  const fechaRepaso = dias => Date.now() + dias * DIA - 3 * 3600e3;

  function registrarRespuesta(id, bien, elegida) {
    const p = progreso[id] ||= { n: 0, a: 0, f: 0 };
    if (bien) { p.n = Math.min(5, p.n + 1); p.a++; }
    else {
      p.n = 0; p.f++; delete p.s;
      if (elegida) (p.c ||= {})[elegida] = (p.c[elegida] || 0) + 1;
    }
    p.p = fechaRepaso(DIAS_NIVEL[p.n]);
    guardarProgreso();
  }

  function marcarSabida(id, si) {
    const p = progreso[id] ||= { n: 0, a: 0, f: 0 };
    if (si) { p.n = 4; p.s = 1; p.p = fechaRepaso(DIAS_NIVEL[4]); }
    else { p.n = 0; delete p.s; p.p = Date.now(); }
    guardarProgreso();
  }

  function barajar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function barra(hechas, total) {
    const pct = total ? Math.round(100 * hechas / total) : 0;
    return `<span class="barra-progreso" role="img" aria-label="${pct} %"><i style="width:${pct}%"></i></span>`;
  }

  function textoTip(e) {
    const t = e.r.find(x => /\bTip:/.test(x));
    return t ? t.slice(t.search(/\bTip:/) + 4).trim() : e.r[0] || '';
  }

  // En «¿A qué grupo pertenece?» los grupos de una misma familia o género cuentan como uno (u)
  const unidad = g => g.u || g.nombre;
  const sinUnidad = g => !g.cat;

  // Ámbito de práctica: 'repaso' (pendientes de hoy), 'todas', 'c-<categoría>' o 'g-<grupo>'
  function especiesDe(ambito) {
    if (ambito === 'repaso') return G.especies.filter(e => pendiente(e.id)).map(e => e.id);
    if (ambito.startsWith('s-')) return G.especies.filter(e => secDe(e) === ambito.slice(2)).map(e => e.id);
    if (ambito.startsWith('c-')) return G.especies.filter(e => e.k === ambito.slice(2)).map(e => e.id);
    if (ambito.startsWith('g-')) return grupos.get(ambito.slice(2))?.especies || [];
    return G.especies.map(e => e.id);
  }

  function nombreAmbito(ambito) {
    if (ambito === 'repaso') return 'Repaso del día';
    if (ambito.startsWith('s-')) return secciones.get(ambito.slice(2))?.nombre || '';
    if (ambito.startsWith('c-')) return categorias.get(ambito.slice(2))?.nombre || '';
    if (ambito.startsWith('g-')) return grupos.get(ambito.slice(2))?.nombre || '';
    return 'Todas las especies';
  }

  // Una ronda de 10: primero las que toca repasar, luego las nuevas (en el orden de la guía) y por último las menos sabidas
  function armarRonda(modo, ambito) {
    // Sin foto no se puede practicar: esas especies no entran en las rondas
    let ids = especiesDe(ambito).filter(id => especies.get(id).f !== 0);
    if (modo === 'grupo') return barajar(ids.filter(id => !sinUnidad(grupos.get(especies.get(id).g)))).slice(0, 10);
    const pend = ids.filter(pendiente).sort((a, b) => progreso[a].p - progreso[b].p);
    const nuevas = ids.filter(id => !progreso[id]);
    const resto = ids.filter(id => progreso[id] && !pendiente(id)).sort((a, b) => progreso[a].n - progreso[b].n);
    return barajar([...pend, ...nuevas, ...resto].slice(0, 10));
  }

  // Opciones parecidas: la especie con que más se ha confundido, las de su grupo, las de su familia y las de su categoría
  function opcionesEspecie(e) {
    const g = grupos.get(e.g);
    const confusa = Object.entries(progreso[e.id]?.c || {}).sort((a, b) => b[1] - a[1]).map(x => x[0]).filter(id => especies.has(id)).slice(0, 1);
    const familia = G.grupos.filter(o => o !== g && g.u && o.u === g.u).flatMap(o => o.especies);
    const categoria = G.especies.filter(o => o.k === e.k).map(o => o.id);
    const cand = [...confusa, ...barajar(g.especies), ...barajar(familia), ...barajar(categoria)];
    return barajar([e.id, ...[...new Set(cand)].filter(id => id !== e.id).slice(0, 3)]);
  }

  function opcionesGrupo(e) {
    const g = grupos.get(e.g);
    const validos = G.grupos.filter(o => !sinUnidad(o));
    const cand = [...barajar(validos.filter(o => o.cat === g.cat)), ...barajar(validos)].map(unidad);
    return barajar([unidad(g), ...[...new Set(cand)].filter(u => u !== unidad(g)).slice(0, 3)]);
  }

  /* ---------- navegación ---------- */
  const pila = [];
  const scrolls = {};
  history.scrollRestoration = 'manual';

  function ir(hash) { location.hash = hash; }

  function padre(ruta) {
    const p = ruta.split('/');
    if (p[1] === 'especie' && (p[3] === 'foto' || p[3] === 'mapa')) return `#/especie/${p[2]}`;
    if (p[1] === 'especie' && especies.has(p[2])) return `#/grupo/${especies.get(p[2]).g}`;
    if (p[1] === 'grupo' && grupos.get(p[2])?.cat) {
      const c = categorias.get(grupos.get(p[2]).cat);
      return catsDe(c.sec).length > 1 ? `#/cat/${c.id}` : `#/sec/${c.sec}`;
    }
    if (p[1] === 'cat' && categorias.has(p[2])) return `#/sec/${categorias.get(p[2]).sec}`;
    if (p[1] === 'comparar') return '#/aprender';
    if (p[1] === 'identificar' && p[3]) return '#/identificar/foto';
    if (p[1] === 'aprender' && p[2] === 'grupo' && grupos.get(p[3])?.cat) return `#/aprender/cat/${grupos.get(p[3]).cat}`;
    if (p[1] === 'aprender' && p[2]) return '#/aprender';
    if (p[1] === 'practica' && p[3]?.startsWith('g-')) return `#/aprender/grupo/${p[3].slice(2)}`;
    if (p[1] === 'practica' && p[3]?.startsWith('c-')) return `#/aprender/cat/${p[3].slice(2)}`;
    if (p[1] === 'practica') return '#/aprender';
    return '#/';
  }

  $atras.onclick = () => {
    if (pila.length > 1) history.back();
    else location.replace(padre(location.hash.slice(1)));
  };
  $inicio.onclick = () => ir('#/');
  $buscar.onclick = () => {
    const q = document.getElementById('q');
    if (q) { q.focus(); q.select(); window.scrollTo(0, 0); return; }
    enfocarBusqueda = true;
    ir('#/');
  };

  window.addEventListener('hashchange', e => {
    const viejo = new URL(e.oldURL).hash || '#/';
    scrolls[viejo] = window.scrollY;
    const nuevo = location.hash || '#/';
    if (pila.length > 1 && pila[pila.length - 2] === nuevo) pila.pop();
    else pila.push(nuevo);
    render();
  });

  function cabecera(titulo, subtitulo, raiz = false) {
    $titulo.textContent = titulo;
    $subtitulo.textContent = subtitulo || '';
    $subtitulo.hidden = !subtitulo;
    $atras.hidden = raiz;
    $inicio.hidden = raiz;
    $logo.hidden = !raiz;
  }

  function render() {
    urlsTemporales.forEach(u => URL.revokeObjectURL(u));
    urlsTemporales = [];
    document.querySelector('.visor')?.remove();
    document.body.style.overflow = '';
    const ruta = (location.hash || '#/').slice(1);
    const p = ruta.split('/').map(decodeURIComponent);
    let lista = true;
    if (p[1] === 'sec' && secciones.has(p[2])) vistaSeccion(secciones.get(p[2]));
    else if (p[1] === 'cat' && categorias.has(p[2])) vistaCategoria(categorias.get(p[2]));
    else if (p[1] === 'grupo' && grupos.has(p[2])) vistaGrupo(grupos.get(p[2]));
    else if (p[1] === 'especie' && especies.has(p[2])) {
      lista = false;
      vistaEspecie(especies.get(p[2]), p[3] === 'foto' ? Number(p[4]) || 0 : null, p[3] === 'mapa' ? p[4] || 'libro' : null);
    }
    else if (p[1] === 'comparar' && especies.has(p[2])) {
      lista = false;
      vistaComparar(especies.get(p[2]), p[3]);
    }
    else if (p[1] === 'aprender' && p[2] === 'cat' && categorias.has(p[3])) vistaAprenderCategoria(categorias.get(p[3]));
    else if (p[1] === 'aprender' && p[2] === 'grupo' && grupos.has(p[3])) vistaAprenderGrupo(grupos.get(p[3]));
    else if (p[1] === 'aprender') vistaAprender();
    else if (p[1] === 'practica' && (p[2] === 'especie' || p[2] === 'grupo')) {
      lista = false;
      vistaPractica(p[2], p[3] || 'todas');
    }
    else if (p[1] === 'filtro') vistaFiltro(p[2]);
    else if (p[1] === 'buscar') vistaInicio(p.slice(2).join('/'));
    else if (p[1] === 'creditos') vistaCreditos();
    else if (p[1] === 'respaldo') vistaRespaldo();
    else if (p[1] === 'contacto') vistaContacto();
    else if (p[1] === 'mordedura') vistaMordedura();
    else if (p[1] === 'identificar' && p[2] === 'pasos') vistaPasos();
    else if (p[1] === 'identificar' && p[2] === 'foto') { lista = !p[3]; vistaPorFoto(p[3]); }
    else vistaInicio('');
    if (lista) window.scrollTo(0, scrolls['#' + ruta] || 0);
  }

  /* ---------- piezas de lista ---------- */
  // Peligro para las personas (campo e.p): v = venenosa de importancia médica; l = colmillos traseros, veneno leve;
  // m = colmillos traseros con efectos a veces fuertes (guardacamino común)
  const PELIGRO = {
    v: ['peligro', 'Venenosa: peligrosa'],
    m: ['moderado', 'Veneno moderado'],
    l: ['leve', 'Veneno leve'],
    g: ['peligro', 'Peligroso: puede atacar'],   // cocodrilo grande (Muñoz Chacón y Johnston 2013)
  };

  function marcas(e) {
    const p = PELIGRO[e.p];
    return p ? `<span class="marca ${p[0]}">${p[1]}</span>` : '';
  }

  function filaEspecie(e, conGrupo = false, extra = '') {
    const propia = misFotos.get(e.id);
    const m = marcas(e);
    return `<li><button class="fila${e.p === 'v' ? ' venenosa' : ''}" data-ir="#/especie/${e.id}">
      <img src="${propia || mini(e.id)}" alt="" loading="lazy">
      <span class="fila-texto"><strong>${esc(nom(e))}</strong><span class=\"es\">${sci(e)}</span>
        ${conGrupo ? `<span>${esc(grupos.get(e.g).nombre)}</span>` : ''}
        ${m ? `<span class="marcas">${m}</span>` : ''}${extra}</span>
      ${propia ? ICONO.camara : ''}
    </button></li>`;
  }

  function filaGrupo(g) {
    return `<li><button class="fila" data-ir="#/grupo/${g.id}">
      <img src="${mini(g.especies[0])}" alt="" loading="lazy">
      <span class="fila-texto"><strong>${esc(g.nombre)}</strong><span>${esc(g.familia || paginas(g.paginas))}</span></span>
      <span class="contador">${g.especies.length}</span>
    </button></li>`;
  }

  function activarEnlaces(raiz = $vista) {
    raiz.querySelectorAll('[data-ir]').forEach(b => { b.onclick = () => ir(b.dataset.ir); });
  }

  // Cambia de vista sin llenar el historial (especie anterior o siguiente, otra especie para comparar)
  function activarReemplazos(raiz = $vista) {
    raiz.querySelectorAll('[data-reemplazar]').forEach(b => {
      b.onclick = () => {
        location.replace(b.dataset.reemplazar);
        pila[pila.length - 1] = b.dataset.reemplazar;
        window.scrollTo(0, 0);
      };
    });
  }

  /* ---------- vistas ---------- */
  function vistaInicio(consulta) {
    cabecera('Anfibios y reptiles de CR', `Guía de identificación · ${G.especies.length} especies`, true);
    const nVen = G.especies.filter(e => e.p === 'v').length;
    $vista.innerHTML = `
      <div class="buscador">${ICONO.buscar}
        <input id="q" type="search" placeholder="Buscar por nombre común o científico" autocomplete="off" value="${esc(consulta)}">
      </div>
      <div class="chips">
        <button class="chip" data-ir="#/filtro/venenosas">Serpientes venenosas<b>${nVen}</b></button>
        <button class="chip" data-ir="#/filtro/mias">Mis fotos<b>${misFotos.size}</b></button>
      </div>
      <div id="resultados"></div>`;
    const $q = document.getElementById('q');
    const $res = document.getElementById('resultados');
    const pintar = () => {
      const q = normal($q.value.trim());
      if (!q) {
        const nPend = G.especies.filter(e => pendiente(e.id)).length;
        $res.innerHTML = `<h2 class="seccion">¿Qué animal vi?</h2>
          ${botonesIdentificar('')}
          ${G.clases.map(cl => {
            const propias = G.secciones.filter(s => s.clase === cl.id);
            return `<h2 class="seccion">${esc(cl.nombre)}</h2>${propias.length
              ? `<div class="categorias">${propias.map(tarjetaSeccion).join('')}</div>`
              : `<p class="clase-pendiente">${esc(cl.pendiente || '')}</p>`}`;
          }).join('')}
          <button class="aprender-inicio" data-ir="#/aprender">${ICONO.aprender}
            <span class="fila-texto"><strong>Aprender</strong><span>${nPend ? `${nPend} especies para repasar hoy` : 'Practica con fotos y repasa cada día'}</span></span>${ICONO.der}</button>
          <button class="mordedura-inicio" data-ir="#/mordedura">${ICONO.alerta}
            <span class="fila-texto"><strong>Ante una mordedura</strong><span>Qué hacer y qué no hacer</span></span>${ICONO.der}</button>
          <ul class="lista menu-final">
            ${filaVersion()}
            ${filaTema()}
            <li><button class="fila" data-ir="#/respaldo">${ICONO.respaldo}<span class="fila-texto"><strong>Respaldo de mis fotos y progreso</strong><span>Guardar o recuperar tus fotos y tu avance</span></span></button></li>
            <li><button class="fila" data-ir="#/creditos">${ICONO.libro}<span class="fila-texto"><strong>Créditos de fotos</strong><span>Autores y licencias</span></span></button></li>
            <li><button class="fila" data-ir="#/contacto">${ICONO.correo}<span class="fila-texto"><strong>Contacto</strong><span>Sugerencias para la guía o ideas de aplicaciones</span></span></button></li>
            ${ENWEB && !INSTALADA ? `<li><button class="fila" id="btn-instalar">${ICONO.instalar}<span class="fila-texto"><strong>Instalar en esta computadora</strong><span>Como programa, con su ícono; funciona sin internet y se actualiza sola</span></span></button>
              <div class="pasos-instalar" id="pasos-instalar" hidden>
                <p>Si no aparece la ventana para instalar, hágalo desde el navegador:</p>
                <ul>
                  <li><strong>Chrome:</strong> ícono de instalar (pantalla con flecha) al final de la barra de direcciones, o menú ⋮ → Transmitir, guardar y compartir → Instalar página como aplicación.</li>
                  <li><strong>Edge:</strong> menú ⋯ → Aplicaciones → Instalar este sitio como una aplicación.</li>
                  <li>Firefox y Safari en Windows no permiten instalarla: use Chrome o Edge.</li>
                </ul>
                <p>Si la guía ya está instalada, ábrala desde el menú Inicio o el escritorio.</p>
              </div></li>` : ''}
          </ul>
          <button class="fab" data-pasos="" aria-label="¿Qué animal vi? Identificar paso a paso">${ICONO.pasos}</button>`;
      } else {
        const porNombre = [], porRasgo = [];
        for (const e of G.especies) {
          if (normal([e.es, e.sci, e.en, e.o].join(' ')).includes(q)) porNombre.push(e);
          else if (normal(e.r.join(' ')).includes(q)) porRasgo.push(e);
        }
        $res.innerHTML = !porNombre.length && !porRasgo.length
          ? '<p class="vacio">No se encontraron especies.</p>'
          : (porNombre.length ? `<h2 class="seccion">Por nombre (${porNombre.length})</h2><ul class="lista">${porNombre.map(e => filaEspecie(e, true)).join('')}</ul>` : '') +
            (porRasgo.length ? `<h2 class="seccion">En las características (${porRasgo.length})</h2><ul class="lista">${porRasgo.map(e => filaEspecie(e, true)).join('')}</ul>` : '');
      }
      activarEnlaces($res);
      activarPasos($res);
      $res.querySelectorAll('.tema-opciones button').forEach(b => {
        b.onclick = () => {
          ponerTema(b.dataset.tema);
          $res.querySelectorAll('.tema-opciones button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        };
      });
      const $version = document.getElementById('fila-version');
      if ($version) $version.onclick = tocarVersion;
      pintarVersion();
      const $instalar = document.getElementById('btn-instalar');
      if ($instalar) $instalar.onclick = async () => {
        if (!pedirInstalacion) {   // el navegador no ofreció instalar (aún no, ya instalada o no lo permite)
          const $p = document.getElementById('pasos-instalar');
          $p.hidden = !$p.hidden;
          return;
        }
        pedirInstalacion.prompt();
        if ((await pedirInstalacion.userChoice).outcome === 'accepted') pedirInstalacion = null;
      };
    };
    $q.oninput = () => {
      const v = $q.value.trim();
      history.replaceState(null, '', v ? '#/buscar/' + encodeURIComponent(v) : '#/');
      pila[pila.length - 1] = location.hash || '#/';
      pintar();
    };
    pintar();
    activarEnlaces();
    if (enfocarBusqueda) { enfocarBusqueda = false; window.scrollTo(0, 0); $q.focus(); }
  }

  // Tarjeta de una sección en el inicio (foto de una especie, nombre y número de especies)
  function tarjetaSeccion(s) {
    return `<button class="categoria" data-ir="#/sec/${s.id}">
      <img src="${mini(s.foto)}" alt="" loading="lazy">
      <span class="cat-texto"><strong>${esc(s.nombre)}</strong><span>${s.n} especies</span></span>
    </button>`;
  }

  // «Paso a paso» y «Por foto»; desde una sección, el paso a paso empieza ya con el tipo de animal respondido
  function botonesIdentificar(sec) {
    return `<div class="identificar-inicio">
      <button class="btn" data-pasos="${sec}">${ICONO.pasos}Paso a paso</button>
      <button class="btn sec" data-ir="#/identificar/foto">${ICONO.camara.replace('icono-camara', '')}Por foto</button>
    </div>`;
  }
  function activarPasos(raiz = $vista) {
    raiz.querySelectorAll('[data-pasos]').forEach(b => {
      b.onclick = () => {
        for (const k in pasos) delete pasos[k];
        if (b.dataset.pasos) pasos.tipo = b.dataset.pasos;
        ir('#/identificar/pasos');
      };
    });
  }

  /* Sección (Serpientes, Lagartijas, Tortugas, Cocodrilos): sus categorías. En Serpientes está todo lo de la guía de
     serpientes: filtros Venenosas y Parecen coral, ¿Qué serpiente vi?, las 9 categorías y Ante una mordedura. */
  function vistaSeccion(s) {
    cabecera(s.nombre, `${s.n} especies`);
    const cats = catsDe(s.id);
    const cuadros = `<div class="categorias">${cats.map(c => `
          <button class="categoria" data-ir="#/cat/${c.id}">
            <img src="${mini(c.foto)}" alt="" loading="lazy">
            <span class="cat-texto"><strong>${esc(c.nombre)}</strong><span>${c.n} especies</span></span>
          </button>`).join('')}</div>`;
    if (s.id === 'serpientes') {
      const nVen = G.especies.filter(e => e.p === 'v').length;
      const nCoral = G.especies.filter(e => e.pc).length;
      $vista.innerHTML = `
        <div class="chips">
          <button class="chip" data-ir="#/filtro/venenosas">Venenosas<b>${nVen}</b></button>
          <button class="chip" data-ir="#/filtro/coral">Parecen coral<b>${nCoral}</b></button>
        </div>
        <h2 class="seccion">¿Qué serpiente vi?</h2>
        ${botonesIdentificar('serpientes')}
        <h2 class="seccion">¿Qué tipo de serpiente es?</h2>${cuadros}
        <button class="mordedura-inicio" data-ir="#/mordedura">${ICONO.alerta}
          <span class="fila-texto"><strong>Ante una mordedura</strong><span>Qué hacer y qué no hacer</span></span>${ICONO.der}</button>`;
    } else {
      // Con una sola categoría se muestran directamente sus grupos
      $vista.innerHTML = `
        <p class="nota">${esc(s.detalle)}.</p>
        <h2 class="seccion">${esc(s.pregunta || '¿Qué animal vi?')}</h2>
        ${botonesIdentificar(s.id)}
        ${cats.length > 1 ? `<h2 class="seccion">Tipos</h2>${cuadros}`
          : `<h2 class="seccion">Grupos</h2><ul class="lista">${gruposAlfa.filter(g => g.cat === cats[0]?.id).map(filaGrupo).join('')}</ul>`}`;
    }
    activarEnlaces();
    activarPasos();
  }

  function vistaCategoria(c) {
    cabecera(c.nombre, `${c.n} especies`);
    const propios = gruposAlfa.filter(g => g.cat === c.id);
    $vista.innerHTML = `
      <p class="nota">${esc(c.detalle)}.</p>
      <ul class="lista">${propios.map(filaGrupo).join('')}</ul>`;
    activarEnlaces();
  }

  function vistaGrupo(g) {
    cabecera(g.nombre, [g.familia, paginas(g.paginas)].filter(Boolean).join(' · '));
    const lista = g.especies.map(id => especies.get(id));
    // Tarjeta de la familia, cerrada: a la vista solo el nombre de la familia; al tocarla se abren las características
    const s = g.sobre;
    let fam = '', resto = '';
    if (s) {
      const corte = s.f.indexOf('. ');
      fam = (corte > 0 ? s.f.slice(0, corte) : s.f).replace(/\.$/, '');
      resto = corte > 0 ? s.f.slice(corte + 2) : '';
    }
    const [famNombre, famComun] = fam.includes(': ') ? fam.split(': ') : [fam, ''];
    $vista.innerHTML = `
      ${s ? `<details class="sobre">
        <summary>
          <span class="sobre-fam"><small>Familia</small><strong>${esc(famNombre)}</strong>${famComun ? `<span>${esc(famComun)}</span>` : ''}</span>
          <span class="sobre-mas"><span class="abrir">Mostrar información</span><span class="cerrar">Ocultar información</span>${ICONO.der}</span>
        </summary>
        ${resto ? `<p class="sobre-resto">${esc(resto)}</p>` : ''}
        <h3>Qué tienen en común las especies de la familia</h3><p>${esc(s.rf)}</p>
        <h3>Qué une a este grupo</h3><p>${esc(s.rg)}</p>
      </details>` : ''}
      ${g.nota ? `<p class="nota">${esc(g.nota)}</p>` : ''}
      <ul class="lista">${lista.map(e => filaEspecie(e)).join('')}</ul>`;
    activarEnlaces();
  }

  function vistaFiltro(tipo) {
    const coral = e => (e.p === 'v' ? 0 : 1);
    const def = {
      venenosas: ['Venenosas', 'De importancia médica: víboras, corales y serpiente marina', e => e.p === 'v'],
      coral: ['Parecen coral', 'Corales verdaderas y falsas corales', e => e.pc],
      mias: ['Mis fotos', 'Especies con fotos personales', e => misFotos.has(e.id)],
    }[tipo] || ['Especies', '', () => true];
    cabecera(def[0], def[1]);
    const lista = G.especies.filter(def[2]);
    if (tipo === 'coral') lista.sort((a, b) => coral(a) - coral(b));
    const nota = {
      venenosas: 'Todas pueden causar un envenenamiento grave. Ante una mordedura, ve de inmediato a un centro de salud (ver «Ante una mordedura» en el inicio).',
      coral: 'Muchas culebras imitan los anillos rojos, negros y amarillos o blancos de las corales verdaderas, y algunas se parecen tanto que solo se separan por detalles de las escamas de la cabeza. Trata toda serpiente con anillos de colores como si fuera venenosa y no la manipules. Primero salen las corales verdaderas (con la marca roja).',
    }[tipo];
    $vista.innerHTML = lista.length
      ? `${nota ? `<p class="nota">${esc(nota)}</p>` : ''}<ul class="lista">${lista.map(e => filaEspecie(e, true)).join('')}</ul>`
      : `<p class="vacio">${tipo === 'mias' ? 'Todavía no has agregado fotos personales. Abre la ficha de una especie y toca «Tomar foto» o «Elegir de galería».' : 'No hay especies.'}</p>`;
    activarEnlaces();
  }

  function rasgoHTML(titulo, texto) {
    const i = texto.search(/\bTip:/);
    const base = i >= 0 ? texto.slice(0, i).trim() : texto;
    const tip = i >= 0 ? texto.slice(i + 4).trim() : '';
    return `<div class="rasgo"><h3>${esc(titulo)}</h3>
      ${base ? `<p>${esc(base)}</p>` : ''}
      ${tip ? `<span class="tip"><b>Tip:</b> ${esc(tip)}</span>` : ''}</div>`;
  }

  // Recuadro "En Costa Rica": abundancia, actividad, hábitat, altura y distribución (Solórzano 2022), y el mapa
  function estatusHTML(z, mapa = '') {
    if (!z) return mapa ? `<section class="en-cr"><h3>En Costa Rica</h3>${mapa}</section>` : '';
    const dato = (t, v) => v ? `<div class="dato"><dt>${t}</dt><dd>${esc(v)}</dd></div>` : '';
    return `<section class="en-cr">
      <h3>En Costa Rica</h3>
      <dl class="datos">
        ${dato('Abundancia', z.a)}${dato('Actividad', z.ac)}${dato('Dónde vive', z.h)}${dato('Altura', z.al)}
      </dl>
      ${z.d ? `<p class="que-hace">${esc(z.d)}</p>` : ''}
      ${mapa}
    </section>`;
  }

  // Tarjeta cerrada "Más sobre la especie": tamaño, alimentación, reproducción y defensa (Solórzano 2022)
  function complementoHTML(e) {
    const { h, t } = e;
    if (!h?.length && !t) return '';
    return `<details class="sobre mas-id">
      <summary>
        <span class="sobre-fam"><strong>Más sobre la especie</strong>${t ? `<span>${esc(t)}</span>` : ''}</span>
        <span class="sobre-mas"><span class="abrir">Mostrar</span><span class="cerrar">Ocultar</span>${ICONO.der}</span>
      </summary>
      ${h?.length ? `<ul>${h.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <p class="fuente">${fuente(e).cita}</p>
    </details>`;
  }

  /* ---------- Mapa de distribución (dibujo propio sobre datos/mapa.js) ----------
     «Libro»: zonas y alturas resumidas de la distribución que da Solórzano (2022), campo e.mp.
     «Registros GBIF»: celdas de unos 5 km con al menos un registro publicado en GBIF (museos, iNaturalist y
     otras colecciones), campo e.gb. */
  const MAPA = window.MAPA;
  const COLOR_LIBRO = [126, 87, 194];
  const COLOR_GBIF = [216, 110, 30];
  const SAN_JOSE = [-84.08, 9.93];
  let baseMapa = null;

  const bytes64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  function prepararBase() {
    if (baseMapa) return baseMapa;
    const b = MAPA.base, W = b.ancho, H = b.alto;
    const elev = bytes64(b.elev), zona = bytes64(b.zona);
    // Distancia a tierra (en celdas de ~1 km), para separar el mar cercano de alta mar
    const dist = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) dist[i] = (zona[i] & 7) >= 5 ? 1e6 : 0;
    const paso = (i, j, di, dj, c) => {
      const a = i + di, bb = j + dj;
      if (a >= 0 && a < H && bb >= 0 && bb < W) dist[i * W + j] = Math.min(dist[i * W + j], dist[a * W + bb] + c);
    };
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) { paso(i, j, -1, 0, 1); paso(i, j, 0, -1, 1); paso(i, j, -1, -1, 1.41); paso(i, j, -1, 1, 1.41); }
    for (let i = H - 1; i >= 0; i--) for (let j = W - 1; j >= 0; j--) { paso(i, j, 1, 0, 1); paso(i, j, 0, 1, 1); paso(i, j, 1, 1, 1.41); paso(i, j, 1, -1, 1.41); }
    // Sombra del relieve, con luz del noroeste
    const sombra = new Float32Array(W * H);
    for (let i = 1; i < H - 1; i++) for (let j = 1; j < W - 1; j++) {
      const k = i * W + j;
      const dx = (elev[k + 1] - elev[k - 1]) * 20, dy = (elev[k + W] - elev[k - W]) * 20;
      sombra[k] = Math.max(-1, Math.min(1, (dx + dy) / 900));
    }
    baseMapa = { W, H, elev, zona, dist, sombra };
    return baseMapa;
  }

  // "pac,car_n 0-1500; vc 1000-2000" -> capas con zonas (unión de intersecciones) y altura mínima y máxima
  function capasMapa(spec) {
    return spec.split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const [zonas, alt = '-'] = s.split(/\s+/);
      const [min, max] = alt.split('-');
      return { z: zonas.split(',').map(u => u.split('+')), min: min ? +min : -1, max: max ? +max : 1e6 };
    });
  }

  function enZona(tok, z, lon, lat, d) {
    const r = z & 7, tierra = r >= 1 && r <= 4, car = r === 1 || r === 2, pac = r === 3 || r === 4;
    switch (tok) {
      case 'todo': return tierra;
      case 'car': return car;
      case 'car_n': return r === 1;
      case 'car_s': return r === 2;
      case 'pac': return pac;
      case 'pac_n': return r === 3;
      case 'pac_s': return r === 4;
      case 'pac_c': return pac && lat > 9.2 && lat < 9.95 && lon > -84.8;   // Pacífico central
      case 'pac_ss': return pac && lat < 9.35;                               // Pacífico sur (de Dominical al sur)
      case 'zn': return car && lat > 10.2 && lon < -83.85;                   // Zona Norte (llanuras de San Carlos y Sarapiquí)
      case 'nw': return r === 3 && lon < -84.75;                             // tierras bajas del noroeste
      case 'vc': return (z & 64) > 0;                                         // Valle Central
      case 'nor': return tierra && !(z & 128);                                // cordilleras del norte
      case 'cen': return tierra && !(z & 128) && lon > -84.45;                // Cordillera Central
      case 'tal': return tierra && (z & 128) > 0;                             // Talamanca
      case 'costa': return tierra ? (z & 8) > 0 : d <= 9;
      case 'costa_pac': return pac && (z & 8) > 0;
      case 'costa_car': return car && (z & 8) > 0;
      case 'nic': return (z & 16) > 0;
      case 'osa': return (z & 32) > 0;
      case 'mar_pac': return r === 6;
      case 'mar_car': return r === 5;
      case 'mar_pac_costa': return r === 6 && d <= 20;                       // mar del Pacífico a menos de unos 20 km de la costa
    }
    if (tok[0] === '@') {   // punto con radio en km: @lon:lat:km
      const [lo, la, km] = tok.slice(1).split(':').map(Number);
      return (tierra || r >= 5) && Math.hypot((lon - lo) * 109.7, (lat - la) * 110.6) <= km;
    }
    return false;
  }

  function enCapas(capas, z, elev, lon, lat, d) {
    const tierra = (z & 7) >= 1 && (z & 7) <= 4;
    return capas.some(c => !(tierra && (elev < c.min || elev > c.max)) &&
      c.z.some(inter => inter.every(tok => enZona(tok, z, lon, lat, d))));
  }

  const bit = (bits, k) => (bits[k >> 3] >> (7 - (k & 7))) & 1;

  // Dibuja el mapa en un canvas de `ancho` px (CSS); en la vista grande se usa un ancho mayor
  function dibujarMapa(canvas, e, modo, ancho) {
    const B = prepararBase(), b = MAPA.base, rg = MAPA.gbif;
    const capas = modo === 'libro' && e.mp ? capasMapa(e.mp) : [];
    const bits = modo === 'gbif' && e.gb ? bytes64(e.gb[0]) : null;
    const img = new ImageData(B.W, B.H);
    for (let i = 0; i < B.H; i++) {
      const lat = b.lat0 - (i + 0.5) * b.paso;
      for (let j = 0; j < B.W; j++) {
        const k = i * B.W + j, z = B.zona[k], r = z & 7, lon = b.lon0 + (j + 0.5) * b.paso;
        let col;
        if (r >= 5) col = [207, 224, 234];
        else if (r === 0) col = [226, 224, 218];
        else { const s = 244 - B.sombra[k] * 26; col = [s, s - 2, s - 8]; }
        let capa = null;
        if (capas.length) { if (enCapas(capas, z, B.elev[k] * 20, lon, lat, B.dist[k])) capa = COLOR_LIBRO; }
        else if (bits) {
          // Solo se pinta la tierra, salvo en la serpiente marina (e.mar)
          const ii = Math.floor((rg.lat0 - lat) / rg.paso), jj = Math.floor((lon - rg.lon0) / rg.paso);
          if (ii >= 0 && ii < rg.alto && jj >= 0 && jj < rg.ancho && bit(bits, ii * rg.ancho + jj) && (r >= 1 || e.mar)) capa = COLOR_GBIF;
        }
        if (capa) col = col.map((v, n) => Math.round(v * 0.22 + capa[n] * 0.78));
        img.data.set([col[0], col[1], col[2], 255], k * 4);
      }
    }
    const fuera = document.createElement('canvas');
    fuera.width = B.W; fuera.height = B.H;
    fuera.getContext('2d').putImageData(img, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    const esc = ancho / B.W, alto = B.H * esc;
    canvas.width = Math.round(ancho * dpr); canvas.height = Math.round(alto * dpr);
    canvas.style.aspectRatio = `${B.W} / ${B.H}`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr * esc, 0, 0, dpr * esc, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fuera, 0, 0);
    const x = lon => (lon - b.lon0) / b.paso, y = lat => (b.lat0 - lat) / b.paso;

    // Contornos: países vecinos suaves y Costa Rica más marcado
    for (const [iso, color, grosor] of [['NIC', '#a9a69d', 0.6], ['PAN', '#a9a69d', 0.6], ['CRI', '#5f625c', 0.9]]) {
      ctx.beginPath();
      for (const anillo of b.contornos[iso]) anillo.forEach(([lo, la], n) => n ? ctx.lineTo(x(lo), y(la)) : ctx.moveTo(x(lo), y(la)));
      ctx.strokeStyle = color; ctx.lineWidth = grosor / Math.min(1.6, esc) ; ctx.lineJoin = 'round'; ctx.stroke();
    }
    // San José como referencia
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x(SAN_JOSE[0]), y(SAN_JOSE[1]), 2.4, 0, 7); ctx.fill();
  }

  // Los dos botones salen siempre; si una fuente no tiene mapa de la especie, se explica por qué
  const hayMapa = (e, modo) => modo === 'libro' ? !!e.mp : !!e.gb;

  function mapaHTML(e) {
    if (!MAPA) return '';
    const inicial = e.mp || !e.gb ? 'libro' : 'gbif';
    return `<div class="mapa" id="mapa">
      <div class="mapa-modo" role="group" aria-label="Fuente del mapa">${[['libro', fuente(e).mapa], ['gbif', 'Registros GBIF']].map(([m, t]) =>
        `<button data-modo="${m}" aria-pressed="${m === inicial}">${t}</button>`).join('')}</div>
      <canvas id="mapa-lienzo" role="img" aria-label="Mapa de Costa Rica con la distribución de la especie"></canvas>
      <div class="mapa-leyenda" id="mapa-leyenda"></div>
    </div>`;
  }

  function leyendaMapa(e, modo) {
    if (!hayMapa(e, modo)) {
      const texto = modo === 'libro'
        ? (e.mpn || fuente(e).sinMapa)
        : (e.gbn || 'No hay registros con coordenadas de esta especie en Costa Rica publicados en GBIF.');
      const cita = modo === 'libro' ? fuente(e).cita : 'GBIF.org';
      return `<p class="sin-mapa">${esc(texto)}</p><p class="fuente">${cita}.</p>`;
    }
    if (modo === 'gbif') {
      const fecha = MAPA.gbif.fecha ? MAPA.gbif.fecha.split('-').reverse().join('/') : '';
      return `<p><i class="muestra" style="background:rgb(${COLOR_GBIF})"></i>Con al menos un registro (celdas de unos 5 km)</p>
        ${e.gbn ? `<p class="sin-mapa">${esc(e.gbn)}</p>` : ''}
        <p class="fuente">${e.gb[1].toLocaleString('es-CR')} registros en Costa Rica (museos, iNaturalist y otras colecciones), vía GBIF.org. Consultado el ${fecha}. ● San José</p>`;
    }
    return `<p><i class="muestra" style="background:rgb(${COLOR_LIBRO})"></i>Zona donde se espera, según ${e.fu ? 'la guía' : 'el libro'}</p>
      <p class="fuente">Zonas y alturas según ${fuente(e).cita}. Dibujo propio, aproximado. ● San José</p>`;
  }

  function activarMapa(e) {
    const caja = document.getElementById('mapa');
    if (!caja) return;
    const lienzo = document.getElementById('mapa-lienzo');
    let modo = caja.querySelector('[aria-pressed="true"]').dataset.modo;
    const pintar = () => {
      lienzo.hidden = !hayMapa(e, modo);
      if (!lienzo.hidden) dibujarMapa(lienzo, e, modo, lienzo.clientWidth || caja.clientWidth);
      document.getElementById('mapa-leyenda').innerHTML = leyendaMapa(e, modo);
    };
    caja.querySelectorAll('[data-modo]').forEach(bt => {
      bt.onclick = () => {
        modo = bt.dataset.modo;
        caja.querySelectorAll('[data-modo]').forEach(o => o.setAttribute('aria-pressed', String(o === bt)));
        pintar();
      };
    });
    lienzo.onclick = () => ir(`#/especie/${e.id}/mapa/${modo}`);
    pintar();
  }

  // Vista grande del mapa: se dibuja más ancho y se abre en el visor con zoom
  function visorMapa(e, modo) {
    const c = document.createElement('canvas');
    dibujarMapa(c, e, modo, 1100 / (window.devicePixelRatio || 1));
    visor([c.toDataURL('image/png')], 0);
  }

  async function vistaEspecie(e, fotoVisor, mapaVisor) {
    const g = grupos.get(e.g);
    cabecera(nom(e), g.nombre);
    const propias = ordenar(await BD.deEspecie(e.id));
    if (location.hash.split('/')[2] !== encodeURIComponent(e.id) && location.hash.split('/')[2] !== e.id) return;
    const fotos = propias.length ? propias.map(r => urlBlob(r.foto)) : fotosGuia(e);
    let n = Math.min(fotoVisor ?? 0, fotos.length - 1);

    const idx = g.especies.indexOf(e.id);
    const ant = especies.get(g.especies[idx - 1]);
    const sig = especies.get(g.especies[idx + 1]);
    const titulos = g.columnas;
    const m = marcas(e);

    $vista.innerHTML = `
      <div class="ficha-foto" id="ficha-foto">
        <img id="img-ficha" src="${fotos[n]}" alt="${esc(nom(e))}">
        ${fotos.length > 1 ? `<button class="flecha-foto izq" id="f-ant" aria-label="Foto anterior">${ICONO.izq}</button>
          <button class="flecha-foto der" id="f-sig" aria-label="Foto siguiente">${ICONO.der}</button>
          <div class="puntos">${fotos.map((_, i) => `<i${i === n ? ' class="activo"' : ''}></i>`).join('')}</div>` : ''}
        <button class="lupa" id="btn-lupa" aria-label="Ampliar foto">${ICONO.lupa}</button>
      </div>
      <div class="ficha-nombres">
        <h2>${esc(nom(e))}</h2>${e.es ? `<p>${sci(e)}</p>` : ''}${e.o ? `<p class="otros">También: ${esc(e.o)}</p>` : ''}${e.nl ? `<p class="otros">${fuente(e).nl}: <i>${esc(e.nl)}</i></p>` : ''}
        ${m ? `<div class="marcas" style="margin-top:8px">${m}</div>` : ''}
      </div>
      ${e.f === 0 ? '<p class="nota">No se encontró una foto con licencia libre de esta especie. Puedes poner la tuya en «Mis fotos».</p>' : ''}
      <div class="rasgos">${e.r.map((t, i) => t ? rasgoHTML(titulos[i] || `Característica ${i + 1}`, t) : '').join('')}</div>
      ${estatusHTML(e.z, mapaHTML(e))}
      ${complementoHTML(e)}
      <p class="dato-pag">${fuente(e).cita}${e.pg ? `, ${paginas(e.pg)}` : ''}</p>

      <section class="mis-fotos">
        <h3>Mis fotos${propias.length ? ` (${propias.length})` : ''}</h3>
        <div class="botones">
          <button class="btn" id="btn-camara">${ICONO.camara.replace('icono-camara', '')}Tomar foto</button>
          <button class="btn sec" id="btn-galeria">${ICONO.galeria}Elegir de galería</button>
        </div>
        ${propias.length ? `<div class="miniaturas">${propias.map((r, i) => `
            <div class="mini${r.principal ? ' principal' : ''}">
              <img src="${urlBlob(r.mini)}" alt="Foto personal ${i + 1}" data-n="${i}">
              <div class="mini-acciones">
                <button data-principal="${r.id}" aria-label="Usar como principal" title="Usar como principal">${ICONO.estrella}</button>
                <button data-borrar="${r.id}" aria-label="Eliminar foto" title="Eliminar foto">${ICONO.basura}</button>
              </div>
            </div>`).join('')}</div>
          <div class="botones" style="margin-top:12px">
            <button class="btn peligro" id="btn-restaurar">${ICONO.restaurar}Restaurar foto original</button>
          </div>` : ''}
      </section>

      <nav class="nav-especies">
        ${ant ? `<button class="btn sec" data-reemplazar="#/especie/${ant.id}">${ICONO.izq}<span>${esc(nom(ant))}</span></button>` : '<span style="flex:1"></span>'}
        ${sig ? `<button class="btn sec" data-reemplazar="#/especie/${sig.id}"><span>${esc(nom(sig))}</span>${ICONO.der}</button>` : '<span style="flex:1"></span>'}
      </nav>`;

    // Pasar de una foto a otra
    const $img = document.getElementById('img-ficha');
    const mostrar = i => {
      n = (i + fotos.length) % fotos.length;
      $img.src = fotos[n];
      $vista.querySelectorAll('.puntos i').forEach((p, k) => p.classList.toggle('activo', k === n));
    };
    if (fotos.length > 1) {
      document.getElementById('f-ant').onclick = () => mostrar(n - 1);
      document.getElementById('f-sig').onclick = () => mostrar(n + 1);
      let x0 = null;
      const zona = document.getElementById('ficha-foto');
      zona.addEventListener('pointerdown', ev => { x0 = ev.clientX; });
      zona.addEventListener('pointerup', ev => {
        if (x0 !== null && Math.abs(ev.clientX - x0) > 50) mostrar(n + (ev.clientX < x0 ? 1 : -1));
        x0 = null;
      });
    }
    const abrirVisor = () => ir(`#/especie/${e.id}/foto/${n}`);
    document.getElementById('btn-lupa').onclick = abrirVisor;
    $img.onclick = abrirVisor;
    $vista.querySelectorAll('.mini img').forEach(im => { im.onclick = () => { mostrar(Number(im.dataset.n)); window.scrollTo({ top: 0, behavior: 'smooth' }); }; });

    activarReemplazos();
    activarMapa(e);

    // Fotos personales
    const elegir = input => {
      input.value = '';
      input.onchange = () => agregarFotos(e.id, [...input.files]);
      input.click();
    };
    document.getElementById('btn-camara').onclick = () => elegir(document.getElementById('in-camara'));
    document.getElementById('btn-galeria').onclick = () => elegir(document.getElementById('in-galeria'));
    $vista.querySelectorAll('[data-principal]').forEach(b => {
      b.onclick = async () => {
        const id = Number(b.dataset.principal);
        for (const r of propias) await BD.guardar({ ...r, principal: r.id === id });
        await cargarMisFotos();
        aviso('Foto principal cambiada');
        render();
      };
    });
    $vista.querySelectorAll('[data-borrar]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('¿Eliminar esta foto personal?')) return;
        const id = Number(b.dataset.borrar);
        await BD.borrar(id);
        const resto = propias.filter(r => r.id !== id);
        if (resto.length && !resto.some(r => r.principal)) await BD.guardar({ ...resto[0], principal: true });
        await cargarMisFotos();
        aviso('Foto eliminada');
        render();
      };
    });
    const $rest = document.getElementById('btn-restaurar');
    if ($rest) $rest.onclick = async () => {
      if (!confirm('Se eliminarán tus fotos de esta especie y volverá la foto original. ¿Continuar?')) return;
      for (const r of propias) await BD.borrar(r.id);
      await cargarMisFotos();
      aviso('Foto original restaurada');
      render();
    };

    if (fotoVisor !== null) visor(fotos, n);
    else if (mapaVisor && hayMapa(e, mapaVisor)) visorMapa(e, mapaVisor);
    else window.scrollTo(0, 0);
  }

  /* Visor a pantalla completa con zoom (pellizco, doble toque o rueda) */
  function visor(fotos, n) {
    document.body.style.overflow = 'hidden';
    const v = document.createElement('div');
    v.className = 'visor';
    v.innerHTML = `<button class="cerrar" aria-label="Cerrar">${ICONO.cerrar}</button><img alt="" draggable="false">`;
    document.body.appendChild(v);
    const img = v.querySelector('img');
    img.src = fotos[n];
    v.querySelector('.cerrar').onclick = () => $atras.onclick();

    let esc = 1, tx = 0, ty = 0;
    const aplicar = () => { img.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${esc})`; };
    const limitar = () => {
      esc = Math.min(6, Math.max(1, esc));
      if (esc === 1) { tx = 0; ty = 0; }
      const mx = (img.offsetWidth * esc - v.clientWidth) / 2, my = (img.offsetHeight * esc - v.clientHeight) / 2;
      tx = Math.max(-Math.max(0, mx), Math.min(Math.max(0, mx), tx));
      ty = Math.max(-Math.max(0, my), Math.min(Math.max(0, my), ty));
    };
    aplicar();

    const punteros = new Map();
    let dist0 = 0, esc0 = 1, ultimoToque = 0, x0 = 0, movido = false;
    v.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.cerrar')) return;
      v.setPointerCapture(ev.pointerId);
      punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (punteros.size === 2) {
        const [a, b] = [...punteros.values()];
        dist0 = Math.hypot(a.x - b.x, a.y - b.y); esc0 = esc;
      } else { x0 = ev.clientX; movido = false; }
    });
    v.addEventListener('pointermove', ev => {
      const prev = punteros.get(ev.pointerId);
      if (!prev) return;
      punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (punteros.size === 2) {
        const [a, b] = [...punteros.values()];
        esc = esc0 * Math.hypot(a.x - b.x, a.y - b.y) / dist0;
      } else if (esc > 1) {
        tx += ev.clientX - prev.x; ty += ev.clientY - prev.y;
      }
      if (Math.abs(ev.clientX - x0) > 8) movido = true;
      limitar(); aplicar();
    });
    const soltar = ev => {
      if (!punteros.has(ev.pointerId)) return;
      punteros.delete(ev.pointerId);
      if (punteros.size) return;
      const ahora = Date.now();
      if (!movido && ahora - ultimoToque < 300) {
        esc = esc > 1 ? 1 : 2.5; tx = 0; ty = 0; limitar(); aplicar(); ultimoToque = 0; return;
      }
      if (!movido) ultimoToque = ahora;
      if (esc === 1 && fotos.length > 1 && Math.abs(ev.clientX - x0) > 60) {
        n = (n + (ev.clientX < x0 ? 1 : -1) + fotos.length) % fotos.length;
        img.src = fotos[n];
      }
    };
    v.addEventListener('pointerup', soltar);
    v.addEventListener('pointercancel', soltar);
    v.addEventListener('wheel', ev => { ev.preventDefault(); esc *= ev.deltaY < 0 ? 1.15 : 1 / 1.15; limitar(); aplicar(); }, { passive: false });
  }

  /* ---------- Aprender: todo el aprendizaje vive aquí; la guía queda solo para identificar ---------- */
  function estadoEspecie(id) {
    const p = progreso[id];
    if (!p) return 'Nueva';
    const dias = Math.ceil((p.p - Date.now()) / DIA);
    const cuando = dias <= 0 ? 'repaso hoy' : dias === 1 ? 'repaso mañana' : `repaso en ${dias} días`;
    return `${dominada(id) ? 'Dominada' : `Nivel ${p.n} de 5`} · ${cuando}`;
  }

  // Pares de especies que más se han confundido en los ejercicios
  function confusiones() {
    const pares = new Map();
    for (const [id, p] of Object.entries(progreso)) {
      for (const [otra, n] of Object.entries(p.c || {})) {
        if (!especies.has(id) || !especies.has(otra)) continue;
        const clave = [id, otra].sort().join('|');
        const par = pares.get(clave) || { a: id, b: otra, n: 0 };
        par.n += n;
        pares.set(clave, par);
      }
    }
    return [...pares.values()].sort((x, y) => y.n - x.n);
  }

  function filaCategoriaAprender(c) {
    const ids = G.especies.filter(e => e.k === c.id).map(e => e.id);
    const dom = nDominadas(ids);
    return `<li><button class="fila" data-ir="#/aprender/cat/${c.id}">
      <img src="${mini(c.foto)}" alt="" loading="lazy">
      <span class="fila-texto"><strong>${esc(c.nombre)}</strong>${barra(dom, ids.length)}<span>Dominas ${dom} de ${ids.length}</span></span>
      ${ICONO.der}
    </button></li>`;
  }

  function vistaAprender() {
    cabecera('Aprender', 'Practica con fotos y repasa cada día');
    const todas = G.especies.map(e => e.id);
    const nPend = todas.filter(pendiente).length;
    const nDom = nDominadas(todas);
    const nEmp = todas.filter(id => progreso[id]).length;
    const pares = confusiones().slice(0, 8);
    const metodo = `
      <details class="sobre"${nEmp ? '' : ' open'}>
        <summary><span class="sobre-fam"><strong>Cómo aprender con esta app</strong></span>
          <span class="sobre-mas"><span class="abrir">Mostrar</span><span class="cerrar">Ocultar</span>${ICONO.der}</span></summary>
        <ol class="pasos">
          <li><b>Elige un grupo pequeño.</b> En «Practicar», entra a una categoría y luego a un grupo. Antes de practicar, toca «Estudiar en la guía» para leer qué une a sus especies y ver las fichas, sobre todo los «Tip».</li>
          <li><b>Practica ese grupo.</b> La app te muestra una foto y te pregunta entre especies parecidas, para que aprendas a distinguirlas.</li>
          <li><b>Compara las que confundes.</b> Cuando fallas, toca «Comparar las dos»; las parejas que más confundes quedan en «Mis confusiones».</li>
          <li><b>Repasa cada día.</b> Las especies que fallas vuelven al día siguiente; las que aciertas vuelven cada vez más espaciadas (a los 3, 7, 14 y 30 días). Así quedan en la memoria a largo plazo.</li>
        </ol>
        <p>Una especie cuenta como dominada cuando la aciertas tres veces seguidas en tus repasos, o cuando la marcas con ✓ («Ya me la sé») en la lista de su grupo.</p>
      </details>`;
    $vista.innerHTML = `
      ${nEmp ? '' : metodo}
      <div class="tarjeta-repaso">
        <span class="fila-texto"><strong>Repaso del día</strong>
          <span>${nPend ? `${nPend} ${nPend === 1 ? 'especie pendiente' : 'especies pendientes'}` : nEmp ? 'Ya repasaste todo lo de hoy' : 'Empieza practicando un grupo'}</span></span>
        <button class="btn" data-ir="#/practica/especie/repaso"${nPend ? '' : ' disabled'}>Repasar</button>
      </div>
      <p class="estado-repaso">${barra(nDom, todas.length)}<span>Dominas ${nDom} de ${todas.length} especies · ${nEmp} empezadas</span></p>

      <h2 class="seccion">Practicar y ver tu progreso</h2>
      <p class="ayuda">Elige una categoría y después un grupo. Ahí ves cómo vas con cada especie.</p>
      ${G.secciones.map(s => `<h3 class="sub-seccion">${esc(s.nombre)}</h3>
        <ul class="lista">${catsDe(s.id).map(filaCategoriaAprender).join('')}</ul>`).join('')}

      <h2 class="seccion">¿A qué grupo pertenece?</h2>
      <p class="ayuda">Antes de aprender cada especie, aprende a reconocer el grupo por su forma y su comportamiento: así sabrás dónde buscarla en la guía.</p>
      <div class="chips envolver">
        <button class="chip" data-ir="#/practica/grupo/todas">Todas las especies</button>
        ${G.secciones.map(s => `<button class="chip" data-ir="#/practica/grupo/s-${s.id}">${esc(s.nombre)}</button>`).join('')}
        ${G.categorias.map(c => `<button class="chip" data-ir="#/practica/grupo/c-${c.id}">${esc(c.nombre)}</button>`).join('')}
      </div>

      ${pares.length ? `<h2 class="seccion">Mis confusiones</h2>
        <p class="ayuda">Las parejas de especies que más has confundido. Tócalas para compararlas.</p>
        <ul class="lista">${pares.map(par => {
          const a = especies.get(par.a), b = especies.get(par.b);
          return `<li><button class="fila par" data-ir="#/comparar/${a.id}/${b.id}">
            <img src="${mini(a.id)}" alt="" loading="lazy"><img src="${mini(b.id)}" alt="" loading="lazy">
            <span class="fila-texto"><strong>${esc(nom(a))} y ${esc(nom(b))}</strong><span>${par.n} ${par.n === 1 ? 'vez' : 'veces'}</span></span>
            ${ICONO.comparar}
          </button></li>`;
        }).join('')}</ul>` : ''}

      ${nEmp ? metodo : ''}`;
    activarEnlaces();
  }

  function vistaAprenderCategoria(c) {
    const ids = G.especies.filter(e => e.k === c.id).map(e => e.id);
    const dom = nDominadas(ids);
    cabecera(c.nombre, 'Aprender');
    const rara = g => g.nombre.startsWith('Especies raras');
    const propios = gruposAlfa.filter(g => g.cat === c.id).sort((a, b) => rara(a) - rara(b));
    $vista.innerHTML = `
      <div class="practicar">
        <p>${barra(dom, ids.length)}<span>Dominas ${dom} de ${ids.length} especies</span></p>
        <div class="botones">
          <button class="btn" data-ir="#/practica/especie/c-${c.id}">${ICONO.aprender}Practicar toda la categoría</button>
          <button class="btn sec" data-ir="#/practica/grupo/c-${c.id}">¿A qué grupo pertenece?</button>
        </div>
      </div>
      <h2 class="seccion">Grupos</h2>
      <ul class="lista">${propios.map(g => {
        const d = nDominadas(g.especies);
        return `<li><button class="fila" data-ir="#/aprender/grupo/${g.id}">
          <img src="${mini(g.especies[0])}" alt="" loading="lazy">
          <span class="fila-texto"><strong>${esc(g.nombre)}</strong>${barra(d, g.especies.length)}<span>Dominas ${d} de ${g.especies.length}</span></span>
          ${ICONO.der}
        </button></li>`;
      }).join('')}</ul>`;
    activarEnlaces();
  }

  function vistaAprenderGrupo(g) {
    const dom = nDominadas(g.especies);
    cabecera(g.nombre, 'Aprender');
    $vista.innerHTML = `
      <div class="practicar">
        <p>${barra(dom, g.especies.length)}<span>Dominas ${dom} de ${g.especies.length} especies</span></p>
        <div class="botones">
          <button class="btn" data-ir="#/practica/especie/g-${g.id}">${ICONO.aprender}Practicar este grupo</button>
          <button class="btn sec" data-ir="#/grupo/${g.id}">${ICONO.libro}Estudiar en la guía</button>
        </div>
      </div>
      <h2 class="seccion">Especies</h2>
      <p class="ayuda">Toca ✓ si ya conoces bien una especie («Ya me la sé»): saldrá menos en los repasos.</p>
      <ul class="lista">${g.especies.map(id => {
        const e = especies.get(id), si = dominada(id);
        return `<li class="fila-aprender">
          <button class="fila" data-ir="#/especie/${id}">
            <img src="${mini(id)}" alt="" loading="lazy">
            <span class="fila-texto"><strong>${esc(nom(e))}</strong><span class=\"es\">${sci(e)}</span><span>${estadoEspecie(id)}</span></span>
          </button>
          <button class="sabida${si ? ' activo' : ''}" data-sabida="${id}" aria-pressed="${si}" aria-label="Ya me la sé" title="Ya me la sé">${ICONO.visto}</button>
        </li>`;
      }).join('')}</ul>`;
    activarEnlaces();
    $vista.querySelectorAll('[data-sabida]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.sabida, si = !dominada(id);
        marcarSabida(id, si);
        aviso(si ? 'Marcada: volverá a repaso en 14 días' : 'Vuelve a estar en práctica');
        const y = window.scrollY;
        render();
        window.scrollTo(0, y);
      };
    });
  }

  let ronda = null;  // ronda de práctica en curso (se pierde al cerrar la app; el progreso no)

  function vistaPractica(modo, ambito) {
    const clave = modo + '/' + ambito;
    if (!ronda || ronda.clave !== clave) ronda = { clave, modo, cola: armarRonda(modo, ambito), i: 0, aciertos: 0, vistas: new Set(), repetidas: new Set(), falladas: [] };
    const r = ronda;
    cabecera(modo === 'grupo' ? '¿A qué grupo pertenece?' : '¿Qué especie es?', nombreAmbito(ambito));
    if (!r.cola.length) {
      $vista.innerHTML = `<p class="vacio">${ambito === 'repaso' ? 'No tienes repasos pendientes hoy. Elige un grupo o una categoría para aprender especies nuevas.' : 'No hay especies para practicar aquí.'}</p>
        <div class="botones centrar"><button class="btn" data-ir="#/aprender">Ir a Aprender</button></div>`;
      activarEnlaces();
      return;
    }
    if (r.i >= r.cola.length) { resumenRonda(r, ambito); return; }

    const id = r.cola[r.i], e = especies.get(id), g = grupos.get(e.g);
    if (!r.q || r.q.i !== r.i) r.q = { i: r.i, ops: modo === 'grupo' ? opcionesGrupo(e) : opcionesEspecie(e), elegida: null };
    const q = r.q;
    const correcta = modo === 'grupo' ? unidad(g) : id;
    const etiqueta = o => modo === 'grupo' ? `<strong>${esc(o)}</strong>`
      : `<strong>${esc(nom(especies.get(o)))}</strong>${especies.get(o).es ? `<span>${sci(especies.get(o))}</span>` : ''}`;

    $vista.innerHTML = `
      <div class="avance-ronda"><span>Pregunta ${r.i + 1} de ${r.cola.length}</span><span>${r.aciertos} ${r.aciertos === 1 ? 'acierto' : 'aciertos'}</span></div>
      <div class="ficha-foto"><img src="${q.foto || (q.foto = foto(id, 1 + Math.floor(Math.random() * (e.nf || 1))))}" alt="Foto del animal que hay que reconocer"></div>
      <div class="opciones">${q.ops.map((o, k) => `<button class="opcion" data-k="${k}">${etiqueta(o)}</button>`).join('')}</div>
      <div id="respuesta"></div>`;

    const mostrar = () => {
      const bien = q.elegida === correcta;
      $vista.querySelectorAll('.opcion').forEach((b, k) => {
        b.disabled = true;
        if (q.ops[k] === correcta) b.classList.add('bien');
        else if (q.ops[k] === q.elegida) b.classList.add('mal');
      });
      const tip = textoTip(e);
      const $r = document.getElementById('respuesta');
      $r.innerHTML = `<div class="respuesta ${bien ? 'ok' : 'no'}">
        <strong>${bien ? '¡Correcto!' : 'No es esa.'}</strong>
        ${modo === 'grupo'
          ? `<p>${esc(nom(e))} (${sci(e)}) es del grupo <b>${esc(unidad(g))}</b>.</p>${g.sobre ? `<p class="suave">${esc(g.sobre.f)}</p>` : ''}`
          : `<p>${bien ? '' : 'Es '}<b>${esc(nom(e))}</b> (${sci(e)}).</p>${tip ? `<span class="tip"><b>Tip:</b> ${esc(tip)}</span>` : ''}`}
        ${bien ? '' : '<p class="suave">Volverá a salir en esta ronda.</p>'}
        <div class="botones">
          ${!bien && modo === 'especie' ? `<button class="btn sec" data-ir="#/comparar/${id}/${q.elegida}">${ICONO.comparar}Comparar las dos</button>` : ''}
          <button class="btn sec" data-ir="${modo === 'grupo' ? `#/grupo/${g.id}` : `#/especie/${id}`}">${modo === 'grupo' ? 'Ver el grupo' : 'Ver ficha'}</button>
          <button class="btn" id="btn-siguiente">Siguiente${ICONO.der}</button>
        </div>
      </div>`;
      activarEnlaces($r);
      document.getElementById('btn-siguiente').onclick = () => { r.i++; render(); window.scrollTo(0, 0); };
      $r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    $vista.querySelectorAll('.opcion').forEach(b => {
      b.onclick = () => {
        q.elegida = q.ops[Number(b.dataset.k)];
        const bien = q.elegida === correcta;
        // Solo la primera respuesta de la ronda cuenta para el repaso; si falla, la especie se repite más adelante
        if (!r.vistas.has(id)) {
          r.vistas.add(id);
          if (modo === 'especie') registrarRespuesta(id, bien, bien ? null : q.elegida);
          if (bien) r.aciertos++; else r.falladas.push(id);
        }
        if (!bien && !r.repetidas.has(id)) {
          r.repetidas.add(id);
          r.cola.splice(Math.min(r.i + 4, r.cola.length), 0, id);
        }
        mostrar();
      };
    });
    if (q.elegida !== null) mostrar();
  }

  function resumenRonda(r, ambito) {
    const n = r.vistas.size;
    $vista.innerHTML = `
      <div class="resumen-ronda"><strong>${r.aciertos} de ${n}</strong><span>correctas a la primera</span></div>
      <p class="nota">${r.modo === 'especie'
        ? 'Las especies que practicaste vuelven en el Repaso del día: las que fallaste y las nuevas, mañana; las demás, más adelante. Cada acierto espacia más el siguiente repaso (3, 7, 14 y 30 días).'
        : r.aciertos === n ? '¡Excelente! Ya reconoces bien los grupos.' : 'Abre los grupos que fallaste y lee «Qué une a este grupo».'}</p>
      ${r.falladas.length ? `<h2 class="seccion">Para estudiar</h2>
        <ul class="lista">${r.falladas.map(id => filaEspecie(especies.get(id), true)).join('')}</ul>` : ''}
      <div class="botones centrar" style="margin-top:16px">
        <button class="btn" id="btn-otra">Otra ronda</button>
        ${ambito.startsWith('g-') ? `<button class="btn sec" data-ir="#/grupo/${ambito.slice(2)}">Estudiar el grupo</button>` : ''}
        <button class="btn sec" data-ir="#/aprender">Aprender</button>
      </div>`;
    activarEnlaces();
    document.getElementById('btn-otra').onclick = () => { ronda = null; render(); window.scrollTo(0, 0); };
  }

  /* Comparar dos especies lado a lado: primero las que más se confunden, luego las de su grupo */
  function vistaComparar(e, otroId) {
    const g = grupos.get(e.g);
    const confusas = Object.entries(progreso[e.id]?.c || {}).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const familia = G.grupos.filter(o => o !== g && g.u && o.u === g.u).flatMap(o => o.especies);
    const candidatas = [...new Set([...confusas, ...g.especies, ...(g.especies.length < 4 ? familia : [])])]
      .filter(id => id !== e.id && especies.has(id));
    const otro = especies.get(otroId) || especies.get(candidatas[0]);
    cabecera('Comparar', g.nombre);
    if (!otro) { $vista.innerHTML = '<p class="vacio">No hay otra especie con qué comparar.</p>'; return; }
    const columna = x => {
      const gx = grupos.get(x.g);
      const titulos = gx.columnas;
      return `<div class="col">
        <button class="col-foto" data-ir="#/especie/${x.id}"><img src="${foto(x.id)}" alt="${esc(nom(x))}"></button>
        <h3>${esc(nom(x))}</h3><p class="es">${sci(x)}</p>
        ${x.r.map((t, i) => t ? rasgoHTML(titulos[i] || `Característica ${i + 1}`, t) : '').join('')}
      </div>`;
    };
    $vista.innerHTML = `
      <p class="ayuda">Comparar con:</p>
      <div class="chips">${candidatas.map(id => `<button class="chip${id === otro.id ? ' activo' : ''}" data-reemplazar="#/comparar/${e.id}/${id}">${esc(nom(especies.get(id)))}</button>`).join('')}</div>
      <div class="comparar">${columna(e)}${columna(otro)}</div>`;
    activarEnlaces();
    activarReemplazos();
    $vista.querySelector('.chip.activo')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    window.scrollTo(0, 0);
  }

  function vistaCreditos() {
    cabecera('Créditos de fotos', 'Autores y licencias');
    $vista.innerHTML = `
      <div class="creditos">
        <p class="nota">Las fotos de esta guía provienen de Wikimedia Commons y de iNaturalist, solo con licencias libres (CC0, dominio público, CC BY y CC BY-SA), y se usan según la licencia que indica su autor. Los números indican el orden de las fotos en la ficha.
        Los textos son de redacción propia. Serpientes: a partir de Alejandro Solórzano, <i>Serpientes de Costa Rica: distribución, taxonomía e
        historia natural</i>, 2.ª edición, Editorial Costa Rica, 2022 (con Mahmood Sasa Marín y José María Gutiérrez como autores invitados).
        Lagartijas, tortugas y cocodrilos: a partir de Federico Muñoz Chacón y Richard Dennis Johnston, <i>Anfibios y reptiles de Costa Rica:
        guía de bolsillo en inglés y español</i>, Zona Tropical y Cornell University Press, 2013; las pocas especies que esa guía no trata se
        resumen de The Reptile Database.
        La lista de especies y los nombres científicos se revisaron con The Reptile Database (Uetz y colaboradores, reptile-database.org).
        Los mapas de la ficha son un dibujo propio: «Libro» resume las zonas y alturas que da el libro de serpientes para cada especie;
        «Registros GBIF» muestra dónde hay registros con coordenadas publicados en GBIF.org (colecciones de museos, iNaturalist y otras fuentes).
        Contornos de Natural Earth y relieve de Mapzen/Tilezen (datos abiertos).
        Versión de los datos: ${esc(G.version)} (${esc(G.fecha)}).</p>
        ${gruposAlfa.map(g => `<h3>${esc(g.nombre)}</h3>${g.especies.map(id => {
          const e = especies.get(id);
          return `<p><b>${esc(nom(e))}</b> (${sci(e)}): ${e.cr ? e.cr.map((c, k) => `${e.cr.length > 1 ? `${k + 1}) ` : ''}${esc(c[0])}${c[1] ? ` <span class="lic">· ${esc(c[1])}</span>` : ''}`).join('; ') : 'sin foto libre'}</p>`;
        }).join('')}`).join('')}
      </div>`;
  }

  // Primeros auxilios ante una mordedura: redacción propia a partir del capítulo de envenenamientos del libro
  // (J. M. Gutiérrez) y de las recomendaciones del Instituto Clodomiro Picado
  function vistaMordedura() {
    cabecera('Ante una mordedura', 'Qué hacer y qué no hacer');
    $vista.innerHTML = `
      <div class="mordedura">
        <p class="aviso-fuerte">Toda mordedura de serpiente se trata como una emergencia, aunque no se sepa la especie.
        El tratamiento del envenenamiento es el suero antiofídico (antiveneno), que solo se aplica en los centros de salud.</p>
        <h2>Qué hacer</h2>
        <ol>${G.mordedura.hacer.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <h2>Qué no hacer</h2>
        <ul class="no">${G.mordedura.no.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <h2>Para evitar mordeduras</h2>
        <ul>${G.mordedura.evitar.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="fuente">${G.mordedura.fuente}</p>
        <div class="botones"><a class="btn peligro-btn" href="tel:911">${ICONO.alerta}Llamar al 911</a></div>
      </div>`;
  }

  /* ---------- Identificar: paso a paso y por foto ----------
     Rasgos de cada especie en e.q (construir_app.py): lug, pat, col (rasgos_identificacion.json), pu y es (del libro,
     rasgos_libro.json), tam (cm, de la ficha), reg y alt (del mapa «Libro» o, en los demás reptiles, de los registros de
     GBIF). Lo que falta es «sin dato»: la especie no se descarta por esa pregunta. La primera pregunta es qué animal es;
     las preguntas con `solo` se hacen solo para ese tipo, y las opciones con un tercer elemento solo para esos tipos. */
  const PREGUNTAS = [
    { id: 'tipo', texto: '¿Qué animal es?', valor: e => [secDe(e)],
      ops: [['serpientes', 'Una serpiente'], ['lagartijas', 'Una lagartija, iguana o geco'], ['tortugas', 'Una tortuga'], ['cocodrilos', 'Un cocodrilo o un caimán']]
        .filter(([s]) => secciones.has(s)) },
    { id: 'lug', texto: '¿Dónde estaba?', valor: e => e.q.lug,
      ops: [['a', 'En un árbol o arbusto'], ['s', 'En el suelo'], ['h', 'Bajo la hojarasca, piedras o la tierra'], ['w', 'En el agua o en el mar'],
        ['c', 'En una casa, pared o construcción', ['lagartijas']]] },
    { id: 'pat', texto: '¿Qué dibujo tiene el cuerpo?', valor: e => e.q.pat,
      ops: [['A', 'Anillos o bandas de colores alrededor del cuerpo'], ['M', 'Manchas, rombos o bandas oscuras'], ['R', 'Rayas a lo largo del cuerpo'], ['P', 'Puntitos o salpicado'], ['U', 'De un solo color, o casi']] },
    { id: 'col', texto: '¿Qué color tiene sobre todo?', valor: e => e.q.col,
      ops: [['v', 'Verde'], ['c', 'Café, gris o pardo'], ['n', 'Negra o muy oscura'], ['r', 'Roja, anaranjada o rosada'], ['a', 'Amarilla']] },
    { id: 'fos', solo: 'serpientes', texto: '¿Tiene la cabeza ancha y triangular, con un hoyito (foseta) entre el ojo y la nariz?',
      ayuda: 'Es la marca de las víboras. Mírela solo de lejos o en una foto.', valor: e => [e.k === 'viboras' ? 'si' : 'no'],
      ops: [['si', 'Sí'], ['no', 'No']] },
    { id: 'pu', solo: 'serpientes', texto: '¿Cómo es la pupila del ojo?', valor: e => e.q.pu ? [e.q.pu] : null,
      ops: [['vertical', 'Vertical, como la de un gato'], ['redonda', 'Redonda'], ['oculta', 'No se le ven los ojos (son diminutos)']] },
    { id: 'es', solo: 'serpientes', texto: '¿Las escamas del lomo son ásperas, con una crestita (quilla) en el centro?', valor: e => e.q.es ? (e.q.es === 'ambas' ? ['quilla', 'lisas'] : [e.q.es]) : null,
      ops: [['quilla', 'Sí, ásperas, con quilla'], ['lisas', 'No, lisas y brillantes']] },
    { id: 'tam', solo: 'serpientes', texto: '¿Qué tan larga era, más o menos?', ayuda: 'Una serpiente pequeña puede ser una cría de una especie grande.',
      coincide: (e, v) => e.q.tam == null ? null : v === 'p' ? true : v === 'm' ? e.q.tam >= 50 : e.q.tam >= 120,
      ops: [['p', 'Menos de 50 cm'], ['m', 'De 50 cm a 1,20 m'], ['g', 'Más de 1,20 m']] },
    { id: 'reg', texto: '¿En qué parte del país la vio?', valor: e => e.q.reg || null,
      ops: [['caribe', 'Caribe o Zona Norte'], ['norte', 'Guanacaste y Pacífico norte'], ['sur', 'Pacífico central y sur'], ['valle', 'Valle Central'], ['mar', 'En el mar', ['serpientes', 'tortugas', 'cocodrilos']]] },
    { id: 'alt', texto: '¿A qué altura, más o menos?', valor: e => e.q.alt || null,
      ops: [['baja', 'Menos de 500 m (tierras bajas y costas)'], ['media', 'De 500 a 1500 m'], ['alta', 'Más de 1500 m (montaña)']] },
  ];
  const pasos = {};   // respuestas: { pregunta: opción } («nose» = no sé)
  // Preguntas y opciones que corresponden al tipo de animal respondido (sin tipo: las comunes a todos)
  const vale = pr => !pr.solo || pasos.tipo === pr.solo;
  const opsDe = pr => pr.ops.filter(o => !o[2] || o[2].includes(pasos.tipo) || !pasos.tipo || pasos.tipo === 'nose');

  // true = coincide, false = se descarta, null = sin dato (sigue en la lista)
  function coincide(e, pr, v) {
    if (pr.coincide) return pr.coincide(e, v);
    const vals = pr.valor(e);
    return !vals || !vals.length ? null : vals.includes(v);
  }

  function posibles(resp = pasos) {
    return G.especies.filter(e => PREGUNTAS.every(pr => !resp[pr.id] || resp[pr.id] === 'nose' || coincide(e, pr, resp[pr.id]) !== false));
  }

  // La siguiente pregunta es la que más reduce la lista en el peor caso
  function siguientePregunta(lista) {
    let mejor = null, peor = Infinity;
    const tipo = PREGUNTAS[0];
    if (!pasos.tipo && new Set(lista.map(secDe)).size > 1) return tipo;   // primero, qué animal es
    for (const pr of PREGUNTAS) {
      if (pasos[pr.id] || !vale(pr)) continue;
      const cuentas = opsDe(pr).map(([v]) => lista.filter(e => coincide(e, pr, v) !== false).length);
      const max = Math.max(...cuentas);
      if (max < lista.length && max < peor) { peor = max; mejor = pr; }
    }
    return mejor;
  }

  function sinDatos(e) {
    return PREGUNTAS.filter(pr => pasos[pr.id] && pasos[pr.id] !== 'nose' && coincide(e, pr, pasos[pr.id]) === null)
      .map(pr => ({ pu: 'pupila', es: 'escamas', tam: 'tamaño', reg: 'región', alt: 'altura', lug: 'lugar', pat: 'dibujo', col: 'color' }[pr.id] || pr.id));
  }

  function vistaPasos() {
    const lista = posibles();
    const pr = lista.length > 1 ? siguientePregunta(lista) : null;
    cabecera('Paso a paso', `${lista.length} ${lista.length === 1 ? 'especie posible' : 'especies posibles'}`);
    const dadas = PREGUNTAS.filter(p => pasos[p.id]);
    const mostrarLista = !pr || lista.length <= 8 || ver.pasos;
    $vista.innerHTML = `
      ${pr ? `<section class="pregunta">
        <h2>${esc(pr.texto)}</h2>${pr.ayuda ? `<p class="ayuda">${esc(pr.ayuda)}</p>` : ''}
        <div class="opciones">${opsDe(pr).map(([v, t]) => {
          const n = lista.filter(e => coincide(e, pr, v) !== false).length;
          return `<button class="opcion" data-v="${v}"${n ? '' : ' disabled'}><strong>${esc(t)}</strong><span>${n} ${n === 1 ? 'especie' : 'especies'}</span></button>`;
        }).join('')}
          <button class="opcion nose" data-v="nose"><strong>No sé</strong></button></div>
      </section>` : `<p class="nota">${lista.length ? 'Ya no hay más preguntas que separen estas especies. Compara sus fotos y abre las fichas.' : 'Ninguna especie coincide con todas las respuestas. Revisa alguna respuesta tocándola abajo.'}</p>`}
      ${dadas.length ? `<div class="chips envolver respuestas">${dadas.map(p => `<button class="chip" data-quitar="${p.id}">${esc(pasos[p.id] === 'nose' ? `${p.texto.replace(/[¿?]/g, '')}: no sé` : p.ops.find(o => o[0] === pasos[p.id])[1])} ✕</button>`).join('')}
        <button class="chip" id="btn-reiniciar">Empezar de nuevo</button></div>` : ''}
      ${mostrarLista
        ? `<h2 class="seccion">Especies posibles (${lista.length})</h2><ul class="lista">${lista.map(e => {
            const sd = sinDatos(e);
            return filaEspecie(e, true, sd.length ? `<span class="sin-dato">Sin dato de ${sd.join(', ')}</span>` : '');
          }).join('')}</ul>`
        : `<div class="botones centrar"><button class="btn sec" id="btn-ver">Ver las ${lista.length} posibles</button></div>`}
      <p class="fuente">Rasgos tomados de las fichas (Solórzano, <i>Serpientes de Costa Rica</i>, 2022, y Muñoz Chacón y Johnston, <i>Anfibios y reptiles de Costa Rica</i>, 2013); en las especies que no son serpientes, la región y la altura salen de los registros de GBIF. Si una especie no tiene un dato, sigue en la lista. Observe siempre de lejos y no toque ninguna serpiente.</p>`;
    $vista.querySelectorAll('.opcion').forEach(b => { b.onclick = () => { pasos[pr.id] = b.dataset.v; ver.pasos = false; render(); window.scrollTo(0, 0); }; });
    $vista.querySelectorAll('[data-quitar]').forEach(b => { b.onclick = () => { delete pasos[b.dataset.quitar]; render(); }; });
    const $r = document.getElementById('btn-reiniciar');
    if ($r) $r.onclick = () => { for (const k in pasos) delete pasos[k]; render(); };
    const $v = document.getElementById('btn-ver');
    if ($v) $v.onclick = () => { ver.pasos = true; render(); };
    activarEnlaces();
  }
  const ver = {};

  // Huella de color, igual que huella() de construir_app.py: dos histogramas de 28 casillas (80 % y 40 % centrales)
  async function huellaFoto(blob) {
    const img = await createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(blob));
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const x = c.getContext('2d');
    const salida = [];
    for (const f of [0.1, 0.3]) {
      x.drawImage(img, img.width * f, img.height * f, img.width * (1 - 2 * f), img.height * (1 - 2 * f), 0, 0, 48, 48);
      const d = x.getImageData(0, 0, 48, 48).data;
      const bins = new Array(28).fill(0);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const v = mx * 255, s = mx ? (mx - mn) / mx * 255 : 0;
        let h = 0;
        if (mx !== mn) h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
        if (v < 40) bins[0]++;
        else if (s < 40) bins[v < 100 ? 1 : v < 170 ? 2 : 3]++;
        else bins[4 + Math.min(11, Math.floor(h / 6 * 12)) * 2 + (v < 150 ? 0 : 1)]++;
      }
      const total = bins.reduce((a, b) => a + b, 0) || 1;
      salida.push(...bins.map(n => 255 * n / total));
    }
    return salida;
  }

  // Parecido de 0 a 1: el centro de la foto pesa el doble
  const parecido = (a, b) => a.reduce((s, v, k) => s + Math.min(v, b[k]) * (k < 28 ? 1 : 2), 0) / (255 * 3);
  const porFoto = { url: null, huella: null, orden: [] };

  async function cargarFotoUsuario(archivo) {
    if (!archivo) return;
    aviso('Comparando con las fotos de la guía…');
    if (porFoto.url) URL.revokeObjectURL(porFoto.url);
    porFoto.url = URL.createObjectURL(archivo);
    porFoto.huella = await huellaFoto(archivo);
    porFoto.orden = G.especies.filter(e => e.hi).map(e => {
      let mejor = 0, n = 1;
      e.hi.forEach((h, k) => { const p = parecido(porFoto.huella, bytes64(h)); if (p > mejor) { mejor = p; n = k + 1; } });
      return { id: e.id, p: mejor, n };
    }).sort((a, b) => b.p - a.p);
    render();
  }

  function vistaPorFoto(idComparar) {
    const usar = Object.keys(pasos).length ? new Set(posibles().map(e => e.id)) : null;
    if (idComparar && especies.has(idComparar) && porFoto.url) {
      const e = especies.get(idComparar);
      cabecera(nom(e), 'Comparar con tu foto');
      $vista.innerHTML = `
        <div class="comparar-foto">
          <figure><img src="${porFoto.url}" alt="Tu foto"><figcaption>Tu foto</figcaption></figure>
          <div class="tira">${fotosGuia(e).map(u => `<img src="${u}" alt="${esc(nom(e))}" loading="lazy">`).join('')}</div>
        </div>
        <div class="ficha-nombres"><h2>${esc(nom(e))}</h2>${e.es ? `<p>${sci(e)}</p>` : ''}<div class="marcas">${marcas(e)}</div></div>
        <div class="rasgos">${rasgoHTML('Cómo reconocerla', e.r[1])}</div>
        <div class="botones"><button class="btn" data-ir="#/especie/${e.id}">Ver ficha</button></div>`;
      activarEnlaces();
      window.scrollTo(0, 0);
      return;
    }
    cabecera('Por foto', 'Compara tu foto con las de la guía');
    const orden = porFoto.orden.filter(o => !usar || usar.has(o.id)).slice(0, 20);
    $vista.innerHTML = `
      ${porFoto.url ? `<div class="ficha-foto mi-foto"><img src="${porFoto.url}" alt="Tu foto"></div>` : `<p class="nota">Toma o elige una foto del animal (de lejos). La app la compara con las fotos de la guía y te muestra primero las especies de colores más parecidos; después tú comparas las fotos.</p>`}
      <div class="botones">
        <button class="btn" id="btn-camara">${ICONO.camara.replace('icono-camara', '')}Tomar foto</button>
        <button class="btn sec" id="btn-galeria">${ICONO.galeria}Elegir de galería</button>
      </div>
      ${usar ? `<p class="ayuda">Se comparan solo las ${usar.size} especies posibles según tus respuestas del paso a paso. <button class="enlace" data-ir="#/identificar/pasos">Ver respuestas</button></p>` : ''}
      ${porFoto.url ? `<h2 class="seccion">Más parecidas por el color</h2>
        <p class="ayuda">Es un orden aproximado por colores, no una identificación automática: toca cada especie para comparar las fotos lado a lado.</p>
        <ul class="lista">${orden.map(o => {
          const e = especies.get(o.id);
          return `<li><button class="fila" data-ir="#/identificar/foto/${e.id}">
            <img src="${foto(e.id, o.n)}" alt="" loading="lazy">
            <span class="fila-texto"><strong>${esc(nom(e))}</strong><span class="es">${sci(e)}</span>${marcas(e) ? `<span class="marcas">${marcas(e)}</span>` : ''}</span>
          </button></li>`;
        }).join('')}</ul>` : ''}
      <p class="fuente">Solo se comparan las especies que tienen fotos en la guía.</p>`;
    const elegir = input => { input.value = ''; input.onchange = () => cargarFotoUsuario(input.files[0]); input.click(); };
    document.getElementById('btn-camara').onclick = () => elegir(document.getElementById('in-camara'));
    document.getElementById('btn-galeria').onclick = () => elegir(document.getElementById('in-galeria'));
    activarEnlaces();
  }

  function vistaContacto() {
    cabecera('Contacto', 'Sugerencias e ideas');
    const asunto = encodeURIComponent('Sugerencia para la Guía de anfibios y reptiles de Costa Rica');
    $vista.innerHTML = `
      <div class="contacto">
        <p class="nota">¿Tienes sugerencias para mejorar esta guía, encontraste un error o tienes una idea para una nueva aplicación? Escríbeme.</p>
        <h2>${esc(CONTACTO.nombre)}</h2>
        <a class="btn" href="mailto:${CONTACTO.correo}?subject=${asunto}">${ICONO.correo}${esc(CONTACTO.correo)}</a>
      </div>`;
  }

  function vistaRespaldo() {
    const nProg = Object.keys(progreso).filter(id => especies.has(id)).length;
    cabecera('Respaldo de mis fotos y progreso', `${misFotos.size} ${misFotos.size === 1 ? 'especie' : 'especies'} con fotos · ${nProg} en aprendizaje`);
    $vista.innerHTML = `
      <p class="nota">Tus fotos y tu avance en Aprender se guardan dentro de la app y no se borran al actualizarla.
      Si desinstalas la app o cambias de teléfono, se pierden: guarda antes un respaldo y cópialo a la computadora o a Drive.</p>
      <div class="botones">
        <button class="btn" id="btn-exportar">${ICONO.respaldo}Guardar respaldo</button>
        <button class="btn sec" id="btn-importar">${ICONO.restaurar}Restaurar respaldo</button>
      </div>`;
    document.getElementById('btn-exportar').onclick = exportar;
    document.getElementById('btn-importar').onclick = () => {
      const inp = document.getElementById('in-respaldo');
      inp.value = '';
      inp.onchange = () => inp.files[0] && importar(inp.files[0]);
      inp.click();
    };
  }

  const aDatos = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
  const deDatos = async url => (await fetch(url)).blob();

  async function exportar() {
    const todas = await BD.todas();
    const nProg = Object.keys(progreso).length;
    if (!todas.length && !nProg) { aviso('Todavía no hay fotos personales ni progreso para respaldar.'); return; }
    aviso('Preparando respaldo…');
    const fotos = [];
    for (const r of todas) {
      fotos.push({ especie: r.especie, fecha: r.fecha, principal: r.principal, foto: await aDatos(r.foto), mini: await aDatos(r.mini) });
    }
    // formato 2: agrega el progreso de Aprender; los respaldos de formato 1 (solo fotos) se siguen pudiendo restaurar
    const contenido = JSON.stringify({ app: 'guia-serpientes-cr', formato: 2, fotos, progreso });
    const nombre = `respaldo-guia-anfibios-reptiles-${new Date().toISOString().slice(0, 10)}.json`;
    const detalle = `${todas.length} fotos y el progreso de ${nProg} especies`;
    if (window.AndroidApp) {  // dentro del APK: se guarda en Descargas
      const r = window.AndroidApp.guardarRespaldo(contenido, nombre);
      aviso(r === 'ok' ? `Respaldo guardado en Descargas (${detalle})` : 'No se pudo guardar el respaldo: ' + r);
      return;
    }
    const blob = new Blob([contenido], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    aviso(`Respaldo guardado (${detalle})`);
  }

  async function importar(archivo) {
    try {
      const datos = JSON.parse(await archivo.text());
      if (datos.app !== 'guia-serpientes-cr') throw new Error();
      const existentes = new Set((await BD.todas()).map(r => r.especie + '|' + r.fecha));
      let n = 0;
      for (const f of datos.fotos) {
        if (!especies.has(f.especie) || existentes.has(f.especie + '|' + f.fecha)) continue;
        await BD.agregar({ especie: f.especie, fecha: f.fecha, principal: f.principal, foto: await deDatos(f.foto), mini: await deDatos(f.mini) });
        n++;
      }
      // Progreso: de cada especie se queda el registro con más respuestas (el más avanzado)
      let np = 0;
      for (const [id, p] of Object.entries(datos.progreso || {})) {
        const actual = progreso[id];
        if (especies.has(id) && (!actual || p.a + p.f > actual.a + actual.f)) { progreso[id] = p; np++; }
      }
      if (np) guardarProgreso();
      await cargarMisFotos();
      aviso(n || np ? `Se recuperaron ${n} fotos y el progreso de ${np} especies` : 'Esas fotos y ese progreso ya estaban en la app');
      render();
    } catch {
      aviso('El archivo no es un respaldo válido.');
    }
  }

  /* ---------- inicio ---------- */
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && document.querySelector('.visor')) $atras.onclick(); });
  BD.abrir()
    .then(cargarMisFotos)
    .catch(() => aviso('No se pudo abrir el almacenamiento de fotos personales.'))
    .finally(() => { pila.push(location.hash || '#/'); render(); });
})();
