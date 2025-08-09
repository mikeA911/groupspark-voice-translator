import { supabase } from '../config/supabase.js';

// Supported UI languages
const SUPPORTED_UI_LANGUAGES = {
  'en': 'English',
  'lo': 'ລາວ',
  'km': 'ខ្មែរ'
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch user preferences' });
    }

    // If no preferences found, return defaults
    if (!data) {
      return res.json({
        ui_language: 'en',
        preferences: {},
        supported_languages: SUPPORTED_UI_LANGUAGES
      });
    }

    res.json({
      ui_language: data.ui_language,
      preferences: data.preferences || {},
      supported_languages: SUPPORTED_UI_LANGUAGES
    });

  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { ui_language, preferences = {} } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate UI language
    if (ui_language && !SUPPORTED_UI_LANGUAGES[ui_language]) {
      return res.status(400).json({ 
        error: 'Unsupported UI language',
        supported_languages: Object.keys(SUPPORTED_UI_LANGUAGES)
      });
    }

    // Try to update existing preferences
    const { data: existingData } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    
    if (existingData) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ui_language: ui_language || 'en',
          preferences: preferences
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user preferences:', error);
        return res.status(500).json({ error: 'Failed to update preferences' });
      }
      result = data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ui_language: ui_language || 'en',
          preferences: preferences
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user preferences:', error);
        return res.status(500).json({ error: 'Failed to create preferences' });
      }
      result = data;
    }

    res.json({
      ui_language: result.ui_language,
      preferences: result.preferences || {},
      supported_languages: SUPPORTED_UI_LANGUAGES,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get supported UI languages
 */
export const getSupportedLanguages = async (req, res) => {
  try {
    res.json({
      supported_languages: SUPPORTED_UI_LANGUAGES
    });
  } catch (error) {
    console.error('Error in getSupportedLanguages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};