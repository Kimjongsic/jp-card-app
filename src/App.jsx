import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [isTeacher, setIsTeacher] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 데이터 관리 상태
  const [dateList, setDateList] = useState([]); // 등록된 날짜 목록들
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState(Array(15).fill({ kanji: '', meaning: '' }));

  // 학생 플레이 상태
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 🔒 교사 페이지 진입 비밀번호 설정
  const TEACHER_PASSWORD = "1234";

  // 컴포넌트 마운트 시 저장된 날짜 뭉치들 가져오기
  useEffect(() => {
    fetchDateList();
  }, []);

  const fetchDateList = async () => {
    const { data, error } = await supabase
      .from('word_sets')
      .select('date')
      .order('date', { ascending: false });
    if (data) setDateList(data);
  };

  // 모드 전환 제어 (선생님 모드 클릭 시 비번 확인)
  const handleModeToggle = () => {
    if (isTeacher) {
      setIsTeacher(false);
      setHasStarted(false);
    } else {
      setShowPasswordModal(true);
    }
  };

  const verifyPassword = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setIsTeacher(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setHasStarted(false);
    } else {
      alert("❌ 비밀번호가 일치하지 않습니다.");
    }
  };

  // 교사: 15개 단어 저장 로직
  const handleSave = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < 15) {
      alert("⚡ 15개의 단어를 모두 채워주셔야 저장할 수 있습니다.");
      return;
    }

    const { error: setErr } = await supabase.from('word_sets').upsert({ id: teacherDate, date: teacherDate });
    if (setErr) return alert("❌ 세트 저장 중 오류 발생");

    await supabase.from('words').delete().eq('set_id', teacherDate);

    const wordsToInsert = filtered.map(w => ({ set_id: teacherDate, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) {
      alert("🔮 오늘의 일본어 카드 15개가 완벽히 세팅되었습니다!");
      fetchDateList(); // 목록 최신화
    }
  };

  // 학생: 선택한 날짜 카드 세트 불러와서 랜덤 셔플 후 시작
  const startLearning = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasStarted(true);
    } else {
      alert("🫙 해당 날짜에 단어 데이터가 없습니다.");
    }
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '500px', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* 상단 탭 전환 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <button 
          onClick={handleModeToggle}
          style={{
            background: 'rgba(255, 255, 255, 0.05)', color: '#a0aec0', border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
          }}
        >
          {isTeacher ? "🔮 STUDENT MODE" : "⚙️ 先生モード"}
        </button>
      </div>

      {/* 비밀번호 확인 모달 UI */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🔒 先生モード 인증</h3>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '15px' }}>선생님 전용 암호를 입력해 주세요.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{
              background: '#14151f', border: '1px solid #232433', color: '#fff', 
              padding: '12px', borderRadius: '10px', width: '80%', textAlign: 'center', outline: 'none', marginBottom: '15px'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '80px' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* 대시보드 콘텐트 본문 */}
      {!showPasswordModal && (
        <div className="dashboard-box">
          
          {isTeacher ? (
            /* ==================== 👨‍🏫 TEACHER MODE UI ==================== */
            <div>
              <h2 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '20px' }}>단어 드롭하기 (15개)</h2>
              <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                <input 
                  type="date" 
                  value={teacherDate} 
                  onChange={(e) => setTeacherDate(e.target.value)} 
                  style={{
                    background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '10px 15px',
                    borderRadius: '12px', fontSize: '16px', outline: 'none', textAlign: 'center'
                  }}
                />
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '5px', marginBottom: '20px' }}>
                {inputWords.map((word, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: '#4b5563', fontSize: '14px', width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                    <input 
                      placeholder="일본어" 
                      value={word.kanji} 
                      onChange={e => {
                        const newWords = [...inputWords];
                        newWords[idx] = { ...newWords[idx], kanji: e.target.value };
                        setInputWords(newWords);
                      }}
                      style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '10px', outline: 'none' }}
                    />
                    <input 
                      placeholder="뜻" 
                      value={word.meaning} 
                      onChange={e => {
                        const newWords = [...inputWords];
                        newWords[idx] = { ...newWords[idx], meaning: e.target.value };
                        setInputWords(newWords);
                      }}
                      style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '10px', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={handleSave} 
                style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)' }}
              >
                세트 업로드하기
              </button>
            </div>
          ) : (
            /* ==================== 🎒 STUDENT MODE UI ==================== */
            <div>
              {!hasStarted ? (
                <div>
                  <h2 style={{ fontSize: '20px', marginBottom: '5px' }}>📚 오늘의 단어 카드</h2>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px 0' }}>학습할 날짜의 카드를 선택해 주세요.</p>
                  
                  {/* 날짜별 카드 리스트 나열 그리드 */}
                  <div className="date-grid">
                    {dateList.map((item) => (
                      <div key={item.date} className="date-card">
                        <div className="date-label">{item.date}</div>
                        <button onClick={() => startLearning(item.date)} className="mini-start-btn">
                          開始
                        </button>
                      </div>
                    ))}
                    {dateList.length === 0 && (
                      <p style={{ color: '#4b5563', fontSize: '14px', gridColumn: '1/-1', textAlign: 'center', padding: '20px 0' }}>등록된 카드 세트가 아직 없습니다.</p>
                    )}
                  </div>
                </div>
              ) : (
                /* 단어 매칭 플레이 필드 */
                currentIndex < words.length ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                      <span>PROGRESS</span>
                      <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{currentIndex + 1} / {words.length}</span>
                    </div>
                    
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>

                    {/* 3D 플립 카드 컴포넌트 */}
                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                      <div className="card-inner">
                        <div className="card-front">
                          <span style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '2px', position: 'absolute', top: '20px' }}>JAPANESE</span>
                          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{words[currentIndex].kanji}</div>
                          <span style={{ fontSize: '11px', color: '#4b5563', position: 'absolute', bottom: '20px' }}>TAP TO FLIP 🔮</span>
                        </div>
                        <div className="card-back">
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', position: 'absolute', top: '20px' }}>MEANING</span>
                          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{words[currentIndex].meaning}</div>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', position: 'absolute', bottom: '20px' }}>TAP TO RETURN ↩️</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!isFlipped) {
                          setIsFlipped(true);
                        } else {
                          setIsFlipped(false);
                          setTimeout(() => {
                            setCurrentIndex(currentIndex + 1);
                          }, 200); 
                        }
                      }} 
                      style={{
                        width: '100%', background: isFlipped ? '#fff' : '#1e1e2f', color: isFlipped ? '#000' : '#fff', 
                        border: isFlipped ? 'none' : '1px solid #3a3a52', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer'
                      }}
                    >
                      {isFlipped ? "NEXT CARD ➡️" : "CHECK ANSWER 👀"}
                    </button>
                  </div>
                ) : (
                  /* 학습 끝 완료 스크린 */
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚡</div>
                    <h3 style={{ fontSize: '22px', margin: '0 0 10px 0', color: '#00ffcc' }}>DECK CLEARED!</h3>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '25px' }}>오늘의 카드 단어들을 모두 마스터했습니다.</p>
                    <button 
                      onClick={() => setHasStarted(false)} 
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 30px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      목록으로 돌아가기
                    </button>
                  </div>
                )
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;