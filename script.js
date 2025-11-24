// ============================================================
// 1. 전역 변수 및 설정
// ============================================================
const IMG_PATH = "src/"; 
const DEFAULT_IMG = "marieyon.png";

// JSON에서 불러올 변수들 (초기값)
let currencyIcons = []; 
let tabMap = [];        
let shopConfig = [];    
let stageConfig = [];   

let currentTab = 0;
let tabTotals = [0, 0, 0];
let globalCurrentAmounts = [0, 0, 0];

// ============================================================
// 2. 데이터 로딩 및 초기화
// ============================================================
async function loadDataAndInit() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // 1. 설정 정보 가져오기
        if (data.eventSettings) {
            currencyIcons = data.eventSettings.currencyIcons || [];
            tabMap = data.eventSettings.tabMap || [1, 2, 3];
        } else {
            // 방어 코드
            currencyIcons = ["icon_event_pt.png", "event_point_a.png", "event_point_b.png", "event_point_c.png"];
            tabMap = [1, 2, 3];
        }

        // 2. 데이터 정보 가져오기
        shopConfig = data.shopConfig;
        stageConfig = data.stageConfig;

        // 3. 화면 그리기 (순서 중요)
        initTabs();      // [NEW] 탭 버튼 생성 (이미지 적용)
        initShop();      // 상점 아이템 생성
        initBonus();     // 보너스 목록 생성
        initDropTable(); // 드랍 테이블 생성
        
        calculate();     // 초기 계산

    } catch (error) {
        console.error("데이터 로딩 실패:", error);
        alert("data.json 로딩 실패! (Live Server 확인 필요)");
    }
}

// ============================================================
// 3. [NEW] 상점 탭 생성 함수 (JSON 데이터 반영)
// ============================================================
function initTabs() {
    const tabContainer = document.querySelector('.shop-tabs');
    if (!tabContainer) return;
    tabContainer.innerHTML = ''; // 기존 하드코딩된 탭 삭제

    // 상점 3개 생성 (0, 1, 2)
    for (let i = 0; i < 3; i++) {
        // 현재 탭이 사용하는 재화 인덱스 가져오기 (매핑)
        const dropIdx = tabMap[i]; 
        const iconName = currencyIcons[dropIdx] || DEFAULT_IMG;
        const iconPath = IMG_PATH + iconName;

        const div = document.createElement('div');
        // 첫 번째 탭은 active 클래스 추가
        div.className = `tab-btn ${i === currentTab ? 'active' : ''}`;
        div.onclick = () => switchTab(i);
        
        // HTML 조립 (이미지 + 텍스트)
        div.innerHTML = `
            <img src="${iconPath}" class="tab-icon" onerror="this.style.display='none'"> 
            상점 ${i + 1}
        `;
        
        tabContainer.appendChild(div);
    }
}

// ============================================================
// 4. 나머지 화면 생성 함수들
// ============================================================

function initShop() {
    const container = document.getElementById('shop-container');
    if (!container) return;
    container.innerHTML = '';

    for (let sectionIdx = 0; sectionIdx < 3; sectionIdx++) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = `shop-section ${sectionIdx === 0 ? 'active' : ''}`;
        sectionDiv.id = `section-${sectionIdx}`;

        const customItems = shopConfig[sectionIdx] || [];

        if (customItems.length === 0) {
            sectionDiv.innerHTML = '<p style="text-align:center; width:100%; color:#999; padding:20px;">아이템이 없습니다.</p>';
        } else {
            customItems.forEach((data) => {
                const itemPrice = data.price || 0;
                const itemQty = data.qty !== undefined ? data.qty : 0;
                const itemName = data.name || "아이템";
                const fullPath = data.img ? (IMG_PATH + data.img) : DEFAULT_IMG;

                const isUnlimited = (itemQty === -1);
                const isDisabled = (itemQty === 0);
                
                const badgeText = isUnlimited ? "구매제한: ∞" : `구매제한: ${itemQty}회`;
                const badgeClass = isUnlimited ? "limit-badge unlimited" : "limit-badge";
                const maxVal = isUnlimited ? 9999 : itemQty;

                const card = document.createElement('div');
                card.className = `item-card ${isDisabled ? 'disabled' : ''}`;
                
                card.innerHTML = `
                    <input type="checkbox" class="item-checkbox" 
                           ${isDisabled ? 'disabled' : ''}
                           onchange="updateTotal(${sectionIdx})">
                    
                    <div class="card-top">
                        <span class="item-name" title="${itemName}">${itemName}</span>
                        <div class="img-box">
                            <img src="${fullPath}" onerror="this.src='${DEFAULT_IMG}'">
                        </div>
                        <span class="${badgeClass}">${badgeText}</span>
                        <div class="price-tag">
                            <span>Cost</span> <strong>${itemPrice}</strong>
                        </div>
                    </div>

                    <input type="hidden" class="cost-input" value="${itemPrice}">

                    <div class="control-row">
                        <input type="range" class="range-input" 
                               min="0" max="${maxVal}" value="0"
                               ${isDisabled ? 'disabled' : ''}
                               oninput="syncValues(this, 'range', ${sectionIdx})">
                        
                        <input type="number" class="qty-input-sm" 
                               min="0" max="${maxVal}" value="0"
                               ${isDisabled ? 'disabled' : ''}
                               oninput="syncValues(this, 'number', ${sectionIdx})">
                    </div>
                `;

                card.addEventListener('click', function(e) {
                    if (e.target.tagName === 'INPUT') return;
                    const checkbox = this.querySelector('.item-checkbox');
                    if (checkbox && !checkbox.disabled) {
                        checkbox.checked = !checkbox.checked;
                        updateTotal(sectionIdx);
                    }
                });

                sectionDiv.appendChild(card);
            });
        }
        container.appendChild(sectionDiv);
    }
    
    if(document.getElementById('targetAmount')) document.getElementById('targetAmount').value = 0;
    if(document.getElementById('currentAmount')) document.getElementById('currentAmount').value = 0;
}

function initBonus() {
    const select = document.getElementById('bonusRate');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 0; i <= 150; i += 5) {
        const option = document.createElement('option');
        option.value = i;
        option.text = i + "%";
        select.appendChild(option);
    }
    select.value = 0;
}

function initDropTable() {
    const container = document.getElementById('drop-table-list');
    if (!container) return;
    container.innerHTML = '';

    stageConfig.forEach((stage) => {
        const row = document.createElement('div');
        row.className = 'stage-row';

        let dropsHtml = '';
        
        if (stage.drops) {
            stage.drops.forEach((amount, idx) => {
                if (amount && amount > 0) {
                    const iconName = currencyIcons[idx] || DEFAULT_IMG;
                    const iconPath = IMG_PATH + iconName;
                    
                    dropsHtml += `
                        <div class="drop-badge" title="${amount}개">
                            <img src="${iconPath}" onerror="this.src='${DEFAULT_IMG}'">
                            <span>x${amount}</span>
                        </div>
                    `;
                }
            });
        }

        row.innerHTML = `
            <div class="stage-info">
                <div class="stage-title">${stage.name}</div>
                <div class="stage-ap-badge">${stage.ap} AP</div>
            </div>
            <div class="stage-items">
                ${dropsHtml || '<span style="color:#ccc; font-size:0.8rem;">드랍 없음</span>'}
            </div>
        `;

        container.appendChild(row);
    });
}

// --- 공통 기능 ---

window.syncValues = function(element, type, sectionIdx) {
    const parent = element.closest('.control-row');
    const rangeInput = parent.querySelector('.range-input');
    const numInput = parent.querySelector('.qty-input-sm');
    const card = element.closest('.item-card');
    const checkbox = card.querySelector('.item-checkbox');
    let val = parseInt(element.value) || 0;
    
    const maxVal = parseInt(rangeInput.max);
    if (val > maxVal) val = maxVal;
    if (val < 0) val = 0;
    rangeInput.value = val;
    numInput.value = val;

    if (val > 0 && !checkbox.disabled) {
        checkbox.checked = true;
        card.classList.add('selected');
    } else if (val === 0) {
        checkbox.checked = false;
        card.classList.remove('selected');
    }
    updateTotal(sectionIdx);
}

window.switchTab = function(idx) {
    currentTab = idx;
    document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === idx));
    document.querySelectorAll('.shop-section').forEach((sec, i) => sec.classList.toggle('active', i === idx));
    document.getElementById('targetAmount').value = tabTotals[idx];
    document.getElementById('currentAmount').value = globalCurrentAmounts[idx]; 
    calculate(); 
}

window.updateCurrent = function(val) {
    const amount = parseInt(val) || 0;
    globalCurrentAmounts[currentTab] = amount;
    calculate();
}

window.updateTotal = function(sectionIdx) {
    const section = document.getElementById(`section-${sectionIdx}`);
    const cards = section.querySelectorAll('.item-card');
    let sum = 0;
    cards.forEach(card => {
        const checkbox = card.querySelector('.item-checkbox');
        if (checkbox.checked) {
            card.classList.add('selected');
            const cost = parseInt(card.querySelector('.cost-input').value) || 0;
            const qty = parseInt(card.querySelector('.qty-input-sm').value) || 0;
            sum += (cost * qty);
        } else {
            card.classList.remove('selected');
        }
    });
    tabTotals[sectionIdx] = sum;
    if (currentTab === sectionIdx) {
        document.getElementById('targetAmount').value = sum;
    }
    calculate(); 
}

// --- AP 계산기 ---
window.adjustAp = function(delta) {
    const input = document.getElementById('curAp');
    let val = parseInt(input.value) || 0;
    val += delta;
    if (val < 0) val = 0;
    if (val > 240) val = 240;
    input.value = val;
    calcAp();
}

window.calcAp = function() {
    const curApInput = document.getElementById('curAp');
    const resultEl = document.getElementById('apResult');
    const cur = parseInt(curApInput.value);
    const max = 240;

    if (isNaN(cur)) {
        resultEl.innerHTML = "현재 AP를 입력하세요";
        return;
    }
    if (cur >= max) {
        resultEl.innerHTML = "<span style='color:#128CFF; font-weight:bold;'>이미 꽉 찼습니다!</span>";
        return;
    }

    const needed = max - cur;
    const totalMinutes = needed * 6;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const now = new Date();
    const doneTime = new Date(now.getTime() + totalMinutes * 60000);
    const doneHour = doneTime.getHours().toString().padStart(2, '0');
    const doneMin = doneTime.getMinutes().toString().padStart(2, '0');

    resultEl.innerHTML = `
        <div style="margin-bottom:4px;">
            <strong>${hours}시간 ${mins}분</strong> 후
        </div>
        <div style="color:#128CFF; font-weight:900; font-size:1.1rem;">
            ${doneHour}:${doneMin} 완료
        </div>
    `;
}

window.toggleApWidget = function() {
    const body = document.getElementById('apWidgetBody');
    const icon = document.getElementById('apToggleIcon');
    if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        icon.innerText = "▼";
    } else {
        body.classList.add('hidden');
        icon.innerText = "▲";
    }
}

// ============================================================
// [핵심] 효율 계산
// ============================================================
window.calculate = function() {
    const needs = [0, 0, 0];
    for(let i=0; i<3; i++) {
        let n = tabTotals[i] - globalCurrentAmounts[i];
        if (n < 0) n = 0;
        needs[i] = n;
    }

    if (needs[0] === 0 && needs[1] === 0 && needs[2] === 0) {
        displayResult(null, 0, 0, [], 0, true);
        return;
    }

    const bonusPercent = parseInt(document.getElementById('bonusRate').value) || 0;

    let bestStage = null;
    let maxTotalEfficiency = -1; 
    let bestGainInfo = [];

    stageConfig.forEach(stage => {
        let totalEffectiveGain = 0; 
        let currentGains = [];

        if(stage.drops) {
            for(let dropIdx=0; dropIdx < stage.drops.length; dropIdx++) {
                const baseDrop = stage.drops[dropIdx];
                let totalGain = 0;

                if (baseDrop && baseDrop > 0) {
                    const bonusAmount = Math.ceil(baseDrop * (bonusPercent / 100));
                    totalGain = baseDrop + bonusAmount;
                    
                    const relatedTabIdx = tabMap.indexOf(dropIdx);
                    if (relatedTabIdx !== -1 && needs[relatedTabIdx] > 0) {
                        totalEffectiveGain += totalGain;
                    }
                }
                currentGains[dropIdx] = totalGain;
            }
        }

        const efficiency = totalEffectiveGain / stage.ap;

        if (efficiency > maxTotalEfficiency) {
            maxTotalEfficiency = efficiency;
            bestStage = stage;
            bestGainInfo = currentGains;
        }
    });

    if (!bestStage || maxTotalEfficiency <= 0) {
        displayResult(null);
        return;
    }

    let maxRunsNeeded = 0;
    for(let tabIdx=0; tabIdx<3; tabIdx++) {
        const dropIdx = tabMap[tabIdx]; 
        const gain = bestGainInfo[dropIdx]; 
        const need = needs[tabIdx];         

        if (need > 0 && gain > 0) {
            const runs = Math.ceil(need / gain);
            if (runs > maxRunsNeeded) maxRunsNeeded = runs;
        }
    }

    const totalAp = maxRunsNeeded * bestStage.ap;
    const currentTabDropIdx = tabMap[currentTab];
    const currentTabGain = bestGainInfo[currentTabDropIdx] || 0;
    const currentTabNeed = needs[currentTab];
    const totalFarmed = currentTabGain * maxRunsNeeded;
    const surplus = (totalFarmed - currentTabNeed);

    displayResult(bestStage, maxRunsNeeded, totalAp, bestGainInfo, surplus);
}

function displayResult(stage, runs, ap, gains, surplus, isDone = false) {
    const recNameEl = document.getElementById('recStageName');
    const recInfoEl = document.getElementById('recStageInfo');
    const resRunsEl = document.getElementById('result-runs');
    const resApEl = document.getElementById('result-ap');
    let surplusEl = document.getElementById('result-surplus');

    if (!surplusEl) {
        const resultBox = document.querySelector('.result-box');
        surplusEl = document.createElement('div');
        surplusEl.id = 'result-surplus';
        surplusEl.className = 'res-surplus';
        resultBox.appendChild(surplusEl);
    }

    if (isDone) {
        recNameEl.innerText = "입력 대기중";
        recNameEl.style.color = "#128CFF";
        recInfoEl.innerText = "입력 대기중";
        resRunsEl.innerText = "0회";
        resApEl.innerText = "-";
        surplusEl.innerHTML = "";
        return;
    }

    if (!stage) {
        recNameEl.innerText = "추천 불가";
        recNameEl.style.color = "#FF5555";
        recInfoEl.innerText = "필요한 재화를 드랍하는 곳이 없습니다.";
        resRunsEl.innerText = "-";
        resApEl.innerText = "-";
        surplusEl.innerHTML = "";
        return;
    }

    recNameEl.innerText = stage.name;
    recNameEl.style.color = "#128CFF";
    
    let gainHtml = [];
    for(let i=0; i < gains.length; i++) {
        if(gains[i] > 0) {
            const iconName = currencyIcons[i] || DEFAULT_IMG;
            const iconPath = IMG_PATH + iconName;
            
            gainHtml.push(`
                <span class="gain-item">
                    <img src="${iconPath}" onerror="this.style.display='none'" class="mini-icon">
                    <b>${gains[i]}</b>
                </span>
            `);
        }
    }
    recInfoEl.innerHTML = `1회: [ ${gainHtml.join('')} ] <span style="font-size:0.8em; color:#888;">(AP ${stage.ap})</span>`;

    resRunsEl.innerText = runs.toLocaleString() + "회";
    resApEl.innerText = `(총 ${ap.toLocaleString()} AP)`;

    if (surplus > 0) {
        const currentDropIdx = tabMap[currentTab];
        const iconName = currencyIcons[currentDropIdx] || DEFAULT_IMG;
        const currentIcon = IMG_PATH + iconName;
        
        surplusEl.innerHTML = `
            <div style="margin-top:15px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.3);">
                ⚠️ 현재 탭 재화(<img src="${currentIcon}" class="mini-icon-white" onerror="this.style.display='none'">)가 
                <span style="color:#FFE500; font-weight:bold;">${surplus}개</span> 남습니다.
            </div>
        `;
    } else {
        surplusEl.innerHTML = "";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadDataAndInit();
});