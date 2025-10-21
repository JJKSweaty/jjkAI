# Sidebar Real-Time Updates Fix

## 🐛 Problem
New chats weren't appearing in the sidebar until page refresh, even though they were being created successfully in the database.

## 🔍 Root Cause
Two issues were causing this:

### 1. **Stale Closure in State Updates**
```typescript
// ❌ WRONG - captures stale `threads` value
setThreads([data, ...threads]);

// ✅ CORRECT - always uses latest state
setThreads(prevThreads => [data, ...prevThreads]);
```

When `createThread` was called, the `threads` variable was captured from the component's render at the time the function was created. If the component didn't re-render between thread creation, `threads` would be stale.

### 2. **No Real-Time Sync**
The sidebar only fetched threads on mount. If you:
- Created a chat in one tab
- Had another tab open
- Created a chat and the component didn't re-render

...the sidebar wouldn't know about the change.

## ✅ Solution

### 1. Fixed State Updates with Functional Updates
Changed all state updates in `useThreads.ts` to use functional updates:

```typescript
// createThread
setThreads(prevThreads => [data, ...prevThreads]);

// updateThread
setThreads(prevThreads => 
  prevThreads.map(t => t.id === threadId ? { ...t, ...updates } : t)
);

// deleteThread
setThreads(prevThreads => prevThreads.filter(t => t.id !== threadId));
```

### 2. Added Real-Time Supabase Subscriptions
Implemented PostgreSQL real-time subscriptions to automatically sync changes across all tabs/devices:

```typescript
const channel = supabase
  .channel('threads_channel')
  .on('postgres_changes', { event: 'INSERT', ... }, (payload) => {
    // Automatically add new threads
    setThreads(prevThreads => {
      const exists = prevThreads.some(t => t.id === payload.new.id);
      if (exists) return prevThreads;
      return [payload.new as Thread, ...prevThreads];
    });
  })
  .on('postgres_changes', { event: 'UPDATE', ... }, (payload) => {
    // Automatically update modified threads
    setThreads(prevThreads =>
      prevThreads.map(t => t.id === payload.new.id ? payload.new as Thread : t)
    );
  })
  .on('postgres_changes', { event: 'DELETE', ... }, (payload) => {
    // Automatically remove deleted threads
    setThreads(prevThreads => prevThreads.filter(t => t.id !== payload.old.id));
  })
  .subscribe();
```

### 3. Removed Unnecessary Manual Refreshes
Removed manual `refreshThreads()` calls from:
- `handleSend` - No longer needed after sending a message
- `handleNewChat` - Sidebar already has latest data
- `handleThreadSelect` - Real-time keeps it synced

## 🎯 Benefits

### Instant Updates
- New chats appear **immediately** in sidebar
- No refresh needed
- Works even if component doesn't re-render

### Multi-Tab Sync
- Create a chat in Tab A → appears instantly in Tab B
- Delete a chat in Tab A → removed instantly from Tab B
- Rename a chat → title updates everywhere

### Multi-Device Sync
- Create a chat on Desktop → appears on Mobile
- Collaborative features ready (multiple users can see changes)

### Performance
- Removed unnecessary `refreshThreads()` calls
- Reduced database queries
- More efficient state updates

## 🧪 Testing

### Test 1: Basic Creation
1. Open app
2. Send first message
3. ✅ New chat appears instantly in sidebar

### Test 2: Multi-Tab Sync
1. Open two tabs of your app
2. Create a chat in Tab 1
3. ✅ Chat appears instantly in Tab 2's sidebar

### Test 3: Title Updates
1. Send a message (creates thread)
2. Title auto-generates from first 50 chars
3. ✅ Sidebar shows updated title instantly

### Test 4: Deletion
1. Delete a chat
2. ✅ Removed instantly from sidebar

## 📊 Technical Details

### Before
```
User sends message 
→ createThread() with stale `threads`
→ State update uses old array
→ Component doesn't re-render
→ Sidebar shows old list
→ Manual refresh required
```

### After
```
User sends message
→ createThread() with functional update
→ State always uses latest array
→ Component re-renders with new thread
→ Real-time subscription confirms change
→ Sidebar instantly shows new chat
→ Multi-tab sync works automatically
```

## 🔧 Implementation Files

- **`src/hooks/useThreads.ts`**: Fixed state updates + added real-time subscriptions
- **`src/app/page.tsx`**: Removed unnecessary refresh calls
- **Supabase**: Real-time enabled on `threads` table (already configured)

## 📝 Pattern for Future Features

When adding CRUD operations on Supabase tables:

1. ✅ **Always use functional state updates**
   ```typescript
   setState(prev => /* new value based on prev */)
   ```

2. ✅ **Add real-time subscriptions for shared data**
   ```typescript
   supabase.channel('name')
     .on('postgres_changes', { ... })
     .subscribe()
   ```

3. ✅ **Clean up subscriptions on unmount**
   ```typescript
   return () => supabase.removeChannel(channel);
   ```

4. ❌ **Avoid manual refresh calls**
   Let real-time subscriptions handle updates automatically

---

**Fixed**: October 2025  
**Impact**: Instant sidebar updates, multi-tab sync, better UX  
**Status**: Production-ready ✅
