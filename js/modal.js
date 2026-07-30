/* ============================================================
 * 共享弹窗组件（modal.js）
 * 单一来源：所有 dashboard 通过 <script src="js/modal.js"> 引用。
 * 用途：点击页面上带 [data-modal="ranking"] 的「资产价值/收入排行榜」
 *       面板，弹出该面板完整排行明细（读取面板内 .company-item）。
 * 不依赖任何框架/外部库。
 * ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* 注入并复用唯一的弹窗 DOM */
  function buildModal() {
    var existing = document.getElementById('assetRankModal');
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'assetRankModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="modal-dialog">' +
        '<div class="modal-head">' +
          '<span class="m-title"></span><span class="m-en"></span>' +
          '<button type="button" class="modal-close" aria-label="关闭">×</button>' +
        '</div>' +
        '<div class="modal-body"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();   // 点遮罩空白关闭
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();      // Esc 关闭
    });
    return overlay;
  }

  function closeModal() {
    var overlay = document.getElementById('assetRankModal');
    if (overlay) overlay.classList.remove('open');
  }

  /* 从排行面板采集数据（自动跳过无缝循环复制项：按 rank 去重） */
  function collectRows(panel) {
    var items = panel.querySelectorAll('.company-item');
    var seen = {}, rows = [];
    Array.prototype.forEach.call(items, function (it) {
      var rankEl = it.querySelector('.rank');
      var rank = rankEl ? rankEl.textContent.trim() : '';
      if (!rank || seen[rank]) return;           // 跳过重复序号（循环复制）
      seen[rank] = true;

      var nameEl = it.querySelector('.c-info .name');
      var subEl = it.querySelector('.c-info .sub');
      var valEl = it.querySelector('.val');
      var val = '', unit = '';
      if (valEl) {
        // .val 文本形如 "8,652" + <small>万</small>
        var txt = '';
        Array.prototype.forEach.call(valEl.childNodes, function (n) {
          if (n.nodeType === 3) txt += n.textContent;   // 仅取文本节点
        });
        val = txt.trim();
        var small = valEl.querySelector('small');
        unit = small ? small.textContent : '';
      }
      var topMatch = it.className.match(/top(\d)/);
      rows.push({
        rank: rank,
        name: nameEl ? nameEl.textContent.trim() : '',
        sub: subEl ? subEl.textContent.trim() : '',
        val: val,
        unit: unit,
        top: topMatch ? topMatch[1] : ''
      });
    });
    return rows;
  }

  function openModal(title, en, rows) {
    var overlay = buildModal();
    overlay.querySelector('.m-title').textContent = title || '资产收入公司排行榜';
    overlay.querySelector('.m-en').textContent = en || 'COMPANY RANKING';

    var html = '<table class="rank-table"><thead><tr>' +
      '<th class="r-no">排名</th><th>公司名称</th><th>说明</th><th class="r-val">资产价值</th>' +
      '</tr></thead><tbody>';

    if (!rows.length) {
      html += '<tr><td colspan="4" class="r-sub" style="text-align:center;padding:24px 0;">暂无数据</td></tr>';
    } else {
      rows.forEach(function (r) {
        var badgeCls = r.top ? (' top' + r.top) : '';
        html += '<tr>' +
          '<td class="r-no"><span class="rank-badge' + badgeCls + '">' + r.rank + '</span></td>' +
          '<td>' + r.name + '</td>' +
          '<td class="r-sub">' + (r.sub || '') + '</td>' +
          '<td class="r-val">' + r.val + (r.unit ? '<small>' + r.unit + '</small>' : '') + '</td>' +
          '</tr>';
      });
    }
    html += '</tbody></table>';
    overlay.querySelector('.modal-body').innerHTML = html;
    overlay.classList.add('open');
  }

  /* ===== 资产明细表弹窗（点击主体如“海恒控股”触发） =====
     原型 5 条数据；后续可替换为“按主体查询”的接口数据（结构保持一致即可）。 */
  var ASSET_DETAIL_ROWS = [
    { code:'ZC001', name:'南宁总部大楼', type:'不动产',   area:50000,  value:8000,  status:'在租' },
    { code:'ZC002', name:'柳州工业园A区', type:'固定资产', area:120000, value:15000, status:'自用' },
    { code:'ZC003', name:'桂林度假村',   type:'不动产',   area:35000,  value:6000,  status:'在租' },
    { code:'ZC004', name:'北海港口仓库', type:'固定资产', area:80000,  value:12000, status:'在租' },
    { code:'ZC005', name:'钦州物流园',   type:'公共设施', area:45000,  value:9000,  status:'经营中' }
  ];

  /* 千分位分隔符：50000 -> 50,000 */
  function fmtNum(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* 状态 -> 语义化 class（在租/自用/经营中 区分，便于后续配置样式） */
  function statusClass(s) {
    var map = { '在租':'rent', '自用':'self', '经营中':'operating' };
    return 'st-' + (map[(s || '').replace(/\s/g, '')] || 'other');
  }

  /* 打开资产明细表：标题动态为  name + ' - 资产明细表' */
  function openAssetDetail(name, rows) {
    var overlay = buildModal();
    overlay.querySelector('.m-title').textContent = (name || '主体') + ' - 资产明细表';
    overlay.querySelector('.m-en').textContent = 'ASSET DETAIL';

    var html = '<table class="asset-table"><thead><tr>' +
      '<th class="c-code">资产编号</th>' +
      '<th class="c-name">资产名称</th>' +
      '<th class="c-type">资产类型</th>' +
      '<th class="c-area">面积(㎡)</th>' +
      '<th class="c-val">价值(万元)</th>' +
      '<th class="c-status">状态</th>' +
      '</tr></thead><tbody>';

    if (!rows || !rows.length) {
      html += '<tr><td colspan="6" class="r-sub" style="text-align:center;padding:24px 0;">暂无数据</td></tr>';
    } else {
      rows.forEach(function (r) {
        html += '<tr>' +
          '<td class="c-code">' + r.code + '</td>' +
          '<td class="c-name">' + r.name + '</td>' +
          '<td class="c-type">' + r.type + '</td>' +
          '<td class="c-area">' + fmtNum(r.area) + '</td>' +
          '<td class="c-val">' + fmtNum(r.value) + '</td>' +
          '<td class="c-status"><span class="status-pill ' + statusClass(r.status) + '">' + r.status + '</span></td>' +
          '</tr>';
      });
    }
    html += '</tbody></table>';
    overlay.querySelector('.modal-body').innerHTML = html;
    overlay.classList.add('open');
  }

  ready(function () {
    buildModal();
    /* 事件委托：点击任何 [data-modal] 元素（含其内部的主体/条目）都触发弹窗。
       相比逐元素直绑，委托可抵御面板 DOM 被脚本重建后仍失效的问题，
       且天然对所有 dashboard 页面一致生效。 */
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-modal]');
      if (!trigger) return;
      var type = trigger.getAttribute('data-modal');
      if (type === 'ranking') {
        var panel = trigger.closest('.panel') || trigger;
        var titleEl = panel.querySelector('.panel-title .name');
        var enEl = panel.querySelector('.panel-title .en');
        openModal(titleEl ? titleEl.textContent : '', enEl ? enEl.textContent : '', collectRows(panel));
      } else if (type === 'asset-detail') {
        var name = trigger.getAttribute('data-name') ||
                   (trigger.textContent ? trigger.textContent.trim() : '');
        openAssetDetail(name, ASSET_DETAIL_ROWS);
      }
    });
  });
})();
