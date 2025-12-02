// ui.js
import { IMG_PATH, DEFAULT_IMG, AP_ICON_PATH } from './constants.js';
import { state } from './store.js';
import { calculate, updateTotalBonus, calcAp } from './calc.js';

export function updateBonusDashboardIcons() {
    for(let i=0; i<3; i++) {
        const displayIdx = state.bonusDashboardIcons[i];
        const iconEl = document.getElementById(`bd-icon-${i}`);
        if(iconEl && state.currencyIcons[displayIdx]) {
            iconEl.src = IMG_PATH + state.currencyIcons[displayIdx];
            iconEl.style.display = 'block';
        }
    }
}

export function initAcademyFilter() {
    const select = document.getElementById('academyFilter');
    if (!select) return;
    select.innerHTML = '<option value="ALL">전체 학원 보기</option>';
    const academies = new Set();
    state.studentData.forEach(s => { if (s.academy) academies.add(s.academy); });
    const sorted = Array.from(academies).sort();
    sorted.forEach(ac => {
        const opt = document.createElement('option');
        opt.value = ac; opt.text = ac;
        select.appendChild(opt);
    });
}

export function toggleBonusFilter(filterIdx) {
    if (state.activeBonusFilter === filterIdx) state.activeBonusFilter = -1;
    else state.activeBonusFilter = filterIdx;
    
    for(let i=0; i<3; i++) {
        const item = document.getElementById(`bd-item-${i}`);
        if (i === state.activeBonusFilter) item.classList.add('active');
        else item.classList.remove('active');
    }
    initStudentBonus();
}

export function toggleRoleFilter(role, btn) {
    if (state.activeRoles.has(role)) { state.activeRoles.delete(role); btn.classList.remove('active'); }
    else { state.activeRoles.add(role); btn.classList.add('active'); }
    initStudentBonus();
}

export function initStudentBonus() {
    const grid = document.getElementById('student-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!state.studentData.length) {
        grid.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">데이터 로딩중</p>';
        return;
    }

    const isFiltering = (state.activeBonusFilter !== -1);
    const targetBonusIdx = isFiltering ? state.activeBonusFilter : state.currentTab;

    let filtered = state.studentData.filter(student => {
        if (isFiltering) {
            const b = Array.isArray(student.bonus) ? (student.bonus[targetBonusIdx]||0) : student.bonus;
            if (b <= 0) return false;
        }
        if (!(!student.role || state.activeRoles.has(student.role))) return false;
        if (state.currentAcademy !== "ALL" && student.academy !== state.currentAcademy) return false;
        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#999; font-size:0.8rem; grid-column:1/-1; text-align:center; padding:20px;">해당하는 학생이 없습니다.</p>';
        return;
    }

    filtered.sort((a, b) => {
        const valA = Array.isArray(a.bonus) ? (a.bonus[targetBonusIdx]||0) : a.bonus;
        const valB = Array.isArray(b.bonus) ? (b.bonus[targetBonusIdx]||0) : b.bonus;
        return valB - valA;
    });

    filtered.forEach(student => {
        const originalIdx = state.studentData.indexOf(student);
        const card = document.createElement('div');
        card.className = 'student-card';
        if (state.selectedStudents.has(originalIdx)) card.classList.add('selected');
        
        card.onclick = () => toggleStudent(originalIdx, card);

        let displayBonus = 0;
        if(Array.isArray(student.bonus)) {
            displayBonus = student.bonus[targetBonusIdx] || 0;
        } else {
            displayBonus = student.bonus || 0;
        }

        const imgSrc = student.img ? (IMG_PATH + student.img) : DEFAULT_IMG;
        const bonusText = isFiltering ? `+${displayBonus}%` : '';
        const barStyle = isFiltering ? '' : 'display:none;';

        card.innerHTML = `
            <div class="card-inner">
                <img src="${imgSrc}" class="student-img" onerror="this.src='${DEFAULT_IMG}'">
                <div class="check-badge">✔</div>
            </div>
            <div class="bonus-tag-bar" style="${barStyle}">${bonusText}</div>
        `;
        grid.appendChild(card);
    });
}

export function toggleStudent(idx, card) {
    if (state.selectedStudents.has(idx)) { state.selectedStudents.delete(idx); card.classList.remove('selected'); }
    else { state.selectedStudents.add(idx); card.classList.add('selected'); }
    updateTotalBonus();
}

export function toggleStudentSelector() {
    const box = document.getElementById('studentSelectorBox');
    const icon = document.getElementById('studentToggleIcon');
    if (box.classList.contains('hidden')) { box.classList.remove('hidden'); icon.innerText = "▲"; }
    else { box.classList.add('hidden'); icon.innerText = "▼"; }
}

export function initTabs() {
    const con = document.querySelector('.shop-tabs');
    con.innerHTML = '';
    for(let i=0; i<3; i++) {
        const displayIdx = (state.shopTabIcons && state.shopTabIcons.length > i) ? state.shopTabIcons[i] : state.tabMap[i];
        const icon = (state.currencyIcons[displayIdx]) ? IMG_PATH + state.currencyIcons[displayIdx] : DEFAULT_IMG;
        
        const div = document.createElement('div');
        div.className = `tab-btn ${i===state.currentTab?'active':''}`;
        div.onclick = () => switchTab(i);
        div.innerHTML = `<img src="${icon}" class="tab-icon"> 상점 ${i+1}`;
        con.appendChild(div);
    }
}

export function initShop() { 
    const c = document.getElementById('shop-container'); c.innerHTML = '';
    for(let i=0; i<3; i++) {
        const sec = document.createElement('div'); sec.className = `shop-section ${i===0?'active':''}`; sec.id = `section-${i}`;
        (state.shopConfig[i]||[]).forEach(d => {
            const card = document.createElement('div'); card.className = `item-card ${d.qty===0?'disabled':''}`;
            const img = d.img ? IMG_PATH+d.img : DEFAULT_IMG;
            const badge = d.qty===-1 ? 'limit-badge unlimited' : 'limit-badge';
            const bText = d.qty===-1 ? '구매제한: ∞' : `구매제한: ${d.qty}회`;
            const max = d.qty===-1 ? 99 : d.qty;
            card.innerHTML = `
                <input type="checkbox" class="item-checkbox" onchange="updateTotal(${i})">
                <div class="card-top"><span class="item-name">${d.name}</span>
                <div class="img-box"><img src="${img}"></div><span class="${badge}">${bText}</span>
                <div class="price-tag">Cost <strong>${d.price}</strong></div></div>
                <input type="hidden" class="cost-input" value="${d.price}">
                <div class="control-row"><input type="range" class="range-input" min="0" max="${max}" value="0" oninput="syncValues(this,'range',${i})">
                <input type="number" class="qty-input-sm" min="0" max="${max}" value="0" oninput="syncValues(this,'num',${i})"></div>
            `;
            card.addEventListener('click', (e)=>{ if(e.target.tagName!=='INPUT'){
                const chk = card.querySelector('.item-checkbox'); 
                if(!chk.disabled){ chk.checked=!chk.checked; updateTotal(i); }
            }});
            sec.appendChild(card);
        });
        c.appendChild(sec);
    }
}

export function initStageFilters() {
    const c = document.getElementById('stage-filter-container'); c.innerHTML = '';
    state.stageConfig.forEach((s, i) => {
        const d = document.createElement('div');
        d.innerHTML = `<input type="checkbox" id="f-${i}" class="filter-check-input" value="${i}" checked onchange="calculate()">
        <label for="f-${i}" class="filter-label">${s.name}</label>`;
        c.appendChild(d);
    });
}

export function toggleAllStages(val) { 
    document.querySelectorAll('.filter-check-input').forEach(el => el.checked = val); 
    calculate(); 
}

export function syncValues(el, type, sIdx) {
    const p = el.closest('.control-row'); const r = p.querySelector('.range-input'); const n = p.querySelector('.qty-input-sm');
    const card = el.closest('.item-card'); const chk = card.querySelector('.item-checkbox');
    let v = parseInt(el.value)||0; if(v > parseInt(r.max)) v = parseInt(r.max);
    r.value = v; n.value = v;
    if(v>0 && !chk.disabled) { chk.checked = true; card.classList.add('selected'); }
    else if(v===0) { chk.checked = false; card.classList.remove('selected'); }
    updateTotal(sIdx);
}

export function updateTotal(sIdx) {
    const sec = document.getElementById(`section-${sIdx}`); let sum = 0;
    sec.querySelectorAll('.item-card').forEach(c => {
        if(c.querySelector('.item-checkbox').checked) {
            sum += (parseInt(c.querySelector('.cost-input').value)||0) * (parseInt(c.querySelector('.qty-input-sm').value)||0);
            c.classList.add('selected');
        } else c.classList.remove('selected');
    });
    state.tabTotals[sIdx] = sum;
    if(state.currentTab===sIdx) document.getElementById('targetAmount').value = sum;
    calculate();
}

export function switchTab(idx) {
    state.currentTab = idx;
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    document.querySelectorAll('.shop-section').forEach((s, i) => s.classList.toggle('active', i === idx));
    document.getElementById('targetAmount').value = state.tabTotals[idx];
    document.getElementById('currentAmount').value = state.globalCurrentAmounts[idx];
    initStudentBonus(); 
    updateTotalBonus();
}

export function manualTarget(v) { state.tabTotals[state.currentTab] = parseInt(v)||0; calculate(); }
export function updateCurrent(v) { state.globalCurrentAmounts[state.currentTab] = parseInt(v)||0; calculate(); }

export function toggleApWidget() {
    const b = document.getElementById('apIconBtn'); const p = document.getElementById('apPopup');
    if(p.classList.contains('hidden')) { p.classList.remove('hidden'); b.style.display='none'; }
    else { p.classList.add('hidden'); b.style.display='flex'; }
}

export function displayResult(results, surplusArray) {
    const nameEl = document.getElementById('recStageName');
    const infoEl = document.getElementById('recStageInfo');
    const runsEl = document.getElementById('result-runs');
    const apEl = document.getElementById('result-ap');
    let surEl = document.getElementById('result-surplus');

    if (!surEl) {
        const box = document.querySelector('.result-box');
        if(box) {
            surEl = document.createElement('div');
            surEl.id = 'result-surplus';
            surEl.className = 'res-surplus-sm';
            surEl.style.marginTop = '10px';
            surEl.style.fontSize = '0.85rem';
            surEl.style.color = '#ffaa00';
            box.appendChild(surEl);
        }
    }

    if (!results || results.length === 0) {
        if(results === null) {
             nameEl.innerText = "추천 불가 (필터 확인)";
             nameEl.style.color = "#FF5555";
        } else {
             nameEl.innerText = "목표 달성 완료";
             nameEl.style.color = "#128CFF";
        }
        infoEl.innerText = "-";
        runsEl.innerText = "-";
        apEl.innerText = "0";
        if(surEl) surEl.innerHTML = "";
        return;
    }

    let totalAp = 0;
    let totalRuns = 0;
    
    let listHtml = `<div style="display:flex; flex-direction:column; gap:8px; width:100%;">`;
    
    results.forEach(res => {
        totalRuns += res.runCount;
        totalAp += (res.runCount * res.ap);

        let dropIcons = '';
        res.data.drops.forEach((base, idx) => {
            if(base > 0 && state.currencyIcons[idx]) {
                dropIcons += `<img src="${IMG_PATH + state.currencyIcons[idx]}" style="width:35px; margin-right:2px; vertical-align:middle;">`;
            }
        });

        listHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:6px 10px; border-radius:4px;">
                <div style="text-align:left;">
                    <div style="font-weight:bold; font-size:0.95rem;">${res.data.name}</div>
                    <div style="font-size:0.8rem; opacity:0.7;">${dropIcons}</div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#128CFF; font-weight:bold;">${res.runCount}회</div>
                    <div style="font-size:0.8rem; color:#aaa;">${(res.runCount * res.ap).toLocaleString()} AP</div>
                </div>
            </div>
        `;
    });
    listHtml += `</div>`;

    nameEl.innerText = "추천 파밍 스테이지";
    nameEl.style.color = "#2c2c2cff";
    infoEl.style.justifyContent = 'normal'; 
    infoEl.innerHTML = listHtml;
    runsEl.innerText = `총 ${totalRuns}회`;
    apEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:4px; color:#ffdd55;">
            <img src="${AP_ICON_PATH}" style="width:16px; height:16px; object-fit:contain;">
            <span>${totalAp.toLocaleString()}</span>
        </div>
    `;

    let surplusHtml = [];
    if(surplusArray) {
        surplusArray.forEach((amt, idx) => {
            if(amt > 0) {
                 const displayIdx = state.tabDisplayMap[idx];
                 const icon = (state.currencyIcons[displayIdx]) ? IMG_PATH + state.currencyIcons[displayIdx] : DEFAULT_IMG;
                 surplusHtml.push(`<span style="margin-right:8px;"><img src="${icon}" style="width:12px; vertical-align:middle"> +${amt}</span>`);
            }
        });
    }

    if(surEl) {
        if(surplusHtml.length > 0) {
            surEl.innerHTML = `⚠️ 남는 재화: ` + surplusHtml.join('');
        } else {
            surEl.innerHTML = `<span style="color:#66cc66">딱코!</span>`;
        }
    }
}

export function initDropTable() {
    const container = document.getElementById('drop-table-list');
    if (!container) return;
    container.innerHTML = '';
    const bonusVal = parseInt(document.getElementById('bonusRate').value) || 0;
    
    state.stageConfig.forEach(stage => {
        const row = document.createElement('div');
        row.className = 'stage-row';
        let html = '';
        
        if(stage.drops) {
            stage.drops.forEach((base, i) => {
                if(base > 0) {
                    const icon = (state.currencyIcons[i]) ? IMG_PATH+state.currencyIcons[i] : DEFAULT_IMG;
                    const bonusAmt = Math.ceil(base * (bonusVal/100));
                    
                    html += `
                        <div class="drop-badge">
                            <img src="${icon}">
                            <span>x${base}</span>
                        </div>
                    `;

                    if(bonusAmt > 0) {
                        html += `
                            <div class="drop-badge bonus-drop">
                                <span class="table-bonus-badge">Bonus</span>
                                <img src="${icon}">
                                <span>+${bonusAmt}</span>
                            </div>
                        `;
                    }
                }
            });
        }
        row.innerHTML = `
            <div class="stage-info">
                <div class="stage-title">${stage.name}</div>
                <div class="stage-ap-badge">
                    <img src="${AP_ICON_PATH}">
                    ${stage.ap}
                </div>
            </div>
            <div class="base-area"></div>
            <div class="bonus-area">${html}</div>
        `;
        container.appendChild(row);
    });
}