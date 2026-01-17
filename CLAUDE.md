# 🤖 Claude Development Guide

> This document helps Claude (and human developers) understand the codebase structure, locate features, and make modifications safely.

---

## � RULES FOR CLAUDE

### MUST DO:
1. **Always run the dev server in the background** when starting development:
   ```bash
   npm run dev
   ```
   Use `isBackground: true` when calling run_in_terminal.

2. **Check for errors** after making changes by reviewing terminal output and browser console.

3. **Test changes** in the browser before considering work complete.

### MUST NOT DO:
1. **DO NOT commit code without explicit permission** from the user.
   - No `git add`, `git commit`, or `git push` without being asked.
   - Always ask: "Would you like me to commit these changes?"

2. **DO NOT delete files** without confirmation.

3. **DO NOT modify the database schema** without explaining the migration path.

---

## �📁 File-by-File Reference

### Root Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and npm scripts (`dev`, `build`, `preview`) |
| `vite.config.js` | Vite config - base path `/Iten/`, outputs to `docs/` for GitHub Pages |
| `tailwind.config.js` | Tailwind CSS configuration and theme customization |
| `postcss.config.js` | PostCSS plugins (Tailwind, Autoprefixer) |
| `index.html` | HTML entry point - mounts React to `#root` |

### Entry Points

| File | Purpose |
|------|---------|
| `src/main.jsx` | React app bootstrap - renders `<App />` to DOM |
| `src/App.jsx` | Root component - just renders `<ItineraryPage />` |
| `src/index.css` | Global CSS - Tailwind directives and custom animations |

---

## 🧩 Components Guide

### Main Page (`src/components/ItineraryPage.jsx`)

**What it does:**
- Main orchestrator component (750+ lines)
- Manages UI state (expanded days, search, backup visibility)
- Connects to IndexedDB via `useItineraryDB` hook
- Calculates budget totals across all days
- Renders loading, setup wizard, error, and main views

**Key sections:**
- Lines 1-50: Imports and constants (exchange rates, activity prefix)
- Lines 50-180: Pure helper functions (currency conversion, date formatting, filtering)
- Lines 180-240: Component start, state declarations, DB hook
- Lines 240-300: useMemo for parsed data, useEffect for auto-expand today
- Lines 300-350: Activity CRUD callbacks (add, update, remove)
- Lines 350-450: Budget calculation useMemo
- Lines 450-500: Toggle handlers for day/section expansion
- Lines 500-570: Conditional renders (loading, setup wizard, error)
- Lines 570-770: Main render (header, budget widget, search, day cards)

**To modify:**
- Budget calculation → `budgetTotals` useMemo (~line 350)
- Search/filter logic → `filterItineraryBySearchQuery` function (~line 115)
- Add new header sections → Main render section (~line 600+)

---

### Day Card (`src/components/DayCard.jsx`)

**What it does:**
- Displays a single day's itinerary (550+ lines)
- Memoized with `React.memo()` for performance
- Shows date, region badge, summary, metadata
- Contains collapsible sections for travel/shelter/meals/activities
- Handles copy-to-clipboard for day summary
- Manages add/edit activity modal

**Key sections:**
- Lines 1-60: Imports, constants (section names, region badges)
- Lines 60-120: Pure helpers (region detection, section keys, activity merging)
- Lines 120-230: `formatDayAsPlainText` for clipboard copy
- Lines 260-290: Component props and local state
- Lines 290-320: Memoized computed values
- Lines 320-390: useCallback handlers
- Lines 390-550: Render (header, sections, modal)

**To modify:**
- Region badges → `REGION_BADGE_CONFIG` constant (~line 45)
- Clipboard format → `formatDayAsPlainText` function (~line 135)
- Add new section → Add to render and `SECTION_NAMES` constant

---

### Section Components (`src/components/sections/`)

#### TravelSection.jsx
- Displays flights, transfers, buffer times
- Shows route maps for flights
- Backup plan accordions
- **To add travel types:** Modify the segment card rendering (~line 280+)

#### ShelterSection.jsx  
- Hotel/Airbnb display with map preview
- Check-in/check-out times
- Multi-day stay tracking
- **To add accommodation types:** Modify type detection and display (~line 85+)

#### ActivitiesSection.jsx
- Activity cards with category badges
- Edit/delete for manual activities
- Priority-based styling
- Map preview for activities with coordinates
- **To add activity categories:** Add to `ACTIVITY_CATEGORY_COLORS` (~line 35)

#### MealsSection.jsx
- Simple meal list display
- Time and location info
- **Simplest section** - good template for new sections

---

### Database Layer (`src/db/`)

#### indexedDB.js (820+ lines)
**What it does:**
- All IndexedDB operations
- Go-style `[value, error]` returns
- Schema migrations
- CRUD for all data types

**Key functions:**
| Function | Line | Purpose |
|----------|------|---------|
| `initDB()` | ~215 | Initialize/open database |
| `isDataInitialized()` | ~297 | Check if setup complete |
| `markInitialized()` | ~320 | Mark setup as done |
| `importItineraryData()` | ~360 | Import JSON data |
| `getItineraryData()` | ~450 | Load all trip data |
| `addActivity()` | ~530 | Add user activity |
| `updateActivity()` | ~565 | Update activity |
| `removeActivity()` | ~600 | Remove user activity |
| `markActivityDeleted()` | ~650 | Soft-delete original activity |
| `getAllManualActivities()` | ~675 | Get all user activities |
| `getAllDeletedActivities()` | ~705 | Get deleted activity IDs |
| `clearAllData()` | ~750 | Wipe database |

**To add new data store:**
1. Add store name to `STORE_NAMES` constant (~line 60)
2. Create store in `onupgradeneeded` handler (~line 250)
3. Add CRUD functions following existing patterns

#### useItineraryDB.js (600+ lines)
**What it does:**
- React hook wrapping IndexedDB
- Manages loading/ready/error states
- Provides CRUD methods to components
- Handles setup wizard flow

**Key sections:**
- Lines 1-80: Imports, pure helper functions
- Lines 200-250: State declarations
- Lines 250-340: Initialization useEffect
- Lines 340-450: Import and setup callbacks
- Lines 450-580: Activity CRUD callbacks
- Lines 585-607: Return object (API surface)

**Hook return values:**
```javascript
{
  isLoading,           // Boolean - still initializing
  isReady,             // Boolean - data loaded
  needsSetup,          // Boolean - show setup wizard
  error,               // String|null - error message
  itineraryData,       // Object - trip data
  manualActivities,    // Object - user activities by date
  deletedActivities,   // Object - deleted IDs by date
  addActivity,         // Function
  updateActivity,      // Function
  removeActivity,      // Function
  deleteOriginalActivity, // Function
  importJsonData,      // Function
  completeSetup,       // Function
  resetDatabase        // Function
}
```

---

### Other Components

| Component | File | Purpose |
|-----------|------|---------|
| `SetupWizard` | `SetupWizard.jsx` | First-time JSON import flow |
| `MapPreview` | `MapPreview.jsx` | Small Leaflet map in day header |
| `MapModal` | `MapModal.jsx` | Fullscreen map with markers |
| `ActivityMapPreview` | `ActivityMapPreview.jsx` | Map showing activity locations |
| `AddActivityModal` | `AddActivityModal.jsx` | Form for adding/editing activities |
| `DeleteConfirmModal` | `DeleteConfirmModal.jsx` | Confirmation dialog |
| `StatusPill` | `StatusPill.jsx` | BOOKED/TO_BOOK status badge |
| `DayMetadata` | `DayMetadata.jsx` | Day summary badges |
| `TravelRouteMap` | `TravelRouteMap.jsx` | Flight path visualization |

---

### Utilities

| File | Purpose |
|------|---------|
| `src/utils/classNames.js` | `classNames()` helper for conditional CSS classes |
| `src/constants/status.js` | Status code constants and labels |
| `src/data/itinerary.js` | Data parsing, `parseItineraryData()`, `getTripMeta()` |

---

## 🔧 Common Modifications

### Add a New Activity Category

1. **ActivitiesSection.jsx** (~line 35):
```javascript
const ACTIVITY_CATEGORY_COLORS = {
  // ... existing categories
  "NewCategory": "bg-color-900/40 text-color-300 border-color-700/50",
};
```

### Add a New Section to Day Cards

1. **Create section component** in `src/components/sections/NewSection.jsx`
2. **DayCard.jsx**: Import and add to `SECTION_NAMES` constant
3. **DayCard.jsx**: Add render in expanded content area (~line 500)

### Modify Budget Calculation

1. **ItineraryPage.jsx** → `budgetTotals` useMemo (~line 350)
2. Add/modify cost aggregation logic
3. Update currency rates in `CURRENCY_EXCHANGE_RATES_TO_USD` (~line 30)

### Add New Database Store

1. **indexedDB.js**: Add to `STORE_NAMES` (~line 60)
2. **indexedDB.js**: Create in `onupgradeneeded` (~line 250)
3. **indexedDB.js**: Add CRUD functions
4. **useItineraryDB.js**: Add state and callbacks
5. **useItineraryDB.js**: Expose in return object

### Change Map Tile Provider

1. **MapPreview.jsx**, **MapModal.jsx**, **ActivityMapPreview.jsx**
2. Find `TileLayer` component and change URL
3. Current: CartoDB dark tiles

### Add New Trip Region

1. **DayCard.jsx** → `REGION_BADGE_CONFIG` (~line 45):
```javascript
'XX': { flag: '🏳️', label: 'XX', bg: '...', border: '...', text: '...' },
```
2. **DayCard.jsx** → `getRegionBadgeConfig()` function (~line 65)

---

## ⚡ Performance Notes

### Memoization Strategy
- All section components use `React.memo()`
- `DayCard` is memoized - receives `todayDateKey` as prop instead of computing
- Callbacks use `useCallback()` with proper dependencies
- Computed values use `useMemo()`

### Stable References
- `EMPTY_ARRAY` constant used instead of `[]` literals
- Prevents unnecessary re-renders from new array references

### State Updates
- Set state uses functional updates: `setState(prev => ...)` 
- Avoids stale closure issues with Sets

---

## 🐛 Debugging Tips

### Database Issues
- Check browser DevTools → Application → IndexedDB → TravelItineraryDB
- Use "Reset Data" button in loading screen to clear
- Check console for `✅`/`❌` log prefixes from DB operations

### Component Not Updating
- Check if props are stable references (not new objects/arrays)
- Verify `useCallback`/`useMemo` dependencies
- Check if parent is passing memoized values

### Build Issues
- Run `npx vite build` directly
- Check `docs/` folder for output
- Verify `base: '/Iten/'` in vite.config.js for GitHub Pages

---

## 📝 Code Style

### Error Handling
All async DB functions return Go-style tuples:
```javascript
const [result, err] = await someFunction();
if (err) {
  console.error('Failed:', err);
  return;
}
// use result
```

### Component Structure
```javascript
// 1. Imports
// 2. Constants
// 3. Pure helper functions
// 4. Component definition
//    - State declarations
//    - Memoized values
//    - Callbacks
//    - Effects
//    - Render
```

### Naming Conventions
- Components: PascalCase (`DayCard`)
- Functions: camelCase (`handleAddActivity`)
- Constants: SCREAMING_SNAKE_CASE (`SECTION_NAMES`)
- Files: PascalCase for components, camelCase for utilities

---

## 🚀 Deployment

```bash
# Build for production
npx vite build

# Output goes to docs/ folder
# Push to main branch
# GitHub Pages serves from /docs
```

Live URL: `https://monstercameron.github.io/Iten/`
