// ============================================================
// 1. [사용자 설정] 아이템 데이터
// ============================================================

const IMG_PATH = "src/"; 
const DEFAULT_IMG = "marieyon.png"; // 이미지가 없을 때 기본값

const shopConfig = [
    // [탭 0] 상점 1
    [
        { name: "초급 활동 보고서",      img: "marix.png",        price: 1,   qty: 180 }, 
        { name: "일반 활동 보고서",        img: "bd_gold.png",      price: 4,   qty: 95 },
        { name: "상급 활동 보고서",        img: "bd_blue.png",      price: 15,  qty: 30 },
        { name: "최상급 활동 보고서",         img: "secret_tech.png",  price: 60,  qty: 12 },
        { name: "기초 전술 교육 BD\n(레드윈터)",   img: "credit.png",       price: 5,   qty: 50 },
        { name: "일반 전술 교육 BD\n(레드윈터)",         img: "eleph.png",        price: 300, qty: 5 }, 
        { name: "기초 전술 교육 BD\n(레드윈터)",         img: "report.png",       price: 20,  qty: 100 },
        { name: "기초 전술 교육 BD\n(레드윈터)",         img: "stone.png",        price: 10,  qty: 50 },
        //{ name: "가구", img: "furniture.png",    price: 1000, qty: 1 },
    ],
    // [탭 1] 상점 2
    [
        { name: "엘레프 1", img: "eleph.png", price: 5, qty: 150 }, 
        { name: "엘레프 2", img: "eleph.png", price: 15, qty: 50 }, 
        { name: "엘레프 3", img: "eleph.png", price: 50, qty: 0 }, 
        //{ name: "엘레프 4", img: "eleph.png", price: 300, qty: 5 }, 
        { name: "엘레프 5", img: "eleph.png", price: 300, qty: 5 }, 
        { name: "보고서 1", img: "report.png", price: 20, qty: 100 },
        { name: "보고서 2", img: "report.png", price: 20, qty: 100 },
        //{ name: "보고서 3", img: "report.png", price: 20, qty: 100 },
        { name: "강화석 A", img: "stone.png", price: 10, qty: 50 },
        { name: "강화석 B", img: "stone.png", price: 10, qty: 50 },
        //{ name: "강화석 dS", img: "stone.png", price: 10, qty: 50 },
    ],
    // [탭 2] 상점 3
    [
        { name: "가구", img: "furniture.png", price: 1000, qty: 1 },
    ]
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

        // ▼▼▼ [핵심 수정] 16번 반복하던 루프를 삭제하고 forEach로 변경했습니다! ▼▼▼
        if (customItems.length === 0) {
            sectionDiv.innerHTML = '<p style="text-align:center; width:100%; color:#999; padding:20px;">아이템이 없습니다.</p>';
        } else {
            customItems.forEach((data) => {
                // 데이터 안전 장치
                const itemPrice = data.price !== undefined ? data.price : 0;
                const itemQty = data.qty !== undefined ? data.qty : 0;
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
        // ▲▲▲ 수정 끝 ▲▲▲

        container.appendChild(sectionDiv);
    }
    
    // 초기화 시 0으로 설정
    if(document.getElementById('targetAmount')) {
        document.getElementById('targetAmount').value = 0;
    }
}


// --- 슬라이더-숫자 연동 함수 ---
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

// --- 탭 전환 ---
window.switchTab = function(idx) {
    currentTab = idx;
    document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === idx));
    document.querySelectorAll('.shop-section').forEach((sec, i) => sec.classList.toggle('active', i === idx));
    document.getElementById('targetAmount').value = tabTotals[idx];
    calculate();
}

// --- 합계 계산 ---
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

// --- 최종 효율 계산 ---
window.calculate = function() {
    const targetEl = document.getElementById('targetAmount');
    if (!targetEl) return;

    const target = parseInt(targetEl.value) || 0;
    const current = parseInt(document.getElementById('currentAmount').value) || 0;
    const baseDrop = parseInt(document.getElementById('baseDrop').value) || 0;
    const bonusPercent = parseInt(document.getElementById('bonusRate').value) || 0;
    const apCost = 20;

    if (baseDrop <= 0) {
        document.getElementById('result-runs').innerText = "0회";
        return;
    }

    let needed = target - current;
    if (needed < 0) needed = 0;

    const bonusAmount = Math.ceil(baseDrop * (bonusPercent / 100));
    const totalGain = baseDrop + bonusAmount;

    const runs = Math.ceil(needed / totalGain);
    const totalAp = runs * apCost;

    document.getElementById('result-runs').innerText = runs.toLocaleString() + "회";
    document.getElementById('result-ap').innerText = `(총 ${totalAp.toLocaleString()} AP 소모)`;
}

// HTML 로드 후 실행
window.addEventListener('DOMContentLoaded', initShop);