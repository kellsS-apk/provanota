import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAttempt, getAttemptReview } from '../api';
import { useAuth } from '../AuthContext';

const BarRow = ({ label, value, total }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>{label}</span>
        <span>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 10, background: '#eef2ff', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb' }} />
      </div>
    </div>
  );
};

const Pill = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      border: '1px solid #e5e7eb',
      background: active ? '#2563eb' : '#fff',
      color: active ? '#fff' : '#111827',
      borderRadius: 999,
      padding: '6px 12px',
      fontSize: 13,
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

const safeUpper = (v) => (typeof v === 'string' ? v.toUpperCase() : '');

const Results = () => {
  const { attemptId } = useParams();
  const { user } = useAuth();

  const [attempt, setAttempt] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | correct | wrong
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const attemptRes = await getAttempt(attemptId);
      setAttempt(attemptRes.data);

      // Prefer review endpoint (includes gabarito)
      try {
        const reviewRes = await getAttemptReview(attemptId);
        setReview(reviewRes.data);
      } catch (e) {
        // fallback: no review available
        setReview(null);
      }
    } catch (e) {
      setError('Não foi possível carregar o resultado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!review) return null;

    const total = review.total_questions || review.questions?.length || 0;
    const correct = review.correct_count ?? review.questions.filter(q => q.is_correct).length;

    const byArea = {};
    const bySubject = {};
    const byDifficulty = {};

    review.questions.forEach((q) => {
      const area = q.area || 'Outros';
      const subject = q.subject || 'Outros';
      const difficulty = q.difficulty || 'medium';

      byArea[area] = byArea[area] || { total: 0, correct: 0 };
      bySubject[subject] = bySubject[subject] || { total: 0, correct: 0 };
      byDifficulty[difficulty] = byDifficulty[difficulty] || { total: 0, correct: 0 };

      byArea[area].total += 1;
      bySubject[subject].total += 1;
      byDifficulty[difficulty].total += 1;

      if (q.is_correct) {
        byArea[area].correct += 1;
        bySubject[subject].correct += 1;
        byDifficulty[difficulty].correct += 1;
      }
    });

    const score = review.score ?? (total ? (correct / total) * 100 : 0);

    return { total, correct, score, byArea, bySubject, byDifficulty };
  }, [review]);

  const gamification = useMemo(() => {
    if (!stats) return null;

    // XP simples (pode ajustar depois)
    const xpGained = stats.correct * 10 + (stats.score >= 80 ? 20 : 0);

    const userId = user?.id || user?.email || 'anon';
    const key = `provanota_progress_${userId}`;
    let current = { xp: 0, level: 1, totalCorrect: 0, totalAnswered: 0 };

    try {
      const raw = localStorage.getItem(key);
      if (raw) current = { ...current, ...JSON.parse(raw) };
    } catch (_) {}

    const newXp = (current.xp || 0) + xpGained;
    const newTotalCorrect = (current.totalCorrect || 0) + stats.correct;
    const newTotalAnswered = (current.totalAnswered || 0) + stats.total;

    const level = Math.max(1, Math.floor(newXp / 200) + 1);
    const levelXpStart = (level - 1) * 200;
    const levelXpEnd = level * 200;
    const levelProgress = Math.min(100, Math.round(((newXp - levelXpStart) / (levelXpEnd - levelXpStart)) * 100));

    const badges = [];
    if (stats.score >= 90) badges.push('🔥 Nota 90+');
    if (stats.correct >= 10) badges.push('✅ 10 acertos');
    if (newTotalAnswered >= 50) badges.push('🏁 50 questões');

    // persist (best-effort)
    try {
      localStorage.setItem(key, JSON.stringify({
        xp: newXp,
        level,
        totalCorrect: newTotalCorrect,
        totalAnswered: newTotalAnswered,
        lastXpGained: xpGained,
        updatedAt: new Date().toISOString()
      }));
    } catch (_) {}

    return { xpGained, xp: newXp, level, levelProgress, badges, totalCorrect: newTotalCorrect, totalAnswered: newTotalAnswered };
  }, [stats, user]);

  const filteredQuestions = useMemo(() => {
    if (!review?.questions) return [];
    if (filter === 'correct') return review.questions.filter(q => q.is_correct);
    if (filter === 'wrong') return review.questions.filter(q => !q.is_correct);
    return review.questions;
  }, [review, filter]);

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;
  if (error) return <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>;
  if (!attempt) return <div style={{ padding: 24 }}>Resultado não encontrado.</div>;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Resultado</h1>
          <div style={{ marginTop: 6, color: '#6b7280', fontSize: 14 }}>
            {attempt.exam_title ? attempt.exam_title : 'Simulado'} • {attempt.created_at ? new Date(attempt.created_at).toLocaleString() : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <button style={{
              border: '1px solid #e5e7eb',
              background: '#fff',
              borderRadius: 10,
              padding: '10px 14px',
              cursor: 'pointer'
            }}>
              Voltar
            </button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 18 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#fff' }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Pontuação</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {stats ? `${Math.round(stats.score)}%` : (typeof attempt?.score === 'number' ? `${Math.round(attempt.score)}%` : (typeof attempt?.score?.percentage === 'number' ? `${Math.round(attempt.score.percentage)}%` : '—'))}
          </div>
          {stats && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
              {stats.correct} de {stats.total} corretas
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#fff' }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Progresso</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {gamification ? `Nível ${gamification.level}` : '—'}
          </div>
          {gamification && (
            <>
              <div style={{ height: 10, background: '#eef2ff', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ width: `${gamification.levelProgress}%`, height: '100%', background: '#7c3aed' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
                +{gamification.xpGained} XP • Total: {gamification.xp} XP
              </div>
            </>
          )}
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#fff' }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Conquistas</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(gamification?.badges?.length ? gamification.badges : ['🚧 Em construção']).map((b) => (
              <span key={b} style={{ background: '#f3f4f6', padding: '6px 10px', borderRadius: 999, fontSize: 13 }}>
                {b}
              </span>
            ))}
          </div>
          {gamification && (
            <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
              Total: {gamification.totalCorrect}/{gamification.totalAnswered} acertos
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, background: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Desempenho</h2>
        {!stats && (
          <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>
            Para ver gráficos e revisão, ative o endpoint de revisão do backend (/attempts/&lt;id&gt;/review).
          </div>
        )}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Por matéria</div>
              {Object.entries(stats.bySubject)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 8)
                .map(([k, v]) => (
                  <BarRow key={k} label={k} value={v.correct} total={v.total} />
                ))}
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Por área</div>
              {Object.entries(stats.byArea)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([k, v]) => (
                  <BarRow key={k} label={k} value={v.correct} total={v.total} />
                ))}
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Por dificuldade</div>
              {Object.entries(stats.byDifficulty)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([k, v]) => (
                  <BarRow key={k} label={k} value={v.correct} total={v.total} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Review */}
      <div style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Revisão das questões</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill active={filter === 'all'} onClick={() => setFilter('all')}>Todas</Pill>
            <Pill active={filter === 'correct'} onClick={() => setFilter('correct')}>Acertos</Pill>
            <Pill active={filter === 'wrong'} onClick={() => setFilter('wrong')}>Erros</Pill>
          </div>
        </div>

        {!review && (
          <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>
            A revisão detalhada depende do backend enviar o gabarito. Se quiser, eu já deixei pronto o endpoint <code>/attempts/&lt;id&gt;/review</code>.
          </div>
        )}

        {review && (
          <div style={{ marginTop: 12 }}>
            {filteredQuestions.map((q, idx) => {
              const isOpen = openId === q.question_id;
              const border = q.is_correct ? '#22c55e' : '#ef4444';
              return (
                <div key={q.question_id} style={{ border: '1px solid #e5e7eb', borderLeft: `6px solid ${border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: q.is_correct ? '#dcfce7' : '#fee2e2',
                        color: q.is_correct ? '#166534' : '#991b1b',
                        fontWeight: 700
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111827' }}>
                          {q.subject || 'Questão'}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 13 }}>
                          {q.area} • {q.difficulty}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        Marcada: <b style={{ color: '#111827' }}>{safeUpper(q.selected_answer) || '—'}</b>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        Gabarito: <b style={{ color: '#111827' }}>{safeUpper(q.correct_answer)}</b>
                      </div>
                      <button
                        onClick={() => setOpenId(isOpen ? null : q.question_id)}
                        style={{
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          borderRadius: 10,
                          padding: '8px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        {isOpen ? 'Fechar' : 'Ver detalhes'}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 14 }}>
                      {q.image_url && (
                        <div style={{ marginBottom: 12 }}>
                          <img src={q.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }} />
                        </div>
                      )}

                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#111827' }}>
                        {q.statement}
                      </div>

                      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                        {(q.alternatives || []).map((alt) => {
                          const isCorrect = alt.letter === q.correct_answer;
                          const isSelected = alt.letter === q.selected_answer;
                          const bg = isCorrect ? '#dcfce7' : isSelected ? '#fee2e2' : '#fff';
                          const color = isCorrect ? '#166534' : isSelected ? '#991b1b' : '#111827';
                          return (
                            <div key={alt.letter} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: bg, color }}>
                              <b>{alt.letter})</b> {alt.text}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 14, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Por que está certo/errado?</div>
                        <div style={{ color: '#374151', lineHeight: 1.5 }}>
                          {q.explanation ? q.explanation : 'Explicação ainda não cadastrada. (Vamos adicionando aos poucos.)'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>
                Nenhuma questão encontrada para esse filtro.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
