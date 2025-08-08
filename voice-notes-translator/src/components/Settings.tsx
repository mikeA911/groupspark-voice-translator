import React, { useState } from 'react';

interface Language {
  code: string;
  name: string;
}

const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'lo', name: 'Lao' },
  { code: 'km', name: 'Khmer' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
];

interface SettingsProps {
  recordLanguage: string;
  translateToLanguages: string[];
  onRecordLanguageChange: (language: string) => void;
  onTranslateLanguagesChange: (languages: string[]) => void;
}

const Settings: React.FC<SettingsProps> = ({
  recordLanguage,
  translateToLanguages,
  onRecordLanguageChange,
  onTranslateLanguagesChange,
}) => {
  const handleTranslateLanguageToggle = (languageCode: string) => {
    if (translateToLanguages.includes(languageCode)) {
      onTranslateLanguagesChange(translateToLanguages.filter(lang => lang !== languageCode));
    } else {
      onTranslateLanguagesChange([...translateToLanguages, languageCode]);
    }
  };

  return (
    <div className="settings">
      <h2>Translation Settings</h2>
      
      <div className="setting-section">
        <h3>Record Language</h3>
        <p>Select the language you'll be speaking:</p>
        <select 
          value={recordLanguage} 
          onChange={(e) => onRecordLanguageChange(e.target.value)}
          className="language-select"
        >
          {AVAILABLE_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-section">
        <h3>Translation Languages</h3>
        <p>Select languages to translate your notes to:</p>
        <div className="language-checkboxes">
          {AVAILABLE_LANGUAGES.filter(lang => lang.code !== recordLanguage).map(lang => (
            <label key={lang.code} className="language-checkbox">
              <input
                type="checkbox"
                checked={translateToLanguages.includes(lang.code)}
                onChange={() => handleTranslateLanguageToggle(lang.code)}
              />
              {lang.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;