// ============================================================
// 1. [관리자 설정] 아이템 데이터
// ============================================================
const IMG_PATH = "src/"; 
const DEFAULT_IMG = "marieyon.png";

const shopConfig = [
    // [탭 0] 상점 1 (재화 A)
    [
        { name: "최상급 BD",      img: "marix.png",        price: 1,   qty: 180 }, 
        { name: "상급 BD",        img: "bd_gold.png",      price: 4,   qty: 95 },
        { name: "중급 BD",        img: "bd_blue.png",      price: 15,  qty: 30 },
        { name: "비의서",         img: "secret_tech.png",  price: 60,  qty: 12 },
        { name: "크레딧 포인트",   img: "credit.png",       price: 5,   qty: 50 },
    ],
    // [탭 1] 상점 2 (재화 B)
    [
        { name: "엘레프", img: "eleph.png", price: 300, qty: 5 }, 
        { name: "보고서", img: "report.png", price: 20, qty: 100 },
    ],
    // [탭 2] 상점 3 (재화 C)
    [
        { name: "가구", img: "furniture.png", price: 1000, qty: 1 },
    ]
];

// ============================================================
// [데이터] 스테이지 드랍 테이블 (여기를 수정해서 밸런스 조정)
// drops: [재화A 드랍량, 재화B 드랍량, 재화C 드랍량]
// ============================================================
const stageConfig = [
    { name: "01지 (Normal)", ap: 10, drops: [8, 2, 0] },
    { name: "02지 (Normal)", ap: 10, drops: [0, 8, 2] },
    { name: "03지 (Normal)", ap: 10, drops: [2, 0, 8] },
    { name: "04지 (Normal)", ap: 15, drops: [5, 5, 5] },
    { name: "05지 (Hard)",   ap: 15, drops: [15, 0, 0] },
    { name: "06지 (Hard)",   ap: 15, drops: [0, 15, 0] },
    { name: "07지 (Hard)",   ap: 15, drops: [0, 0, 15] },
    { name: "08지 (Hard)",   ap: 20, drops: [10, 10, 10] },
    { name: "09지 (Very Hard)", ap: 20, drops: [25, 0, 0] }, // A 효율 좋음
    { name: "10지 (Very Hard)", ap: 20, drops: [0, 25, 0] }, // B 효율 좋음
    { name: "11지 (Very Hard)", ap: 20, drops: [0, 0, 25] }, // C 효율 좋음
    { name: "12지 (Extreme)",   ap: 20, drops: [28, 2, 0] }  // A 최고 효율
];

// ============================================================
// 2. 시스템 로직
// ============================================================

let currentTab = 0;
let tabTotals = [0, 0, 0];

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
                const itemQty = data.qty || 0;
                const itemName = data.name || "아이템";
                const isDisabled = itemQty === 0;
                const fullPath = data.img ? (IMG_PATH + data.img) : DEFAULT_IMG;

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
                        <span class="limit-badge">구매제한: ${itemQty}회</span>
                        <div class="price-tag">
                            <span>Cost</span> <strong>${itemPrice}</strong>
                        </div>
                    </div>

                    <input type="hidden" class="cost-input" value="${itemPrice}">

                    <div class="control-row">
                        <input type="range" class="range-input" 
                               min="0" max="${itemQty}" value="0"
                               ${isDisabled ? 'disabled' : ''}
                               oninput="syncValues(this, 'range', ${sectionIdx})">
                        <input type="number" class="qty-input-sm" 
                               min="0" max="${itemQty}" value="0"
                               ${isDisabled ? 'disabled' : ''}
                               oninput="syncValues(this, 'number', ${sectionIdx})">
                    </div>
                `;
                sectionDiv.appendChild(card);
            });
        }
        container.appendChild(sectionDiv);
    }
    
    if(document.getElementById('targetAmount')) {
        document.getElementById('targetAmount').value = 0;
    }
}

// [중요] 보너스 목록 생성 (0~150%)
function initBonus() {
    const select = document.getElementById('bonusRate');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 0; i <= 150; i += 5) { // 5% 단위
        const option = document.createElement('option');
        option.value = i;
        option.text = i + "%";
        select.appendChild(option);
    }
    select.value = 0; // 기본값
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
    calculate(); // 탭 바꾸면 효율 좋은 스테이지도 바뀜
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
        calculate();
    }
}

// ============================================================
// [핵심] 효율 계산 알고리즘
// ============================================================
window.calculate = function() {
    const targetEl = document.getElementById('targetAmount');
    if (!targetEl) return;

    const target = parseInt(targetEl.value) || 0;
    const current = parseInt(document.getElementById('currentAmount').value) || 0;
    // [중요] 여기서 사용자가 선택한 보너스(%)를 가져옵니다.
    const bonusPercent = parseInt(document.getElementById('bonusRate').value) || 0;

    let needed = target - current;
    if (needed < 0) needed = 0;

    // 1. 모든 스테이지를 돌면서 "AP당 효율"이 가장 좋은 곳 찾기
    let bestStage = null;
    let maxEfficiency = -1; 
    let bestGainPerRun = 0;

    stageConfig.forEach(stage => {
        const baseDrop = stage.drops[currentTab] || 0; // 현재 탭 재화의 드랍량
        
        if (baseDrop > 0) {
            // [공식] 획득량 = 기본 + 올림(기본 * 보너스%)
            const bonusAmount = Math.ceil(baseDrop * (bonusPercent / 100));
            const totalGain = baseDrop + bonusAmount;
            
            // 효율 = 획득량 / 소모AP
            const efficiency = totalGain / stage.ap;

            // 효율이 더 좋거나, 같으면 상위 지역(index가 뒤쪽) 우선
            if (efficiency >= maxEfficiency) {
                maxEfficiency = efficiency;
                bestStage = stage;
                bestGainPerRun = totalGain;
            }
        }
    });

    // 2. 결과 출력
    const recNameEl = document.getElementById('recStageName');
    const recInfoEl = document.getElementById('recStageInfo');
    const resRunsEl = document.getElementById('result-runs');
    const resApEl = document.getElementById('result-ap');

    if (!bestStage) {
        recNameEl.innerText = "파밍 불가";
        recNameEl.style.color = "#FF5555";
        recInfoEl.innerText = "이 재화를 주는 스테이지가 없습니다.";
        resRunsEl.innerText = "0회";
        resApEl.innerText = "(총 0 AP)";
        return;
    }

    // 3. 소탕 횟수 계산
    const runs = Math.ceil(needed / bestGainPerRun);
    const totalAp = runs * bestStage.ap;

    recNameEl.innerText = bestStage.name;
    recNameEl.style.color = "#128CFF";
    recInfoEl.innerText = `1회당 ${bestGainPerRun}개 (보너스 포함)`;
    
    resRunsEl.innerText = runs.toLocaleString() + "회";
    resApEl.innerText = `(총 ${totalAp.toLocaleString()} AP 소모)`;
}

window.addEventListener('DOMContentLoaded', () => {
    initShop();
    initBonus();
    calculate();
});