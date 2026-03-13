// URL สำหรับเรียกใช้ Google Sheets API
const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.RANGE}?key=${CONFIG.API_KEY}&_=${new Date().getTime()}`;

// อ้างอิงถึง Element ต่างๆ ใน HTML
const tablesContainer = document.getElementById('tables-container');
const loader = document.getElementById('loader');
const dateFilter = document.getElementById('date-filter');
const dayFilter = document.getElementById('day-filter');
const storeFilter = document.getElementById('store-filter');
const quantityFilter = document.getElementById('quantity-filter');
const lastUpdatedSpan = document.getElementById('last-updated');
const modal = document.getElementById('image-modal');
const carouselTrack = document.getElementById('carousel-track');
const carouselPrev = document.getElementById('carousel-prev');
const carouselNext = document.getElementById('carousel-next');
const carouselIndicators = document.getElementById('carousel-indicators');
const closeModal = document.querySelector('.close-btn');

// Party Size Modal Elements
const partyModal = document.getElementById('party-modal');
const partyInput = document.getElementById('party-input');
const partySubmit = document.getElementById('party-submit');
const partyWarning = document.getElementById('party-warning');

let allTables = [];
let currentSlideIndex = 0;
let modalImages = [];
let partySize = 0;

// ปิดการเลื่อนหน้าจอชั่วคราวขณะแสดง Party Modal
if (partyModal) {
    document.body.style.overflow = 'hidden';
    partyModal.style.display = 'block';
}

if (partySubmit) {
    partySubmit.addEventListener('click', () => {
        const value = parseInt(partyInput.value, 10);
        if (value > 0) {
            partySize = value;
            partyModal.style.display = 'none';
            document.body.style.overflow = ''; // คืนค่าการเลื่อนหน้าจอ
            if (allTables.length > 0) {
                applyFilters(); // Re-render tables with the new partySize
            }
        } else {
            partyWarning.style.opacity = '1';
        }
    });
}

function updateCarousel() {
    if (modalImages.length === 0) return;

    // Slide track
    carouselTrack.style.transition = 'transform 0.4s ease-in-out';
    carouselTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

    // Update indicators
    Array.from(carouselIndicators.children).forEach((dot, index) => {
        if (index === currentSlideIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update buttons visibility
    if (modalImages.length > 1) {
        carouselPrev.style.display = currentSlideIndex === 0 ? 'none' : 'flex';
        carouselNext.style.display = currentSlideIndex === modalImages.length - 1 ? 'none' : 'flex';
    } else {
        carouselPrev.style.display = 'none';
        carouselNext.style.display = 'none';
    }
}

if (carouselPrev) {
    carouselPrev.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            currentSlideIndex--;
            updateCarousel();
        }
    });
}

if (carouselNext) {
    carouselNext.addEventListener('click', () => {
        if (currentSlideIndex < modalImages.length - 1) {
            currentSlideIndex++;
            updateCarousel();
        }
    });
}

// --- Swipeable Image Gallery for VVIP Experience ---
let isDragging = false;
let startPosX = 0;
let startPosY = 0;
let isScrolling = false;

// ป้องกันการลากรูปภาพเป็น default พฤติกรรมของเบราว์เซอร์
modal.addEventListener('dragstart', (e) => e.preventDefault());

// ใน iOS การจะ preventDefault ต้องมี passive: false
modal.addEventListener('touchstart', touchStart, { passive: true });
modal.addEventListener('touchend', touchEnd);
modal.addEventListener('touchcancel', touchEnd);
modal.addEventListener('touchmove', touchMove, { passive: false });

// เสริมให้ใช้เมาส์ลากได้ด้วยบน Desktop
modal.addEventListener('mousedown', touchStart);
modal.addEventListener('mouseup', touchEnd);
modal.addEventListener('mouseleave', (e) => {
    if (isDragging) touchEnd(e);
});
modal.addEventListener('mousemove', touchMove);

function getPositionX(event) {
    return event.type.includes('mouse') ? event.clientX : event.touches[0].clientX;
}
function getPositionY(event) {
    return event.type.includes('mouse') ? event.clientY : event.touches[0].clientY;
}

function touchStart(event) {
    if (modalImages.length <= 1) return;
    isDragging = true;
    isScrolling = false;
    startPosX = getPositionX(event);
    startPosY = getPositionY(event);
    carouselTrack.style.transition = 'none'; // ปิด transition เพื่อให้ลากตามนิ้วได้ทันที
}

function touchMove(event) {
    if (!isDragging) return;

    const currentPosX = getPositionX(event);
    const currentPosY = getPositionY(event);
    const diffX = currentPosX - startPosX;
    const diffY = currentPosY - startPosY;

    // ถ้าเป็นการเลื่อนขึ้นลงมากกว่าซ้ายขวา (Scroll) ให้ปล่อยผ่าน
    if (!isScrolling) {
        if (Math.abs(diffY) > Math.abs(diffX)) {
            isScrolling = true;
            isDragging = false;
            return;
        }
    }

    // ถ้ากำลังเลื่อนซ้ายขวา (Slide) ให้บล็อค default event ของเบราว์เซอร์
    if (isDragging && !isScrolling) {
        if (event.cancelable) {
            event.preventDefault();
        }
    }

    const shift = (-(currentSlideIndex * 100)) + ((diffX / carouselTrack.offsetWidth) * 100);

    // จำกัดไม่ให้ลากเลยกรอบซ้ายและขวาสุดมากเกินไป (หนืดๆ)
    if (currentSlideIndex === 0 && diffX > 0) {
        carouselTrack.style.transform = `translateX(${shift * 0.2}%)`;
    } else if (currentSlideIndex === modalImages.length - 1 && diffX < 0) {
        carouselTrack.style.transform = `translateX(${(-(currentSlideIndex * 100)) + (diffX / carouselTrack.offsetWidth * 100) * 0.2}%)`;
    } else {
        carouselTrack.style.transform = `translateX(${shift}%)`;
    }
}

function touchEnd(event) {
    if (!isDragging) return;
    isDragging = false;

    let endPosX;
    if (event.type.includes('mouse')) {
        endPosX = event.clientX;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
        endPosX = event.changedTouches[0].clientX;
    } else {
        endPosX = startPosX;
    }

    const diffX = endPosX - startPosX;

    carouselTrack.style.transition = 'transform 0.4s ease-in-out'; // เปิด transition กลับมาเหมือนเดิม

    const swipeThreshold = carouselTrack.offsetWidth * 0.15; // ต้องลากผ่าน 15% ของความกว้าง

    if (diffX < -swipeThreshold && currentSlideIndex < modalImages.length - 1) {
        currentSlideIndex++;
    } else if (diffX > swipeThreshold && currentSlideIndex > 0) {
        currentSlideIndex--;
    }

    updateCarousel();
}

// สถานะที่อนุญาตให้แสดง
const VISIBLE_STATUSES = ['ว่าง', 'ถูกจองแล้ว'];

// ฟังก์ชันช่วยแปลง 'MM/DD/YYYY' เป็น Date object
function parseSheetDate(dateString) {
    if (!dateString || !dateString.includes('/')) return null;
    const parts = dateString.split('/');
    if (parts.length < 3) return null;
    return new Date(parts[2], parts[0] - 1, parts[1]);
}

// ฟังก์ชันหลักสำหรับดึงข้อมูลและเริ่มการทำงาน
async function fetchData() {
    loader.style.display = 'block';
    tablesContainer.innerHTML = '';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`เกิดข้อผิดพลาด: ${response.statusText}`);
        }
        const data = await response.json();

        allTables = (data.values || []).map(row => ({
            storeName: row[0] || 'N/A',
            zone: row[1] || '-',
            tableNumber: row[2] || '-',
            quantity: parseInt(row[3], 10) || 0,
            pricePerTable: parseInt(row[4], 10) || 0,
            creditPrice: parseInt(row[5], 10) || 0,
            total: parseInt(row[6], 10) || 0,
            status: row[7] ? row[7].trim() : 'N/A',
            bookedBy: row[8] || '-',
            date: row[9] || 'N/A',
            dayOfWeek: row[10] ? row[10].trim() : 'N/A',
            notes: row[11] || '',
            hashtag: row[12] || 'N/A',
            layoutImages: [row[13], row[14], row[15], row[16]].filter(img => img && typeof img === 'string' && img.trim() !== ''),
        }));

        // เรียงตามวันที่ น้อย → มาก
        allTables.sort((a, b) => {
            const dateA = parseSheetDate(a.date);
            const dateB = parseSheetDate(b.date);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });

        populateFilters();
        applyFilters();
        updateLastUpdatedTime();

    } catch (error) {
        console.error('ไม่สามารถดึงข้อมูลได้:', error);
        tablesContainer.innerHTML = `<p style="text-align:center; color:red;">ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการตั้งค่า API Key หรือ Sheet ID</p>`;
    } finally {
        loader.style.display = 'none';
    }
}

// ฟังก์ชันสร้างตัวเลือกในฟิลเตอร์
// วันที่จะแสดงเฉพาะที่มีโต๊ะสถานะ "ว่าง" หรือ "ถูกจองแล้ว" อย่างน้อย 1 รายการ
function populateFilters() {
    const visibleTables = allTables.filter(t => VISIBLE_STATUSES.includes(t.status));

    const dates = [...new Set(visibleTables.map(t => t.date).filter(d => d && d !== 'N/A'))];
    const days = [...new Set(visibleTables.map(t => t.dayOfWeek).filter(d => d && d !== 'N/A'))];
    const storeNames = [...new Set(visibleTables.map(t => t.storeName).filter(n => n && n !== 'N/A'))];
    const quantities = [...new Set(visibleTables.map(t => t.quantity).filter(q => q > 0))].sort((a, b) => a - b);

    dateFilter.innerHTML = '<option value="all">◆ ทุกวันที่</option>';
    dayFilter.innerHTML = '<option value="all">◆ ทุกวัน</option>';
    storeFilter.innerHTML = '<option value="all">◆ ทุกร้าน</option>';
    quantityFilter.innerHTML = '<option value="all">◆ ทุกจำนวนโต๊ะ</option>';

    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatThaiDate(date);
        dateFilter.appendChild(option);
    });

    const thaiDayNames = { 'Fri': 'วันศุกร์', 'Sat': 'วันเสาร์', 'Sun': 'วันอาทิตย์', 'Mon': 'วันจันทร์', 'Tue': 'วันอังคาร', 'Wed': 'วันพุธ', 'Thu': 'วันพฤหัสบดี' };
    days.forEach(day => {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = thaiDayNames[day] || day;
        dayFilter.appendChild(option);
    });

    storeNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        storeFilter.appendChild(option);
    });

    quantities.forEach(qty => {
        const option = document.createElement('option');
        option.value = qty;
        option.textContent = `${qty} โต๊ะ`;
        quantityFilter.appendChild(option);
    });
}

// ฟังก์ชันเช็คว่าโต๊ะนี้ถูกแนะนำหรือไม่
function isTableRecommended(table, currentPartySize) {
    if (table.status !== 'ว่าง' || currentPartySize <= 0) return false;
    
    // 1-7 คน -> แนะนำโต๊ะเดี่ยว (1 โต๊ะ)
    if (currentPartySize >= 1 && currentPartySize <= 7 && table.quantity === 1) {
        return true;
    } 
    // 7-14 คน -> แนะนำโต๊ะคู่ (2 โต๊ะขึ้นไป) 
    else if (currentPartySize >= 7 && currentPartySize <= 14 && table.quantity >= 2) {
        return true;
    }
    
    return false;
}

// ฟังก์ชันแสดงผลการ์ดข้อมูลโต๊ะ
function renderTables(tables) {
    tablesContainer.innerHTML = '';
    if (tables.length === 0) {
        tablesContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-gem">◆</span>
                <p>NO AVAILABILITY MATCHING YOUR SELECTION</p>
            </div>`;
        return;
    }

    // เรียงลำดับข้อมูลใหม่ก่อนแสดงผล
    // ลำดับความสำคัญ: 1. โต๊ะที่แนะนำ -> 2. โต๊ะว่างปกติ -> 3. โต๊ะที่ถูกจองแล้ว
    // ภายในกลุ่มเดียวกันจะเรียงตามวันที่ (ซึ่งเรียงมาก่อนหน้านี้แล้วจาก fetchData) แต่เพื่อความชัวร์ จะเรียงอีกรอบ
    const sortedTables = [...tables].sort((a, b) => {
        const isRecA = isTableRecommended(a, partySize);
        const isRecB = isTableRecommended(b, partySize);
        
        // ถ้าสถานะแนะนำไม่เหมือนกัน เอาตัวแนะนำขึ้นก่อน
        if (isRecA !== isRecB) {
            return isRecA ? -1 : 1;
        }

        // สถานะว่าง ขึ้นก่อนสถานะถูกจอง
        const isAvailA = a.status === 'ว่าง';
        const isAvailB = b.status === 'ว่าง';
        if (isAvailA !== isAvailB) {
            return isAvailA ? -1 : 1; 
        }
        
        // ถ้าสถานะแนะนำและความว่างเหมือนกัน ให้เรียงตามวันที่
        const dateA = parseSheetDate(a.date);
        const dateB = parseSheetDate(b.date);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    sortedTables.forEach(table => {
        const card = document.createElement('div');
        card.className = 'table-card';

        const [formattedDate, formattedDay] = formatThaiDateAndDay(table.date, table.dayOfWeek);

        const storeThemes = {
            'Hashtag': 'hashtag-theme',
            'replayground': 'replayground-theme',
            'Sigma': 'sigma-theme'
        };
        const themeClass = storeThemes[table.storeName] || '';

        // Status badge
        const isAvailable = table.status === 'ว่าง';
        const statusClass = isAvailable ? 'status-available' : 'status-booked';
        const statusText = isAvailable ? 'AVAILABLE' : 'RESERVED';

        // Recommendation System
        let recommendedBadgeHTML = '';
        if (isTableRecommended(table, partySize)) {
            recommendedBadgeHTML = `<div class="recommended-badge">Recommended for ${partySize} pax</div>`;
        }

        const layoutButtonHTML = table.layoutImages && table.layoutImages.length > 0
            ? `<button class="layout-btn" data-images='${JSON.stringify(table.layoutImages)}'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>ภาพโต๊ะ/ผังโต๊ะ</span>
               </button>`
            : '';

        const notesHTML = table.notes
            ? `
            <div class="notes-section">
                <div class="detail-label">หมายเหตุ</div>
                <div class="detail-value">${table.notes}</div>
            </div>`
            : '';

        // Copy text
        const copyText = `สนใจจอง ${table.storeName} วันที่ ${formattedDate} โซน ${table.zone} โต๊ะ ${table.tableNumber}`;

        // Per-person price calculation
        let perPersonHTML = '';
        if (partySize > 0 && table.total > 0) {
            const extraCost = table.total - (table.creditPrice * table.quantity);
            const perPersonCost = Math.ceil(Math.max(0, extraCost) / partySize);
            perPersonHTML = `<span class="per-person-price">(ตกท่านละ ${perPersonCost.toLocaleString()} ฿)</span>`;
        }

        card.innerHTML = `
            <div class="card-header ${themeClass}">
                ${recommendedBadgeHTML}
                <div class="header-left" ${recommendedBadgeHTML ? 'style="margin-top: 1rem;"' : ''}>
                    <h2 class="store-name">${table.storeName}</h2>
                    <div class="date-info">
                        <span class="date-tag">${formattedDate}</span>
                        <span class="day-tag">${formattedDay}</span>
                    </div>
                </div>
                <div class="card-meta" ${recommendedBadgeHTML ? 'style="margin-top: 1rem;"' : ''}>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="detail-row">
                    <span class="detail-label">Zone</span>
                    <span class="detail-value">${table.zone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Table No.</span>
                    <span class="detail-value detail-table-no">
                        ${table.tableNumber}
                        <button class="copy-btn" data-copy="${copyText}" title="คัดลอก">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">จำนวนโต๊ะ</span>
                    <span class="detail-value">${table.quantity} โต๊ะ</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">มูลค่าเครดิตโต๊ะ</span>
                    <span class="detail-value">${(table.creditPrice * table.quantity).toLocaleString()}</span>
                </div>
                ${notesHTML}
            </div>
            <div class="card-footer">
                <div class="total-row">
                    <span class="total-label">Total</span>
                    <span class="total-price">${table.total.toLocaleString()} ฿ ${perPersonHTML}</span>
                </div>
                ${layoutButtonHTML}
            </div>
        `;
        tablesContainer.appendChild(card);
    });
}

// ฟังก์ชันกรองข้อมูลตามที่ผู้ใช้เลือก
function applyFilters() {
    const selectedDate = dateFilter.value;
    const selectedDay = dayFilter.value;
    const selectedStore = storeFilter.value;
    const selectedQuantity = quantityFilter.value;

    const filteredTables = allTables
        // แสดงเฉพาะสถานะที่กำหนด
        .filter(table => VISIBLE_STATUSES.includes(table.status))
        .filter(table => selectedDate === 'all' || table.date === selectedDate)
        .filter(table => selectedDay === 'all' || table.dayOfWeek === selectedDay)
        .filter(table => selectedStore === 'all' || table.storeName === selectedStore)
        .filter(table => selectedQuantity === 'all' || table.quantity == selectedQuantity);

    renderTables(filteredTables);
}

// ----- ฟังก์ชันเสริม -----
function formatThaiDate(dateString) {
    if (!dateString || !dateString.includes('/')) return 'N/A';
    const parts = dateString.split('/');
    if (parts.length < 3) return dateString;
    const [month, day, year] = parts;
    const thaiMonths = {
        '1': 'มกรา', '01': 'มกรา',
        '2': 'กุมภา', '02': 'กุมภา',
        '3': 'มีนา', '03': 'มีนา',
        '4': 'เมษา', '04': 'เมษา',
        '5': 'พฤษภา', '05': 'พฤษภา',
        '6': 'มิถุนา', '06': 'มิถุนา',
        '7': 'กรกฎา', '07': 'กรกฎา',
        '8': 'สิงหา', '08': 'สิงหา',
        '9': 'กันยา', '09': 'กันยา',
        '10': 'ตุลา',
        '11': 'พฤศจิกา',
        '12': 'ธันวา'
    };
    return `${parseInt(day, 10)} ${thaiMonths[month] || month}`;
}

function formatThaiDateAndDay(dateString, dayString) {
    const thaiDays = { 'Sun': 'อาทิตย์', 'Mon': 'จันทร์', 'Tue': 'อังคาร', 'Wed': 'พุธ', 'Thu': 'พฤหัส', 'Fri': 'ศุกร์', 'Sat': 'เสาร์' };
    const formattedDate = formatThaiDate(dateString);
    const formattedDay = dayString ? (thaiDays[dayString.trim()] || dayString) : '-';
    return [formattedDate, formattedDay];
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    lastUpdatedSpan.textContent = timeString;
}

// ----- Toast notification -----
function showToast(message) {
    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add('copy-toast--show');
    setTimeout(() => {
        toast.classList.remove('copy-toast--show');
        setTimeout(() => toast.remove(), 400);
    }, 1800);
}

// ----- Event delegation -----
tablesContainer.addEventListener('click', function (event) {
    const copyBtn = event.target.closest('.copy-btn');
    if (copyBtn) {
        const text = copyBtn.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
            showToast('✓  คัดลอกแล้ว');
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showToast('✓  คัดลอกแล้ว');
        });
        return;
    }

    const layoutBtn = event.target.closest('.layout-btn');
    if (layoutBtn) {
        try {
            modalImages = JSON.parse(layoutBtn.getAttribute('data-images') || '[]');
        } catch (e) {
            modalImages = [];
        }

        if (modalImages.length > 0) {
            currentSlideIndex = 0;

            // Generate slides
            carouselTrack.innerHTML = modalImages.map(src =>
                `<div class="carousel-slide"><img src="${src}" alt="Table Layout" draggable="false"></div>`
            ).join('');

            // Generate indicators
            carouselIndicators.innerHTML = modalImages.length > 1 ? modalImages.map((_, i) =>
                `<div class="indicator${i === 0 ? ' active' : ''}" data-index="${i}"></div>`
            ).join('') : '';

            // Add click events to indicators
            Array.from(carouselIndicators.children).forEach(dot => {
                dot.addEventListener('click', function () {
                    currentSlideIndex = parseInt(this.getAttribute('data-index'));
                    updateCarousel();
                });
            });

            updateCarousel();
            modal.style.display = 'block';
        }
    }
});

closeModal.onclick = function () { modal.style.display = 'none'; }
window.onclick = function (event) { if (event.target == modal) modal.style.display = 'none'; }

// ----- เริ่มการทำงาน -----
dateFilter.addEventListener('change', applyFilters);
dayFilter.addEventListener('change', applyFilters);
storeFilter.addEventListener('change', applyFilters);
quantityFilter.addEventListener('change', applyFilters);

document.addEventListener('DOMContentLoaded', fetchData);
