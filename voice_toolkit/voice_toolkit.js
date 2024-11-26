//// init.js
function sendMessageToStreamlitClient(type, data) {
    const outData = Object.assign({
        isStreamlitMessage: true, type: type,
    }, data);
    window.parent.postMessage(outData, "*");
}

function init() {
    sendMessageToStreamlitClient("streamlit:componentReady", {apiVersion: 1});
}

function setFrameHeight(height) {
    sendMessageToStreamlitClient("streamlit:setFrameHeight", {height: height});
}

// The `data` argument can be any JSON-serializable value.
function sendDataToPython(data) {
    sendMessageToStreamlitClient("streamlit:setComponentValue", data);
}

init()


//// parent.js
// 음성 선택
window.speechSynthesis.onvoiceschanged = () => {
    let voices = window.speechSynthesis.getVoices();
    window.parent.voices = voices
    let defaultLanguage;
    let browserLanguage = navigator.language;

    // 참고 https://chrome.google.com/webstore/detail/voice-control-for-chatgpt/eollffkcakegifhacjnlnegohfdlidhn
    const languageAll = [["한국어", "ko-KR"], ["English (US)", "en-US"], ["English (UK)", "en-GB"], ["English (IN)", "en-IN"],["普通话 (中国大陆)", "zh-CN"], ["中文 (中国台灣)", "zh-TW"], ["粵語 (中国香港)", "zh-HK"], ["Afrikaans", "af-ZA"], ["Bahasa Indonesia", "id-ID"], ["Bahasa Melayu", "ms-MY"], ["Català", "ca-ES"], ["Čeština", "cs-CZ"], ["Dansk", "da-DK"], ["Deutsch", "de-DE"], ["Español (ES)", "es-ES"], ["Français", "fr-FR"], ["Galego", "gl-ES"], ["Hrvatski", "hr_HR"], ["IsiZulu", "zu-ZA"], ["Íslenska", "is-IS"], ["Italiano", "it-IT"], ["Magyar", "hu-HU"], ["Nederlands", "nl-NL"], ["Norsk bokmål", "nb-NO"], ["Polski", "pl-PL"], ["Português (PT)", "pt-PT"], ["Română", "ro-RO"], ["Slovenčina", "sk-SK"], ["Suomi", "fi-FI"], ["Svenska", "sv-SE"], ["Türkçe", "tr-TR"], ["български", "bg-BG"], ["日本語", "ja-JP"], ["Pусский", "ru-RU"], ["Српски", "sr-RS"]];
    let languageArray = [];

    languageAll.forEach((n => {
        if (voices.some(e => e.lang === n[1])) languageArray.push(n)
    }))

    for (let i = 0; i < voices.length; i++) {
        if (voices[i].lang === browserLanguage) {
            defaultLanguage = voices[i].lang
            break
        }
    }

    if (!defaultLanguage) {
        defaultLanguage = languageArray[0][1];
    }

    let selectedLanguage = localStorage.getItem("selectedLanguage") || defaultLanguage;
    let voiceSelectElement = document.getElementById("voice-select");
    let languageSelectElement = document.getElementById("language-select");

    for (let i = 0; i < languageArray.length; i++) {
        let option = document.createElement("option");
        option.text = languageArray[i][0];
        option.value = languageArray[i][1];
        if (option.value === selectedLanguage) {
            option.selected = true;
        }
        languageSelectElement.add(option);
    }

    for (let i = 0; i < voices.length; i++) {
        if (voices[i].lang.includes(selectedLanguage)) {
            let option = document.createElement("option");
            option.text = voices[i].name;
            option.value = voices[i].name;
            if (!option.selected) {
                if (option.value === localStorage.getItem(selectedLanguage + "selectedVoice")) {
                    option.selected = true;
                }
            }
            voiceSelectElement.add(option);
        }
    }

    let localStorageVoice = localStorage.getItem(selectedLanguage + "selectedVoice")
    for (let option of voiceSelectElement.options) {
        if (option.value === localStorageVoice) {
            option.selected = true;
            break
        } else if (!localStorageVoice && option.value.includes("Nature")) {
            option.selected = true;
            break
        }
    }


    if (voiceSelectElement.options.length === 0) {
        voiceSelectElement.style.display = "none";
    }

    window.parent.selectedVoiceName = voiceSelectElement.value

    languageSelectElement.addEventListener("change", function () {
        selectedLanguage = languageSelectElement.value;
        localStorage.setItem("selectedLanguage", selectedLanguage);
        voiceSelectElement.innerHTML = "";

        let selectedVoices = voices.filter(
            voice => voice.lang === selectedLanguage
        );

        for (let i = 0; i < selectedVoices.length; i++) {
            let option = document.createElement("option");
            option.text = selectedVoices[i].name;
            option.value = selectedVoices[i].name;

            if (option.value === localStorage.getItem(selectedLanguage + "selectedVoice")) {
                option.selected = true;
            }

            voiceSelectElement.add(option);
        }

        if (voiceSelectElement.options.length > 0) {
            voiceSelectElement.style.display = "initial";
        } else {
            voiceSelectElement.style.display = "none";
        }
        window.parent.selectedVoiceName = voiceSelectElement.value
    });

    voiceSelectElement.addEventListener("change", function () {
        window.parent.selectedVoiceName = voiceSelectElement.value
        localStorage.setItem(selectedLanguage + "selectedVoice", voiceSelectElement.value);
    });
}


//// record.js
let recordBtn = document.getElementById('record-btn');
const toggleBtn = document.getElementById("toggle-btn");
const speedSelect = document.getElementById('speed');
// 음성 인식 대상
let recognition = new webkitSpeechRecognition;
recognition.continuous = true; // 연속 모드 설정
recognition.interimResults = true; // 중간 결과 가져오기 설정
let voiceTranscriptFinal = '';
let isRecording = false;

ifAutoPlay = localStorage.getItem("autoPlay")
if (ifAutoPlay) {
    window.parent.autoPlay = ifAutoPlay === 'yes';
} else {
    window.parent.autoPlay = true;
}

let btnClassList = toggleBtn.querySelector('i').classList
if (window.parent.autoPlay) {
    btnClassList.add('fa-volume-high');
    btnClassList.remove('fa-volume-xmark');
} else {
    btnClassList.remove('fa-volume-high');
    btnClassList.add('fa-volume-xmark');
}

speed = localStorage.getItem("speed")
if (speed) {
    speedSelect.value = speed
}
speedSelect.addEventListener("change", function () {
    localStorage.setItem("speed", speedSelect.value)
})


function toggleRecording() {
    isRecording = !isRecording;
    recordBtn.classList.toggle('recording', isRecording);

    if (recordBtn.classList.contains('recording')) {
        if (window.parent.selectedVoiceName) {
            recognition.lang = window.parent.voices.find(function (v) {
                return v.name === window.parent.selectedVoiceName;
            }).lang;
        }
        let zhLang = [["zh-CN", "cmn-Hans-CN"], ["zh-TW", "cmn-Hant-TW"], ["zh-HK", "yue-Hant-HK"]]
        for (let i = 0; i < zhLang.length; i++) {
            if (recognition.lang === zhLang[i][0]) {
                recognition.lang = zhLang[i][1]
                break
            }
        }
        recognition.start();
    } else {
        recognition.stop();
        voiceTranscriptFinal = ''
    }
}

recordBtn.addEventListener('click', toggleRecording);

recognition.onresult = function (event) {
    let voiceTranscript = '';
    let flag = 'interim'
    for (let i = event.resultIndex; i < event.results.length; i++) {
        let transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            voiceTranscriptFinal += transcript;
            flag = 'final'
        } else {
            voiceTranscript += transcript;
        }
    }
    voiceTranscript = voiceTranscriptFinal + voiceTranscript
    if (flag === 'interim') {
        sendDataToPython({
            "value": {'voice_result': {'value': voiceTranscript, 'flag': flag}}
        })
    } else {
        sendDataToPython({
            "value": {'voice_result': {'value': voiceTranscriptFinal, 'flag': flag}}
        })
    }
}

// 클릭하지 않았을 때 녹음을 켠 상태로 두기
recognition.onend = function () {
    if (recordBtn.classList.contains('recording')) {
        recognition.start();
    }
}

// 자동 재생 버튼
toggleBtn.addEventListener('click', function () {
    let btnClassList = toggleBtn.querySelector('i').classList
    if (btnClassList.contains('fa-volume-high')) {
        synth.cancel()
        clearTimeout(TIMEOUT_KEEP_SYNTHESIS_WORKING)
        btnClassList.add('fa-volume-xmark');
        btnClassList.remove('fa-volume-high');
        window.parent.autoPlay = false;
        localStorage.setItem("autoPlay", "no");
    } else {
        btnClassList.add('fa-volume-high');
        btnClassList.remove('fa-volume-xmark');
        window.parent.autoPlay = true;
        localStorage.setItem("autoPlay", "yes");
    }
})


//// autoPlay.js   프로젝트 참조 https://github.com/C-Nedelcu/talk-to-chatgpt
// 음성 합성 대상
const synth = window.parent.speechSynthesis;
synth.cancel()
let TIMEOUT_KEEP_SYNTHESIS_WORKING = null;
let KEEP_CheckNewMessages = null;
let IGNORE_COMMAS = false;
let preResultElementCount
let preHrElementCount
let IGNORE_CODE_BLOCKS = true;
let NEW_ELEMENT = null;
let CURRENT_MESSAGE_SENTENCES;
let CURRENT_MESSAGE_SENTENCES_NEXT_READ;

function KeepSpeechSynthesisActive() {
    synth.pause();
    synth.resume();
    TIMEOUT_KEEP_SYNTHESIS_WORKING = setTimeout(KeepSpeechSynthesisActive, 5000);
}


function SayOutLoud(text) {
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    utterance.rate = speedSelect.value;
    utterance.pitch = 1;
    if (window.parent.selectedVoiceName) {
        utterance.voice = window.parent.voices.find(function (v) {
            return v.name === window.parent.selectedVoiceName;
        });
        utterance.lang = utterance.voice.lang
    }
    utterance.onstart = () => {
        clearTimeout(TIMEOUT_KEEP_SYNTHESIS_WORKING);
        TIMEOUT_KEEP_SYNTHESIS_WORKING = setTimeout(KeepSpeechSynthesisActive, 5000);
        // 재생할 때 녹음 끄기
        if (recordBtn.classList.contains('recording')) {
            recordBtn.click()
        }
    };
    utterance.onend = () => {
        clearTimeout(TIMEOUT_KEEP_SYNTHESIS_WORKING);
    }
    synth.speak(utterance);
}


// 문단 분할
function SplitIntoSentences(text) {
    const sentences = [];
    let currentSentence = "";
    for (let i = 0; i < text.length; i++) {
        const currentChar = text[i];
        // Add character to current sentence
        currentSentence += currentChar;
        // is the current character a delimiter? if so, add current part to array and clear
        if (// Latin punctuation
            currentChar === (IGNORE_COMMAS ? '.' : ',')
            || currentChar === (IGNORE_COMMAS ? '.' : ':')
            || currentChar === '.'
            || currentChar === '!'
            || currentChar === '?'
            || currentChar === (IGNORE_COMMAS ? '.' : ';')
            || currentChar === '…'
            // Chinese/japanese punctuation
            || currentChar === (IGNORE_COMMAS ? '.' : '、')
            || currentChar === (IGNORE_COMMAS ? '.' : '，')
            || currentChar === '。' || currentChar === '．'
            || currentChar === '！' || currentChar === '？'
            || currentChar === (IGNORE_COMMAS ? '.' : '；')
            || currentChar === (IGNORE_COMMAS ? '.' : '：')) {
            if (currentSentence.trim() !== "") sentences.push(currentSentence.trim());
            currentSentence = "";
        }
    }
    return sentences;
}

function skipCode(divElement, excludeSelector) {
    let excludeElements = Array.from(divElement.querySelectorAll(excludeSelector));

    return Array.from(divElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '' || node.nodeType === Node.ELEMENT_NODE && !excludeElements.includes(node))
        .map(node => node.textContent)
        .join('')
}

function CheckNewMessages() {
    let ResultElements = window.parent.document.querySelectorAll("div.content-div.assistant")
    if (ResultElements.length === preResultElementCount + 1) {
        showPlayBtn()
        preResultElementCount += 1;
        NEW_ELEMENT = ResultElements[ResultElements.length - 1]
        CURRENT_MESSAGE_SENTENCES = [];
        CURRENT_MESSAGE_SENTENCES_NEXT_READ = 0;
    }
    let currentText = ''
    let sayOutText = '';
    if (NEW_ELEMENT) {
        currentText = NEW_ELEMENT.textContent;

        if (IGNORE_CODE_BLOCKS) {
            sayOutText = skipCode(NEW_ELEMENT, 'div.stCodeBlock')
        } else {
            sayOutText = currentText
        }

        const newSentences = SplitIntoSentences(sayOutText);
        if (newSentences.length !== CURRENT_MESSAGE_SENTENCES.length) {
            const nextRead = CURRENT_MESSAGE_SENTENCES_NEXT_READ;
            for (let i = nextRead; i < newSentences.length; i++) {
                CURRENT_MESSAGE_SENTENCES_NEXT_READ = i + 1;
                const lastPart = newSentences[i];
                SayOutLoud(lastPart);
            }
            CURRENT_MESSAGE_SENTENCES = newSentences;
        }
    }

    let HrElementCount = window.parent.document.querySelectorAll("section.main hr").length
    let errorElement = window.parent.document.querySelector("div[data-baseweb='notification']")

    
    if ((preHrElementCount !== HrElementCount - 1) && !errorElement) {
        KEEP_CheckNewMessages = setTimeout(CheckNewMessages, 500);

    } else if (!errorElement && ((ResultElements.length === preResultElementCount + 1) || !NEW_ELEMENT || (NEW_ELEMENT.textContent !== currentText))) {
        KEEP_CheckNewMessages = setTimeout(CheckNewMessages, 500);
    }
}


//// 메인 화면 이벤트 리스너
// 모니터링
function checkFormSubmit() {
    let stFormSubmit = window.parent.document.querySelector('button[kind="secondaryFormSubmit"]');
    if (stFormSubmit) {
        stFormSubmit.addEventListener('click', function () {
            if (recordBtn.classList.contains('recording')) {
                recordBtn.click()
            }
            const textInput = window.parent.document.querySelector("textarea[aria-label='**输入：**']");
            if (window.parent.autoPlay && textInput.textContent !== '') {
                preResultElementCount = window.parent.document.querySelectorAll("div.content-div.assistant").length;
                preHrElementCount = window.parent.document.querySelectorAll("section.main hr").length
                CheckNewMessages()
            }
        })
    } else {
        setTimeout(checkFormSubmit, 500);
    }
}

checkFormSubmit()

function showPlayBtn() {
    synth.cancel();
    if (window.parent.textSound) {
        window.parent.textSound.forEach(value => {
            {
                value.querySelector('#play-btn').style.display = "inline-block";
                value.querySelector('#toggle-btn').style.display = "none";
                value.querySelector('#stop-btn').style.display = "none";
            }
        })
    }
}

// 페이지 전환 chat 듣기
function checkChatRadioBlock() {
    const stChatRadioBlock = window.parent.document.querySelector('section[data-testid="stSidebar"] div[data-testid="stVerticalBlock"] div[data-testid="stVerticalBlock"]:has(div[role="radiogroup"])');
    if (stChatRadioBlock) {
        const config = {
            attributes: true,
            subtree: true
        };
        // MutationObserver 인스턴스 만들기
        const observer = new MutationObserver((mutationsList, observer) => {
            // 변화를 감지했을 때의 콜백 함수
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'tabindex') {
                    showPlayBtn()
                    clearTimeout(KEEP_CheckNewMessages)
                    clearTimeout(TIMEOUT_KEEP_SYNTHESIS_WORKING);
                }
            }
        });
        // MutationObserver 작동
        observer.observe(stChatRadioBlock, config);
    } else {
        setTimeout(checkChatRadioBlock, 500);
    }
}

checkChatRadioBlock()

// 페이지 추가 및 삭제
function checkChatButton() {
    let stChatButtonAll = window.parent.document.querySelectorAll('section[data-testid="stSidebar"] button[kind="secondary"]');
    if (stChatButtonAll.length === 2) {
        stChatButtonAll.forEach(stChatButton => {
            stChatButton.addEventListener('click', function () {
                showPlayBtn()
                clearTimeout(KEEP_CheckNewMessages)
                clearTimeout(TIMEOUT_KEEP_SYNTHESIS_WORKING);
            })

        })
    } else {
        setTimeout(checkChatButton, 500);
    }
}

checkChatButton()

//// 컨텐츠 프레임 높이 설정
window.addEventListener("DOMContentLoaded", function () {
    setFrameHeight(120)
});

// 더블 클릭 이벤트 리스너
document.body.addEventListener("dblclick", function () {
    window.parent.document.dispatchEvent(new Event('dblclick'));
});
