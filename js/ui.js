// ui.js
import { IMG_PATH, DEFAULT_IMG, AP_ICON_PATH } from './constants.js';
import { state } from './store.js';
import { calculate, updateTotalBonus, calcAp } from './calc.js';

export function updateBonusDashboardIcons() {
    // [수정] 4개까지 확인 (i < 4)
    for(let i=0; i<4; i++) {
        const displayIdx = state.bonusDashboardIcons[i];
        const iconEl = document.getElementById(`bd-icon-${i}`);
        
        if(iconEl) {
            // 해당 인덱스의 아이콘 데이터가 있으면 표시
            if (state.currencyIcons[displayIdx]) {
                iconEl.src = IMG_PATH + state.currencyIcons[displayIdx];
                iconEl.style.display = 'block';
                // 상위 부모(bd-item)도 보이게 처리 (혹시 숨겨져있다면)
                iconEl.closest('.bd-item').style.display = 'flex';
                
                // 구분선 처리 (마지막 아이템이거나 다음 아이템이 없으면 구분선 숨김)
                // (단순화를 위해 CSS로 처리하거나 여기서는 생략 가능)
            } else {
                // 데이터 없으면 숨김 (예: 재화가 3개인 경우 4번째 숨김)
                iconEl.closest('.bd-item').style.display = 'none';
            }
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
    
    // [수정] 4개까지 확인 (i < 4)
    for(let i=0; i<4; i++) {
        const item = document.getElementById(`bd-item-${i}`);
        if (item) { // 요소가 있을 때만
            if (i === state.activeBonusFilter) item.classList.add('active');
            else item.classList.remove('active');
        }
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

// 3. 상단 탭 생성 (4개까지 확장)
export function initTabs() {
    const con = document.querySelector('.shop-tabs');
    con.innerHTML = '';
    
    // [수정] 4개까지 확인 (i < 4)
    for(let i=0; i<4; i++) {
        // 데이터(상점 설정)가 없으면 생성 안함
        if (!state.shopConfig[i]) continue;

        const displayIdx = (state.shopTabIcons && state.shopTabIcons.length > i) ? state.shopTabIcons[i] : state.tabMap[i];
        
        // 아이콘 데이터가 없으면 기본값 처리 (에러 방지)
        const iconSrc = (state.currencyIcons[displayIdx]) ? IMG_PATH + state.currencyIcons[displayIdx] : DEFAULT_IMG;
        
        const div = document.createElement('div');
        div.className = `tab-btn ${i===state.currentTab?'active':''}`;
        div.onclick = () => switchTab(i);
        div.innerHTML = `<img src="${iconSrc}" class="tab-icon"> 상점 ${i+1}`;
        con.appendChild(div);
    }
}

// 4. 상점 생성 (4개까지 확장)
// ui.js - initShop 함수

export function initShop() { 
    const c = document.getElementById('shop-container'); c.innerHTML = '';
    
    for(let i=0; i<4; i++) {
        if (!state.shopConfig[i]) continue;

        const sec = document.createElement('div'); 
        sec.className = `shop-section ${i===0?'active':''}`; 
        sec.id = `section-${i}`;
        
        (state.shopConfig[i]||[]).forEach(d => {
            const card = document.createElement('div'); 
            card.className = `item-card ${d.qty===0?'disabled':''}`;
            const img = d.img ? IMG_PATH+d.img : DEFAULT_IMG;
            
            // 무제한이면 무한대 기호, 아니면 남은 횟수
            const badge = d.qty===-1 ? 'limit-badge unlimited' : 'limit-badge';
            const bText = d.qty===-1 ? '구매제한: ∞' : `구매제한: ${d.qty}회`;
            
            // ★ 최대값 설정: 무제한이면 9999, 아니면 해당 수량
            const maxVal = d.qty === -1 ? 9999 : d.qty;

            card.innerHTML = `
                <input type="checkbox" class="item-checkbox" onchange="updateTotal(${i})">
                
                <div class="card-top">
                    <span class="item-name">${d.name}</span>
                    <div class="img-box"><img src="${img}"></div>
                    <span class="${badge}">${bText}</span>
                    <div class="price-tag">가격 <strong>${d.price}</strong></div>
                </div>
                
                <input type="hidden" class="cost-input" value="${d.price}">
                
                <div class="control-row stepper-box">
                    <button class="step-btn" onclick="modifyQty(this, 'min', ${i})">≪</button>
                    <button class="step-btn" onclick="modifyQty(this, -1, ${i})">-</button>
                    
                    <input type="number" class="qty-input-main" 
                           min="0" max="${maxVal}" value="0" 
                           oninput="checkInput(this, ${i})"
                           onfocus="this.select()">
                           
                    <button class="step-btn" onclick="modifyQty(this, 1, ${i})">+</button>
                    <button class="step-btn" onclick="modifyQty(this, 'max', ${i})">≫</button>
                </div>
            `;

            // 카드 바탕 클릭 시 체크박스 토글 기능 (입력창/버튼 클릭 제외)
            card.addEventListener('click', (e)=>{ 
                if(['INPUT', 'BUTTON'].includes(e.target.tagName)) return;
                const chk = card.querySelector('.item-checkbox'); 
                if(!chk.disabled){ chk.checked=!chk.checked; updateTotal(i); }
            });
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
    const sec = document.getElementById(`section-${sIdx}`); 
    let sum = 0;
    
    sec.querySelectorAll('.item-card').forEach(c => {
        // 체크박스가 켜진 아이템만 계산
        if(c.querySelector('.item-checkbox').checked) {
            const cost = parseInt(c.querySelector('.cost-input').value) || 0;
            
            // [핵심 수정] 클래스명 변경: qty-input-sm -> qty-input-main
            // 예전 코드: c.querySelector('.qty-input-sm').value
            const qtyInput = c.querySelector('.qty-input-main'); 
            const qty = qtyInput ? (parseInt(qtyInput.value) || 0) : 0;
            
            sum += cost * qty;
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
    
    // 상태 저장
    state.tabTotals[sIdx] = sum;
    
    // 현재 보고 있는 탭이면 하단 '필요 재화' 칸 즉시 업데이트
    if(state.currentTab === sIdx) {
        const targetEl = document.getElementById('targetAmount');
        if(targetEl) targetEl.value = sum;
    }
    
    calculate(); // 전체 계산 다시 실행
}

// [수정] 탭 전환 시 보너스 입력창 값 갱신
export function switchTab(idx) {
    state.currentTab = idx;
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    document.querySelectorAll('.shop-section').forEach((s, i) => s.classList.toggle('active', i === idx));
    
    document.getElementById('targetAmount').value = state.tabTotals[idx];
    document.getElementById('currentAmount').value = state.globalCurrentAmounts[idx];
    
    // 학생 보너스 다시 계산하여 현재 탭의 보너스 값을 입력창에 넣음
    // (calc.js의 updateTotalBonus를 호출하면 내부적으로 입력창을 갱신함)
    updateTotalBonus(); 
}

export function manualTarget(v) { state.tabTotals[state.currentTab] = parseInt(v)||0; calculate(); }
export function updateCurrent(v) { state.globalCurrentAmounts[state.currentTab] = parseInt(v)||0; calculate(); }

export function toggleApWidget() {
    const b = document.getElementById('apIconBtn'); const p = document.getElementById('apPopup');
    if(p.classList.contains('hidden')) { p.classList.remove('hidden'); b.style.display='none'; }
    else { p.classList.add('hidden'); b.style.display='flex'; }
}

// ui.js - displayResult 함수

export function displayResult(results, surplusArray) {
    const nameEl = document.getElementById('recStageName');
    const infoEl = document.getElementById('recStageInfo');
    const surEl = document.getElementById('result-surplus');
    
    // 1. 현재 설정된 목표 총합 계산 (초기 상태인지 판별용)
    const totalTarget = state.tabTotals.reduce((a, b) => a + b, 0);

    // 2. 결과가 없거나(0회) 조건 불충분일 때 처리
    if (!results || results.length === 0) {
        if (results === null) {
            // 필터링 등으로 계산 불가능한 경우
            nameEl.innerText = "조건 불충분";
            nameEl.style.color = "#ff6b6b"; 
            infoEl.innerHTML = `<div class="rec-message">필터를 확인하거나 목표를 설정해주세요.</div>`;
        } 
        else if (totalTarget === 0) {
            // ★ 수정됨: 목표가 0이면 '계산 대기 중' 표시
            nameEl.innerText = "계산 대기 중...";
            nameEl.style.color = "#aaa"; // 회색 (중립적)
            infoEl.innerHTML = `<div class="rec-message">필요 재화량을 입력하면<br>최적의 스테이지를<br>추천해 드립니다.</div>`;
        }
        else {
            // 목표는 있는데 이미 달성한 경우 (진짜 파밍 완료)
            nameEl.innerText = "Ap소비 불필요";
            nameEl.style.color = "#4CAF50"; // 초록색 (긍정적)
            infoEl.innerHTML = `<div class="rec-message" style="color:#4CAF50; font-weight:bold;">이미 목표를 달성했습니다!</div>`;
        }
        
        if (surEl) {
            surEl.innerHTML = "";
            surEl.style.marginBottom = "0";
        }
        return;
    }

    // 3. (이하 동일) 결과가 있을 때 카드 리스트 출력
    let listHtml = '';
    
    results.forEach(res => {
        let dropIcons = '';
        res.data.drops.forEach((base, idx) => {
            if (base > 0 && state.currencyIcons[idx]) {
                dropIcons += `<img src="${IMG_PATH + state.currencyIcons[idx]}">`;
            }
        });
        
        listHtml += `
            <div class="rec-card">
                <div class="rec-card-left">
                    <span class="rec-stage-name">${res.data.name}</span>
                    <div class="rec-drop-icons">${dropIcons}</div>
                </div>
                <div class="rec-card-right">
                    <span class="rec-run-count">${res.runCount}회</span>
                    <span class="rec-ap-cost">${(res.runCount * res.ap).toLocaleString()} AP</span>
                </div>
            </div>
        `;
    });

    nameEl.innerText = "추천 지역 목록";
    nameEl.style.fontsize = "1.0.rem";
    nameEl.style.color = "#333";
    nameEl.style.marginBottom = "5px";

    infoEl.innerHTML = listHtml;       
    
    // 남는 재화 표시
    let surplusHtml = [];
    if (surplusArray) {
        surplusArray.forEach((amt, idx) => {
            if (amt > 0) {
                const displayIdx = state.tabDisplayMap[idx];
                const icon = (state.currencyIcons[displayIdx]) ? IMG_PATH + state.currencyIcons[displayIdx] : DEFAULT_IMG;
                surplusHtml.push(`
                    <span style="margin-right:10px; color:#ffcc00; font-size:0.85rem; display:inline-flex; align-items:center;">
                        <img src="${icon}" style="width:14px; margin-right:3px; vertical-align:middle"> +${amt}
                    </span>
                `);
            }
        });
    }

    if (surEl) {
        if (surplusHtml.length > 0) {
            surEl.innerHTML = `남는 재화: ` + surplusHtml.join('');
            surEl.style.marginBottom = "8px";
        } else {
            surEl.innerHTML = "";
            surEl.style.marginBottom = "0";
        }
    }
}

export function initDropTable() {
    const container = document.getElementById('drop-table-list');
    if (!container) return;
    container.innerHTML = '';

    // [삭제됨] 더 이상 존재하지 않는 bonusRate 엘리먼트 참조 제거
    // const bonusVal = parseInt(document.getElementById('bonusRate').value) || 0; 

    // 1. 학생 보너스 값 미리 계산 (calculate 함수와 동일 로직)
    let studentBonuses = [0, 0, 0, 0];
    for(let i=0; i<4; i++) {
        let strikers = [];
        let specials = [];
        state.selectedStudents.forEach(idx => {
            const s = state.studentData[idx];
            if(s) {
                let val = Array.isArray(s.bonus) ? (s.bonus[i] || 0) : (s.bonus || 0);
                if (s.role === 'SPECIAL') specials.push(val); else strikers.push(val);
            }
        });
        strikers.sort((a,b)=>b-a); specials.sort((a,b)=>b-a);
        studentBonuses[i] = strikers.slice(0,4).reduce((a,b)=>a+b,0) + specials.slice(0,2).reduce((a,b)=>a+b,0);
    }
    
    state.stageConfig.forEach(stage => {
        const row = document.createElement('div');
        row.className = 'stage-row';
        let html = '';
        
        if(stage.drops) {
            stage.drops.forEach((base, dIdx) => {
                if(base > 0) {
                    const icon = (state.currencyIcons[dIdx]) ? IMG_PATH+state.currencyIcons[dIdx] : DEFAULT_IMG;
                    
                    // [핵심 수정] 재화별 개별 보너스 적용 로직
                    let finalBonus = 0;

                    // 1) 대시보드(manual inputs) 매핑 확인
                    const dashboardIdx = state.bonusDashboardIcons.indexOf(dIdx);
                    let manualVal = 0;
                    
                    if (dashboardIdx !== -1) {
                        const inputEl = document.getElementById(`bd-manual-${dashboardIdx}`);
                        if (inputEl && inputEl.value !== '') {
                            manualVal = parseInt(inputEl.value);
                        }
                    }

                    // 2) 우선순위: 수동 > 학생
                    if (!isNaN(manualVal) && manualVal > 0) {
                        finalBonus = manualVal;
                    } else {
                        finalBonus = studentBonuses[dIdx] || 0;
                    }

                    // 3) 보너스 수량 계산
                    const bonusAmt = Math.ceil(base * (finalBonus/100));
                    
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

// ui.js - 하단에 추가

// 버튼 클릭 처리 함수 (<<, <, >, >>)
export function modifyQty(btn, action, sIdx) {
    const parent = btn.closest('.stepper-box');
    const input = parent.querySelector('.qty-input-main');
    const max = parseInt(input.max) || 9999;
    let current = parseInt(input.value) || 0;

    let newVal = current;

    if (action === 'min') {
        newVal = 0; // 최소값 (0)
    } else if (action === 'max') {
        newVal = max; // 최대값 (Full)
    } else {
        // 숫자 덧셈/뺄셈
        newVal += action;
    }

    // 범위 제한 (0 ~ max)
    if (newVal < 0) newVal = 0;
    if (newVal > max) newVal = max;

    input.value = newVal;
    
    // 값 변경에 따른 체크박스 및 합계 업데이트 로직 호출
    reflectChange(input, sIdx);
}

// 직접 입력 시 유효성 검사 함수
export function checkInput(input, sIdx) {
    const max = parseInt(input.max) || 9999;
    let val = parseInt(input.value);

    // 비어있거나 이상한 값이면 0 처리하지 않고 그대로 두되 계산은 0으로
    if (isNaN(val)) val = 0;

    // 최대값 초과 방지
    if (val > max) {
        val = max;
        input.value = max;
    }
    // 음수 방지
    if (val < 0) {
        val = 0;
        input.value = 0;
    }

    reflectChange(input, sIdx);
}

// (내부용) 값 변경 후 체크박스 상태 동기화 및 합계 갱신
function reflectChange(input, sIdx) {
    const card = input.closest('.item-card');
    const chk = card.querySelector('.item-checkbox');
    const val = parseInt(input.value) || 0;

    // 수량이 1 이상이면 자동으로 체크박스 ON
    if (val > 0 && !chk.disabled) {
        chk.checked = true;
        card.classList.add('selected');
    } 
    // 수량이 0이면 체크박스 OFF
    else if (val === 0) {
        chk.checked = false;
        card.classList.remove('selected');
    }

    // 전체 합계 재계산
    updateTotal(sIdx);
}

// js/ui.js 맨 아래에 추가

// [NEW] 전체 선택 / 해제 로직
export function toggleAllStudents(shouldSelect) {
    const isFiltering = (state.activeBonusFilter !== -1);
    const targetBonusIdx = isFiltering ? state.activeBonusFilter : state.currentTab;

    state.studentData.forEach((student, idx) => {
        // 1. 현재 필터 조건(Role, Academy, Bonus > 0)에 맞는지 검사
        let visible = true;
        if (isFiltering) {
            const b = Array.isArray(student.bonus) ? (student.bonus[targetBonusIdx]||0) : student.bonus;
            if (b <= 0) visible = false;
        }
        if (visible && (!student.role || state.activeRoles.has(student.role))) {
            if (state.currentAcademy !== "ALL" && student.academy !== state.currentAcademy) visible = false;
        }

        // 2. 현재 화면에 보이는 학생이라면 -> 선택 or 해제
        if (visible) {
            if (shouldSelect) {
                state.selectedStudents.add(idx);
            } else {
                state.selectedStudents.delete(idx);
            }
        }
    });

    // 3. UI 및 계산 갱신
    initStudentBonus(); // 카드 스타일 갱신
    updateTotalBonus(); // 총합 다시 계산
}