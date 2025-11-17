const lengthSlider = document.getElementById('lengthSlider');
const lengthValue = document.getElementById('lengthValue');
const checkboxes = document.querySelectorAll(".password-options input[type='checkbox']");
const generateBtn = document.querySelector(".generate-btn");
const passwordOutput = document.querySelector(".password-text");
const strengthMeter = document.getElementById('strengthMeter');
const strengthText = document.querySelector(".strength-text");
const tooltip = document.querySelector(".tooltip");
const copyBtn = document.querySelector(".copy-btn");

// UTF-8 character sets
const charSets = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+[]{}|;:,.<>?",

    latin_upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    latin_lower: "abcdefghijklmnopqrstuvwxyz",

    greek_upper: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
    greek_lower: "αβγδεζηθικλμνξοπρστυφχψω",

    cyrillic_upper: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
    cyrillic_lower: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
};

lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
});

const generatePassword = () => {
    const length = parseInt(lengthSlider.value);

    const selectedSets = [...checkboxes]
        .filter(c => c.checked)
        .map(c => charSets[c.id.replace("Check", "")]);

    if (!selectedSets.length) {
        alert("Please select at least one character type.");
        return;
    }

    // Ensure at least one character from each selected set
    let password = selectedSets
        .map(set => set[Math.floor(Math.random() * set.length)])
        .join("");

    const allChars = selectedSets.join("");

    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password
    password = password.split("").sort(() => 0.5 - Math.random()).join("");

    passwordOutput.textContent = password;
    calculateStrength(password);
};

const calculateStrength = (password) => {
    const length = password.length;

    // Detect character categories (UTF-8 aware)
    const categories = {
        latinUpper: /[A-Z]/u.test(password),
        latinLower: /[a-z]/u.test(password),
        number: /[0-9]/u.test(password),
        symbol: /[^A-Za-z0-9]/u.test(password),
        greekUpper: /[Α-Ω]/u.test(password),
        greekLower: /[α-ω]/u.test(password),
        cyrillicUpper: /[А-ЯЁ]/u.test(password),
        cyrillicLower: /[а-яё]/u.test(password)
    };

    // Count how many different character sets are used
    const varietyCount = Object.values(categories).filter(Boolean).length;

    // Length score: 0–4 points
    let lengthScore = 0;
    if (length >= 8) lengthScore = 1;
    if (length >= 12) lengthScore = 2;
    if (length >= 16) lengthScore = 3;
    if (length >= 20) lengthScore = 4;

    // Variety score: 0–8 points
    const varietyScore = varietyCount;

    // Total score: max 12
    const totalScore = lengthScore + varietyScore;

    // Map total score to strength percentage
    const strengthPercentage = Math.min((totalScore / 12) * 100, 100);

    // Strength levels and colors
    let strengthLabel, color;

    if (strengthPercentage <= 10) {
        strengthLabel = "Very Weak";
        color = "#a5e2e6";
    } else if (strengthPercentage <= 25) {
        strengthLabel = "Weak";
        color = "#74ceda";
    } else if (strengthPercentage <= 40) {
        strengthLabel = "Fair";
        color = "#53accc";
    } else if (strengthPercentage <= 55) {
        strengthLabel = "Moderate";
        color = "#3973ad";
    } else if (strengthPercentage <= 70) {
        strengthLabel = "Strong";
        color = "#2c488f";
    } else if (strengthPercentage <= 85) {
        strengthLabel = "Very Strong";
        color = "#212870";
    } else {
        strengthLabel = "Excellent";
        color = "#1d1652";
    }

    strengthMeter.style.width = `${strengthPercentage}%`;
    strengthMeter.style.backgroundColor = color;
    strengthText.textContent = `Strength: ${strengthLabel}`;
};

// Initial generation
generatePassword();

// Event listeners
generateBtn.addEventListener('click', generatePassword);

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(passwordOutput.textContent).then(() => {
        tooltip.classList.add("visible");
        setTimeout(() => {
            tooltip.classList.remove("visible");
        }, 2000);
    });
});