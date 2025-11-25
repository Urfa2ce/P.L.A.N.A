// ============================================================
// 1. 전역 변수 및 설정
// ============================================================
const IMG_PATH = "src/"; 
const DEFAULT_IMG = "marieyon.png";
const AP_ICON_PATH = "src/ui/Currency_Icon_AP.png";

let currencyIcons = []; 
let tabMap = []; 
let shopTabIcons = [];       
let bonusDashboardIcons = []; 
     
let tabDisplayMap = []; 
let itemMap = {}; 
let shopConfig = [];    
let stageConfig = [];   

let studentData = []; 
let currentTab = 0;
let tabTotals = [0, 0, 0];
let globalCurrentAmounts = [0, 0, 0];

let selectedStudents = new Set(); 
let activeRoles = new Set(['STRIKER', 'SPECIAL']); 
let activeBonusFilter = -1;
let currentAcademy = "ALL";

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
            tabMap = data.eventSettings.tabMap || [0, 1, 3];
            tabDisplayMap = data.eventSettings.tabDisplayMap || tabMap;
            shopTabIcons = data.eventSettings.shopTabIcons || [1, 2, 3];
            bonusDashboardIcons = data.eventSettings.bonusDashboardIcons || [0, 1, 2];
        }

        itemMap = data.itemMap || {};
        shopConfig = data.shopConfig;
        stageConfig = data.stageConfig;

        try {
            const charRes = await fetch('characters.json');
            if (charRes.ok) {
                const rawChars = await charRes.json();
                const bonusMap = data.studentBonuses || {};
                
                // [수정됨] data.json에 정의된 학생만 필터링해서 로드
                studentData = rawChars
                    .filter(char => bonusMap.hasOwnProperty(char.name)) // 보너스 목록에 있는 이름만 통과
                    .map(char => {
                        return { ...char, bonus: bonusMap[char.name] };
                    });
            }
        } catch (e) { console.error(e); }

        initTabs();      
        initShop();      
        initStageFilters(); 
        initAcademyFilter();
        initStudentBonus(); 
        initDropTable(); 
        updateBonusDashboardIcons();
        calculate();     

    } catch (error) {
        console.error(error);
        alert("Live Server 확인 필요");
    }
}

// 보너스 현황판 아이콘 업데이트
function updateBonusDashboardIcons() {
    for(let i=0; i<3; i++) {
        const displayIdx = bonusDashboardIcons[i];
        const iconEl = document.getElementById(`bd-icon-${i}`);
        if(iconEl && currencyIcons[displayIdx]) {
            iconEl.src = IMG_PATH + currencyIcons[displayIdx];
            iconEl.style.display = 'block';
        }
    }
}

// 학원 필터 초기화
function initAcademyFilter() {
    const select = document.getElementById('academyFilter');
    if (!select) return;
    
    // 기존 옵션 초기화 (전체 보기 제외)
    select.innerHTML = '<option value="ALL">전체 학원 보기</option>';

    const academies = new Set();
    studentData.forEach(s => { if (s.academy) academies.add(s.academy); });
    const sorted = Array.from(academies).sort();
    
    sorted.forEach(ac => {
        const opt = document.createElement('option');
        opt.value = ac; opt.text = ac;
        select.appendChild(opt);
    });
}
window.filterByAcademy = function(ac) { currentAcademy = ac; initStudentBonus(); }

// ============================================================
// 3. 학생 보너스 로직
// ============================================================
window.toggleBonusFilter = function(filterIdx) {
    if (activeBonusFilter === filterIdx) activeBonusFilter = -1;
    else activeBonusFilter = filterIdx;
    
    for(let i=0; i<3; i++) {
        const item = document.getElementById(`bd-item-${i}`);
        if (i === activeBonusFilter) item.classList.add('active');
        else item.classList.remove('active');
    }
    initStudentBonus();
}

window.toggleRoleFilter = function(role, btn) {
    if (activeRoles.has(role)) { activeRoles.delete(role); btn.classList.remove('active'); }
    else { activeRoles.add(role); btn.classList.add('active'); }
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

    const isFiltering = (activeBonusFilter !== -1);
    // 정렬 기준: 필터가 켜져있으면 필터 재화 기준, 아니면 현재 상점 탭 기준
    const targetBonusIdx = isFiltering ? activeBonusFilter : currentTab;

    // 1. 필터링
    let filtered = studentData.filter(student => {
        if (isFiltering) {
            const b = Array.isArray(student.bonus) ? (student.bonus[targetBonusIdx]||0) : student.bonus;
            if (b <= 0) return false;
        }
        if (!(!student.role || activeRoles.has(student.role))) return false;
        if (currentAcademy !== "ALL" && student.academy !== currentAcademy) return false;
        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#999; font-size:0.8rem; grid-column:1/-1; text-align:center; padding:20px;">해당하는 학생이 없습니다.</p>';
        return;
    }

    // [NEW] 2. 내림차순 정렬 (보너스 높은 순)
    filtered.sort((a, b) => {
        const valA = Array.isArray(a.bonus) ? (a.bonus[targetBonusIdx]||0) : a.bonus;
        const valB = Array.isArray(b.bonus) ? (b.bonus[targetBonusIdx]||0) : b.bonus;
        return valB - valA; // 큰 값이 앞으로
    });

    // 3. 카드 생성
    filtered.forEach(student => {
        const originalIdx = studentData.indexOf(student);
        const card = document.createElement('div');
        card.className = 'student-card';
        if (selectedStudents.has(originalIdx)) card.classList.add('selected');
        
        card.onclick = () => toggleStudent(originalIdx, card);

        // 표시할 보너스 값 계산
        let displayBonus = 0;
        if(Array.isArray(student.bonus)) {
            displayBonus = student.bonus[targetBonusIdx] || 0;
        } else {
            displayBonus = student.bonus || 0;
        }

        const imgSrc = student.img ? (IMG_PATH + student.img) : DEFAULT_IMG;
        
        // [NEW] 필터 미선택 시 보너스 텍스트 숨김 처리
        // isFiltering이 true(클릭됨)일 때만 텍스트를 보여줌
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

window.toggleStudent = function(idx, card) {
    if (selectedStudents.has(idx)) { selectedStudents.delete(idx); card.classList.remove('selected'); }
    else { selectedStudents.add(idx); card.classList.add('selected'); }
    updateTotalBonus();
}

// [핵심 수정] 선택된 인원 중 (스트라이커 4 + 스페셜 2) 최적값 자동 계산
// [수정] 학생 선택 시 최적값 계산 후 -> 입력창(Input)에 자동 입력 -> 계산 실행
function updateTotalBonus() {
    let totals = [0, 0, 0];

    // 1. 0, 1, 2번 재화별로 각각 최적의 보너스 합계 계산 (스트라이커 4 + 스페셜 2)
    for(let i = 0; i < 3; i++) {
        let strikers = [];
        let specials = [];

        selectedStudents.forEach(idx => {
            const s = studentData[idx];
            if (s) {
                // 해당 재화(i)에 대한 보너스 값 추출 (배열이면 i번째, 아니면 단일값)
                let val = Array.isArray(s.bonus) ? (s.bonus[i] || 0) : (s.bonus || 0);
                
                if (s.role === 'SPECIAL') specials.push(val);
                else strikers.push(val); // role이 없거나 STRIKER면 스트라이커 취급
            }
        });

        // 내림차순 정렬 (높은 보너스 우선)
        strikers.sort((a, b) => b - a);
        specials.sort((a, b) => b - a);

        // 상위 n명 합산
        const sumStrikers = strikers.slice(0, 4).reduce((acc, curr) => acc + curr, 0);
        const sumSpecials = specials.slice(0, 2).reduce((acc, curr) => acc + curr, 0);
        
        totals[i] = sumStrikers + sumSpecials;
    }

    // 2. 상단 현황판(아이콘 옆 숫자) 갱신
    for(let i = 0; i < 3; i++) {
        const valEl = document.getElementById(`bd-val-${i}`);
        if(valEl) valEl.innerText = totals[i] + "%";
    }

    // 3. 현재 선택된 탭의 보너스 값을 가져옴
    const currentTotal = totals[currentTab];

    // 4. 헤더 배지 갱신
    const badge = document.getElementById('totalStudentBonusBadge');
    if(badge) badge.innerText = currentTotal + "%";

    // 5. [핵심] 메인 입력창(#bonusRate)에 계산된 값을 강제로 넣음
    const mainInput = document.getElementById('bonusRate');
    if(mainInput) {
        mainInput.value = currentTotal;
    }

    // 6. 값이 바뀌었으니 전체 계산 다시 실행 (드랍 테이블 갱신됨)
    calculate();
    initDropTable();
}

window.toggleStudentSelector = function() {
    const box = document.getElementById('studentSelectorBox');
    const icon = document.getElementById('studentToggleIcon');
    if (box.classList.contains('hidden')) { box.classList.remove('hidden'); icon.innerText = "▲"; }
    else { box.classList.add('hidden'); icon.innerText = "▼"; }
}

// ============================================================
// 4. 탭 및 상점 로직
// ============================================================
function initTabs() {
    const con = document.querySelector('.shop-tabs');
    con.innerHTML = '';
    for(let i=0; i<3; i++) {
        const displayIdx = (shopTabIcons && shopTabIcons.length > i) ? shopTabIcons[i] : tabMap[i];
        
        const icon = (currencyIcons[displayIdx]) ? IMG_PATH + currencyIcons[displayIdx] : DEFAULT_IMG;
        
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

    const bonusInput = document.getElementById('bonusRate');
    const bonusVal = parseInt(bonusInput ? bonusInput.value : 0) || 0;
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
            <img src="${AP_ICON_PATH}" style="width:16px; height:16px; object-fit:contain;">
            <span>${ap.toLocaleString()}</span>
        </div>
    `;

    if(surplus > 0) {
        const displayIdx = tabDisplayMap[currentTab];
        const icon = (currencyIcons[displayIdx]) ? IMG_PATH+currencyIcons[displayIdx] : DEFAULT_IMG;
        surEl.innerHTML = `⚠️ <img src="${icon}" class="mini-icon-white" style="width:12px;height:12px"> ${surplus}개 남음`;
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