// store.js
export const state = {
    currencyIcons: [],
    tabMap: [],
    shopTabIcons: [],
    bonusDashboardIcons: [],
    tabDisplayMap: [],
    itemMap: {},
    shopConfig: [],
    stageConfig: [],
    studentData: [],
    
    currentTab: 0,
    tabTotals: [0, 0, 0],
    globalCurrentAmounts: [0, 0, 0],
    
    selectedStudents: new Set(),
    activeRoles: new Set(['STRIKER', 'SPECIAL']),
    activeBonusFilter: -1,
    currentAcademy: "ALL"
};