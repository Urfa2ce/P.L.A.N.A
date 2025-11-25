const IMG_PATH = "src/"; 
const DEFAULT_IMG = "marieyon.png";
const AP_ICON_PATH = "src/ui/Currency_Icon_AP.png";

let currencyIcons = []; 
let tabMap = [];        
let itemMap = {}; 
let shopConfig = [];    
let stageConfig = [];   

let studentData = []; 
let currentTab = 0;
let tabTotals = [0, 0, 0];
let globalCurrentAmounts = [0, 0, 0];

let selectedStudents = new Set(); 
let activeRoles = new Set(['STRIKER', 'SPECIAL']); 

// [NEW] 현재 선택된 보너스 필터 (-1: 없음, 0~2: 해당 인덱스 재화 필터)
let activeBonusFilter = -1;

// ============================================================
// 2. 데이터 로딩
// ============================================================
async function loadDataAndInit() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`data.json load failed`);
        const data = await response.json();

        if (data.eventSettings) {
            currencyIcons = data.eventSettings.currencyIcons || [];
            tabMap = data.eventSettings.tabMap || [0, 1, 2];
        }

        itemMap = data.itemMap || {};
        shopConfig = data.shopConfig;
        stageConfig = data.stageConfig;

        try {
            const charRes = await fetch('characters.json');
            if (charRes.ok) {
                const rawChars = await charRes.json();
                const bonusMap = data.studentBonuses || {};
                
                studentData = rawChars.map(char => {
                    const eventBonus = bonusMap[char.name] || [0, 0, 0];
                    return { ...char, bonus: eventBonus };
                });
            }
        } catch (e) { console.error(e); }

        initTabs();      
        initShop();      
        initStageFilters(); 
        initStudentBonus(); 
        initDropTable(); 
        updateBonusDashboardIcons();
        calculate();     

    } catch (error) {
        console.error(error);
        alert("Live Server 확인 필요");
    }
}

function updateBonusDashboardIcons() {
    for(let i=0; i<3; i++) {
        const dropIdx = tabMap[i]; 
        const iconEl = document.getElementById(`bd-icon-${i}`);
        if(iconEl && currencyIcons[dropIdx]) {
            iconEl.src = IMG_PATH + currencyIcons[dropIdx];
            iconEl.style.display = 'block';
        }
    }
}

// ============================================================
// 3. 학생 보너스 & 현황판 로직 (핵심 기능 추가됨)
// ============================================================

// [NEW] 상단 재화 아이콘 클릭 시 필터링 토글
window.toggleBonusFilter = function(filterIdx) {
    // 이미 선택된 걸 다시 누르면 해제 (-1)
    if (activeBonusFilter === filterIdx) {
        activeBonusFilter = -1;
    } else {
        activeBonusFilter = filterIdx;
    }
    
    // UI 갱신 (선택된 아이템에 파란 테두리)
    for(let i=0; i<3; i++) {
        const item = document.getElementById(`bd-item-${i}`);
        if (i === activeBonusFilter) item.classList.add('active');
        else item.classList.remove('active');
    }

    // 학생 목록 다시 그리기
    initStudentBonus();
}

// 역할군 필터 (STRIKER / SPECIAL)
window.toggleRoleFilter = function(role, btn) {
    // 재화 필터가 켜져있으면 역할군 필터는 동작 안 하게 막거나, 
    // 혹은 같이 동작하게 할 수 있음. 여기선 '같이 동작'하도록 둠.
    if (activeRoles.has(role)) {
        activeRoles.delete(role);
        btn.classList.remove('active');
    } else {
        activeRoles.add(role);
        btn.classList.add('active');
    }
    initStudentBonus();
}

function initStudentBonus() {
    const grid = document.getElementById('student-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!studentData.length) {
        grid.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">데이터 로딩중</p>';
        return;
    }

    // [핵심] 어떤 보너스 수치를 보여줄 것인가?
    // 재화 필터가 켜져있으면 그 재화 기준, 아니면 현재 상점 탭 기준
    const isFiltering = (activeBonusFilter !== -1);
    const targetBonusIdx = isFiltering ? activeBonusFilter : currentTab;

    // 1. 필터링 로직
    const filtered = studentData.filter(student => {
        // (1) 재화 필터가 켜져있다면? -> 해당 보너스가 0보다 큰 학생만 통과
        if (isFiltering) {
            const bonusVal = Array.isArray(student.bonus) ? (student.bonus[targetBonusIdx] || 0) : student.bonus;
            return bonusVal > 0;
        }
        // (2) 꺼져있다면? -> 기존 역할군(Striker/Special) 필터 적용
        return (!student.role || activeRoles.has(student.role));
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#999; font-size:0.8rem; grid-column:1/-1; text-align:center; padding:20px;">해당하는 학생이 없습니다.</p>';
        return;
    }

    // 2. 카드 생성
    filtered.forEach(student => {
        const originalIdx = studentData.indexOf(student);
        const card = document.createElement('div');
        card.className = 'student-card';
        if (selectedStudents.has(originalIdx)) card.classList.add('selected');
        
        card.onclick = () => toggleStudent(originalIdx, card);

        // 표시할 보너스 수치 가져오기
        let displayBonus = 0;
        if(Array.isArray(student.bonus)) {
            displayBonus = student.bonus[targetBonusIdx] || 0;
        } else {
            displayBonus = student.bonus || 0;
        }

        const imgSrc = student.img ? (IMG_PATH + student.img) : DEFAULT_IMG;
        card.innerHTML = `
            <div class="card-inner">
                <img src="${imgSrc}" class="student-img" onerror="this.src='${DEFAULT_IMG}'">
                <div class="check-badge">✔</div>
            </div>
            <div class="bonus-tag-bar">+${displayBonus}%</div>
        `;
        grid.appendChild(card);
    });
}

window.toggleStudent = function(idx, card) {
    if (selectedStudents.has(idx)) {
        selectedStudents.delete(idx);
        card.classList.remove('selected');
    } else {
        selectedStudents.add(idx);
        card.classList.add('selected');
    }
    updateTotalBonus();
}

function updateTotalBonus() {
    let totals = [0, 0, 0];

    selectedStudents.forEach(idx => {
        const s = studentData[idx];
        if(s) {
            if(Array.isArray(s.bonus)) {
                totals[0] += (s.bonus[0] || 0);
                totals[1] += (s.bonus[1] || 0);
                totals[2] += (s.bonus[2] || 0);
            } else {
                totals[0] += s.bonus;
                totals[1] += s.bonus;
                totals[2] += s.bonus;
            }
        }
    });

    // 현황판 갱신
    for(let i=0; i<3; i++) {
        const valEl = document.getElementById(`bd-val-${i}`);
        if(valEl) valEl.innerText = totals[i] + "%";
    }

    // 메인 입력칸 갱신 (현재 탭 기준)
    const mainInput = document.getElementById('bonusRate');
    if(mainInput) mainInput.value = totals[currentTab];

    calculate();
}

window.toggleStudentSelector = function() {
    const box = document.getElementById('studentSelectorBox');
    const icon = document.getElementById('studentToggleIcon');
    if (box.classList.contains('hidden')) {
        box.classList.remove('hidden');
        icon.innerText = "▲";
    } else {
        box.classList.add('hidden');
        icon.innerText = "▼";
    }
}

// ============================================================
// 4. 탭 및 상점 로직
// ============================================================
function initTabs() {
    const con = document.querySelector('.shop-tabs');
    con.innerHTML = '';
    for(let i=0; i<3; i++) {
        const icon = (currencyIcons[tabMap[i]]) ? IMG_PATH+currencyIcons[tabMap[i]] : DEFAULT_IMG;
        const div = document.createElement('div');
        div.className = `tab-btn ${i===currentTab?'active':''}`;
        div.onclick = () => switchTab(i);
        div.innerHTML = `<img src="${icon}" class="tab-icon"> 상점 ${i+1}`;
        con.appendChild(div);
    }
}

function initShop() { 
    const c = document.getElementById('shop-container'); c.innerHTML = '';
    for(let i=0; i<3; i++) {
        const sec = document.createElement('div'); sec.className = `shop-section ${i===0?'active':''}`; sec.id = `section-${i}`;
        (shopConfig[i]||[]).forEach(d => {
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

function initStageFilters() {
    const c = document.getElementById('stage-filter-container'); c.innerHTML = '';
    stageConfig.forEach((s, i) => {
        const d = document.createElement('div');
        d.innerHTML = `<input type="checkbox" id="f-${i}" class="filter-check-input" value="${i}" checked onchange="calculate()">
        <label for="f-${i}" class="filter-label">${s.name}</label>`;
        c.appendChild(d);
    });
}
window.toggleAllStages = (state) => { document.querySelectorAll('.filter-check-input').forEach(el => el.checked = state); calculate(); }
window.syncValues = (el, type, sIdx) => {
    const p = el.closest('.control-row'); const r = p.querySelector('.range-input'); const n = p.querySelector('.qty-input-sm');
    const card = el.closest('.item-card'); const chk = card.querySelector('.item-checkbox');
    let v = parseInt(el.value)||0; if(v > parseInt(r.max)) v = parseInt(r.max);
    r.value = v; n.value = v;
    if(v>0 && !chk.disabled) { chk.checked = true; card.classList.add('selected'); }
    else if(v===0) { chk.checked = false; card.classList.remove('selected'); }
    updateTotal(sIdx);
}
window.updateTotal = (sIdx) => {
    const sec = document.getElementById(`section-${sIdx}`); let sum = 0;
    sec.querySelectorAll('.item-card').forEach(c => {
        if(c.querySelector('.item-checkbox').checked) {
            sum += (parseInt(c.querySelector('.cost-input').value)||0) * (parseInt(c.querySelector('.qty-input-sm').value)||0);
            c.classList.add('selected');
        } else c.classList.remove('selected');
    });
    tabTotals[sIdx] = sum;
    if(currentTab===sIdx) document.getElementById('targetAmount').value = sum;
    calculate();
}
window.switchTab = function(idx) {
    currentTab = idx;
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    document.querySelectorAll('.shop-section').forEach((s, i) => s.classList.toggle('active', i === idx));
    document.getElementById('targetAmount').value = tabTotals[idx];
    document.getElementById('currentAmount').value = globalCurrentAmounts[idx];
    
    // 탭 변경 시 필터 초기화 (사용자 편의상)
    activeBonusFilter = -1;
    for(let i=0; i<3; i++) document.getElementById(`bd-item-${i}`).classList.remove('active');
    
    initStudentBonus(); 
    updateTotalBonus();
}
window.manualTarget = (v) => { tabTotals[currentTab] = parseInt(v)||0; calculate(); }
window.updateCurrent = (v) => { globalCurrentAmounts[currentTab] = parseInt(v)||0; calculate(); }
window.toggleApWidget = () => {
    const b = document.getElementById('apIconBtn'); const p = document.getElementById('apPopup');
    if(p.classList.contains('hidden')) { p.classList.remove('hidden'); b.style.display='none'; }
    else { p.classList.add('hidden'); b.style.display='flex'; }
}
window.adjustAp = (d) => { const i = document.getElementById('curAp'); let v = (parseInt(i.value)||0)+d; if(v<0)v=0; if(v>240)v=240; i.value=v; calcAp(); }
window.calcAp = () => {
    const c = parseInt(document.getElementById('curAp').value); const r = document.getElementById('apResult');
    if(isNaN(c)) { r.innerText="AP 입력"; return; }
    if(c>=240) { r.innerText="Full!"; return; }
    const m = (240-c)*6; const h = Math.floor(m/60); const mn = m%60;
    const d = new Date(new Date().getTime()+m*60000);
    r.innerHTML = `<strong>${h}시간 ${mn}분</strong><br><span style='color:#128CFF'>${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} 완료</span>`;
}

// ============================================================
// 5. 핵심 효율 계산
// ============================================================
window.calculate = function() {
    const needs = [0, 0, 0];
    for(let i=0; i<3; i++) {
        needs[i] = Math.max(0, tabTotals[i] - globalCurrentAmounts[i]);
    }

    if (needs.every(n => n === 0)) {
        displayResult(null, 0, 0, [], 0, true);
        return;
    }

    const bonusVal = parseInt(document.getElementById('bonusRate').value) || 0;
    let bestStage = null;
    let maxEff = -1; 
    let bestGains = [];

    stageConfig.forEach((stage, idx) => {
        const chk = document.querySelector(`.filter-check-input[value="${idx}"]`);
        if (chk && !chk.checked) return;

        let totalGain = 0;
        let currentStageGains = [];

        if(stage.drops) {
            stage.drops.forEach((base, dIdx) => {
                let gain = 0;
                if (base > 0) {
                    const bonusAmt = Math.ceil(base * (bonusVal / 100));
                    gain = base + bonusAmt;
                    
                    const relatedTab = tabMap.indexOf(dIdx);
                    if (relatedTab !== -1 && needs[relatedTab] > 0) {
                        totalGain += gain;
                    }
                }
                currentStageGains[dIdx] = gain;
            });
        }

        const eff = totalGain / stage.ap;
        if (eff > maxEff) {
            maxEff = eff;
            bestStage = stage;
            bestGains = currentStageGains;
        }
    });

    if (!bestStage || maxEff <= 0) {
        displayResult(null);
        return;
    }

    let maxRuns = 0;
    for(let i=0; i<3; i++) {
        const dropIdx = tabMap[i];
        const gain = bestGains[dropIdx] || 0;
        const need = needs[i];
        if (need > 0 && gain > 0) {
            const runs = Math.ceil(need / gain);
            if (runs > maxRuns) maxRuns = runs;
        }
    }

    const totalAp = maxRuns * bestStage.ap;
    const curDropIdx = tabMap[currentTab];
    const curGain = bestGains[curDropIdx] || 0;
    const farmed = curGain * maxRuns;
    const surplus = farmed - needs[currentTab];

    displayResult(bestStage, maxRuns, totalAp, bestGains, surplus);
    initDropTable();
}

function displayResult(stage, runs, ap, gains, surplus, isDone=false) {
    const nameEl = document.getElementById('recStageName');
    const infoEl = document.getElementById('recStageInfo');
    const runsEl = document.getElementById('result-runs');
    const apEl = document.getElementById('result-ap');
    let surEl = document.getElementById('result-surplus');
    const bonusVal = parseInt(document.getElementById('bonusRate').value) || 0;

    if (!surEl) {
        const box = document.querySelector('.result-box');
        surEl = document.createElement('div');
        surEl.id = 'result-surplus';
        surEl.className = 'res-surplus-sm';
        box.appendChild(surEl);
    }

    if(isDone) {
        nameEl.innerText = "계산 대기중"; nameEl.style.color = "#128CFF";
        infoEl.innerText = "-"; runsEl.innerText = "0회"; apEl.innerText = "-";
        surEl.innerHTML = ""; return;
    }
    if(!stage) {
        nameEl.innerText = "추천 불가"; nameEl.style.color = "#FF5555";
        infoEl.innerText = "-"; runsEl.innerText = "-"; apEl.innerText = "-";
        surEl.innerHTML = ""; return;
    }

    nameEl.innerText = stage.name;
    
    let html = [];
    stage.drops.forEach((base, i) => {
        if(base > 0) {
            const icon = (currencyIcons[i]) ? IMG_PATH+currencyIcons[i] : DEFAULT_IMG;
            const bonusAmt = Math.ceil(base * (bonusVal/100));
            
            html.push(`
                <span class="gain-item">
                    <img src="${icon}" class="mini-icon"> <b>x${base}</b>
                </span>
            `);
            
            if(bonusAmt > 0) {
                html.push(`
                    <span class="gain-item">
                        <span class="bonus-badge">Bonus</span>
                        <img src="${icon}" class="mini-icon"> <b>+${bonusAmt}</b>
                    </span>
                `);
            }
        }
    });

    infoEl.innerHTML = html.join('');
    runsEl.innerText = runs + "회";
    
    apEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
            <img src="${AP_ICON_PATH}" style="width:35px; height:35px; object-fit:contain;">
            <span>${ap.toLocaleString()+"AP"}</span>
        </div>
    `;

    if(surplus > 0) {
        const icon = (currencyIcons[tabMap[currentTab]]) ? IMG_PATH+currencyIcons[tabMap[currentTab]] : DEFAULT_IMG;
        surEl.innerHTML = `⚠️ <img src="${icon}" class="mini-icon-white" style="width:35px;height:35px"> ${surplus}개 초과 획득 예상`;
    } else {
        surEl.innerHTML = "";
    }
}

function initDropTable() {
    const container = document.getElementById('drop-table-list');
    if (!container) return;
    container.innerHTML = '';
    const bonusVal = parseInt(document.getElementById('bonusRate').value) || 0;
    
    stageConfig.forEach(stage => {
        const row = document.createElement('div');
        row.className = 'stage-row';
        let html = '';
        
        if(stage.drops) {
            stage.drops.forEach((base, i) => {
                if(base > 0) {
                    const icon = (currencyIcons[i]) ? IMG_PATH+currencyIcons[i] : DEFAULT_IMG;
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

window.addEventListener('DOMContentLoaded', loadDataAndInit);