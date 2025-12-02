// main.js
import { state } from './store.js';
import { initTabs, initShop, initStageFilters, initAcademyFilter, initStudentBonus, initDropTable, updateBonusDashboardIcons, switchTab, toggleStudent, toggleApWidget, toggleAllStages, syncValues, updateTotal, manualTarget, updateCurrent, toggleStudentSelector, toggleBonusFilter, toggleRoleFilter } from './ui.js';
import { calculate, calcAp, updateTotalBonus } from './calc.js';

async function loadDataAndInit() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`data.json load failed`);
        const data = await response.json();

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

    } catch (error) {
        console.error(error);
        alert("Live Server 확인 필요 (CORS 에러)");
    }
}

// [핵심] HTML onclick="함수()" 가 작동하도록 전역(window)에 연결
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

// 실행
window.addEventListener('DOMContentLoaded', loadDataAndInit);