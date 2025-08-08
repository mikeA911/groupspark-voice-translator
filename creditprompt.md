# Claude Code Prompt: PWA Credit System Implementation

## Project Overview
I have a translation PWA for tourists and business travelers. Users can input voice/text, get polished text (3 cents), translation (7 cents), phonetic text, and voice output. I need to implement a credit system where users can purchase and manage credits locally without accounts.

## Credit Pricing Structure
**Use Cases:**
1. **Note-taking only**: Voice/text → polished text = 3 credits
2. **Complete translation**: Voice/text → polished text → translation = 10 credits (3 + 7)
3. **Translation from existing text**: Existing text → translation = 7 credits

**Credit Values:**
- **Polished text generation**: 3 credits (3 cents)
- **Translation**: 7 credits (7 cents)  
- **Complete translation workflow**: 10 credits (3 + 7 = 10 cents)
- **Credit packages**: $1 = 100 credits (equivalent to 10 complete translations OR 33 note-taking sessions)

**Backend Flexibility:**
- Current rate: 1 credit = 1 cent
- System should support configurable credit-to-cent conversion (e.g., 1 credit = 0.5 cents)
- All costs defined as credits, with backend controlling the actual monetary value

## Implementation Requirements

### 1. Credit Purchase & Storage (User Story 1)
Implement a credit system that:
- Stores credits securely in IndexedDB with encryption
- Uses device fingerprinting for basic security
- Requests persistent storage permissions
- Handles payment integration (prepare for Stripe integration)
- Works offline after purchase
- Shows current balance in app header

**Technical Details:**
- Use IndexedDB with object stores: `credits`, `transactions`, `settings`
- Encrypt credit data using Web Crypto API
- Generate device fingerprint from: screen resolution, timezone, language, canvas fingerprint
- Store credit purchase history with timestamps
- Implement backup/recovery codes

### 2. Credit Usage & Deduction (User Story 2)
Create usage system that:
- Shows cost before each operation ("This will cost 3 credits for polishing" or "10 credits for complete translation")
- Deducts credits only after successful API calls
- Updates balance in real-time
- Warns when credits < 50 credits remaining
- Prevents usage when insufficient credits
- Logs all usage with timestamps

**Cost Structure:**
```javascript
const CREDIT_COSTS = {
  POLISH_TEXT: 3,      // 3 credits (note-taking/polishing only)
  TRANSLATE: 7,        // 7 credits (translation only)
  COMPLETE: 10,        // 10 credits (polish + translate)
  
  // Backend configurable conversion rate
  CREDIT_TO_CENT_RATE: 1  // 1 credit = 1 cent (configurable)
};

// Usage examples:
// Note-taking only: 3 credits
// Translate existing text: 7 credits  
// Complete workflow: 3 + 7 = 10 credits
```

### 3. Credit Management & History (User Story 3)
Build management interface that:
- Displays purchase history (date, amount, credits received)
- Shows usage history (date, operation, cost, remaining balance)
- Exports data as JSON/CSV
- Generates backup codes for credit recovery
- Allows credit balance reset (for testing)

## Current App Structure
My PWA likely has these components:
- Voice input/output handling
- Text processing functions
- Translation API calls
- IndexedDB for notes storage
- Service worker for offline functionality

## Integration Points
The credit system should integrate with existing app workflows:

**Note-taking workflow** (3 credits):
- Voice/text input → polished text → save to notes
- No translation required

**Translation workflow** (10 credits):  
- Voice/text input → polished text (3 credits) → translation (7 credits) → phonetics → voice output

**Translation-only workflow** (7 credits):
- Existing text → translation → phonetics → voice output
- Skip polishing step

## Security Requirements
- Encrypt credits using device-specific key
- Generate unique device fingerprint
- Validate credits before expensive operations  
- Store encrypted backup codes
- Log all credit transactions

## UI Requirements
- Credit balance prominently displayed
- "Buy Credits" button when balance low
- Cost preview before operations
- Purchase confirmation messages
- Usage history table/list
- Export functionality buttons

## Code Structure Needed
Please create/modify these components:

### Core Credit Management
```javascript
// CreditManager class with methods:
// - initializeStorage()
// - purchaseCredits(amount)
// - deductCredits(cost, operation)
// - getBalance()
// - generateDeviceFingerprint()
// - encryptData() / decryptData()
```

### UI Components
```javascript
// Credit display component
// Purchase flow component  
// History/management component
// Cost preview component
```

### Integration Helpers
```javascript
// Wrapper functions for existing translation calls
// Credit validation middleware
// Usage logging functions
```

## Testing Requirements
Include test scenarios for:
- Credit purchase simulation (without actual payment)
- Credit deduction for different operations
- Insufficient credit handling
- Data export functionality
- Device fingerprint consistency
- Encryption/decryption verification

## File Organization
Please organize the code into appropriate files:
- `creditManager.js` - Core credit functionality
- `creditUI.js` - User interface components
- `creditStorage.js` - IndexedDB operations
- `creditSecurity.js` - Encryption and fingerprinting
- `creditIntegration.js` - Integration with existing app functions

## Acceptance Criteria
After implementation:
1. User can see credit balance in app header
2. User gets cost preview before operations
3. Credits are deducted only after successful operations
4. Purchase flow is ready for payment integration
5. All data persists across app restarts
6. Usage history is trackable and exportable
7. System works offline after initial credit purchase
8. Basic security prevents casual credit manipulation

## Notes
- This is a PWA, so no native mobile APIs available
- Focus on user experience - tourists need simple, fast interactions  
- Prepare for future Stripe payment integration
- Consider offline-first design
- Add generous logging for debugging during development

Please implement this credit system by examining my existing PWA code and integrating the credit functionality seamlessly. Focus on clean, maintainable code that follows PWA best practices.