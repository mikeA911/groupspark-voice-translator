import React, { useState } from 'react';
import { Settings } from './components';

const App: React.FC = () => {
  const [recordLanguage, setRecordLanguage] = useState('en');
  const [translateToLanguages, setTranslateToLanguages] = useState<string[]>([]);

  return (
    <div>
      <h1>AI Voice Notes & Translator</h1>
      <p>Record your thoughts, get instant AI-polished notes, and translate them into multiple languages with voice playback.</p>
      
      <Settings
        recordLanguage={recordLanguage}
        translateToLanguages={translateToLanguages}
        onRecordLanguageChange={setRecordLanguage}
        onTranslateLanguagesChange={setTranslateToLanguages}
      />
    </div>
  );
};

export default App;