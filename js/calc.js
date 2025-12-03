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
    // const mainInput = document.getElementById('bonusRate');
    // if(mainInput) mainInput.value = currentTotal;

    calculate();
    initDropTable();
}

// js/calc.js

// ... (updateTotalBonus 등 다른 함수는 그대로 유지) ...

// [수정됨] 메인 효율 계산 로직 (수기 입력 보너스 적용 방식 변경)
// calc.js

export function calculate() {
    let needs = [0, 0, 0, 0];
    let totalNeedCount = 0;
    
    // 1. 필요량 계산 (기존 동일)
    for(let i=0; i<4; i++) {
        needs[i] = Math.max(0, state.tabTotals[i] - state.globalCurrentAmounts[i]);
        totalNeedCount += needs[i];
    }

    if (totalNeedCount === 0) {
        displayResult([], 0, 0);
        return;
    }

    // 2. [변경됨] 학생 보너스 미리 계산
    // (이전 코드에서는 loop 안에서 계산하거나 DOM에서 가져왔는데, 정확성을 위해 여기서 재계산)
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
        
        // 상위 4명 + 2명 합산
        studentBonuses[i] = strikers.slice(0,4).reduce((a,b)=>a+b,0) + specials.slice(0,2).reduce((a,b)=>a+b,0);
    }

    // 3. 스테이지 효율 계산
    let stageOptions = [];
    state.stageConfig.forEach((stage, sIdx) => {
        const chk = document.querySelector(`.filter-check-input[value="${sIdx}"]`);
        if (chk && !chk.checked) return;

        let effectiveDrops = [0, 0, 0, 0];
        if(stage.drops) {
            stage.drops.forEach((base, dIdx) => {
                if(base > 0) {
                    // ★ 핵심 로직 변경: 수동 입력 우선 적용 ★
                    
                    // 1) 현재 재화(dIdx)가 대시보드의 몇 번째 칸(dashboardIdx)에 있는지 찾기
                    const dashboardIdx = state.bonusDashboardIcons.indexOf(dIdx);
                    
                    let finalBonus = 0;
                    let manualVal = 0;

                    // 2) 대시보드에 존재하는 재화라면, 수동 입력값 확인
                    if (dashboardIdx !== -1) {
                        const inputEl = document.getElementById(`bd-manual-${dashboardIdx}`);
                        if (inputEl && inputEl.value !== '') {
                            manualVal = parseInt(inputEl.value);
                        }
                    }

                    // 3) 우선순위 결정: 수동 입력값(숫자)이 존재하면 사용, 아니면 학생 보너스 사용
                    if (!isNaN(manualVal) && manualVal > 0) {
                        finalBonus = manualVal;
                    } else {
                        // 수동 입력이 없거나 0이면 학생 보너스(dIdx에 해당하는 값) 사용
                        finalBonus = studentBonuses[dIdx] || 0;
                    }

                    // 4) 최종 드랍량 계산 (기본 + 보너스)
                    const bonusAmt = Math.ceil(base * (finalBonus / 100));
                    
                    // 탭 매핑 확인 후 결과 배열에 저장
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

    // ... (이후 시뮬레이션 로직은 기존과 완전히 동일하므로 생략) ...
    // while 루프 및 displayResult 호출 부분 유지

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