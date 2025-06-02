// Constants
const STORAGE_KEY = 'clownadescarskey';
const OIL_CHANGE_INTERVAL = 10000; // 10,000 km
const WARNING_DAYS = 7;

// DOM Elements
const carList = document.getElementById('carList');
const addCarModal = document.getElementById('addCarModal');
const viewCarModal = document.getElementById('viewCarModal');
const confirmationDialog = document.getElementById('confirmationDialog');
const toast = document.getElementById('toast');
const addCarForm = document.getElementById('addCarForm');

// State
let cars = [];
let currentCarIndex = -1;
let userId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Event Listeners Setup
function setupEventListeners() {
    // Add car button
    document.querySelector('.add-car-button').addEventListener('click', () => {
        showModal('addCarModal');
    });

    // Add car form
    addCarForm.addEventListener('submit', handleAddCar);
    document.querySelectorAll('.cancel-button').forEach(button => {
        button.addEventListener('click', () => {
            closeModal('addCarModal');
            closeModal('viewCarModal');
            closeModal('confirmationDialog');
        });
    });

    // View car modal buttons
    viewCarModal.querySelector('.edit-button').addEventListener('click', handleEditCar);
    viewCarModal.querySelector('.delete-button').addEventListener('click', showDeleteConfirmation);
    viewCarModal.querySelector('.close-button').addEventListener('click', () => {
        closeModal('viewCarModal');
    });

    // Confirmation dialog
    confirmationDialog.querySelector('.confirm-button').addEventListener('click', handleDeleteCar);
    confirmationDialog.querySelector('.cancel-button').addEventListener('click', () => {
        closeModal('confirmationDialog');
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addCarModal) closeModal('addCarModal');
        if (e.target === viewCarModal) closeModal('viewCarModal');
    });
}

// Car Management Functions
async function loadCars() {
    try {
        const storageKey = `cars_${userId}`;
        const data = await cloudStorage.getItem(storageKey);
        cars = data ? JSON.parse(data) : [];
        renderCars();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast('Ошибка загрузки данных', 'error');
        cars = [];
        renderCars();
    }
}

async function saveCars() {
    try {
        const storageKey = `cars_${userId}`;
        await cloudStorage.setItem(storageKey, JSON.stringify(cars));
        renderCars();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToast('Ошибка сохранения данных', 'error');
    }
}

function renderCars() {
    carList.innerHTML = '';
    cars.forEach((car, index) => {
        const carElement = createCarElement(car, index);
        carList.appendChild(carElement);
    });
}

function createCarElement(car, index) {
    const div = document.createElement('div');
    div.className = 'car-item';
    div.innerHTML = `
        <div class="car-name">${car.name}</div>
        <div class="timer-container">
            <div class="timer ${isDateWarning(car.insuranceEndDate) ? 'warning' : ''}">
                <div class="timer-label">Страховка</div>
                <div class="timer-value">${formatTimeRemaining(car.insuranceEndDate)}</div>
            </div>
            <div class="timer ${isDateWarning(car.maintenanceEndDate) ? 'warning' : ''}">
                <div class="timer-label">ТО</div>
                <div class="timer-value">${formatTimeRemaining(car.maintenanceEndDate)}</div>
            </div>
            <div class="timer">
                <div class="timer-label">До замены масла</div>
                <div class="timer-value">${formatMileageRemaining(car.mileage, car.lastOilChangeMileage)} км</div>
            </div>
        </div>
    `;

    div.addEventListener('click', () => showCarDetails(index));
    return div;
}

function renderCarInfo(car) {
    const carInfo = viewCarModal.querySelector('.car-info');
    carInfo.innerHTML = `
        <h3>${car.name}</h3>
        <div class="info-grid">
            <div class="info-item">
                <label>VIN:</label>
                <div class="vin-container">
                    <span>${car.vin}</span>
                    <button class="copy-button" onclick="copyVIN('${car.vin}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="info-item">
                <label>Номер:</label>
                <span>${car.plate}</span>
            </div>
            <div class="info-item">
                <label>Пробег:</label>
                <span>${car.mileage} км</span>
            </div>
            <div class="info-item">
                <label>Дата покупки:</label>
                <span>${formatDate(car.purchaseDate)}</span>
            </div>
            <div class="info-item">
                <label>Последняя замена масла:</label>
                <span>${car.lastOilChangeMileage} км</span>
            </div>
            <div class="info-item">
                <label>Последняя замена ГРМ:</label>
                <span>${car.lastTimingBeltMileage} км</span>
            </div>
            <div class="info-item">
                <label>Страховка до:</label>
                <span>${formatDate(car.insuranceEndDate)}</span>
            </div>
            <div class="info-item">
                <label>ТО до:</label>
                <span>${formatDate(car.maintenanceEndDate)}</span>
            </div>
            <div class="info-item full-width">
                <label>Описание:</label>
                <div class="description-text">${car.description || 'Нет описания'}</div>
                <button class="edit-description-button" onclick="editDescription(${currentCarIndex})">
                    <i class="fas fa-edit"></i> Редактировать описание
                </button>
            </div>
            ${renderLinks(car)}
        </div>
    `;
}

function renderCarInfoEditable(car) {
    const carInfo = viewCarModal.querySelector('.car-info');
    carInfo.innerHTML = `
        <div class="form-group">
            <label>Название:</label>
            <input type="text" data-field="name" value="${car.name}" required>
        </div>
        <div class="form-group">
            <label>VIN:</label>
            <input type="text" data-field="vin" value="${car.vin}" required>
        </div>
        <div class="form-group">
            <label>Номер:</label>
            <input type="text" data-field="plate" value="${car.plate}" required>
        </div>
        <div class="form-group">
            <label>Пробег (км):</label>
            <input type="number" data-field="mileage" value="${car.mileage}" required>
        </div>
        <div class="form-group">
            <label>Дата покупки:</label>
            <input type="date" data-field="purchaseDate" value="${car.purchaseDate}" required>
        </div>
        <div class="form-group">
            <label>Пробег на последней замене масла (км):</label>
            <input type="number" data-field="lastOilChangeMileage" value="${car.lastOilChangeMileage}" required>
        </div>
        <div class="form-group">
            <label>Пробег на последней замене ГРМ (км):</label>
            <input type="number" data-field="lastTimingBeltMileage" value="${car.lastTimingBeltMileage}" required>
        </div>
        <div class="form-group">
            <label>Страховка до:</label>
            <input type="date" data-field="insuranceEndDate" value="${car.insuranceEndDate}" required>
        </div>
        <div class="form-group">
            <label>ТО до:</label>
            <input type="date" data-field="maintenanceEndDate" value="${car.maintenanceEndDate}" required>
        </div>
        <div class="form-group">
            <label>Описание:</label>
            <textarea data-field="description" rows="4">${car.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Ссылка 1:</label>
            <input type="url" data-field="link1" value="${car.link1 || ''}">
        </div>
        <div class="form-group">
            <label>Ссылка 2:</label>
            <input type="url" data-field="link2" value="${car.link2 || ''}">
        </div>
        <div class="form-group">
            <label>Ссылка 3:</label>
            <input type="url" data-field="link3" value="${car.link3 || ''}">
        </div>
        <div class="form-group">
            <label>Ссылка 4:</label>
            <input type="url" data-field="link4" value="${car.link4 || ''}">
        </div>
    `;
}

function renderLinks(car) {
    return ['link1', 'link2', 'link3', 'link4']
        .map((link, index) => {
            const url = car[link];
            return url ? `
                <div class="info-item">
                    <label>Ссылка ${index + 1}:</label>
                    <a href="${url}" target="_blank">${url}</a>
                </div>
            ` : `
                <div class="info-item">
                    <label>Ссылка ${index + 1}:</label>
                    <span class="no-link">Нет ссылки</span>
                </div>
            `;
        })
        .join('');
}

// Utility Functions
function showCarDetails(index) {
    currentCarIndex = index;
    const car = cars[index];
    renderCarInfo(car);
    showModal('viewCarModal');
}

function showDeleteConfirmation() {
    showModal('confirmationDialog');
}

function copyVIN(vin) {
    navigator.clipboard.writeText(vin).then(() => {
        showToast('VIN скопирован');
    }).catch(err => {
        console.error('Failed to copy VIN:', err);
        showToast('Ошибка при копировании VIN');
    });
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU');
}

function formatTimeRemaining(dateString) {
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} дн.`;
}

function formatMileageRemaining(currentMileage, lastChangeMileage) {
    const remaining = OIL_CHANGE_INTERVAL - (currentMileage - lastChangeMileage);
    return remaining > 0 ? remaining : 0;
}

function isDateWarning(dateString) {
    const end = new Date(dateString);
    const now = new Date();
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= WARNING_DAYS;
}

function editDescription(index) {
    const car = cars[index];
    const description = car.description || '';
    
    const textarea = document.createElement('textarea');
    textarea.value = description;
    textarea.rows = 4;
    textarea.className = 'description-edit';
    
    const descriptionDiv = viewCarModal.querySelector('.description-text');
    const editButton = viewCarModal.querySelector('.edit-description-button');
    
    descriptionDiv.replaceWith(textarea);
    
    const saveButton = document.createElement('button');
    saveButton.innerHTML = '<i class="fas fa-save"></i> Сохранить';
    saveButton.className = 'save-description-button';
    
    saveButton.addEventListener('click', () => {
        car.description = textarea.value;
        saveCars();
        renderCarInfo(car);
        showToast('Описание сохранено');
    });
    
    editButton.replaceWith(saveButton);
}

function formatURL(url) {
    if (!url) return '';
    
    url = url.trim();
    if (!url) return '';
    
    // Remove any existing http:// or https:// to standardize the URL
    url = url.replace(/^(https?:\/\/)/, '');
    
    // If the URL is still empty after trimming, return empty string
    if (!url) return '';
    
    // Add https:// and check if it's valid
    const fullUrl = `https://${url}`;
    try {
        new URL(fullUrl);
        return fullUrl;
    } catch {
        // If it's not a valid URL, return empty string
        return '';
    }
}

// Add input event listeners for VIN and plate number fields
document.addEventListener('DOMContentLoaded', () => {
    // Existing initialization code...
    
    // Add input event listeners for uppercase conversion
    document.getElementById('vin').addEventListener('input', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(start, end);
    });

    document.getElementById('plate').addEventListener('input', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(start, end);
    });
    
    // Add input event listeners for URL fields to show preview
    ['link1', 'link2', 'link3', 'link4'].forEach(id => {
        const input = document.getElementById(id);
        const previewId = `${id}Preview`;
        
        // Create preview element if it doesn't exist
        let preview = document.getElementById(previewId);
        if (!preview) {
            preview = document.createElement('div');
            preview.id = previewId;
            preview.className = 'url-preview';
            input.parentNode.insertBefore(preview, input.nextSibling);
        }
        
        input.addEventListener('input', function() {
            const formattedUrl = formatURL(this.value);
            if (formattedUrl) {
                preview.textContent = `Будет сохранено как: ${formattedUrl}`;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        });
    });
});

// Start the application
async function init() {
    if (!await checkCloudStorageSupport()) return;
    
    userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
        showToast('Ошибка: ID пользователя не найден', 'error');
        return;
    }
    await loadCars();
    setupEventListeners();
}

const tg = window.Telegram.WebApp;
const { cloudStorage } = window.TelegramAppsSDK;

// Проверка поддержки Cloud Storage
async function checkCloudStorageSupport() {
    if (!cloudStorage.isSupported()) {
        showToast('Cloud Storage не поддерживается в этой версии Telegram', 'error');
        return false;
    }
    return true;
}

// Отображение автомобиля
function viewCar(index) {
    const car = cars[index];
    const carInfo = document.querySelector('.car-info');
    carInfo.innerHTML = `
        <div class="info-group">
            <label>Название:</label>
            <div>${car.name}</div>
        </div>
        <div class="info-group">
            <label>VIN:</label>
            <div>${car.vin}</div>
        </div>
        <div class="info-group">
            <label>Номер:</label>
            <div>${car.plate}</div>
        </div>
        <div class="info-group">
            <label>Пробег:</label>
            <div>${car.mileage} км</div>
        </div>
        <div class="info-group">
            <label>Дата покупки:</label>
            <div>${car.purchaseDate}</div>
        </div>
        <div class="info-group">
            <label>Последняя замена масла:</label>
            <div>${car.lastOilChangeMileage} км</div>
        </div>
        <div class="info-group">
            <label>Последняя замена ГРМ:</label>
            <div>${car.lastTimingBeltMileage} км</div>
        </div>
        <div class="info-group">
            <label>Страховка до:</label>
            <div>${car.insuranceEndDate}</div>
        </div>
        <div class="info-group">
            <label>ТО до:</label>
            <div>${car.maintenanceEndDate}</div>
        </div>
        ${car.description ? `
        <div class="info-group">
            <label>Описание:</label>
            <div>${car.description}</div>
        </div>
        ` : ''}
    `;

    // Настройка кнопок
    const editButton = document.querySelector('.edit-button');
    const deleteButton = document.querySelector('.delete-button');
    
    editButton.onclick = () => editCar(index);
    deleteButton.onclick = () => showDeleteConfirmation(index);
    
    showModal('viewCarModal');
}

// Редактирование автомобиля
function editCar(index) {
    const car = cars[index];
    // Заполняем форму данными
    document.getElementById('carName').value = car.name;
    document.getElementById('mileage').value = car.mileage;
    document.getElementById('vin').value = car.vin;
    document.getElementById('plate').value = car.plate;
    document.getElementById('purchaseDate').value = car.purchaseDate;
    document.getElementById('lastOilChange').value = car.lastOilChangeMileage;
    document.getElementById('lastTimingBelt').value = car.lastTimingBeltMileage;
    document.getElementById('insuranceEnd').value = car.insuranceEndDate;
    document.getElementById('maintenanceEnd').value = car.maintenanceEndDate;
    document.getElementById('description').value = car.description || '';
    document.getElementById('link1').value = car.link1 || '';
    document.getElementById('link2').value = car.link2 || '';
    document.getElementById('link3').value = car.link3 || '';
    document.getElementById('link4').value = car.link4 || '';

    // Удаляем старый автомобиль
    cars.splice(index, 1);
    
    closeModal('viewCarModal');
    showModal('addCarModal');
}

// Добавление автомобиля
async function handleAddCar(e) {
    e.preventDefault();
    const newCar = {
        name: document.getElementById('carName').value,
        mileage: parseInt(document.getElementById('mileage').value),
        vin: document.getElementById('vin').value.toUpperCase(),
        plate: document.getElementById('plate').value.toUpperCase(),
        purchaseDate: document.getElementById('purchaseDate').value,
        lastOilChange: parseInt(document.getElementById('lastOilChange').value),
        lastTimingBelt: parseInt(document.getElementById('lastTimingBelt').value),
        insuranceEnd: document.getElementById('insuranceEnd').value,
        maintenanceEnd: document.getElementById('maintenanceEnd').value,
        description: document.getElementById('description').value,
        link1: document.getElementById('link1').value,
        link2: document.getElementById('link2').value,
        link3: document.getElementById('link3').value,
        link4: document.getElementById('link4').value
    };

    cars.push(newCar);
    await saveCars();
    closeModal('addCarModal');
    document.getElementById('addCarForm').reset();
    showToast('Автомобиль добавлен');
}

// Показ модального окна
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Закрытие модального окна
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Удаление автомобиля
async function handleDeleteCar() {
    cars.splice(currentCarIndex, 1);
    await saveCars();
    closeModal('confirmationDialog');
    closeModal('viewCarModal');
    showToast('Автомобиль удален');
}

// Запуск приложения
tg.ready();
init(); 
