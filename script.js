const API_BASE = 'https://fakexy-api-sage.vercel.app';
const randomBtn = document.getElementById('random-btn');
const countryGridContainer = document.getElementById('country-grid-container');
const resultOutputContainer = document.getElementById('result-output-container');
const countryCountDisplay = document.getElementById('country-count-display');
const apiStatusDot = document.getElementById('api-status-dot');

let availableCountries = {};
let currentAddressData = null;

// The ordered list of keys we prefer to show
const FIELD_ORDER = [
    'Street', 'City/Town', 'State/Province/Region', 'Zip/Postal Code',
    'Country', 'Country_Code', 'Latitude', 'Longitude',
    'Full Name', 'Gender', 'Birthday', 'Phone Number',
    'Credit card brand', 'Credit card number', 'Expire', 'CVV',
    'Social Security Number'
];

document.addEventListener('DOMContentLoaded', () => {
    fetchCountriesAndInit();

    randomBtn.addEventListener('click', () => {
        removeActiveStates();
        fetchAddress(API_BASE + '/api/random');
    });
});

async function fetchCountriesAndInit() {
    try {
        const response = await fetch(API_BASE + '/api/countries');
        if (response.ok) {
            const data = await response.json();
            availableCountries = data;

            let totalCountryCount = Object.keys(data).length;
            countryCountDisplay.textContent = totalCountryCount;

            apiStatusDot.style.color = 'var(--green)';

            renderCountryButtons(data);
        } else {
            handleApiError();
        }
    } catch (error) {
        console.error('Error fetching countries:', error);
        handleApiError();
    }
}

function handleApiError() {
    apiStatusDot.style.color = 'var(--red)';
    countryCountDisplay.textContent = 'Error';
    countryGridContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--red);">Failed to load countries. API Offline.</div>';
}

function renderCountryButtons(countries) {
    countryGridContainer.innerHTML = ''; // Clear loading

    // Sort logically
    const sortedCountries = Object.entries(countries).sort(([, a], [, b]) => a.name.localeCompare(b.name));

    sortedCountries.forEach(([code, info]) => {
        const btn = document.createElement('button');
        btn.className = 'country-btn';
        // Now displaying full name and code
        const displayTxt = `${info.name} (${code})`;

        btn.innerHTML = `<span style="white-space: normal; text-align: center; line-height: 1.2;">${displayTxt}</span>`;
        btn.onclick = () => {
            removeActiveStates();
            btn.classList.add('active');
            fetchAddress(API_BASE + `/api/address?code=${code}`);
        };
        countryGridContainer.appendChild(btn);
    });
}

function removeActiveStates() {
    document.querySelectorAll('.country-btn').forEach(btn => btn.classList.remove('active'));
}

async function fetchAddress(url) {
    showLoadingSkeletons();

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            // Handle fuzzy match suggestion case
            const addressData = data.suggestion ? data.address : data;
            currentAddressData = addressData;
            renderAddressFields(addressData);
        } else {
            let errorMsg = data.error || 'Unknown error occurred.';
            resultOutputContainer.innerHTML = `<div style="color: var(--red); padding: 20px;">Error: ${errorMsg}</div>`;
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        resultOutputContainer.innerHTML = `<div style="color: var(--red); padding: 20px;">Connection Error</div>`;
    }
}

function showLoadingSkeletons() {
    let skeletons = '';
    for (let i = 0; i < 8; i++) { // show 8 skeletons
        skeletons += `
        <div class="address-field">
            <div style="height: 12px; width: 80px; background-color: var(--secondary-bg); border-radius: 4px; margin-bottom: 6px;"></div>
            <div class="loading-skeleton"></div>
        </div>`;
    }
    resultOutputContainer.innerHTML = skeletons;
}

function renderAddressFields(address) {
    if (!address) {
        resultOutputContainer.innerHTML = 'No address data found.';
        return;
    }

    let html = '';
    const displayedKeys = new Set();
    let index = 0;

    // Display fields in preferred order
    for (const key of FIELD_ORDER) {
        if (address[key] !== undefined) {
            html += generateFieldHtml(key, address[key], index++);
            displayedKeys.add(key);
        }
    }

    // Display remaining fields
    for (const key in address) {
        if (Object.hasOwnProperty.call(address, key) && !displayedKeys.has(key)) {
            html += generateFieldHtml(key, address[key], index++);
        }
    }

    resultOutputContainer.innerHTML = html;
}

function generateFieldHtml(label, value, index) {
    const inputId = `field-${index}`;
    // Escape quotes to prevent HTML breaking
    const safeValue = String(value).replace(/"/g, '&quot;');

    return `
    <div class="address-field">
        <label for="${inputId}">${label}</label>
        <div class="address-input-group">
            <input type="text" id="${inputId}" value="${safeValue}" readonly onclick="copyIndividualField('${inputId}', '${label}')" style="cursor: pointer;" title="Click to copy">
            <button class="copy-btn" onclick="copyIndividualField('${inputId}', '${label}')" title="Copy ${label}">
                <i class="fa-regular fa-copy"></i>
            </button>
        </div>
    </div>`;
}

function copyIndividualField(inputId, label) {
    const input = document.getElementById(inputId);
    input.select();
    document.execCommand("copy");

    showToast(`Copied ${label}!`);
}

function copyAllFields() {
    if (!currentAddressData) {
        showToast("No data to copy!", 'warning');
        return;
    }

    let textToCopy = '';
    const displayedKeys = new Set();

    // Copy in exact order shown on screen
    for (const key of FIELD_ORDER) {
        if (currentAddressData[key] !== undefined) {
            textToCopy += `${key}: ${currentAddressData[key]}\n`;
            displayedKeys.add(key);
        }
    }
    for (const key in currentAddressData) {
        if (Object.hasOwnProperty.call(currentAddressData, key) && !displayedKeys.has(key)) {
            textToCopy += `${key}: ${currentAddressData[key]}\n`;
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    showToast("All fields copied!");
}

function showToast(title, icon = 'success') {
    Swal.fire({
        icon: icon,
        title: title,
        toast: true,
        position: 'top-end',
        timer: 1500,
        showConfirmButton: false
    });
}

function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('show');
}

// Close menu on outside click
document.addEventListener('click', function (event) {
    const toggle = document.querySelector('.menu-toggle');
    const menu = document.getElementById('dropdown-menu');

    if (menu && toggle) {
        if (!menu.contains(event.target) && !toggle.contains(event.target)) {
            menu.classList.remove('show');
        }
    }
});
