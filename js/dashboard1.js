
  // 顶部时间按原型图固定显示，不自动更新

  /* ===== 中间地图：滚轮缩放 + 拖拽平移 =====
     轮廓描边因 #geo path 的 vector-effect:non-scaling-stroke 保持恒定线宽；
     文字与脉冲点通过反向缩放 transform，使字号/点位大小不随缩放变化。 */
  (function () {
    const svg = document.querySelector('.map-wrap svg');
    if (!svg) return;
    const geo = document.getElementById('geo');
    if (!geo) return;

    const VB = { x: 292, y: 275, w: 300, h: 134 }; // svg viewBox
    // 广西全图框：用于最小缩放层级，使全区可见并居中
    const GUANGXI = { x: 220, y: 180, w: 460, h: 340 };
    const MIN = 0.37, MAX = 18; // 最小=全广西；最大=南宁区县级
    let k = 1, tx = 0, ty = 0;

    // 在指定缩放 k 下，将内容框 b 居中到窗口内
    function centerContent(kk, b) {
      return {
        tx: VB.x + VB.w / 2 - kk * (b.x + b.w / 2),
        ty: VB.y + VB.h / 2 - kk * (b.y + b.h / 2)
      };
    }

    // 记录文字/脉冲点的地理锚点（与路径同一坐标系）
    const texts = Array.from(geo.querySelectorAll('text'));
    texts.forEach(t => { t._x = parseFloat(t.getAttribute('x')); t._y = parseFloat(t.getAttribute('y')); });
    const circles = Array.from(geo.querySelectorAll('circle'));
    circles.forEach(c => { c._x = parseFloat(c.getAttribute('cx')); c._y = parseFloat(c.getAttribute('cy')); });

    function apply() {
      geo.setAttribute('transform', 'translate(' + tx + ' ' + ty + ') scale(' + k + ')');
      const inv = 1 / k;
      for (const t of texts) {
        t.setAttribute('transform', 'translate(' + t._x + ' ' + t._y + ') scale(' + inv + ') translate(' + (-t._x) + ' ' + (-t._y) + ')');
      }
      for (const c of circles) {
        c.setAttribute('transform', 'translate(' + c._x + ' ' + c._y + ') scale(' + inv + ') translate(' + (-c._x) + ' ' + (-c._y) + ')');
      }
    }

    // 屏幕坐标 -> viewBox 坐标
    function toVB(e) {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / VB.w, r.height / VB.h);
      const offX = (r.width - VB.w * s) / 2;
      const offY = (r.height - VB.h * s) / 2;
      return {
        x: VB.x + (e.clientX - r.left - offX) / s,
        y: VB.y + (e.clientY - r.top - offY) / s,
        s: s
      };
    }

    // 滚轮缩放（以光标为中心）
    let introRAF = null;
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (introRAF) { cancelAnimationFrame(introRAF); introRAF = null; }
      const p = toVB(e);
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nk = Math.min(MAX, Math.max(MIN, k * f));
      if (nk <= MIN + 1e-6) {
        // 已缩到最小层级：对齐广西全图并居中，确保整个广西可见
        k = MIN;
        const c = centerContent(MIN, GUANGXI);
        tx = c.tx; ty = c.ty;
      } else {
        const ratio = nk / k;
        tx = p.x - ratio * (p.x - tx);
        ty = p.y - ratio * (p.y - ty);
        k = nk;
      }
      apply();
    }, { passive: false });

    // 拖拽平移
    let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0;
    svg.addEventListener('mousedown', function (e) {
      e.preventDefault();
      dragging = true; svg.classList.add('dragging');
      sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
      if (introRAF) { cancelAnimationFrame(introRAF); introRAF = null; }
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      const p = toVB(e);
      tx = stx + (e.clientX - sx) / p.s;
      ty = sty + (e.clientY - sy) / p.s;
      apply();
    });
    window.addEventListener('mouseup', function () {
      dragging = false; svg.classList.remove('dragging');
    });

    // 进场轻微缩放：从 1.25 缓出到 1，保持默认南宁视图填满展示区
    let t0 = null; const k0 = 1.25, dur = 1100;
    function intro(ts) {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      k = k0 + (1 - k0) * e; tx = 0; ty = 0;
      apply();
      if (p < 1) introRAF = requestAnimationFrame(intro);
    }
    introRAF = requestAnimationFrame(intro);
  })();

  /* 仪表盘现已为流式自适应布局：舞台直接撑满视口，无需整体缩放。 */

  /* 顶部筛选栏下拉菜单（原生 <details> 展开，无需 JS；以下 JS 仅做单选联动与标签更新增强） */
  (function () {
    var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    filters.forEach(function (det) {
      var dd = det.querySelector('.dropdown');
      var label = det.querySelector('.fb-label');
      // 打开一个时关闭其他
      det.addEventListener('toggle', function () {
        if (det.open) filters.forEach(function (f) { if (f !== det) f.open = false; });
      });
      if (!dd) return;
      dd.querySelectorAll('li').forEach(function (li) {
        li.addEventListener('click', function () {
          dd.querySelectorAll('li').forEach(function (x) { x.classList.remove('active'); });
          li.classList.add('active');
          if (label) label.textContent = li.textContent;
          det.open = false; // 选中后收起
        });
      });
    });
    // 点击空白处收起全部
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.filter')) {
        filters.forEach(function (f) { f.open = false; });
      }
    });
  })();

  /* 看板切换下拉：点击跳转对应 dashboard 页面 */
  (function () {
    var sw = document.querySelector('.filter-switch');
    if (!sw) return;
    var label = sw.querySelector('#switchLabel');
    var items = sw.querySelectorAll('.dropdown li');
    var cur = location.pathname.split('/').pop() || 'dashboard1.html';
    items.forEach(function (li) {
      if (li.dataset.href === cur) {
        items.forEach(function (x) { x.classList.remove('active'); });
        li.classList.add('active');
        if (label) label.textContent = li.textContent;
      }
      li.addEventListener('click', function () {
        if (li.dataset.href) location.href = li.dataset.href;
      });
    });
  })();

  /* ===== 页头最右侧筛选栏：日期选择器（yyyy/mm/dd） ===== */
  (function () {
    var root = document.querySelector('.filter-date');
    if (!root) return;
    var label = root.querySelector('#dateLabel');
    var title = root.querySelector('.cal-title');
    var daysEl = root.querySelector('.cal-days');
    var navs = root.querySelectorAll('.cal-nav');
    if (!label || !title || !daysEl) return;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function fmt(y, m, d) { return y + '/' + pad(m + 1) + '/' + pad(d); }

    var today = new Date();
    var sel = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
    var view = { y: sel.y, m: sel.m };

    function render() {
      title.textContent = view.y + ' / ' + pad(view.m + 1);
      var first = new Date(view.y, view.m, 1).getDay();
      var total = new Date(view.y, view.m + 1, 0).getDate();
      var prevTotal = new Date(view.y, view.m, 0).getDate();
      daysEl.setAttribute('data-lead', first);
      var html = '';
      for (var i = first - 1; i >= 0; i--) {
        html += '<div class="cal-cell muted">' + (prevTotal - i) + '</div>';
      }
      for (var d = 1; d <= total; d++) {
        var cls = 'cal-cell';
        if (d === today.getDate() && view.y === today.getFullYear() && view.m === today.getMonth()) cls += ' today';
        if (d === sel.d && view.y === sel.y && view.m === sel.m) cls += ' active';
        html += '<div class="' + cls + '" data-d="' + d + '">' + d + '</div>';
      }
      var used = first + total;
      var tail = (7 - (used % 7)) % 7;
      for (var t = 1; t <= tail; t++) {
        html += '<div class="cal-cell muted">' + t + '</div>';
      }
      daysEl.innerHTML = html;
    }

    daysEl.addEventListener('click', function (e) {
      var cell = e.target && e.target.closest ? e.target.closest('.cal-cell') : null;
      if (!cell) return;
      if (cell.classList.contains('muted')) {
        var idx = Array.prototype.indexOf.call(daysEl.children, cell);
        var ld = parseInt(daysEl.getAttribute('data-lead'), 10) || 0;
        if (idx < ld) { view.m--; if (view.m < 0) { view.m = 11; view.y--; } }
        else { view.m++; if (view.m > 11) { view.m = 0; view.y++; } }
        render();
        return;
      }
      sel = { y: view.y, m: view.m, d: parseInt(cell.getAttribute('data-d'), 10) };
      label.textContent = fmt(sel.y, sel.m, sel.d);
      render();
      root.open = false;
    });

    navs.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var dir = parseInt(b.getAttribute('data-dir'), 10);
        view.m += dir;
        if (view.m < 0) { view.m = 11; view.y--; }
        if (view.m > 11) { view.m = 0; view.y++; }
        render();
      });
    });

    label.textContent = fmt(sel.y, sel.m, sel.d);
    render();
  })();

  /* ===== 左侧 资产规划占比分析：标签切换 + 图表/数据加载动效 ===== */
  (function () {
    const tabs = Array.from(document.querySelectorAll('#ratioTabs .tab'));
    const pie = document.getElementById('ratioPie');
    const legend = document.getElementById('ratioLegend');
    const segs = Array.from(pie ? pie.querySelectorAll('.seg') : []);
    const pcts = Array.from(legend ? legend.querySelectorAll('.pct') : []);
    const icon = pie ? pie.querySelector('.pie-icon') : null;
    if (!tabs.length || !pie) return;

    // 两套数据集（与环形图四段顺序一致：商业 / 住宅 / 工业 / 办公）
    const DATA = {
      area:  [40, 30, 20, 10],   // 资产面积占比
      count: [35, 25, 28, 12]    // 资产数量占比
    };
    const C = 2 * Math.PI * 55;  // 周长 ≈ 345.575

    function render(key) {
      const arr = DATA[key];
      let acc = 0;
      segs.forEach(function (s, i) {
        const len = arr[i] / 100 * C;
        s.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + (C - len).toFixed(1));
        s.setAttribute('stroke-dashoffset', (-acc).toFixed(1));
        acc += len;
      });
      // 图例数字加载动效：从 0 滚动到目标值 + 闪烁
      pcts.forEach(function (p, i) {
        const target = arr[i];
        p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash');
        const dur = 700, t0 = performance.now();
        (function step(now) {
          const k = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - k, 3);
          p.textContent = Math.round(target * e) + '%';
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
      // 环形图加载脉冲 + 扫描线 + 中心图标弹入
      pie.classList.remove('reload'); void pie.offsetWidth; pie.classList.add('reload');
      if (icon) { icon.classList.remove('reveal'); void icon.offsetWidth; icon.classList.add('reveal'); }
      if (legend) { legend.classList.add('loading'); setTimeout(function () { legend.classList.remove('loading'); }, 820); }
    }

    let current = 'area';
    let timer = null;
    const INTERVAL = 4500;

    function activate(key) {
      if (key === current) return;
      current = key;
      tabs.forEach(function (t) {
        const on = t.dataset.key === key;
        t.classList.toggle('active', on);
        if (on) { t.classList.remove('switch-fx'); void t.offsetWidth; t.classList.add('switch-fx'); }
      });
      render(key);
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { activate(t.dataset.key); restart(); });
    });

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(function () { activate(current === 'area' ? 'count' : 'area'); }, INTERVAL);
    }
    // 进场：环形图四段先归零，待面板入场就位后再绘制（含图例数字加载动效）
    segs.forEach(function (s) { s.setAttribute('stroke-dasharray', '0 345.575'); s.setAttribute('stroke-dashoffset', '0'); });
    setTimeout(function () { render('area'); restart(); }, 900);
  })();

  /* ===== 全局进场动效 + 数字加载 + 图表进场 ===== */
  (function () {
    // 1) 分区编排进场
    function play(el, cls, delay) {
      if (!el) return;
      el.classList.add(cls);
      el.style.animationDelay = delay.toFixed(2) + 's';
    }
    // ① 顶栏主标题：从上往下
    play(document.querySelector('.title-bar'), 'anim-top-c', 0);
    document.querySelectorAll('.title-side').forEach(function (e) { play(e, 'anim-top', 0.1); });
    // ② 时间栏从左入、筛选栏从右入
    play(document.querySelector('.header-clock'), 'anim-left', 0.35);
    play(document.querySelector('.header-filters'), 'anim-right', 0.35);
    // ③ KPI 卡片级联
    document.querySelectorAll('.kpi-card').forEach(function (e, i) { play(e, 'anim-in', 0.5 + i * 0.08); });
    // ④ 左栏面板依次从屏幕左缘入场、右栏面板依次从屏幕右缘入场
    document.querySelectorAll('.main .left > .panel').forEach(function (e, i) { play(e, 'anim-edge-l', 0.75 + i * 0.16); });
    document.querySelectorAll('.main .right > .panel').forEach(function (e, i) { play(e, 'anim-edge-r', 0.75 + i * 0.16); });
    // ⑤ 中间地图：放大渐显；管理单位汇总：从下往上升起
    play(document.querySelector('.center .map-wrap'), 'anim-map', 0.9);
    document.querySelectorAll('.center > .panel:not(.map-wrap)').forEach(function (e) { play(e, 'anim-bottom', 1.15); });

    // 2) 数字加载动效（从 0 滚动到目标值，保留单位/符号）
    function fmt(v, comma, dec) {
      var s = v.toFixed(dec);
      if (comma) { var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = p.join('.'); }
      return s;
    }
    function countUp(el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var nodes = [], all = '', n;
      while (n = walker.nextNode()) { nodes.push(n); all += n.nodeValue; }
      var m = all.match(/-?[\d,]+(\.\d+)?/);
      if (!m) return;
      var target = parseFloat(m[0].replace(/,/g, ''));
      var dec = (m[0].split('.')[1] || '').length;
      var comma = m[0].indexOf(',') >= 0;
      var pos = m.index, acc = 0, tNode = null, off = 0;
      for (var k = 0; k < nodes.length; k++) {
        var len = nodes[k].nodeValue.length;
        if (pos >= acc && pos < acc + len) { tNode = nodes[k]; off = pos - acc; break; }
        acc += len;
      }
      if (!tNode) return;
      var before = tNode.nodeValue.slice(0, off);
      var after = tNode.nodeValue.slice(off + m[0].length);
      var dyn = document.createTextNode(fmt(0, comma, dec));
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(dyn);
      if (after) frag.appendChild(document.createTextNode(after));
      tNode.parentNode.replaceChild(frag, tNode);
      var t0 = performance.now(), dur = 1000;
      (function step(now) {
        var k2 = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k2, 3);
        dyn.nodeValue = fmt(target * e, comma, dec);
        if (k2 < 1) requestAnimationFrame(step);
        else dyn.nodeValue = fmt(target, comma, dec);
      })(t0);
    }
    var numSel = ['.kpi-value', '.kpi-sub .up', '.kpi-sub .down', '.h-value', '.ov-num',
                  '.prog-val', '.bill-info-item .v', '.company-item .val', '.rank-table td.val'];

    // 3) 图表先归零占位（避免闪现成品态），待模块就位后再统一启动数字+图表动效
    document.querySelectorAll('.prog-fill').forEach(function (f) {
      f.dataset.w = f.getAttribute('data-w') || f.style.width; f.style.width = '0%';
    });
    var bc = document.querySelector('.bill-ring .bill-track');
    var C = 2 * Math.PI * 60;
    if (bc) { bc.style.strokeDasharray = C; bc.style.strokeDashoffset = C; }
    document.querySelectorAll('.line-chart .lc-line').forEach(function (p) {
      var L = p.getTotalLength();
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    });

    setTimeout(function () {
      // 数字加载
      numSel.forEach(function (s) { document.querySelectorAll(s).forEach(countUp); });
      // 进度条
      document.querySelectorAll('.prog-fill').forEach(function (f) {
        requestAnimationFrame(function () { f.style.width = f.dataset.w; });
      });
      // 账单环形图：整圈描边绘制
      if (bc) {
        bc.style.transition = 'stroke-dashoffset 1.4s ease';
        requestAnimationFrame(function () { bc.style.strokeDashoffset = 0; });
      }
      // 折线图：线绘制 + 区域淡入
      document.querySelectorAll('.line-chart .lc-line').forEach(function (p) {
        p.style.transition = 'stroke-dashoffset 1.6s ease';
        requestAnimationFrame(function () { p.style.strokeDashoffset = 0; });
      });
      document.querySelectorAll('.line-chart .lc-area').forEach(function (a) { a.style.opacity = 0; a.classList.add('draw'); });
      // 柱状图：自底向上生长（错峰）
      document.querySelectorAll('.bar-chart rect').forEach(function (r, i) {
        r.classList.add('bc-bar');
        r.style.animationDelay = (i * 0.045).toFixed(3) + 's';
        requestAnimationFrame(function () { r.classList.add('draw'); });
      });
    }, 900);
  })();


