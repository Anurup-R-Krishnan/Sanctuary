# Reading Experience Fixes for Sanctuary

## Immediate Improvements

### 1. Simplify Touch Handling
- Remove complex gesture detection
- Use simple tap zones (left 1/3, center 1/3, right 1/3)
- Eliminate double-tap fullscreen (confusing)

### 2. Reduce CSS Aggressiveness
- Remove universal `!important` overrides
- Preserve more of the original EPUB styling
- Use gentler resets that don't break formatting

### 3. Optimize Performance
- Debounce style updates
- Avoid destroying/recreating rendition on mode changes
- Cache computed styles

### 4. Simplify Navigation
- Reduce keyboard shortcuts to essentials (arrow keys, space, escape)
- Make touch zones more predictable
- Remove conflicting event handlers

### 5. Improve Focus Mode
- Use subtle highlighting instead of opacity
- Make transitions smoother
- Add option to disable entirely

## Code Changes Needed

### ReaderView.tsx
1. Simplify touch event handling
2. Remove double-click fullscreen
3. Debounce style applications
4. Reduce event listener complexity

### SettingsContext.tsx
1. Add debouncing to style-affecting settings
2. Reduce default options complexity
3. Add "simple mode" preset

### CSS (index.css)
1. Remove aggressive universal resets
2. Use more targeted selectors
3. Preserve EPUB author intentions

## User Experience Improvements

1. **Add Reading Mode Presets**
   - Simple (minimal customization)
   - Advanced (current full options)
   - Classic (book-like defaults)

2. **Improve Onboarding**
   - Show reading controls tutorial
   - Explain gesture navigation
   - Provide quick setup wizard

3. **Better Error Handling**
   - Graceful fallbacks for EPUB parsing issues
   - Clear error messages
   - Recovery options

4. **Performance Monitoring**
   - Track rendering performance
   - Optimize for slower devices
   - Add loading states
