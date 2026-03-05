const base_url = "https://fakexy-api-sage.vercel.app/";

const randomBtn = document.getElementById('random-btn');
const countryGridContainer = document.getElementById('country-grid-container');
const resultOutputContainer = document.getElementById('result-output-container');
const countryCountDisplay = document.getElementById('country-count-display');
const apiStatusDot = document.getElementById('api-status-dot');

let availableCountries = {};
let currentAddressData = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchCountriesAndInit();

    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            removeActiveStates();
            fetchAddress('/api/random');
        });
    }

    const searchInput = document.getElementById('country-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterCountries(query);
        });
    }
});

function filterCountries(query) {
    const filtered = {};
    for (const [code, info] of Object.entries(availableCountries)) {
        if (info.name.toLowerCase().includes(query) || code.toLowerCase().includes(query)) {
            filtered[code] = info;
        }
    }
    renderCountryButtons(filtered);
}

async function fetchCountriesAndInit() {
    try {
        const response = await fetch(`${base_url}/api/countries`);
        if (response.ok) {
            const data = await response.json();
            availableCountries = data.countries;

            if (countryCountDisplay) {
                countryCountDisplay.textContent = data.total_countries;
            }

            if (apiStatusDot) {
                apiStatusDot.style.color = '#10b981'; // green
            }
            renderCountryButtons(availableCountries);
        } else {
            handleApiError();
        }
    } catch (error) {
        console.error('Error fetching countries:', error);
        handleApiError();
    }
}

function handleApiError() {
    if (apiStatusDot) apiStatusDot.style.color = '#ef4444'; // red
    if (countryCountDisplay) countryCountDisplay.textContent = 'Error';
    if (countryGridContainer) {
        countryGridContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ef4444;">Failed to load countries. API Offline.</div>';
    }
}

function renderCountryButtons(countries) {
    if (!countryGridContainer) return;
    countryGridContainer.innerHTML = '';

    const sortedCountries = Object.entries(countries).sort(([, a], [, b]) => a.name.localeCompare(b.name));

    sortedCountries.forEach(([code, info]) => {
        const btn = document.createElement('button');
        btn.className = 'country-btn';
        const displayTxt = `${info.name} (${code})`;

        btn.innerHTML = `<span style="white-space: normal; text-align: center; line-height: 1.2;">${displayTxt}</span>`;
        btn.onclick = () => {
            removeActiveStates();
            btn.classList.add('active');
            fetchAddress(`/api/address?code=${code}`);
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
        const response = await fetch(`${base_url}${url}`);
        const data = await response.json();

        if (response.ok) {
            const addressData = data.suggestion ? data.address : data;
            currentAddressData = addressData;
            renderAddressFields(addressData);
        } else {
            let errorMsg = data.error || 'Unknown error occurred.';
            if (resultOutputContainer) {
                resultOutputContainer.innerHTML = `<div style="color: #ef4444; padding: 20px;">Error: ${errorMsg}</div>`;
            }
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        if (resultOutputContainer) {
            resultOutputContainer.innerHTML = `<div style="color: #ef4444; padding: 20px;">Connection Error</div>`;
        }
    }
}

function showLoadingSkeletons() {
    if (!resultOutputContainer) return;
    let skeletons = '';
    for (let i = 0; i < 8; i++) {
        skeletons += `
        <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 15px; margin-bottom: 10px; opacity: 0.5;">
            <div style="height: 12px; width: 80px; background-color: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 10px;"></div>
            <div style="height: 20px; width: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); background-size: 200% 100%; animation: loading 1.5s infinite;"></div>
        </div>`;
    }
    resultOutputContainer.innerHTML = skeletons;
}

function renderAddressFields(address) {
    if (!address || !resultOutputContainer) {
        if (resultOutputContainer) resultOutputContainer.innerHTML = 'No address data found.';
        return;
    }

    const countryName = address['Country'] || 'Selected';
    const title = `${countryName} address generated`;

    // Define fields that should always be at the bottom in this specific order
    const bottomFieldOrder = [
        'Country',
        'Country Code',
        'Country Flag',
        'Flag Emoji',
        'Currency',
        'Time Zone',
        'Full Name',
        'Gender',
        'Phone Number'
    ];

    const entries = Object.entries(address);
    // Fields not in the bottom list go to the top
    const topFields = entries.filter(([key]) => !bottomFieldOrder.includes(key));
    // Fields in the bottom list are sorted according to bottomFieldOrder
    const bottomFields = entries
        .filter(([key]) => bottomFieldOrder.includes(key))
        .sort(([a], [b]) => bottomFieldOrder.indexOf(a) - bottomFieldOrder.indexOf(b));

    const finalFields = [...topFields, ...bottomFields];

    let rowsHtml = '';
    finalFields.forEach(([key, value]) => {
        const inputId = `field-${Math.random().toString(36).substr(2, 9)}`;
        const safeValue = String(value).replace(/"/g, '&quot;');

        rowsHtml += `
        <tr>
            <td>${key}</td>
            <td>
                <div class="address-input-group">
                    <input type="text" id="${inputId}" value="${safeValue}" readonly onclick="copyIndividualField('${inputId}', '${key}')" title="Click to copy">
                    <button class="copy-btn" onclick="copyIndividualField('${inputId}', '${key}')" title="Copy ${key}">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    resultOutputContainer.innerHTML = `
    <div class="data-table-header">${title}</div>
    <table class="data-table">
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>`;
}

function copyIndividualField(inputId, label) {
    const input = document.getElementById(inputId);
    if (!input) return;
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
    for (const [key, value] of Object.entries(currentAddressData)) {
        textToCopy += `${key}: ${value}\n`;
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
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: icon,
            title: title,
            toast: true,
            position: 'top-end',
            timer: 1500,
            showConfirmButton: false
        });
    } else {
        console.log(`Toast: ${title}`);
    }
}

