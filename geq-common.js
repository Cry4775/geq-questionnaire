
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
