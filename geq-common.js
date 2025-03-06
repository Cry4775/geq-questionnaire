// URL dello script di Google per inviare i dati al foglio di calcolo
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxA0qd-auoU0qMqU2nC1BXBnZUwT_hG7tjG_OHpUu0gMZvQCauQLw-jW8jKxY7QfZ2izQ/exec";

/**
 * Genera un ID univoco
 * @returns {string} ID alfanumerico di 6 caratteri in maiuscolo
 */
function generateUniqueId() {
    // Genera un ID di 6 caratteri alfanumerici in maiuscolo
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Invia i dati a Google Sheets
 * @param {Object} playerInfo - Informazioni del giocatore
 * @param {Object} responses - Risposte raccolte
 * @param {Array|Object} modules - Moduli con domande
 * @param {Function} onSuccess - Funzione da chiamare in caso di successo
 * @param {Function} onError - Funzione da chiamare in caso di errore
 */
function sendDataToGoogleSheets(playerInfo, responses, modules, onSuccess, onError) {
    // Prepara i dati in formato adatto per Google Sheets
    let formData = new FormData();

    // Aggiungi le informazioni del giocatore
    formData.append('id', playerInfo.id);
    formData.append('timestamp', playerInfo.timestamp);
    formData.append('type', playerInfo.type);

    // Aggiungi il progetto
    formData.append('project', playerInfo.project || 'unknown');

    // Prepara i dati delle risposte in formato JSON
    const responsesData = [];

    // Se abbiamo un array di moduli (caso index.html)
    if (Array.isArray(modules)) {
        modules.forEach(module => {
            const moduleResponses = responses[module.name];

            module.questions.forEach(question => {
                const response = moduleResponses.hasOwnProperty(question.id)
                    ? moduleResponses[question.id]
                    : '';

                if (response !== '') {
                    responsesData.push({
                        module: module.name,
                        questionId: question.id,
                        questionText: question.text,
                        response: response
                    });
                }
            });
        });
    }
    // Se abbiamo un singolo modulo (caso ingame.html)
    else if (modules && modules.name) {
        const moduleResponses = responses[modules.name];

        modules.questions.forEach(question => {
            const response = moduleResponses.hasOwnProperty(question.id)
                ? moduleResponses[question.id]
                : '';

            if (response !== '') {
                responsesData.push({
                    module: modules.name,
                    questionId: question.id,
                    questionText: question.text,
                    response: response
                });
            }
        });
    }

    formData.append('responses', JSON.stringify(responsesData));

    // Invia i dati allo script di Google
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nella risposta del server');
            }
            return response.json();
        })
        .then(data => {
            console.log('Successo:', data);
            onSuccess(data);
        })
        .catch(error => {
            console.error('Errore:', error);
            onError(error);
        });
}

/**
 * Verifica se tutte le domande hanno ricevuto risposta
 * @param {Object} responses - Risposte raccolte
 * @param {Array|Object} modules - Moduli con domande
 * @returns {Object} Oggetto con conteggio totale, risposte date e stato di completamento
 */
function checkAllQuestionsAnswered(responses, modules) {
    let totalQuestions = 0;
    let answeredQuestions = 0;

    // Se abbiamo un array di moduli (caso index.html)
    if (Array.isArray(modules)) {
        modules.forEach(module => {
            totalQuestions += module.questions.length;
            const moduleResponses = responses[module.name];

            module.questions.forEach(question => {
                if (moduleResponses.hasOwnProperty(question.id)) {
                    answeredQuestions++;
                }
            });
        });
    }
    // Se abbiamo un singolo modulo (caso ingame.html)
    else if (modules && modules.name) {
        totalQuestions = modules.questions.length;
        const moduleResponses = responses[modules.name];

        modules.questions.forEach(question => {
            if (moduleResponses.hasOwnProperty(question.id)) {
                answeredQuestions++;
            }
        });
    }

    return {
        total: totalQuestions,
        answered: answeredQuestions,
        isComplete: (answeredQuestions === totalQuestions)
    };
}

/**
 * Controlla se un singolo modulo è completo
 * @param {String} moduleName - Nome del modulo
 * @param {Array} questions - Array delle domande del modulo
 * @param {Object} responses - Risposte raccolte
 * @returns {Boolean} True se tutte le domande del modulo hanno risposta
 */
function isModuleComplete(moduleName, questions, responses) {
    const moduleResponses = responses[moduleName];
    return questions.every(q => moduleResponses.hasOwnProperty(q.id));
}

/**
 * Scarica i dati come file JSON
 * @param {Object} data - Dati da scaricare
 * @param {String} filename - Nome del file
 */
function downloadAsJson(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(blob, `${filename}.json`);
}

/**
 * Scarica i dati come file CSV
 * @param {Object} data - Dati da scaricare
 * @param {String} filename - Nome del file
 */
function downloadAsCsv(data, filename) {
    let csvContent = "player_id,timestamp,type,module,question_id,question_text,response\n";

    const playerId = data.playerInfo.id;
    const timestamp = data.playerInfo.timestamp;
    const type = data.playerInfo.type;

    // Se abbiamo un array di moduli (caso index.html)
    if (Array.isArray(data.modules)) {
        data.modules.forEach(module => {
            const moduleResponses = data.responses[module.name];

            module.questions.forEach(question => {
                const response = moduleResponses.hasOwnProperty(question.id)
                    ? moduleResponses[question.id]
                    : '';

                csvContent += `"${playerId}","${timestamp}","${type}","${module.name}",${question.id},"${question.text.replace(/"/g, '""')}",${response}\n`;
            });
        });
    }
    // Se abbiamo un singolo modulo (caso ingame.html)
    else if (data.module && data.module.name) {
        const moduleResponses = data.responses[data.module.name];

        data.module.questions.forEach(question => {
            const response = moduleResponses.hasOwnProperty(question.id)
                ? moduleResponses[question.id]
                : '';

            csvContent += `"${playerId}","${timestamp}","${type}","${data.module.name}",${question.id},"${question.text.replace(/"/g, '""')}",${response}\n`;
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `${filename}.csv`);
}

/**
 * Funzione generica per il download di file
 * @param {Blob} blob - Blob del file
 * @param {String} filename - Nome del file
 */
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;

    // Aggiunge il link al DOM per alcuni browser che lo richiedono
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Pulisce l'URL creato
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

// Funzione per salvare il progetto selezionato nel localStorage
function saveSelectedProject(projectValue) {
    localStorage.setItem('selectedProject', projectValue);
}

// Funzione per recuperare il progetto selezionato dal localStorage
function getSelectedProject() {
    return localStorage.getItem('selectedProject');
}

// Funzione da chiamare all'inizializzazione di ogni pagina
function initProjectSelection() {
    const projectSelect = document.getElementById('project-select');
    const startButton = document.getElementById('start-button');

    // Recupera il progetto precedentemente selezionato
    const savedProject = getSelectedProject();

    if (savedProject) {
        // Imposta il valore selezionato
        projectSelect.value = savedProject;

        // Abilita il pulsante se un progetto è stato selezionato
        startButton.disabled = false;
    } else {
        // Mantieni il pulsante disabilitato se non c'è progetto selezionato
        startButton.disabled = true;
    }

    // Aggiungi event listener per salvare la selezione quando cambia
    projectSelect.addEventListener('change', function() {
        const selectedValue = this.value;
        saveSelectedProject(selectedValue);
        startButton.disabled = !selectedValue;
    });
}