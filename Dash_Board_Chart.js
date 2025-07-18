// ───── Nạp Google Charts ─────
google.charts.load("current", { packages: ["corechart"] });

// ───── Biến cấu hình Google Sheets ─────
const API_KEY = 'AIzaSyA1fRhQE_tbpwr0w7mc4kYWPWeGpN2I4-k';


// >>> CHÚ Ý: Cần biến global `currentMonthName` được định nghĩa và cập nhật từ script trước đó <<<
// Ví dụ: let currentMonthName = "January"; // Định nghĩa ở file script chính của bạn

// ───── Hàm fetch lương từ Google Sheets theo tháng ─────
// 📌 sheetId: ID file Sheets ứng với từng tháng
// 📌 sheetName: "Month 1", "Month 2", v.v...
// 📌 Lấy giá trị từ ô AN50 và hiển thị vào .salary
function fetchSalaryFromSheet(sheetId, sheetName) {
    const CELL = 'AN50'; // Ô chứa lương tổng
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!${CELL}?key=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            const value = data.values?.[0]?.[0] ?? "";

            let cleanedValue = value.toString().replace(/\./g, ''); // Loại bỏ tất cả dấu chấm (phân cách hàng nghìn)
            cleanedValue = cleanedValue.replace(',', '.'); // Đảm bảo dấu phẩy thập phân được chuyển thành dấu chấm

            const numeric = parseFloat(cleanedValue);

            if (!isNaN(numeric)) {
                document.querySelector('.salary').textContent = `${numeric.toLocaleString('vi-VN')} đ`;
            } else {
                document.querySelector('.salary').textContent = value || "Dữ Liệu?";
            }
        })
        .catch(error => {
            console.error('❌ Lỗi khi lấy dữ liệu Google Sheets:', error);
            document.querySelector('.salary').textContent = "Tohoho!";
        });
}

// ───── Hàm khởi động chính khi DOM sẵn sàng ─────
document.addEventListener("DOMContentLoaded", () => {
    // Các hàm này cần được định nghĩa ở đâu đó trong code của bạn
    // initCalendarTop();
    // setCalendarDateRange();
    // setupMonthClickHandler();

    // Gọi hàm tự động chọn tháng và cập nhật dữ liệu khi DOM sẵn sàng
    autoSelectCurrentMonth(); // Điều này sẽ gọi drawChart và fetchSalaryFromSheet lần đầu
    google.charts.setOnLoadCallback(drawChart); // Đảm bảo chart được vẽ sau khi Google Charts sẵn sàng
});

// ───── Hàm tự động chọn tháng hiện tại khi mở web ─────
// Hàm này sẽ thiết lập tháng ban đầu và kích hoạt fetch dữ liệu
function autoSelectCurrentMonth() {
    const now = new Date();
    const currentMonthIndex = now.getMonth(); // 0–11 (January is 0)
    
    // Cần đảm bảo `originalMonths` đã được định nghĩa ở đâu đó (ví dụ: trong script quản lý lịch)
    const originalMonths = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const monthName = originalMonths[currentMonthIndex]; // Lấy tên tháng

    // Cập nhật biến global `currentMonthName` (nếu bạn có)
    // Nếu `currentMonthName` là biến của một script khác, hãy đảm bảo nó có thể truy cập được hoặc truyền nó
    if (typeof currentMonthName !== 'undefined') {
        currentMonthName = monthName;
    }

    // Cập nhật giao diện
    const selectedMonthElement = document.querySelector('#selectedMonth');
    if (selectedMonthElement) {
        selectedMonthElement.textContent = monthName; // Cập nhật text của element #selectedMonth
    }
    
    const year = now.getFullYear();
    const start = `01/${(currentMonthIndex + 1).toString().padStart(2, '0')}/${year}`;
    const endDate = new Date(year, currentMonthIndex + 1, 0);
    const end = `${endDate.getDate()}/${(currentMonthIndex + 1).toString().padStart(2, '0')}/${year}`;

    const startDayElement = document.getElementById('start-day');
    const endDayElement = document.getElementById('end-day');
    if (startDayElement) startDayElement.textContent = start;
    if (endDayElement) endDayElement.textContent = end;

    // Kích hoạt vẽ biểu đồ và fetch lương cho tháng hiện tại
    // drawChart() sẽ tự gọi fetchSalaryFromSheet bên trong nó
    drawChart();
}

// ───── Hàm lấy dữ liệu từ Google Sheets ─────
async function fetchSheetData(sheetId, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    const json = await res.json();
    return json.values || [];
}

// ───── Vẽ biểu đồ Google Chart (Chuẩn hóa + Khớp màu nhãn) ─────
async function drawChart() {
    const chartContainer = document.getElementById('chart_inner');
    if (!chartContainer) {
        console.error("Không tìm thấy phần tử 'chart_inner'. Không thể vẽ biểu đồ.");
        return;
    }
    chartContainer.innerHTML = '<div class="loading-text">Đang tải dữ liệu...</div>';

    try {
        const startDayText = document.getElementById("start-day")?.textContent;
        if (!startDayText) {
            throw new Error("Không tìm thấy ngày bắt đầu. Đảm bảo 'start-day' được cập nhật.");
        }
        const monthNumber = parseInt(startDayText.split("/")[1]);
        
        // >>> SỬA LỖI: Lấy sheetId động cho tháng hiện tại <<<
        // Giả sử `currentMonthName` là biến global hoặc được truyền vào
        // Và `sheetLinks` cũng là biến global hoặc được truyền vào
        const currentMonthNameForData = originalMonths[monthNumber - 1]; // Lấy tên tháng từ số tháng
        const currentSheetId = sheetLinks[currentMonthNameForData];

        if (!currentSheetId) {
            throw new Error(`Không tìm thấy Sheet ID cho tháng: ${currentMonthNameForData}.`);
        }

        // RANGE_NAMES: Đây là tên của cột chứa tên nhân viên (vd: C5:C49).
        // Có thể cần một Sheet ID riêng cho danh sách tên, hoặc nó cũng nằm trong Sheet ID của tháng.
        // Giả sử tên nhân viên nằm trong cùng sheet của tháng.
        const RANGE_NAMES_DYNAMIC = `Day 1!C5:C49`; // Hoặc bạn cần một cách linh hoạt hơn cho Day 1
        const RANGE_HOURS_DYNAMIC = `Day 1!AJ5:AJ49`; // Hoặc bạn cần một cách linh hoạt hơn cho Day 1

        // Thay vì SHEET_ID_NAMES và SHEET_ID_HOURS cố định, dùng currentSheetId
        const [namesRaw, hoursRaw] = await Promise.all([
            fetchSheetData(currentSheetId, RANGE_NAMES_DYNAMIC),
            fetchSheetData(currentSheetId, RANGE_HOURS_DYNAMIC)
        ]);

        const names = namesRaw.flat().filter(name => name && name.trim() !== ''); // Lọc tên trống
        const hours = hoursRaw.map(row =>
            row[0] !== undefined ? parseFloat(row[0].toString().replace(',', '.')) : 0
        );

        // Đảm bảo hours có ít nhất 1 giá trị để tránh lỗi Math.max
        const maxHour = Math.max(...hours, 1);

        const rawData = [['ID', 'Tên', 'Giờ làm', { role: 'annotation' }, { role: 'style' }]];
        // nameToColorMap không được sử dụng trực tiếp để tô màu nhãn trục, nhưng vẫn hữu ích nếu bạn muốn
        const nameToColorMap = {}; 

        for (let i = 0; i < names.length; i++) { // Lặp qua số lượng tên thực tế
            const name = names[i]?.trim() || `Người ${i + 1}`;
            const hour = typeof hours[i] === 'number' && !isNaN(hours[i]) ? hours[i] : 0;

            const percent = (hour / maxHour) * 100;
            let color = '#c3aef1'; // Default
            if (percent >= 40) color = '#f8d936'; // Vàng
            if (percent >= 80) color = '#3bd7e5'; // Xanh lam

            nameToColorMap[name] = color; // Lưu màu cho tên

            rawData.push([
                `ID ${i + 1}`,
                name,
                hour,
                hour.toString(),
                color
            ]);
        }
        
        // Nếu không có dữ liệu, hiển thị thông báo
        if (rawData.length <= 1) { // Chỉ có hàng tiêu đề
            chartContainer.innerHTML = '<div class="loading-text">Không có dữ liệu giờ làm cho tháng này.</div>';
            document.querySelector('.salary').textContent = "Không có dữ liệu";
            return;
        }

        const data = google.visualization.arrayToDataTable(rawData);
        const view = new google.visualization.DataView(data);
        view.setColumns([
            1, 2,
            { calc: "stringify", sourceColumn: 2, type: "string", role: "annotation" },
            4
        ]);

        const baseWidthPerPerson = 130;
        // Tính chiều rộng dựa trên số lượng người có dữ liệu
        const width = Math.max(400, (names.length) * baseWidthPerPerson);

        chartContainer.innerText = '';
        const chartDiv = document.createElement('div');
        chartDiv.style.minWidth = `${width}px`;
        chartDiv.style.height = '425px';
        chartContainer.appendChild(chartDiv);

        const options = {
            title: `Giờ làm mỗi người (Tháng ${monthNumber})`,
            titleTextStyle: {
                fontName: 'Baloo 2', fontSize: 24, fontWeight: 'bold', color: '#2c3e50'
            },
            width,
            height: 425,
            bar: { groupWidth: '65%' },
            legend: { position: 'none' },
            hAxis: {
                title: 'Tên nhân viên',
                textStyle: { fontName: 'Baloo', fontSize: 18, color: '#2c3e50', fontWeight: 'bold' },
                titleTextStyle: { fontName: 'Baloo', fontSize: 25, color: '#2c3e50', fontWeight: 'bold' }
            },
            vAxis: {
                title: 'Giờ làm',
                textStyle: { fontName: 'Baloo', fontSize: 20, color: '#2c3e50', fontWeight: 'bold' },
                titleTextStyle: { fontName: 'Baloo', fontSize: 20, color: '#2c3e50', fontWeight: 'bold' }
            },
            chartArea: { left: 75, top: 70, width: '95%', height: '65%' },
            annotations: {
                alwaysOutside: true,
                stem: { color: 'transparent' },
                textStyle: {
                    fontName: 'Baloo 2',
                    fontSize: 20,
                    bold: true,
                    color: '#000000'
                }
            },
            tooltip: { trigger: 'none' }
        };

        new google.visualization.ColumnChart(chartDiv).draw(view, options);
        setTimeout(() => { chartContainer.scrollLeft = 0; }, 100);

        // Lấy lương
        // sheetName ở đây không thực sự cần thiết, bạn có thể truyền thẳng `Day 1` hoặc `Month X` tùy cấu trúc sheets
        // QUA QUAN TRỌNG: Gọi `fetchSalaryFromSheet` với `currentSheetId` đã tìm được
        fetchSalaryFromSheet(currentSheetId, `Day 1`); // Giả sử lương tổng nằm ở Day 1 của mỗi tháng

        // Gán màu chính xác cho tên nhân viên dưới cột
        setTimeout(() => {
            const chartTexts = document.querySelectorAll('#chart_inner svg text');

            chartTexts.forEach(text => {
                const name = text.textContent.trim();
                const isLabel = (
                    text.getAttribute('text-anchor') === 'middle' &&
                    name !== '' &&
                    !/^giờ làm|tên nhân viên|giờ làm mỗi người/i.test(name) && // Loại trừ tiêu đề trục
                    text.getAttribute('fill')?.toLowerCase() !== '#000000' // Đảm bảo không phải annotation value
                );

                if (isLabel && nameToColorMap[name]) { // Chỉ áp dụng màu nếu tên có trong map
                    // Không đổi màu fill ở đây vì màu đã được gán qua 'role: style' trong rawData
                    // Nếu bạn muốn nhãn trục cũng đổi màu theo cột, bạn có thể uncomment dòng dưới
                    // text.setAttribute('fill', nameToColorMap[name]); 
                }
                if (isLabel) { // Vẫn áp dụng font và size cho tất cả các nhãn trục hợp lệ
                    text.setAttribute('font-size', '20');
                    text.setAttribute('font-family', 'Baloo 2');
                    text.setAttribute('font-weight', 'bold');
                }
            });

            chartContainer.scrollLeft = 0;
        }, 500);

    } catch (err) {
        console.error('❌ Lỗi khi tải dữ liệu từ Sheets API:', err);
        chartContainer.innerText = `Lỗi khi tải dữ liệu: ${err.message}. Vui lòng kiểm tra API Key và ID Sheets.`;
        document.querySelector('.salary').textContent = "Lỗi!";
    }
}
