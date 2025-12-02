// calc.js
import { state } from './store.js';
// 여기에 있던 잘못된 import 줄 삭제함
import { displayResult, initDropTable } from './ui.js';

// AP 계산
export function calcAp() {
    const c = parseInt(document.getElementById('curAp').value); 
    const r = document.getElementById('apResult');
    if(isNaN(c)) { r.innerText="AP 입력"; return; }
    if(c>=240) { r.innerText="Full!"; return; }
    const m = (240-c)*6; const h = Math.floor(m/60); const mn = m%60;
    const d = new Date(new Date().getTime()+m*60000);
    r.innerHTML = `<strong>${h}시간 ${mn}분</strong><br><span style='color:#128CFF'>${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} 완료</span>`;
}

// 학생 보너스 총합 계산
export function updateTotalBonus() {
    let totals = [0, 0, 0];

    for(let i = 0; i < 3; i++) {
        let strikers = [];
        let specials = [];

        state.selectedStudents.forEach(idx => {
            const s = state.studentData[idx];
            if (s) {
                let val = Array.isArray(s.bonus) ? (s.bonus[i] || 0) : (s.bonus || 0);
                if (s.role === 'SPECIAL') specials.push(val);
                else strikers.push(val);
            }
        });

        strikers.sort((a, b) => b - a);
        specials.sort((a, b) => b - a);

        const sumStrikers = strikers.slice(0, 4).reduce((acc, curr) => acc + curr, 0);
        const sumSpecials = specials.slice(0, 2).reduce((acc, curr) => acc + curr, 0);
        totals[i] = sumStrikers + sumSpecials;
    }

    for(let i = 0; i < 3; i++) {
        const valEl = document.getElementById(`bd-val-${i}`);
        if(valEl) valEl.innerText = totals[i] + "%";
    }

    const currentTotal = totals[state.currentTab];
    const badge = document.getElementById('totalStudentBonusBadge');
    if(badge) badge.innerText = currentTotal + "%";

    const mainInput = document.getElementById('bonusRate');
    if(mainInput) mainInput.value = currentTotal;

    calculate();
    initDropTable();
}

// 메인 효율 계산 로직
export function calculate() {
    let needs = [0, 0, 0];
    let totalNeedCount = 0;
    for(let i=0; i<3; i++) {
        needs[i] = Math.max(0, state.tabTotals[i] - state.globalCurrentAmounts[i]);
        totalNeedCount += needs[i];
    }

    if (totalNeedCount === 0) {
        displayResult([], 0, 0);
        return;
    }

    const bonusInput = document.getElementById('bonusRate');
    const bonusVal = parseInt(bonusInput ? bonusInput.value : 0) || 0;

    let stageOptions = [];
    state.stageConfig.forEach((stage, sIdx) => {
        const chk = document.querySelector(`.filter-check-input[value="${sIdx}"]`);
        if (chk && !chk.checked) return;

        let effectiveDrops = [0, 0, 0];
        if(stage.drops) {
            stage.drops.forEach((base, dIdx) => {
                if(base > 0) {
                    const bonusAmt = Math.ceil(base * (bonusVal / 100));
                    const targetTabIdx = state.tabMap.indexOf(dIdx);
                    if(targetTabIdx !== -1) {
                         effectiveDrops[targetTabIdx] = base + bonusAmt;
                    }
                }
            });
        }
        
        stageOptions.push({
            id: sIdx,
            data: stage,
            drops: effectiveDrops,
            ap: stage.ap,
            runCount: 0
        });
    });

    if (stageOptions.length === 0) {
        displayResult(null);
        return;
    }

    let safetyLoop = 0; 
    let currentNeeds = [...needs];

    while(currentNeeds.some(n => n > 0) && safetyLoop < 50000) {
        let bestStageOption = null;
        let maxScore = -1;

        for(let opt of stageOptions) {
            let value = 0;
            for(let i=0; i<3; i++) {
                if(currentNeeds[i] > 0) value += opt.drops[i];
            }

            if(value > 0) {
                let score = value / opt.ap;
                if(score > maxScore) {
                    maxScore = score;
                    bestStageOption = opt;
                }
            }
        }

        if(!bestStageOption) break;
        bestStageOption.runCount++;
        safetyLoop++;
        for(let i=0; i<3; i++) currentNeeds[i] -= bestStageOption.drops[i];
    }

    const finalResults = stageOptions.filter(opt => opt.runCount > 0);
    const surplus = currentNeeds.map(n => n < 0 ? Math.abs(n) : 0);

    displayResult(finalResults, surplus);
    initDropTable();
}