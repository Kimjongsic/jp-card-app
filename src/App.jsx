import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [isTeacher, setIsTeacher] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 교사용 상태
  const [inputWords, setInputWords] = useState(
    Array(15).fill({ kanji: '', meaning: '' })
  );

  // 학생용 상태
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // 1. 교사: 단어 저장 로직
  const handleSave = async () => {
    // 공백 제외 필터링
    const filtered = inputWords.filter(w => w.kanji && w.meaning);
    if(filtered.length < 15) {
      alert("15개의 단어를 모두 입력해주세요.");
      return;
    }

    // 세트 등록
    const { error: setError } = await supabase
      .from('word_sets')
      .upsert({ id: date, date: date });

    if (setError) return alert("세트 저장 실패");

    // 단어 등록
    const wordsToInsert = filtered.map(w => ({ set_id: date, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordError } = await supabase.from('words').insert(wordsToInsert);

    if (!wordError) alert("오늘의 단어 15개 등록 완료!");
  };

  // 2. 학생: 오늘 날짜 단어 불러오기 및 셔플
  const loadWords = async () => {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('set_id', date);

    if (data && data.length > 0) {
      // Fisher-Yates 셔플 알고리즘으로 랜덤 섞기
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setCurrentIndex(0);
      setShowAnswer(false);
    } else {
      alert("해당 날짜에 등록된 단어가 없습니다.");
      setWords([]);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <button onClick={() => setIsTeacher(!isTeacher)}>
        {isTeacher ? "학생 페이지로 전환" : "교사 페이지로 전환"}
      </button>

      <hr />

      <div>
        <label>날짜 선택: </label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {!isTeacher && <button onClick={loadWords} style={{marginLeft: '10px'}}>학습 시작하기</button>}
      </div>

      {isTeacher ? (
        /* 교사 전용 UI */
        <div>
          <h2>👨‍🏫 교사 단어 등록 (15개)</h2>
          {inputWords.map((word, idx) => (
            <div key={idx} style={{ marginBottom: '5px' }}>
              <span>{idx + 1}. </span>
              <input 
                placeholder="일본어" 
                value={word.kanji} 
                onChange={e => {
                  const newWords = [...inputWords];
                  newWords[idx] = { ...newWords[idx], kanji: e.target.value };
                  setInputWords(newWords);
                }}
              />
              <input 
                placeholder="한국어 뜻" 
                value={word.meaning} 
                onChange={e => {
                  const newWords = [...inputWords];
                  newWords[idx] = { ...newWords[idx], meaning: e.target.value };
                  setInputWords(newWords);
                }}
              />
            </div>
          ))}
          <button onClick={handleSave} style={{ marginTop: '10px', padding: '10px 20px' }}>저장하기</button>
        </div>
      ) : (
        /* 학생 전용 UI */
        <div style={{ marginTop: '30px' }}>
          <h2>🎒 학생 랜덤 카드 학습</h2>
          {words.length > 0 ? (
            currentIndex < words.length ? (
              <div>
                <h3>진행 상황: {currentIndex + 1} / {words.length}</h3>
                <div style={{
                  border: '2px solid #ccc', padding: '50px', borderRadius: '10px',
                  maxWidth: '30px0px', margin: '20px auto', fontSize: '24px', backgroundColor: '#f9f9f9'
                }}>
                  {showAnswer ? words[currentIndex].meaning : words[currentIndex].kanji}
                </div>
                
                {!showAnswer ? (
                  <button onClick={() => setShowAnswer(true)} style={{padding: '10px'}}>정답 확인</button>
                ) : (
                  <button onClick={() => {
                    setCurrentIndex(currentIndex + 1);
                    setShowAnswer(false);
                  }} style={{padding: '10px'}}>다음 단어로</button>
                )}
              </div>
            ) : (
              <h3>🎉 오늘 배울 단어를 모두 마쳤습니다! 참 잘했어요!</h3>
            )
          ) : (
            <p>날짜를 선택하고 '학습 시작하기'를 눌러주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;