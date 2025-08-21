let currentQuiz = [];
let currentQuestionIndex = 0;
let selectedAnswer = null;
let score = 0;
let answers = [];
let quizStartTime = null;
let currentCategory = 'all';

function loadStudyHistory() {
    const history = JSON.parse(localStorage.getItem('studyHistory') || '[]');
    const historyHtml = history.slice(0, 5).map(item => `
        <div class="history-item">
            <span class="date">${new Date(item.date).toLocaleDateString('ja-JP')}</span>
            <span>${item.category === 'all' ? '全範囲' : getCategoryName(item.category)}</span>
            <span class="score">${item.score}%</span>
        </div>
    `).join('');
    
    document.getElementById('studyHistory').innerHTML = historyHtml || '<p style="color: #999;">まだ学習履歴がありません</p>';
    
    updateOverallStats();
}

function updateOverallStats() {
    const history = JSON.parse(localStorage.getItem('studyHistory') || '[]');
    let totalQuestions = 0;
    let correctAnswers = 0;
    
    history.forEach(item => {
        totalQuestions += item.totalQuestions;
        correctAnswers += item.correctCount;
    });
    
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    document.getElementById('totalQuestions').textContent = `全問題数: ${totalQuestions}`;
    document.getElementById('correctAnswers').textContent = `正解数: ${correctAnswers}`;
    document.getElementById('accuracy').textContent = `正答率: ${accuracy}%`;
}

function getCategoryName(category) {
    const names = {
        'journal': '仕訳問題',
        'calculation': '計算問題',
        'financial': '財務諸表',
        'term': '用語問題'
    };
    return names[category] || category;
}

function startQuiz(category) {
    currentCategory = category;
    currentQuiz = [];
    currentQuestionIndex = 0;
    score = 0;
    answers = [];
    selectedAnswer = null;
    quizStartTime = new Date();
    
    if (category === 'all') {
        currentQuiz = shuffleArray([...questions]).slice(0, 10);
    } else {
        const filtered = questions.filter(q => q.category === category);
        currentQuiz = shuffleArray([...filtered]).slice(0, Math.min(10, filtered.length));
    }
    
    showScreen('quizScreen');
    loadQuestion();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function loadQuestion() {
    if (currentQuestionIndex >= currentQuiz.length) {
        showResults();
        return;
    }
    
    const question = currentQuiz[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / currentQuiz.length) * 100;
    
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('questionNumber').textContent = `問題 ${currentQuestionIndex + 1}/${currentQuiz.length}`;
    document.getElementById('categoryLabel').textContent = `カテゴリ: ${getCategoryName(question.category)}`;
    document.getElementById('questionText').textContent = question.question;
    
    const optionsHtml = question.options.map((option, index) => `
        <div class="answer-option" onclick="selectAnswer(${index})" data-index="${index}">
            ${option}
        </div>
    `).join('');
    
    document.getElementById('answerOptions').innerHTML = optionsHtml;
    
    selectedAnswer = null;
    document.getElementById('submitAnswer').disabled = true;
    document.getElementById('nextQuestion').style.display = 'none';
    document.getElementById('feedback').classList.remove('show');
}

function selectAnswer(index) {
    if (document.querySelector('.answer-option.disabled')) return;
    
    document.querySelectorAll('.answer-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    document.querySelector(`[data-index="${index}"]`).classList.add('selected');
    selectedAnswer = index;
    document.getElementById('submitAnswer').disabled = false;
}

function submitAnswer() {
    if (selectedAnswer === null) return;
    
    const question = currentQuiz[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    answers.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect
    });
    
    if (isCorrect) {
        score++;
    }
    
    document.querySelectorAll('.answer-option').forEach((option, index) => {
        option.classList.add('disabled');
        option.onclick = null;
        
        if (index === question.correctAnswer) {
            option.classList.add('correct');
        } else if (index === selectedAnswer && !isCorrect) {
            option.classList.add('incorrect');
        }
    });
    
    const feedback = document.getElementById('feedback');
    feedback.className = 'feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.innerHTML = `
        <strong>${isCorrect ? '正解！' : '不正解'}</strong><br>
        ${question.explanation}
    `;
    
    document.getElementById('submitAnswer').style.display = 'none';
    document.getElementById('nextQuestion').style.display = 'inline-block';
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function showResults() {
    const endTime = new Date();
    const timeTaken = Math.floor((endTime - quizStartTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    const finalScore = Math.round((score / currentQuiz.length) * 100);
    
    document.getElementById('finalScore').textContent = `${finalScore}%`;
    document.getElementById('correctCount').textContent = score;
    document.getElementById('totalCount').textContent = currentQuiz.length;
    document.getElementById('timeTaken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const resultsHtml = answers.map((answer, index) => `
        <div class="question-result ${answer.isCorrect ? 'correct' : 'incorrect'}">
            <strong>問題 ${index + 1}:</strong> ${answer.isCorrect ? '正解' : '不正解'}
            <div style="margin-top: 5px; color: #666; font-size: 14px;">
                ${currentQuiz[index].question.substring(0, 50)}...
            </div>
        </div>
    `).join('');
    
    document.getElementById('questionResults').innerHTML = resultsHtml;
    
    saveToHistory(finalScore);
    
    showScreen('resultScreen');
}

function saveToHistory(finalScore) {
    const history = JSON.parse(localStorage.getItem('studyHistory') || '[]');
    
    history.unshift({
        date: new Date().toISOString(),
        category: currentCategory,
        score: finalScore,
        correctCount: score,
        totalQuestions: currentQuiz.length
    });
    
    if (history.length > 20) {
        history.pop();
    }
    
    localStorage.setItem('studyHistory', JSON.stringify(history));
}

function retryQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    answers = [];
    selectedAnswer = null;
    quizStartTime = new Date();
    
    showScreen('quizScreen');
    loadQuestion();
}

function backToStart() {
    loadStudyHistory();
    showScreen('startScreen');
}

function quitQuiz() {
    if (confirm('本当にテストを終了しますか？')) {
        backToStart();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadStudyHistory();
});