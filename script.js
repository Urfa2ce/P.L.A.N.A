// ============================================================
// 1. 전역 변수 및 설정
// ============================================================
const IMG_PATH = "src/"; 
const DEFAULT_IMG = "marieyon.png";

// JSON에서 불러올 변수들 (초기값)
let currencyIcons = []; 
let tabMap = [];        
let itemMap = {}; // [NEW] 아이템 매핑용 사전
let shopConfig = [];    
let stageConfig = [];   

let currentTab = 0;
let tabTotals = [0, 0, 0];
let globalCurrentAmounts = [0, 0, 0];

// ============================================================
// 2. 데이터 로딩 및 초기화 (JSON Fetch)
// ============================================================
async function loadDataAndInit() {
    try {
        // 'data.json' 파일을 비동기로 요청
        const response = await fetch('data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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

        // 2. 아이템 매핑 정보 가져오기 (없으면 빈 객체)
        itemMap = data.itemMap || {};

        // 3. 데이터 정보 가져오기
        shopConfig = data.shopConfig;
        stageConfig = data.stageConfig;

        // 4. 화면 그리기 (순서 중요)
        initTabs();      // 탭 버튼 생성
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
// 3. 화면 생성 함수들
// ============================================================

function initTabs() {
    const tabContainer = document.querySelector('.shop-tabs');
    if (!tabContainer) return;
    tabContainer.innerHTML = ''; 

    for (let i = 0; i < 3; i++) {
        const dropIdx = tabMap[i]; 
        const iconName = currencyIcons[dropIdx] || DEFAULT_IMG;
        const iconPath = IMG_PATH + iconName;

        const div = document.createElement('div');
        div.className = `tab-btn ${i === currentTab ? 'active' : ''}`;
        div.onclick = () => switchTab(i);
        
        div.innerHTML = `
            <img src="${iconPath}" class="tab-icon" onerror="this.style.display='none'"> 
            상점 ${i + 1}
        `;
        
        tabContainer.appendChild(div);
    }
}

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
// ============================================================
// [수정] 드랍 테이블 (모든 아이템을 우측 회색 영역에 표시)
// ============================================================
function initDropTable() {
    const container = document.getElementById('drop-table-list');
    if (!container) return;
    container.innerHTML = '';

    // 현재 선택된 보너스 %
    const bonusPercent = parseInt(document.getElementById('bonusRate').value) || 0;

    stageConfig.forEach((stage) => {
        const row = document.createElement('div');
        row.className = 'stage-row';

        // 이제 중간 영역(base-area)은 쓰지 않으므로 비워둡니다.
        let baseHtml = ''; 
        
        // 모든 아이템(기본+보너스)을 담을 우측 영역 변수
        let allDropsHtml = ''; 

        if (stage.drops) {
            stage.drops.forEach((baseAmount, idx) => {
                if (baseAmount && baseAmount > 0) {
                    const iconName = currencyIcons[idx] || DEFAULT_IMG;
                    const iconPath = IMG_PATH + iconName;
                    
                    // 1. [기본 드랍] 배지 생성 -> 우측 영역에 추가
                    allDropsHtml += `
                        <div class="drop-badge" title="기본 드랍: ${baseAmount}개">
                            <img src="${iconPath}" onerror="this.style.display='none'">
                            <span>x${baseAmount}</span>
                        </div>
                    `;

                    // 2. [보너스 드랍] 배지 생성 -> 우측 영역에 이어서 추가
                    if (bonusPercent > 0) {
                        const bonusAmount = Math.ceil(baseAmount * (bonusPercent / 100));
                        
                        if (bonusAmount > 0) {
                            allDropsHtml += `
                                <div class="drop-badge bonus-drop" title="보너스 추가: +${bonusAmount}">
                                    <span class="table-bonus-badge">Bonus</span>
                                    <img src="${iconPath}" onerror="this.style.display='none'">
                                    <span>+${bonusAmount}</span>
                                </div>
                            `;
                        }
                    }
                }
            });
        }

        // HTML 조립
        row.innerHTML = `
            <div class="stage-info">
                <div class="stage-title">${stage.name}</div>
                <div class="stage-ap-badge">${stage.ap} AP</div>
            </div>

            <div class="base-area">
                </div>
            
            <div class="bonus-area">
                ${allDropsHtml || '<span style="font-size:0.8rem; color:#ccc;">-</span>'}
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

        // drops 배열 순회
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
    initDropTable();
}
// ============================================================
// [수정] 결과 표시 (기본 + 보너스 분리 표시)
// ============================================================
function displayResult(stage, runs, ap, gains, surplus, isDone = false) {
    const recNameEl = document.getElementById('recStageName');
    const recInfoEl = document.getElementById('recStageInfo');
    const resRunsEl = document.getElementById('result-runs');
    const resApEl = document.getElementById('result-ap');
    let surplusEl = document.getElementById('result-surplus');

    // 보너스 % 가져오기
    const bonusPercent = parseInt(document.getElementById('bonusRate').value) || 0;

    if (!surplusEl) {
        const resultBox = document.querySelector('.result-box');
        surplusEl = document.createElement('div');
        surplusEl.id = 'result-surplus';
        surplusEl.className = 'res-surplus';
        resultBox.appendChild(surplusEl);
    }

    if (isDone) {
        recNameEl.innerText = "졸업 완료! 🎉";
        recNameEl.style.color = "#128CFF";
        recInfoEl.innerText = "모든 재화를 모았습니다.";
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
    
    // ▼▼▼ [핵심 수정] 기본/보너스 분리 로직 ▼▼▼
    let gainHtml = [];
    
    // stage.drops 배열(0~3)을 순회하며 직접 계산해서 표시
    if (stage.drops) {
        for(let i=0; i < stage.drops.length; i++) {
            const baseAmount = stage.drops[i];
            
            // 기본 드랍이 있는 경우에만 처리
            if(baseAmount && baseAmount > 0) {
                const iconName = currencyIcons[i] || DEFAULT_IMG;
                const iconPath = IMG_PATH + iconName;
                
                // 1. [기본] 아이템 표시 (배지 없음)
                gainHtml.push(`
                    <span class="gain-item" title="기본 드랍">
                        <img src="${iconPath}" onerror="this.style.display='none'" class="mini-icon">
                        <b>x${baseAmount}</b>
                    </span>
                `);

                // 2. [보너스] 아이템 표시 (조건부 생성)
                if (bonusPercent > 0) {
                    // 보너스 수량 계산 (올림 처리)
                    const bonusAmount = Math.ceil(baseAmount * (bonusPercent / 100));
                    
                    if (bonusAmount > 0) {
                        gainHtml.push(`
                            <span class="gain-item" title="추가 보너스 (+${bonusPercent}%)">
                                <span class="bonus-badge">Bonus</span> <img src="${iconPath}" onerror="this.style.display='none'" class="mini-icon">
                                <b>x${bonusAmount}</b>
                            </span>
                        `);
                    }
                }
            }
        }
    }
    // ▲▲▲ 수정 끝 ▲▲▲

    recInfoEl.innerHTML = `1회: ${gainHtml.join('')} <div style="margin-top:5px; font-size:0.85em; color:#eee;">(AP ${stage.ap})</div>`;

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