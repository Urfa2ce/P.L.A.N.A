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
    let totals = [0, 0, 0, 0]; // [수정] 4칸으로 초기화

    // [수정] i < 4 로 변경
    for(let i = 0; i < 4; i++) {
        let strikers = [];
        let specials = [];

        state.selectedStudents.forEach(idx => {
            const s = state.studentData[idx];
            if (s) {
                // 보너스 배열 길이가 짧을 경우 대비 (|| 0)
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

    // [수정] 화면 표시도 4개까지
    for(let i = 0; i < 4; i++) {
        const valEl = document.getElementById(`bd-val-${i}`);
        if(valEl) valEl.innerText = totals[i] + "%";
    }

    const currentTotal = totals[state.currentTab]; 
    const mainInput = document.getElementById('bonusRate');
    if(mainInput) mainInput.value = currentTotal;

    calculate();
    initDropTable();
}

// js/calc.js

// ... (updateTotalBonus 등 다른 함수는 그대로 유지) ...

// [수정됨] 메인 효율 계산 로직 (수기 입력 보너스 적용 방식 변경)
export function calculate() {
    let needs = [0, 0, 0, 0];
    let totalNeedCount = 0;
    
    // 1. 필요량 계산
    for(let i=0; i<4; i++) {
        needs[i] = Math.max(0, state.tabTotals[i] - state.globalCurrentAmounts[i]);
        totalNeedCount += needs[i];
    }

    if (totalNeedCount === 0) {
        displayResult([], 0, 0);
        return;
    }

    // 2. 수기 입력 보너스 값 가져오기
    const manualBonusInput = document.getElementById('bonusRate');
    const manualBonusVal = parseInt(manualBonusInput ? manualBonusInput.value : 0) || 0;

    // 3. 학생 보너스(자동 계산된 값) 가져오기 (updateTotalBonus에서 계산된 값 활용 필요)
    // 하지만 현재 구조상 DOM에서 가져오거나 다시 계산해야 함.
    // 편의상 여기서 학생 보너스를 다시 빠르게 계산합니다.
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

    let stageOptions = [];
    state.stageConfig.forEach((stage, sIdx) => {
        const chk = document.querySelector(`.filter-check-input[value="${sIdx}"]`);
        if (chk && !chk.checked) return;

        let effectiveDrops = [0, 0, 0, 0];
        if(stage.drops) {
            stage.drops.forEach((base, dIdx) => {
                if(base > 0) {
                    // [핵심 수정] 보너스 적용 로직
                    // 현재 선택된 탭(state.currentTab)과 같은 재화(dIdx)라면 -> 수기 입력값(manualBonusVal) 사용 (단, 수기입력이 0이면 학생 보너스 사용)
                    // 다른 재화라면 -> 학생 보너스(studentBonuses[dIdx]) 사용
                    
                    // 탭 매핑 확인 (tabMap[탭번호] == 재화인덱스)
                    // 예: 탭0 -> 재화1, 탭1 -> 재화2 ...
                    const currentTabCurrencyIdx = state.tabMap[state.currentTab]; 
                    
                    let finalBonus = 0;

                    // 현재 루프의 재화(dIdx)가 현재 선택된 탭의 재화와 같은가?
                    if (dIdx === currentTabCurrencyIdx) {
                        // 같다면 입력창의 값 우선 (입력창이 0이면 학생값)
                        // 사용자가 "보너스%" 칸에 입력한 값은 '현재 보고 있는 상점'의 보너스라고 가정
                        finalBonus = manualBonusVal; 
                    } else {
                        // 다르다면 원래 학생 보너스 적용
                        finalBonus = studentBonuses[dIdx];
                    }

                    // 보너스 적용 (기본 + 보너스)
                    const bonusAmt = Math.ceil(base * (finalBonus / 100));
                    
                    // 탭 매핑이 된 재화만 결과에 포함
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

    // ... (이후 시뮬레이션 및 결과 출력 로직은 기존과 동일) ...
    // ... (while 루프 등 그대로 유지) ...
    
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
            for(let i=0; i<4; i++) {
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
        for(let i=0; i<4; i++) currentNeeds[i] -= bestStageOption.drops[i];
    }

    const finalResults = stageOptions.filter(opt => opt.runCount > 0);
    const surplus = currentNeeds.map(n => n < 0 ? Math.abs(n) : 0);

    displayResult(finalResults, surplus);
    initDropTable();
}