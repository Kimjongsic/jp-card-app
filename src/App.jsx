import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [isTeacher, setIsTeacher] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  
  // 데이터 상태
  const [dateList, setDateList] = useState([]); // 등록된 날짜 목록
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState(Array(15).fill({ kanji: '', meaning: '' }));
  const [words, setWords] = useState([]);
  
  // 플레이 상태
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 설정: 교사 페이지 비밀번호 (원하는 것으로 수정하세요)
  const TEACHER_PASSWORD = "1234"; 

  // 초기 로드: 등록된 모든 날짜 가져오기
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

  // 교사 모드 진입 시도
  const tryEnterTeacherMode = () => {
    if (isTeacher) {
      setIsTeacher(false);
    } else {
      setShowPasswordInput(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === TEACHER_PASSWORD) {
      setIsTeacher(true);
      setShowPasswordInput(false);
      setPassword('');
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  // 교사: 단어 저장
  const handleSave = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < 15) return alert("15개의 단어를 입력해주세요.");

    await supabase.from('word_sets').upsert({ id: selectedDate, date: selectedDate });
    await supabase.from('words').delete().eq('set_id', selectedDate);
    const { error } = await supabase.from('words').insert(
      filtered.map(w => ({ set_id: selectedDate, kanji: w.kanji, meaning: w.meaning }))
    );

    if (!error) {
      alert("업로드 완료!");
      fetchDateList(); // 목록 새로고침
    }
  };

  // 학생: 특정 날짜 카드 시작
  const startLearning = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);
    if (data && data.length > 0) {
      setWords([...data].sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasStarted(true);
    }
  };

  return (
    <div style={{ maxWidth: '600px', width: '100%', padding: '20px' }}>
      
      {/* 상단 모드 전환 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button onClick={tryEnterTeacherMode} className="mode-btn">
          {isTeacher ? "STUDENT MODE" : "先生モード"}
        </button>
      </div>

      {/* 비밀번호 입력창 */}
      {showPasswordInput && (
        <div className="dashboard-box" style={{textAlign: 'center'}}>
          <h3>🔒 Password Required</h3>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            style={{padding: '12px', borderRadius: '10px', border: '1px solid #333', background: '#000', color: '#fff', marginBottom: '10px'}}
          />
          <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
            <button onClick={handlePasswordSubmit} className="start-btn" style={{width: '100px'}}>확인</button>
            <button onClick={() => setShowPasswordInput(false)} className="mode-btn">취소</button>
          </div>
        </div>
      )}

      {!showPasswordInput && (
        <div className="dashboard-box">
          {isTeacher ? (
            /* ==================== 👨‍🏫 TEACHER MODE ==================== */
            <div>
              <h2 style={{textAlign: 'center'}}>先生モード : 단어 등록</h2>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-input-dark" />
              <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '20px 0' }}>
                {inputWords.map((word, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <input placeholder="일본어" value={word.kanji} onChange={e => {
                      const newWords = [...inputWords];
                      newWords[idx].kanji = e.target.value;
                      setInputWords(newWords);
                    }} className="input-dark" />
                    <input placeholder="뜻" value={word.meaning} onChange={e => {
                      const newWords = [...inputWords];
                      newWords[idx].meaning = e.target.value;
                      setInputWords(newWords);
                    }} className="input-dark" />
                  </div>
                ))}
              </div>
              <button onClick={handleSave} className="save-btn">저장하기</button>
            </div>
          ) : (
            /* ==================== 🎒 STUDENT MODE ==================== */
            <div>
              {!hasStarted ? (
                <div>
                  <h2 style={{marginBottom: '20px'}}>📚 오늘의 카드 선택</h2>
                  <div className="date-grid">
                    {dateList.map((item) => (
                      <div key={item.date} className="date-card">
                        <div className="date-label">{item.date}</div>
                        <button onClick={() => startLearning(item.date)} className="mini-start-btn">開始</button>
                      </div>
                    ))}
                    {dateList.length === 0 && <p style={{color: '#666'}}>등록된 카드가 없습니다.</p>}
                  </div>
                </div>
              ) : (
                /* 학습 스크린 (카드 렌더링 부분) */
                <div>
                  <div className="progress-bar"><div className="fill" style={{width: `${(currentIndex/words.length)*100}%`}}></div></div>
                  <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                    <div className="card-inner">
                      <div className="card-front">{words[currentIndex]?.kanji}</div>
                      <div className="card-back">{words[currentIndex]?.meaning}</div>
                    </div>
                  </div>
                  <button onClick={() => {
                    if(!isFlipped) setIsFlipped(true);
                    else { setIsFlipped(false); setTimeout(()=>setCurrentIndex(currentIndex+1), 200); }
                  }} className="next-btn">
                    {isFlipped ? "다음으로 ➡️" : "정답 확인 👀"}
                  </button>
                  {currentIndex >= words.length && (
                    <div className="complete-overlay">
                      <h2>🎉 お疲れ様でした!</h2>
                      <button onClick={() => setHasStarted(false)} className="mode-btn">목록으로</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;