// js/main.js
import { state } from './store.js';
import { initTabs, initShop, initStageFilters, initAcademyFilter, initStudentBonus, initDropTable, updateBonusDashboardIcons, switchTab, toggleStudent, toggleApWidget, toggleAllStages, syncValues, updateTotal, manualTarget, updateCurrent, toggleStudentSelector, toggleBonusFilter, toggleRoleFilter } from './ui.js';
import { calculate, calcAp, updateTotalBonus } from './calc.js';

// [NEW] 날짜 비교 유틸리티 함수
function getEventStatus(start, end) {
    if (!start || !end) return 'ing'; // 날짜 없으면 기본 진행중 처리
    const now = new Date();
    const sDate = new Date(start);
    const eDate = new Date(end);

    if (now >= sDate && now < eDate) return 'ing'; // 진행중
    if (now >= eDate) return 'end';               // 종료됨
    return 'ready';                               // 시작 전 (예정)
}

function getStatusText(status) {
    if (status === 'ing') return '진행중';
    if (status === 'end') return '종료';
    return '예정';
}

// [수정됨] 이벤트 목록 로드 및 자동 상태 반영
// [수정] 이벤트 목록 로드 함수
// [js/main.js]

// 이벤트 목록 로드 및 초기 배너 설정 함수
async function loadEventList() {
    try {
        const res = await fetch('src/event/events.json'); 
        if(!res.ok) throw new Error("events.json 로드 실패");
        const events = await res.json();
        
        const listContainer = document.getElementById('eventListContainer');
        listContainer.innerHTML = '';

        // 1. 현재 진행중('ing')인 이벤트 찾기
        let targetEvent = events.find(ev => getEventStatus(ev.startDate, ev.endDate) === 'ing');
        
        // 2. 진행중인 게 없으면? 목록의 맨 첫 번째(최신) 이벤트를 보여줌
        if (!targetEvent) {
            targetEvent = events[0];
        }

        // 3. [핵심 수정] 조건 따지지 말고 무조건 배너 이미지부터 박아넣음!
        if (targetEvent) {
            // 배너 이미지와 배지 즉시 업데이트 (이미지 src 채우고 display:block 처리됨)
            updateMainBanner(targetEvent);
            
            // 데이터 로드는 필요할 때만 (현재 로드된 파일과 다를 때, 혹은 초기 상태일 때)
            // 'data.json'은 store.js의 기본값이므로, 이것도 초기 로드로 간주해서 덮어씀
            if (!state.currentJsonPath || state.currentJsonPath === 'data.json') {
                loadDataAndInit(targetEvent.dataFile);
            }
        }

        // 4. 리스트 아이템 생성
        events.forEach(ev => {
            const div = document.createElement('div');
            div.className = 'event-item';
            
            const statusKey = getEventStatus(ev.startDate, ev.endDate);
            const statusLabel = getStatusText(statusKey);

            // 현재 보고 있는 데이터와 일치하면 active 클래스
            if(ev.dataFile === state.currentJsonPath || (state.currentJsonPath === 'data.json' && ev === targetEvent)) {
                div.classList.add('active');
            }
            
            div.innerHTML = `
                <div class="banner-wrapper">
                    <img src="${ev.bannerImg}" class="list-banner-img" alt="${ev.name}">
                    <span class="status-badge-overlay ${statusKey}">${statusLabel}</span>
                </div>
            `;
            
            div.onclick = () => {
                loadDataAndInit(ev.dataFile);
                updateMainBanner(ev); 
                document.querySelectorAll('.event-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            };
            listContainer.appendChild(div);
        });
    } catch (e) { console.log("이벤트 목록 로드 에러:", e); }
}

// [수정] 메인 배너 업데이트 함수 (안전장치 추가됨)
function updateMainBanner(eventData) {
    // 1. 이미지 변경
    const bannerImg = document.querySelector('.banner-area img');
    if (bannerImg) {
        // eventData가 객체면 .bannerImg를 쓰고, 혹시 옛날 코드처럼 문자열이 넘어오면 그대로 씀 (에러 방지)
        const imgSrc = eventData.bannerImg || eventData;
        bannerImg.src = imgSrc;
        bannerImg.style.display = 'block';
    }

    // 2. 배지 상태 변경 (핵심 로직)
    const badgeEl = document.getElementById('mainBannerBadge');
    if (badgeEl) {
        // eventData가 정상적인 객체일 때만 배지 계산
        if (typeof eventData === 'object' && eventData.startDate) {
            const statusKey = getEventStatus(eventData.startDate, eventData.endDate);
            const statusLabel = getStatusText(statusKey);

            // 클래스와 텍스트 적용 후 보이게 설정
            badgeEl.className = `status-badge-overlay ${statusKey}`;
            badgeEl.innerText = statusLabel;
            badgeEl.style.display = 'inline-flex';
            
            // 위치 보정 (혹시 배너 밖으로 나가면)
            badgeEl.style.position = 'absolute';
            badgeEl.style.top = '10px';
            badgeEl.style.left = '10px';
            badgeEl.style.zIndex = '10';
        } else {
            // 데이터가 없으면 배지 숨김
            badgeEl.style.display = 'none';
        }
    }
}

function toggleEventListUI() {
    const el = document.getElementById('eventListContainer');
    el.classList.toggle('hidden');
}

async function loadDataAndInit(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`${jsonPath} load failed`);
        const data = await response.json();

        resetState();
        state.currentJsonPath = jsonPath;

        if (data.eventSettings) {
            state.currencyIcons = data.eventSettings.currencyIcons || [];
            state.tabMap = data.eventSettings.tabMap || [0, 1, 3];
            state.tabDisplayMap = data.eventSettings.tabDisplayMap || state.tabMap;
            state.shopTabIcons = data.eventSettings.shopTabIcons || [1, 2, 3];
            state.bonusDashboardIcons = data.eventSettings.bonusDashboardIcons || [0, 1, 2];
        }

        state.itemMap = data.itemMap || {};
        state.shopConfig = data.shopConfig;
        state.stageConfig = data.stageConfig;

        try {
            const charRes = await fetch('characters.json'); 
            if (charRes.ok) {
                const rawChars = await charRes.json();
                const bonusMap = data.studentBonuses || {};
                
                state.studentData = rawChars
                    .filter(char => bonusMap.hasOwnProperty(char.name))
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

        const tAmt = document.getElementById('targetAmount');
        const cAmt = document.getElementById('currentAmount');
        const bRate = document.getElementById('bonusRate');
        if(tAmt) tAmt.value = 0;
        if(cAmt) cAmt.value = 0;
        if(bRate) bRate.value = 0;

    } catch (error) {
        console.error(error);
        // 에러 발생 시 사용자에게 알림 (개발 중에는 유용)
        // alert(`데이터 로드 실패: ${jsonPath}`);
    }
}

function resetState() {
    state.currentTab = 0;
    state.tabTotals = [0, 0, 0, 0];
    state.globalCurrentAmounts = [0, 0, 0, 0];
    state.selectedStudents.clear();
    state.activeBonusFilter = -1;
    state.currentAcademy = "ALL";
}

// 전역 연결
window.switchTab = switchTab;
window.toggleApWidget = toggleApWidget;
window.adjustAp = (d) => { const i = document.getElementById('curAp'); let v = (parseInt(i.value)||0)+d; if(v<0)v=0; if(v>240)v=240; i.value=v; calcAp(); };
window.calcAp = calcAp;
window.toggleStudentSelector = toggleStudentSelector;
window.toggleBonusFilter = toggleBonusFilter;
window.toggleRoleFilter = toggleRoleFilter;
window.toggleStudent = toggleStudent;
window.manualTarget = manualTarget;
window.updateCurrent = updateCurrent;
window.calculate = calculate;
window.syncValues = syncValues;
window.updateTotal = updateTotal;
window.toggleAllStages = toggleAllStages;
window.filterByAcademy = (ac) => { state.currentAcademy = ac; initStudentBonus(); };
window.toggleEventListUI = toggleEventListUI;

// 실행
window.addEventListener('DOMContentLoaded', () => {
    // 자동 로드 함수만 실행 (여기서 날짜 체크 후 알아서 loadDataAndInit을 호출함)
    loadEventList(); 
});