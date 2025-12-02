/* ApGuide.js */

function toggleGuideModal() {
    const modal = document.getElementById('guideModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    
    const dateInput = document.getElementById('g_date');
    if (!dateInput.value) {
        dateInput.valueAsDate = new Date();
    }
}

function runGuideCalc() {
    // 1. 입력값 가져오기
    const dateVal = document.getElementById('g_date').value;
    const cafeAP = parseInt(document.getElementById('g_cafe').value) || 0;
    const chargeCount = parseInt(document.getElementById('g_charge').value) || 0;
    const pvpCount = parseInt(document.getElementById('g_pvp').value) || 0;
    
    // 월정액(티켓)은 AP 안 주므로 삭제함.
    const has2Week = document.getElementById('g_2week').checked;  // 2주 AP 패키지

    // 2. 날짜 계산
    const dDay = dateVal ? new Date(dateVal) : new Date(); 
    const dMinus1 = new Date(dDay);
    dMinus1.setDate(dDay.getDate() - 1);
    const dMinus2 = new Date(dDay);
    dMinus2.setDate(dDay.getDate() - 2);

    const fmt = (d) => {
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const week = ['일','월','화','수','목','금','토'][d.getDay()];
        return `${month}월 ${day}일 (${week})`;
    };

    // 3. 상수 정의
    const CONST = {
        MAX_HOLD: 999,
        DAILY: 150,
        WEEKLY: 150,
        PVP: 90,
        CHARGE: 120,
        PACK_2WEEK: 150 // 2주 패키지 AP량
    };

    // 패키지 추가 AP (2주 패키지만 해당)
    let packAP = has2Week ? CONST.PACK_2WEEK : 0;


    // --- [계산 로직] ---

    // [1일차: D-2] 준비
    // 우편함 적립: 카페 + 일일 + 대항전
    let day1_Mailbox = cafeAP + CONST.DAILY + (CONST.PVP * pvpCount);

    // [2일차: D-1] 갱신 (우편함에 들어가는 양)
    // 카페 + 일일 + 대항전 + 충전 + (2주패키지)
    let day2_Refresh = cafeAP + CONST.DAILY + (CONST.PVP * pvpCount) 
                     + (chargeCount * CONST.CHARGE) 
                     + packAP;

    // [3일차: D-Day] 당일 사용
    // 당일 생산: 카페 + 일일 + 주간 + 대항전 + (2주패키지)
    // (참고: 월정액은 현상수배 티켓이라 AP 계산 제외)
    let day3_Income = cafeAP + CONST.DAILY + CONST.WEEKLY + (CONST.PVP * pvpCount) + packAP;
    
    // 최종 합계 (기본보유 + 어제우편함 + 오늘생산)
    let totalAP = CONST.MAX_HOLD + day2_Refresh + day3_Income;


    // 4. HTML 출력
    let html = '';

    html += `<div class="guide-step">`;
    html += `<h4>📅 1단계: ${fmt(dMinus2)}</h4>`;
    html += `<p class="step-desc">저녁 21:50 접속 권장</p>`;
    html += `<p>• 보유 AP 999 꽉 채우기</p>`;
    html += `<p>• 이후 획득분은 우편함 저장</p>`;
    html += `</div>`;

    html += `<div class="guide-step">`;
    html += `<h4>📅 2단계: ${fmt(dMinus1)}</h4>`;
    html += `<p class="step-desc">저녁 20:20 ~ 21:50 사이 접속 (시간엄수)</p>`;
    html += `<p>• 어제 우편함 수령/소모 → <strong>다시 채우기</strong></p>`;
    html += `<p>• <strong>우편함 저장 목표: ${day2_Refresh} AP</strong></p>`;
    if (has2Week) html += `<p style="font-size:12px; color:#E91E63;">(2주 AP 패키지 포함)</p>`;
    html += `</div>`;

    html += `<div class="guide-step">`;
    html += `<h4>📅 3단계: ${fmt(dDay)} (이벤트)</h4>`;
    html += `<p class="step-desc">점검 종료 후 접속</p>`;
    html += `<p>1. 보유분: 999 AP</p>`;
    html += `<p>2. 우편함: ${day2_Refresh} AP (어제 저장분)</p>`;
    html += `<p>3. 오늘분: ${day3_Income} AP</p>`;
    html += `</div>`;

    html += `<div class="guide-total">`;
    html += `🔥 최종 장전: 약 ${totalAP} AP`;
    html += `<div style="font-size:12px; margin-top:5px; font-weight:normal; color:#1565C0;">`;
    if (chargeCount > 0) {
        html += `(당일 ${chargeCount}충 추가 시: +${chargeCount * CONST.CHARGE} AP 가능)`;
    } else {
        html += `(당일 충전 미포함)`;
    }
    html += `</div></div>`;

    document.getElementById('guideResult').innerHTML = html;
}