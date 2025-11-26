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
// ============================================================
// 5. 핵심 효율 계산 (다중 스테이지 최적화 버전)
// ============================================================
window.calculate = function() {
    // 1. 필요한 재화량 계산 (Needs)
    let needs = [0, 0, 0];
    let totalNeedCount = 0;
    for(let i=0; i<3; i++) {
        needs[i] = Math.max(0, tabTotals[i] - globalCurrentAmounts[i]);
        totalNeedCount += needs[i];
    }

    // 필요량이 없으면 종료
    if (totalNeedCount === 0) {
        displayResult([], 0, 0);
        return;
    }

    // 2. 보너스 비율 가져오기
    const bonusInput = document.getElementById('bonusRate');
    const bonusVal = parseInt(bonusInput ? bonusInput.value : 0) || 0;

    // 3. 각 스테이지별 "실질 드랍량" 미리 계산
    // (보너스 적용된 드랍량)
    let stageOptions = [];
    stageConfig.forEach((stage, sIdx) => {
        const chk = document.querySelector(`.filter-check-input[value="${sIdx}"]`);
        if (chk && !chk.checked) return; // 필터 꺼진 곳 제외

        let effectiveDrops = [0, 0, 0];
        if(stage.drops) {
            stage.drops.forEach((base, dIdx) => {
                if(base > 0) {
                    const bonusAmt = Math.ceil(base * (bonusVal / 100));
                    // 탭 매핑이 되어 있는 재화인지 확인
                    const targetTabIdx = tabMap.indexOf(dIdx);
                    if(targetTabIdx !== -1) {
                         effectiveDrops[targetTabIdx] = base + bonusAmt;
                    }
                }
            });
        }
        
        stageOptions.push({
            id: sIdx,
            data: stage,
            drops: effectiveDrops, // [재화0드랍, 재화1드랍, 재화2드랍]
            ap: stage.ap,
            runCount: 0
        });
    });

    if (stageOptions.length === 0) {
        displayResult(null); // 추천 불가능
        return;
    }

    // 4. 시뮬레이션 (Greedy Algorithm)
    // "현재 가장 부족한 재화를 가장 효율적으로 주는 곳을 1회 돈다"를 반복
    
    // 안전장치: 무한 루프 방지 (최대 50,000회 제한)
    let safetyLoop = 0; 
    let currentNeeds = [...needs]; // 복사본

    while(currentNeeds.some(n => n > 0) && safetyLoop < 50000) {
        let bestStageOption = null;
        let maxScore = -1;

        // 모든 후보 스테이지 중 현재 상태에서 가장 효율 좋은 곳 탐색
        for(let opt of stageOptions) {
            let value = 0;
            
            // 점수 계산: (아직 필요한 재화의 드랍량)의 합 / AP
            for(let i=0; i<3; i++) {
                if(currentNeeds[i] > 0) {
                    // 필요량보다 더 많이 캐는 경우, 필요한 만큼만 점수에 반영 (Surplus 최소화 유도)
                    // 다만 너무 딱 맞추려다 효율이 깨질 수 있으니, 
                    // 단순하게 "필요한 재화라면 드랍량 전액 가산" 방식이 일반적인 이벤트 효율엔 더 적합합니다.
                    value += opt.drops[i];
                }
            }

            if(value > 0) {
                let score = value / opt.ap;
                // 같은 점수면 AP가 낮은 곳(빠른 회전) 혹은 높은 곳 등 기준을 정할 수 있음
                if(score > maxScore) {
                    maxScore = score;
                    bestStageOption = opt;
                }
            }
        }

        // 더 이상 캘 곳이 없거나 효율이 0이면 중단 (예: 필요한 재화를 주는 스테이지가 없음)
        if(!bestStageOption) break;

        // 선택된 스테이지 1회 수행
        bestStageOption.runCount++;
        safetyLoop++;

        // 남은 필요량 갱신
        for(let i=0; i<3; i++) {
            currentNeeds[i] -= bestStageOption.drops[i];
        }
    }

    // 5. 결과 정리 (횟수가 0보다 큰 스테이지들만 추림)
    const finalResults = stageOptions.filter(opt => opt.runCount > 0);
    
    // 남은 재화(Surplus) 계산 (음수면 남는 것)
    // currentNeeds가 음수면 그만큼 초과 달성한 것
    const surplus = currentNeeds.map(n => n < 0 ? Math.abs(n) : 0);

    displayResult(finalResults, surplus);
    initDropTable(); // 드랍 테이블 갱신 (선택적)
}

function displayResult(results, surplusArray) {
    // 결과 표시할 DOM 요소들
    const nameEl = document.getElementById('recStageName'); // 기존: 제목
    const infoEl = document.getElementById('recStageInfo'); // 기존: 드랍 아이콘
    const runsEl = document.getElementById('result-runs');  // 기존: 횟수
    const apEl = document.getElementById('result-ap');      // 기존: AP
    let surEl = document.getElementById('result-surplus');  // 잉여 재화 표시

    // 잉여 재화 표시 박스가 없으면 생성
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

    // 1. 계산할 필요가 없거나 결과가 없는 경우 처리
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

    // 2. 다중 결과 렌더링을 위해 HTML 재구성
    // 기존 UI가 단일 스테이지용이라, 내용을 덮어씌웁니다.
    
    // 전체 총합 계산
    let totalAp = 0;
    let totalRuns = 0;
    
    // 결과 리스트 HTML 생성
    let listHtml = `<div style="display:flex; flex-direction:column; gap:8px; width:100%;">`;
    
    results.forEach(res => {
        totalRuns += res.runCount;
        totalAp += (res.runCount * res.ap);

        // 해당 스테이지의 주요 드랍품 표시
        let dropIcons = '';
        res.data.drops.forEach((base, idx) => {
            if(base > 0 && currencyIcons[idx]) {
                dropIcons += `<img src="${IMG_PATH + currencyIcons[idx]}" style="width:14px; height:14px; margin-right:2px; vertical-align:middle;">`;
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

    // 3. 화면에 주입
    // 기존 제목 영역(recStageName)을 "추천 조합"으로 변경하고
    // 상세 영역(recStageInfo)에 리스트를 넣습니다.
    nameEl.innerText = "추천 파밍 조합";
    nameEl.style.color = "#ddd";
    
    // 기존 스타일 덮어쓰기 (flex 정렬 등 해제 필요할 수 있음)
    infoEl.style.justifyContent = 'normal'; 
    infoEl.innerHTML = listHtml;

    // 총 합계 표시
    runsEl.innerText = `총 ${totalRuns}회`;
    apEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:4px; color:#ffdd55;">
            <img src="${AP_ICON_PATH}" style="width:16px; height:16px; object-fit:contain;">
            <span>${totalAp.toLocaleString()}</span>
        </div>
    `;

    // 4. 남는 재화(Surplus) 표시
    let surplusHtml = [];
    if(surplusArray) {
        surplusArray.forEach((amt, idx) => {
            if(amt > 0) {
                 const displayIdx = tabDisplayMap[idx]; // 실제 아이콘 매핑
                 const icon = (currencyIcons[displayIdx]) ? IMG_PATH + currencyIcons[displayIdx] : DEFAULT_IMG;
                 surplusHtml.push(`<span style="margin-right:8px;"><img src="${icon}" style="width:12px; vertical-align:middle"> +${amt}</span>`);
            }
        });
    }

    if(surEl) {
        if(surplusHtml.length > 0) {
            surEl.innerHTML = `⚠️ 남는 재화: ` + surplusHtml.join('');
        } else {
            surEl.innerHTML = `<span style="color:#66cc66">✔ 낭비 없음 (깔끔!)</span>`;
        }
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