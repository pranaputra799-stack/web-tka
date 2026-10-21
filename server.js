const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbPath = path.join(__dirname, 'data', 'tka.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id INTEGER NOT NULL,
    package_name TEXT NOT NULL,
    score REAL NOT NULL,
    correct INTEGER NOT NULL,
    wrong INTEGER NOT NULL,
    total INTEGER NOT NULL,
    time_spent INTEGER DEFAULT 0,
    answers TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id, question_number)
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    packages_studied TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
  );
`);

// Load soal data
const soalPath = path.join(__dirname, 'data', 'soal.json');
let soalData = { packages: [] };
try {
  soalData = JSON.parse(fs.readFileSync(soalPath, 'utf-8'));
  console.log(`Loaded ${soalData.packages.length} packages with ${soalData.packages.reduce((a, p) => a + p.total_questions, 0)} total questions`);
} catch (e) {
  console.error('Error loading soal data:', e.message);
}

// ========== API ROUTES ==========

// GET /api/packages - List all packages
app.get('/api/packages', (req, res) => {
  const packages = soalData.packages.map(p => {
    // Get latest attempt for this package
    const latestAttempt = db.prepare(
      'SELECT * FROM attempts WHERE package_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(p.id);
    
    const bestAttempt = db.prepare(
      'SELECT MAX(score) as best_score FROM attempts WHERE package_id = ?'
    ).get(p.id);
    
    const attemptCount = db.prepare(
      'SELECT COUNT(*) as count FROM attempts WHERE package_id = ?'
    ).get(p.id);

    return {
      id: p.id,
      name: p.package_name,
      filename: p.filename,
      total_questions: p.total_questions,
      texts_count: p.texts.length,
      has_answer_keys: p.questions.filter(q => q.answer_key).length,
      latest_score: latestAttempt ? latestAttempt.score : null,
      best_score: bestAttempt ? bestAttempt.best_score : null,
      attempt_count: attemptCount ? attemptCount.count : 0
    };
  });
  
  res.json(packages);
});

// GET /api/packages/:id - Get full package with questions
app.get('/api/packages/:id', (req, res) => {
  const pkg = soalData.packages.find(p => p.id === parseInt(req.params.id));
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  
  // Send questions without answer keys (for exam mode)
  const questions = pkg.questions.map(q => ({
    number: q.number,
    type: q.type,
    text_number: q.text_number,
    question: q.question,
    options: q.options
  }));
  
  res.json({
    id: pkg.id,
    name: pkg.package_name,
    texts: pkg.texts,
    questions: questions,
    total_questions: pkg.total_questions
  });
});

// POST /api/packages/:id/submit - Submit answers and get results
app.post('/api/packages/:id/submit', (req, res) => {
  const pkg = soalData.packages.find(p => p.id === parseInt(req.params.id));
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  
  const { answers, time_spent } = req.body;
  
  let correct = 0;
  let wrong = 0;
  const results = [];
  
  for (const q of pkg.questions) {
    const userAnswer = answers[q.number];
    const correctAnswer = q.answer_key;
    
    if (!correctAnswer) {
      // No answer key available, skip
      results.push({
        number: q.number,
        type: q.type,
        text_number: q.text_number,
        question: q.question,
        options: q.options,
        user_answer: userAnswer || null,
        correct_answer: null,
        is_correct: null,
        explanation: q.explanation || '',
        matching_answers: q.matching_answers || null
      });
      continue;
    }
    
    let isCorrect = false;
    
    if (q.type === 'matching') {
      // For matching questions, compare each statement's category
      if (userAnswer && typeof userAnswer === 'object' && typeof correctAnswer === 'object') {
        const matchKeys = Object.keys(correctAnswer);
        let allCorrect = true;
        for (const key of matchKeys) {
          const expected = correctAnswer[key]?.category || correctAnswer[key];
          const given = userAnswer[key];
          if (given !== expected) {
            allCorrect = false;
            break;
          }
        }
        isCorrect = allCorrect;
      }
    } else if (q.type === 'multiple') {
      // For multiple choice, compare arrays
      if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
        const sorted1 = [...userAnswer].sort();
        const sorted2 = [...correctAnswer].sort();
        isCorrect = sorted1.length === sorted2.length && 
                    sorted1.every((v, i) => v === sorted2[i]);
      }
    } else {
      // Single choice
      isCorrect = userAnswer === (Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer);
    }
    
    if (isCorrect) correct++;
    else wrong++;
    
    results.push({
      number: q.number,
      type: q.type,
      text_number: q.text_number,
      question: q.question,
      options: q.options,
      user_answer: userAnswer || null,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      explanation: q.explanation || '',
      matching_answers: q.matching_answers || null
    });
  }
  
  const total = correct + wrong;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  // Save attempt
  const stmt = db.prepare(`
    INSERT INTO attempts (package_id, package_name, score, correct, wrong, total, time_spent, answers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    pkg.id, pkg.package_name, score, correct, wrong, total,
    time_spent || 0, JSON.stringify(answers)
  );
  
  // Update study session
  const today = new Date().toISOString().split('T')[0];
  const existingSession = db.prepare('SELECT * FROM study_sessions WHERE date = ?').get(today);
  if (existingSession) {
    const studied = JSON.parse(existingSession.packages_studied);
    if (!studied.includes(pkg.id)) studied.push(pkg.id);
    db.prepare('UPDATE study_sessions SET duration = duration + ?, packages_studied = ? WHERE date = ?')
      .run(time_spent || 0, JSON.stringify(studied), today);
  } else {
    db.prepare('INSERT INTO study_sessions (date, duration, packages_studied) VALUES (?, ?, ?)')
      .run(today, time_spent || 0, JSON.stringify([pkg.id]));
  }
  
  res.json({
    attempt_id: info.lastInsertRowid,
    score,
    correct,
    wrong,
    total,
    results
  });
});

// GET /api/dashboard - Dashboard statistics
app.get('/api/dashboard', (req, res) => {
  // Overall stats
  const totalAttempts = db.prepare('SELECT COUNT(*) as count FROM attempts').get();
  const avgScore = db.prepare('SELECT AVG(score) as avg FROM attempts').get();
  
  // Best and worst packages
  const bestPackage = db.prepare(`
    SELECT package_id, package_name, MAX(score) as best_score, COUNT(*) as attempts
    FROM attempts GROUP BY package_id ORDER BY best_score DESC LIMIT 1
  `).get();
  
  const worstPackage = db.prepare(`
    SELECT package_id, package_name, MAX(score) as best_score, COUNT(*) as attempts
    FROM attempts GROUP BY package_id ORDER BY best_score ASC LIMIT 1
  `).get();
  
  // Recent attempts
  const recentAttempts = db.prepare(`
    SELECT * FROM attempts ORDER BY created_at DESC LIMIT 10
  `).all();
  
  // Score progression over time
  const scoreProgression = db.prepare(`
    SELECT id, package_id, package_name, score, correct, wrong, total, time_spent, created_at
    FROM attempts ORDER BY created_at ASC
  `).all();
  
  // Per-package stats
  const packageStats = db.prepare(`
    SELECT package_id, package_name,
           COUNT(*) as attempts,
           AVG(score) as avg_score,
           MAX(score) as best_score,
           MIN(score) as worst_score,
           AVG(time_spent) as avg_time
    FROM attempts
    GROUP BY package_id
    ORDER BY package_id
  `).all();
  
  // Weak areas analysis - find text numbers with most wrong answers
  const weakAreas = [];
  for (const attempt of db.prepare('SELECT * FROM attempts ORDER BY created_at DESC LIMIT 50').all()) {
    try {
      const answers = JSON.parse(attempt.answers);
      const pkg = soalData.packages.find(p => p.id === attempt.package_id);
      if (!pkg) continue;
      
      for (const q of pkg.questions) {
        if (!q.answer_key) continue;
        const userAnswer = answers[q.number];
        let isCorrect = false;
        
        if (q.type === 'single') {
          isCorrect = userAnswer === (Array.isArray(q.answer_key) ? q.answer_key[0] : q.answer_key);
        } else if (q.type === 'multiple') {
          if (Array.isArray(userAnswer) && Array.isArray(q.answer_key)) {
            const s1 = [...userAnswer].sort();
            const s2 = [...q.answer_key].sort();
            isCorrect = s1.length === s2.length && s1.every((v, i) => v === s2[i]);
          }
        }
        
        if (!isCorrect) {
          weakAreas.push({
            text_number: q.text_number,
            question_type: q.type,
            package_id: attempt.package_id
          });
        }
      }
    } catch {}
  }
  
  // Aggregate weak areas
  const typeWrong = {};
  for (const wa of weakAreas) {
    typeWrong[wa.question_type] = (typeWrong[wa.question_type] || 0) + 1;
  }
  
  // Study streak
  const sessions = db.prepare('SELECT date FROM study_sessions ORDER BY date DESC').all();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sessions.length; i++) {
    const sessionDate = new Date(sessions[i].date);
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    
    if (sessionDate.toISOString().split('T')[0] === expected.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }
  
  // Total packages info
  const totalPackages = soalData.packages.length;
  const attemptedPackages = db.prepare('SELECT COUNT(DISTINCT package_id) as count FROM attempts').get();
  
  res.json({
    total_attempts: totalAttempts.count,
    average_score: avgScore.avg ? Math.round(avgScore.avg * 10) / 10 : 0,
    best_package: bestPackage || null,
    worst_package: worstPackage || null,
    recent_attempts: recentAttempts,
    score_progression: scoreProgression,
    package_stats: packageStats,
    weak_areas: typeWrong,
    study_streak: streak,
    total_packages: totalPackages,
    attempted_packages: attemptedPackages.count,
    total_questions: soalData.packages.reduce((a, p) => a + p.total_questions, 0)
  });
});

// GET /api/attempts/:packageId - Get attempts for a package
app.get('/api/attempts/:packageId', (req, res) => {
  const attempts = db.prepare(
    'SELECT * FROM attempts WHERE package_id = ? ORDER BY created_at DESC'
  ).all(parseInt(req.params.packageId));
  
  res.json(attempts);
});

// GET /api/attempts/:id/review - Review a specific attempt
app.get('/api/review/:attemptId', (req, res) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?')
    .get(parseInt(req.params.attemptId));
  
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  
  const pkg = soalData.packages.find(p => p.id === attempt.package_id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  
  const userAnswers = JSON.parse(attempt.answers);
  
  const results = pkg.questions.map(q => {
    const userAnswer = userAnswers[q.number];
    let isCorrect = null;
    
    if (q.answer_key) {
      if (q.type === 'matching') {
        if (userAnswer && typeof userAnswer === 'object' && typeof q.answer_key === 'object') {
          const keys = Object.keys(q.answer_key);
          isCorrect = keys.every(k => {
            const expected = q.answer_key[k]?.category || q.answer_key[k];
            return userAnswer[k] === expected;
          });
        } else {
          isCorrect = false;
        }
      } else if (q.type === 'multiple') {
        if (Array.isArray(userAnswer) && Array.isArray(q.answer_key)) {
          const s1 = [...userAnswer].sort();
          const s2 = [...q.answer_key].sort();
          isCorrect = s1.length === s2.length && s1.every((v, i) => v === s2[i]);
        } else {
          isCorrect = false;
        }
      } else {
        isCorrect = userAnswer === (Array.isArray(q.answer_key) ? q.answer_key[0] : q.answer_key);
      }
    }
    
    return {
      number: q.number,
      type: q.type,
      text_number: q.text_number,
      question: q.question,
      options: q.options,
      user_answer: userAnswer || null,
      correct_answer: q.answer_key || null,
      is_correct: isCorrect,
      explanation: q.explanation || '',
      matching_answers: q.matching_answers || null
    };
  });
  
  res.json({
    attempt,
    package_name: pkg.package_name,
    texts: pkg.texts,
    results
  });
});

// Bookmarks
app.get('/api/bookmarks', (req, res) => {
  const bookmarks = db.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC').all();
  res.json(bookmarks);
});

app.post('/api/bookmarks', (req, res) => {
  const { package_id, question_number, note } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO bookmarks (package_id, question_number, note) VALUES (?, ?, ?)')
      .run(package_id, question_number, note || '');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/bookmarks/:packageId/:questionNumber', (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE package_id = ? AND question_number = ?')
    .run(parseInt(req.params.packageId), parseInt(req.params.questionNumber));
  res.json({ success: true });
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 TKA English Practice Server running at http://localhost:${PORT}`);
  console.log(`📚 ${soalData.packages.length} packages loaded`);
});
