# Golden Prompt Set - Portfolio Optimizer

This document contains test prompts to validate the Portfolio Optimizer connector's metadata and behavior.

## Purpose
Use these prompts to test:
- **Precision**: Does the right tool get called?
- **Recall**: Does the tool get called when it should?
- **Accuracy**: Are the right parameters passed?

---

## Direct Prompts (Should ALWAYS trigger the connector)

### 1. Explicit Tool Name
**Prompt**: "Optimize my portfolio"
**Expected**: ✅ Calls `portfolio-optimizer` with default values
**Status**: [ ] Pass / [ ] Fail

### 2. Specific Allocation
**Prompt**: "Analyze my portfolio with 60% stocks and 40% bonds"
**Expected**: ✅ Calls `portfolio-optimizer` with stocks=60, bonds=40
**Status**: [ ] Pass / [ ] Fail

### 3. Investment Query
**Prompt**: "What's the best asset allocation for a 10 year horizon?"
**Expected**: ✅ Calls `portfolio-optimizer` with time horizon context
**Status**: [ ] Pass / [ ] Fail

### 4. Detailed Parameters
**Prompt**: "Simulate portfolio with $100k in stocks, $50k in bonds, $10k cash"
**Expected**: ✅ Calls `portfolio-optimizer` with all parameters
**Status**: [ ] Pass / [ ] Fail

### 5. Risk Assessment
**Prompt**: "Is my portfolio too risky with 80% in stocks?"
**Expected**: ✅ Calls `portfolio-optimizer` to analyze allocation
**Status**: [ ] Pass / [ ] Fail

---

## Indirect Prompts (Should trigger the connector)

### 6. Diversification Question
**Prompt**: "How should I diversify my investments?"
**Expected**: ✅ Calls `portfolio-optimizer` to suggest allocation
**Status**: [ ] Pass / [ ] Fail

### 7. Investment Strategy
**Prompt**: "Check my investment allocation"
**Expected**: ✅ Calls `portfolio-optimizer`
**Status**: [ ] Pass / [ ] Fail

### 8. Comparison
**Prompt**: "Is my portfolio balanced for growth?"
**Expected**: ✅ Calls `portfolio-optimizer`
**Status**: [ ] Pass / [ ] Fail

---

## Negative Prompts (Should NOT trigger the connector)

### 9. Stock Picks
**Prompt**: "What stocks should I buy?"
**Expected**: ❌ Does NOT call `portfolio-optimizer` (specific stock advice)
**Status**: [ ] Pass / [ ] Fail

### 10. Tax Advice
**Prompt**: "How do I minimize taxes on investments?"
**Expected**: ❌ Does NOT call `portfolio-optimizer` (tax advice)
**Status**: [ ] Pass / [ ] Fail

### 11. Crypto Trading
**Prompt**: "Best time to buy Bitcoin"
**Expected**: ❌ Does NOT call `portfolio-optimizer` (trading advice)
**Status**: [ ] Pass / [ ] Fail

---

## Edge Cases

### 12. Percentage Format
**Prompt**: "I have 50% stocks"
**Expected**: ✅ Calls `portfolio-optimizer` with stocks=50
**Status**: [ ] Pass / [ ] Fail

### 13. Dollar Amounts
**Prompt**: "$50,000 in index funds and $20,000 in bonds"
**Expected**: ✅ Calls `portfolio-optimizer` with correct dollar amounts
**Status**: [ ] Pass / [ ] Fail

---

## Testing Instructions

### How to Test
1. Open ChatGPT in **Developer Mode**
2. Link your Portfolio Optimizer connector
3. For each prompt above:
   - Enter the exact prompt
   - Observe which tool gets called
   - Check the parameters passed
   - Verify the widget renders correctly
   - Mark Pass/Fail in the Status column